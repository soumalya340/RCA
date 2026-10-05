import { n as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CN-evIEF.mjs";
import { i as cleanText, o as normalizeTags, t as ID_RE } from "./format-DyUhT5ai.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/events.functions-DdVs1Sep.js
var listGatherings_createServerFn_handler = createServerRpc({
	id: "dda6300d8092989df51a80a018cf2eb746f41e3c16b505610965809c1448420e",
	name: "listGatherings",
	filename: "src/lib/elsewhere/events.functions.ts"
}, (opts) => listGatherings.__executeServer(opts));
var listGatherings = createServerFn({ method: "POST" }).validator((input) => {
	return {
		token: typeof input?.token === "string" && ID_RE.test(input.token) ? input.token : "",
		hostTokens: Array.isArray(input?.hostTokens) ? input.hostTokens.filter((item) => typeof item === "string" && ID_RE.test(item)).slice(0, 40) : []
	};
}).handler(listGatherings_createServerFn_handler, async ({ data }) => {
	try {
		const { listEvents } = await import("./events.server-nAyx8mj2.mjs");
		return {
			ok: true,
			events: await listEvents(data.token, data.hostTokens)
		};
	} catch (error) {
		console.error("[elsewhere] events", error);
		return {
			ok: false,
			error: "The board didn't load.",
			events: []
		};
	}
});
var postGathering_createServerFn_handler = createServerRpc({
	id: "6cb38a6940366b4c2609ed9c8e75adad936d73842a873304ad7916a42d2de0d8",
	name: "postGathering",
	filename: "src/lib/elsewhere/events.functions.ts"
}, (opts) => postGathering.__executeServer(opts));
var postGathering = createServerFn({ method: "POST" }).validator((input) => ({
	title: cleanText(input?.title, 80),
	blurb: cleanText(input?.blurb, 280),
	city: cleanText(input?.city, 48),
	place: cleanText(input?.place, 80),
	startsAt: cleanText(input?.startsAt, 40),
	tags: normalizeTags(input?.tags),
	hostLabel: cleanText(input?.hostLabel, 32),
	token: typeof input?.token === "string" ? input.token : ""
})).handler(postGathering_createServerFn_handler, async ({ data }) => {
	try {
		const { createEvent } = await import("./events.server-nAyx8mj2.mjs");
		return await createEvent(data);
	} catch (error) {
		console.error("[elsewhere] create event", error);
		return {
			ok: false,
			error: "Couldn't post that gathering."
		};
	}
});
var rsvpGathering_createServerFn_handler = createServerRpc({
	id: "bc7aa2cc86a607321d58166dc318bbfa7394914fa60fe589f537228663fcb132",
	name: "rsvpGathering",
	filename: "src/lib/elsewhere/events.functions.ts"
}, (opts) => rsvpGathering.__executeServer(opts));
var rsvpGathering = createServerFn({ method: "POST" }).validator((input) => ({
	eventId: typeof input?.eventId === "string" ? input.eventId : "",
	token: typeof input?.token === "string" ? input.token : ""
})).handler(rsvpGathering_createServerFn_handler, async ({ data }) => {
	try {
		const { toggleRsvp } = await import("./events.server-nAyx8mj2.mjs");
		return await toggleRsvp(data.eventId, data.token);
	} catch (error) {
		console.error("[elsewhere] rsvp", error);
		return {
			ok: false,
			error: "Couldn't update that."
		};
	}
});
var deleteGathering_createServerFn_handler = createServerRpc({
	id: "fe1a25d4a42467dc83a5a3205b37c08cb13f05cdfe710943178256728c9fffe5",
	name: "deleteGathering",
	filename: "src/lib/elsewhere/events.functions.ts"
}, (opts) => deleteGathering.__executeServer(opts));
var deleteGathering = createServerFn({ method: "POST" }).validator((input) => ({
	eventId: typeof input?.eventId === "string" ? input.eventId : "",
	hostToken: typeof input?.hostToken === "string" ? input.hostToken : ""
})).handler(deleteGathering_createServerFn_handler, async ({ data }) => {
	try {
		const { removeEvent } = await import("./events.server-nAyx8mj2.mjs");
		return await removeEvent(data.eventId, data.hostToken);
	} catch (error) {
		console.error("[elsewhere] delete event", error);
		return {
			ok: false,
			error: "Couldn't remove that."
		};
	}
});
//#endregion
export { deleteGathering_createServerFn_handler, listGatherings_createServerFn_handler, postGathering_createServerFn_handler, rsvpGathering_createServerFn_handler };
