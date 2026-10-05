import { createServerFn } from "@tanstack/react-start";
import { ID_RE, cleanText, normalizeTags } from "./format";
import type { DraftEvent } from "./types";

export const listGatherings = createServerFn({ method: "POST" })
  .validator((input: { token?: string; hostTokens?: string[] } | undefined) => {
    const token = typeof input?.token === "string" && ID_RE.test(input.token) ? input.token : "";
    const hostTokens = Array.isArray(input?.hostTokens)
      ? input.hostTokens.filter((item) => typeof item === "string" && ID_RE.test(item)).slice(0, 40)
      : [];
    return { token, hostTokens };
  })
  .handler(async ({ data }) => {
    try {
      const { listEvents } = await import("./events.server");
      return { ok: true as const, events: await listEvents(data.token, data.hostTokens) };
    } catch (error) {
      console.error("[elsewhere] events", error);
      return { ok: false as const, error: "The board didn't load.", events: [] };
    }
  });

export const postGathering = createServerFn({ method: "POST" })
  .validator((input: DraftEvent) => ({
    title: cleanText(input?.title, 80),
    blurb: cleanText(input?.blurb, 280),
    city: cleanText(input?.city, 48),
    place: cleanText(input?.place, 80),
    startsAt: cleanText(input?.startsAt, 40),
    tags: normalizeTags(input?.tags),
    hostLabel: cleanText(input?.hostLabel, 32),
    token: typeof input?.token === "string" ? input.token : "",
  }))
  .handler(async ({ data }) => {
    try {
      const { createEvent } = await import("./events.server");
      return await createEvent(data);
    } catch (error) {
      console.error("[elsewhere] create event", error);
      return { ok: false as const, error: "Couldn't post that gathering." };
    }
  });

export const rsvpGathering = createServerFn({ method: "POST" })
  .validator((input: { eventId: string; token: string }) => ({
    eventId: typeof input?.eventId === "string" ? input.eventId : "",
    token: typeof input?.token === "string" ? input.token : "",
  }))
  .handler(async ({ data }) => {
    try {
      const { toggleRsvp } = await import("./events.server");
      return await toggleRsvp(data.eventId, data.token);
    } catch (error) {
      console.error("[elsewhere] rsvp", error);
      return { ok: false as const, error: "Couldn't update that." };
    }
  });

export const deleteGathering = createServerFn({ method: "POST" })
  .validator((input: { eventId: string; hostToken: string }) => ({
    eventId: typeof input?.eventId === "string" ? input.eventId : "",
    hostToken: typeof input?.hostToken === "string" ? input.hostToken : "",
  }))
  .handler(async ({ data }) => {
    try {
      const { removeEvent } = await import("./events.server");
      return await removeEvent(data.eventId, data.hostToken);
    } catch (error) {
      console.error("[elsewhere] delete event", error);
      return { ok: false as const, error: "Couldn't remove that." };
    }
  });
