const test = require("node:test");
const assert = require("node:assert/strict");

require("../data/export/web/tsumego-data.js");
const { prepareUploadedTsumegoDataset } = require("../script.js");
const canonical = require("../data/canonical/tsumego-canonical.json");

test("canonical dataset is accepted for browser upload", () => {
  const prepared = prepareUploadedTsumegoDataset(canonical);
  assert.equal(prepared.summary.id, canonical.dataset.id);
  assert.equal(prepared.summary.problemCount, canonical.problems.length);
  assert.deepEqual(
    prepared.webData.problems[0].rows,
    canonical.problems[0].initialPosition.rows
  );
});

test("web export dataset is accepted for browser upload", () => {
  const prepared = prepareUploadedTsumegoDataset(globalThis.GO_APP_TSUMEGO_DATA);
  assert.equal(prepared.summary.problemCount, globalThis.GO_APP_TSUMEGO_DATA.problems.length);
});

test("white-to-play and out-of-board solutions are rejected", () => {
  const invalid = structuredClone(canonical);
  invalid.dataset.id = "invalid-upload";
  invalid.problems = [structuredClone(invalid.problems[0])];
  invalid.problems[0].turn = "white";
  invalid.problems[0].solutions.winningFirstMoves[0].move = [99, 99];

  assert.throws(
    () => prepareUploadedTsumegoDataset(invalid),
    /turn は black[\s\S]*盤内/
  );
});
