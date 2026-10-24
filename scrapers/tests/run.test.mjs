// Tests scrapers — aucun réseau réel (dry-run + fonctions pures + fetch simulé).
import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { delayForRateLimit, robotsAllows, extractLinks } from "../src/sources.mjs";
import { runScraper } from "../src/run.mjs";

const execFileAsync = promisify(execFile);
const runPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "run.mjs");

test("dry-run : les 5 sources, sans réseau, délai 2000 ms à 30 req/min", async () => {
  for (const source of ["growdiaries", "thcfarmer", "rollitup", "overgrow", "reddit"]) {
    const { stdout } = await execFileAsync(process.execPath, [runPath, "--source", source, "--dry-run"]);
    const json = JSON.parse(stdout);
    assert.equal(json.mode, "dry-run");
    assert.equal(json.network, false);
    assert.equal(json.source, source);
    assert.equal(json.delay_ms, 2000);
    assert.equal(json.rate_limit_per_minute, 30);
  }
});

test("dry-run : source inconnue -> erreur, pas de données", async () => {
  await assert.rejects(() => runScraper({ sourceCode: "inconnue", dryRun: true }), /Source inconnue/);
});

test("rate-limit : délai minimal respecté, --delay-ms ne peut que l'augmenter", () => {
  assert.equal(delayForRateLimit(30), 2000);
  assert.equal(delayForRateLimit(60), 1000);
  assert.throws(() => delayForRateLimit(0), /rate_limit/);
});

test("robots : Disallow respecté, Allow prioritaire", () => {
  const txt = "User-agent: *\nDisallow: /prive/\nAllow: /prive/public\n";
  assert.equal(robotsAllows(txt, "GrowShieldBot", "/prive/secret"), false);
  assert.equal(robotsAllows(txt, "GrowShieldBot", "/public"), true);
  assert.equal(robotsAllows("User-agent: *\nDisallow: /", "GrowShieldBot", "/"), false);
});

test("extraction : liens dédupliqués, sans inférence de cultivar", () => {
  const links = extractLinks('<a href="/a">Premier</a><a href="/a">Premier</a><a href="https://exemple.com/b">Deux</a>', "https://exemple.com");
  assert.equal(links.length, 2);
  assert.equal(links[0].source_url, "https://exemple.com/a");
  assert.ok(!("cultivar" in links[0]));
});

test("live simulé : robots interdit -> erreur explicite, aucune donnée", async () => {
  const fakeFetch = async (url) => {
    if (String(url).endsWith("/robots.txt")) {
      return { ok: true, text: async () => "User-agent: *\nDisallow: /" };
    }
    throw new Error("ne devrait pas être appelé");
  };
  await assert.rejects(
    () => runScraper({ sourceCode: "growdiaries", dryRun: false, delayMs: 2000, fetchImpl: fakeFetch }),
    /robots\.txt interdit/,
  );
});

test("live simulé : 429 -> erreur explicite, aucune donnée", async () => {
  const fakeFetch = async (url) => {
    if (String(url).endsWith("/robots.txt")) return { ok: true, text: async () => "User-agent: *\n" };
    return { ok: false, status: 429, text: async () => "" };
  };
  await assert.rejects(
    () => runScraper({ sourceCode: "growdiaries", dryRun: false, delayMs: 2000, fetchImpl: fakeFetch }),
    /429/,
  );
});
