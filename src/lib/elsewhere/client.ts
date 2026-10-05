import { locateFromRequest } from "./place.functions";
import type { Place } from "./types";

const SELF_KEY = "elsewhere-self";
const RSVP_KEY = "elsewhere-rsvp";
const HOST_KEY = "elsewhere-hosts";
const LANE_KEY = "elsewhere-lane";

function mint(prefix: string) {
  const bytes = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  return `${prefix}${bytes}`;
}

export function loadSelfId() {
  const existing = localStorage.getItem(SELF_KEY);
  if (existing && /^u[a-f0-9]{16}$/.test(existing)) return existing;
  const id = mint("u");
  localStorage.setItem(SELF_KEY, id);
  return id;
}

export function loadRsvpToken() {
  const existing = localStorage.getItem(RSVP_KEY);
  if (existing && /^r[a-f0-9]{16}$/.test(existing)) return existing;
  const id = mint("r");
  localStorage.setItem(RSVP_KEY, id);
  return id;
}

export function loadHostTokens(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(HOST_KEY) || "{}") as Record<string, string>;
    return Object.values(parsed).filter((token) => typeof token === "string");
  } catch {
    return [];
  }
}

export function rememberHost(eventId: string, hostToken: string) {
  let parsed: Record<string, string> = {};
  try {
    parsed = JSON.parse(localStorage.getItem(HOST_KEY) || "{}") as Record<string, string>;
  } catch {
    parsed = {};
  }
  parsed[eventId] = hostToken;
  localStorage.setItem(HOST_KEY, JSON.stringify(parsed));
}

export function hostTokenFor(eventId: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(HOST_KEY) || "{}") as Record<string, string>;
    const token = parsed[eventId];
    return typeof token === "string" ? token : null;
  } catch {
    return null;
  }
}

export function forgetHost(eventId: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(HOST_KEY) || "{}") as Record<string, string>;
    delete parsed[eventId];
    localStorage.setItem(HOST_KEY, JSON.stringify(parsed));
  } catch {
    localStorage.removeItem(HOST_KEY);
  }
}

export function loadSavedLane() {
  return sessionStorage.getItem(LANE_KEY);
}

export function saveLane(id: string | null) {
  if (id) sessionStorage.setItem(LANE_KEY, id);
  else sessionStorage.removeItem(LANE_KEY);
}

const empty: Place = { city: "", region: "", country: "" };

async function fromGeo(): Promise<Place> {
  const res = await fetch("https://get.geojs.io/v1/ip/geo.json", { signal: AbortSignal.timeout(4500) });
  if (!res.ok) return empty;
  const data = (await res.json()) as { city?: string; region?: string; country?: string };
  return {
    city: String(data.city || "").slice(0, 48),
    region: String(data.region || "").slice(0, 48),
    country: String(data.country || "").slice(0, 48),
  };
}

export async function detectPlace(): Promise<Place> {
  const [server, geo] = await Promise.all([
    locateFromRequest().catch(() => empty),
    fromGeo().catch(() => empty),
  ]);
  if (server.city || server.country) return server;
  if (geo.city || geo.country) return geo;
  return empty;
}
