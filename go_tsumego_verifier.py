#!/usr/bin/env python3
"""Lightweight 6x6 tsumego verifier for capture-based black-to-kill problems."""

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

Point = tuple[int, int]
Board = list[list[str]]


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
    "maxDepth": 7,
    "searchRadius": 2,
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


def board_hash(board: Board) -> str:
    return "/".join(board_to_rows(board))


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
        if current in group:
            continue
        if get_cell(board, current) != color:
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


def is_target_captured(board: Board, target_points: list[str] | list[Point], targetColor: str) -> bool:
    return len(resolve_target_group(board, target_points, targetColor)) == 0


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
        "targetStones": [point_to_coord(point) for point in sorted(group)],
        "targetLiberties": [point_to_coord(point) for point in liberties],
        "targetLibertyCount": len(liberties),
    }


def pv_board_entry(move: str, board: Board, target_points: list[Point], target_color: str) -> dict[str, Any]:
    status = target_status(board, target_points, target_color)
    return {
        "move": move,
        "rows": board_to_rows(board),
        "targetStatus": status["targetStatus"],
        "targetLiberties": status["targetLiberties"],
    }


def dedupe_messages(messages: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for message in messages:
        if message not in seen:
            seen.add(message)
            result.append(message)
    return result


def replay_principal_variation(input_data: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    rows = input_data.get("rows")
    row_errors = validate_rows(rows)
    if row_errors:
        return {
            "legal": False,
            "principalVariationValid": False,
            "targetCapturedInPV": False,
            "pvBoards": [],
            "warnings": warnings,
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
            "pvBoards": [],
            "warnings": warnings,
            "errors": [str(exc)],
        }

    principal_variation = input_data.get("principalVariation") or []
    pv_boards = [pv_board_entry("initial", board, target_points, target_color)]
    seen_hashes = {board_hash(board)}
    principal_variation_valid = True

    for index, move in enumerate(principal_variation):
        result = play_move(board, current_color, move)
        if not result.legal:
            principal_variation_valid = False
            errors.append(f"principalVariation[{index}] {move!r} for {color_name(current_color)} is illegal: {result.error}")
            break
        board = result.board
        current_hash = board_hash(board)
        if current_hash in seen_hashes:
            warnings.append(f"repeated position after principalVariation[{index}] {move}; ko/repetition is not fully handled.")
        seen_hashes.add(current_hash)
        pv_boards.append(pv_board_entry(str(move), board, target_points, target_color))
        current_color = opponent(current_color)

    return {
        "legal": principal_variation_valid and not row_errors,
        "principalVariationValid": principal_variation_valid,
        "targetCapturedInPV": is_target_captured(board, target_points, target_color),
        "pvBoards": pv_boards,
        "warnings": dedupe_messages(warnings),
        "errors": errors,
    }


def manhattan(point_a: Point, point_b: Point) -> int:
    return abs(point_a[0] - point_b[0]) + abs(point_a[1] - point_b[1])


def candidate_points_near_target(board: Board, target_points: list[Point], target_color: str, search_radius: int) -> set[Point]:
    target_group = resolve_target_group(board, target_points, target_color)
    anchors = target_group if target_group else set(target_points)
    candidates: set[Point] = set()

    for row in range(BOARD_SIZE):
        for col in range(BOARD_SIZE):
            point = (col, row)
            if get_cell(board, point) != EMPTY:
                continue
            if any(manhattan(point, anchor) <= search_radius for anchor in anchors):
                candidates.add(point)

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

    return {point for point in candidates if in_bounds(point) and get_cell(board, point) == EMPTY}


def candidate_legal_moves(
    board: Board,
    color: str,
    target_points: list[Point],
    target_color: str,
    search_radius: int,
    max_branching_moves: int = DEFAULT_MAX_BRANCHING_MOVES,
) -> list[str]:
    candidate_points = candidate_points_near_target(board, target_points, target_color, search_radius)
    anchors = resolve_target_group(board, target_points, target_color) or set(target_points)

    def sort_key(point: Point) -> tuple[int, int, int]:
        distance = min((manhattan(point, anchor) for anchor in anchors), default=0)
        col, row = point
        return (distance, row, col)

    ordered_points = sorted(candidate_points, key=sort_key)
    moves = [point_to_coord(point) for point in ordered_points if play_move(board, color, point).legal]
    return moves[:max_branching_moves]


def can_black_force_kill(
    board: Board,
    target: list[str] | list[Point],
    depth_remaining: int,
    side_to_move: str,
    target_color: str = WHITE,
    search_radius: int = 2,
    cache: Optional[dict[tuple[str, str, int], bool]] = None,
    warnings: Optional[list[str]] = None,
    history: Optional[set[str]] = None,
    node_budget: Optional[list[int]] = None,
) -> bool:
    cache = cache if cache is not None else {}
    warnings = warnings if warnings is not None else []
    history = history if history is not None else {board_hash(board)}
    node_budget = node_budget if node_budget is not None else [DEFAULT_MAX_SEARCH_NODES]
    target_points = normalize_points(target)
    normalized_target_color = normalize_color(target_color)
    current_color = normalize_color(side_to_move)

    if node_budget[0] <= 0:
        warnings.append("search cut off after reaching the node budget; result is incomplete.")
        return False
    node_budget[0] -= 1

    if is_target_captured(board, target_points, normalized_target_color):
        return True
    if depth_remaining <= 0:
        return False

    cache_key = (board_hash(board), current_color, depth_remaining)
    if cache_key in cache:
        return cache[cache_key]

    moves = candidate_legal_moves(board, current_color, target_points, normalized_target_color, search_radius)
    if not moves:
        cache[cache_key] = False
        return False

    if current_color == BLACK:
        for move in moves:
            result = play_move(board, current_color, move)
            if not result.legal:
                continue
            next_hash = board_hash(result.board)
            if next_hash in history:
                warnings.append(f"search cut off repeated position after {move}; ko/repetition is not fully handled.")
                continue
            if can_black_force_kill(
                result.board,
                target_points,
                depth_remaining - 1,
                WHITE,
                normalized_target_color,
                search_radius,
                cache,
                warnings,
                history | {next_hash},
                node_budget,
            ):
                cache[cache_key] = True
                return True
        cache[cache_key] = False
        return False

    for move in moves:
        result = play_move(board, current_color, move)
        if not result.legal:
            continue
        next_hash = board_hash(result.board)
        if next_hash in history:
            warnings.append(f"search cut off repeated position after {move}; ko/repetition is not fully handled.")
            cache[cache_key] = False
            return False
        if not can_black_force_kill(
            result.board,
            target_points,
            depth_remaining - 1,
            BLACK,
            normalized_target_color,
            search_radius,
            cache,
            warnings,
            history | {next_hash},
            node_budget,
        ):
            cache[cache_key] = False
            return False
    cache[cache_key] = True
    return True


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


def find_winning_first_moves(input_data: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    notes: list[str] = []
    rows = input_data.get("rows")
    row_errors = validate_rows(rows)
    if row_errors:
        return {
            "winningFirstMovesVerified": [],
            "alternativeWinningFirstMoves": [],
            "hasAlternativeFirstMove": False,
            "shortestWinLength": None,
            "warnings": warnings,
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
            "warnings": warnings,
            "errors": [str(exc)],
            "notes": notes,
        }

    if input_data.get("goalType") != "kill":
        errors.append("only goalType='kill' is supported in the first version.")
    if turn_color != BLACK:
        errors.append("only black-to-play tsumego is supported in the first version.")
    if target_color != WHITE:
        warnings.append("first version is intended for black killing a white target.")
    if not target_points:
        errors.append("target must contain at least one coordinate.")
    if errors:
        return {
            "winningFirstMovesVerified": [],
            "alternativeWinningFirstMoves": [],
            "hasAlternativeFirstMove": False,
            "shortestWinLength": None,
            "warnings": dedupe_messages(warnings),
            "errors": errors,
            "notes": notes,
        }

    max_depth = int(input_data.get("maxDepth", 7))
    search_radius = int(input_data.get("searchRadius", 2))
    node_budget = [int(input_data.get("maxNodes", DEFAULT_MAX_SEARCH_NODES))]
    expected_moves = normalize_move_names(input_data.get("winningFirstMoves", []))
    winning_lengths: dict[str, int] = {}
    all_first_moves = list_legal_moves(board, BLACK)
    expected_first = [move for move in expected_moves if move in all_first_moves]
    remaining_first = [move for move in all_first_moves if move not in set(expected_first)]

    for first_move in [*expected_first, *remaining_first]:
        if node_budget[0] <= 0:
            warnings.append("search cut off before all first moves were evaluated; result is incomplete.")
            break
        first_result = play_move(board, BLACK, first_move)
        if not first_result.legal:
            continue
        for total_depth in range(1, max_depth + 1):
            if total_depth == 1:
                forced = is_target_captured(first_result.board, target_points, target_color)
            else:
                forced = can_black_force_kill(
                    first_result.board,
                    target_points,
                    total_depth - 1,
                    WHITE,
                    target_color,
                    search_radius,
                    cache={},
                    warnings=warnings,
                    history={board_hash(board), board_hash(first_result.board)},
                    node_budget=node_budget,
                )
            if forced:
                winning_lengths[first_move] = total_depth
                break

    winning_moves = sorted(winning_lengths, key=lambda move: (winning_lengths[move], coord_to_point(move)))
    if expected_moves:
        verified = [move for move in expected_moves if move in winning_lengths]
        alternatives = [move for move in winning_moves if move not in set(expected_moves)]
        missing = [move for move in expected_moves if move not in winning_lengths]
        if missing:
            notes.append(f"expected winning first moves not verified: {', '.join(missing)}")
    else:
        verified = winning_moves
        alternatives = []

    shortest = min(winning_lengths.values()) if winning_lengths else None
    return {
        "winningFirstMovesVerified": verified,
        "alternativeWinningFirstMoves": alternatives,
        "hasAlternativeFirstMove": bool(alternatives),
        "shortestWinLength": shortest,
        "warnings": dedupe_messages(warnings),
        "errors": errors,
        "notes": notes,
    }


def verify_tsumego(input_data: dict[str, Any]) -> dict[str, Any]:
    replay = replay_principal_variation(input_data)
    search = find_winning_first_moves(input_data)
    errors = dedupe_messages([*replay["errors"], *search["errors"]])
    warnings = dedupe_messages([*replay["warnings"], *search["warnings"]])
    notes = dedupe_messages(search["notes"])
    principal_variation = input_data.get("principalVariation") or []
    expected_moves = normalize_move_names(input_data.get("winningFirstMoves", []))
    missing_expected = [move for move in expected_moves if move not in search["winningFirstMovesVerified"]]

    ok = True
    if errors or not replay["legal"] or not replay["principalVariationValid"]:
        ok = False
    if principal_variation and not replay["targetCapturedInPV"]:
        ok = False
    if missing_expected:
        ok = False
    if search["hasAlternativeFirstMove"]:
        ok = False
    if any("search cut off" in warning for warning in warnings):
        ok = False

    return {
        "ok": ok,
        "legal": replay["legal"] and not search["errors"],
        "principalVariationValid": replay["principalVariationValid"],
        "targetCapturedInPV": replay["targetCapturedInPV"],
        "winningFirstMovesVerified": search["winningFirstMovesVerified"],
        "alternativeWinningFirstMoves": search["alternativeWinningFirstMoves"],
        "hasAlternativeFirstMove": search["hasAlternativeFirstMove"],
        "shortestWinLength": search["shortestWinLength"],
        "warnings": warnings,
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
            "winningFirstMovesVerified": [],
            "alternativeWinningFirstMoves": [],
            "hasAlternativeFirstMove": False,
            "shortestWinLength": None,
            "warnings": [],
            "errors": [str(exc)],
            "pvBoards": [],
            "notes": [],
        }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
