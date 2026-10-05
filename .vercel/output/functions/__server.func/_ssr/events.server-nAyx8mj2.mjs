import { c as splitTags, i as cleanText, l as toIso, n as asBool, o as normalizeTags, r as asNumber, t as ID_RE } from "./format-DyUhT5ai.mjs";
import { t as getSql } from "./db-BbnimI5K.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/events.server-nAyx8mj2.js
var SEEDS = [
	{
		id: "ev_lisbon_listen",
		title: "Rooftop listening hour",
		blurb: "One song each. A small speaker, the river, and no lineup.",
		city: "Lisbon",
		place: "Miradouro de Santa Catarina",
		days: 1,
		hour: 21,
		tags: "Music,Night walks",
		host: "Mira",
		going: 14
	},
	{
		id: "ev_chicago_film",
		title: "Late film club",
		blurb: "A short, then a walk to argue about the ending.",
		city: "Chicago",
		place: "Music Box lounge",
		days: 2,
		hour: 20,
		tags: "Film,Late hours",
		host: "Jonah",
		going: 9
	},
	{
		id: "ev_osaka_arcade",
		title: "Midnight arcade",
		blurb: "Loser buys the next round of tea. No high scores required.",
		city: "Osaka",
		place: "Nipponbashi",
		days: 3,
		hour: 23,
		tags: "Games,Art",
		host: "Aiko",
		going: 11
	},
	{
		id: "ev_cdmx_walk",
		title: "Night market tasting",
		blurb: "Three stalls, one rule: share whatever you order.",
		city: "Mexico City",
		place: "Mercado Roma",
		days: 2,
		hour: 19,
		tags: "Food,Travel",
		host: "Luz",
		going: 18
	},
	{
		id: "ev_accra_porch",
		title: "Porch session",
		blurb: "Bring a demo, a question, or just stay for the music.",
		city: "Accra",
		place: "Osu waterfront",
		days: 4,
		hour: 18,
		tags: "Startups,Music",
		host: "Sable",
		going: 7
	},
	{
		id: "ev_cairo_read",
		title: "After-dark reading",
		blurb: "Ten pages aloud, then the room talks. Any language welcome.",
		city: "Cairo",
		place: "A shaded courtyard in Zamalek",
		days: 5,
		hour: 20,
		tags: "Books,Languages",
		host: "Noor",
		going: 8
	},
	{
		id: "ev_malmo_swim",
		title: "Cold swim and coffee",
		blurb: "Short dip, long coffee. Towels exist. Heroics do not.",
		city: "Malmö",
		place: "Ribersborg kallbadhus",
		days: 3,
		hour: 8,
		tags: "Sports,Travel",
		host: "Leif",
		going: 6
	},
	{
		id: "ev_berlin_open",
		title: "Gallery open late",
		blurb: "New work on the walls until midnight. Come without a plan.",
		city: "Berlin",
		place: "Neukölln storefront",
		days: 6,
		hour: 19,
		tags: "Art,Night walks",
		host: "Ada",
		going: 22
	}
];
function atHour(days, hour) {
	const date = /* @__PURE__ */ new Date();
	date.setUTCDate(date.getUTCDate() + days);
	date.setUTCHours(hour, 0, 0, 0);
	return date.toISOString();
}
async function ensureBoard(sql) {
	for (const seed of SEEDS) await sql.query(`insert into ew_events (id, title, blurb, city, place, starts_at, tags, host_label, host_token, base_going)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       on conflict (id) do update set starts_at = excluded.starts_at
       where ew_events.starts_at < now() and ew_events.host_token = excluded.host_token`, [
		seed.id,
		seed.title,
		seed.blurb,
		seed.city,
		seed.place,
		atHour(seed.days, seed.hour),
		seed.tags,
		seed.host,
		`seed_${seed.id}`,
		seed.going
	]);
}
function toEvent(row) {
	return {
		id: row.id,
		title: row.title,
		blurb: row.blurb,
		city: row.city,
		place: row.place,
		startsAt: toIso(row.starts_at),
		tags: splitTags(row.tags),
		hostLabel: row.host_label,
		goingCount: asNumber(row.going_count),
		going: asBool(row.going)
	};
}
async function listEvents(token, hostTokens) {
	const safeToken = ID_RE.test(token) ? token : "";
	const owned = new Set(hostTokens.filter((item) => ID_RE.test(item) && item.startsWith("h")));
	const sql = await getSql();
	await ensureBoard(sql);
	return (await sql.query(`select e.id, e.title, e.blurb, e.city, e.place, e.starts_at, e.tags, e.host_label, e.host_token,
            (e.base_going + (select count(*)::int from ew_rsvps r where r.event_id = e.id)) as going_count,
            exists(select 1 from ew_rsvps r where r.event_id = e.id and r.token = $1) as going
     from ew_events e
     where e.starts_at > now() - interval '12 hours'
     order by e.starts_at asc
     limit 80`, [safeToken])).map((row) => ({
		...toEvent(row),
		mine: owned.has(row.host_token)
	}));
}
async function createEvent(draft) {
	const title = cleanText(draft.title, 80);
	const place = cleanText(draft.place, 80);
	const city = cleanText(draft.city, 48);
	const blurb = cleanText(draft.blurb, 280);
	const hostLabel = cleanText(draft.hostLabel, 32) || "Anonymous";
	const tags = normalizeTags(draft.tags);
	const when = new Date(draft.startsAt);
	if (title.length < 3) return {
		ok: false,
		error: "Give the gathering a name."
	};
	if (city.length < 2) return {
		ok: false,
		error: "Add a city."
	};
	if (place.length < 2) return {
		ok: false,
		error: "Add a place."
	};
	if (Number.isNaN(when.getTime())) return {
		ok: false,
		error: "Pick a time."
	};
	const skew = when.getTime() - Date.now();
	if (skew < -36e5) return {
		ok: false,
		error: "That time has already passed."
	};
	if (skew > 31968e6) return {
		ok: false,
		error: "Keep it within the next year."
	};
	if (!ID_RE.test(draft.token)) return {
		ok: false,
		error: "Invalid session."
	};
	const id = `ev${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
	const hostToken = `h${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
	const sql = await getSql();
	await sql.query(`insert into ew_events (id, title, blurb, city, place, starts_at, tags, host_label, host_token, base_going)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1)`, [
		id,
		title,
		blurb,
		city,
		place,
		when.toISOString(),
		tags.join(","),
		hostLabel,
		hostToken
	]);
	await sql.query(`insert into ew_rsvps (event_id, token) values ($1, $2) on conflict do nothing`, [id, draft.token]);
	return {
		ok: true,
		id,
		hostToken
	};
}
async function toggleRsvp(eventId, token) {
	if (!ID_RE.test(eventId) || !ID_RE.test(token)) return {
		ok: false,
		error: "Invalid event."
	};
	const sql = await getSql();
	if ((await sql.query(`select event_id from ew_rsvps where event_id = $1 and token = $2`, [eventId, token]))[0]) {
		await sql.query(`delete from ew_rsvps where event_id = $1 and token = $2`, [eventId, token]);
		return {
			ok: true,
			going: false
		};
	}
	if (!(await sql.query(`select id from ew_events where id = $1`, [eventId]))[0]) return {
		ok: false,
		error: "That gathering is gone."
	};
	await sql.query(`insert into ew_rsvps (event_id, token) values ($1, $2) on conflict do nothing`, [eventId, token]);
	return {
		ok: true,
		going: true
	};
}
async function removeEvent(eventId, hostToken) {
	if (!ID_RE.test(eventId) || !ID_RE.test(hostToken) || !hostToken.startsWith("h")) return {
		ok: false,
		error: "You can only remove a gathering you posted."
	};
	const sql = await getSql();
	if (!(await sql.query(`delete from ew_events where id = $1 and host_token = $2 returning id`, [eventId, hostToken]))[0]) return {
		ok: false,
		error: "You can only remove a gathering you posted."
	};
	await sql.query(`delete from ew_rsvps where event_id = $1`, [eventId]);
	return { ok: true };
}
//#endregion
export { createEvent, listEvents, removeEvent, toggleRsvp };
