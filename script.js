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
const TSUMEGO_BOARD_SIZE = TSUMEGO_DATA.boardSize;
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
    throw new Error("tsumego-data.js の読み込みに失敗しました。");
  }

  return data;
}

function normalizeTsumegoProblem(problem) {
  return {
    ...problem,
    goalType: problem.goalType ?? "capture",
    prompt: problem.prompt ?? TSUMEGO_DATA.defaultPrompt,
    note: problem.note ?? TSUMEGO_DATA.defaultNote,
    board: createBoardFromRows(problem.rows)
  };
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

  return {
    problemId: problem.id,
    board: cloneBoard(problem.board),
    previousBoard: null,
    currentPlayer: BLACK,
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
    autoWhiteEnabled: false
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

function getTsumegoTargetColor(problem) {
  return problem.goalType === "live" ? BLACK : WHITE;
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

function chooseAutoWhiteMoveForLiveProblem(tsumegoState, problem) {
  const currentGroups = collectTsumegoTargetGroups(tsumegoState.board, problem);
  const currentTargetCount = getRemainingTsumegoTargetStones(tsumegoState.board, problem).length;
  const solutionKey = Array.isArray(problem.solution) ? toKey(problem.solution[0], problem.solution[1]) : null;

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
  const bestMove = chooseAutoWhiteMoveForLiveProblem(tsumegoState, problem);

  if (!bestMove) {
    return null;
  }

  const remainingTargetCount = getRemainingTsumegoTargetStones(bestMove.nextState.board, problem).length;
  const capturedCount = initialTargetCount - remainingTargetCount;

  return {
    board: bestMove.nextState.board,
    previousBoard: bestMove.nextState.previousBoard,
    currentPlayer: bestMove.nextState.currentPlayer,
    captures: bestMove.nextState.captures,
    autoWhiteEnabled: remainingTargetCount > 0,
    message:
      remainingTargetCount === 0
        ? "不正解です。白が1手ずつ進めて黒石を取りました。\n続きを打って確認できます。"
        : capturedCount > 0
          ? "不正解です。白が1手進めて黒石を減らしました。\n黒番で続きを打って確認できます。"
          : "不正解です。白が1手進めました。\n黒番で続きを打って確認できます。",
    feedback:
      remainingTargetCount === 0
        ? "白の読み筋で黒が取られました。"
        : capturedCount > 0
          ? "白が急所に打って黒石を詰めています。"
          : "白の次の1手を自動で進めました。"
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
    phase: "free-play",
    pendingAutoWhite: null,
    autoWhiteEnabled: tsumegoState.pendingAutoWhite.autoWhiteEnabled
  };
}

function isTsumegoSolved(board, problem) {
  if (problem.goalType === "live") {
    return isTsumegoLiveByTwoEyes(board, problem);
  }

  return problem.targetStones.every(([row, col]) => board[row][col] === EMPTY);
}

function attemptTsumegoMove(tsumegoState, row, col) {
  const problem = getTsumegoProblem(tsumegoState.problemId);

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
          message: "正解です。黒が2眼で生きました。\nこの局面から続きを打って確認できます。",
          feedback: "この1手で2眼を作れました。",
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
        message: "正解です。白を取りました。\nこの局面から続きを打って確認できます。",
        feedback: "この1手で白が取れました。",
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
    nextState: {
      ...tsumegoState,
      board: moveResult.nextState.board,
      previousBoard: moveResult.nextState.previousBoard,
      currentPlayer: moveResult.nextState.currentPlayer,
      captures: moveResult.nextState.captures,
      message: "不正解です。\nこの局面から続きを打って確認できます。",
      feedback: "今回は1手詰めです。",
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

  function buildTsumegoBoard() {
    const problem = getCurrentTsumegoProblem();

    buildBoardGrid(
      tsumegoBoardElement,
      tsumegoBoardWrapElement,
      TSUMEGO_BOARD_SIZE,
      handleTsumegoMove,
      `${TSUMEGO_BOARD_SIZE}×${TSUMEGO_BOARD_SIZE}の詰碁盤`,
      `${problem.title}の詰碁盤`
    );
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
  buildTsumegoBoard();

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
