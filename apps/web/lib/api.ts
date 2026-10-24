// Client API v1 : consomme apps/api (voir api/openapi.yaml).
// En l'absence d'API, les pages affichent un état vide explicite,
// jamais de données inventées.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type Cultivar = {
  id: string;
  name: string;
  canonical_name: string;
  breeder_name?: string | null;
  breeder_verification_status?: string;
  commercial_score?: number | null;
  completeness?: string;
};

export async function listCultivars(query = ""): Promise<Cultivar[]> {
  const url = `${BASE}/cultivars${query ? `?q=${encodeURIComponent(query)}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}
