/** Validation des entrées : erreurs propres, jamais de valeur inventée en compensation. */

export class BadRequestError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}
export class NotFoundError extends Error {
  status = 404;
  constructor(message = "Ressource introuvable.") {
    super(message);
    this.name = "NotFoundError";
  }
}

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function requireUuid(value: unknown, field: string): string {
  if (!isUuid(value)) throw new BadRequestError(`Le champ « ${field} » doit être un UUID valide.`);
  return value;
}

export function parsePagination(query: Record<string, unknown>): { page: number; perPage: number; offset: number } {
  const pageRaw = query.page === undefined ? 1 : Number(query.page);
  const perPageRaw = query.per_page === undefined ? 20 : Number(query.per_page);
  if (!Number.isInteger(pageRaw) || pageRaw < 1) throw new BadRequestError("Le paramètre « page » doit être un entier >= 1.");
  if (!Number.isInteger(perPageRaw) || perPageRaw < 1 || perPageRaw > 100) {
    throw new BadRequestError("Le paramètre « per_page » doit être un entier entre 1 et 100.");
  }
  return { page: pageRaw, perPage: perPageRaw, offset: (pageRaw - 1) * perPageRaw };
}

export function requireString(body: Record<string, unknown>, field: string, maxLength = 500): string {
  const value = body[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new BadRequestError(`Le champ « ${field} » est requis et doit être une chaîne non vide.`);
  }
  if (value.length > maxLength) throw new BadRequestError(`Le champ « ${field} » dépasse ${maxLength} caractères.`);
  return value.trim();
}

export function optionalString(body: Record<string, unknown>, field: string): string | null {
  const value = body[field];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new BadRequestError(`Le champ « ${field} » doit être une chaîne.`);
  return value.trim() === "" ? null : value.trim();
}

export function optionalEnum<T extends string>(body: Record<string, unknown>, field: string, allowed: readonly T[]): T | null {
  const value = body[field];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    throw new BadRequestError(`Le champ « ${field} » doit être parmi : ${allowed.join(", ")}.`);
  }
  return value as T;
}

export function optionalNumber(body: Record<string, unknown>, field: string, min?: number, max?: number): number | null {
  const value = body[field];
  if (value === undefined || value === null) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) throw new BadRequestError(`Le champ « ${field} » doit être un nombre.`);
  if (min !== undefined && num < min) throw new BadRequestError(`Le champ « ${field} » doit être >= ${min}.`);
  if (max !== undefined && num > max) throw new BadRequestError(`Le champ « ${field} » doit être <= ${max}.`);
  return num;
}

export function optionalInt(body: Record<string, unknown>, field: string, min?: number): number | null {
  const value = body[field];
  if (value === undefined || value === null) return null;
  const num = Number(value);
  if (!Number.isInteger(num)) throw new BadRequestError(`Le champ « ${field} » doit être un entier.`);
  if (min !== undefined && num < min) throw new BadRequestError(`Le champ « ${field} » doit être >= ${min}.`);
  return num;
}

/** Valide un couple min/max (ex. THC) : null = non documenté, jamais estimé. */
export function checkMinMax(min: number | null, max: number | null, label: string): void {
  if (min !== null && max !== null && min > max) {
    throw new BadRequestError(`Le minimum ${label} ne peut pas dépasser le maximum.`);
  }
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
