import { Globe, MapPin, Mic, Sparkles, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPlace } from "@/lib/elsewhere/format";
import type { ChatMedium, LocationScope, Place } from "@/lib/elsewhere/types";

export function Searching({
  place,
  interests,
  openMatch,
  scope,
  medium,
  waited,
  people,
  error,
  onHosted,
  onCancel,
}: {
  place: Place;
  interests: string[];
  openMatch: boolean;
  scope: LocationScope;
  medium: ChatMedium;
  waited: boolean;
  people: number | null;
  error: string | null;
  onHosted: () => void;
  onCancel: () => void;
}) {
  const scopeLabel =
    scope === "city"
      ? `Same City (${place.city || "Local"})`
      : scope === "region"
        ? `Same Province/State (${place.region || "Regional"})`
        : scope === "country"
          ? `Same Country (${place.country || "National"})`
          : "Worldwide (Anywhere)";

  return (
    <section className="rise-in mx-auto flex w-full max-w-xl flex-col items-center text-center gap-6 py-10 sm:py-16">
      {/* Radar pulse visual */}
      <div className="relative flex size-24 items-center justify-center my-2">
        <span
          className={`absolute inline-flex size-full rounded-full animate-ping opacity-75 ${
            medium === "voice" ? "bg-emerald-500/20" : "bg-blue-500/20"
          }`}
        />
        <span
          className={`absolute inline-flex size-16 rounded-full animate-pulse ${
            medium === "voice" ? "bg-emerald-500/30" : "bg-blue-500/30"
          }`}
        />
        <span
          className={`relative flex size-10 items-center justify-center rounded-full text-white font-bold shadow-md ${
            medium === "voice" ? "bg-emerald-500" : "bg-blue-500"
          }`}
        >
          {medium === "voice" ? <Mic className="size-5" /> : medium === "video" ? <Video className="size-5" /> : <Sparkles className="size-5" />}
        </span>
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            {medium === "voice" ? <Mic className="size-3" /> : <Globe className="size-3" />}
            <span>{medium === "voice" ? "Random Voice Queue" : "Random Chat Queue"}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-medium text-fg">
            <MapPin className="size-3 text-faint" />
            <span>{scopeLabel}</span>
          </span>
        </div>

        <h1 className="font-display text-4xl leading-tight text-fg">Finding a match…</h1>
        <p className="text-sm text-muted">
          {openMatch
            ? "Looking for anyone matching your location scope."
            : interests.length
              ? `Filtering for: ${interests.join(", ")}.`
              : "Matching topics."}{" "}
          Your network: {formatPlace(place)}.
        </p>
        <p className="text-xs text-faint tabular-nums mt-1">
          {people === null ? "Connecting to relay…" : `${people} online in relay network`}
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Meet hosted traveler backup option */}
      <div className="w-full max-w-md rounded-xl border border-line bg-surface/70 p-4 text-left flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-faint uppercase">Zero wait option</span>
          <span className="text-[11px] text-emerald-400">Available now</span>
        </div>
        <p className="text-xs text-muted">
          Want to talk immediately? Connect right now with a hosted traveler matched to your location & interests (with voice audio synthesis support!).
        </p>
        <Button onClick={onHosted} variant={waited ? "primary" : "outline"} className="w-full text-xs">
          <Sparkles className="size-3.5 mr-1 text-amber-400" />
          Meet a Traveler Instantly
        </Button>
      </div>

      <Button variant="ghost" onClick={onCancel} className="text-muted hover:text-fg">
        <X className="size-4 mr-1" />
        Cancel Search
      </Button>
    </section>
  );
}
