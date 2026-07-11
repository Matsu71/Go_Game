const DATASET_PREFIX = "datasets/";
const MAX_UPLOAD_BYTES = 1024 * 1024;
const MAX_PROBLEMS = 500;

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}

function getAllowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getCorsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin || !getAllowedOrigins(env).includes(origin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  Object.entries(getCorsHeaders(request, env)).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function secureEquals(left, right) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right))
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < Math.max(leftBytes.length, rightBytes.length); index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return difference === 0;
}

async function isAuthorized(request, env) {
  const authorization = request.headers.get("Authorization") ?? "";
  const expectedToken = String(env.ADMIN_TOKEN ?? "");
  if (!authorization.startsWith("Bearer ") || expectedToken.length === 0) {
    return false;
  }

  return secureEquals(authorization.slice("Bearer ".length), expectedToken);
}

function getRows(problem) {
  if (Array.isArray(problem?.rows)) {
    return problem.rows;
  }

  if (problem?.initialPosition?.format === "rows" && Array.isArray(problem.initialPosition.rows)) {
    return problem.initialPosition.rows;
  }

  return null;
}

function isValidMove(move, boardSize) {
  return (
    Array.isArray(move) &&
    move.length === 2 &&
    Number.isInteger(move[0]) &&
    Number.isInteger(move[1]) &&
    move[0] >= 0 &&
    move[0] < boardSize &&
    move[1] >= 0 &&
    move[1] < boardSize
  );
}

function getTargetStones(problem) {
  if (Array.isArray(problem?.targetStones)) {
    return problem.targetStones;
  }
  if (Array.isArray(problem?.target?.groups)) {
    return problem.target.groups.flatMap((group) => Array.isArray(group?.stones) ? group.stones : []);
  }
  return Array.isArray(problem?.target?.stones) ? problem.target.stones : [];
}

export function validateDataset(dataset) {
  const errors = [];
  const datasetId = dataset?.dataset?.id ?? dataset?.id;
  const datasetName = dataset?.dataset?.name ?? dataset?.name ?? datasetId;
  const problems = dataset?.problems;

  if (!dataset || typeof dataset !== "object" || Array.isArray(dataset)) {
    return { errors: ["JSONの最上位はオブジェクトにしてください。"] };
  }

  if (typeof datasetId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(datasetId)) {
    errors.push("dataset.id の形式が正しくありません。");
  }

  if (typeof datasetName !== "string" || datasetName.trim().length === 0 || datasetName.length > 100) {
    errors.push("dataset.name は1〜100文字で指定してください。");
  }

  if (!Array.isArray(problems) || problems.length === 0 || problems.length > MAX_PROBLEMS) {
    errors.push(`problems は1〜${MAX_PROBLEMS}問にしてください。`);
  }

  const ids = new Set();
  (Array.isArray(problems) ? problems : []).forEach((problem, index) => {
    const label = `problems[${index}]`;
    const rows = getRows(problem);
    const boardSize = problem?.boardSize ?? (Array.isArray(rows) ? rows.length : null);

    if (typeof problem?.id !== "string" || problem.id.length === 0 || ids.has(problem.id)) {
      errors.push(`${label}.id が未指定または重複しています。`);
    } else {
      ids.add(problem.id);
    }

    if (typeof problem?.title !== "string" || problem.title.length === 0) {
      errors.push(`${label}.title が必要です。`);
    }

    if (!Number.isInteger(boardSize) || boardSize < 5 || boardSize > 9) {
      errors.push(`${label}.boardSize は5〜9にしてください。`);
    }

    if (
      !Array.isArray(rows) ||
      !Number.isInteger(boardSize) ||
      rows.length !== boardSize ||
      rows.some((row) => typeof row !== "string" || row.length !== boardSize || !/^[.BW]+$/.test(row))
    ) {
      errors.push(`${label} の盤面形式が正しくありません。`);
    }

    if (problem?.turn !== "black") {
      errors.push(`${label}.turn は black にしてください。`);
    }

    if (!["capture", "live", "kill"].includes(problem?.goalType)) {
      errors.push(`${label}.goalType が正しくありません。`);
    }

    const targetStones = getTargetStones(problem);
    const expectedTargetColor = problem?.goalType === "live" ? "black" : "white";
    const expectedTargetCell = expectedTargetColor === "black" ? "B" : "W";
    if (problem?.target?.color !== expectedTargetColor) {
      errors.push(`${label}.target.color は ${expectedTargetColor} にしてください。`);
    }
    if (targetStones.length === 0) {
      errors.push(`${label}.target に対象石が必要です。`);
    } else if (Number.isInteger(boardSize)) {
      targetStones.forEach((stone) => {
        if (!isValidMove(stone, boardSize) || rows?.[stone[0]]?.[stone[1]] !== expectedTargetCell) {
          errors.push(`${label}.target の座標または対象色が正しくありません。`);
        }
      });
    }

    const winningFirstMoves = problem?.solutions?.winningFirstMoves;
    if (!Array.isArray(winningFirstMoves) || winningFirstMoves.length === 0) {
      errors.push(`${label}.solutions.winningFirstMoves が必要です。`);
    } else if (Number.isInteger(boardSize)) {
      winningFirstMoves.forEach((entry) => {
        if (!isValidMove(entry?.move, boardSize) || rows?.[entry.move[0]]?.[entry.move[1]] !== ".") {
          errors.push(`${label} の正解初手は盤内の空点にしてください。`);
        }
      });
    }

    if (Number.isInteger(boardSize) && Array.isArray(problem?.solutions?.principalVariation)) {
      problem.solutions.principalVariation.forEach((entry, moveIndex) => {
        const expectedPlayer = moveIndex % 2 === 0 ? "black" : "white";
        if (!isValidMove(entry?.move, boardSize) || entry?.player !== expectedPlayer) {
          errors.push(`${label} の主変化${moveIndex + 1}手目が正しくありません。`);
        }
      });
    }
  });

  return {
    errors,
    summary: {
      id: datasetId,
      name: datasetName,
      problemCount: Array.isArray(problems) ? problems.length : 0,
      schemaVersion: dataset?.schemaVersion ?? 1
    }
  };
}

async function listDatasets(env) {
  const datasets = [];
  let cursor;

  do {
    const page = await env.TSUMEGO_BUCKET.list({
      prefix: DATASET_PREFIX,
      cursor,
      include: ["customMetadata"]
    });

    page.objects.forEach((object) => {
      const metadata = object.customMetadata ?? {};
      datasets.push({
        id: metadata.datasetId ?? object.key.slice(DATASET_PREFIX.length).replace(/\.json$/, ""),
        name: metadata.name ?? metadata.datasetId ?? object.key,
        problemCount: Number(metadata.problemCount ?? 0),
        schemaVersion: Number(metadata.schemaVersion ?? 1),
        uploadedAt: metadata.uploadedAt ?? object.uploaded?.toISOString?.() ?? null
      });
    });

    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  datasets.sort((left, right) => left.name.localeCompare(right.name, "ja"));
  return datasets;
}

async function handleRequest(request, env) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    const origin = request.headers.get("Origin");
    if (origin && !getAllowedOrigins(env).includes(origin)) {
      return jsonResponse({ error: "このサイトからの接続は許可されていません。" }, 403);
    }
    return new Response(null, { status: 204, headers: getCorsHeaders(request, env) });
  }

  if (url.pathname === "/api/health" && request.method === "GET") {
    return jsonResponse({ ok: true });
  }

  if (url.pathname === "/api/datasets" && request.method === "GET") {
    return jsonResponse({ datasets: await listDatasets(env) });
  }

  if (url.pathname === "/api/datasets" && request.method === "POST") {
    if (!(await isAuthorized(request, env))) {
      return jsonResponse({ error: "管理トークンが正しくありません。" }, 401);
    }

    const contentLength = Number(request.headers.get("Content-Length") ?? 0);
    if (contentLength > MAX_UPLOAD_BYTES) {
      return jsonResponse({ error: "JSONファイルは1MB以下にしてください。" }, 413);
    }

    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_UPLOAD_BYTES) {
      return jsonResponse({ error: "JSONファイルは1MB以下にしてください。" }, 413);
    }

    let dataset;
    try {
      dataset = JSON.parse(text);
    } catch (error) {
      return jsonResponse({ error: "JSONの構文が正しくありません。" }, 400);
    }

    const validation = validateDataset(dataset);
    if (validation.errors.length > 0) {
      return jsonResponse({ error: validation.errors.slice(0, 5).join("\n"), errors: validation.errors }, 400);
    }

    const uploadedAt = new Date().toISOString();
    const key = `${DATASET_PREFIX}${validation.summary.id}.json`;
    await env.TSUMEGO_BUCKET.put(key, `${JSON.stringify(dataset, null, 2)}\n`, {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
      customMetadata: {
        datasetId: validation.summary.id,
        name: validation.summary.name,
        problemCount: String(validation.summary.problemCount),
        schemaVersion: String(validation.summary.schemaVersion),
        uploadedAt
      }
    });

    return jsonResponse({ dataset: { ...validation.summary, uploadedAt } }, 201);
  }

  const datasetMatch = url.pathname.match(/^\/api\/datasets\/([A-Za-z0-9][A-Za-z0-9._-]{0,63})$/);
  if (datasetMatch && request.method === "GET") {
    const object = await env.TSUMEGO_BUCKET.get(`${DATASET_PREFIX}${datasetMatch[1]}.json`);
    if (!object) {
      return jsonResponse({ error: "共有データが見つかりません。" }, 404);
    }

    const headers = new Headers({
      "Content-Type": object.httpMetadata?.contentType ?? "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    });
    if (object.httpEtag) {
      headers.set("ETag", object.httpEtag);
    }
    return new Response(object.body, { headers });
  }

  if (datasetMatch && request.method === "DELETE") {
    if (!(await isAuthorized(request, env))) {
      return jsonResponse({ error: "管理トークンが正しくありません。" }, 401);
    }
    await env.TSUMEGO_BUCKET.delete(`${DATASET_PREFIX}${datasetMatch[1]}.json`);
    return jsonResponse({ deleted: datasetMatch[1] });
  }

  return jsonResponse({ error: "Not Found" }, 404);
}

export default {
  async fetch(request, env) {
    try {
      return withCors(await handleRequest(request, env), request, env);
    } catch (error) {
      console.error(error);
      return withCors(jsonResponse({ error: "保存APIの内部でエラーが発生しました。" }, 500), request, env);
    }
  }
};
