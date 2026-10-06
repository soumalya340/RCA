import type { Place } from "./types";

export const ID_RE = /^[a-zA-Z0-9_-]{8,40}$/;

export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export function normalizeTags(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  for (const item of list) {
    const tag = cleanText(item, 24);
    if (!tag) continue;
    if (!/^[\p{L}\p{N} .'&-]+$/u.test(tag)) continue;
    if (out.some((existing) => existing.toLowerCase() === tag.toLowerCase())) continue;
    out.push(tag);
    if (out.length >= 8) break;
  }
  return out;
}

export function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function formatPlace(place: Place): string {
  const parts = [place.city, place.region, place.country].map((part) => part.trim()).filter(Boolean);
  const unique: string[] = [];
  for (const part of parts) {
    if (unique.some((item) => item.toLowerCase() === part.toLowerCase())) continue;
    unique.push(part);
  }
  return unique.join(" · ") || "Unknown place";
}

export function overlaps(a: string, b: string): boolean {
  const left = new Set(
    a
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
  );
  if (left.size === 0) return false;
  return b.split(",").some((tag) => left.has(tag.trim().toLowerCase()));
}

export function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

export function asBool(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

export function asNumber(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}
