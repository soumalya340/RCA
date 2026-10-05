import { createServerFn } from "@tanstack/react-start";
import type { Place } from "./types";

function decodeHeader(value: string | null): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value).replace(/[\u0000-\u001f]/g, "").trim().slice(0, 48);
  } catch {
    return value.trim().slice(0, 48);
  }
}

function countryName(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return code;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

export const locateFromRequest = createServerFn({ method: "POST" }).handler(async (): Promise<Place> => {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const headers = getRequest().headers;
    const city = decodeHeader(
      headers.get("x-vercel-ip-city") || headers.get("cf-ipcity") || headers.get("x-geo-city"),
    );
    const region = decodeHeader(
      headers.get("x-vercel-ip-country-region") || headers.get("cf-region") || headers.get("x-geo-region"),
    );
    const countryRaw = decodeHeader(
      headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry") || headers.get("x-geo-country"),
    );
    const country = countryName(countryRaw);
    return { city, region, country };
  } catch (error) {
    console.error("[elsewhere] locate", error);
    return { city: "", region: "", country: "" };
  }
});
