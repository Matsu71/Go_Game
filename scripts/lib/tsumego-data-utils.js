const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "../..");
const CANONICAL_PATH = path.join(REPO_ROOT, "data/canonical/tsumego-canonical.json");
const WEB_EXPORT_PATH = path.join(REPO_ROOT, "data/export/web/tsumego-data.js");
const SOLVER_EXPORT_PATH = path.join(REPO_ROOT, "data/export/solver/tsumego-problems.json");
const CANONICAL_SOURCE_PATH = "data/canonical/tsumego-canonical.json";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeTextFile(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadCanonicalData() {
  return readJson(CANONICAL_PATH);
}

function getProblemRows(problem) {
  if (!problem.initialPosition || problem.initialPosition.format !== "rows" || !Array.isArray(problem.initialPosition.rows)) {
    throw new Error(`Problem ${problem.id} must use initialPosition.format = "rows".`);
  }

  return problem.initialPosition.rows;
}

function getPrimaryWinningMove(problem) {
  const winningFirstMoves = problem.solutions?.winningFirstMoves;

  if (!Array.isArray(winningFirstMoves) || winningFirstMoves.length === 0) {
    return null;
  }

  const primaryEntry =
    winningFirstMoves.find((entry) => entry && entry.isPrimary && Array.isArray(entry.move)) ||
    winningFirstMoves.find((entry) => entry && Array.isArray(entry.move));

  return primaryEntry ? [...primaryEntry.move] : null;
}

function flattenTargetStones(problem) {
  if (Array.isArray(problem.target?.groups)) {
    return [...new Set(problem.target.groups.flatMap((group) => group.stones.map((stone) => JSON.stringify(stone))))].map(
      (serializedStone) => JSON.parse(serializedStone)
    );
  }

  if (Array.isArray(problem.target?.stones)) {
    return cloneValue(problem.target.stones);
  }

  return [];
}

function getMostCommonString(values, fallback = "") {
  const counts = new Map();

  values.forEach((value) => {
    if (typeof value !== "string" || value.length === 0) {
      return;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  let winner = fallback;
  let winnerCount = -1;

  counts.forEach((count, value) => {
    if (count > winnerCount) {
      winner = value;
      winnerCount = count;
    }
  });

  return winner;
}

function createPositionHash(problem) {
  const payload = JSON.stringify({
    boardSize: problem.boardSize,
    rows: getProblemRows(problem),
    turn: problem.turn,
    goalType: problem.goalType,
    target: problem.target
  });

  return crypto.createHash("sha1").update(payload).digest("hex");
}

function buildWebExport(canonicalData) {
  const boardSizes = [...new Set(canonicalData.problems.map((problem) => problem.boardSize))].sort((left, right) => left - right);
  const defaultPrompt = getMostCommonString(canonicalData.problems.map((problem) => problem.ui?.prompt));
  const defaultNote = getMostCommonString(canonicalData.problems.map((problem) => problem.ui?.note));

  return {
    schemaVersion: canonicalData.schemaVersion,
    dataset: {
      id: canonicalData.dataset?.id ?? null,
      name: canonicalData.dataset?.name ?? null,
      canonicalSource: CANONICAL_SOURCE_PATH,
      coordinateSystem: cloneValue(canonicalData.dataset?.coordinateSystem ?? null)
    },
    boardSize: boardSizes[0] ?? null,
    boardSizes,
    defaultPrompt,
    defaultNote,
    problems: canonicalData.problems.map((problem) => ({
      id: problem.id,
      title: problem.title,
      subtitle: problem.ui?.subtitle ?? "",
      boardSize: problem.boardSize,
      rows: getProblemRows(problem),
      turn: problem.turn,
      goalType: problem.goalType,
      target: cloneValue(problem.target),
      targetStones: flattenTargetStones(problem),
      constraints: cloneValue(problem.constraints),
      solutions: cloneValue(problem.solutions),
      solution: getPrimaryWinningMove(problem),
      verification: cloneValue(problem.verification),
      metadata: cloneValue(problem.metadata),
      ui: cloneValue(problem.ui),
      prompt: problem.ui?.prompt ?? defaultPrompt,
      note: problem.ui?.note ?? defaultNote,
      hint: problem.ui?.hint ?? null,
      explanation: problem.ui?.explanation ?? null
    }))
  };
}

function buildSolverExport(canonicalData) {
  return {
    schemaVersion: canonicalData.schemaVersion,
    dataset: {
      ...cloneValue(canonicalData.dataset),
      canonicalSource: CANONICAL_SOURCE_PATH
    },
    problems: canonicalData.problems.map((problem) => ({
      id: problem.id,
      title: problem.title,
      boardSize: problem.boardSize,
      initialPosition: cloneValue(problem.initialPosition),
      turn: problem.turn,
      goalType: problem.goalType,
      target: cloneValue(problem.target),
      constraints: cloneValue(problem.constraints),
      solutions: cloneValue(problem.solutions),
      verification: cloneValue(problem.verification),
      metadata: cloneValue(problem.metadata),
      derived: {
        primaryWinningFirstMove: getPrimaryWinningMove(problem),
        positionHash: createPositionHash(problem)
      }
    }))
  };
}

function serializeWebExport(data) {
  return `(function attachTsumegoData(globalScope) {\n  globalScope.GO_APP_TSUMEGO_DATA = ${JSON.stringify(
    data,
    null,
    2
  )};\n})(typeof globalThis !== "undefined" ? globalThis : this);\n`;
}

module.exports = {
  CANONICAL_PATH,
  CANONICAL_SOURCE_PATH,
  REPO_ROOT,
  SOLVER_EXPORT_PATH,
  WEB_EXPORT_PATH,
  buildSolverExport,
  buildWebExport,
  cloneValue,
  createPositionHash,
  flattenTargetStones,
  getPrimaryWinningMove,
  getProblemRows,
  loadCanonicalData,
  readJson,
  serializeWebExport,
  writeTextFile
};
