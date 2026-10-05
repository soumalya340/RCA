import { t as __exportAll } from "./rolldown-runtime-D7D4PA-g.mjs";
import { c as splitTags, i as cleanText, l as toIso, n as asBool, o as normalizeTags, r as asNumber, s as overlaps, t as ID_RE } from "./format-DyUhT5ai.mjs";
import { t as getSql } from "./db-BbnimI5K.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/relay.server-ru9BiPos.js
var relay_server_exports = /* @__PURE__ */ __exportAll({
	dropAway: () => dropAway,
	endLane: () => endLane,
	leaveQueue: () => leaveQueue,
	pollLane: () => pollLane,
	seek: () => seek,
	sendMessage: () => sendMessage,
	setCall: () => setCall,
	stats: () => stats
});
var STALE_SECONDS = 45;
function person(id, city, region, country, interests) {
	return {
		id,
		city,
		region,
		country,
		interests: splitTags(interests)
	};
}
function toLane(row, selfId) {
	const youAre = row.a_id === selfId ? "a" : "b";
	const self = youAre === "a" ? person(row.a_id, row.a_city, row.a_region, row.a_country, row.a_interests) : person(row.b_id, row.b_city, row.b_region, row.b_country, row.b_interests);
	const partner = youAre === "a" ? person(row.b_id, row.b_city, row.b_region, row.b_country, row.b_interests) : person(row.a_id, row.a_city, row.a_region, row.a_country, row.a_interests);
	return {
		id: row.id,
		youAre,
		self,
		partner,
		youVoice: youAre === "a" ? asBool(row.a_voice) : asBool(row.b_voice),
		partnerVoice: youAre === "a" ? asBool(row.b_voice) : asBool(row.a_voice),
		youVideo: youAre === "a" ? asBool(row.a_video) : asBool(row.b_video),
		partnerVideo: youAre === "a" ? asBool(row.b_video) : asBool(row.a_video)
	};
}
async function prune(sql) {
	await sql.query(`delete from ew_waiters where heartbeat_at < now() - interval '40 seconds'`);
	await sql.query(`delete from ew_messages where lane_id in (
       select id from ew_lanes where closed_at is not null and closed_at < now() - interval '2 minutes'
     )`);
	await sql.query(`delete from ew_messages where created_at < now() - interval '3 hours'`);
	await sql.query(`delete from ew_lanes where closed_at is not null and closed_at < now() - interval '2 minutes'`);
}
async function peopleCount(sql) {
	const row = (await sql.query(`select
       (select count(*)::int from ew_waiters where heartbeat_at > now() - interval '40 seconds') as waiting,
       (select count(*)::int from ew_lanes where closed_at is null) as lanes`))[0];
	return asNumber(row?.waiting) + asNumber(row?.lanes) * 2;
}
async function findLane(sql, selfId) {
	const row = (await sql.query(`select id, a_id, b_id,
            a_city, a_region, a_country, a_interests,
            b_city, b_region, b_country, b_interests,
            a_voice, b_voice, a_video, b_video,
            false as partner_stale,
            false as lane_mature
     from ew_lanes
     where closed_at is null and (a_id = $1 or b_id = $1)
     order by created_at desc
     limit 1`, [selfId]))[0];
	return row ? toLane(row, selfId) : null;
}
function compatible(meOpen, meTags, themOpen, themTags) {
	if (meOpen || themOpen || !meTags || !themTags) return true;
	return overlaps(meTags, themTags);
}
function pairLaneId(a, b) {
	const [x, y] = [a, b].sort();
	let h1 = 2166136261;
	let h2 = 522970236;
	const key = `${x}:${y}`;
	for (let i = 0; i < key.length; i += 1) {
		h1 ^= key.charCodeAt(i);
		h1 = Math.imul(h1, 16777619);
		h2 ^= key.charCodeAt(i);
		h2 = Math.imul(h2, 2246822519);
	}
	return `ln${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
}
async function seek(input) {
	if (!ID_RE.test(input.selfId)) return {
		ok: false,
		error: "Invalid session."
	};
	const sql = await getSql();
	await prune(sql);
	const tags = normalizeTags(input.interests).join(",");
	const openMatch = input.openMatch || tags.length === 0;
	const self = {
		city: cleanText(input.city, 48),
		region: cleanText(input.region, 48),
		country: cleanText(input.country, 48),
		interests: tags
	};
	const already = await findLane(sql, input.selfId);
	if (already) {
		await sql.query(`delete from ew_waiters where id = $1`, [input.selfId]);
		return {
			ok: true,
			status: "matched",
			people: await peopleCount(sql),
			lane: already
		};
	}
	const ranked = (await sql.query(`select id, interests, city, region, country, open_match
     from ew_waiters
     where id <> $1
       and claimed_by is null
       and heartbeat_at > now() - interval '40 seconds'
     order by heartbeat_at desc
     limit 25`, [input.selfId])).filter((row) => compatible(openMatch, tags, asBool(row.open_match), row.interests)).sort((a, b) => Number(overlaps(tags, b.interests)) - Number(overlaps(tags, a.interests)));
	let partner = null;
	for (const candidate of ranked) {
		const claimed = await sql.query(`update ew_waiters
       set claimed_by = $1
       where id = $2 and claimed_by is null and heartbeat_at > now() - interval '40 seconds'
       returning id, interests, city, region, country, open_match`, [input.selfId, candidate.id]);
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
		await sql.query(`insert into ew_lanes (
         id, a_id, b_id,
         a_city, a_region, a_country, a_interests,
         b_city, b_region, b_country, b_interests
       ) values (
         $1, $2, $3,
         $4, $5, $6, $7,
         $8, $9, $10, $11
       )
       on conflict (id) do nothing`, [
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
			bProfile.interests
		]);
		await sql.query(`delete from ew_waiters where id = $1 or id = $2`, [input.selfId, partner.id]);
		const lane = await findLane(sql, input.selfId);
		if (!lane) return {
			ok: false,
			error: "The lane closed before it opened."
		};
		return {
			ok: true,
			status: "matched",
			people: await peopleCount(sql),
			lane
		};
	}
	const matchedMeanwhile = await findLane(sql, input.selfId);
	if (matchedMeanwhile) {
		await sql.query(`delete from ew_waiters where id = $1`, [input.selfId]);
		return {
			ok: true,
			status: "matched",
			people: await peopleCount(sql),
			lane: matchedMeanwhile
		};
	}
	await sql.query(`insert into ew_waiters (id, interests, city, region, country, open_match, claimed_by, heartbeat_at)
     values ($1, $2, $3, $4, $5, $6, null, now())
     on conflict (id) do update set
       interests = excluded.interests,
       city = excluded.city,
       region = excluded.region,
       country = excluded.country,
       open_match = excluded.open_match,
       heartbeat_at = now(),
       claimed_by = case
         when ew_waiters.claimed_by is not null and ew_waiters.claimed_by <> excluded.id
           then ew_waiters.claimed_by
         else null
       end`, [
		input.selfId,
		tags,
		self.city,
		self.region,
		self.country,
		openMatch
	]);
	const afterUpsert = await findLane(sql, input.selfId);
	if (afterUpsert) {
		await sql.query(`delete from ew_waiters where id = $1`, [input.selfId]);
		return {
			ok: true,
			status: "matched",
			people: await peopleCount(sql),
			lane: afterUpsert
		};
	}
	return {
		ok: true,
		status: "waiting",
		people: await peopleCount(sql)
	};
}
async function leaveQueue(selfId) {
	if (!ID_RE.test(selfId)) return;
	await (await getSql()).query(`delete from ew_waiters where id = $1`, [selfId]);
}
async function closeLane(sql, laneId, selfId) {
	if ((await sql.query(`update ew_lanes
     set closed_at = now()
     where id = $1 and closed_at is null and (a_id = $2 or b_id = $2)
     returning id`, [laneId, selfId])).length > 0) await sql.query(`delete from ew_messages where lane_id = $1`, [laneId]);
}
async function endLane(selfId, laneId) {
	if (!ID_RE.test(selfId) || !ID_RE.test(laneId)) return {
		ok: false,
		error: "Invalid lane."
	};
	const sql = await getSql();
	await closeLane(sql, laneId, selfId);
	await sql.query(`delete from ew_waiters where id = $1`, [selfId]);
	return { ok: true };
}
async function dropAway(selfId) {
	await leaveQueue(selfId);
}
async function pollLane(selfId, laneId, since) {
	if (!ID_RE.test(selfId) || !ID_RE.test(laneId)) return {
		ok: false,
		error: "Invalid lane."
	};
	const sql = await getSql();
	if (Math.random() < .05) await prune(sql);
	const row = (await sql.query(`update ew_lanes
     set a_seen = case when a_id = $2 then now() else a_seen end,
         b_seen = case when b_id = $2 then now() else b_seen end
     where id = $1 and closed_at is null and (a_id = $2 or b_id = $2)
     returning id, a_id, b_id,
       a_city, a_region, a_country, a_interests,
       b_city, b_region, b_country, b_interests,
       a_voice, b_voice, a_video, b_video,
       (case when a_id = $2 then b_seen else a_seen end) < now() - make_interval(secs => $3) as partner_stale,
       created_at < now() - make_interval(secs => $3) as lane_mature`, [
		laneId,
		selfId,
		STALE_SECONDS
	]))[0];
	if (!row) return {
		ok: true,
		status: "missing",
		messages: await readMessages(sql, laneId, selfId, since)
	};
	if (asBool(row.partner_stale) && asBool(row.lane_mature)) {
		const messages = await readMessages(sql, laneId, selfId, since);
		await closeLane(sql, laneId, selfId);
		return {
			ok: true,
			status: "ended",
			messages
		};
	}
	const messages = await readMessages(sql, laneId, selfId, since);
	return {
		ok: true,
		status: "live",
		lane: toLane(row, selfId),
		messages
	};
}
async function readMessages(sql, laneId, selfId, since) {
	return (await sql.query(`select id, sender_id, body, created_at from (
       select id, sender_id, body, created_at
       from ew_messages
       where lane_id = $1 and id > $2
       order by id desc
       limit 80
     ) recent
     order by id asc`, [laneId, since])).map((row) => ({
		id: asNumber(row.id),
		fromSelf: row.sender_id === selfId,
		body: row.body,
		at: toIso(row.created_at)
	}));
}
async function sendMessage(selfId, laneId, body) {
	if (!ID_RE.test(selfId) || !ID_RE.test(laneId)) return {
		ok: false,
		error: "Invalid lane."
	};
	const text = cleanText(body, 500);
	if (!text) return {
		ok: false,
		error: "Write something first."
	};
	const sql = await getSql();
	if (!(await sql.query(`select id from ew_lanes
     where id = $1 and closed_at is null and (a_id = $2 or b_id = $2)`, [laneId, selfId]))[0]) return {
		ok: false,
		error: "This lane has ended."
	};
	const row = (await sql.query(`insert into ew_messages (lane_id, sender_id, body) values ($1, $2, $3) returning id, created_at`, [
		laneId,
		selfId,
		text
	]))[0];
	return {
		ok: true,
		message: {
			id: asNumber(row?.id),
			fromSelf: true,
			body: text,
			at: toIso(row?.created_at)
		}
	};
}
async function setCall(selfId, laneId, mode) {
	if (!ID_RE.test(selfId) || !ID_RE.test(laneId)) return {
		ok: false,
		error: "Invalid lane."
	};
	const voice = mode !== "off";
	const video = mode === "video";
	const row = (await (await getSql()).query(`update ew_lanes
     set a_voice = case when a_id = $2 then $3 else a_voice end,
         b_voice = case when b_id = $2 then $3 else b_voice end,
         a_video = case when a_id = $2 then $4 else a_video end,
         b_video = case when b_id = $2 then $4 else b_video end,
         a_seen = case when a_id = $2 then now() else a_seen end,
         b_seen = case when b_id = $2 then now() else b_seen end
     where id = $1 and closed_at is null and (a_id = $2 or b_id = $2)
     returning a_id, a_voice, b_voice, a_video, b_video`, [
		laneId,
		selfId,
		voice,
		video
	]))[0];
	if (!row) return {
		ok: false,
		error: "This lane has ended."
	};
	const youAreA = row.a_id === selfId;
	return {
		ok: true,
		youVoice: youAreA ? asBool(row.a_voice) : asBool(row.b_voice),
		partnerVoice: youAreA ? asBool(row.b_voice) : asBool(row.a_voice),
		youVideo: youAreA ? asBool(row.a_video) : asBool(row.b_video),
		partnerVideo: youAreA ? asBool(row.b_video) : asBool(row.a_video)
	};
}
async function stats() {
	const sql = await getSql();
	await prune(sql);
	return { people: await peopleCount(sql) };
}
//#endregion
export { relay_server_exports as n, dropAway as t };
