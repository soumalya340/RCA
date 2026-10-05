import { createServerFn } from "@tanstack/react-start";
import { ID_RE, cleanText, normalizeTags } from "./format";
import type { CallMode, ProfileInput } from "./types";

function session(selfId: unknown) {
  if (typeof selfId !== "string" || !ID_RE.test(selfId)) throw new Error("Invalid session.");
  return selfId;
}

export const seekLane = createServerFn({ method: "POST" })
  .validator((input: ProfileInput) => {
    const selfId = session(input?.selfId);
    return {
      selfId,
      city: cleanText(input.city, 48),
      region: cleanText(input.region, 48),
      country: cleanText(input.country, 48),
      interests: normalizeTags(input.interests),
      openMatch: Boolean(input.openMatch),
    } satisfies ProfileInput;
  })
  .handler(async ({ data }) => {
    try {
      const { seek } = await import("./relay.server");
      return await seek(data);
    } catch (error) {
      console.error("[elsewhere] seek", error);
      return { ok: false as const, error: "The desk is briefly unavailable." };
    }
  });

export const leaveQueue = createServerFn({ method: "POST" })
  .validator((input: { selfId: string }) => session(input?.selfId))
  .handler(async ({ data }) => {
    const { leaveQueue: leave } = await import("./relay.server");
    await leave(data);
    return { ok: true as const };
  });

export const pollLane = createServerFn({ method: "POST" })
  .validator((input: { selfId: string; laneId: string; since: number }) => ({
    selfId: session(input?.selfId),
    laneId: session(input?.laneId),
    since: Number.isFinite(input?.since) ? Math.max(0, Math.floor(input.since)) : 0,
  }))
  .handler(async ({ data }) => {
    try {
      const { pollLane: poll } = await import("./relay.server");
      return await poll(data.selfId, data.laneId, data.since);
    } catch (error) {
      console.error("[elsewhere] poll", error);
      return { ok: false as const, error: "The lane flickered. Still trying." };
    }
  });

export const sendLaneMessage = createServerFn({ method: "POST" })
  .validator((input: { selfId: string; laneId: string; body: string }) => ({
    selfId: session(input?.selfId),
    laneId: session(input?.laneId),
    body: cleanText(input?.body, 500),
  }))
  .handler(async ({ data }) => {
    try {
      const { sendMessage } = await import("./relay.server");
      return await sendMessage(data.selfId, data.laneId, data.body);
    } catch (error) {
      console.error("[elsewhere] send", error);
      return { ok: false as const, error: "Message didn't send." };
    }
  });

export const setLaneCall = createServerFn({ method: "POST" })
  .validator((input: { selfId: string; laneId: string; mode: CallMode }) => ({
    selfId: session(input?.selfId),
    laneId: session(input?.laneId),
    mode: input?.mode === "voice" || input?.mode === "video" ? input.mode : "off",
  }))
  .handler(async ({ data }) => {
    try {
      const { setCall } = await import("./relay.server");
      const mode = data.mode === "voice" || data.mode === "video" ? data.mode : "off";
      return await setCall(data.selfId, data.laneId, mode);
    } catch (error) {
      console.error("[elsewhere] call", error);
      return { ok: false as const, error: "Couldn't update the call." };
    }
  });

export const endLane = createServerFn({ method: "POST" })
  .validator((input: { selfId: string; laneId: string }) => ({
    selfId: session(input?.selfId),
    laneId: session(input?.laneId),
  }))
  .handler(async ({ data }) => {
    const { endLane: end } = await import("./relay.server");
    return end(data.selfId, data.laneId);
  });

export const lobbyStats = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const { stats } = await import("./relay.server");
    return await stats();
  } catch (error) {
    console.error("[elsewhere] stats", error);
    return { people: 0 };
  }
});
