// Sources déclarées — mêmes codes et limites que database/schema.sql (scrape_sources).
// Aucune URL de page précise n'est inventée : le point de départ par défaut
// est la page d'accueil publique de la source ; --url permet de cibler
// une page publique précise, vérifiée à la main avant un run réel.
export const SOURCES = {
  growdiaries: {
    code: "growdiaries",
    name: "GrowDiaries",
    base_url: "https://growdiaries.com",
    rate_limit_per_minute: 30,
    note: "Journaux de culture publics.",
  },
  thcfarmer: {
    code: "thcfarmer",
    name: "THCFarmer",
    base_url: "https://www.thcfarmer.com",
    rate_limit_per_minute: 30,
    note: "Forum public.",
  },
  rollitup: {
    code: "rollitup",
    name: "Rollitup",
    base_url: "https://www.rollitup.org",
    rate_limit_per_minute: 30,
    note: "Forum public.",
  },
  overgrow: {
    code: "overgrow",
    name: "Overgrow",
    base_url: "https://overgrow.com",
    rate_limit_per_minute: 30,
    note: "Communauté publique.",
  },
  reddit: {
    code: "reddit",
    name: "Reddit",
    base_url: "https://www.reddit.com",
    rate_limit_per_minute: 30,
    note: "Pages publiques uniquement ; aucun contenu derrière connexion.",
  },
};

export const USER_AGENT = "GrowShieldBot/1.0 (C3 GrowShield AI, contact: voir README du projet)";

/** Délai minimal entre deux requêtes, en ms, pour un rate-limit donné. */
export function delayForRateLimit(rateLimitPerMinute) {
  if (!Number.isFinite(rateLimitPerMinute) || rateLimitPerMinute <= 0) {
    throw new Error("rate_limit_per_minute doit être > 0.");
  }
  return Math.ceil(60000 / rateLimitPerMinute);
}

/**
 * Vérifie robots.txt (analyse simple) : true si le chemin est autorisé
 * pour notre agent (ou pour *). En cas de doute (fichier illisible),
 * la fonction renvoie null : l'appelant doit alors s'arrêter avec
 * une erreur explicite, jamais supposer une autorisation.
 */
export function robotsAllows(robotsTxt, userAgent, path) {
  if (typeof robotsTxt !== "string") return null;
  let currentApplies = false;
  let disallowed = false;
  let allowed = false;
  for (const rawLine of robotsTxt.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const [keyRaw, valueRaw] = line.split(":", 2);
    if (valueRaw === undefined) continue;
    const key = keyRaw.trim().toLowerCase();
    const value = valueRaw.trim();
    if (key === "user-agent") {
      currentApplies = value === "*" || value.toLowerCase() === userAgent.toLowerCase();
    } else if (currentApplies && key === "disallow" && value) {
      const pattern = value.replace(/\*/g, ".*");
      if (new RegExp(`^${pattern}`).test(path)) disallowed = true;
    } else if (currentApplies && key === "allow" && value) {
      const pattern = value.replace(/\*/g, ".*");
      if (new RegExp(`^${pattern}`).test(path)) allowed = true;
    }
  }
  if (allowed) return true;
  if (disallowed) return false;
  return true;
}

/** Extrait les liens d'une page HTML, dédupliqués, sans inférer de cultivar. */
export function extractLinks(html, baseUrl) {
  const seen = new Set();
  const links = [];
  const re = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    let href = match[1].trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:")) continue;
    try {
      href = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
    if (seen.has(href)) continue;
    seen.add(href);
    const text = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
    links.push({ source_url: href, link_text: text || null });
  }
  return links;
}
