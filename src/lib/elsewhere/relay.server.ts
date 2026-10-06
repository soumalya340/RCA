import { getSql, type Sql } from "@/lib/db";
import {
  ID_RE,
  asBool,
  asNumber,
  cleanText,
  normalizeTags,
  overlaps,
  splitTags,
  toIso,
} from "./format";
import type { CallMode, ChatMessage, LaneDTO, Person, Place, PollResult, ProfileInput, SeekResult } from "./types";

type WaiterRow = {
  id: string;
  interests: string;
  city: string;
  region: string;
  country: string;
  open_match: unknown;
  scope?: string;
  medium?: string;
};

type LaneRow = {
  id: string;
  a_id: string;
  b_id: string;
  a_city: string;
  a_region: string;
  a_country: string;
  a_interests: string;
  b_city: string;
  b_region: string;
  b_country: string;
  b_interests: string;
  a_voice: unknown;
  b_voice: unknown;
  a_video: unknown;
  b_video: unknown;
  medium?: string;
  partner_stale: unknown;
  lane_mature: unknown;
};

const STALE_SECONDS = 45;

function person(id: string, city: string, region: string, country: string, interests: string): Person {
  return { id, city, region, country, interests: splitTags(interests) };
}

function toLane(row: LaneRow, selfId: string): LaneDTO {
  const youAre = row.a_id === selfId ? "a" : "b";
  const self =
    youAre === "a"
      ? person(row.a_id, row.a_city, row.a_region, row.a_country, row.a_interests)
      : person(row.b_id, row.b_city, row.b_region, row.b_country, row.b_interests);
  const partner =
    youAre === "a"
      ? person(row.b_id, row.b_city, row.b_region, row.b_country, row.b_interests)
      : person(row.a_id, row.a_city, row.a_region, row.a_country, row.a_interests);
  return {
    id: row.id,
    youAre,
    self,
    partner,
    youVoice: youAre === "a" ? asBool(row.a_voice) : asBool(row.b_voice),
    partnerVoice: youAre === "a" ? asBool(row.b_voice) : asBool(row.a_voice),
    youVideo: youAre === "a" ? asBool(row.a_video) : asBool(row.b_video),
    partnerVideo: youAre === "a" ? asBool(row.b_video) : asBool(row.a_video),
    medium: row.medium === "voice" || row.medium === "video" ? row.medium : "text",
  };
}

async function prune(sql: Sql) {
  await sql.query(`delete from ew_waiters where heartbeat_at < now() - interval '40 seconds'`);
  await sql.query(
    `delete from ew_messages where lane_id in (
       select id from ew_lanes where closed_at is not null and closed_at < now() - interval '2 minutes'
     )`,
  );
  await sql.query(`delete from ew_messages where created_at < now() - interval '3 hours'`);
  await sql.query(
    `delete from ew_lanes where closed_at is not null and closed_at < now() - interval '2 minutes'`,
  );
}

async function peopleCount(sql: Sql): Promise<number> {
  const rows = await sql.query<{ waiting: number; lanes: number }>(
    `select
       (select count(*)::int from ew_waiters where heartbeat_at > now() - interval '40 seconds') as waiting,
       (select count(*)::int from ew_lanes where closed_at is null) as lanes`,
  );
  const row = rows[0];
  return asNumber(row?.waiting) + asNumber(row?.lanes) * 2;
}

async function findLane(sql: Sql, selfId: string): Promise<LaneDTO | null> {
  const rows = await sql.query<LaneRow>(
    `select id, a_id, b_id,
            a_city, a_region, a_country, a_interests,
            b_city, b_region, b_country, b_interests,
            a_voice, b_voice, a_video, b_video, medium,
            false as partner_stale,
            false as lane_mature
     from ew_lanes
     where closed_at is null and (a_id = $1 or b_id = $1)
     order by created_at desc
     limit 1`,
    [selfId],
  );
  const row = rows[0];
  return row ? toLane(row, selfId) : null;
}

function matchScore(
  self: Place & { interests: string; scope: string; medium: string; openMatch: boolean },
  cand: WaiterRow,
): number {
  const meOpen = self.openMatch || !self.interests;
  const themOpen = asBool(cand.open_match) || !cand.interests;
  const candScope = cand.scope || "worldwide";
  const myScope = self.scope || "worldwide";

  const myCity = (self.city || "").toLowerCase().trim();
  const candCity = (cand.city || "").toLowerCase().trim();
  const myRegion = (self.region || "").toLowerCase().trim();
  const candRegion = (cand.region || "").toLowerCase().trim();
  const myCountry = (self.country || "").toLowerCase().trim();
  const candCountry = (cand.country || "").toLowerCase().trim();

  const sameCity = Boolean(myCity && candCity && myCity === candCity);
  const sameRegion = Boolean(myRegion && candRegion && myRegion === candRegion);
  const sameCountry = Boolean(myCountry && candCountry && myCountry === candCountry);

  // Check strict location constraint requested by either side
  if (myScope === "city" && !sameCity) return -1;
  if (myScope === "region" && !sameRegion && !sameCity) return -1;
  if (myScope === "country" && !sameCountry && !sameRegion && !sameCity) return -1;

  if (candScope === "city" && !sameCity) return -1;
  if (candScope === "region" && !sameRegion && !sameCity) return -1;
  if (candScope === "country" && !sameCountry && !sameRegion && !sameCity) return -1;

  // Check interest compatibility if neither opted into open match
  const tagOverlap = overlaps(self.interests, cand.interests);
  if (!meOpen && !themOpen && !tagOverlap) {
    return -1;
  }

  // Weight and rank
  let score = 10;
  if (tagOverlap) score += 50;
  if (self.medium && cand.medium && self.medium === cand.medium) score += 40;
  if (sameCity) score += 60;
  else if (sameRegion) score += 35;
  else if (sameCountry) score += 15;

  return score;
}

function pairLaneId(a: string, b: string) {
  const [x, y] = [a, b].sort();
  let h1 = 2166136261;
  let h2 = 2166136261 ^ 0x9e3779b9;
  const key = `${x}:${y}`;
  for (let i = 0; i < key.length; i += 1) {
    h1 ^= key.charCodeAt(i);
    h1 = Math.imul(h1, 16777619);
    h2 ^= key.charCodeAt(i);
    h2 = Math.imul(h2, 2246822519);
  }
  return `ln${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
}

export async function seek(input: ProfileInput): Promise<SeekResult> {
  if (!ID_RE.test(input.selfId)) return { ok: false, error: "Invalid session." };
  const sql = await getSql();
  await prune(sql);

  const tags = normalizeTags(input.interests).join(",");
  const openMatch = input.openMatch || tags.length === 0;
  const scope = input.scope || "worldwide";
  const medium = input.medium || "text";
  const self: Place & { interests: string; scope: string; medium: string; openMatch: boolean } = {
    city: cleanText(input.city, 48),
    region: cleanText(input.region, 48),
    country: cleanText(input.country, 48),
    interests: tags,
    scope,
    medium,
    openMatch,
  };

  const already = await findLane(sql, input.selfId);
  if (already) {
    await sql.query(`delete from ew_waiters where id = $1`, [input.selfId]);
    return { ok: true, status: "matched", people: await peopleCount(sql), lane: already };
  }

  const candidates = await sql.query<WaiterRow>(
    `select id, interests, city, region, country, open_match, scope, medium
     from ew_waiters
     where id <> $1
       and claimed_by is null
       and heartbeat_at > now() - interval '40 seconds'
     order by heartbeat_at desc
     limit 40`,
    [input.selfId],
  );

  const scoredCandidates = candidates
    .map((candidate) => ({ candidate, score: matchScore(self, candidate) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score);

  let partner: WaiterRow | null = null;
  for (const { candidate } of scoredCandidates) {
    const claimed = await sql.query<WaiterRow>(
      `update ew_waiters
       set claimed_by = $1
       where id = $2 and claimed_by is null and heartbeat_at > now() - interval '40 seconds'
       returning id, interests, city, region, country, open_match, scope, medium`,
      [input.selfId, candidate.id],
    );
    if (claimed[0]) {
      partner = claimed[0];
      break;
    }
  }

  if (partner) {
    const [aId, bId] = [input.selfId, partner.id].sort();
    const aProfile = aId === input.selfId ? self : partner;
    const bProfile = bId === input.selfId ? self : partner;
    const laneId = pairLaneId(input.selfId, partner.id);
    const laneMedium = medium === "voice" || partner.medium === "voice" ? "voice" : medium;
    const autoVoice = laneMedium === "voice";
    await sql.query(
      `insert into ew_lanes (
         id, a_id, b_id,
         a_city, a_region, a_country, a_interests,
         b_city, b_region, b_country, b_interests,
         a_voice, b_voice, a_video, b_video, medium
       ) values (
         $1, $2, $3,
         $4, $5, $6, $7,
         $8, $9, $10, $11,
         $12, $12, false, false, $13
       )
       on conflict (id) do nothing`,
      [
        laneId,
        aId,
        bId,
        aProfile.city,
        aProfile.region,
        aProfile.country,
        aProfile.interests,
        bProfile.city,
        bProfile.region,
        bProfile.country,
        bProfile.interests,
        autoVoice,
        laneMedium,
      ],
    );
    await sql.query(`delete from ew_waiters where id = $1 or id = $2`, [input.selfId, partner.id]);
    const lane = await findLane(sql, input.selfId);
    if (!lane) return { ok: false, error: "The lane closed before it opened." };
    return { ok: true, status: "matched", people: await peopleCount(sql), lane };
  }

  const matchedMeanwhile = await findLane(sql, input.selfId);
  if (matchedMeanwhile) {
    await sql.query(`delete from ew_waiters where id = $1`, [input.selfId]);
    return { ok: true, status: "matched", people: await peopleCount(sql), lane: matchedMeanwhile };
  }

  await sql.query(
    `insert into ew_waiters (id, interests, city, region, country, open_match, scope, medium, claimed_by, heartbeat_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, null, now())
     on conflict (id) do update set
       interests = excluded.interests,
       city = excluded.city,
       region = excluded.region,
       country = excluded.country,
       open_match = excluded.open_match,
       scope = excluded.scope,
       medium = excluded.medium,
       heartbeat_at = now(),
       claimed_by = case
         when ew_waiters.claimed_by is not null and ew_waiters.claimed_by <> excluded.id
           then ew_waiters.claimed_by
         else null
       end`,
    [input.selfId, tags, self.city, self.region, self.country, openMatch, scope, medium],
  );

  const afterUpsert = await findLane(sql, input.selfId);
  if (afterUpsert) {
    await sql.query(`delete from ew_waiters where id = $1`, [input.selfId]);
    return { ok: true, status: "matched", people: await peopleCount(sql), lane: afterUpsert };
  }

  return { ok: true, status: "waiting", people: await peopleCount(sql) };
}

export async function leaveQueue(selfId: string) {
  if (!ID_RE.test(selfId)) return;
  const sql = await getSql();
  await sql.query(`delete from ew_waiters where id = $1`, [selfId]);
}

async function closeLane(sql: Sql, laneId: string, selfId: string) {
  const closed = await sql.query<{ id: string }>(
    `update ew_lanes
     set closed_at = now()
     where id = $1 and closed_at is null and (a_id = $2 or b_id = $2)
     returning id`,
    [laneId, selfId],
  );
  if (closed.length > 0) {
    typingRegistry.delete(laneId);
    await sql.query(`delete from ew_messages where lane_id = $1`, [laneId]);
  }
}

export async function endLane(selfId: string, laneId: string) {
  if (!ID_RE.test(selfId) || !ID_RE.test(laneId)) return { ok: false as const, error: "Invalid lane." };
  const sql = await getSql();
  await closeLane(sql, laneId, selfId);
  await sql.query(`delete from ew_waiters where id = $1`, [selfId]);
  return { ok: true as const };
}

export async function dropAway(selfId: string) {
  await leaveQueue(selfId);
}

type PollRow = LaneRow;

const typingRegistry = new Map<string, Map<string, number>>();

export function setTyping(selfId: string, laneId: string, typing: boolean) {
  if (!ID_RE.test(selfId) || !ID_RE.test(laneId)) return;
  let map = typingRegistry.get(laneId);
  if (!map) {
    map = new Map<string, number>();
    typingRegistry.set(laneId, map);
  }
  if (typing) {
    map.set(selfId, Date.now());
  } else {
    map.delete(selfId);
  }
}

export function isPartnerTyping(selfId: string, laneId: string, partnerId: string): boolean {
  const map = typingRegistry.get(laneId);
  if (!map) return false;
  const lastTime = map.get(partnerId);
  if (!lastTime) return false;
  if (Date.now() - lastTime > 3500) {
    map.delete(partnerId);
    return false;
  }
  return true;
}

export async function setTypingStatus(selfId: string, laneId: string, typing: boolean) {
  setTyping(selfId, laneId, typing);
  return { ok: true as const };
}

export async function pollLane(
  selfId: string,
  laneId: string,
  since: number,
  typing?: boolean,
): Promise<PollResult> {
  if (!ID_RE.test(selfId) || !ID_RE.test(laneId)) return { ok: false, error: "Invalid lane." };
  if (typeof typing === "boolean") {
    setTyping(selfId, laneId, typing);
  }
  const sql = await getSql();
  if (Math.random() < 0.05) await prune(sql);

  const rows = await sql.query<PollRow>(
    `update ew_lanes
     set a_seen = case when a_id = $2 then now() else a_seen end,
         b_seen = case when b_id = $2 then now() else b_seen end
     where id = $1 and closed_at is null and (a_id = $2 or b_id = $2)
     returning id, a_id, b_id,
       a_city, a_region, a_country, a_interests,
       b_city, b_region, b_country, b_interests,
       a_voice, b_voice, a_video, b_video, medium,
       (case when a_id = $2 then b_seen else a_seen end) < now() - make_interval(secs => $3) as partner_stale,
       created_at < now() - make_interval(secs => $3) as lane_mature`,
    [laneId, selfId, STALE_SECONDS],
  );

  const row = rows[0];
  if (!row) {
    const messages = await readMessages(sql, laneId, selfId, since);
    return { ok: true, status: "missing", messages };
  }

  if (asBool(row.partner_stale) && asBool(row.lane_mature)) {
    const messages = await readMessages(sql, laneId, selfId, since);
    await closeLane(sql, laneId, selfId);
    return { ok: true, status: "ended", messages };
  }

  const partnerId = row.a_id === selfId ? row.b_id : row.a_id;
  const partnerTyping = isPartnerTyping(selfId, laneId, partnerId);
  const messages = await readMessages(sql, laneId, selfId, since);
  return { ok: true, status: "live", lane: toLane(row, selfId), messages, partnerTyping };
}

async function readMessages(sql: Sql, laneId: string, selfId: string, since: number): Promise<ChatMessage[]> {
  const rows = await sql.query<{ id: number; sender_id: string; body: string; created_at: unknown }>(
    `select id, sender_id, body, created_at from (
       select id, sender_id, body, created_at
       from ew_messages
       where lane_id = $1 and id > $2
       order by id desc
       limit 80
     ) recent
     order by id asc`,
    [laneId, since],
  );
  return rows.map((row) => ({
    id: asNumber(row.id),
    fromSelf: row.sender_id === selfId,
    body: row.body,
    at: toIso(row.created_at),
  }));
}

export async function sendMessage(selfId: string, laneId: string, body: string) {
  if (!ID_RE.test(selfId) || !ID_RE.test(laneId)) return { ok: false as const, error: "Invalid lane." };
  const text = cleanText(body, 500);
  if (!text) return { ok: false as const, error: "Write something first." };
  const sql = await getSql();
  const member = await sql.query<{ id: string }>(
    `select id from ew_lanes
     where id = $1 and closed_at is null and (a_id = $2 or b_id = $2)`,
    [laneId, selfId],
  );
  if (!member[0]) return { ok: false as const, error: "This lane has ended." };
  const inserted = await sql.query<{ id: number; created_at: unknown }>(
    `insert into ew_messages (lane_id, sender_id, body) values ($1, $2, $3) returning id, created_at`,
    [laneId, selfId, text],
  );
  const row = inserted[0];
  setTyping(selfId, laneId, false);
  return {
    ok: true as const,
    message: {
      id: asNumber(row?.id),
      fromSelf: true,
      body: text,
      at: toIso(row?.created_at),
    } satisfies ChatMessage,
  };
}

export async function setCall(selfId: string, laneId: string, mode: CallMode) {
  if (!ID_RE.test(selfId) || !ID_RE.test(laneId)) return { ok: false as const, error: "Invalid lane." };
  const voice = mode !== "off";
  const video = mode === "video";
  const sql = await getSql();
  const rows = await sql.query<{
    a_id: string;
    a_voice: unknown;
    b_voice: unknown;
    a_video: unknown;
    b_video: unknown;
  }>(
    `update ew_lanes
     set a_voice = case when a_id = $2 then $3 else a_voice end,
         b_voice = case when b_id = $2 then $3 else b_voice end,
         a_video = case when a_id = $2 then $4 else a_video end,
         b_video = case when b_id = $2 then $4 else b_video end,
         a_seen = case when a_id = $2 then now() else a_seen end,
         b_seen = case when b_id = $2 then now() else b_seen end
     where id = $1 and closed_at is null and (a_id = $2 or b_id = $2)
     returning a_id, a_voice, b_voice, a_video, b_video`,
    [laneId, selfId, voice, video],
  );
  const row = rows[0];
  if (!row) return { ok: false as const, error: "This lane has ended." };
  const youAreA = row.a_id === selfId;
  return {
    ok: true as const,
    youVoice: youAreA ? asBool(row.a_voice) : asBool(row.b_voice),
    partnerVoice: youAreA ? asBool(row.b_voice) : asBool(row.a_voice),
    youVideo: youAreA ? asBool(row.a_video) : asBool(row.b_video),
    partnerVideo: youAreA ? asBool(row.b_video) : asBool(row.a_video),
  };
}

export async function stats() {
  const sql = await getSql();
  await prune(sql);
  return { people: await peopleCount(sql) };
}
