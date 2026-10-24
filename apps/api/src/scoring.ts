/**
 * Score commercial — implémentation TypeScript de ai/scoring_engine.md,
 * miroir de la fonction SQL compute_commercial_score().
 * Poids : rendement 35 %, terpènes 20 %, vigueur 15 %,
 * résistance moisissure 10 %, bag appeal 10 %, marché 10 %.
 * Un composant non documenté vaut null et est exclu du calcul ;
 * la pondération est renormalisée sur les composants présents.
 * Aucun composant -> score null, completeness "nul" (jamais 0).
 */

export const SCORE_WEIGHTS: Record<string, number> = {
  rendement: 35,
  "terpènes": 20,
  vigueur: 15,
  "résistance moisissure": 10,
  "bag appeal": 10,
  "marché": 10,
};

export type Completeness = "complet" | "partiel" | "nul";

export interface ScoreComponentInput {
  component: string;
  normalized_value: number | null;
}

export interface ComputedScore {
  score: number | null;
  completeness: Completeness;
  documented_count: number;
}

/** Ramène un score brut 0–10 à 0–100 ; null reste null. */
export function normalize10(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.min(100, num * 10));
}

export function computeScoreFromComponents(components: ScoreComponentInput[]): ComputedScore {
  const documented = components.filter(
    (c) => c.normalized_value !== null && SCORE_WEIGHTS[c.component] !== undefined,
  );
  if (documented.length === 0) return { score: null, completeness: "nul", documented_count: 0 };
  const totalWeight = documented.reduce((sum, c) => sum + SCORE_WEIGHTS[c.component], 0);
  const weightedSum = documented.reduce(
    (sum, c) => sum + SCORE_WEIGHTS[c.component] * (c.normalized_value as number),
    0,
  );
  const score = Math.round((weightedSum / totalWeight) * 100) / 100;
  const allComponents = Object.keys(SCORE_WEIGHTS);
  const completeness: Completeness =
    documented.length >= allComponents.length ? "complet" : "partiel";
  return { score, completeness, documented_count: documented.length };
}

/** Dérive les composants documentés d'un profil de culture (scores 0–10). */
export function componentsFromCultivationProfile(profile: {
  vigor_score?: number | null;
  mold_resistance_score?: number | null;
  bag_appeal_score?: number | null;
} | null): ScoreComponentInput[] {
  if (!profile) return [];
  return [
    { component: "vigueur", normalized_value: normalize10(profile.vigor_score) },
    { component: "résistance moisissure", normalized_value: normalize10(profile.mold_resistance_score) },
    { component: "bag appeal", normalized_value: normalize10(profile.bag_appeal_score) },
  ].filter((c) => c.normalized_value !== null);
}
