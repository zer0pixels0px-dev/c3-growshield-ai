import express, { type NextFunction, type Request, type Response } from "express";
import { DbUnavailableError, requirePool, type PoolLike } from "./db";
import { getAuthSecret, requireAuth, requireRole, signToken, userIdFromToken, type AuthedRequest, type Role } from "./auth";
import { computeScoreFromComponents, componentsFromCultivationProfile, SCORE_WEIGHTS, type ScoreComponentInput } from "./scoring";
import {
  BadRequestError, NotFoundError, checkMinMax, isUuid, isValidDate, optionalEnum, optionalInt,
  optionalNumber, optionalString, parsePagination, requireString, requireUuid,
} from "./validation";

export const API_VERSION = "0.2.0";

const PLANT_TYPES = ["indica", "sativa", "hybride", "indica-dominante", "sativa-dominante", "ruderalis", "hybride-ruderalis"] as const;
const VERIFICATION_STATUSES = ["vérifié", "non vérifié", "contesté"] as const;
const GROWTH_STAGES = ["germination", "végétatif", "floraison", "récolte", "séchage", "curing"] as const;
const SOURCE_PLATFORMS = ["growdiaries", "thcfarmer", "rollitup", "overgrow", "reddit", "manuel"] as const;

type AsyncHandler = (req: Request, res: Response) => Promise<void>;
const wrap = (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) =>
  fn(req, res).catch(next);

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapCultivarRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id ?? row.cultivar_id,
    name: row.name,
    canonical_name: row.canonical_name,
    breeder_id: row.breeder_id ?? null,
    breeder_name: row.breeder_name ?? null,
    breeder_verification_status: row.breeder_verification_status ?? "non vérifié",
    plant_type: row.plant_type ?? null,
    flowering_type: row.flowering_type ?? null,
    thc_min_percent: toNumber(row.thc_min_percent),
    thc_max_percent: toNumber(row.thc_max_percent),
    cbd_min_percent: toNumber(row.cbd_min_percent),
    cbd_max_percent: toNumber(row.cbd_max_percent),
    description_fr: row.description_fr ?? null,
    verification_status: row.verification_status ?? "non vérifié",
    commercial_score: toNumber(row.commercial_score ?? row.score),
    completeness: row.completeness ?? null,
    component_count: row.component_count !== undefined ? Number(row.component_count) : undefined,
  };
}

export interface AppOptions {
  pool?: PoolLike | null;
}

/** Fabrique l'application Express. Le pool injecté sert aux tests ; sinon DATABASE_URL. */
export function createApp(options: AppOptions = {}): express.Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  const poolOpt = options.pool;

  const db = (): PoolLike => requirePool(poolOpt === undefined ? null : poolOpt);

  // ------------------------------------------------------------------ santé
  app.get("/health", wrap(async (_req, res) => {
    let dbStatus = "unavailable";
    try {
      const p = options.pool ?? null;
      if (p) {
        await p.query("SELECT 1 AS ok");
        dbStatus = "ok";
      } else {
        // Pool partagé : on ne force pas de connexion si DATABASE_URL est absent.
        const { getPool } = await import("./db");
        dbStatus = getPool() ? "configured" : "unavailable";
      }
    } catch {
      dbStatus = "error";
    }
    res.json({ status: "ok", version: API_VERSION, db: dbStatus });
  }));

  // ------------------------------------------------------------------ auth
  app.post("/auth/token", wrap(async (req, res) => {
    const adminKey = process.env.AUTH_ADMIN_KEY;
    if (!adminKey || req.headers["x-admin-key"] !== adminKey) {
      res.status(401).json({ error: "Clé admin requise pour délivrer un jeton." });
      return;
    }
    const secret = getAuthSecret();
    if (!secret) {
      res.status(503).json({ error: "Authentification non configurée : définissez AUTH_SECRET." });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const userId = requireString(body, "user_id");
    if (!isUuid(userId)) throw new BadRequestError("Le champ « user_id » doit être un UUID valide.");
    const rolesRaw = body.roles;
    if (!Array.isArray(rolesRaw) || rolesRaw.length === 0) {
      throw new BadRequestError("Le champ « roles » doit être une liste non vide.");
    }
    const roles = rolesRaw as string[];
    if (roles.some((r) => !["admin", "editor", "grower", "reader"].includes(r))) {
      throw new BadRequestError("Rôle inconnu dans « roles ».");
    }
    const token = signToken(userId, roles as Role[], secret);
    res.json({ token, user_id: userId, roles });
  }));

  // --------------------------------------------------------------- cultivars
  app.get("/cultivars", wrap(async (req, res) => {
    const { page, perPage, offset } = parsePagination(req.query as Record<string, unknown>);
    const q = typeof req.query.q === "string" && req.query.q.trim() !== "" ? `%${req.query.q.trim()}%` : null;
    const sort = req.query.sort === "name_asc" ? "name_asc" : "score_desc";
    const order =
      sort === "name_asc"
        ? "ORDER BY name ASC"
        : "ORDER BY commercial_score DESC NULLS LAST, component_count DESC, name ASC";
    const where = q ? "WHERE name ILIKE $1 OR canonical_name ILIKE $1 OR EXISTS (SELECT 1 FROM cultivar_aliases ca WHERE ca.cultivar_id = v.cultivar_id AND ca.alias ILIKE $1)" : "";
    const params = q ? [q] : [];
    const countRows = await db().query(
      `SELECT COUNT(*)::int AS total FROM v_cultivar_scores v ${where}`,
      params,
    );
    const total = Number(countRows.rows[0]?.total ?? 0);
    const rows = await db().query(
      `SELECT * FROM v_cultivar_scores v ${where} ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, perPage, offset],
    );
    res.json({ data: rows.rows.map(mapCultivarRow), page, per_page: perPage, total });
  }));

  app.post("/cultivars", requireRole("editor", "admin"), wrap(async (req: AuthedRequest, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = requireString(body, "name");
    const canonicalName = requireString(body, "canonical_name");
    const breederId = body.breeder_id === undefined || body.breeder_id === null ? null : requireUuid(body.breeder_id, "breeder_id");
    const plantType = optionalEnum(body, "plant_type", PLANT_TYPES);
    const floweringType = optionalEnum(body, "flowering_type", ["photopériodique", "autofloraison", "non documenté"] as const);
    const thcMin = optionalNumber(body, "thc_min_percent", 0, 100);
    const thcMax = optionalNumber(body, "thc_max_percent", 0, 100);
    const cbdMin = optionalNumber(body, "cbd_min_percent", 0, 100);
    const cbdMax = optionalNumber(body, "cbd_max_percent", 0, 100);
    checkMinMax(thcMin, thcMax, "THC");
    checkMinMax(cbdMin, cbdMax, "CBD");
    const verificationStatus = optionalEnum(body, "verification_status", VERIFICATION_STATUSES) ?? "non vérifié";
    const breederStatus = optionalEnum(body, "breeder_verification_status", VERIFICATION_STATUSES) ?? "non vérifié";
    try {
      const rows = await db().query(
        `INSERT INTO cultivars (name, canonical_name, breeder_id, breeder_verification_status, plant_type, flowering_type, thc_min_percent, thc_max_percent, cbd_min_percent, cbd_max_percent, description_fr, verification_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [name, canonicalName, breederId, breederStatus, plantType, floweringType, thcMin, thcMax, cbdMin, cbdMax, optionalString(body, "description_fr"), verificationStatus],
      );
      res.status(201).json(mapCultivarRow(rows.rows[0] ?? {}));
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        res.status(409).json({ error: "Un cultivar avec ce nom canonique existe déjà." });
        return;
      }
      throw err;
    }
  }));

  app.get("/cultivars/:id", wrap(async (req, res) => {
    const id = requireUuid(req.params.id, "id");
    const rows = await db().query("SELECT * FROM cultivars WHERE id = $1", [id]);
    const cultivar = rows.rows[0];
    if (!cultivar) throw new NotFoundError("Cultivar introuvable.");
    const [terpenes, aromas, effects, cultivation, pedigree] = await Promise.all([
      db().query("SELECT t.name, t.name_fr, ct.rank, ct.concentration_percent, ct.source_type FROM cultivar_terpenes ct JOIN terpenes t ON t.id = ct.terpene_id WHERE ct.cultivar_id = $1 ORDER BY ct.rank NULLS LAST", [id]),
      db().query("SELECT a.label, a.label_fr, a.category, ca.votes FROM cultivar_aromas ca JOIN aromas a ON a.id = ca.aroma_id WHERE ca.cultivar_id = $1", [id]),
      db().query("SELECT e.label, e.label_fr, e.polarity, ce.votes FROM cultivar_effects ce JOIN effects e ON e.id = ce.effect_id WHERE ce.cultivar_id = $1", [id]),
      db().query("SELECT * FROM cultivation_profiles WHERE cultivar_id = $1 ORDER BY created_at DESC LIMIT 1", [id]),
      db().query("SELECT pl.parent_cultivar_id, pl.parent_role, pl.verification_status, c.name AS parent_name FROM pedigree_links pl JOIN cultivars c ON c.id = pl.parent_cultivar_id WHERE pl.child_cultivar_id = $1", [id]),
    ]);
    res.json({
      ...mapCultivarRow(cultivar),
      terpenes: terpenes.rows,
      aromas: aromas.rows,
      effects: effects.rows,
      cultivation: cultivation.rows[0] ?? null,
      pedigree: pedigree.rows,
    });
  }));

  app.patch("/cultivars/:id", requireRole("editor", "admin"), wrap(async (req, res) => {
    const id = requireUuid(req.params.id, "id");
    const body = (req.body ?? {}) as Record<string, unknown>;
    const allowed: Record<string, unknown> = {};
    if (body.name !== undefined) allowed.name = requireString(body, "name");
    if (body.canonical_name !== undefined) allowed.canonical_name = requireString(body, "canonical_name");
    if (body.breeder_id !== undefined) allowed.breeder_id = body.breeder_id === null ? null : requireUuid(body.breeder_id, "breeder_id");
    if (body.plant_type !== undefined) allowed.plant_type = optionalEnum(body, "plant_type", PLANT_TYPES);
    if (body.description_fr !== undefined) allowed.description_fr = optionalString(body, "description_fr");
    if (body.verification_status !== undefined) allowed.verification_status = optionalEnum(body, "verification_status", VERIFICATION_STATUSES);
    if (body.thc_min_percent !== undefined) allowed.thc_min_percent = optionalNumber(body, "thc_min_percent", 0, 100);
    if (body.thc_max_percent !== undefined) allowed.thc_max_percent = optionalNumber(body, "thc_max_percent", 0, 100);
    const keys = Object.keys(allowed);
    if (keys.length === 0) throw new BadRequestError("Aucun champ modifiable fourni.");
    if (allowed.thc_min_percent !== undefined || allowed.thc_max_percent !== undefined) {
      const current = await db().query("SELECT thc_min_percent, thc_max_percent FROM cultivars WHERE id = $1", [id]);
      if (!current.rows[0]) throw new NotFoundError("Cultivar introuvable.");
      checkMinMax(
        allowed.thc_min_percent !== undefined ? (allowed.thc_min_percent as number | null) : toNumber(current.rows[0].thc_min_percent),
        allowed.thc_max_percent !== undefined ? (allowed.thc_max_percent as number | null) : toNumber(current.rows[0].thc_max_percent),
        "THC",
      );
    }
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
    const rows = await db().query(
      `UPDATE cultivars SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...keys.map((k) => allowed[k])],
    );
    if (!rows.rows[0]) throw new NotFoundError("Cultivar introuvable.");
    res.json(mapCultivarRow(rows.rows[0]));
  }));

  app.delete("/cultivars/:id", requireRole("admin"), wrap(async (req, res) => {
    const id = requireUuid(req.params.id, "id");
    const result = await db().query("DELETE FROM cultivars WHERE id = $1", [id]);
    if ((result.rowCount ?? 0) === 0) throw new NotFoundError("Cultivar introuvable.");
    res.status(204).send();
  }));

  // ---------------------------------------------------------------- breeders
  app.get("/breeders", wrap(async (req, res) => {
    const { page, perPage, offset } = parsePagination(req.query as Record<string, unknown>);
    const countRows = await db().query("SELECT COUNT(*)::int AS total FROM breeders");
    const rows = await db().query("SELECT * FROM breeders ORDER BY name ASC LIMIT $1 OFFSET $2", [perPage, offset]);
    res.json({ data: rows.rows, page, per_page: perPage, total: Number(countRows.rows[0]?.total ?? 0) });
  }));

  app.post("/breeders", requireRole("editor", "admin"), wrap(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = requireString(body, "name");
    const canonicalName = requireString(body, "canonical_name");
    const countryCode = optionalString(body, "country_code");
    if (countryCode !== null && countryCode.length !== 2) throw new BadRequestError("Le code pays doit faire 2 caractères.");
    try {
      const rows = await db().query(
        "INSERT INTO breeders (name, canonical_name, country_code, website_url, verification_status) VALUES ($1,$2,$3,$4,'non vérifié') RETURNING *",
        [name, canonicalName, countryCode, optionalString(body, "website_url")],
      );
      res.status(201).json(rows.rows[0] ?? {});
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        res.status(409).json({ error: "Un breeder avec ce nom canonique existe déjà." });
        return;
      }
      throw err;
    }
  }));

  app.get("/breeders/:id", wrap(async (req, res) => {
    const id = requireUuid(req.params.id, "id");
    const rows = await db().query("SELECT * FROM breeders WHERE id = $1", [id]);
    if (!rows.rows[0]) throw new NotFoundError("Breeder introuvable.");
    res.json(rows.rows[0]);
  }));

  app.patch("/breeders/:id", requireRole("editor", "admin"), wrap(async (req, res) => {
    const id = requireUuid(req.params.id, "id");
    const body = (req.body ?? {}) as Record<string, unknown>;
    const allowed: Record<string, unknown> = {};
    if (body.name !== undefined) allowed.name = requireString(body, "name");
    if (body.canonical_name !== undefined) allowed.canonical_name = requireString(body, "canonical_name");
    if (body.country_code !== undefined) allowed.country_code = optionalString(body, "country_code");
    if (body.website_url !== undefined) allowed.website_url = optionalString(body, "website_url");
    // Le statut de vérification ne se change pas par un PATCH libre : il
    // reflète une vérification sourcée, pas une saisie. (Voir cahier ch. 8.)
    const keys = Object.keys(allowed);
    if (keys.length === 0) throw new BadRequestError("Aucun champ modifiable fourni.");
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
    const rows = await db().query(`UPDATE breeders SET ${setClause} WHERE id = $1 RETURNING *`, [id, ...keys.map((k) => allowed[k])]);
    if (!rows.rows[0]) throw new NotFoundError("Breeder introuvable.");
    res.json(rows.rows[0]);
  }));

  // ---------------------------------------------------------------- journaux
  app.get("/journals", wrap(async (req, res) => {
    const { page, perPage, offset } = parsePagination(req.query as Record<string, unknown>);
    const cultivarId = req.query.cultivar_id === undefined ? null : requireUuid(req.query.cultivar_id, "cultivar_id");
    const platform = req.query.source_platform === undefined ? null : optionalEnum({ source_platform: req.query.source_platform }, "source_platform", SOURCE_PLATFORMS);
    const rows = await db().query(
      `SELECT gj.* FROM grow_journals gj LEFT JOIN grow_cycles gc ON gc.id = gj.cycle_id
       WHERE ($1::uuid IS NULL OR gc.cultivar_id = $1) AND ($2::text IS NULL OR gj.source_platform = $2)
       ORDER BY gj.created_at DESC LIMIT $3 OFFSET $4`,
      [cultivarId, platform, perPage, offset],
    );
    res.json({ data: rows.rows, page, per_page: perPage });
  }));

  app.post("/journals", requireRole("editor", "admin"), wrap(async (req: AuthedRequest, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const cycleId = requireUuid(body.cycle_id, "cycle_id");
    const title = requireString(body, "title");
    const platform = optionalEnum(body, "source_platform", SOURCE_PLATFORMS);
    const userId = body.user_id === undefined ? userIdFromToken(req) : requireUuid(body.user_id, "user_id");
    if (!userId) throw new BadRequestError("Un identifiant utilisateur (jeton avec sub UUID, ou champ user_id) est requis.");
    const isPublic = typeof body.is_public === "boolean" ? body.is_public : false;
    const rows = await db().query(
      "INSERT INTO grow_journals (cycle_id, user_id, title, is_public, source_platform, source_url) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [cycleId, userId, title, isPublic, platform, optionalString(body, "source_url")],
    );
    res.status(201).json(rows.rows[0] ?? {});
  }));

  app.get("/journals/:id", wrap(async (req, res) => {
    const id = requireUuid(req.params.id, "id");
    const rows = await db().query("SELECT * FROM grow_journals WHERE id = $1", [id]);
    if (!rows.rows[0]) throw new NotFoundError("Journal introuvable.");
    const entries = await db().query("SELECT * FROM journal_entries WHERE journal_id = $1 ORDER BY entry_date ASC", [id]);
    res.json({ ...rows.rows[0], entries: entries.rows });
  }));

  app.post("/journals/:id/entries", requireRole("editor", "admin"), wrap(async (req, res) => {
    const id = requireUuid(req.params.id, "id");
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (!isValidDate(body.entry_date)) throw new BadRequestError("Le champ « entry_date » doit être une date YYYY-MM-DD valide.");
    const stage = optionalEnum(body, "growth_stage", GROWTH_STAGES);
    const week = optionalInt(body, "week_number", 0);
    const height = optionalNumber(body, "height_cm", 0);
    const journal = await db().query("SELECT id FROM grow_journals WHERE id = $1", [id]);
    if (!journal.rows[0]) throw new NotFoundError("Journal introuvable.");
    const rows = await db().query(
      "INSERT INTO journal_entries (journal_id, entry_date, growth_stage, week_number, height_cm, note_fr) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [id, body.entry_date, stage, week, height, optionalString(body, "note_fr")],
    );
    res.status(201).json(rows.rows[0] ?? {});
  }));

  // ---------------------------------------------------------------- recherche
  app.get("/search", wrap(async (req, res) => {
    const q = req.query.q;
    if (typeof q !== "string" || q.trim().length < 2) {
      throw new BadRequestError("Le paramètre « q » doit contenir au moins 2 caractères.");
    }
    const pattern = `%${q.trim()}%`;
    const cultivars = await db().query(
      "SELECT id, name, canonical_name, breeder_id, breeder_verification_status, thc_min_percent, thc_max_percent FROM cultivars WHERE name ILIKE $1 OR canonical_name ILIKE $1 OR EXISTS (SELECT 1 FROM cultivar_aliases ca WHERE ca.cultivar_id = cultivars.id AND ca.alias ILIKE $1) LIMIT 20",
      [pattern],
    );
    const breeders = await db().query(
      "SELECT id, name, canonical_name, verification_status FROM breeders WHERE name ILIKE $1 OR canonical_name ILIKE $1 LIMIT 20",
      [pattern],
    );
    res.json({ cultivars: cultivars.rows.map(mapCultivarRow), breeders: breeders.rows });
  }));

  // ------------------------------------------------------------------- scores
  async function getScore(id: string): Promise<Record<string, unknown> | null> {
    const rows = await db().query(
      "SELECT * FROM commercial_scores WHERE cultivar_id = $1 ORDER BY computed_at DESC LIMIT 1",
      [id],
    );
    const scoreRow = rows.rows[0];
    if (!scoreRow) return null;
    const components = await db().query(
      "SELECT component, raw_value, normalized_value, weight_percent FROM score_components WHERE score_id = $1",
      [scoreRow.id],
    );
    return {
      cultivar_id: id,
      score: toNumber(scoreRow.score),
      completeness: scoreRow.completeness,
      components: components.rows.map((c) => ({
        component: c.component,
        raw_value: toNumber(c.raw_value),
        normalized_value: toNumber(c.normalized_value),
        weight_percent: toNumber(c.weight_percent),
      })),
    };
  }

  app.get("/cultivars/:id/scores", wrap(async (req, res) => {
    const id = requireUuid(req.params.id, "id");
    const cultivar = await db().query("SELECT id FROM cultivars WHERE id = $1", [id]);
    if (!cultivar.rows[0]) throw new NotFoundError("Cultivar introuvable.");
    const existing = await getScore(id);
    res.json(existing ?? { cultivar_id: id, score: null, completeness: "nul", components: [] });
  }));

  app.post("/cultivars/:id/scores", requireRole("editor", "admin"), wrap(async (req, res) => {
    const id = requireUuid(req.params.id, "id");
    const cultivar = await db().query("SELECT id FROM cultivars WHERE id = $1", [id]);
    if (!cultivar.rows[0]) throw new NotFoundError("Cultivar introuvable.");
    const existing = await getScore(id);
    let components: ScoreComponentInput[] = [];
    if (existing && (existing.components as unknown[]).length > 0) {
      components = (existing.components as Record<string, unknown>[]).map((c) => ({
        component: String(c.component),
        normalized_value: toNumber(c.normalized_value),
      }));
    } else {
      const profileRows = await db().query(
        "SELECT vigor_score, mold_resistance_score, bag_appeal_score FROM cultivation_profiles WHERE cultivar_id = $1 ORDER BY created_at DESC LIMIT 1",
        [id],
      );
      components = componentsFromCultivationProfile(
        (profileRows.rows[0] as { vigor_score?: number | null; mold_resistance_score?: number | null; bag_appeal_score?: number | null } | undefined) ?? null,
      );
    }
    const computed = computeScoreFromComponents(components);
    const inserted = await db().query(
      "INSERT INTO commercial_scores (cultivar_id, score, completeness) VALUES ($1,$2,$3) RETURNING *",
      [id, computed.score, computed.completeness],
    );
    const scoreId = inserted.rows[0]?.id;
    if (scoreId) {
      await db().query("DELETE FROM score_components WHERE score_id = $1", [scoreId]);
      for (const c of components) {
        if (c.normalized_value === null) continue;
        await db().query(
          "INSERT INTO score_components (score_id, component, normalized_value, weight_percent) VALUES ($1,$2,$3,$4)",
          [scoreId, c.component, c.normalized_value, SCORE_WEIGHTS[c.component]],
        );
      }
    }
    await db().query(
      "INSERT INTO score_history (cultivar_id, score, formula_version) VALUES ($1,$2,'v2-35/20/15/10/10/10-renormalise')",
      [id, computed.score],
    );
    res.json({
      cultivar_id: id,
      score: computed.score,
      completeness: computed.completeness,
      components: components
        .filter((c) => c.normalized_value !== null)
        .map((c) => ({ component: c.component, normalized_value: c.normalized_value, weight_percent: SCORE_WEIGHTS[c.component] })),
    });
  }));

  // -------------------------------------------------------------------- alias
  app.get("/cultivars/:id/aliases", wrap(async (req, res) => {
    const id = requireUuid(req.params.id, "id");
    const cultivar = await db().query("SELECT id FROM cultivars WHERE id = $1", [id]);
    if (!cultivar.rows[0]) throw new NotFoundError("Cultivar introuvable.");
    const rows = await db().query("SELECT alias, alias_type FROM cultivar_aliases WHERE cultivar_id = $1 ORDER BY alias ASC", [id]);
    res.json({ data: rows.rows });
  }));

  app.post("/cultivars/:id/aliases", requireAuth, wrap(async (req: AuthedRequest, res) => {
    const id = requireUuid(req.params.id, "id");
    const body = (req.body ?? {}) as Record<string, unknown>;
    const proposedAlias = requireString(body, "proposed_alias");
    const cultivar = await db().query("SELECT id FROM cultivars WHERE id = $1", [id]);
    if (!cultivar.rows[0]) throw new NotFoundError("Cultivar introuvable.");
    const rows = await db().query(
      "INSERT INTO alias_proposals (proposed_alias, target_cultivar_id, proposed_by, status) VALUES ($1,$2,$3,'en attente') RETURNING *",
      [proposedAlias, id, req.user?.sub ?? "api"],
    );
    res.status(201).json(rows.rows[0] ?? {});
  }));

  app.patch("/alias-proposals/:id", requireRole("editor", "admin"), wrap(async (req: AuthedRequest, res) => {
    const id = requireUuid(req.params.id, "id");
    const body = (req.body ?? {}) as Record<string, unknown>;
    const status = optionalEnum(body, "status", ["acceptée", "rejetée"] as const);
    if (!status) throw new BadRequestError("Le champ « status » doit être « acceptée » ou « rejetée ».");
    const reviewedBy = userIdFromToken(req);
    const rows = await db().query(
      "UPDATE alias_proposals SET status = $2, reviewed_by = $3 WHERE id = $1 RETURNING *",
      [id, status, reviewedBy],
    );
    const proposal = rows.rows[0];
    if (!proposal) throw new NotFoundError("Proposition d'alias introuvable.");
    if (status === "acceptée" && proposal.target_cultivar_id) {
      await db().query(
        "INSERT INTO cultivar_aliases (cultivar_id, alias, alias_type) VALUES ($1,$2,'variante') ON CONFLICT DO NOTHING",
        [proposal.target_cultivar_id, proposal.proposed_alias],
      );
    }
    res.json(proposal);
  }));

  // ------------------------------------------------------------------ sources
  app.get("/sources", wrap(async (req, res) => {
    const { page, perPage, offset } = parsePagination(req.query as Record<string, unknown>);
    const rows = await db().query(
      "SELECT id, code, name, base_url, is_active, rate_limit_per_minute FROM scrape_sources ORDER BY name ASC LIMIT $1 OFFSET $2",
      [perPage, offset],
    );
    res.json({ data: rows.rows, page, per_page: perPage });
  }));

  app.get("/sources/:id/runs", wrap(async (req, res) => {
    const id = requireUuid(req.params.id, "id");
    const { page, perPage, offset } = parsePagination(req.query as Record<string, unknown>);
    const source = await db().query("SELECT id FROM scrape_sources WHERE id = $1", [id]);
    if (!source.rows[0]) throw new NotFoundError("Source introuvable.");
    const rows = await db().query(
      "SELECT * FROM scrape_runs WHERE source_id = $1 ORDER BY started_at DESC LIMIT $2 OFFSET $3",
      [id, perPage, offset],
    );
    res.json({ data: rows.rows, page, per_page: perPage });
  }));

  // ------------------------------------------------------------------ erreurs
  app.use((_req, res) => {
    res.status(404).json({ error: "Route introuvable." });
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof DbUnavailableError) {
      res.status(503).json({ error: err.message });
      return;
    }
    if (err instanceof BadRequestError || err instanceof NotFoundError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: "Corps JSON invalide." });
      return;
    }
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "Erreur interne de l'API." });
  });

  return app;
}
