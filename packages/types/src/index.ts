export type VerificationStatus = "vérifié" | "non vérifié" | "contesté";
export type Completeness = "complet" | "partiel" | "nul";
export interface CultivarDTO {
  id: string; name: string; canonical_name: string;
  breeder_id?: string | null; breeder_verification_status: VerificationStatus;
  thc_min_percent?: number | null; thc_max_percent?: number | null;
}
export interface ScoreDTO {
  cultivar_id: string; score: number | null; completeness: Completeness;
}
