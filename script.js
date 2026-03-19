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
  return layoutPreference === LAYOUT_BOARD_TOP ? LAYOUT_BOARD_TOP : LAYOUT_TEXT_TOP;
}

function getStoredLayoutPreference() {
  if (typeof localStorage === "undefined") {
    return LAYOUT_TEXT_TOP;
  }

  try {
    return sanitizeLayoutPreference(localStorage.getItem(LAYOUT_STORAGE_KEY));
  } catch (error) {
    return LAYOUT_TEXT_TOP;
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
  const boardElement = document.getElementById("board");
  const boardWrapElement = document.getElementById("board-wrap");
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
  const layoutToggleButton = document.getElementById("layout-toggle-button");

  let state = createInitialState();
  let history = [cloneState(state)];
  let historyIndex = 0;
  let layoutPreference = getStoredLayoutPreference();

  function getCurrentBoardSize() {
    return getBoardSize(state.board);
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

  function buildBoard(boardSize) {
    boardElement.innerHTML = "";
    AVAILABLE_BOARD_SIZES.forEach((size) => {
      boardElement.classList.remove(`size-${size}`);
    });
    boardElement.classList.add(`size-${boardSize}`);
    boardElement.style.gridTemplateColumns = `repeat(${boardSize}, var(--grid-cell-size))`;
    boardElement.style.gridTemplateRows = `repeat(${boardSize}, var(--grid-cell-size))`;
    boardElement.setAttribute("aria-label", `${boardSize}×${boardSize}の囲碁盤`);
    boardWrapElement.setAttribute("aria-label", `${boardSize}路盤`);

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
          handleMove(row, col);
        });

        boardElement.appendChild(cellButton);
      }
    }
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

  function render() {
    const boardSize = getCurrentBoardSize();

    turnElement.textContent = state.gameOver ? "対局終了" : `手番: ${formatTurn(state.currentPlayer)}`;
    capturesElement.textContent = `アゲハマ: 黒 ${state.captures[BLACK]} / 白 ${state.captures[WHITE]}`;
    resultElement.textContent = state.result ? createResultText(state.result) : "";
    messageElement.textContent = state.message;
    noteElement.textContent = createNoteText(boardSize);
    undoButton.disabled = historyIndex === 0;
    redoButton.disabled = historyIndex >= history.length - 1;
    passButton.disabled = state.gameOver;
    document.title = `${boardSize}路盤 囲碁ミニアプリ`;
    applyLayoutPreference(layoutPreference);

    sizeButtons.forEach((button) => {
      const size = Number(button.dataset.size);
      const isActive = size === boardSize;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    const cells = boardElement.querySelectorAll(".cell");
    cells.forEach((cell) => {
      const row = Number(cell.dataset.row);
      const col = Number(cell.dataset.col);
      const value = state.board[row][col];
      cell.classList.remove(BLACK, WHITE);

      if (value === BLACK || value === WHITE) {
        cell.classList.add(value);
      }

      cell.setAttribute("aria-label", formatCellLabel(value, row, col));
      cell.disabled = state.gameOver;
    });
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
    render();
  }

  function handleUndo() {
    if (historyIndex === 0) {
      return;
    }

    historyIndex -= 1;
    state = cloneState(history[historyIndex]);
    render();
  }

  function handleRedo() {
    if (historyIndex >= history.length - 1) {
      return;
    }

    historyIndex += 1;
    state = cloneState(history[historyIndex]);
    render();
  }

  function handleBoardSizeChange(nextBoardSize) {
    if (!AVAILABLE_BOARD_SIZES.includes(nextBoardSize)) {
      return;
    }

    state = createInitialState(nextBoardSize);
    history = [cloneState(state)];
    historyIndex = 0;
    buildBoard(nextBoardSize);
    render();
  }

  buildBoard(getCurrentBoardSize());

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

  resetButton.addEventListener("click", () => {
    state = createInitialState(getCurrentBoardSize());
    history = [cloneState(state)];
    historyIndex = 0;
    render();
  });

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
    removeClearlyDeadGroupsForScoring
  };
}
