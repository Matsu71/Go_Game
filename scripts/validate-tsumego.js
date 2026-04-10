#!/usr/bin/env node

globalThis.document = undefined;

const {
  CANONICAL_PATH,
  SOLVER_EXPORT_PATH,
  WEB_EXPORT_PATH,
  buildSolverExport,
  buildWebExport,
  flattenTargetStones,
  getProblemRows,
  loadCanonicalData,
  readJson
} = require("./lib/tsumego-data-utils");

const GO_APP_TSUMEGO_DATA_KEY = "GO_APP_TSUMEGO_DATA";
const errors = [];
const warnings = [];

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function isIntegerPair(value) {
  return Array.isArray(value) && value.length === 2 && Number.isInteger(value[0]) && Number.isInteger(value[1]);
}

function sameMove(moveA, moveB) {
  return Array.isArray(moveA) && Array.isArray(moveB) && moveA[0] === moveB[0] && moveA[1] === moveB[1];
}

function pointKey(row, col) {
  return `${row},${col}`;
}

function inBounds(row, col, boardSize) {
  return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

function readBoardCell(rows, row, col) {
  const cell = rows[row][col];

  if (cell === "B" || cell === "W") {
    return cell;
  }

  return ".";
}

function getExpectedTargetCell(problem) {
  return problem.target?.color === "black" ? "B" : "W";
}

function isPreventWhiteTwoEyesProblem(problem) {
  return problem.goalType === "kill" && problem.solutions?.successCondition === "prevent-white-two-eyes";
}

function normalizeMoveList(moves) {
  return moves.map((move) => JSON.stringify(move)).sort();
}

function loadGeneratedWebData() {
  delete globalThis[GO_APP_TSUMEGO_DATA_KEY];
  const modulePath = require.resolve(WEB_EXPORT_PATH);
  delete require.cache[modulePath];
  require(modulePath);
  return globalThis[GO_APP_TSUMEGO_DATA_KEY];
}

function loadScriptApi() {
  loadGeneratedWebData();
  const modulePath = require.resolve("../script.js");
  delete require.cache[modulePath];
  return require(modulePath);
}

function collectWinningMoves(app, problem) {
  const state = app.createTsumegoState(problem.id);
  const boardSize = problem.boardSize;
  const winningMoves = [];
  const legalMoves = [];

  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      const result = app.attemptTsumegoMove(state, row, col);
      if (!result.valid) {
        continue;
      }

      legalMoves.push([row, col]);
      if (
        result.nextState &&
        (result.nextState.solved || (result.nextState.phase === "awaiting-auto-white" && result.nextState.failed !== true))
      ) {
        winningMoves.push([row, col]);
      }
    }
  }

  return { winningMoves, legalMoves };
}

function cloneValidationState(state) {
  return {
    board: state.board.map((row) => row.slice()),
    previousBoard: state.previousBoard ? state.previousBoard.map((row) => row.slice()) : null,
    currentPlayer: state.currentPlayer,
    captures: { ...state.captures },
    consecutivePasses: 0,
    gameOver: false,
    result: null,
    message: state.message
  };
}

function countStones(board, color) {
  let count = 0;

  board.forEach((row) => {
    row.forEach((cell) => {
      if (cell === color) {
        count += 1;
      }
    });
  });

  return count;
}

function collectBlackThreatMovesAfterWhiteReply(app, state, problem) {
  const whiteCount = countStones(state.board, app.WHITE);
  const threatMoves = [];

  for (let row = 0; row < problem.boardSize; row += 1) {
    for (let col = 0; col < problem.boardSize; col += 1) {
      const result = app.attemptMove(cloneValidationState(state), row, col);
      if (!result.valid) {
        continue;
      }

      const whiteCaptured = whiteCount - countStones(result.nextState.board, app.WHITE);
      const blackLives = app.isTsumegoLiveByTwoEyes(result.nextState.board, problem);

      if (whiteCaptured > 0 || blackLives) {
        threatMoves.push({
          move: [row, col],
          whiteCaptured,
          blackLives
        });
      }
    }
  }

  return threatMoves;
}

function collectBlackLiveMoves(app, state, problem) {
  const liveMoves = [];

  for (let row = 0; row < problem.boardSize; row += 1) {
    for (let col = 0; col < problem.boardSize; col += 1) {
      const result = app.attemptTsumegoMove(state, row, col);
      if (!result.valid) {
        continue;
      }

      if (app.isTsumegoLiveByTwoEyes(result.nextState.board, problem)) {
        liveMoves.push([row, col]);
      }
    }
  }

  return liveMoves;
}

function getValidationTargetStones(problem) {
  if (Array.isArray(problem.targetStones)) {
    return problem.targetStones;
  }

  return flattenTargetStones(problem);
}

function hasTargetColorAliveByTwoEyes(app, board, problem, color) {
  const analysis = app.analyzeBoard(board);
  const targetKeys = new Set(getValidationTargetStones(problem).map(([row, col]) => pointKey(row, col)));
  const targetGroups = analysis.groups.filter(
    (group) => group.color === color && group.stones.some(([row, col]) => targetKeys.has(pointKey(row, col)))
  );

  return targetGroups.length > 0 && targetGroups.every((group) => group.eyeRegionIds.size >= 2);
}

function validateWrongFirstMoveDefense(app, state, problem, wrongLegalMoves, label) {
  const forcedWrongFirstDefenseMove = Array.isArray(problem.solutions?.wrongFirstMoveDefense?.move)
    ? problem.solutions.wrongFirstMoveDefense.move
    : null;

  if (!forcedWrongFirstDefenseMove) {
    return;
  }

  wrongLegalMoves.forEach((move) => {
    const firstResult = app.attemptTsumegoMove(state, move[0], move[1]);
    if (!firstResult.valid) {
      return;
    }

    if (firstResult.nextState?.phase !== "awaiting-auto-white" || !firstResult.nextState.pendingAutoWhite) {
      addError(
        `[${label}] wrong first move ${JSON.stringify(
          move
        )} does not queue auto-white for wrongFirstMoveDefense ${JSON.stringify(forcedWrongFirstDefenseMove)}.`
      );
      return;
    }

    const defendedState = app.applyPendingTsumegoAutoWhite(firstResult.nextState);
    const [defenseRow, defenseCol] = forcedWrongFirstDefenseMove;

    if (defendedState.board[defenseRow]?.[defenseCol] !== app.WHITE) {
      addError(
        `[${label}] wrongFirstMoveDefense ${JSON.stringify(
          forcedWrongFirstDefenseMove
        )} was not played after wrong first move ${JSON.stringify(move)}.`
      );
      return;
    }

    const configuredDefense = problem.solutions?.wrongFirstMoveDefense;
    const expectsWhiteTwoEyes =
      configuredDefense?.outcome === "white-live" && configuredDefense?.shape === "two-eyes";

    if (expectsWhiteTwoEyes && !hasTargetColorAliveByTwoEyes(app, defendedState.board, problem, app.WHITE)) {
      addError(
        `[${label}] wrongFirstMoveDefense ${JSON.stringify(
          forcedWrongFirstDefenseMove
        )} after wrong first move ${JSON.stringify(move)} does not leave White with two eyes.`
      );
    }
  });
}

function validateLiveProblemDefense(app, state, problem, wrongLegalMoves, label) {
  const openingAnalysis = app.analyzeBoard(state.board);
  const whiteAtariGroups = openingAnalysis.groups.filter((group) => group.color === app.WHITE && group.liberties.size <= 1);
  const hasGuidedLine = Array.isArray(problem.solutions?.principalVariation) && problem.solutions.principalVariation.length > 1;
  const forcedWrongFirstDefenseMove = Array.isArray(problem.solutions?.wrongFirstMoveDefense?.move)
    ? problem.solutions.wrongFirstMoveDefense.move
    : null;

  if (whiteAtariGroups.length > 0) {
    addError(
      `[${label}] live problem starts with white group in atari: ${JSON.stringify(
        whiteAtariGroups.map((group) => group.stones)
      )}.`
    );
  }

  const initialWhiteCount = countStones(state.board, app.WHITE);

  wrongLegalMoves.forEach((move) => {
    const [firstRow, firstCol] = move;
    const firstResult = app.attemptMove(cloneValidationState(state), firstRow, firstCol);
    if (!firstResult.valid) {
      return;
    }

    const whiteCapturedOnFirstMove = initialWhiteCount - countStones(firstResult.nextState.board, app.WHITE);
    if (whiteCapturedOnFirstMove > 0) {
      addError(
        `[${label}] wrong first move ${JSON.stringify(move)} captures white immediately (${whiteCapturedOnFirstMove} stones).`
      );
      return;
    }

    const legalWhiteReplies = [];
    const safeWhiteReplies = [];

    for (let whiteRow = 0; whiteRow < problem.boardSize; whiteRow += 1) {
      for (let whiteCol = 0; whiteCol < problem.boardSize; whiteCol += 1) {
        const whiteResult = app.attemptMove(cloneValidationState(firstResult.nextState), whiteRow, whiteCol);
        if (!whiteResult.valid) {
          continue;
        }

        const threatMoves = collectBlackThreatMovesAfterWhiteReply(app, whiteResult.nextState, problem);
        legalWhiteReplies.push({
          move: [whiteRow, whiteCol],
          threatMoves
        });

        if (threatMoves.length === 0) {
          safeWhiteReplies.push([whiteRow, whiteCol]);
        }
      }
    }

    if (
      forcedWrongFirstDefenseMove &&
      legalWhiteReplies.length > 0 &&
      safeWhiteReplies.some((reply) => sameMove(reply, forcedWrongFirstDefenseMove)) === false
    ) {
      addError(
        `[${label}] wrong first move ${JSON.stringify(
          move
        )} does not allow the configured wrongFirstMoveDefense ${JSON.stringify(forcedWrongFirstDefenseMove)} as a safe white reply. Safe replies: ${JSON.stringify(
          safeWhiteReplies
        )}.`
      );
      return;
    }

    if (hasGuidedLine && legalWhiteReplies.length > 1 && safeWhiteReplies.length <= 1) {
      if (forcedWrongFirstDefenseMove && safeWhiteReplies.some((reply) => sameMove(reply, forcedWrongFirstDefenseMove))) {
        return;
      }

      addError(
        `[${label}] wrong first move ${JSON.stringify(
          move
        )} leaves White with only ${safeWhiteReplies.length} safe reply to avoid an immediate black life/capture threat. Safe replies: ${JSON.stringify(
          safeWhiteReplies
        )}.`
      );
    }
  });
}

function playPrincipalVariationToLineProgress(app, state, problem, lineProgress, label) {
  const principalVariation = problem.solutions?.principalVariation ?? [];
  let currentState = state;

  for (let index = 0; index < lineProgress; index += 1) {
    const entry = principalVariation[index];

    if (!entry || !isIntegerPair(entry.move)) {
      addError(`[${label}] principalVariation[${index}] is required before wrongGuidedMoveDefenses validation.`);
      return null;
    }

    if (entry.player === "black") {
      const result = app.attemptTsumegoMove(currentState, entry.move[0], entry.move[1]);

      if (!result.valid) {
        addError(`[${label}] principalVariation[${index}] black move ${JSON.stringify(entry.move)} is not playable.`);
        return null;
      }

      currentState = result.nextState;
      continue;
    }

    if (entry.player === "white") {
      if (currentState.phase !== "awaiting-auto-white" || !currentState.pendingAutoWhite) {
        addError(`[${label}] principalVariation[${index}] white move has no pending auto-white state.`);
        return null;
      }

      if (currentState.pendingAutoWhite.board[entry.move[0]]?.[entry.move[1]] !== app.WHITE) {
        addError(`[${label}] principalVariation[${index}] pending auto-white does not play ${JSON.stringify(entry.move)}.`);
        return null;
      }

      currentState = app.applyPendingTsumegoAutoWhite(currentState);
      continue;
    }

    addError(`[${label}] principalVariation[${index}].player must be "black" or "white".`);
    return null;
  }

  return currentState;
}

function validateWrongGuidedMoveDefenses(app, state, problem, label) {
  const defenses = problem.solutions?.wrongGuidedMoveDefenses;

  if (!Array.isArray(defenses)) {
    return;
  }

  const principalVariation = problem.solutions?.principalVariation ?? [];

  defenses.forEach((defense, defenseIndex) => {
    const baseState = playPrincipalVariationToLineProgress(app, state, problem, defense.lineProgress, label);
    const expectedEntry = principalVariation[defense.lineProgress];

    if (!baseState || !expectedEntry || expectedEntry.player !== "black") {
      return;
    }

    const wrongMoveResults = [];

    for (let row = 0; row < problem.boardSize; row += 1) {
      for (let col = 0; col < problem.boardSize; col += 1) {
        if (sameMove([row, col], expectedEntry.move)) {
          continue;
        }

        const result = app.attemptTsumegoMove(baseState, row, col);
        if (!result.valid) {
          continue;
        }

        wrongMoveResults.push([row, col]);

        if (result.nextState?.phase !== "awaiting-auto-white" || !result.nextState.pendingAutoWhite) {
          addError(
            `[${label}] wrong guided move ${JSON.stringify(
              [row, col]
            )} does not queue auto-white for wrongGuidedMoveDefenses[${defenseIndex}].`
          );
          continue;
        }

        const defendedState = app.applyPendingTsumegoAutoWhite(result.nextState);

        if (defendedState.board[defense.move[0]]?.[defense.move[1]] !== app.WHITE) {
          addError(
            `[${label}] wrongGuidedMoveDefenses[${defenseIndex}] ${JSON.stringify(
              defense.move
            )} was not played after wrong guided move ${JSON.stringify([row, col])}.`
          );
          continue;
        }

        const blackLiveMoves = collectBlackLiveMoves(app, defendedState, problem);
        if (blackLiveMoves.length > 0) {
          addError(
            `[${label}] wrongGuidedMoveDefenses[${defenseIndex}] still allows immediate black life after wrong guided move ${JSON.stringify(
              [row, col]
            )}: ${JSON.stringify(blackLiveMoves)}.`
          );
        }
      }
    }

    if (wrongMoveResults.length === 0) {
      addWarning(`[${label}] wrongGuidedMoveDefenses[${defenseIndex}] found no legal wrong guided moves.`);
    }
  });
}

function validateCanonicalProblem(problem, index) {
  const label = `${problem.id ?? `index-${index}`}`;
  const boardSize = problem.boardSize;
  const rows = getProblemRows(problem);

  if (typeof problem.id !== "string" || problem.id.length === 0) {
    addError(`[${label}] id is required.`);
  }

  if (typeof problem.title !== "string" || problem.title.length === 0) {
    addError(`[${label}] title is required.`);
  }

  if (!Number.isInteger(boardSize) || boardSize <= 0) {
    addError(`[${label}] boardSize must be a positive integer.`);
  }

  if (!Array.isArray(rows) || rows.length !== boardSize) {
    addError(`[${label}] initialPosition.rows must contain exactly ${boardSize} strings.`);
    return;
  }

  rows.forEach((rowText, rowIndex) => {
    if (typeof rowText !== "string" || rowText.length !== boardSize) {
      addError(`[${label}] row ${rowIndex} must be a string of length ${boardSize}.`);
      return;
    }

    if (!/^[.BW]+$/.test(rowText)) {
      addError(`[${label}] row ${rowIndex} contains characters other than ., B, W.`);
    }
  });

  if (!["black", "white"].includes(problem.turn)) {
    addError(`[${label}] turn must be "black" or "white".`);
  }

  if (!["capture", "live", "kill"].includes(problem.goalType)) {
    addError(`[${label}] goalType must be "capture", "live", or "kill".`);
  }

  if (!problem.constraints || typeof problem.constraints !== "object") {
    addError(`[${label}] constraints is required.`);
  }

  if (!Array.isArray(problem.target?.groups) || problem.target.groups.length === 0) {
    addError(`[${label}] target.groups must contain at least one group.`);
  } else {
    const expectedCell = getExpectedTargetCell(problem);
    const seenTargets = new Set();

    flattenTargetStones(problem).forEach((stone, targetIndex) => {
      if (!isIntegerPair(stone)) {
        addError(`[${label}] target stone ${targetIndex} must be [row, col].`);
        return;
      }

      const [row, col] = stone;
      if (!inBounds(row, col, boardSize)) {
        addError(`[${label}] target stone ${targetIndex} is out of bounds: [${row}, ${col}].`);
        return;
      }

      const key = pointKey(row, col);
      if (seenTargets.has(key)) {
        addError(`[${label}] target contains a duplicate point: [${row}, ${col}].`);
      }
      seenTargets.add(key);

      if (readBoardCell(rows, row, col) !== expectedCell) {
        addError(`[${label}] target stone [${row}, ${col}] must start as ${problem.target.color}.`);
      }
    });
  }

  if (!problem.solutions || typeof problem.solutions !== "object") {
    addError(`[${label}] solutions is required.`);
    return;
  }

  if (!Array.isArray(problem.solutions.winningFirstMoves) || problem.solutions.winningFirstMoves.length === 0) {
    addError(`[${label}] solutions.winningFirstMoves must contain at least one move.`);
  } else {
    problem.solutions.winningFirstMoves.forEach((entry, moveIndex) => {
      if (!entry || !isIntegerPair(entry.move)) {
        addError(`[${label}] winningFirstMoves[${moveIndex}].move must be [row, col].`);
        return;
      }

      const [row, col] = entry.move;
      if (!inBounds(row, col, boardSize)) {
        addError(`[${label}] winningFirstMoves[${moveIndex}] is out of bounds: [${row}, ${col}].`);
      } else if (readBoardCell(rows, row, col) !== ".") {
        addError(`[${label}] winningFirstMoves[${moveIndex}] must point to an empty intersection.`);
      }
    });
  }

  if (problem.solutions.wrongFirstMoveDefense !== undefined) {
    const wrongFirstMoveDefense = problem.solutions.wrongFirstMoveDefense;

    if (!wrongFirstMoveDefense || !isIntegerPair(wrongFirstMoveDefense.move)) {
      addError(`[${label}] solutions.wrongFirstMoveDefense.move must be [row, col].`);
    } else {
      const [row, col] = wrongFirstMoveDefense.move;

      if (!inBounds(row, col, boardSize)) {
        addError(`[${label}] wrongFirstMoveDefense.move is out of bounds: [${row}, ${col}].`);
      } else if (readBoardCell(rows, row, col) !== ".") {
        addError(`[${label}] wrongFirstMoveDefense.move must point to an empty intersection in the initial position.`);
      }
    }
  }

  if (problem.solutions.wrongGuidedMoveDefenses !== undefined) {
    const wrongGuidedMoveDefenses = problem.solutions.wrongGuidedMoveDefenses;
    const principalVariation = Array.isArray(problem.solutions.principalVariation)
      ? problem.solutions.principalVariation
      : [];

    if (!Array.isArray(wrongGuidedMoveDefenses)) {
      addError(`[${label}] solutions.wrongGuidedMoveDefenses must be an array when present.`);
    } else if (problem.goalType !== "live") {
      addError(`[${label}] solutions.wrongGuidedMoveDefenses is only supported for live problems.`);
    } else {
      wrongGuidedMoveDefenses.forEach((defense, defenseIndex) => {
        if (!defense || !Number.isInteger(defense.lineProgress) || defense.lineProgress < 1) {
          addError(`[${label}] wrongGuidedMoveDefenses[${defenseIndex}].lineProgress must be a positive integer.`);
          return;
        }

        if (!principalVariation[defense.lineProgress] || principalVariation[defense.lineProgress].player !== "black") {
          addError(`[${label}] wrongGuidedMoveDefenses[${defenseIndex}].lineProgress must point to a black guided move.`);
        }

        if (!isIntegerPair(defense.move)) {
          addError(`[${label}] wrongGuidedMoveDefenses[${defenseIndex}].move must be [row, col].`);
          return;
        }

        const [row, col] = defense.move;
        if (!inBounds(row, col, boardSize)) {
          addError(`[${label}] wrongGuidedMoveDefenses[${defenseIndex}].move is out of bounds: [${row}, ${col}].`);
        } else if (readBoardCell(rows, row, col) !== ".") {
          addError(`[${label}] wrongGuidedMoveDefenses[${defenseIndex}].move must point to an empty intersection in the initial position.`);
        }
      });
    }
  }

  if (problem.solutions.successCondition !== undefined) {
    if (problem.solutions.successCondition !== "prevent-white-two-eyes") {
      addError(`[${label}] solutions.successCondition must be "prevent-white-two-eyes" when present.`);
    }

    if (problem.goalType !== "kill") {
      addError(`[${label}] solutions.successCondition is only supported for kill problems.`);
    }

    if (Array.isArray(problem.solutions.principalVariation) && problem.solutions.principalVariation.length > 0) {
      addError(`[${label}] prevent-white-two-eyes problems should not define solutions.principalVariation.`);
    }
  }

  if (!problem.verification || typeof problem.verification.status !== "string") {
    addError(`[${label}] verification.status is required.`);
  } else if (isPreventWhiteTwoEyesProblem(problem) && problem.verification.shortestWinLength !== 1) {
    addError(`[${label}] prevent-white-two-eyes problems must use verification.shortestWinLength = 1.`);
  }

  if (!problem.metadata || !Array.isArray(problem.metadata.tags)) {
    addError(`[${label}] metadata.tags is required.`);
  }

  if (!problem.ui || typeof problem.ui !== "object") {
    addError(`[${label}] ui is required.`);
  }
}

function validateGeneratedExports(canonicalData) {
  const expectedWebExport = buildWebExport(canonicalData);
  const expectedSolverExport = buildSolverExport(canonicalData);
  const actualWebExport = loadGeneratedWebData();
  const actualSolverExport = readJson(SOLVER_EXPORT_PATH);

  if (JSON.stringify(actualWebExport) !== JSON.stringify(expectedWebExport)) {
    addError(`Web export is stale or invalid. Regenerate it from ${CANONICAL_PATH}.`);
  }

  if (JSON.stringify(actualSolverExport) !== JSON.stringify(expectedSolverExport)) {
    addError(`Solver export is stale or invalid. Regenerate it from ${CANONICAL_PATH}.`);
  }
}

function validateBrowserCompatibility(canonicalData) {
  const app = loadScriptApi();

  canonicalData.problems.forEach((canonicalProblem) => {
    const exportedProblem = app.TSUMEGO_PROBLEMS.find((problem) => problem.id === canonicalProblem.id);
    const label = canonicalProblem.id;

    if (!exportedProblem) {
      addError(`[${label}] missing from browser export.`);
      return;
    }

    const state = app.createTsumegoState(canonicalProblem.id);
    const expectedWinningMoves = canonicalProblem.solutions.winningFirstMoves.map((entry) => entry.move);
    const { winningMoves, legalMoves } = collectWinningMoves(app, exportedProblem);

    if (
      JSON.stringify(normalizeMoveList(winningMoves)) !== JSON.stringify(normalizeMoveList(expectedWinningMoves))
    ) {
      addError(
        `[${label}] browser-winning first moves ${JSON.stringify(winningMoves)} do not match canonical ${JSON.stringify(
          expectedWinningMoves
        )}.`
      );
    }

    if (canonicalProblem.solutions.isUniqueFirstMove && winningMoves.length !== 1) {
      addError(`[${label}] canonical marks a unique first move, but browser export has ${winningMoves.length} winning moves.`);
    }

    if (
      canonicalProblem.solutions.isUniqueFirstMove &&
      expectedWinningMoves.length === 1 &&
      !sameMove(expectedWinningMoves[0], exportedProblem.solution)
    ) {
      addError(
        `[${label}] legacy solution ${JSON.stringify(exportedProblem.solution)} does not match the canonical primary move.`
      );
    }

    if (canonicalProblem.goalType === "live" && app.isTsumegoLiveByTwoEyes(state.board, exportedProblem)) {
      addError(`[${label}] live problem is already alive before the first move.`);
    }

    if (isPreventWhiteTwoEyesProblem(canonicalProblem)) {
      expectedWinningMoves.forEach((move) => {
        const result = app.attemptTsumegoMove(state, move[0], move[1]);

        if (!result.nextState?.solved || result.nextState.phase === "awaiting-auto-white") {
          addError(
            `[${label}] prevent-white-two-eyes winning move ${JSON.stringify(
              move
            )} must solve immediately without queued auto-white.`
          );
          return;
        }

        if (hasTargetColorAliveByTwoEyes(app, result.nextState.board, exportedProblem, app.WHITE)) {
          addError(`[${label}] prevent-white-two-eyes winning move ${JSON.stringify(move)} leaves White with two eyes.`);
        }
      });
    }

    const wrongLegalMoves = legalMoves.filter(
      (move) => !expectedWinningMoves.some((winningMove) => sameMove(move, winningMove))
    );

    if (wrongLegalMoves.length === 0) {
      addWarning(`[${label}] no legal wrong first moves were found in the current browser export.`);
    }

    if (
      canonicalProblem.goalType === "kill" &&
      Array.isArray(canonicalProblem.solutions?.wrongFirstMoveDefense?.move)
    ) {
      validateWrongFirstMoveDefense(app, state, exportedProblem, wrongLegalMoves, label);
    }

    if (canonicalProblem.goalType === "live") {
      validateLiveProblemDefense(app, state, exportedProblem, wrongLegalMoves, label);
      validateWrongGuidedMoveDefenses(app, state, exportedProblem, label);
    }
  });
}

const canonicalData = loadCanonicalData();

if (!canonicalData || !Array.isArray(canonicalData.problems)) {
  addError(`Canonical tsumego data could not be loaded from ${CANONICAL_PATH}.`);
} else {
  if (!Number.isInteger(canonicalData.schemaVersion) || canonicalData.schemaVersion <= 0) {
    addError("schemaVersion must be a positive integer.");
  }

  if (!canonicalData.dataset || typeof canonicalData.dataset.id !== "string") {
    addError("dataset.id is required.");
  }

  const seenIds = new Set();
  const seenTitles = new Set();

  canonicalData.problems.forEach((problem, index) => {
    if (typeof problem.id === "string") {
      if (seenIds.has(problem.id)) {
        addError(`[${problem.id}] duplicate problem id.`);
      }
      seenIds.add(problem.id);
    }

    if (typeof problem.title === "string") {
      if (seenTitles.has(problem.title)) {
        addWarning(`[${problem.id ?? `index-${index}`}] duplicate title "${problem.title}".`);
      }
      seenTitles.add(problem.title);
    }

    validateCanonicalProblem(problem, index);
  });

  validateGeneratedExports(canonicalData);
  validateBrowserCompatibility(canonicalData);
}

if (errors.length > 0) {
  console.error("Tsumego validation failed.");
  errors.forEach((message) => {
    console.error(`ERROR: ${message}`);
  });
  warnings.forEach((message) => {
    console.error(`WARN: ${message}`);
  });
  process.exitCode = 1;
} else {
  console.log(`Tsumego validation passed for ${canonicalData.problems.length} canonical problems.`);
  warnings.forEach((message) => {
    console.log(`WARN: ${message}`);
  });
}
