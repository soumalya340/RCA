//#region node_modules/.nitro/vite/services/ssr/assets/format-DyUhT5ai.js
var ID_RE = /^[a-zA-Z0-9_-]{8,40}$/;
function cleanText(value, max) {
	if (typeof value !== "string") return "";
	return value.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function normalizeTags(raw) {
	const list = Array.isArray(raw) ? raw : [];
	const out = [];
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
function splitTags(value) {
	return value.split(",").map((tag) => tag.trim()).filter(Boolean);
}
function formatPlace(place) {
	const parts = [
		place.city,
		place.region,
		place.country
	].map((part) => part.trim()).filter(Boolean);
	const unique = [];
	for (const part of parts) {
		if (unique.some((item) => item.toLowerCase() === part.toLowerCase())) continue;
		unique.push(part);
	}
	return unique.join(" · ") || "Unknown place";
}
function overlaps(a, b) {
	const left = new Set(a.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean));
	if (left.size === 0) return false;
	return b.split(",").some((tag) => left.has(tag.trim().toLowerCase()));
}
function toIso(value) {
	if (value instanceof Date) return value.toISOString();
	const parsed = new Date(String(value));
	return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}
function asBool(value) {
	return value === true || value === "t" || value === "true" || value === 1;
}
function asNumber(value) {
	const number = typeof value === "number" ? value : Number(value);
	return Number.isFinite(number) ? number : 0;
}
//#endregion
export { formatPlace as a, splitTags as c, cleanText as i, toIso as l, asBool as n, normalizeTags as o, asNumber as r, overlaps as s, ID_RE as t };
