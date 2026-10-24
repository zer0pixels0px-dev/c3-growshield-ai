import { Pool } from "pg";

/** Interface minimale utilisée par les routes : un vrai Pool pg ou un faux pool en test. */
export interface PoolLike {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount?: number | null }>;
}

export class DbUnavailableError extends Error {
  constructor() {
    super("Base de données non configurée : définissez DATABASE_URL puis lancez docker compose up -d db.");
    this.name = "DbUnavailableError";
  }
}

let pool: Pool | null = null;
let poolTried = false;

/** Pool partagé, créé une seule fois à partir de DATABASE_URL. null si non configurée. */
export function getPool(): Pool | null {
  if (poolTried) return pool;
  poolTried = true;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  pool = new Pool({ connectionString: url });
  return pool;
}

/** Résout le pool effectif : celui injecté (tests) sinon le pool partagé. */
export function requirePool(injected?: PoolLike | null): PoolLike {
  const p = injected ?? getPool();
  if (!p) throw new DbUnavailableError();
  return p as PoolLike;
}
