const DEFAULT_BOARD_SIZE = 5;
const AVAILABLE_BOARD_SIZES = [5, 6, 7, 8, 9];
const KOMI_BY_BOARD_SIZE = {
  5: 20,
  6: 4,
  7: 9,
  8: 10,
  9: 7
};
const BLACK = "black";
const WHITE = "white";
const EMPTY = null;
const LAYOUT_TEXT_TOP = "text-top";
const LAYOUT_BOARD_TOP = "board-top";
const LAYOUT_STORAGE_KEY = "go-mini-app-layout";
const APP_MODE_GAME = "game";
const APP_MODE_TSUMEGO = "tsumego";
const TSUMEGO_DATA_KEY = "GO_APP_TSUMEGO_DATA";
const TSUMEGO_DATA = getTsumegoData();
const TSUMEGO_PROBLEMS = TSUMEGO_DATA.problems.map(normalizeTsumegoProblem);

function createBoardFromRows(rows) {
  return rows.map((row) =>
    [...row].map((cell) => {
      if (cell === "B") {
        return BLACK;
      }

      if (cell === "W") {
        return WHITE;
      }

      return EMPTY;
    })
  );
}

function getTsumegoData() {
  const data = typeof globalThis !== "undefined" ? globalThis[TSUMEGO_DATA_KEY] : null;

  if (!data || !Array.isArray(data.problems) || data.problems.length === 0) {
    throw new Error("詰碁データの読み込みに失敗しました。");
  }

  return data;
}

function getPrimaryWinningMove(problem) {
  if (Array.isArray(problem.solution)) {
    return problem.solution;
  }

  const winningFirstMoves = problem.solutions?.winningFirstMoves;
  if (!Array.isArray(winningFirstMoves) || winningFirstMoves.length === 0) {
    return null;
  }

  const primaryEntry =
    winningFirstMoves.find((entry) => entry && entry.isPrimary && Array.isArray(entry.move)) ||
    winningFirstMoves.find((entry) => entry && Array.isArray(entry.move));

  return primaryEntry ? primaryEntry.move : null;
}

function getPrincipalVariation(problem) {
  if (!Array.isArray(problem.solutions?.principalVariation)) {
    return [];
  }

  return problem.solutions.principalVariation;
}

function getWrongFirstMoveDefense(problem) {
  const defense = problem.solutions?.wrongFirstMoveDefense;

  if (!defense || !Array.isArray(defense.move)) {
    return null;
  }

  return defense;
}

function getForcedWrongFirstDefenseMove(problem) {
  const defense = getWrongFirstMoveDefense(problem);
  return defense ? defense.move : null;
}

function getWrongGuidedMoveDefense(problem, lineProgress) {
  const defenses = problem.solutions?.wrongGuidedMoveDefenses;

  if (!Array.isArray(defenses)) {
    return null;
  }

  return defenses.find(
    (defense) => defense && defense.lineProgress === lineProgress && Array.isArray(defense.move)
  ) ?? null;
}

function getTsumegoShortestWinLength(problem) {
  if (Number.isInteger(problem.verification?.shortestWinLength) && problem.verification.shortestWinLength > 0) {
    return problem.verification.shortestWinLength;
  }

  const principalVariation = getPrincipalVariation(problem);
  return principalVariation.length > 0 ? principalVariation.length : 1;
}

function hasGuidedTsumegoLine(problem) {
  return getPrincipalVariation(problem).length > 1;
}

function isPreventWhiteTwoEyesProblem(problem) {
  return problem.goalType === "kill" && problem.solutions?.successCondition === "prevent-white-two-eyes";
}

function isPreventTargetTwoEyesProblem(problem) {
  return problem.goalType === "kill" && problem.solutions?.successCondition === "prevent-target-two-eyes";
}

function normalizePlayer(player, fallback = BLACK) {
  return player === WHITE || player === BLACK ? player : fallback;
}

function formatPlayerName(player) {
  return player === WHITE ? "白" : "黒";
}

function getTsumegoAttackerColor(problem) {
  return normalizePlayer(problem.turn, BLACK);
}

function getTsumegoDefenderColor(problem) {
  return getOpponent(getTsumegoAttackerColor(problem));
}

function isTsumegoWinningFirstMove(problem, row, col) {
  return (problem.solutions?.winningFirstMoves ?? []).some((entry) => isSameMove(entry?.move, [row, col]));
}

function normalizeTsumegoProblem(problem) {
  const boardSize = problem.boardSize ?? TSUMEGO_DATA.boardSize;

  return {
    ...problem,
    boardSize,
    goalType: problem.goalType ?? "capture",
    subtitle: problem.subtitle ?? problem.ui?.subtitle ?? "",
    prompt: problem.prompt ?? problem.ui?.prompt ?? TSUMEGO_DATA.defaultPrompt,
    note: problem.note ?? problem.ui?.note ?? TSUMEGO_DATA.defaultNote,
    solution: getPrimaryWinningMove(problem),
    board: createBoardFromRows(problem.rows)
  };
}

function getTsumegoBoardSize(problem) {
  return problem.boardSize ?? TSUMEGO_DATA.boardSize;
}

function createEmptyBoard(boardSize) {
  return Array.from({ length: boardSize }, () => Array(boardSize).fill(EMPTY));
}

function getKomiForBoardSize(boardSize) {
  return KOMI_BY_BOARD_SIZE[boardSize] ?? KOMI_BY_BOARD_SIZE[DEFAULT_BOARD_SIZE];
}

function createInitialState(boardSize = DEFAULT_BOARD_SIZE) {
  return {
    board: createEmptyBoard(boardSize),
    previousBoard: null,
    currentPlayer: BLACK,
    captures: {
      [BLACK]: 0,
      [WHITE]: 0
    },
    consecutivePasses: 0,
    gameOver: false,
    result: null,
    message: "黒番から開始します。"
  };
}

function getTsumegoProblem(problemId = TSUMEGO_PROBLEMS[0].id) {
  return TSUMEGO_PROBLEMS.find((problem) => problem.id === problemId) ?? TSUMEGO_PROBLEMS[0];
}

function createTsumegoState(problemId = TSUMEGO_PROBLEMS[0].id) {
  const problem = getTsumegoProblem(problemId);
  const firstPlayer = getTsumegoAttackerColor(problem);

  return {
    problemId: problem.id,
    board: cloneBoard(problem.board),
    previousBoard: null,
    currentPlayer: firstPlayer,
    captures: {
      [BLACK]: 0,
      [WHITE]: 0
    },
    message: problem.prompt,
    feedback: "",
    solved: false,
    failed: false,
    phase: "initial",
    overlay: null,
    pendingAutoWhite: null,
    autoWhiteEnabled: false,
    lineProgress: 0
  };
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function cloneState(state) {
  return {
    ...state,
    board: cloneBoard(state.board),
    previousBoard: state.previousBoard ? cloneBoard(state.previousBoard) : null,
    captures: { ...state.captures },
    result: state.result
      ? {
          ...state.result,
          deadStones: state.result.deadStones ? { ...state.result.deadStones } : undefined
        }
      : null
  };
}

function getBoardSize(board) {
  return board.length;
}

function boardsEqual(boardA, boardB) {
  if (!boardA || !boardB) {
    return false;
  }

  if (boardA.length !== boardB.length) {
    return false;
  }

  for (let row = 0; row < boardA.length; row += 1) {
    for (let col = 0; col < boardA.length; col += 1) {
      if (boardA[row][col] !== boardB[row][col]) {
        return false;
      }
    }
  }

  return true;
}

function getOpponent(player) {
  return player === BLACK ? WHITE : BLACK;
}

function formatScore(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function isInsideBoard(row, col, boardSize) {
  return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

function getNeighbors(row, col, boardSize) {
  return [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1]
  ].filter(([nextRow, nextCol]) => isInsideBoard(nextRow, nextCol, boardSize));
}

function toKey(row, col) {
  return `${row},${col}`;
}

function getGroupInfo(board, startRow, startCol) {
  const boardSize = getBoardSize(board);
  const color = board[startRow][startCol];

  if (color === EMPTY) {
    return {
      stones: [],
      liberties: new Set()
    };
  }

  const stack = [[startRow, startCol]];
  const visited = new Set([toKey(startRow, startCol)]);
  const stones = [];
  const liberties = new Set();

  while (stack.length > 0) {
    const [row, col] = stack.pop();
    stones.push([row, col]);

    for (const [nextRow, nextCol] of getNeighbors(row, col, boardSize)) {
      const neighbor = board[nextRow][nextCol];
      const key = toKey(nextRow, nextCol);

      if (neighbor === EMPTY) {
        liberties.add(key);
        continue;
      }

      if (neighbor === color && !visited.has(key)) {
        visited.add(key);
        stack.push([nextRow, nextCol]);
      }
    }
  }

  return { stones, liberties };
}

function removeGroup(board, stones) {
  for (const [row, col] of stones) {
    board[row][col] = EMPTY;
  }
}

function collectGroups(board) {
  const boardSize = getBoardSize(board);
  const visited = new Set();
  const groups = [];
  const groupIdByStone = new Map();

  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      const color = board[row][col];
      const key = toKey(row, col);

      if (color === EMPTY || visited.has(key)) {
        continue;
      }

      const info = getGroupInfo(board, row, col);
      const id = groups.length;

      info.stones.forEach(([stoneRow, stoneCol]) => {
        const stoneKey = toKey(stoneRow, stoneCol);
        visited.add(stoneKey);
        groupIdByStone.set(stoneKey, id);
      });

      groups.push({
        id,
        color,
        stones: info.stones,
        liberties: info.liberties,
        libertyRegionIds: new Set(),
        eyeRegionIds: new Set()
      });
    }
  }

  return { groups, groupIdByStone };
}

function collectEmptyRegions(board, groupIdByStone) {
  const boardSize = getBoardSize(board);
  const visited = new Set();
  const regions = [];
  const regionIdByPoint = new Map();

  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      const startKey = toKey(row, col);
      if (board[row][col] !== EMPTY || visited.has(startKey)) {
        continue;
      }

      const stack = [[row, col]];
      const points = [];
      const borderingColors = new Set();
      const borderingGroupIds = new Set();
      const id = regions.length;

      visited.add(startKey);
      regionIdByPoint.set(startKey, id);

      while (stack.length > 0) {
        const [currentRow, currentCol] = stack.pop();
        points.push([currentRow, currentCol]);

        for (const [nextRow, nextCol] of getNeighbors(currentRow, currentCol, boardSize)) {
          const neighbor = board[nextRow][nextCol];
          const neighborKey = toKey(nextRow, nextCol);

          if (neighbor === EMPTY) {
            if (!visited.has(neighborKey)) {
              visited.add(neighborKey);
              regionIdByPoint.set(neighborKey, id);
              stack.push([nextRow, nextCol]);
            }
            continue;
          }

          borderingColors.add(neighbor);
          const groupId = groupIdByStone.get(neighborKey);
          if (groupId !== undefined) {
            borderingGroupIds.add(groupId);
          }
        }
      }

      regions.push({
        id,
        points,
        borderingColors,
        borderingGroupIds
      });
    }
  }

  return { regions, regionIdByPoint };
}

function analyzeBoard(board) {
  const { groups, groupIdByStone } = collectGroups(board);
  const { regions, regionIdByPoint } = collectEmptyRegions(board, groupIdByStone);

  regions.forEach((region) => {
    region.borderingGroupIds.forEach((groupId) => {
      groups[groupId].libertyRegionIds.add(region.id);
    });

    if (region.borderingColors.size !== 1 || region.borderingGroupIds.size !== 1) {
      return;
    }

    const [groupId] = region.borderingGroupIds;
    const group = groups[groupId];
    if (group && group.color === [...region.borderingColors][0]) {
      group.eyeRegionIds.add(region.id);
    }
  });

  return {
    groups,
    groupIdByStone,
    emptyRegions: regions,
    regionIdByPoint
  };
}

function getEmptyRegionInfo(board, startRow, startCol) {
  const boardSize = getBoardSize(board);
  if (!isInsideBoard(startRow, startCol, boardSize) || board[startRow][startCol] !== EMPTY) {
    return {
      points: [],
      borderingColors: new Set()
    };
  }

  const stack = [[startRow, startCol]];
  const visited = new Set([toKey(startRow, startCol)]);
  const points = [];
  const borderingColors = new Set();

  while (stack.length > 0) {
    const [row, col] = stack.pop();
    points.push([row, col]);

    for (const [nextRow, nextCol] of getNeighbors(row, col, boardSize)) {
      const neighbor = board[nextRow][nextCol];
      const key = toKey(nextRow, nextCol);

      if (neighbor === EMPTY) {
        if (!visited.has(key)) {
          visited.add(key);
          stack.push([nextRow, nextCol]);
        }
        continue;
      }

      borderingColors.add(neighbor);
    }
  }

  return { points, borderingColors };
}

function isClearlyDeadGroup(group, board) {
  if (group.eyeRegionIds.size >= 2) {
    return false;
  }

  // 「明らかに死んでいる石」だけを除外したいので、
  // 眼が少なく、呼吸点も狭く、取り除いたあと完全に相手地になる形だけを対象にします。
  if (group.libertyRegionIds.size > 1 || group.liberties.size > 3) {
    return false;
  }

  const opponent = getOpponent(group.color);
  const boardWithoutGroup = cloneBoard(board);
  removeGroup(boardWithoutGroup, group.stones);
  const [sampleRow, sampleCol] = group.stones[0];
  const mergedRegion = getEmptyRegionInfo(boardWithoutGroup, sampleRow, sampleCol);

  return mergedRegion.borderingColors.size === 1 && mergedRegion.borderingColors.has(opponent);
}

function removeClearlyDeadGroupsForScoring(board) {
  const scoringBoard = cloneBoard(board);
  const deadStones = {
    [BLACK]: 0,
    [WHITE]: 0
  };

  let changed = true;
  while (changed) {
    changed = false;
    const analysis = analyzeBoard(scoringBoard);
    const deadGroups = analysis.groups.filter((group) => isClearlyDeadGroup(group, scoringBoard));

    if (deadGroups.length === 0) {
      continue;
    }

    deadGroups.forEach((group) => {
      deadStones[group.color] += group.stones.length;
      removeGroup(scoringBoard, group.stones);
    });

    changed = true;
  }

  return { scoringBoard, deadStones };
}

function evaluateBoard(board) {
  const boardSize = getBoardSize(board);
  const komi = getKomiForBoardSize(boardSize);
  const { scoringBoard, deadStones } = removeClearlyDeadGroupsForScoring(board);
  let blackStones = 0;
  let whiteStones = 0;
  let blackTerritory = 0;
  let whiteTerritory = 0;
  let neutralPoints = 0;
  const visitedEmpty = new Set();

  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      const value = scoringBoard[row][col];

      if (value === BLACK) {
        blackStones += 1;
        continue;
      }

      if (value === WHITE) {
        whiteStones += 1;
        continue;
      }

      const startKey = toKey(row, col);
      if (visitedEmpty.has(startKey)) {
        continue;
      }

      const stack = [[row, col]];
      const region = [];
      const borderingColors = new Set();
      visitedEmpty.add(startKey);

      while (stack.length > 0) {
        const [currentRow, currentCol] = stack.pop();
        region.push([currentRow, currentCol]);

        for (const [nextRow, nextCol] of getNeighbors(currentRow, currentCol, boardSize)) {
          const neighbor = scoringBoard[nextRow][nextCol];
          const key = toKey(nextRow, nextCol);

          if (neighbor === EMPTY && !visitedEmpty.has(key)) {
            visitedEmpty.add(key);
            stack.push([nextRow, nextCol]);
            continue;
          }

          if (neighbor === BLACK || neighbor === WHITE) {
            borderingColors.add(neighbor);
          }
        }
      }

      if (borderingColors.size === 1) {
        if (borderingColors.has(BLACK)) {
          blackTerritory += region.length;
        } else {
          whiteTerritory += region.length;
        }
      } else {
        neutralPoints += region.length;
      }
    }
  }

  const blackArea = blackStones + blackTerritory;
  const whiteArea = whiteStones + whiteTerritory;
  const blackScore = blackArea;
  const whiteScore = whiteArea + komi;
  const scoreDiff = blackScore - whiteScore;

  let winner = null;
  let margin = 0;

  if (scoreDiff > 0) {
    winner = BLACK;
    margin = scoreDiff;
  } else if (scoreDiff < 0) {
    winner = WHITE;
    margin = Math.abs(scoreDiff);
  }

  return {
    boardSize,
    blackStones,
    whiteStones,
    blackTerritory,
    whiteTerritory,
    neutralPoints,
    blackArea,
    whiteArea,
    blackScore,
    whiteScore,
    komi,
    deadStones,
    winner,
    margin
  };
}

function createGameOverMessage(result) {
  if (result.winner === BLACK) {
    return `連続パスで終局です。\n黒の${formatScore(result.margin)}目勝ちです。`;
  }

  if (result.winner === WHITE) {
    return `連続パスで終局です。\n白の${formatScore(result.margin)}目勝ちです。`;
  }

  return "連続パスで終局です。\n持碁です。";
}

function createNoteText(boardSize) {
  return [
    `コミは${formatScore(getKomiForBoardSize(boardSize))}目です。`,
    "2連続パスで終局します。",
    "中国ルールで、最終判定は盤上の石数と地で計算します。"
  ].join("\n");
}

function createResultText(result) {
  const lines = [
    "盤面評価です。",
    `黒は${formatScore(result.blackArea)}目です。石${result.blackStones}、地${result.blackTerritory}です。`,
    `白は${formatScore(result.whiteArea)}目です。石${result.whiteStones}、地${result.whiteTerritory}です。`,
    `コミは${formatScore(result.komi)}目です。`,
    `白の合計は${formatScore(result.whiteScore)}目です。`
  ];

  if (result.deadStones[BLACK] > 0 || result.deadStones[WHITE] > 0) {
    lines.push(`死石として扱った石は、黒${result.deadStones[BLACK]}、白${result.deadStones[WHITE]}です。`);
  }

  return lines.join("\n");
}

function isSameMove(moveA, moveB) {
  return Array.isArray(moveA) && Array.isArray(moveB) && moveA[0] === moveB[0] && moveA[1] === moveB[1];
}

function createTsumegoSuccessMessage(problem) {
  const targetName = formatPlayerName(getTsumegoTargetColor(problem));

  if (problem.goalType === "live") {
    if (getTsumegoShortestWinLength(problem) > 1) {
      return `正解です。${getTsumegoShortestWinLength(problem)}手で黒が2眼で生きました。\nこの局面から続きを打って確認できます。`;
    }

    return "正解です。黒が2眼で生きました。\nこの局面から続きを打って確認できます。";
  }

  if (problem.goalType === "kill" && getTsumegoShortestWinLength(problem) > 1) {
    return `正解です。${getTsumegoShortestWinLength(problem)}手で${targetName}を殺しました。\nこの局面から続きを打って確認できます。`;
  }

  if (isPreventWhiteTwoEyesProblem(problem) || isPreventTargetTwoEyesProblem(problem)) {
    return `正解です。${targetName}の2眼をつぶしました。\nこの局面から続きを打って確認できます。`;
  }

  return `正解です。${targetName}を取りました。\nこの局面から続きを打って確認できます。`;
}

function createTsumegoSuccessFeedback(problem) {
  const targetName = formatPlayerName(getTsumegoTargetColor(problem));

  if (problem.goalType === "live") {
    if (getTsumegoShortestWinLength(problem) > 1) {
      return "白の応手を読んで2眼を完成させました。";
    }

    return "この1手で2眼を作れました。";
  }

  if (problem.goalType === "kill" && getTsumegoShortestWinLength(problem) > 1) {
    return `${targetName}の逃げ道をふさいで仕留めました。`;
  }

  if (isPreventWhiteTwoEyesProblem(problem) || isPreventTargetTwoEyesProblem(problem)) {
    return `この1手で${targetName}は2眼を作れなくなりました。`;
  }

  return `この1手で${targetName}が取れました。`;
}

function createTsumegoFailureFeedback(problem) {
  if (isPreventWhiteTwoEyesProblem(problem)) {
    return "この問題は1手で白の2眼をつぶす問題です。";
  }

  return `この問題は${getTsumegoShortestWinLength(problem)}手詰めです。`;
}

function createGuidedAutoWhiteMessage(problem, hasFinalBlackMove, defenderPlayer = WHITE) {
  const defenderName = formatPlayerName(defenderPlayer);

  if (problem.goalType === "live") {
    return hasFinalBlackMove
      ? `${defenderName}が応手しました。\n黒番で最後の1手を打って黒を生かしてください。`
      : `${defenderName}が応手しました。\n黒番で続きを打って黒を生かしてください。`;
  }

  if (problem.goalType === "kill") {
    return hasFinalBlackMove
      ? `${defenderName}が最強に応じました。\n次の1手でトドメを打ってください。`
      : `${defenderName}が最強に応じました。\n続きを打ってください。`;
  }

  return hasFinalBlackMove
    ? `${defenderName}が応手しました。\n最後の1手を打ってください。`
    : `${defenderName}が応手しました。\n続きを打ってください。`;
}

function createGuidedAutoWhiteFeedback(problem, hasFinalBlackMove, defenderPlayer = WHITE) {
  const defenderName = formatPlayerName(defenderPlayer);

  if (problem.goalType === "live") {
    return hasFinalBlackMove
      ? `${defenderName}の応手まで進みました。最後の黒で2眼を完成させてください。`
      : `${defenderName}の応手まで進みました。`;
  }

  if (problem.goalType === "kill") {
    return hasFinalBlackMove ? `${defenderName}の最強応手まで進みました。` : `${defenderName}の応手まで進みました。`;
  }

  return `${defenderName}の応手まで進みました。`;
}

function getTsumegoTargetColor(problem) {
  return normalizePlayer(problem.target?.color, problem.goalType === "live" ? BLACK : WHITE);
}

function getRemainingTsumegoTargetStones(board, problem) {
  const targetColor = getTsumegoTargetColor(problem);

  return problem.targetStones.filter(
    ([row, col]) => isInsideBoard(row, col, getBoardSize(board)) && board[row][col] === targetColor
  );
}

function collectTsumegoTargetGroups(board, problem) {
  const targetColor = getTsumegoTargetColor(problem);
  const visited = new Set();
  const groups = [];

  problem.targetStones.forEach(([row, col]) => {
    if (!isInsideBoard(row, col, getBoardSize(board)) || board[row][col] !== targetColor) {
      return;
    }

    const key = toKey(row, col);
    if (visited.has(key)) {
      return;
    }

    const groupInfo = getGroupInfo(board, row, col);
    groupInfo.stones.forEach(([stoneRow, stoneCol]) => {
      visited.add(toKey(stoneRow, stoneCol));
    });
    groups.push(groupInfo);
  });

  return groups;
}

function getTsumegoTargetLibertyCount(board, problem) {
  const liberties = new Set();

  collectTsumegoTargetGroups(board, problem).forEach((groupInfo) => {
    groupInfo.liberties.forEach((liberty) => {
      liberties.add(liberty);
    });
  });

  return liberties.size;
}

function getTsumegoTargetGroups(board, problem) {
  const analysis = analyzeBoard(board);
  const targetColor = getTsumegoTargetColor(problem);
  const groupIds = new Set();

  problem.targetStones.forEach(([row, col]) => {
    if (!isInsideBoard(row, col, getBoardSize(board)) || board[row][col] !== targetColor) {
      return;
    }

    const groupId = analysis.groupIdByStone.get(toKey(row, col));
    if (groupId !== undefined) {
      groupIds.add(groupId);
    }
  });

  return [...groupIds].map((groupId) => analysis.groups[groupId]);
}

function isTsumegoLiveByTwoEyes(board, problem) {
  const remainingTargets = getRemainingTsumegoTargetStones(board, problem);
  if (remainingTargets.length !== problem.targetStones.length) {
    return false;
  }

  const targetGroups = getTsumegoTargetGroups(board, problem);
  return targetGroups.length > 0 && targetGroups.every((group) => group.eyeRegionIds.size >= 2);
}

function isTsumegoTargetColorAliveByTwoEyes(board, problem, targetColor) {
  const analysis = analyzeBoard(board);
  const groupIds = new Set();

  problem.targetStones.forEach(([row, col]) => {
    if (!isInsideBoard(row, col, getBoardSize(board)) || board[row][col] !== targetColor) {
      return;
    }

    const groupId = analysis.groupIdByStone.get(toKey(row, col));
    if (groupId !== undefined) {
      groupIds.add(groupId);
    }
  });

  const targetGroups = [...groupIds].map((groupId) => analysis.groups[groupId]);
  return targetGroups.length > 0 && targetGroups.every((group) => group.eyeRegionIds.size >= 2);
}

function createForcedWrongFirstDefenseMessage(problem, board) {
  const targetColor = getTsumegoTargetColor(problem);
  const targetName = formatPlayerName(targetColor);

  if (problem.goalType === "kill" && isTsumegoTargetColorAliveByTwoEyes(board, problem, targetColor)) {
    return `不正解です。${targetName}が急所に打って2眼を作りました。\nこの局面から続きを打って確認できます。`;
  }

  return `不正解です。${targetName}が最強応手を返しました。\nこの局面から続きを打って確認できます。`;
}

function createForcedWrongFirstDefenseFeedback(problem, board) {
  const targetColor = getTsumegoTargetColor(problem);
  const targetName = formatPlayerName(targetColor);

  if (problem.goalType === "kill" && isTsumegoTargetColorAliveByTwoEyes(board, problem, targetColor)) {
    return `${targetName}が2眼で生きる形になりました。`;
  }

  return `${targetName}の最強応手を自動で進めました。`;
}

function createTsumegoGameState(tsumegoState, currentPlayer = tsumegoState.currentPlayer) {
  return {
    board: cloneBoard(tsumegoState.board),
    previousBoard: tsumegoState.previousBoard ? cloneBoard(tsumegoState.previousBoard) : null,
    currentPlayer,
    captures: { ...tsumegoState.captures },
    consecutivePasses: 0,
    gameOver: false,
    result: null,
    message: tsumegoState.message
  };
}

function isAttackFirstBlackStoneDefense(defense) {
  return defense?.label === "attack-first-black-stone";
}

function chooseAutoWhiteMoveForLiveProblem(tsumegoState, problem) {
  const currentGroups = collectTsumegoTargetGroups(tsumegoState.board, problem);
  const currentTargetCount = getRemainingTsumegoTargetStones(tsumegoState.board, problem).length;
  const primaryWinningMove = getPrimaryWinningMove(problem);
  const solutionKey = Array.isArray(primaryWinningMove) ? toKey(primaryWinningMove[0], primaryWinningMove[1]) : null;

  if (currentGroups.length === 0 || currentTargetCount === 0) {
    return null;
  }

  const candidateMoves = new Set();
  currentGroups.forEach((groupInfo) => {
    groupInfo.liberties.forEach((liberty) => {
      candidateMoves.add(liberty);
    });
  });

  let bestMove = null;

  candidateMoves.forEach((candidateKey) => {
    const [row, col] = candidateKey.split(",").map(Number);
    const moveResult = attemptMove(createTsumegoGameState(tsumegoState, WHITE), row, col);

    if (!moveResult.valid) {
      return;
    }

    const remainingTargetCount = getRemainingTsumegoTargetStones(moveResult.nextState.board, problem).length;
    const libertyCount = getTsumegoTargetLibertyCount(moveResult.nextState.board, problem);
    const capturedCount = currentTargetCount - remainingTargetCount;
    const solutionBonus = candidateKey === solutionKey ? 100 : 0;
    const score = capturedCount * 1000 + solutionBonus - libertyCount;

    if (!bestMove || score > bestMove.score) {
      bestMove = {
        score,
        nextState: moveResult.nextState
      };
    }
  });

  return bestMove;
}

function createPendingAutoWhiteStep(tsumegoState, problem) {
  const initialTargetCount = getRemainingTsumegoTargetStones(tsumegoState.board, problem).length;
  const wrongFirstMoveDefense = getWrongFirstMoveDefense(problem);
  const forcedWrongFirstDefenseMove = getForcedWrongFirstDefenseMove(problem);
  const wrongGuidedMoveDefense = getWrongGuidedMoveDefense(problem, tsumegoState.lineProgress);
  let selectedNextState = null;
  let selectedWrongGuidedMoveDefense = null;

  if (
    tsumegoState.phase === "initial" &&
    tsumegoState.lineProgress === 0 &&
    Array.isArray(forcedWrongFirstDefenseMove)
  ) {
    const forcedMoveResult = attemptMove(
      createTsumegoGameState(tsumegoState, WHITE),
      forcedWrongFirstDefenseMove[0],
      forcedWrongFirstDefenseMove[1]
    );

    if (forcedMoveResult.valid) {
      selectedNextState = forcedMoveResult.nextState;
    }
  }

  if (!selectedNextState && tsumegoState.phase === "guided-play" && wrongGuidedMoveDefense) {
    const forcedMoveResult = attemptMove(
      createTsumegoGameState(tsumegoState, WHITE),
      wrongGuidedMoveDefense.move[0],
      wrongGuidedMoveDefense.move[1]
    );

    if (forcedMoveResult.valid) {
      selectedNextState = forcedMoveResult.nextState;
      selectedWrongGuidedMoveDefense = wrongGuidedMoveDefense;
    }
  }

  if (!selectedNextState) {
    if (problem.goalType !== "live") {
      return null;
    }

    const bestMove = chooseAutoWhiteMoveForLiveProblem(tsumegoState, problem);

    if (!bestMove) {
      return null;
    }

    selectedNextState = bestMove.nextState;
  }

  const remainingTargetCount = getRemainingTsumegoTargetStones(selectedNextState.board, problem).length;
  const capturedCount = initialTargetCount - remainingTargetCount;
  const forcedWhiteTwoEyes =
    wrongFirstMoveDefense?.outcome === "white-live" &&
    wrongFirstMoveDefense?.shape === "two-eyes" &&
    isTsumegoLiveByTwoEyes(selectedNextState.board, problem);
  const autoWhiteEnabled = problem.goalType === "live" && remainingTargetCount > 0;

  return {
    board: selectedNextState.board,
    previousBoard: selectedNextState.previousBoard,
    currentPlayer: selectedNextState.currentPlayer,
    captures: selectedNextState.captures,
    autoWhiteEnabled,
    message:
      selectedWrongGuidedMoveDefense
        ? isAttackFirstBlackStoneDefense(selectedWrongGuidedMoveDefense)
          ? "不正解です。白が黒の初手の石を取りに行きました。\n黒番で続きを打って確認できます。"
          : "不正解です。白が最強応手を返しました。\n黒番で続きを打って確認できます。"
        : forcedWhiteTwoEyes
        ? "不正解です。白が急所に入って2眼を作りました。\n黒番で続きを打って確認できます。"
        : remainingTargetCount === 0
        ? "不正解です。白が1手ずつ進めて黒石を取りました。\n続きを打って確認できます。"
        : capturedCount > 0
          ? "不正解です。白が1手進めて黒石を減らしました。\n黒番で続きを打って確認できます。"
          : "不正解です。白が1手進めました。\n黒番で続きを打って確認できます。",
    feedback:
      selectedWrongGuidedMoveDefense
        ? isAttackFirstBlackStoneDefense(selectedWrongGuidedMoveDefense)
          ? "黒の初手の石が狙われています。"
          : "白の最強応手を自動で進めました。"
        : forcedWhiteTwoEyes
        ? "白の決め手で2眼生きになりました。"
        : remainingTargetCount === 0
        ? "白の読み筋で黒が取られました。"
        : capturedCount > 0
          ? "白が急所に打って黒石を詰めています。"
          : "白の次の1手を自動で進めました。"
  };
}

function createPendingGuidedAutoWhiteStep(tsumegoState, problem) {
  const principalVariation = getPrincipalVariation(problem);
  const replyEntry = principalVariation[tsumegoState.lineProgress];

  if (!replyEntry || replyEntry.player !== tsumegoState.currentPlayer || !Array.isArray(replyEntry.move)) {
    return null;
  }

  const moveResult = attemptMove(
    createTsumegoGameState(
      {
        ...tsumegoState,
        currentPlayer: replyEntry.player
      },
      replyEntry.player
    ),
    replyEntry.move[0],
    replyEntry.move[1]
  );

  if (!moveResult.valid) {
    return null;
  }

  const nextLineProgress = tsumegoState.lineProgress + 1;
  const nextEntry = principalVariation[nextLineProgress];
  const promptForSolver = nextEntry && nextEntry.player === moveResult.nextState.currentPlayer;
  const remainingBlackMoves = principalVariation
    .slice(nextLineProgress)
    .filter((entry) => entry.player === getTsumegoAttackerColor(problem)).length;
  const hasFinalBlackMove = promptForSolver && remainingBlackMoves === 1;

  return {
    board: moveResult.nextState.board,
    previousBoard: moveResult.nextState.previousBoard,
    currentPlayer: moveResult.nextState.currentPlayer,
    captures: moveResult.nextState.captures,
    autoWhiteEnabled: false,
    lineProgress: nextLineProgress,
    solved: false,
    failed: false,
    overlay: null,
    phase: promptForSolver ? "guided-play" : "free-play",
    message: promptForSolver
      ? createGuidedAutoWhiteMessage(problem, hasFinalBlackMove, replyEntry.player)
      : `${formatPlayerName(replyEntry.player)}が応手しました。\nこの局面から続きを打って確認できます。`,
    feedback: promptForSolver
      ? createGuidedAutoWhiteFeedback(problem, hasFinalBlackMove, replyEntry.player)
      : `${formatPlayerName(replyEntry.player)}の応手まで自動で進めました。`
  };
}

function createPendingForcedWrongFirstDefenseStep(tsumegoState, problem) {
  const forcedWrongFirstDefenseMove = getForcedWrongFirstDefenseMove(problem);
  const defenderColor = getTsumegoDefenderColor(problem);

  if (!Array.isArray(forcedWrongFirstDefenseMove)) {
    return null;
  }

  const moveResult = attemptMove(
    createTsumegoGameState(
      {
        ...tsumegoState,
        currentPlayer: defenderColor
      },
      defenderColor
    ),
    forcedWrongFirstDefenseMove[0],
    forcedWrongFirstDefenseMove[1]
  );

  if (!moveResult.valid) {
    return null;
  }

  return {
    board: moveResult.nextState.board,
    previousBoard: moveResult.nextState.previousBoard,
    currentPlayer: moveResult.nextState.currentPlayer,
    captures: moveResult.nextState.captures,
    autoWhiteEnabled: false,
    solved: false,
    failed: true,
    overlay: "failure",
    phase: "free-play",
    message: createForcedWrongFirstDefenseMessage(problem, moveResult.nextState.board),
    feedback: createForcedWrongFirstDefenseFeedback(problem, moveResult.nextState.board)
  };
}

function queueAutoWhiteStep(tsumegoState, problem, waitingMessage, waitingFeedback) {
  const pendingAutoWhite = createPendingAutoWhiteStep(tsumegoState, problem);

  if (!pendingAutoWhite) {
    return {
      ...tsumegoState,
      currentPlayer: BLACK,
      phase: "free-play",
      pendingAutoWhite: null,
      autoWhiteEnabled: false,
      message: "不正解です。\nこの局面から続きを打って確認できます。",
      feedback: "白の自動応手はここで止まりました。"
    };
  }

  return {
    ...tsumegoState,
    phase: "awaiting-auto-white",
    pendingAutoWhite,
    message: waitingMessage,
    feedback: waitingFeedback
  };
}

function queueGuidedAutoWhiteStep(tsumegoState, problem, waitingMessage, waitingFeedback) {
  const pendingAutoWhite = createPendingGuidedAutoWhiteStep(tsumegoState, problem);

  if (!pendingAutoWhite) {
    return {
      ...tsumegoState,
      phase: "free-play",
      pendingAutoWhite: null,
      autoWhiteEnabled: false,
      message: "正しい筋でしたが、白の自動応手を進められませんでした。\nこの局面から続きを打って確認できます。",
      feedback: "主変化の白応手を再現できませんでした。"
    };
  }

  return {
    ...tsumegoState,
    phase: "awaiting-auto-white",
    pendingAutoWhite,
    message: waitingMessage,
    feedback: waitingFeedback
  };
}

function queueForcedWrongFirstDefenseStep(tsumegoState, problem, waitingMessage, waitingFeedback) {
  const pendingAutoWhite = createPendingForcedWrongFirstDefenseStep(tsumegoState, problem);

  if (!pendingAutoWhite) {
    return {
      ...tsumegoState,
      currentPlayer: BLACK,
      phase: "free-play",
      pendingAutoWhite: null,
      autoWhiteEnabled: false,
      message: "不正解です。\nこの局面から続きを打って確認できます。",
      feedback: "白の強制応手を再現できませんでした。"
    };
  }

  return {
    ...tsumegoState,
    phase: "awaiting-auto-white",
    pendingAutoWhite,
    message: waitingMessage,
    feedback: waitingFeedback
  };
}

function applyPendingTsumegoAutoWhite(tsumegoState) {
  if (!tsumegoState.pendingAutoWhite) {
    return tsumegoState;
  }

  return {
    ...tsumegoState,
    board: tsumegoState.pendingAutoWhite.board,
    previousBoard: tsumegoState.pendingAutoWhite.previousBoard,
    currentPlayer: tsumegoState.pendingAutoWhite.currentPlayer,
    captures: tsumegoState.pendingAutoWhite.captures,
    message: tsumegoState.pendingAutoWhite.message,
    feedback: tsumegoState.pendingAutoWhite.feedback,
    solved: tsumegoState.pendingAutoWhite.solved ?? tsumegoState.solved,
    failed: tsumegoState.pendingAutoWhite.failed ?? tsumegoState.failed,
    overlay: tsumegoState.pendingAutoWhite.overlay ?? tsumegoState.overlay,
    phase: tsumegoState.pendingAutoWhite.phase ?? "free-play",
    pendingAutoWhite: null,
    autoWhiteEnabled: tsumegoState.pendingAutoWhite.autoWhiteEnabled ?? false,
    lineProgress: tsumegoState.pendingAutoWhite.lineProgress ?? tsumegoState.lineProgress
  };
}

function isTsumegoSolved(board, problem) {
  if (problem.goalType === "live") {
    return isTsumegoLiveByTwoEyes(board, problem);
  }

  if (isPreventTargetTwoEyesProblem(problem)) {
    return !isTsumegoLiveByTwoEyes(board, problem);
  }

  return problem.targetStones.every(([row, col]) => board[row][col] === EMPTY);
}

function attemptTsumegoMove(tsumegoState, row, col) {
  const problem = getTsumegoProblem(tsumegoState.problemId);
  const hasForcedWrongFirstDefense =
    Array.isArray(getForcedWrongFirstDefenseMove(problem)) &&
    tsumegoState.phase === "initial" &&
    tsumegoState.lineProgress === 0;

  if (tsumegoState.phase === "awaiting-auto-white") {
    return {
      valid: false,
      message: "白の応手を待っています。"
    };
  }

  const moveResult = attemptMove(createTsumegoGameState(tsumegoState), row, col);

  if (!moveResult.valid) {
    return {
      valid: false,
      message: moveResult.message
    };
  }

  if (tsumegoState.phase === "free-play") {
    const continuedState = {
      ...tsumegoState,
      board: moveResult.nextState.board,
      previousBoard: moveResult.nextState.previousBoard,
      currentPlayer: moveResult.nextState.currentPlayer,
      captures: moveResult.nextState.captures,
      message: moveResult.nextState.message
    };

    if (problem.goalType === "live" && tsumegoState.autoWhiteEnabled && continuedState.currentPlayer === WHITE) {
      return {
        valid: true,
        nextState: queueAutoWhiteStep(
          continuedState,
          problem,
          "0.5秒後に白が次の1手を打ちます。",
          "白の応手を1手ずつ確認できます。"
        )
      };
    }

    return {
      valid: true,
      nextState: continuedState
    };
  }

  if (hasGuidedTsumegoLine(problem)) {
    const principalVariation = getPrincipalVariation(problem);
    const expectedEntry = principalVariation[tsumegoState.lineProgress];
    const moveMatchesLine =
      expectedEntry?.player === tsumegoState.currentPlayer && isSameMove([row, col], expectedEntry.move);

    if (!moveMatchesLine) {
      if (problem.goalType === "live") {
        return {
          valid: true,
          nextState: queueAutoWhiteStep(
            {
              ...tsumegoState,
              board: moveResult.nextState.board,
              previousBoard: moveResult.nextState.previousBoard,
              currentPlayer: WHITE,
              captures: moveResult.nextState.captures,
              solved: false,
              failed: true,
              overlay: "failure",
              autoWhiteEnabled: problem.goalType === "live"
            },
            problem,
            "不正解です。0.5秒後に白が応手します。",
            createTsumegoFailureFeedback(problem)
          )
        };
      }

      if (hasForcedWrongFirstDefense) {
        return {
          valid: true,
          nextState: queueForcedWrongFirstDefenseStep(
            {
              ...tsumegoState,
              board: moveResult.nextState.board,
              previousBoard: moveResult.nextState.previousBoard,
              currentPlayer: WHITE,
              captures: moveResult.nextState.captures,
              solved: false,
              failed: true,
              overlay: "failure",
              autoWhiteEnabled: false
            },
            problem,
            "不正解です。0.5秒後に白が急所へ応じます。",
            "まずは白の最強応手を確認してください。"
          )
        };
      }

      return {
        valid: true,
        nextState: {
          ...tsumegoState,
          board: moveResult.nextState.board,
          previousBoard: moveResult.nextState.previousBoard,
          currentPlayer: moveResult.nextState.currentPlayer,
          captures: moveResult.nextState.captures,
          message: "不正解です。\nこの局面から続きを打って確認できます。",
          feedback: createTsumegoFailureFeedback(problem),
          solved: false,
          failed: true,
          phase: "free-play",
          overlay: "failure",
          pendingAutoWhite: null,
          autoWhiteEnabled: false
        }
      };
    }

    const progressedState = {
      ...tsumegoState,
      board: moveResult.nextState.board,
      previousBoard: moveResult.nextState.previousBoard,
      currentPlayer: moveResult.nextState.currentPlayer,
      captures: moveResult.nextState.captures,
      lineProgress: tsumegoState.lineProgress + 1
    };
    const nextEntry = principalVariation[progressedState.lineProgress];
    const solved = isTsumegoSolved(moveResult.nextState.board, problem);

    if (!nextEntry && solved) {
      return {
        valid: true,
        nextState: {
          ...progressedState,
          message: createTsumegoSuccessMessage(problem),
          feedback: createTsumegoSuccessFeedback(problem),
          solved: true,
          failed: false,
          phase: "free-play",
          overlay: "success",
          pendingAutoWhite: null,
          autoWhiteEnabled: false
        }
      };
    }

    if (nextEntry && nextEntry.player === progressedState.currentPlayer) {
      return {
        valid: true,
        nextState: queueGuidedAutoWhiteStep(
          progressedState,
          problem,
          "正しい筋です。0.5秒後に白が応手します。",
          "白の応手を自動で進めます。"
        )
      };
    }

    return {
      valid: true,
      nextState: {
        ...progressedState,
        message: solved ? createTsumegoSuccessMessage(problem) : "正しい筋です。\nこの局面から続きを打って確認できます。",
        feedback: solved ? createTsumegoSuccessFeedback(problem) : "この局面から続きを読んで確認できます。",
        solved,
        failed: false,
        phase: "guided-play",
        overlay: solved ? "success" : null,
        pendingAutoWhite: null,
        autoWhiteEnabled: false
      }
    };
  }

  if (problem.goalType === "live") {
    if (isTsumegoSolved(moveResult.nextState.board, problem)) {
      return {
        valid: true,
        nextState: {
          ...tsumegoState,
          board: moveResult.nextState.board,
          previousBoard: moveResult.nextState.previousBoard,
          currentPlayer: moveResult.nextState.currentPlayer,
          captures: moveResult.nextState.captures,
          message: createTsumegoSuccessMessage(problem),
          feedback: createTsumegoSuccessFeedback(problem),
          solved: true,
          failed: false,
          phase: "free-play",
          overlay: "success",
          pendingAutoWhite: null,
          autoWhiteEnabled: false
        }
      };
    }

    return {
      valid: true,
      nextState: queueAutoWhiteStep(
        {
          ...tsumegoState,
          board: moveResult.nextState.board,
          previousBoard: moveResult.nextState.previousBoard,
          currentPlayer: WHITE,
          captures: moveResult.nextState.captures,
          solved: false,
          failed: true,
          overlay: "failure",
          autoWhiteEnabled: true
        },
        problem,
        "不正解です。0.5秒後に白が応手します。",
        "まずは黒の誤った1手を確認してください。"
      )
    };
  }

  if (isPreventWhiteTwoEyesProblem(problem) && isTsumegoWinningFirstMove(problem, row, col)) {
    return {
      valid: true,
      nextState: {
        ...tsumegoState,
        board: moveResult.nextState.board,
        previousBoard: moveResult.nextState.previousBoard,
        currentPlayer: moveResult.nextState.currentPlayer,
        captures: moveResult.nextState.captures,
        message: createTsumegoSuccessMessage(problem),
        feedback: createTsumegoSuccessFeedback(problem),
        solved: true,
        failed: false,
        phase: "free-play",
        overlay: "success",
        pendingAutoWhite: null,
        autoWhiteEnabled: false
      }
    };
  }

  const solved = isTsumegoSolved(moveResult.nextState.board, problem);

  if (solved) {
    return {
      valid: true,
      nextState: {
        ...tsumegoState,
        board: moveResult.nextState.board,
        previousBoard: moveResult.nextState.previousBoard,
        currentPlayer: moveResult.nextState.currentPlayer,
        captures: moveResult.nextState.captures,
        message: createTsumegoSuccessMessage(problem),
        feedback: createTsumegoSuccessFeedback(problem),
        solved: true,
        failed: false,
        phase: "free-play",
        overlay: "success",
        pendingAutoWhite: null,
        autoWhiteEnabled: false
      }
    };
  }

  if (Array.isArray(getForcedWrongFirstDefenseMove(problem))) {
    return {
      valid: true,
      nextState: queueForcedWrongFirstDefenseStep(
        {
          ...tsumegoState,
          board: moveResult.nextState.board,
          previousBoard: moveResult.nextState.previousBoard,
          currentPlayer: WHITE,
          captures: moveResult.nextState.captures,
          solved: false,
          failed: true,
          overlay: "failure",
          autoWhiteEnabled: false
        },
        problem,
        "不正解です。0.5秒後に白が急所へ応じます。",
        "まずは白の最強応手を確認してください。"
      )
    };
  }

  return {
    valid: true,
    nextState: {
      ...tsumegoState,
      board: moveResult.nextState.board,
      previousBoard: moveResult.nextState.previousBoard,
      currentPlayer: moveResult.nextState.currentPlayer,
      captures: moveResult.nextState.captures,
      message: "不正解です。\nこの局面から続きを打って確認できます。",
      feedback: createTsumegoFailureFeedback(problem),
      solved: false,
      failed: true,
      phase: "free-play",
      overlay: "failure",
      pendingAutoWhite: null,
      autoWhiteEnabled: false
    }
  };
}

function attemptMove(state, row, col) {
  if (state.gameOver) {
    return {
      valid: false,
      reason: "gameover",
      message: "対局は終了しています。\nリセットしてください。"
    };
  }

  if (state.board[row][col] !== EMPTY) {
    return {
      valid: false,
      reason: "occupied",
      message: "その交点にはすでに石があります。"
    };
  }

  const nextBoard = cloneBoard(state.board);
  const boardSize = getBoardSize(nextBoard);
  const currentPlayer = state.currentPlayer;
  const opponent = getOpponent(currentPlayer);
  const nextCaptures = { ...state.captures };
  let capturedCount = 0;

  nextBoard[row][col] = currentPlayer;

  const checkedOpponentGroups = new Set();

  for (const [nextRow, nextCol] of getNeighbors(row, col, boardSize)) {
    if (nextBoard[nextRow][nextCol] !== opponent) {
      continue;
    }

    const neighborKey = toKey(nextRow, nextCol);
    if (checkedOpponentGroups.has(neighborKey)) {
      continue;
    }

    const groupInfo = getGroupInfo(nextBoard, nextRow, nextCol);
    groupInfo.stones.forEach(([stoneRow, stoneCol]) => {
      checkedOpponentGroups.add(toKey(stoneRow, stoneCol));
    });

    if (groupInfo.liberties.size === 0) {
      capturedCount += groupInfo.stones.length;
      removeGroup(nextBoard, groupInfo.stones);
    }
  }

  const ownGroup = getGroupInfo(nextBoard, row, col);

  if (ownGroup.liberties.size === 0) {
    return {
      valid: false,
      reason: "suicide",
      message: "自殺手は禁止です。"
    };
  }

  if (boardsEqual(nextBoard, state.previousBoard)) {
    return {
      valid: false,
      reason: "ko",
      message: "コウのため、その点にはすぐ打てません。"
    };
  }

  nextCaptures[currentPlayer] += capturedCount;

  return {
    valid: true,
    nextState: {
      board: nextBoard,
      previousBoard: cloneBoard(state.board),
      currentPlayer: opponent,
      captures: nextCaptures,
      consecutivePasses: 0,
      gameOver: false,
      result: null,
      message:
        capturedCount > 0
          ? `${currentPlayer === BLACK ? "黒" : "白"}が ${capturedCount} 個取りました。`
          : `${opponent === BLACK ? "黒番" : "白番"}です。`
    }
  };
}

function passTurn(state) {
  if (state.gameOver) {
    return {
      valid: false,
      reason: "gameover",
      message: "対局は終了しています。\nリセットしてください。"
    };
  }

  const currentPlayer = state.currentPlayer;
  const opponent = getOpponent(currentPlayer);
  const nextConsecutivePasses = state.consecutivePasses + 1;

  if (nextConsecutivePasses >= 2) {
    const result = evaluateBoard(state.board);

    return {
      valid: true,
      nextState: {
        ...state,
        previousBoard: cloneBoard(state.board),
        currentPlayer: opponent,
        consecutivePasses: nextConsecutivePasses,
        gameOver: true,
        result,
        message: createGameOverMessage(result)
      }
    };
  }

  return {
    valid: true,
    nextState: {
      ...state,
      previousBoard: cloneBoard(state.board),
      currentPlayer: opponent,
      consecutivePasses: nextConsecutivePasses,
      result: null,
      message: `${currentPlayer === BLACK ? "黒" : "白"}がパスしました。\n${formatTurn(opponent)}です。`
    }
  };
}

function formatTurn(player) {
  return player === BLACK ? "黒番" : "白番";
}

function formatCellLabel(value, row, col) {
  if (value === BLACK) {
    return `${row + 1}行${col + 1}列: 黒石`;
  }

  if (value === WHITE) {
    return `${row + 1}行${col + 1}列: 白石`;
  }

  return `${row + 1}行${col + 1}列: 空き`;
}

function sanitizeLayoutPreference(layoutPreference) {
  if (layoutPreference === LAYOUT_TEXT_TOP || layoutPreference === LAYOUT_BOARD_TOP) {
    return layoutPreference;
  }

  return LAYOUT_BOARD_TOP;
}

function getStoredLayoutPreference() {
  if (typeof localStorage === "undefined") {
    return LAYOUT_BOARD_TOP;
  }

  try {
    return sanitizeLayoutPreference(localStorage.getItem(LAYOUT_STORAGE_KEY));
  } catch (error) {
    return LAYOUT_BOARD_TOP;
  }
}

function storeLayoutPreference(layoutPreference) {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, sanitizeLayoutPreference(layoutPreference));
  } catch (error) {
    // localStorage が使えない環境では保存せず、その場の表示だけ更新します。
  }
}

function initializeApp() {
  const appElement = document.querySelector(".app");
  const appTitleElement = document.getElementById("app-title");
  const modeToggleButton = document.getElementById("mode-toggle-button");
  const layoutToggleButton = document.getElementById("layout-toggle-button");
  const gamePanelElement = document.getElementById("game-panel");
  const boardElement = document.getElementById("board");
  const boardWrapElement = document.getElementById("game-board-wrap");
  const turnElement = document.getElementById("turn");
  const capturesElement = document.getElementById("captures");
  const resultElement = document.getElementById("result");
  const messageElement = document.getElementById("message");
  const noteElement = document.getElementById("note");
  const undoButton = document.getElementById("undo-button");
  const redoButton = document.getElementById("redo-button");
  const passButton = document.getElementById("pass-button");
  const resetButton = document.getElementById("reset-button");
  const sizeButtons = Array.from(document.querySelectorAll(".size-button"));
  const tsumegoPanelElement = document.getElementById("tsumego-panel");
  const tsumegoProblemTagElement = document.querySelector("#tsumego-panel .problem-tag");
  const tsumegoProblemSwitcherElement = document.getElementById("tsumego-problem-switcher");
  const tsumegoBoardElement = document.getElementById("tsumego-board");
  const tsumegoBoardWrapElement = document.getElementById("tsumego-board-wrap");
  const tsumegoOverlayElement = document.getElementById("tsumego-overlay");
  const tsumegoPrevButton = document.getElementById("tsumego-prev-button");
  const tsumegoNextButton = document.getElementById("tsumego-next-button");
  const tsumegoTitleElement = document.getElementById("tsumego-title");
  const tsumegoMessageElement = document.getElementById("tsumego-message");
  const tsumegoFeedbackElement = document.getElementById("tsumego-feedback");
  const tsumegoNoteElement = document.getElementById("tsumego-note");
  const tsumegoResetButton = document.getElementById("tsumego-reset-button");

  let appMode = APP_MODE_GAME;
  let state = createInitialState();
  let history = [cloneState(state)];
  let historyIndex = 0;
  let layoutPreference = getStoredLayoutPreference();
  let tsumegoState = createTsumegoState();
  let tsumegoAutoWhiteTimeoutId = null;
  let currentTsumegoBoardSize = null;

  function getCurrentBoardSize() {
    return getBoardSize(state.board);
  }

  function getCurrentTsumegoProblem() {
    return getTsumegoProblem(tsumegoState.problemId);
  }

  function getCurrentTsumegoProblemIndex() {
    return TSUMEGO_PROBLEMS.findIndex((problem) => problem.id === tsumegoState.problemId);
  }

  function clearTsumegoAutoWhiteTimeout() {
    if (tsumegoAutoWhiteTimeoutId !== null && typeof window !== "undefined") {
      window.clearTimeout(tsumegoAutoWhiteTimeoutId);
    }

    tsumegoAutoWhiteTimeoutId = null;
  }

  function scheduleTsumegoAutoWhiteIfNeeded() {
    clearTsumegoAutoWhiteTimeout();

    if (tsumegoState.phase !== "awaiting-auto-white" || typeof window === "undefined") {
      return;
    }

    tsumegoAutoWhiteTimeoutId = window.setTimeout(() => {
      tsumegoAutoWhiteTimeoutId = null;

      if (tsumegoState.phase !== "awaiting-auto-white") {
        return;
      }

      tsumegoState = applyPendingTsumegoAutoWhite(tsumegoState);
      renderTsumego();
    }, 500);
  }

  function buildTsumegoProblemButtons() {
    if (!tsumegoProblemSwitcherElement) {
      return;
    }

    tsumegoProblemSwitcherElement.innerHTML = "";

    TSUMEGO_PROBLEMS.forEach((problem) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "problem-button";
      button.dataset.problemId = problem.id;
      button.textContent = problem.title;
      button.addEventListener("click", () => {
        handleTsumegoProblemChange(problem.id);
      });
      tsumegoProblemSwitcherElement.appendChild(button);
    });
  }

  function handleMove(row, col) {
    const result = attemptMove(state, row, col);

    if (!result.valid) {
      state = {
        ...state,
        message: result.message
      };
      render();
      return;
    }

    history = history.slice(0, historyIndex + 1);
    history.push(cloneState(result.nextState));
    historyIndex = history.length - 1;
    state = result.nextState;
    render();
  }

  function buildBoardGrid(targetBoardElement, targetWrapElement, boardSize, onCellClick, boardLabel, wrapLabel) {
    targetBoardElement.innerHTML = "";
    AVAILABLE_BOARD_SIZES.forEach((size) => {
      targetBoardElement.classList.remove(`size-${size}`);
    });
    targetBoardElement.classList.add(`size-${boardSize}`);
    targetBoardElement.style.gridTemplateColumns = `repeat(${boardSize}, var(--grid-cell-size))`;
    targetBoardElement.style.gridTemplateRows = `repeat(${boardSize}, var(--grid-cell-size))`;
    targetBoardElement.setAttribute("aria-label", boardLabel);
    targetWrapElement.setAttribute("aria-label", wrapLabel);

    for (let row = 0; row < boardSize; row += 1) {
      for (let col = 0; col < boardSize; col += 1) {
        const cellButton = document.createElement("button");
        const stone = document.createElement("span");

        cellButton.type = "button";
        cellButton.className = "cell";
        cellButton.dataset.row = String(row);
        cellButton.dataset.col = String(col);
        cellButton.setAttribute("role", "gridcell");
        cellButton.setAttribute("aria-label", formatCellLabel(EMPTY, row, col));

        stone.className = "stone";
        cellButton.appendChild(stone);

        cellButton.addEventListener("click", () => {
          onCellClick(row, col);
        });

        targetBoardElement.appendChild(cellButton);
      }
    }
  }

  function buildGameBoard(boardSize) {
    buildBoardGrid(
      boardElement,
      boardWrapElement,
      boardSize,
      handleMove,
      `${boardSize}×${boardSize}の囲碁盤`,
      `${boardSize}路盤`
    );
  }

  function buildTsumegoBoard(problem = getCurrentTsumegoProblem()) {
    const boardSize = getTsumegoBoardSize(problem);
    currentTsumegoBoardSize = boardSize;

    buildBoardGrid(
      tsumegoBoardElement,
      tsumegoBoardWrapElement,
      boardSize,
      handleTsumegoMove,
      `${boardSize}×${boardSize}の詰碁盤`,
      `${problem.title}の詰碁盤`
    );
  }

  function syncTsumegoBoard(problem = getCurrentTsumegoProblem()) {
    const boardSize = getTsumegoBoardSize(problem);

    if (currentTsumegoBoardSize !== boardSize || tsumegoBoardElement.childElementCount !== boardSize * boardSize) {
      buildTsumegoBoard(problem);
      return;
    }

    tsumegoBoardElement.setAttribute("aria-label", `${boardSize}×${boardSize}の詰碁盤`);
    tsumegoBoardWrapElement.setAttribute("aria-label", `${problem.title}の詰碁盤`);
  }

  function renderBoardCells(targetBoardElement, boardState, disabled) {
    const cells = targetBoardElement.querySelectorAll(".cell");

    cells.forEach((cell) => {
      const row = Number(cell.dataset.row);
      const col = Number(cell.dataset.col);
      const value = boardState[row][col];
      cell.classList.remove(BLACK, WHITE);

      if (value === BLACK || value === WHITE) {
        cell.classList.add(value);
      }

      cell.setAttribute("aria-label", formatCellLabel(value, row, col));
      cell.disabled = disabled;
    });
  }

  function handleTsumegoMove(row, col) {
    const result = attemptTsumegoMove(tsumegoState, row, col);

    if (!result.valid) {
      tsumegoState = {
        ...tsumegoState,
        message: result.message
      };
      renderTsumego();
      return;
    }

    tsumegoState = result.nextState;
    scheduleTsumegoAutoWhiteIfNeeded();
    renderTsumego();
  }

  function handleTsumegoProblemChange(problemId) {
    clearTsumegoAutoWhiteTimeout();
    tsumegoState = createTsumegoState(problemId);
    renderTsumego();
  }

  function handleTsumegoStep(direction) {
    const currentIndex = getCurrentTsumegoProblemIndex();
    const nextIndex = currentIndex + direction;

    if (nextIndex < 0 || nextIndex >= TSUMEGO_PROBLEMS.length) {
      return;
    }

    handleTsumegoProblemChange(TSUMEGO_PROBLEMS[nextIndex].id);
  }

  function applyLayoutPreference(nextLayoutPreference) {
    const sanitizedLayoutPreference = sanitizeLayoutPreference(nextLayoutPreference);
    const changed = layoutPreference !== sanitizedLayoutPreference;
    layoutPreference = sanitizedLayoutPreference;

    if (appElement) {
      appElement.dataset.layout = layoutPreference;
    }

    if (typeof document !== "undefined" && document.body) {
      document.body.dataset.layout = layoutPreference;
    }

    if (layoutToggleButton) {
      const isBoardTop = layoutPreference === LAYOUT_BOARD_TOP;
      layoutToggleButton.setAttribute("aria-pressed", String(isBoardTop));
      layoutToggleButton.setAttribute(
        "aria-label",
        isBoardTop ? "文章ブロックを上に切り替える" : "盤面を上に切り替える"
      );
    }

    if (changed) {
      storeLayoutPreference(layoutPreference);
    }
  }

  function applyAppMode(nextAppMode) {
    appMode = nextAppMode === APP_MODE_TSUMEGO ? APP_MODE_TSUMEGO : APP_MODE_GAME;

    if (appElement) {
      appElement.dataset.mode = appMode;
    }

    const isGameMode = appMode === APP_MODE_GAME;

    if (gamePanelElement) {
      gamePanelElement.hidden = !isGameMode;
    }

    if (boardWrapElement) {
      boardWrapElement.hidden = !isGameMode;
    }

    if (tsumegoPanelElement) {
      tsumegoPanelElement.hidden = isGameMode;
    }

    if (tsumegoBoardWrapElement) {
      tsumegoBoardWrapElement.hidden = isGameMode;
    }

    if (appTitleElement) {
      appTitleElement.textContent = isGameMode ? "囲碁ミニアプリ" : "ミニ詰碁";
    }

    if (modeToggleButton) {
      modeToggleButton.textContent = isGameMode ? "ミニ詰碁" : "囲碁ミニアプリ";
      modeToggleButton.setAttribute(
        "aria-label",
        isGameMode ? "ミニ詰碁に切り替える" : "囲碁ミニアプリに戻る"
      );
    }
  }

  function renderGame() {
    const boardSize = getCurrentBoardSize();

    turnElement.textContent = state.gameOver ? "対局終了" : `手番: ${formatTurn(state.currentPlayer)}`;
    capturesElement.textContent = `アゲハマ: 黒 ${state.captures[BLACK]} / 白 ${state.captures[WHITE]}`;
    resultElement.textContent = state.result ? createResultText(state.result) : "";
    messageElement.textContent = state.message;
    noteElement.textContent = createNoteText(boardSize);
    undoButton.disabled = historyIndex === 0;
    redoButton.disabled = historyIndex >= history.length - 1;
    passButton.disabled = state.gameOver;

    sizeButtons.forEach((button) => {
      const size = Number(button.dataset.size);
      const isActive = size === boardSize;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    renderBoardCells(boardElement, state.board, state.gameOver);

    if (appMode === APP_MODE_GAME) {
      document.title = `${boardSize}路盤 囲碁ミニアプリ`;
    }
  }

  function renderTsumego() {
    const problem = getCurrentTsumegoProblem();
    const tsumegoBoardDisabled = tsumegoState.phase === "awaiting-auto-white";
    syncTsumegoBoard(problem);

    if (tsumegoProblemTagElement) {
      tsumegoProblemTagElement.textContent = problem.title;
    }

    tsumegoTitleElement.textContent = `${problem.title}: ${problem.subtitle}`;
    tsumegoMessageElement.textContent = tsumegoState.message;
    tsumegoFeedbackElement.textContent = tsumegoState.feedback;
    tsumegoNoteElement.textContent = problem.note;

    if (tsumegoProblemSwitcherElement) {
      const problemButtons = tsumegoProblemSwitcherElement.querySelectorAll(".problem-button");
      problemButtons.forEach((button) => {
        const isActive = button.dataset.problemId === problem.id;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
    }

    const problemIndex = getCurrentTsumegoProblemIndex();
    if (tsumegoPrevButton) {
      tsumegoPrevButton.disabled = problemIndex <= 0;
    }

    if (tsumegoNextButton) {
      tsumegoNextButton.disabled = problemIndex >= TSUMEGO_PROBLEMS.length - 1;
    }

    renderBoardCells(tsumegoBoardElement, tsumegoState.board, tsumegoBoardDisabled);

    if (tsumegoOverlayElement) {
      tsumegoOverlayElement.classList.remove("success", "failure");

      if (tsumegoState.overlay === "success") {
        tsumegoOverlayElement.hidden = false;
        tsumegoOverlayElement.classList.add("success");
        tsumegoOverlayElement.textContent = "○";
      } else if (tsumegoState.overlay === "failure") {
        tsumegoOverlayElement.hidden = false;
        tsumegoOverlayElement.classList.add("failure");
        tsumegoOverlayElement.textContent = "×";
      } else {
        tsumegoOverlayElement.hidden = true;
        tsumegoOverlayElement.textContent = "";
      }
    }

    if (appMode === APP_MODE_TSUMEGO) {
      document.title = `${problem.title} ミニ詰碁`;
    }
  }

  function render() {
    applyLayoutPreference(layoutPreference);
    applyAppMode(appMode);
    renderGame();
    renderTsumego();
  }

  function handlePass() {
    const result = passTurn(state);

    if (!result.valid) {
      state = {
        ...state,
        message: result.message
      };
      render();
      return;
    }

    history = history.slice(0, historyIndex + 1);
    history.push(cloneState(result.nextState));
    historyIndex = history.length - 1;
    state = result.nextState;
    renderGame();
  }

  function handleUndo() {
    if (historyIndex === 0) {
      return;
    }

    historyIndex -= 1;
    state = cloneState(history[historyIndex]);
    renderGame();
  }

  function handleRedo() {
    if (historyIndex >= history.length - 1) {
      return;
    }

    historyIndex += 1;
    state = cloneState(history[historyIndex]);
    renderGame();
  }

  function handleBoardSizeChange(nextBoardSize) {
    if (!AVAILABLE_BOARD_SIZES.includes(nextBoardSize)) {
      return;
    }

    state = createInitialState(nextBoardSize);
    history = [cloneState(state)];
    historyIndex = 0;
    buildGameBoard(nextBoardSize);
    renderGame();
  }

  buildGameBoard(getCurrentBoardSize());
  buildTsumegoProblemButtons();
  syncTsumegoBoard();

  undoButton.addEventListener("click", handleUndo);
  redoButton.addEventListener("click", handleRedo);
  passButton.addEventListener("click", handlePass);

  sizeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      handleBoardSizeChange(Number(button.dataset.size));
    });
  });

  if (layoutToggleButton) {
    layoutToggleButton.addEventListener("click", () => {
      applyLayoutPreference(
        layoutPreference === LAYOUT_TEXT_TOP ? LAYOUT_BOARD_TOP : LAYOUT_TEXT_TOP
      );
    });
  }

  if (modeToggleButton) {
    modeToggleButton.addEventListener("click", () => {
      appMode = appMode === APP_MODE_GAME ? APP_MODE_TSUMEGO : APP_MODE_GAME;
      render();
    });
  }

  resetButton.addEventListener("click", () => {
    state = createInitialState(getCurrentBoardSize());
    history = [cloneState(state)];
    historyIndex = 0;
    renderGame();
  });

  tsumegoResetButton.addEventListener("click", () => {
    clearTsumegoAutoWhiteTimeout();
    tsumegoState = createTsumegoState(tsumegoState.problemId);
    renderTsumego();
  });

  if (tsumegoPrevButton) {
    tsumegoPrevButton.addEventListener("click", () => {
      handleTsumegoStep(-1);
    });
  }

  if (tsumegoNextButton) {
    tsumegoNextButton.addEventListener("click", () => {
      handleTsumegoStep(1);
    });
  }

  render();
}

if (typeof document !== "undefined") {
  initializeApp();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    BLACK,
    WHITE,
    DEFAULT_BOARD_SIZE,
    AVAILABLE_BOARD_SIZES,
    KOMI_BY_BOARD_SIZE,
    getKomiForBoardSize,
    createInitialState,
    attemptMove,
    passTurn,
    evaluateBoard,
    getGroupInfo,
    createNoteText,
    analyzeBoard,
    removeClearlyDeadGroupsForScoring,
    APP_MODE_GAME,
    APP_MODE_TSUMEGO,
    TSUMEGO_PROBLEMS,
    createTsumegoState,
    attemptTsumegoMove,
    isTsumegoLiveByTwoEyes,
    applyPendingTsumegoAutoWhite
  };
}
