/**
 * Normalisation des noms — miroir de ai/normalization_engine.md.
 * Règles codées ici = règles documentées (gsc, rs11…) ; les règles
 * versionnées en base (canonical_name_rules) s'appliquent en plus
 * côté import, jamais en remplacement de la relecture humaine
 * pour un alias qui changerait breeder ou lignée.
 */

/** Règles d'alias documentées, appliquées après nettoyage. */
export const DOCUMENTED_ALIAS_RULES: Record<string, string> = {
  gsc: "girl scout cookies",
  "thin mint gsc": "girl scout cookies",
  rs11: "rs-11",
  "rs 11": "rs-11",
};

/** Nettoyage : minuscules, accents supprimés pour la comparaison, espaces normalisés. */
export function cleanName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Nom canonique : nettoyage + règle d'alias documentée si elle existe. */
export function canonicalizeName(raw: string): string {
  const cleaned = cleanName(raw);
  return DOCUMENTED_ALIAS_RULES[cleaned] ?? cleaned;
}

/** Deux noms désignent-ils le même cultivar selon les règles documentées ? */
export function namesMatch(a: string, b: string): boolean {
  return canonicalizeName(a) === canonicalizeName(b);
}
