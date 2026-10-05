import { n as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CN-evIEF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/place.functions-BNWO7pEf.js
function decodeHeader(value) {
	if (!value) return "";
	try {
		return decodeURIComponent(value).replace(/[\u0000-\u001f]/g, "").trim().slice(0, 48);
	} catch {
		return value.trim().slice(0, 48);
	}
}
function countryName(code) {
	if (!/^[A-Za-z]{2}$/.test(code)) return code;
	try {
		return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) || code;
	} catch {
		return code;
	}
}
var locateFromRequest_createServerFn_handler = createServerRpc({
	id: "3c632afd9a4642d1cac191e595439de29d999b2d98684ee045869e96f58bc088",
	name: "locateFromRequest",
	filename: "src/lib/elsewhere/place.functions.ts"
}, (opts) => locateFromRequest.__executeServer(opts));
var locateFromRequest = createServerFn({ method: "POST" }).handler(locateFromRequest_createServerFn_handler, async () => {
	try {
		const { getRequest } = await import("./ssr.mjs").then((n) => n.a).then((n) => n.t);
		const headers = getRequest().headers;
		return {
			city: decodeHeader(headers.get("x-vercel-ip-city") || headers.get("cf-ipcity") || headers.get("x-geo-city")),
			region: decodeHeader(headers.get("x-vercel-ip-country-region") || headers.get("cf-region") || headers.get("x-geo-region")),
			country: countryName(decodeHeader(headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry") || headers.get("x-geo-country")))
		};
	} catch (error) {
		console.error("[elsewhere] locate", error);
		return {
			city: "",
			region: "",
			country: ""
		};
	}
});
//#endregion
export { locateFromRequest_createServerFn_handler };
