#!/usr/bin/env python3
"""Fail-closed 6x6 tsumego verifier for black-to-kill candidates.

The verifier is intentionally conservative.  It can replay principal
variations, track the target group, check target capture, run a bounded
minimax-style search, and make a limited two-eye judgement.  It is not a
complete life-and-death engine.
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Optional

BOARD_SIZE = 6
EMPTY = "."
BLACK = "B"
WHITE = "W"
STONE_CHARS = {EMPTY, BLACK, WHITE}

DEFAULT_MAX_SEARCH_NODES = 5000
DEFAULT_MAX_BRANCHING_MOVES = 12
SUPPORTED_SUCCESS_CONDITIONS = {
    "capture-target",
    "prevent-target-two-eyes",
    "prevent-white-two-eyes",
    "capture-or-prevent-two-eyes",
}
BLOCKING_WARNING_CATEGORIES = {
    "PRUNING",
    "SEARCH_CUTOFF",
    "KO_OR_REPETITION",
    "AMBIGUOUS_LIFE_DEATH",
    "UNSUPPORTED_SUCCESS_CONDITION",
}

Point = tuple[int, int]  # 0-based (col, row), e.g. A1 -> (0, 0), C4 -> (2, 3)
Board = list[list[str]]
WarningDetail = dict[str, str]


@dataclass(frozen=True)
class MoveResult:
    legal: bool
    board: Board
    captured: list[Point]
    error: Optional[str] = None
    suicide: bool = False
    move: Optional[str] = None
    color: Optional[str] = None


SAMPLE_INPUT: dict[str, Any] = {
    "rows": [
        "......",
        "..B...",
        ".BW...",
        ".B....",
        ".B....",
        ".B....",
    ],
    "turn": "black",
    "goalType": "kill",
    "targetColor": "W",
    "target": ["C3"],
    "winningFirstMoves": ["D3"],
    "principalVariation": ["D3", "C4", "D4", "C5", "D5", "C6", "D6"],
    "successCondition": "capture-target",
    "maxDepth": 7,
    "searchRadius": 2,
    "fastMode": True,
    "maxBranchingMoves": 8,
    "maxNodes": 1000,
}


def validate_rows(rows: list[str]) -> list[str]:
    errors: list[str] = []
    if not isinstance(rows, list):
        return ["rows must be a list of 6 strings."]
    if len(rows) != BOARD_SIZE:
        errors.append(f"rows must contain exactly {BOARD_SIZE} rows.")
    for index, row in enumerate(rows):
        if not isinstance(row, str):
            errors.append(f"rows[{index}] must be a string.")
            continue
        if len(row) != BOARD_SIZE:
            errors.append(f"rows[{index}] must contain exactly {BOARD_SIZE} characters.")
        bad_chars = sorted({char for char in row if char not in STONE_CHARS})
        if bad_chars:
            errors.append(f"rows[{index}] contains invalid characters: {''.join(bad_chars)}.")
    return errors


def parse_rows(rows: list[str]) -> Board:
    errors = validate_rows(rows)
    if errors:
        raise ValueError("; ".join(errors))
    return [list(row) for row in rows]


def board_to_rows(board: Board) -> list[str]:
    return ["".join(row) for row in board]


def coord_to_point(coord: str) -> Point:
    if not isinstance(coord, str):
        raise ValueError(f"coord must be a string: {coord!r}")
    text = coord.strip().upper()
    if len(text) < 2:
        raise ValueError(f"coord is too short: {coord!r}")
    col_char = text[0]
    row_text = text[1:]
    if col_char < "A" or col_char > chr(ord("A") + BOARD_SIZE - 1):
        raise ValueError(f"coord column must be A-F: {coord!r}")
    if not row_text.isdigit():
        raise ValueError(f"coord row must be 1-6: {coord!r}")
    row_number = int(row_text)
    if row_number < 1 or row_number > BOARD_SIZE:
        raise ValueError(f"coord row must be 1-6: {coord!r}")
    return (ord(col_char) - ord("A"), row_number - 1)


def point_to_coord(point: Point) -> str:
    col, row = point
    if not in_bounds(point):
        raise ValueError(f"point is out of bounds: {point!r}")
    return f"{chr(ord('A') + col)}{row + 1}"


def in_bounds(point: Point) -> bool:
    col, row = point
    return 0 <= row < BOARD_SIZE and 0 <= col < BOARD_SIZE


def neighbors(point: Point) -> list[Point]:
    col, row = point
    result = [(col, row - 1), (col, row + 1), (col - 1, row), (col + 1, row)]
    return [candidate for candidate in result if in_bounds(candidate)]


def get_cell(board: Board, point: Point) -> str:
    col, row = point
    return board[row][col]


def set_cell(board: Board, point: Point, value: str) -> None:
    col, row = point
    board[row][col] = value


def clone_board(board: Board) -> Board:
    return [row[:] for row in board]


def normalize_color(color: str) -> str:
    text = str(color).strip().lower()
    if text in {"b", "black"}:
        return BLACK
    if text in {"w", "white"}:
        return WHITE
    raise ValueError(f"unsupported color: {color!r}")


def color_name(color: str) -> str:
    normalized = normalize_color(color)
    return "black" if normalized == BLACK else "white"


def opponent(color: str) -> str:
    normalized = normalize_color(color)
    return WHITE if normalized == BLACK else BLACK


def normalize_point(value: str | Point) -> Point:
    if isinstance(value, str):
        return coord_to_point(value)
    if (
        isinstance(value, tuple)
        and len(value) == 2
        and isinstance(value[0], int)
        and isinstance(value[1], int)
        and in_bounds(value)
    ):
        return value
    raise ValueError(f"invalid point: {value!r}")


def normalize_points(values: Iterable[str | Point]) -> list[Point]:
    return [normalize_point(value) for value in values]


def coord_list(points: Iterable[Point]) -> list[str]:
    return [point_to_coord(point) for point in sorted(points, key=lambda item: (item[1], item[0]))]


def board_hash(board: Board) -> str:
    return "/".join(board_to_rows(board))


def add_warning(warnings: list[WarningDetail], category: str, message: str) -> None:
    warning = {"category": category, "message": message}
    if warning not in warnings:
        warnings.append(warning)


def warning_messages(warnings: list[WarningDetail]) -> list[str]:
    return [f"{warning['category']}: {warning['message']}" for warning in warnings]


def merge_warning_details(*warning_lists: list[WarningDetail]) -> list[WarningDetail]:
    merged: list[WarningDetail] = []
    for warnings in warning_lists:
        for warning in warnings:
            if warning not in merged:
                merged.append(warning)
    return merged


def dedupe_messages(messages: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for message in messages:
        if message not in seen:
            seen.add(message)
            result.append(message)
    return result


def get_group(board: Board, point: Point) -> set[Point]:
    if not in_bounds(point):
        return set()
    color = get_cell(board, point)
    if color == EMPTY:
        return set()
    group: set[Point] = set()
    stack = [point]
    while stack:
        current = stack.pop()
        if current in group or get_cell(board, current) != color:
            continue
        group.add(current)
        stack.extend(neighbor for neighbor in neighbors(current) if neighbor not in group)
    return group


def get_liberties(board: Board, group: set[Point]) -> set[Point]:
    liberties: set[Point] = set()
    for point in group:
        for neighbor in neighbors(point):
            if get_cell(board, neighbor) == EMPTY:
                liberties.add(neighbor)
    return liberties


def count_liberties(board: Board, group: set[Point]) -> int:
    return len(get_liberties(board, group))


def play_move(board: Board, color: str, coord: str | Point) -> MoveResult:
    try:
        normalized_color = normalize_color(color)
        point = normalize_point(coord)
    except ValueError as exc:
        return MoveResult(False, clone_board(board), [], str(exc))

    move_name = point_to_coord(point)
    if get_cell(board, point) != EMPTY:
        return MoveResult(False, clone_board(board), [], f"{move_name} is occupied.", move=move_name, color=normalized_color)

    next_board = clone_board(board)
    set_cell(next_board, point, normalized_color)
    captured: list[Point] = []
    seen_opponent_groups: set[frozenset[Point]] = set()
    other = opponent(normalized_color)

    for neighbor in neighbors(point):
        if get_cell(next_board, neighbor) != other:
            continue
        group = get_group(next_board, neighbor)
        frozen_group = frozenset(group)
        if frozen_group in seen_opponent_groups:
            continue
        seen_opponent_groups.add(frozen_group)
        if count_liberties(next_board, group) == 0:
            for stone in group:
                set_cell(next_board, stone, EMPTY)
            captured.extend(sorted(group))

    own_group = get_group(next_board, point)
    if count_liberties(next_board, own_group) == 0:
        return MoveResult(
            False,
            clone_board(board),
            [],
            f"{move_name} is suicide.",
            suicide=True,
            move=move_name,
            color=normalized_color,
        )

    return MoveResult(True, next_board, captured, move=move_name, color=normalized_color)


def list_legal_moves(board: Board, color: str) -> list[str]:
    moves: list[str] = []
    for row in range(BOARD_SIZE):
        for col in range(BOARD_SIZE):
            point = (col, row)
            if get_cell(board, point) != EMPTY:
                continue
            if play_move(board, color, point).legal:
                moves.append(point_to_coord(point))
    return moves


def resolve_target_group(board: Board, target: list[str] | list[Point], targetColor: str) -> set[Point]:
    target_color = normalize_color(targetColor)
    group: set[Point] = set()
    for point in normalize_points(target):
        if get_cell(board, point) == target_color:
            group.update(get_group(board, point))
    return group


def resolve_current_target_group(
    board: Board,
    initial_group: set[Point],
    fallback_target_points: list[Point],
    target_color: str,
) -> tuple[set[Point], bool]:
    target_color = normalize_color(target_color)
    anchors = [point for point in initial_group if get_cell(board, point) == target_color]
    if not anchors and not initial_group:
        anchors = [point for point in fallback_target_points if get_cell(board, point) == target_color]
    if not anchors:
        return set(), False

    groups: list[set[Point]] = []
    seen: set[Point] = set()
    for anchor in anchors:
        if anchor in seen:
            continue
        group = get_group(board, anchor)
        seen.update(group)
        groups.append(group)
    merged: set[Point] = set()
    for group in groups:
        merged.update(group)
    return merged, len(groups) > 1


def is_target_captured(board: Board, target_points: list[str] | list[Point], targetColor: str) -> bool:
    return len(resolve_target_group(board, target_points, targetColor)) == 0


def is_current_target_captured(board: Board, initial_group: set[Point], target_points: list[Point], target_color: str) -> bool:
    group, _ = resolve_current_target_group(board, initial_group, target_points, target_color)
    return not group


def target_status(board: Board, target_points: list[str] | list[Point], targetColor: str) -> dict[str, Any]:
    group = resolve_target_group(board, target_points, targetColor)
    if not group:
        return {
            "targetStatus": "captured",
            "targetStones": [],
            "targetLiberties": [],
            "targetLibertyCount": 0,
        }
    liberties = sorted(get_liberties(board, group))
    return {
        "targetStatus": "alive",
        "targetStones": coord_list(group),
        "targetLiberties": coord_list(liberties),
        "targetLibertyCount": len(liberties),
    }


def current_target_snapshot(
    move: str,
    board: Board,
    initial_group: set[Point],
    target_points: list[Point],
    target_color: str,
) -> dict[str, Any]:
    group, split = resolve_current_target_group(board, initial_group, target_points, target_color)
    liberties = get_liberties(board, group) if group else set()
    return {
        "move": move,
        "status": "captured" if not group else "alive",
        "stones": coord_list(group),
        "liberties": coord_list(liberties),
        "libertyCount": len(liberties),
        "expandedStones": coord_list(group - initial_group),
        "splitOrAmbiguous": split,
    }


def pv_board_entry(
    move: str,
    board: Board,
    initial_group: set[Point],
    target_points: list[Point],
    target_color: str,
) -> dict[str, Any]:
    snapshot = current_target_snapshot(move, board, initial_group, target_points, target_color)
    return {
        "move": move,
        "rows": board_to_rows(board),
        "targetStatus": snapshot["status"],
        "targetLiberties": snapshot["liberties"],
    }


def collect_empty_region(board: Board, start: Point, seen: set[Point]) -> set[Point]:
    region: set[Point] = set()
    stack = [start]
    while stack:
        point = stack.pop()
        if point in seen or get_cell(board, point) != EMPTY:
            continue
        seen.add(point)
        region.add(point)
        stack.extend(neighbor for neighbor in neighbors(point) if neighbor not in seen)
    return region


def analyze_target_eyes(
    board: Board,
    target_points: list[str] | list[Point],
    targetColor: str,
    initial_group: Optional[set[Point]] = None,
) -> dict[str, Any]:
    target_color = normalize_color(targetColor)
    normalized_target_points = normalize_points(target_points)
    group = (
        resolve_current_target_group(board, initial_group, normalized_target_points, target_color)[0]
        if initial_group is not None
        else resolve_target_group(board, normalized_target_points, target_color)
    )
    if not group:
        return {
            "eyeCandidates": [],
            "trueEyeCount": 0,
            "hasTwoEyes": False,
            "ambiguous": False,
            "warnings": [],
        }

    other = opponent(target_color)
    seen_empty: set[Point] = set()
    regions: list[set[Point]] = []
    for point in group:
        for neighbor in neighbors(point):
            if get_cell(board, neighbor) == EMPTY and neighbor not in seen_empty:
                region = collect_empty_region(board, neighbor, seen_empty)
                if any(any(adjacent in group for adjacent in neighbors(empty)) for empty in region):
                    regions.append(region)

    candidates: list[dict[str, Any]] = []
    true_eye_count = 0
    ambiguous = False
    analysis_warnings: list[str] = []

    for region in regions:
        boundary_colors: set[str] = set()
        for point in region:
            for neighbor in neighbors(point):
                cell = get_cell(board, neighbor)
                if cell != EMPTY:
                    boundary_colors.add(cell)
        opponent_playable = [point for point in sorted(region) if play_move(board, other, point).legal]

        if opponent_playable:
            status = "false-eye"
            reason = f"playable by {color_name(other)} at {', '.join(coord_list(opponent_playable))}"
        elif other in boundary_colors:
            status = "ambiguous"
            reason = f"adjacent to {color_name(other)} but not directly playable"
            ambiguous = True
            analysis_warnings.append(reason)
        elif target_color in boundary_colors:
            status = "true-eye"
            reason = "surrounded by target stones and board edge"
            true_eye_count += 1
        else:
            status = "ambiguous"
            reason = "empty region is not clearly surrounded by the target"
            ambiguous = True
            analysis_warnings.append(reason)

        candidates.append(
            {
                "points": coord_list(region),
                "status": status,
                "reason": reason,
            }
        )

    return {
        "eyeCandidates": candidates,
        "trueEyeCount": true_eye_count,
        "hasTwoEyes": true_eye_count >= 2,
        "ambiguous": ambiguous,
        "warnings": dedupe_messages(analysis_warnings),
    }


def get_success_condition(input_data: dict[str, Any]) -> str:
    success_condition = input_data.get("successCondition")
    if success_condition is None and isinstance(input_data.get("solutions"), dict):
        success_condition = input_data["solutions"].get("successCondition")
    if success_condition is None:
        return "capture-target"
    return str(success_condition)


def evaluate_success_condition(
    board: Board,
    target_points: list[Point],
    target_color: str,
    initial_group: set[Point],
    success_condition: str,
) -> dict[str, Any]:
    captured = is_current_target_captured(board, initial_group, target_points, target_color)
    eye_analysis = analyze_target_eyes(board, target_points, target_color, initial_group)

    if success_condition == "capture-target":
        return {
            "success": captured,
            "method": "capture-target" if captured else None,
            "targetCaptured": captured,
            "targetEyeAnalysis": eye_analysis,
        }

    if success_condition in {"prevent-target-two-eyes", "prevent-white-two-eyes"}:
        prevented = not eye_analysis["hasTwoEyes"] and not eye_analysis["ambiguous"]
        return {
            "success": captured or prevented,
            "method": "capture-target" if captured else ("prevent-two-eyes" if prevented else None),
            "targetCaptured": captured,
            "targetEyeAnalysis": eye_analysis,
        }

    if success_condition == "capture-or-prevent-two-eyes":
        prevented = not eye_analysis["hasTwoEyes"] and not eye_analysis["ambiguous"]
        return {
            "success": captured or prevented,
            "method": "capture-target" if captured else ("prevent-two-eyes" if prevented else None),
            "targetCaptured": captured,
            "targetEyeAnalysis": eye_analysis,
        }

    return {
        "success": False,
        "method": None,
        "targetCaptured": captured,
        "targetEyeAnalysis": eye_analysis,
    }


def extract_expected_final_rows(input_data: dict[str, Any]) -> Optional[list[str]]:
    if isinstance(input_data.get("expectedFinalRows"), list):
        return input_data["expectedFinalRows"]
    verification = input_data.get("verification")
    if isinstance(verification, dict):
        if isinstance(verification.get("expectedFinalRows"), list):
            return verification["expectedFinalRows"]
        final_position = verification.get("finalPosition")
        if isinstance(final_position, dict) and isinstance(final_position.get("rows"), list):
            return final_position["rows"]
    final_position = input_data.get("finalPosition")
    if isinstance(final_position, dict) and isinstance(final_position.get("rows"), list):
        return final_position["rows"]
    return None


def diff_rows(expected: list[str], actual: list[str]) -> list[dict[str, Any]]:
    diff: list[dict[str, Any]] = []
    for index in range(max(len(expected), len(actual))):
        expected_row = expected[index] if index < len(expected) else None
        actual_row = actual[index] if index < len(actual) else None
        if expected_row != actual_row:
            diff.append({"row": index + 1, "expected": expected_row, "actual": actual_row})
    return diff


def replay_principal_variation(input_data: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warning_details: list[WarningDetail] = []
    rows = input_data.get("rows")
    row_errors = validate_rows(rows)
    if row_errors:
        return {
            "legal": False,
            "principalVariationValid": False,
            "targetCapturedInPV": False,
            "successConditionMet": False,
            "successMethod": None,
            "pvBoards": [],
            "initialTargetGroup": [],
            "currentTargetGroup": [],
            "targetGroupHistory": [],
            "targetCapturedMove": None,
            "targetExpandedByWhiteMoves": [],
            "targetSplitOrAmbiguous": False,
            "targetEyeAnalysis": {},
            "expectedFinalRowsMatched": None,
            "finalRowsDiff": [],
            "finalRows": [],
            "warnings": [],
            "warningDetails": [],
            "errors": row_errors,
        }

    try:
        board = parse_rows(rows)
        target_color = normalize_color(input_data.get("targetColor", WHITE))
        target_points = normalize_points(input_data.get("target", []))
        current_color = normalize_color(input_data.get("turn", "black"))
    except ValueError as exc:
        return {
            "legal": False,
            "principalVariationValid": False,
            "targetCapturedInPV": False,
            "successConditionMet": False,
            "successMethod": None,
            "pvBoards": [],
            "initialTargetGroup": [],
            "currentTargetGroup": [],
            "targetGroupHistory": [],
            "targetCapturedMove": None,
            "targetExpandedByWhiteMoves": [],
            "targetSplitOrAmbiguous": False,
            "targetEyeAnalysis": {},
            "expectedFinalRowsMatched": None,
            "finalRowsDiff": [],
            "finalRows": [],
            "warnings": [],
            "warningDetails": [],
            "errors": [str(exc)],
        }

    success_condition = get_success_condition(input_data)
    if success_condition not in SUPPORTED_SUCCESS_CONDITIONS:
        add_warning(warning_details, "UNSUPPORTED_SUCCESS_CONDITION", f"unsupported successCondition: {success_condition}")

    initial_group = resolve_target_group(board, target_points, target_color)
    target_group_history = [current_target_snapshot("initial", board, initial_group, target_points, target_color)]
    pv_boards = [pv_board_entry("initial", board, initial_group, target_points, target_color)]
    principal_variation = input_data.get("principalVariation") or []
    seen_hashes = {board_hash(board)}
    principal_variation_valid = True
    target_captured_move: Optional[str] = None
    target_expanded_by_white_moves: list[str] = []
    target_split_or_ambiguous = False

    for index, move in enumerate(principal_variation):
        player_prefix = "B" if current_color == BLACK else "W"
        result = play_move(board, current_color, move)
        if not result.legal:
            principal_variation_valid = False
            errors.append(f"principalVariation[{index}] {move!r} for {color_name(current_color)} is illegal: {result.error}")
            break

        board = result.board
        move_label = f"{player_prefix} {str(move).upper()}"
        current_hash = board_hash(board)
        if current_hash in seen_hashes:
            add_warning(
                warning_details,
                "KO_OR_REPETITION",
                f"repeated position after principalVariation[{index}] {move}; ko/repetition is not fully handled.",
            )
        seen_hashes.add(current_hash)

        snapshot = current_target_snapshot(move_label, board, initial_group, target_points, target_color)
        target_group_history.append(snapshot)
        pv_boards.append(pv_board_entry(str(move), board, initial_group, target_points, target_color))

        if snapshot["status"] == "captured" and target_captured_move is None:
            target_captured_move = move_label
        if current_color == target_color and snapshot["expandedStones"]:
            target_expanded_by_white_moves.append(move_label)
        target_split_or_ambiguous = target_split_or_ambiguous or bool(snapshot["splitOrAmbiguous"])
        current_color = opponent(current_color)

    current_group, final_split = resolve_current_target_group(board, initial_group, target_points, target_color)
    target_split_or_ambiguous = target_split_or_ambiguous or final_split
    success = evaluate_success_condition(board, target_points, target_color, initial_group, success_condition)

    if success["targetEyeAnalysis"].get("ambiguous"):
        add_warning(
            warning_details,
            "AMBIGUOUS_LIFE_DEATH",
            "target eye analysis is ambiguous; this verifier will not accept the candidate as ok.",
        )

    actual_final_rows = board_to_rows(board)
    expected_final_rows = extract_expected_final_rows(input_data)
    expected_matched: Optional[bool] = None
    final_rows_diff: list[dict[str, Any]] = []
    if expected_final_rows is not None:
        expected_errors = validate_rows(expected_final_rows)
        if expected_errors:
            errors.extend(f"expectedFinalRows: {error}" for error in expected_errors)
            expected_matched = False
        else:
            expected_matched = expected_final_rows == actual_final_rows
            if not expected_matched:
                final_rows_diff = diff_rows(expected_final_rows, actual_final_rows)

    return {
        "legal": principal_variation_valid and not row_errors,
        "principalVariationValid": principal_variation_valid,
        "targetCapturedInPV": success["targetCaptured"],
        "successConditionMet": bool(success["success"]),
        "successMethod": success["method"],
        "pvBoards": pv_boards,
        "initialTargetGroup": coord_list(initial_group),
        "currentTargetGroup": coord_list(current_group),
        "targetGroupHistory": target_group_history,
        "targetCapturedMove": target_captured_move,
        "targetExpandedByWhiteMoves": target_expanded_by_white_moves,
        "targetSplitOrAmbiguous": target_split_or_ambiguous,
        "targetEyeAnalysis": success["targetEyeAnalysis"],
        "expectedFinalRowsMatched": expected_matched,
        "finalRowsDiff": final_rows_diff,
        "finalRows": actual_final_rows,
        "warnings": warning_messages(warning_details),
        "warningDetails": warning_details,
        "errors": errors,
    }


def manhattan(point_a: Point, point_b: Point) -> int:
    return abs(point_a[0] - point_b[0]) + abs(point_a[1] - point_b[1])


def candidate_points_near_target(board: Board, target_points: list[Point], target_color: str) -> set[Point]:
    target_group = resolve_target_group(board, target_points, target_color)
    anchors = target_group if target_group else set(target_points)
    candidates: set[Point] = set()

    if target_group:
        liberties = get_liberties(board, target_group)
        candidates.update(liberties)
        for liberty in liberties:
            candidates.update(neighbor for neighbor in neighbors(liberty) if get_cell(board, neighbor) == EMPTY)
        for stone in target_group:
            for neighbor in neighbors(stone):
                neighbor_color = get_cell(board, neighbor)
                if neighbor_color == EMPTY:
                    candidates.add(neighbor)
                elif neighbor_color != target_color:
                    candidates.update(get_liberties(board, get_group(board, neighbor)))
    else:
        candidates.update(point for point in target_points if in_bounds(point) and get_cell(board, point) == EMPTY)

    return {point for point in candidates if in_bounds(point) and get_cell(board, point) == EMPTY and anchors}


def candidate_points_with_radius(
    board: Board,
    target_points: list[Point],
    target_color: str,
    search_radius: int,
) -> set[Point]:
    target_group = resolve_target_group(board, target_points, target_color)
    anchors = target_group if target_group else set(target_points)
    candidates = candidate_points_near_target(board, target_points, target_color)
    for row in range(BOARD_SIZE):
        for col in range(BOARD_SIZE):
            point = (col, row)
            if get_cell(board, point) != EMPTY:
                continue
            if any(manhattan(point, anchor) <= search_radius for anchor in anchors):
                candidates.add(point)
    return candidates


def sort_moves_near_target(moves: list[str], anchors: Iterable[Point]) -> list[str]:
    anchor_points = list(anchors) or [(0, 0)]

    def key(move: str) -> tuple[int, int, int]:
        point = coord_to_point(move)
        distance = min(manhattan(point, anchor) for anchor in anchor_points)
        col, row = point
        return (distance, row, col)

    return sorted(moves, key=key)


def new_search_completeness() -> dict[str, Any]:
    return {
        "allLegalMovesEvaluated": True,
        "candidateMovesPruned": False,
        "searchRadiusExcluded": False,
        "evaluatedMoves": set(),
        "prunedMoves": set(),
        "excludedLegalMoves": set(),
        "nodeBudgetExhausted": False,
        "repeatedPositionCutOff": False,
        "reason": None,
    }


def finalize_search_completeness(trace: dict[str, Any]) -> dict[str, Any]:
    result = dict(trace)
    result["evaluatedMoves"] = sorted(trace["evaluatedMoves"], key=coord_to_point)
    result["prunedMoves"] = sorted(trace["prunedMoves"], key=coord_to_point)
    result["excludedLegalMoves"] = sorted(trace["excludedLegalMoves"], key=coord_to_point)
    return result


def select_search_moves(
    board: Board,
    color: str,
    target_points: list[Point],
    target_color: str,
    search_radius: int,
    exhaustive: bool,
    max_branching_moves: Optional[int],
    trace: dict[str, Any],
    warnings: list[WarningDetail],
) -> list[str]:
    all_legal = list_legal_moves(board, color)
    current_group = resolve_target_group(board, target_points, target_color)
    anchors = current_group if current_group else set(target_points)
    if exhaustive:
        selected = sort_moves_near_target(all_legal, anchors)
    else:
        candidate_points = candidate_points_with_radius(board, target_points, target_color, search_radius)
        candidate_moves = [point_to_coord(point) for point in sorted(candidate_points)]
        selected = [move for move in sort_moves_near_target(candidate_moves, anchors) if move in set(all_legal)]
        excluded = sorted(set(all_legal) - set(selected), key=coord_to_point)
        if excluded:
            trace["allLegalMovesEvaluated"] = False
            trace["searchRadiusExcluded"] = True
            trace["excludedLegalMoves"].update(excluded)
            trace["reason"] = trace["reason"] or "searchRadius limit"
            add_warning(warnings, "PRUNING", "searchRadius excluded at least one legal move.")

    if max_branching_moves is not None and len(selected) > max_branching_moves:
        pruned = selected[max_branching_moves:]
        selected = selected[:max_branching_moves]
        trace["allLegalMovesEvaluated"] = False
        trace["candidateMovesPruned"] = True
        trace["prunedMoves"].update(pruned)
        trace["reason"] = trace["reason"] or "maxBranchingMoves limit"
        add_warning(warnings, "PRUNING", "maxBranchingMoves pruned at least one legal move.")

    trace["evaluatedMoves"].update(selected)
    return selected


def make_search_options(input_data: dict[str, Any]) -> dict[str, Any]:
    fast_mode = bool(input_data.get("fastMode", False))
    exhaustive = bool(input_data.get("exhaustive", not fast_mode))
    max_branching = input_data.get("maxBranchingMoves")
    if max_branching is None:
        max_branching = DEFAULT_MAX_BRANCHING_MOVES if fast_mode else None
    return {
        "maxDepth": int(input_data.get("maxDepth", 7)),
        "searchRadius": int(input_data.get("searchRadius", 2)),
        "maxNodes": int(input_data.get("maxNodes", DEFAULT_MAX_SEARCH_NODES)),
        "fastMode": fast_mode,
        "exhaustive": exhaustive,
        "maxBranchingMoves": int(max_branching) if max_branching is not None else None,
    }


def force_success(
    board: Board,
    target_points: list[Point],
    target_color: str,
    initial_group: set[Point],
    success_condition: str,
    depth_remaining: int,
    side_to_move: str,
    options: dict[str, Any],
    cache: dict[tuple[str, str, int, str], dict[str, Any]],
    warnings: list[WarningDetail],
    trace: dict[str, Any],
    history: set[str],
    node_budget: list[int],
) -> dict[str, Any]:
    if node_budget[0] <= 0:
        trace["allLegalMovesEvaluated"] = False
        trace["nodeBudgetExhausted"] = True
        trace["reason"] = trace["reason"] or "node budget exhausted"
        add_warning(warnings, "SEARCH_CUTOFF", "search cut off after reaching the node budget; result is incomplete.")
        return {"status": "unknown", "length": None, "line": [], "reason": "node budget exhausted"}
    node_budget[0] -= 1

    success = evaluate_success_condition(board, target_points, target_color, initial_group, success_condition)
    if success["success"]:
        return {"status": "win", "length": 0, "line": [], "reason": success["method"]}
    if depth_remaining <= 0:
        return {"status": "loss", "length": None, "line": [], "reason": "depth exhausted"}

    side = normalize_color(side_to_move)
    current_group, _ = resolve_current_target_group(board, initial_group, target_points, target_color)
    current_liberties = get_liberties(board, current_group) if current_group else set()

    if side == BLACK and len(current_liberties) == 1:
        capture_move = point_to_coord(next(iter(current_liberties)))
        capture_result = play_move(board, BLACK, capture_move)
        if capture_result.legal:
            capture_success = evaluate_success_condition(
                capture_result.board, target_points, target_color, initial_group, success_condition
            )
            if capture_success["success"]:
                return {"status": "win", "length": 1, "line": [capture_move], "reason": capture_success["method"]}

    cache_key = (board_hash(board), side, depth_remaining, success_condition)
    if cache_key in cache:
        return cache[cache_key]

    moves = select_search_moves(
        board,
        side,
        target_points,
        target_color,
        options["searchRadius"],
        options["exhaustive"],
        options["maxBranchingMoves"],
        trace,
        warnings,
    )
    if not moves:
        result = {"status": "loss", "length": None, "line": [], "reason": "no legal moves"}
        cache[cache_key] = result
        return result

    unknown_result: Optional[dict[str, Any]] = None

    if side == BLACK:
        best_win: Optional[dict[str, Any]] = None
        for move in moves:
            played = play_move(board, side, move)
            if not played.legal:
                continue
            next_hash = board_hash(played.board)
            if next_hash in history:
                trace["allLegalMovesEvaluated"] = False
                trace["repeatedPositionCutOff"] = True
                add_warning(warnings, "KO_OR_REPETITION", f"search cut off repeated position after {move}.")
                unknown_result = {"status": "unknown", "length": None, "line": [move], "reason": "repetition"}
                continue
            child = force_success(
                played.board,
                target_points,
                target_color,
                initial_group,
                success_condition,
                depth_remaining - 1,
                WHITE,
                options,
                cache,
                warnings,
                trace,
                history | {next_hash},
                node_budget,
            )
            if child["status"] == "win":
                length = 1 + int(child["length"])
                candidate = {"status": "win", "length": length, "line": [move] + child["line"], "reason": child["reason"]}
                if best_win is None or length < int(best_win["length"]):
                    best_win = candidate
            elif child["status"] == "unknown":
                unknown_result = child
        result = best_win or unknown_result or {"status": "loss", "length": None, "line": [], "reason": "no black winning continuation"}
        cache[cache_key] = result
        return result

    best_defense: Optional[dict[str, Any]] = None
    for move in moves:
        played = play_move(board, side, move)
        if not played.legal:
            continue
        if len(current_liberties) == 1 and coord_to_point(move) not in current_liberties:
            capture_move = point_to_coord(next(iter(current_liberties)))
            capture_result = play_move(played.board, BLACK, capture_move)
            if capture_result.legal:
                capture_success = evaluate_success_condition(
                    capture_result.board, target_points, target_color, initial_group, success_condition
                )
                if capture_success["success"]:
                    length = 2
                    candidate = {
                        "status": "win",
                        "length": length,
                        "line": [move, capture_move],
                        "reason": capture_success["method"],
                        "bestWhiteDefense": move,
                    }
                    if best_defense is None or length > int(best_defense["length"]):
                        best_defense = candidate
                    continue
        next_hash = board_hash(played.board)
        if next_hash in history:
            trace["allLegalMovesEvaluated"] = False
            trace["repeatedPositionCutOff"] = True
            add_warning(warnings, "KO_OR_REPETITION", f"search cut off repeated position after {move}.")
            result = {"status": "unknown", "length": None, "line": [move], "reason": "repetition"}
            cache[cache_key] = result
            return result
        child = force_success(
            played.board,
            target_points,
            target_color,
            initial_group,
            success_condition,
            depth_remaining - 1,
            BLACK,
            options,
            cache,
            warnings,
            trace,
            history | {next_hash},
            node_budget,
        )
        if child["status"] == "loss":
            result = {
                "status": "loss",
                "length": None,
                "line": [move] + child["line"],
                "reason": "white defense refutes",
                "bestWhiteDefense": move,
            }
            cache[cache_key] = result
            return result
        if child["status"] == "unknown":
            result = {"status": "unknown", "length": None, "line": [move] + child["line"], "reason": child["reason"]}
            cache[cache_key] = result
            return result
        length = 1 + int(child["length"])
        candidate = {"status": "win", "length": length, "line": [move] + child["line"], "reason": child["reason"], "bestWhiteDefense": move}
        if best_defense is None or length > int(best_defense["length"]):
            best_defense = candidate

    result = best_defense or {"status": "loss", "length": None, "line": [], "reason": "no white defenses evaluated"}
    cache[cache_key] = result
    return result


def normalize_move_names(moves: Iterable[Any]) -> list[str]:
    result: list[str] = []
    for move in moves:
        try:
            point = normalize_point(move)
            result.append(point_to_coord(point))
        except ValueError:
            if isinstance(move, str):
                result.append(move.strip().upper())
            else:
                result.append(str(move))
    return result


def analyze_first_move(
    board: Board,
    first_move: str,
    target_points: list[Point],
    target_color: str,
    initial_group: set[Point],
    success_condition: str,
    options: dict[str, Any],
) -> dict[str, Any]:
    warnings: list[WarningDetail] = []
    trace = new_search_completeness()
    node_budget = [options["maxNodes"]]
    cache: dict[tuple[str, str, int, str], dict[str, Any]] = {}
    played_first = play_move(board, BLACK, first_move)
    if not played_first.legal:
        return {
            "move": first_move,
            "status": "illegal",
            "shortestWinLength": None,
            "reason": played_first.error,
            "bestWhiteDefense": None,
            "bestDefenseLine": [],
            "whiteDefenses": [],
            "warningDetails": [],
            "warnings": [],
            "searchCompleteness": finalize_search_completeness(trace),
        }

    trace["evaluatedMoves"].add(first_move)
    first_success = evaluate_success_condition(played_first.board, target_points, target_color, initial_group, success_condition)
    if first_success["success"]:
        return {
            "move": first_move,
            "status": "win",
            "shortestWinLength": 1,
            "reason": first_success["method"],
            "bestWhiteDefense": None,
            "bestDefenseLine": [],
            "whiteDefenses": [],
            "warningDetails": warnings,
            "warnings": warning_messages(warnings),
            "searchCompleteness": finalize_search_completeness(trace),
        }

    if options["maxDepth"] <= 1:
        return {
            "move": first_move,
            "status": "loss",
            "shortestWinLength": None,
            "reason": "depth exhausted",
            "bestWhiteDefense": None,
            "bestDefenseLine": [],
            "whiteDefenses": [],
            "warningDetails": warnings,
            "warnings": warning_messages(warnings),
            "searchCompleteness": finalize_search_completeness(trace),
        }

    white_moves = select_search_moves(
        played_first.board,
        WHITE,
        target_points,
        target_color,
        options["searchRadius"],
        options["exhaustive"],
        options["maxBranchingMoves"],
        trace,
        warnings,
    )
    white_defenses: list[dict[str, Any]] = []
    best_defense_line: list[str] = []
    best_white_defense: Optional[str] = None
    best_length = -1
    unknown_seen = False

    for white_move in white_moves:
        white_result = play_move(played_first.board, WHITE, white_move)
        if not white_result.legal:
            continue
        current_group, _ = resolve_current_target_group(played_first.board, initial_group, target_points, target_color)
        current_liberties = get_liberties(played_first.board, current_group) if current_group else set()
        if len(current_liberties) == 1 and coord_to_point(white_move) not in current_liberties:
            capture_move = point_to_coord(next(iter(current_liberties)))
            capture_result = play_move(white_result.board, BLACK, capture_move)
            if capture_result.legal:
                capture_success = evaluate_success_condition(
                    capture_result.board, target_points, target_color, initial_group, success_condition
                )
                if capture_success["success"]:
                    defense_entry = {
                        "whiteMove": white_move,
                        "blackCanStillKill": True,
                        "status": "win",
                        "shortestContinuation": [capture_move],
                        "refutation": None,
                    }
                    white_defenses.append(defense_entry)
                    total_length = 3
                    if total_length > best_length:
                        best_length = total_length
                        best_white_defense = white_move
                        best_defense_line = [white_move, capture_move]
                    continue
        child = force_success(
            white_result.board,
            target_points,
            target_color,
            initial_group,
            success_condition,
            options["maxDepth"] - 2,
            BLACK,
            options,
            cache,
            warnings,
            trace,
            {board_hash(board), board_hash(played_first.board), board_hash(white_result.board)},
            node_budget,
        )
        defense_entry = {
            "whiteMove": white_move,
            "blackCanStillKill": child["status"] == "win",
            "status": child["status"],
            "shortestContinuation": child["line"] if child["status"] == "win" else [],
            "refutation": None if child["status"] == "win" else child["reason"],
        }
        white_defenses.append(defense_entry)
        if child["status"] == "loss":
            return {
                "move": first_move,
                "status": "loss",
                "shortestWinLength": None,
                "reason": "white defense refutes",
                "bestWhiteDefense": white_move,
                "bestDefenseLine": [white_move] + child["line"],
                "whiteDefenses": white_defenses,
                "warningDetails": warnings,
                "warnings": warning_messages(warnings),
                "searchCompleteness": finalize_search_completeness(trace),
            }
        if child["status"] == "unknown":
            unknown_seen = True
        elif child["status"] == "win":
            total_length = 2 + int(child["length"])
            if total_length > best_length:
                best_length = total_length
                best_white_defense = white_move
                best_defense_line = [white_move] + child["line"]

    if unknown_seen or trace["nodeBudgetExhausted"]:
        return {
            "move": first_move,
            "status": "unknown",
            "shortestWinLength": None,
            "reason": "incomplete search",
            "bestWhiteDefense": best_white_defense,
            "bestDefenseLine": best_defense_line,
            "whiteDefenses": white_defenses,
            "warningDetails": warnings,
            "warnings": warning_messages(warnings),
            "searchCompleteness": finalize_search_completeness(trace),
        }

    if best_length >= 0:
        return {
            "move": first_move,
            "status": "win",
            "shortestWinLength": best_length,
            "reason": "all white defenses fail",
            "bestWhiteDefense": best_white_defense,
            "bestDefenseLine": best_defense_line,
            "whiteDefenses": white_defenses,
            "warningDetails": warnings,
            "warnings": warning_messages(warnings),
            "searchCompleteness": finalize_search_completeness(trace),
        }

    return {
        "move": first_move,
        "status": "loss",
        "shortestWinLength": None,
        "reason": "no white defenses evaluated",
        "bestWhiteDefense": None,
        "bestDefenseLine": [],
        "whiteDefenses": white_defenses,
        "warningDetails": warnings,
        "warnings": warning_messages(warnings),
        "searchCompleteness": finalize_search_completeness(trace),
    }


def merge_search_completeness(analyses: list[dict[str, Any]]) -> dict[str, Any]:
    merged = new_search_completeness()
    for analysis in analyses:
        completeness = analysis.get("searchCompleteness", {})
        if not completeness.get("allLegalMovesEvaluated", True):
            merged["allLegalMovesEvaluated"] = False
        for key in ("candidateMovesPruned", "searchRadiusExcluded", "nodeBudgetExhausted", "repeatedPositionCutOff"):
            merged[key] = bool(merged[key] or completeness.get(key, False))
        for key in ("evaluatedMoves", "prunedMoves", "excludedLegalMoves"):
            merged[key].update(completeness.get(key, []))
        if completeness.get("reason") and not merged["reason"]:
            merged["reason"] = completeness["reason"]
    return finalize_search_completeness(merged)


def find_winning_first_moves(input_data: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    notes: list[str] = []
    warning_details: list[WarningDetail] = []
    rows = input_data.get("rows")
    row_errors = validate_rows(rows)
    if row_errors:
        return {
            "winningFirstMovesVerified": [],
            "alternativeWinningFirstMoves": [],
            "hasAlternativeFirstMove": False,
            "shortestWinLength": None,
            "firstMoveAnalysis": [],
            "unevaluatedFirstMoves": [],
            "bestDefenseLine": [],
            "whiteDefenses": [],
            "searchCompleteness": finalize_search_completeness(new_search_completeness()),
            "warnings": [],
            "warningDetails": [],
            "errors": row_errors,
            "notes": notes,
        }

    try:
        board = parse_rows(rows)
        turn_color = normalize_color(input_data.get("turn", "black"))
        target_color = normalize_color(input_data.get("targetColor", WHITE))
        target_points = normalize_points(input_data.get("target", []))
    except ValueError as exc:
        return {
            "winningFirstMovesVerified": [],
            "alternativeWinningFirstMoves": [],
            "hasAlternativeFirstMove": False,
            "shortestWinLength": None,
            "firstMoveAnalysis": [],
            "unevaluatedFirstMoves": [],
            "bestDefenseLine": [],
            "whiteDefenses": [],
            "searchCompleteness": finalize_search_completeness(new_search_completeness()),
            "warnings": [],
            "warningDetails": [],
            "errors": [str(exc)],
            "notes": notes,
        }

    success_condition = get_success_condition(input_data)
    if input_data.get("goalType") != "kill":
        errors.append("only goalType='kill' is supported in the first version.")
    if turn_color != BLACK:
        errors.append("only black-to-play tsumego is supported in the first version.")
    if target_color != WHITE:
        add_warning(warning_details, "LIMITATION", "first version is intended for black killing a white target.")
    if success_condition not in SUPPORTED_SUCCESS_CONDITIONS:
        add_warning(warning_details, "UNSUPPORTED_SUCCESS_CONDITION", f"unsupported successCondition: {success_condition}")
    if not target_points:
        errors.append("target must contain at least one coordinate.")
    if errors:
        return {
            "winningFirstMovesVerified": [],
            "alternativeWinningFirstMoves": [],
            "hasAlternativeFirstMove": False,
            "shortestWinLength": None,
            "firstMoveAnalysis": [],
            "unevaluatedFirstMoves": [],
            "bestDefenseLine": [],
            "whiteDefenses": [],
            "searchCompleteness": finalize_search_completeness(new_search_completeness()),
            "warnings": warning_messages(warning_details),
            "warningDetails": warning_details,
            "errors": errors,
            "notes": notes,
        }

    options = make_search_options(input_data)
    expected_moves = normalize_move_names(input_data.get("winningFirstMoves", []))
    initial_group = resolve_target_group(board, target_points, target_color)
    all_first_moves = list_legal_moves(board, BLACK)
    first_move_analysis: list[dict[str, Any]] = []

    for first_move in all_first_moves:
        analysis = analyze_first_move(board, first_move, target_points, target_color, initial_group, success_condition, options)
        first_move_analysis.append(analysis)
        warning_details = merge_warning_details(warning_details, analysis["warningDetails"])

    winning_moves = [analysis["move"] for analysis in first_move_analysis if analysis["status"] == "win"]
    winning_by_move = {analysis["move"]: analysis for analysis in first_move_analysis if analysis["status"] == "win"}
    verified = [move for move in expected_moves if move in winning_by_move]
    alternatives = [move for move in winning_moves if move not in set(expected_moves)] if expected_moves else []
    missing = [move for move in expected_moves if move not in winning_by_move]
    if missing:
        notes.append(f"expected winning first moves not verified: {', '.join(missing)}")

    unevaluated = [analysis["move"] for analysis in first_move_analysis if analysis["status"] == "unknown"]
    shortest = min((analysis["shortestWinLength"] for analysis in first_move_analysis if analysis["status"] == "win"), default=None)
    primary = winning_by_move.get(expected_moves[0]) if expected_moves else (first_move_analysis[0] if first_move_analysis else None)
    search_completeness = merge_search_completeness(first_move_analysis)
    if unevaluated:
        search_completeness["allLegalMovesEvaluated"] = False
        add_warning(warning_details, "SEARCH_CUTOFF", f"first moves were not fully evaluated: {', '.join(unevaluated)}")

    return {
        "winningFirstMovesVerified": verified if expected_moves else winning_moves,
        "alternativeWinningFirstMoves": alternatives,
        "hasAlternativeFirstMove": bool(alternatives),
        "shortestWinLength": shortest,
        "firstMoveAnalysis": first_move_analysis,
        "unevaluatedFirstMoves": unevaluated,
        "bestDefenseLine": primary.get("bestDefenseLine", []) if primary else [],
        "whiteDefenses": primary.get("whiteDefenses", []) if primary else [],
        "searchCompleteness": search_completeness,
        "warnings": warning_messages(warning_details),
        "warningDetails": warning_details,
        "errors": errors,
        "notes": notes,
    }


def verify_tsumego(input_data: dict[str, Any]) -> dict[str, Any]:
    replay = replay_principal_variation(input_data)
    search = find_winning_first_moves(input_data)
    warning_details = merge_warning_details(replay["warningDetails"], search["warningDetails"])
    errors = dedupe_messages([*replay["errors"], *search["errors"]])
    notes = dedupe_messages(search["notes"])
    expected_moves = normalize_move_names(input_data.get("winningFirstMoves", []))
    missing_expected = [move for move in expected_moves if move not in search["winningFirstMovesVerified"]]
    blocking_warning = any(warning["category"] in BLOCKING_WARNING_CATEGORIES for warning in warning_details)
    search_complete = search["searchCompleteness"].get("allLegalMovesEvaluated", False) and not search["unevaluatedFirstMoves"]
    expected_rows_ok = replay["expectedFinalRowsMatched"] is not False
    prevent_two_eyes = get_success_condition(input_data) in {
        "prevent-target-two-eyes",
        "prevent-white-two-eyes",
        "capture-or-prevent-two-eyes",
    }
    eyes_ok = True
    if prevent_two_eyes and replay["successMethod"] != "capture-target":
        eye_analysis = replay["targetEyeAnalysis"]
        eyes_ok = not eye_analysis.get("hasTwoEyes", False) and not eye_analysis.get("ambiguous", False)

    ok = (
        not errors
        and replay["legal"]
        and replay["principalVariationValid"]
        and replay["successConditionMet"]
        and not missing_expected
        and not search["hasAlternativeFirstMove"]
        and search_complete
        and expected_rows_ok
        and eyes_ok
        and not blocking_warning
    )

    return {
        "ok": ok,
        "legal": replay["legal"] and not search["errors"],
        "principalVariationValid": replay["principalVariationValid"],
        "targetCapturedInPV": replay["targetCapturedInPV"],
        "successCondition": get_success_condition(input_data),
        "successConditionMet": replay["successConditionMet"],
        "successMethod": replay["successMethod"],
        "winningFirstMovesVerified": search["winningFirstMovesVerified"],
        "alternativeWinningFirstMoves": search["alternativeWinningFirstMoves"],
        "hasAlternativeFirstMove": search["hasAlternativeFirstMove"],
        "shortestWinLength": search["shortestWinLength"],
        "initialTargetGroup": replay["initialTargetGroup"],
        "currentTargetGroup": replay["currentTargetGroup"],
        "targetGroupHistory": replay["targetGroupHistory"],
        "targetCapturedMove": replay["targetCapturedMove"],
        "targetExpandedByWhiteMoves": replay["targetExpandedByWhiteMoves"],
        "targetSplitOrAmbiguous": replay["targetSplitOrAmbiguous"],
        "targetEyeAnalysis": replay["targetEyeAnalysis"],
        "expectedFinalRowsMatched": replay["expectedFinalRowsMatched"],
        "finalRowsDiff": replay["finalRowsDiff"],
        "firstMoveAnalysis": search["firstMoveAnalysis"],
        "unevaluatedFirstMoves": search["unevaluatedFirstMoves"],
        "bestDefenseLine": search["bestDefenseLine"],
        "whiteDefenses": search["whiteDefenses"],
        "searchCompleteness": search["searchCompleteness"],
        "warnings": warning_messages(warning_details),
        "warningDetails": warning_details,
        "errors": errors,
        "pvBoards": replay["pvBoards"],
        "notes": notes,
    }


def load_input(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("input JSON must contain an object.")
    return data


def main(argv: list[str]) -> int:
    try:
        input_data = load_input(Path(argv[1])) if len(argv) > 1 else SAMPLE_INPUT
        result = verify_tsumego(input_data)
    except Exception as exc:  # CLI should report structured errors instead of a traceback.
        result = {
            "ok": False,
            "legal": False,
            "principalVariationValid": False,
            "targetCapturedInPV": False,
            "successCondition": None,
            "successConditionMet": False,
            "successMethod": None,
            "winningFirstMovesVerified": [],
            "alternativeWinningFirstMoves": [],
            "hasAlternativeFirstMove": False,
            "shortestWinLength": None,
            "warnings": [],
            "warningDetails": [],
            "errors": [str(exc)],
            "pvBoards": [],
            "notes": [],
        }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
