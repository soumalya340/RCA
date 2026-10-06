import { useEffect, useRef, useState } from "react";
import { CalendarDays, MessageSquare, Radio } from "lucide-react";
import { ChatPane } from "@/components/elsewhere/chat-pane";
import { EventsPane } from "@/components/elsewhere/events-pane";
import { Lobby } from "@/components/elsewhere/lobby";
import { Searching } from "@/components/elsewhere/searching";
import { detectPlace, loadSavedLane, loadSelfId, saveLane } from "@/lib/elsewhere/client";
import {
  endLane,
  leaveQueue,
  lobbyStats,
  pollLane,
  seekLane,
  sendLaneMessage,
  setLaneCall,
  setLaneTyping,
} from "@/lib/elsewhere/chat.functions";
import { formatPlace } from "@/lib/elsewhere/format";
import { hostedReply, pickPersona, type Persona } from "@/lib/elsewhere/hosted";
import type { CallMode, ChatMedium, LaneDTO, LocationScope, Place } from "@/lib/elsewhere/types";

type Line = { id: string; fromSelf: boolean; body: string; at?: string };

type Search = {
  place: Place;
  interests: string[];
  openMatch: boolean;
  scope: LocationScope;
  medium: ChatMedium;
  started: number;
};

type Phase =
  | { kind: "lobby" }
  | { kind: "search" }
  | { kind: "hosted"; persona: Persona; lines: Line[]; typing: boolean }
  | { kind: "live"; lane: LaneDTO; lines: Line[]; ended: boolean; partnerTyping?: boolean };

function mergeLines(
  current: Line[],
  incoming: { id: number; fromSelf: boolean; body: string; at?: string }[],
): Line[] {
  const map = new Map(current.map((line) => [line.id, line]));
  for (const line of incoming) {
    map.set(String(line.id), {
      id: String(line.id),
      fromSelf: line.fromSelf,
      body: line.body,
      at: line.at || new Date().toISOString(),
    });
  }
  return [...map.values()].sort((a, b) => Number(a.id) - Number(b.id));
}

function hostedLane(
  persona: Persona,
  selfId: string,
  place: Place,
  interests: string[],
  medium: ChatMedium = "text",
): LaneDTO {
  return {
    id: "hosted",
    youAre: "a",
    self: { id: selfId, ...place, interests },
    partner: {
      id: persona.name,
      city: persona.city,
      region: persona.region,
      country: persona.country,
      interests: persona.interests,
    },
    youVoice: medium === "voice",
    partnerVoice: medium === "voice",
    youVideo: false,
    partnerVideo: false,
    medium,
  };
}

export function ElsewhereApp() {
  const [tab, setTab] = useState<"talk" | "events">("talk");
  const [selfId, setSelfId] = useState<string | null>(null);
  const [place, setPlace] = useState<Place>({ city: "", region: "", country: "" });
  const [locating, setLocating] = useState(true);
  const [people, setPeople] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "lobby" });
  const [error, setError] = useState<string | null>(null);
  const [waited, setWaited] = useState(false);
  const searchRef = useRef<Search | null>(null);
  const sinceRef = useRef(0);
  const selfRef = useRef<string | null>(null);
  const selfTypingRef = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  selfRef.current = selfId;

  useEffect(() => {
    const id = loadSelfId();
    setSelfId(id);
    let cancel = false;
    void detectPlace().then((next) => {
      if (!cancel) {
        setPlace(next);
        setLocating(false);
      }
    });
    void lobbyStats().then((stats) => {
      if (!cancel) setPeople(stats.people);
    });
    const saved = loadSavedLane();
    if (saved) {
      void pollLane({ data: { selfId: id, laneId: saved, since: 0 } }).then((result) => {
        if (cancel) return;
        if (result.ok && result.status === "live") {
          sinceRef.current = result.messages.reduce((max, message) => Math.max(max, message.id), 0);
          setPhase({
            kind: "live",
            lane: result.lane,
            lines: result.messages.map((message) => ({
              id: String(message.id),
              fromSelf: message.fromSelf,
              body: message.body,
              at: message.at,
            })),
            ended: false,
          });
        } else {
          saveLane(null);
        }
      });
    }
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (phase.kind !== "lobby") return;
    const id = window.setInterval(() => {
      void lobbyStats().then((stats) => setPeople(stats.people));
    }, 8000);
    return () => window.clearInterval(id);
  }, [phase.kind]);

  useEffect(() => {
    if (phase.kind !== "search" || !selfId) return;
    let stop = false;
    const tick = async () => {
      const current = searchRef.current;
      if (!current || stop) return;
      const result = await seekLane({
        data: {
          selfId,
          city: current.place.city,
          region: current.place.region,
          country: current.place.country,
          interests: current.interests,
          openMatch: current.openMatch,
          scope: current.scope,
          medium: current.medium,
        },
      });
      if (stop) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPeople(result.people);
      setError(null);
      if (result.status === "matched") {
        saveLane(result.lane.id);
        sinceRef.current = 0;
        setPhase({ kind: "live", lane: result.lane, lines: [], ended: false });
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 1500);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [phase.kind, selfId]);

  const liveId = phase.kind === "live" ? phase.lane.id : "";
  const liveEnded = phase.kind === "live" ? phase.ended : false;

  useEffect(() => {
    if (phase.kind !== "live" || liveEnded || !selfId || !liveId) return;
    const laneId = liveId;
    let stop = false;
    const tick = async () => {
      const result = await pollLane({
        data: { selfId, laneId, since: sinceRef.current, typing: selfTypingRef.current },
      });
      if (stop) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.messages.length > 0) {
        sinceRef.current = result.messages.reduce((max, message) => Math.max(max, message.id), sinceRef.current);
      }
      setPhase((current) => {
        if (current.kind !== "live" || current.lane.id !== laneId) return current;
        const lines = mergeLines(current.lines, result.messages);
        if (result.status === "live") {
          return {
            ...current,
            lane: result.lane,
            lines,
            ended: false,
            partnerTyping: Boolean(result.partnerTyping),
          };
        }
        saveLane(null);
        return { ...current, lines, ended: true, partnerTyping: false };
      });
    };
    void tick();
    const id = window.setInterval(() => void tick(), 1200);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [liveEnded, liveId, phase.kind, selfId]);

  useEffect(() => {
    if (phase.kind !== "search") {
      setWaited(false);
      return;
    }
    const id = window.setTimeout(() => setWaited(true), 7000);
    return () => window.clearTimeout(id);
  }, [phase.kind]);

  useEffect(() => {
    const onHide = () => {
      const id = selfRef.current;
      if (!id || phaseRef.current.kind !== "search") return;
      void fetch("/api/presence", {
        method: "POST",
        keepalive: true,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selfId: id }),
      });
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, []);

  function startSearch(value: {
    place: Place;
    interests: string[];
    openMatch: boolean;
    scope: LocationScope;
    medium: ChatMedium;
  }) {
    if (!selfId) return;
    setError(null);
    const nextPlace = {
      city: value.place.city.trim(),
      region: value.place.region.trim(),
      country: value.place.country.trim(),
    };
    setPlace(nextPlace);
    searchRef.current = {
      place: nextPlace,
      interests: value.interests,
      openMatch: value.openMatch,
      scope: value.scope,
      medium: value.medium,
      started: Date.now(),
    };
    setPhase({ kind: "search" });
  }

  async function cancelSearch() {
    if (selfId) await leaveQueue({ data: { selfId } });
    setPhase({ kind: "lobby" });
  }

  function meetHosted() {
    const search = searchRef.current;
    if (!search || !selfId) return;
    void leaveQueue({ data: { selfId } });
    const persona = pickPersona(search.interests, undefined, {
      city: search.place.city,
      region: search.place.region,
      country: search.place.country,
      scope: search.scope,
    });
    setPhase({ kind: "hosted", persona, lines: [], typing: true });
    window.setTimeout(() => {
      setPhase((current) => {
        if (current.kind !== "hosted" || current.persona.id !== persona.id) return current;
        return {
          ...current,
          typing: false,
          lines: [{ id: "hello", fromSelf: false, body: persona.hello, at: new Date().toISOString() }],
        };
      });
    }, 700);
  }

  function sendHosted(body: string) {
    const now = new Date().toISOString();
    setPhase((current) => {
      if (current.kind !== "hosted") return current;
      return {
        ...current,
        typing: true,
        lines: [...current.lines, { id: crypto.randomUUID(), fromSelf: true, body, at: now }],
      };
    });
    const persona = phase.kind === "hosted" ? phase.persona : null;
    const city = searchRef.current?.place.city || place.city;
    window.setTimeout(() => {
      if (!persona) return;
      const reply = hostedReply(persona, body, city);
      setPhase((current) => {
        if (current.kind !== "hosted" || current.persona.id !== persona.id) return current;
        return {
          ...current,
          typing: false,
          lines: [...current.lines, { id: crypto.randomUUID(), fromSelf: false, body: reply, at: new Date().toISOString() }],
        };
      });
    }, 900);
  }

  async function sendLive(body: string) {
    if (phase.kind !== "live" || !selfId) return;
    selfTypingRef.current = false;
    const result = await sendLaneMessage({ data: { selfId, laneId: phase.lane.id, body } });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    sinceRef.current = Math.max(sinceRef.current, result.message.id);
    setPhase((current) => {
      if (current.kind !== "live") return current;
      return { ...current, lines: mergeLines(current.lines, [result.message]) };
    });
  }

  function onTyping(typing: boolean) {
    selfTypingRef.current = typing;
    if (phase.kind === "live" && selfId) {
      void setLaneTyping({ data: { selfId, laneId: phase.lane.id, typing } });
    }
  }

  async function onCall(mode: CallMode) {
    if (phase.kind !== "live" || !selfId) return false;
    const result = await setLaneCall({ data: { selfId, laneId: phase.lane.id, mode } });
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setPhase((current) =>
      current.kind === "live"
        ? {
            ...current,
            lane: {
              ...current.lane,
              youVoice: result.youVoice,
              partnerVoice: result.partnerVoice,
              youVideo: result.youVideo,
              partnerVideo: result.partnerVideo,
            },
          }
        : current,
    );
    return true;
  }

  async function closeLive() {
    if (phase.kind === "live" && selfId) {
      await endLane({ data: { selfId, laneId: phase.lane.id } });
    }
    saveLane(null);
    setPhase({ kind: "lobby" });
    setTab("talk");
  }

  function nextLane() {
    if (phase.kind === "hosted") {
      const interests = searchRef.current?.interests ?? [];
      const persona = pickPersona(interests, phase.persona.id, {
        city: searchRef.current?.place.city || place.city,
        region: searchRef.current?.place.region || place.region,
        country: searchRef.current?.place.country || place.country,
        scope: searchRef.current?.scope,
      });
      setPhase({ kind: "hosted", persona, lines: [], typing: true });
      window.setTimeout(() => {
        setPhase((current) => {
          if (current.kind !== "hosted" || current.persona.id !== persona.id) return current;
          return { ...current, typing: false, lines: [{ id: "hello", fromSelf: false, body: persona.hello }] };
        });
      }, 600);
      return;
    }
    if (phase.kind === "live" && selfId) {
      const laneId = phase.lane.id;
      const id = selfId;
      void endLane({ data: { selfId: id, laneId } });
    }
    saveLane(null);
    sinceRef.current = 0;
    if (!searchRef.current && phase.kind === "live") {
      searchRef.current = {
        place,
        interests: phase.lane.self.interests,
        openMatch: phase.lane.self.interests.length === 0,
        scope: "worldwide",
        medium: phase.lane.medium || "text",
        started: Date.now(),
      };
    }
    if (searchRef.current) searchRef.current = { ...searchRef.current, started: Date.now() };
    setPhase({ kind: "search" });
  }

  const chatting = phase.kind === "live" || phase.kind === "hosted";
  const placeLabel = locating ? "Locating…" : formatPlace(place);

  const chatLane =
    phase.kind === "live"
      ? phase.lane
      : phase.kind === "hosted" && selfId
        ? hostedLane(
            phase.persona,
            selfId,
            searchRef.current?.place ?? place,
            searchRef.current?.interests ?? [],
            searchRef.current?.medium ?? "text",
          )
        : null;

  return (
    <div className="mx-auto flex h-dvh w-full max-w-5xl flex-col px-3 sm:px-4">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl leading-none text-fg">Elsewhere</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{people === null ? "…" : `${people} online`}</span>
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-muted flex items-center gap-1">
            <Radio className="size-3 text-faint shrink-0" />
            <span>{placeLabel}</span>
          </p>
        </div>

        {/* Desktop and Tablet top nav */}
        <nav className="flex rounded-lg border border-line p-1 bg-surface/40" aria-label="Sections">
          <button
            type="button"
            className={`pressable min-h-9 flex items-center gap-1.5 rounded-md px-3 text-xs sm:text-sm font-medium ${
              tab === "talk" ? "bg-subtle text-fg shadow-xs" : "text-muted hover:text-fg"
            }`}
            onClick={() => setTab("talk")}
          >
            <MessageSquare className="size-3.5" />
            <span>Random Chat</span>
          </button>
          <button
            type="button"
            className={`pressable min-h-9 flex items-center gap-1.5 rounded-md px-3 text-xs sm:text-sm font-medium ${
              tab === "events" ? "bg-subtle text-fg shadow-xs" : "text-muted hover:text-fg"
            }`}
            onClick={() => setTab("events")}
          >
            <CalendarDays className="size-3.5" />
            <span>Events</span>
          </button>
        </nav>
      </header>

      <main className={`min-h-0 flex-1 ${chatting && tab === "talk" ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}>
        <div className={tab === "talk" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
          {phase.kind === "lobby" && (
            <Lobby place={place} locating={locating} people={people} error={error} onStart={startSearch} />
          )}
          {phase.kind === "search" && searchRef.current && (
            <Searching
              place={searchRef.current.place}
              interests={searchRef.current.interests}
              openMatch={searchRef.current.openMatch}
              scope={searchRef.current.scope}
              medium={searchRef.current.medium}
              waited={waited}
              people={people}
              error={error}
              onHosted={meetHosted}
              onCancel={() => void cancelSearch()}
            />
          )}
          {chatLane && (phase.kind === "live" || phase.kind === "hosted") && selfId && (
            <ChatPane
              selfId={selfId}
              lane={chatLane}
              lines={phase.lines}
              ended={phase.kind === "live" ? phase.ended : false}
              typing={phase.kind === "hosted" ? phase.typing : Boolean(phase.partnerTyping)}
              hosted={phase.kind === "hosted"}
              error={error}
              onSend={phase.kind === "hosted" ? sendHosted : sendLive}
              onTyping={onTyping}
              onCall={onCall}
              onNext={nextLane}
              onClose={() => void closeLive()}
            />
          )}
        </div>
        {tab === "events" && <EventsPane place={place} />}
      </main>

      {/* Mobile Bottom Navigation Bar (hidden during active chat to allow keyboard/composer space) */}
      {!chatting && (
        <nav
          className="sm:hidden shrink-0 border-t border-line bg-surface/90 backdrop-blur-md pb-safe py-2 px-6 flex items-center justify-around"
          aria-label="Mobile Navigation"
        >
          <button
            type="button"
            className={`flex flex-col items-center gap-1 min-w-16 py-1 text-xs font-medium pressable ${
              tab === "talk" ? "text-fg" : "text-muted"
            }`}
            onClick={() => setTab("talk")}
          >
            <div className={`p-1.5 rounded-full ${tab === "talk" ? "bg-subtle text-fg" : "text-muted"}`}>
              <MessageSquare className="size-4" />
            </div>
            <span>Random Chat</span>
          </button>
          <button
            type="button"
            className={`flex flex-col items-center gap-1 min-w-16 py-1 text-xs font-medium pressable ${
              tab === "events" ? "text-fg" : "text-muted"
            }`}
            onClick={() => setTab("events")}
          >
            <div className={`p-1.5 rounded-full ${tab === "events" ? "bg-subtle text-fg" : "text-muted"}`}>
              <CalendarDays className="size-4" />
            </div>
            <span>Events</span>
          </button>
        </nav>
      )}
    </div>
  );
}
