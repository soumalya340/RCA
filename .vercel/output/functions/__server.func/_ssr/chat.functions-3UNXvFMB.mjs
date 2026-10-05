import { n as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CN-evIEF.mjs";
import { i as cleanText, o as normalizeTags, t as ID_RE } from "./format-DyUhT5ai.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/chat.functions-3UNXvFMB.js
function session(selfId) {
	if (typeof selfId !== "string" || !ID_RE.test(selfId)) throw new Error("Invalid session.");
	return selfId;
}
var seekLane_createServerFn_handler = createServerRpc({
	id: "975087dc4f78953f43a78cd559d5a5e9cdf25f33c8c8c56a230277022c1edc84",
	name: "seekLane",
	filename: "src/lib/elsewhere/chat.functions.ts"
}, (opts) => seekLane.__executeServer(opts));
var seekLane = createServerFn({ method: "POST" }).validator((input) => {
	return {
		selfId: session(input?.selfId),
		city: cleanText(input.city, 48),
		region: cleanText(input.region, 48),
		country: cleanText(input.country, 48),
		interests: normalizeTags(input.interests),
		openMatch: Boolean(input.openMatch)
	};
}).handler(seekLane_createServerFn_handler, async ({ data }) => {
	try {
		const { seek } = await import("./relay.server-ru9BiPos.mjs").then((n) => n.n);
		return await seek(data);
	} catch (error) {
		console.error("[elsewhere] seek", error);
		return {
			ok: false,
			error: "The desk is briefly unavailable."
		};
	}
});
var leaveQueue_createServerFn_handler = createServerRpc({
	id: "222341beaac63f66a7cb63ac7c28a4eeb94ab202f1ee0add9d2aa3213886ecfd",
	name: "leaveQueue",
	filename: "src/lib/elsewhere/chat.functions.ts"
}, (opts) => leaveQueue.__executeServer(opts));
var leaveQueue = createServerFn({ method: "POST" }).validator((input) => session(input?.selfId)).handler(leaveQueue_createServerFn_handler, async ({ data }) => {
	const { leaveQueue: leave } = await import("./relay.server-ru9BiPos.mjs").then((n) => n.n);
	await leave(data);
	return { ok: true };
});
var pollLane_createServerFn_handler = createServerRpc({
	id: "3733872737f9bfcca37637ebe55cb0eae4039cd6290e81f3afeb7dce2971604d",
	name: "pollLane",
	filename: "src/lib/elsewhere/chat.functions.ts"
}, (opts) => pollLane.__executeServer(opts));
var pollLane = createServerFn({ method: "POST" }).validator((input) => ({
	selfId: session(input?.selfId),
	laneId: session(input?.laneId),
	since: Number.isFinite(input?.since) ? Math.max(0, Math.floor(input.since)) : 0
})).handler(pollLane_createServerFn_handler, async ({ data }) => {
	try {
		const { pollLane: poll } = await import("./relay.server-ru9BiPos.mjs").then((n) => n.n);
		return await poll(data.selfId, data.laneId, data.since);
	} catch (error) {
		console.error("[elsewhere] poll", error);
		return {
			ok: false,
			error: "The lane flickered. Still trying."
		};
	}
});
var sendLaneMessage_createServerFn_handler = createServerRpc({
	id: "3f3e7dba0fd9d0d7486409599f86d34b8449b54084c25631282eed7d49e39d33",
	name: "sendLaneMessage",
	filename: "src/lib/elsewhere/chat.functions.ts"
}, (opts) => sendLaneMessage.__executeServer(opts));
var sendLaneMessage = createServerFn({ method: "POST" }).validator((input) => ({
	selfId: session(input?.selfId),
	laneId: session(input?.laneId),
	body: cleanText(input?.body, 500)
})).handler(sendLaneMessage_createServerFn_handler, async ({ data }) => {
	try {
		const { sendMessage } = await import("./relay.server-ru9BiPos.mjs").then((n) => n.n);
		return await sendMessage(data.selfId, data.laneId, data.body);
	} catch (error) {
		console.error("[elsewhere] send", error);
		return {
			ok: false,
			error: "Message didn't send."
		};
	}
});
var setLaneCall_createServerFn_handler = createServerRpc({
	id: "9a0a1ddc67f35e87ad4d896c9f29b89e7a0c2fe1fb577640ec8cd6cde8e8e7bd",
	name: "setLaneCall",
	filename: "src/lib/elsewhere/chat.functions.ts"
}, (opts) => setLaneCall.__executeServer(opts));
var setLaneCall = createServerFn({ method: "POST" }).validator((input) => ({
	selfId: session(input?.selfId),
	laneId: session(input?.laneId),
	mode: input?.mode === "voice" || input?.mode === "video" ? input.mode : "off"
})).handler(setLaneCall_createServerFn_handler, async ({ data }) => {
	try {
		const { setCall } = await import("./relay.server-ru9BiPos.mjs").then((n) => n.n);
		const mode = data.mode === "voice" || data.mode === "video" ? data.mode : "off";
		return await setCall(data.selfId, data.laneId, mode);
	} catch (error) {
		console.error("[elsewhere] call", error);
		return {
			ok: false,
			error: "Couldn't update the call."
		};
	}
});
var endLane_createServerFn_handler = createServerRpc({
	id: "360b7976ccef65ce124ca1015955e784e2b16fe9e2875106c64beb149dad4c54",
	name: "endLane",
	filename: "src/lib/elsewhere/chat.functions.ts"
}, (opts) => endLane.__executeServer(opts));
var endLane = createServerFn({ method: "POST" }).validator((input) => ({
	selfId: session(input?.selfId),
	laneId: session(input?.laneId)
})).handler(endLane_createServerFn_handler, async ({ data }) => {
	const { endLane: end } = await import("./relay.server-ru9BiPos.mjs").then((n) => n.n);
	return end(data.selfId, data.laneId);
});
var lobbyStats_createServerFn_handler = createServerRpc({
	id: "58d1adf2d1e11f84c574728870899820f28e5fa683c1c25b3274fc46fb33b32e",
	name: "lobbyStats",
	filename: "src/lib/elsewhere/chat.functions.ts"
}, (opts) => lobbyStats.__executeServer(opts));
var lobbyStats = createServerFn({ method: "POST" }).handler(lobbyStats_createServerFn_handler, async () => {
	try {
		const { stats } = await import("./relay.server-ru9BiPos.mjs").then((n) => n.n);
		return await stats();
	} catch (error) {
		console.error("[elsewhere] stats", error);
		return { people: 0 };
	}
});
//#endregion
export { endLane_createServerFn_handler, leaveQueue_createServerFn_handler, lobbyStats_createServerFn_handler, pollLane_createServerFn_handler, seekLane_createServerFn_handler, sendLaneMessage_createServerFn_handler, setLaneCall_createServerFn_handler };
