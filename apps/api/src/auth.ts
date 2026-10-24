import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";

/**
 * Auth simple et documentée (lot 2).
 * - Jeton signé HMAC-SHA256 avec AUTH_SECRET (variable d'environnement, jamais en dur).
 * - Format : base64url(JSON {sub, roles, exp}).base64url(signature).
 * - Rôles : admin, editor, grower, reader (mêmes codes que la table roles).
 *   admin passe toutes les vérifications de rôle ; editor écrit, reader lit.
 * - Délivrance : POST /auth/token protégé par AUTH_ADMIN_KEY (voir app.ts).
 *   Aucun mot de passe n'est stocké ni vérifié ici : les comptes réels
 *   (table users, password_hash) relèvent d'une authentification complète
 *   ultérieure, pas de ce module.
 * - Sans AUTH_SECRET, les routes d'écriture répondent 503 (jamais de contournement).
 */

export const ROLES = ["admin", "editor", "grower", "reader"] as const;
export type Role = (typeof ROLES)[number];

export interface TokenPayload {
  sub: string;
  roles: Role[];
  exp: number;
}

function b64urlEncode(data: Buffer | string): string {
  return Buffer.from(data).toString("base64url");
}
function b64urlDecode(data: string): Buffer {
  return Buffer.from(data, "base64url");
}

export function getAuthSecret(): string | undefined {
  return process.env.AUTH_SECRET || undefined;
}

export function signToken(sub: string, roles: Role[], secret: string, ttlSeconds = 24 * 3600): string {
  const payload: TokenPayload = { sub, roles, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest();
  return `${payloadB64}.${b64urlEncode(sig)}`;
}

export function verifyToken(token: string, secret: string): TokenPayload {
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("format de jeton invalide");
  const [payloadB64, sigB64] = parts;
  const expected = crypto.createHmac("sha256", secret).update(payloadB64).digest();
  const actual = b64urlDecode(sigB64);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    throw new Error("signature de jeton invalide");
  }
  const payload = JSON.parse(b64urlDecode(payloadB64).toString("utf8")) as TokenPayload;
  if (!payload.sub || !Array.isArray(payload.roles)) throw new Error("jeton incomplet");
  if (payload.exp * 1000 < Date.now()) throw new Error("jeton expiré");
  return payload;
}

export interface AuthedRequest extends Request {
  user?: TokenPayload;
}

function parseBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

/** Exige un jeton valide, quel que soit le rôle (propositions d'alias, etc.). */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const secret = getAuthSecret();
  if (!secret) {
    res.status(503).json({ error: "Authentification non configurée : définissez AUTH_SECRET." });
    return;
  }
  const token = parseBearer(req);
  if (!token) {
    res.status(401).json({ error: "Jeton Bearer requis." });
    return;
  }
  try {
    req.user = verifyToken(token, secret);
    next();
  } catch {
    res.status(401).json({ error: "Jeton invalide ou expiré." });
    return;
  }
}

/** Exige un jeton valide + au moins un des rôles demandés (admin passe partout). */
export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    requireAuth(req, res, () => {
      const userRoles = req.user?.roles ?? [];
      if (userRoles.includes("admin") || roles.some((r) => userRoles.includes(r))) {
        next();
      } else {
        res.status(403).json({ error: "Rôle insuffisant pour cette opération." });
      }
    });
  };
}

/** Utilitaire pour les routes : id utilisateur UUID depuis le jeton, sinon null. */
export function userIdFromToken(req: AuthedRequest): string | null {
  const sub = req.user?.sub;
  if (!sub) return null;
  return /^[0-9a-fA-F-]{36}$/.test(sub) ? sub : null;
}
