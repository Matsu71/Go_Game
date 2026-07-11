import assert from "node:assert/strict";
import test from "node:test";
import worker, { validateDataset } from "./worker.mjs";

class MemoryR2Bucket {
  constructor() {
    this.objects = new Map();
  }

  async put(key, value, options = {}) {
    this.objects.set(key, {
      value,
      customMetadata: options.customMetadata ?? {},
      httpMetadata: options.httpMetadata ?? {},
      uploaded: new Date()
    });
  }

  async get(key) {
    const stored = this.objects.get(key);
    if (!stored) {
      return null;
    }
    return {
      body: stored.value,
      customMetadata: stored.customMetadata,
      httpMetadata: stored.httpMetadata,
      httpEtag: `etag-${key}`
    };
  }

  async list({ prefix = "" } = {}) {
    return {
      objects: [...this.objects.entries()]
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, stored]) => ({
          key,
          customMetadata: stored.customMetadata,
          uploaded: stored.uploaded
        })),
      truncated: false
    };
  }

  async delete(key) {
    this.objects.delete(key);
  }
}

const validDataset = {
  schemaVersion: 1,
  dataset: { id: "upload-test", name: "アップロードテスト" },
  problems: [
    {
      id: "problem-1",
      title: "第1問",
      boardSize: 6,
      initialPosition: {
        format: "rows",
        rows: ["......", "..B...", ".BW...", "..B...", "......", "......"]
      },
      turn: "black",
      goalType: "capture",
      target: {
        color: "white",
        stones: [[2, 2]]
      },
      solutions: {
        winningFirstMoves: [{ move: [2, 3], isPrimary: true }]
      }
    }
  ]
};

function createEnv() {
  return {
    TSUMEGO_BUCKET: new MemoryR2Bucket(),
    ADMIN_TOKEN: "test-secret",
    ALLOWED_ORIGINS: "https://matsu71.github.io,http://127.0.0.1:4173"
  };
}

test("validateDataset accepts canonical row data", () => {
  assert.deepEqual(validateDataset(validDataset).errors, []);
});

test("upload requires the admin token", async () => {
  const response = await worker.fetch(
    new Request("https://worker.example/api/datasets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validDataset)
    }),
    createEnv()
  );
  assert.equal(response.status, 401);
});

test("uploaded data can be listed and fetched", async () => {
  const env = createEnv();
  const uploadResponse = await worker.fetch(
    new Request("https://worker.example/api/datasets", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-secret",
        "Content-Type": "application/json",
        Origin: "https://matsu71.github.io"
      },
      body: JSON.stringify(validDataset)
    }),
    env
  );
  assert.equal(uploadResponse.status, 201);
  assert.equal(uploadResponse.headers.get("Access-Control-Allow-Origin"), "https://matsu71.github.io");

  const listResponse = await worker.fetch(new Request("https://worker.example/api/datasets"), env);
  const listPayload = await listResponse.json();
  assert.equal(listPayload.datasets.length, 1);
  assert.equal(listPayload.datasets[0].id, "upload-test");

  const getResponse = await worker.fetch(
    new Request("https://worker.example/api/datasets/upload-test"),
    env
  );
  assert.equal(getResponse.status, 200);
  assert.deepEqual(await getResponse.json(), validDataset);
});

test("invalid board rows are rejected", async () => {
  const env = createEnv();
  const invalidDataset = structuredClone(validDataset);
  invalidDataset.problems[0].initialPosition.rows[0] = "invalid";
  const response = await worker.fetch(
    new Request("https://worker.example/api/datasets", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-secret",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(invalidDataset)
    }),
    env
  );
  assert.equal(response.status, 400);
});
