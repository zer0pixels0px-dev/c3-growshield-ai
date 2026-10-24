/**
 * Tests lot 2 — base SIMULÉE (faux pool), pas de PostgreSQL live.
 * Ce qui est testé ici : santé, validation, auth/rôles, pagination,
 * scoring pur et normalisation, routes avec réponses simulées.
 * Un test contre une vraie base exige DATABASE_URL + docker compose up -d db
 * et n'est PAS prétendu ici (voir STATUS.md).
 */
import assert from "node:assert/strict";
import test from "node:test";
import type { Express } from "express";
import { createApp } from "../src/app";
import { signToken } from "../src/auth";
import { computeScoreFromComponents } from "../src/scoring";
import { canonicalizeName, namesMatch } from "../src/normalization";

const SECRET = "test-secret-lot2";
process.env.AUTH_SECRET = SECRET;
process.env.AUTH_ADMIN_KEY = "test-admin-key";

const CULTIVAR_ID = "11111111-1111-4111-8111-111111111111";
const BREEDER_ID = "22222222-2222-4222-8222-222222222222";

function cultivarRow() {
  return {
    id: CULTIVAR_ID,
    name: "EXEMPLE Cultivar Test",
    canonical_name: "exemple-cultivar-test",
    breeder_id: BREEDER_ID,
    breeder_name: "EXEMPLE Breeder Alpha",
    breeder_verification_status: "non vérifié",
    plant_type: "hybride",
    thc_min_percent: null,
    thc_max_percent: null,
    commercial_score: 80,
    completeness: "partiel",
    component_count: 3,
  };
}

/** Faux pool : réponses simulées selon le texte SQL, jamais une vraie base. */
function fakePool() {
  return {
    async query(text: string, params?: unknown[]) {
      if (text.includes("SELECT 1 AS ok")) return { rows: [{ ok: 1 }], rowCount: 1 };
      if (text.includes("FROM v_cultivar_scores") && text.includes("COUNT")) {
        return { rows: [{ total: 1 }], rowCount: 1 };
      }
      if (text.includes("FROM v_cultivar_scores")) return { rows: [cultivarRow()], rowCount: 1 };
      if (text.includes("INSERT INTO cultivars")) {
        return { rows: [{ id: CULTIVAR_ID, name: params?.[0], canonical_name: params?.[1], breeder_verification_status: "non vérifié" }], rowCount: 1 };
      }
      if (text.includes("DELETE FROM cultivars")) return { rows: [], rowCount: 1 };
      if (text.includes("FROM commercial_scores")) return { rows: [], rowCount: 0 };
      if (text.includes("FROM cultivation_profiles")) {
        return { rows: [{ vigor_score: 8, mold_resistance_score: 7, bag_appeal_score: 9 }], rowCount: 1 };
      }
      if (text.includes("INSERT INTO commercial_scores")) return { rows: [{ id: "33333333-3333-4333-8333-333333333333" }], rowCount: 1 };
      if (text.includes("INSERT INTO score_components") || text.includes("DELETE FROM score_components") || text.includes("INSERT INTO score_history")) {
        return { rows: [], rowCount: 0 };
      }
      if (text.includes("INSERT INTO alias_proposals")) {
        return { rows: [{ id: "44444444-4444-4444-8444-444444444444", proposed_alias: params?.[0], status: "en attente" }], rowCount: 1 };
      }
      if (text.includes("SELECT id FROM cultivars")) return { rows: [{ id: CULTIVAR_ID }], rowCount: 1 };
      if (text.includes("FROM cultivars")) return { rows: [cultivarRow()], rowCount: 1 };
      if (text.includes("FROM breeders")) return { rows: [{ id: BREEDER_ID, name: "EXEMPLE Breeder Alpha", canonical_name: "exemple-breeder-alpha" }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    },
  };
}

async function start(app: Express) {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.on("listening", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    base: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

function editorToken() {
  return signToken(CULTIVAR_ID, ["editor"], SECRET);
}
function readerToken() {
  return signToken(CULTIVAR_ID, ["reader"], SECRET);
}
function adminToken() {
  return signToken(CULTIVAR_ID, ["admin"], SECRET);
}

test("santé : 200 sans base réelle", async () => {
  const { base, close } = await start(createApp({ pool: fakePool() as never }));
  try {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    const json = (await res.json()) as { status: string; version: string };
    assert.equal(json.status, "ok");
    assert.equal(json.version, "0.2.0");
  } finally {
    await close();
  }
});

test("cultivars : liste paginée simulée + pagination invalide rejetée", async () => {
  const { base, close } = await start(createApp({ pool: fakePool() as never }));
  try {
    const res = await fetch(`${base}/cultivars?page=1&per_page=20`);
    assert.equal(res.status, 200);
    const json = (await res.json()) as { data: unknown[]; total: number; page: number };
    assert.equal(json.total, 1);
    assert.equal(json.data.length, 1);
    const bad = await fetch(`${base}/cultivars?page=0`);
    assert.equal(bad.status, 400);
  } finally {
    await close();
  }
});

test("recherche : q trop court rejeté", async () => {
  const { base, close } = await start(createApp({ pool: fakePool() as never }));
  try {
    const res = await fetch(`${base}/search?q=x`);
    assert.equal(res.status, 400);
  } finally {
    await close();
  }
});

test("auth : écriture sans jeton 401, lecteur 403, éditeur 201", async () => {
  const { base, close } = await start(createApp({ pool: fakePool() as never }));
  try {
    const body = JSON.stringify({ name: "Nouveau", canonical_name: "nouveau" });
    const noToken = await fetch(`${base}/cultivars`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    assert.equal(noToken.status, 401);
    const reader = await fetch(`${base}/cultivars`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${readerToken()}` }, body });
    assert.equal(reader.status, 403);
    const editor = await fetch(`${base}/cultivars`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${editorToken()}` }, body });
    assert.equal(editor.status, 201);
    const delEditor = await fetch(`${base}/cultivars/${CULTIVAR_ID}`, { method: "DELETE", headers: { Authorization: `Bearer ${editorToken()}` } });
    assert.equal(delEditor.status, 403);
    const delAdmin = await fetch(`${base}/cultivars/${CULTIVAR_ID}`, { method: "DELETE", headers: { Authorization: `Bearer ${adminToken()}` } });
    assert.equal(delAdmin.status, 204);
  } finally {
    await close();
  }
});

test("validation : cultivar sans nom rejeté (éditeur authentifié)", async () => {
  const { base, close } = await start(createApp({ pool: fakePool() as never }));
  try {
    const res = await fetch(`${base}/cultivars`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${editorToken()}` },
      body: JSON.stringify({ canonical_name: "sans-nom" }),
    });
    assert.equal(res.status, 400);
  } finally {
    await close();
  }
});

test("scores : recalcul simulé depuis un profil (vigueur 8, moisissure 7, bag 9 = 80, partiel)", async () => {
  const { base, close } = await start(createApp({ pool: fakePool() as never }));
  try {
    const res = await fetch(`${base}/cultivars/${CULTIVAR_ID}/scores`, {
      method: "POST",
      headers: { Authorization: `Bearer ${editorToken()}` },
    });
    assert.equal(res.status, 200);
    const json = (await res.json()) as { score: number; completeness: string };
    assert.equal(json.score, 80);
    assert.equal(json.completeness, "partiel");
  } finally {
    await close();
  }
});

test("alias : un lecteur peut proposer, la proposition part en attente", async () => {
  const { base, close } = await start(createApp({ pool: fakePool() as never }));
  try {
    const res = await fetch(`${base}/cultivars/${CULTIVAR_ID}/aliases`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${readerToken()}` },
      body: JSON.stringify({ proposed_alias: "variante test" }),
    });
    assert.equal(res.status, 201);
    const json = (await res.json()) as { status: string };
    assert.equal(json.status, "en attente");
  } finally {
    await close();
  }
});

test("scoring pur : complet, partiel renormalisé, nul", () => {
  const full = computeScoreFromComponents([
    { component: "rendement", normalized_value: 100 },
    { component: "terpènes", normalized_value: 100 },
    { component: "vigueur", normalized_value: 100 },
    { component: "résistance moisissure", normalized_value: 100 },
    { component: "bag appeal", normalized_value: 100 },
    { component: "marché", normalized_value: 100 },
  ]);
  assert.equal(full.score, 100);
  assert.equal(full.completeness, "complet");
  const partial = computeScoreFromComponents([{ component: "vigueur", normalized_value: 80 }]);
  assert.equal(partial.score, 80);
  assert.equal(partial.completeness, "partiel");
  const none = computeScoreFromComponents([{ component: "vigueur", normalized_value: null }]);
  assert.equal(none.score, null);
  assert.equal(none.completeness, "nul");
});

test("normalisation pure : règles documentées", () => {
  assert.equal(canonicalizeName("GSC"), "girl scout cookies");
  assert.equal(canonicalizeName("RS11"), "rs-11");
  assert.equal(canonicalizeName("Thin Mint GSC"), "girl scout cookies");
  assert.equal(namesMatch("gsc", "Girl Scout Cookies"), true);
  assert.equal(namesMatch("gsc", "autre nom"), false);
});
