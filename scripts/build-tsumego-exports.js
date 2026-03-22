#!/usr/bin/env node

const {
  SOLVER_EXPORT_PATH,
  WEB_EXPORT_PATH,
  buildSolverExport,
  buildWebExport,
  loadCanonicalData,
  serializeWebExport,
  writeTextFile
} = require("./lib/tsumego-data-utils");

const canonicalData = loadCanonicalData();
const webExport = buildWebExport(canonicalData);
const solverExport = buildSolverExport(canonicalData);

writeTextFile(WEB_EXPORT_PATH, serializeWebExport(webExport));
writeTextFile(SOLVER_EXPORT_PATH, `${JSON.stringify(solverExport, null, 2)}\n`);

console.log(`Built web export: ${WEB_EXPORT_PATH}`);
console.log(`Built solver export: ${SOLVER_EXPORT_PATH}`);
