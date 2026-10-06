import { useEffect, useState } from "react";
import {
  Globe,
  MapPin,
  Mic,
  Sparkles,
  Shuffle,
  Users,
  Navigation,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationPartnerFilter } from "@/components/elsewhere/location-partner-filter";
import type { ChatMedium, LocationScope, Place } from "@/lib/elsewhere/types";

const PRESET_INTERESTS = [
  { name: "Music", icon: "🎵" },
  { name: "Film", icon: "🎬" },
  { name: "Food", icon: "🍕" },
  { name: "Night walks", icon: "🚶" },
  { name: "Books", icon: "📚" },
  { name: "Games", icon: "🎮" },
  { name: "Tech & Code", icon: "💻" },
  { name: "Art", icon: "🎨" },
  { name: "Travel", icon: "🌏" },
  { name: "Startups", icon: "🚀" },
  { name: "Sports", icon: "⚽" },
  { name: "Coffee", icon: "☕" },
  { name: "Anime", icon: "🌸" },
  { name: "Late hours", icon: "🌙" },
];

export function Lobby({
  place,
  locating: _locating,
  people,
  error,
  onStart,
}: {
  place: Place;
  locating: boolean;
  people: number | null;
  error: string | null;
  onStart: (value: {
    place: Place;
    interests: string[];
    openMatch: boolean;
    scope: LocationScope;
    medium: ChatMedium;
  }) => void;
}) {
  const [city, setCity] = useState(place.city);
  const [region, setRegion] = useState(place.region);
  const [country, setCountry] = useState(place.country);
  const [touched, setTouched] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [scope, setScope] = useState<LocationScope>("worldwide");
  const [medium, setMedium] = useState<ChatMedium>("voice");
  const [tags, setTags] = useState<string[]>(["Music", "Night walks"]);
  const [draft, setDraft] = useState("");
  const [openMatch, setOpenMatch] = useState(false);
  const [showManualEdit, setShowManualEdit] = useState(false);

  useEffect(() => {
    if (!touched) {
      if (place.city) setCity(place.city);
      if (place.region) setRegion(place.region);
      if (place.country) setCountry(place.country);
    }
  }, [place, touched]);

  function toggle(tag: string) {
    setTags((current) =>
      current.some((item) => item.toLowerCase() === tag.toLowerCase())
        ? current.filter((item) => item.toLowerCase() !== tag.toLowerCase())
        : [...current, tag].slice(0, 8),
    );
  }

  function addDraft() {
    const next = draft.trim().replace(/\s+/g, " ").slice(0, 24);
    if (!next) return;
    toggle(next);
    setDraft("");
  }

  async function detectGps() {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          // Use OpenStreetMap reverse geocoding to resolve Province/State and City
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=10&addressdetails=1`,
            { headers: { Accept: "application/json" } },
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const detectedCity = addr.city || addr.town || addr.village || addr.municipality || "";
            const detectedRegion = addr.state || addr.province || addr.region || "";
            const detectedCountry = addr.country || "";
            if (detectedCity || detectedRegion) {
              setTouched(true);
              if (detectedCity) setCity(detectedCity);
              if (detectedRegion) setRegion(detectedRegion);
              if (detectedCountry) setCountry(detectedCountry);
            }
          }
        } catch {
          // fallback gracefully
        } finally {
          setGpsLoading(false);
        }
      },
      () => {
        setGpsLoading(false);
      },
      { timeout: 8000 },
    );
  }

  const effectivePlace: Place = {
    city: city.trim() || place.city || "San Francisco",
    region: region.trim() || place.region || "California",
    country: country.trim() || place.country || "United States",
  };

  const needsTag = !openMatch && tags.length === 0;

  function handleStart(mode: ChatMedium = medium, chosenScope: LocationScope = scope) {
    onStart({
      place: effectivePlace,
      interests: tags,
      openMatch: openMatch || tags.length === 0,
      scope: chosenScope,
      medium: mode,
    });
  }

  return (
    <section className="rise-in mx-auto flex w-full max-w-xl flex-col gap-6 py-6 pb-24 sm:py-10 sm:pb-12">
      {/* Header & Live stats */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 py-1 text-xs font-medium text-fg">
            <span className="inline-block size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="tabular-nums">
              {people === null
                ? "Locating lanes…"
                : people === 0
                  ? "Open for connection"
                  : `${people} active ${people === 1 ? "lane" : "lanes"}`}
            </span>
          </span>
          <span className="text-xs font-semibold tracking-wide text-emerald-400 uppercase">
            Live Random Match
          </span>
        </div>
        <h1 className="font-display text-4xl leading-tight tracking-tight text-fg sm:text-5xl">
          Meet someone by City, State & Interests.
        </h1>
        <p className="max-w-lg text-sm text-muted">
          Spontaneous random matching filtered by your Province/State, City, and shared interests — with instant random voice chat.
        </p>
      </div>

      {/* QUICK MATCH ACTION TILES */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Instant Voice Chat Card */}
        <div
          className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-all cursor-pointer ${
            medium === "voice"
              ? "border-emerald-500 bg-gradient-to-br from-emerald-950/40 via-surface to-surface shadow-sm ring-1 ring-emerald-500/50"
              : "border-line bg-surface/70 hover:border-faint"
          }`}
          onClick={() => setMedium("voice")}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                <Mic className="size-4" />
                Random Voice Chat
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Audio
              </span>
            </div>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              Auto-connects microphone when matched. Talk hands-free to strangers around your area or worldwide.
            </p>
          </div>
          <Button
            size="sm"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1.5 min-h-10 mt-1"
            onClick={(e) => {
              e.stopPropagation();
              handleStart("voice", scope);
            }}
          >
            <Mic className="size-3.5" />
            Start Voice Chat Now
          </Button>
        </div>

        {/* Instant Text / Speed Match */}
        <div
          className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-all cursor-pointer ${
            medium === "text"
              ? "border-blue-500 bg-gradient-to-br from-blue-950/30 via-surface to-surface shadow-sm ring-1 ring-blue-500/50"
              : "border-line bg-surface/70 hover:border-faint"
          }`}
          onClick={() => setMedium("text")}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-fg uppercase tracking-wide flex items-center gap-1.5">
                <Shuffle className="size-4 text-blue-400" />
                Instant Text Match
              </span>
              <span className="text-[10px] text-faint">Fastest</span>
            </div>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              Casual text chat with icebreakers and topic tags. Upgrade to voice or video anytime with one tap.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full border-line hover:bg-subtle text-fg font-medium text-xs gap-1.5 min-h-10 mt-1"
            onClick={(e) => {
              e.stopPropagation();
              handleStart("text", scope);
            }}
          >
            <Sparkles className="size-3.5 text-amber-400" />
            Quick Random Match
          </Button>
        </div>
      </div>

      {/* 1. LOCATION PARTNER FILTER COMPONENT (SEARCH BAR & DROPDOWN) */}
      <LocationPartnerFilter
        place={effectivePlace}
        scope={scope}
        onScopeChange={setScope}
        onPlaceChange={(newPlace) => {
          setTouched(true);
          setCity(newPlace.city);
          setRegion(newPlace.region);
          setCountry(newPlace.country);
        }}
      />

      {/* Optional Manual GPS & Coordinates Fine-Tuning */}
      <div className="flex flex-col gap-2 -mt-3 px-1">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="text-[11px] text-muted hover:text-fg underline pressable flex items-center gap-1 font-medium"
            onClick={() => setShowManualEdit((v) => !v)}
          >
            <MapPin className="size-3 text-emerald-400" />
            <span>{showManualEdit ? "Hide manual coordinate inputs" : "Manual City/State inputs or GPS auto-detect"}</span>
          </button>
          <Button
            variant="outline"
            size="sm"
            className="text-[11px] h-7 px-2.5 gap-1 border-line text-muted hover:text-fg"
            onClick={detectGps}
            disabled={gpsLoading}
          >
            <Navigation className={`size-3 text-emerald-400 ${gpsLoading ? "animate-spin" : ""}`} />
            <span>{gpsLoading ? "Detecting GPS…" : "GPS Detect"}</span>
          </Button>
        </div>

        {showManualEdit && (
          <div className="rounded-xl border border-line/60 bg-surface/40 p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-in fade-in duration-200">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-faint" htmlFor="city-input">
                City
              </label>
              <Input
                id="city-input"
                value={city}
                placeholder="e.g. Toronto"
                maxLength={48}
                className="text-xs"
                onChange={(e) => {
                  setTouched(true);
                  setCity(e.target.value);
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-faint" htmlFor="region-input">
                Province / State
              </label>
              <Input
                id="region-input"
                value={region}
                placeholder="e.g. Ontario / California"
                maxLength={48}
                className="text-xs"
                onChange={(e) => {
                  setTouched(true);
                  setRegion(e.target.value);
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-faint" htmlFor="country-input">
                Country
              </label>
              <Input
                id="country-input"
                value={country}
                placeholder="e.g. Canada"
                maxLength={48}
                className="text-xs"
                onChange={(e) => {
                  setTouched(true);
                  setCountry(e.target.value);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. INTEREST FILTERS */}
      <div className="rounded-xl border border-line bg-surface/60 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-fg uppercase tracking-wide">
              2. Interests & Common Topics
            </p>
            <p className="text-xs text-muted">
              Matching prioritizes people who share your topics
            </p>
          </div>
          <div className="flex rounded-md border border-line p-0.5 text-xs bg-surface shrink-0">
            <button
              type="button"
              className={`pressable px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
                !openMatch ? "bg-subtle text-fg shadow-xs" : "text-muted"
              }`}
              onClick={() => setOpenMatch(false)}
            >
              By Interest
            </button>
            <button
              type="button"
              className={`pressable px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
                openMatch ? "bg-subtle text-fg shadow-xs" : "text-muted"
              }`}
              onClick={() => setOpenMatch(true)}
            >
              Any Topic
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PRESET_INTERESTS.map(({ name, icon }) => {
            const on = tags.some((item) => item.toLowerCase() === name.toLowerCase());
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(name)}
                className={`pressable min-h-8 rounded-full border px-3 text-xs flex items-center gap-1.5 transition-all ${
                  on
                    ? "border-accent bg-accent text-accent-fg font-semibold shadow-xs"
                    : "border-line bg-surface text-muted hover:border-faint hover:text-fg"
                }`}
              >
                <span>{icon}</span>
                <span>{name}</span>
                {on && <Check className="size-3 stroke-[3]" />}
              </button>
            );
          })}
          {tags
            .filter((tag) => !PRESET_INTERESTS.some((p) => p.name.toLowerCase() === tag.toLowerCase()))
            .map((tag) => (
              <button
                key={tag}
                type="button"
                className="pressable min-h-8 rounded-full bg-accent px-3 text-xs text-accent-fg font-semibold flex items-center gap-1"
                onClick={() => toggle(tag)}
              >
                <span>✨ {tag}</span>
                <Check className="size-3 stroke-[3]" />
              </button>
            ))}
        </div>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            addDraft();
          }}
        >
          <Input
            value={draft}
            placeholder="Add custom topic (e.g. Photography, Gym, Hiking, Guitar)"
            maxLength={24}
            aria-label="Custom interest"
            className="text-xs"
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit" variant="outline" size="sm" disabled={!draft.trim()}>
            Add Tag
          </Button>
        </form>
      </div>

      {/* FINAL SUBMIT BUTTON */}
      <div className="flex flex-col gap-3 pt-2">
        <Button
          size="lg"
          disabled={needsTag}
          className={`w-full text-base font-semibold py-3.5 min-h-13 shadow-md gap-2 ${
            medium === "voice"
              ? "bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-500/20"
              : "bg-accent text-accent-fg"
          }`}
          onClick={() => handleStart(medium, scope)}
        >
          {medium === "voice" ? <Mic className="size-5" /> : <Globe className="size-5" />}
          <span>
            {medium === "voice" ? "Start Random Voice Chat" : "Start Random Chat"} (
            {scope === "city"
              ? effectivePlace.city || "City"
              : scope === "region"
                ? effectivePlace.region || "Province/State"
                : scope === "country"
                  ? effectivePlace.country || "Country"
                  : "Worldwide"}
            )
          </span>
        </Button>
        {needsTag && (
          <p className="text-xs text-muted text-center">
            Pick at least one interest above or switch the toggle to &quot;Any Topic&quot;.
          </p>
        )}
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        <div className="flex items-center justify-center gap-2 text-xs text-faint">
          <Users className="size-3.5 shrink-0" />
          <span>Anonymous 1-on-1 relay. Direct P2P voice call. No accounts needed.</span>
        </div>
      </div>
    </section>
  );
}
