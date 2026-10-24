#!/usr/bin/env node
/**
 * Scraper exécutable C3 GrowShield AI — lot 2.
 *
 * Usage :
 *   node scrapers/src/run.mjs --source growdiaries --dry-run
 *   node scrapers/src/run.mjs --source growdiaries --limit 20 --out out.jsonl
 *   node scrapers/src/run.mjs --source reddit --url https://www.reddit.com/r/… --limit 10
 *
 * Règles strictes :
 * - --dry-run ne fait AUCUNE requête réseau : il affiche le plan et valide la config.
 * - En mode réel : robots.txt vérifié d'abord ; chemin interdit -> arrêt avec erreur.
 * - Rate-limit strict : délai minimal = 60000 / rate_limit_per_minute (2 s à 30/min),
 *   --delay-ms ne peut que l'augmenter, jamais le réduire.
 * - 429 / 5xx / échec réseau -> erreur explicite, code de sortie 1, AUCUNE donnée inventée.
 * - Sortie = liens bruts (source_url, link_text) uniquement : aucune inférence
 *   de cultivar, breeder, THC ou rendement. L'import en base et la
 *   déduplication (ai/normalization_engine.md) sont des étapes séparées.
 * - User-Agent identifié, jamais un faux navigateur, jamais de contournement
 *   (pas de CAPTCHA, pas de paywall, pas de contenu derrière connexion).
 */
import { writeFileSync } from "node:fs";
import { SOURCES, USER_AGENT, delayForRateLimit, robotsAllows, extractLinks } from "./sources.mjs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetchImpl(url, { headers: { "User-Agent": USER_AGENT }, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function runScraper({ sourceCode, limit = 20, dryRun = false, startUrl, delayMs, fetchImpl = fetch }) {
  const source = SOURCES[sourceCode];
  if (!source) throw new Error(`Source inconnue : ${sourceCode}. Sources : ${Object.keys(SOURCES).join(", ")}.`);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new Error("Le paramètre --limit doit être un entier entre 1 et 200.");
  const minDelay = delayForRateLimit(source.rate_limit_per_minute);
  const delay = delayMs === undefined ? minDelay : Math.max(minDelay, delayMs);
  const url = startUrl ?? source.base_url;

  if (dryRun) {
    return {
      mode: "dry-run",
      network: false,
      source: source.code,
      source_name: source.name,
      base_url: source.base_url,
      start_url: url,
      rate_limit_per_minute: source.rate_limit_per_minute,
      delay_ms: delay,
      limit,
      planned_requests: "robots.txt + 1 page de départ",
      note: "Aucune requête réseau effectuée en dry-run. En mode réel, robots.txt est vérifié avant toute page.",
    };
  }

  // 1. robots.txt
  let robotsTxt;
  try {
    const robotsRes = await fetchText(new URL("/robots.txt", source.base_url).toString(), fetchImpl);
    robotsTxt = robotsRes.ok ? await robotsRes.text() : null;
  } catch {
    robotsTxt = null;
  }
  if (robotsTxt === null) {
    throw new Error(`robots.txt illisible pour ${source.base_url} : arrêt, autorisation non établie (aucune donnée collectée).`);
  }
  const path = new URL(url).pathname;
  if (robotsAllows(robotsTxt, "GrowShieldBot", path) === false) {
    throw new Error(`robots.txt interdit l'accès à ${path} pour GrowShieldBot : arrêt, aucune donnée collectée.`);
  }
  await sleep(delay);

  // 2. Page de départ
  let res;
  try {
    res = await fetchText(url, fetchImpl);
  } catch (err) {
    throw new Error(`Échec réseau pour ${url} : ${err.message} (aucune donnée collectée).`);
  }
  if (res.status === 429) {
    throw new Error(`HTTP 429 (trop de requêtes) pour ${url} : arrêt immédiat, reprendre plus tard avec un délai supérieur (aucune donnée collectée).`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} pour ${url} : arrêt, aucune donnée collectée.`);
  }
  const html = await res.text();
  const links = extractLinks(html, url).slice(0, limit);
  return {
    mode: "live",
    network: true,
    source: source.code,
    source_name: source.name,
    start_url: url,
    rate_limit_per_minute: source.rate_limit_per_minute,
    delay_ms: delay,
    items_fetched: links.length,
    items: links,
    dedup_note: "Déduplication non effectuée ici : importer ensuite via la pipeline (normalisation avant enrichissement).",
  };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg.startsWith("--")) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      args[key] = argv[++i];
    }
  }
  return args;
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  try {
    if (!args.source) throw new Error("Usage : node scrapers/src/run.mjs --source <growdiaries|thcfarmer|rollitup|overgrow|reddit> [--dry-run] [--limit N] [--url URL] [--delay-ms N] [--out fichier.json]");
    const result = await runScraper({
      sourceCode: args.source,
      limit: args.limit === undefined ? 20 : Number(args.limit),
      dryRun: Boolean(args.dryRun),
      startUrl: args.url,
      delayMs: args.delayMs === undefined ? undefined : Number(args.delayMs),
    });
    const output = JSON.stringify(result, null, 2);
    if (args.out) {
      writeFileSync(args.out, output + "\n", "utf8");
      console.log(`Résultat écrit dans ${args.out} (${result.mode}, ${result.items_fetched ?? 0} liens).`);
    } else {
      console.log(output);
    }
  } catch (err) {
    console.error(`Erreur : ${err.message}`);
    process.exit(1);
  }
}
