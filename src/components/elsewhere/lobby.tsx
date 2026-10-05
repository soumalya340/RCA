import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Place } from "@/lib/elsewhere/types";

const PRESETS = [
  "Music",
  "Film",
  "Food",
  "Travel",
  "Night walks",
  "Books",
  "Games",
  "Art",
  "Languages",
  "Sports",
  "Startups",
  "Late hours",
];

export function Lobby({
  place,
  locating,
  people,
  error,
  onStart,
}: {
  place: Place;
  locating: boolean;
  people: number | null;
  error: string | null;
  onStart: (value: { place: Place; interests: string[]; openMatch: boolean }) => void;
}) {
  const [city, setCity] = useState(place.city);
  const [touched, setTouched] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [openMatch, setOpenMatch] = useState(false);

  useEffect(() => {
    if (!touched) setCity(place.city);
  }, [place.city, touched]);

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

  const needsTag = !openMatch && tags.length === 0;
  const hint =
    !touched && (place.region || place.country)
      ? [place.region, place.country].filter(Boolean).join(", ")
      : "";

  return (
    <section className="rise-in mx-auto flex w-full max-w-xl flex-col gap-8 py-8 sm:py-14">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium tracking-wide text-faint uppercase">Open a lane</p>
        <h1 className="font-display text-4xl leading-tight tracking-tight text-fg sm:text-5xl">
          Talk to someone in another city.
        </h1>
        <p className="max-w-lg text-base text-muted">
          Match on an interest, or talk to anyone. Your city comes from your network address. A street
          address never does.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-fg" htmlFor="city">
          Your city
        </label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
          <Input
            id="city"
            className="pl-10"
            value={city}
            placeholder={locating ? "Finding your city…" : "Add a city"}
            maxLength={48}
            onChange={(event) => {
              setTouched(true);
              setCity(event.target.value);
            }}
          />
        </div>
        <p className="text-xs text-faint">
          {locating
            ? "Checking the network…"
            : hint || (touched ? "This is what the other person sees." : "We couldn't place the network. Type a city.")}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-fg">Interests</p>
          <div className="flex rounded-sm border border-line p-1">
            <button
              type="button"
              className={`pressable min-h-9 rounded-xs px-3 text-sm ${openMatch ? "text-muted" : "bg-subtle text-fg"}`}
              onClick={() => setOpenMatch(false)}
            >
              By interest
            </button>
            <button
              type="button"
              className={`pressable min-h-9 rounded-xs px-3 text-sm ${openMatch ? "bg-subtle text-fg" : "text-muted"}`}
              onClick={() => setOpenMatch(true)}
            >
              Anyone
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((tag) => {
            const on = tags.some((item) => item.toLowerCase() === tag.toLowerCase());
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(tag)}
                className={`pressable min-h-9 rounded-full border px-3 text-sm ${
                  on ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface text-muted"
                }`}
              >
                {tag}
              </button>
            );
          })}
          {tags
            .filter((tag) => !PRESETS.some((preset) => preset.toLowerCase() === tag.toLowerCase()))
            .map((tag) => (
              <button
                key={tag}
                type="button"
                className="pressable min-h-9 rounded-full bg-accent px-3 text-sm text-accent-fg"
                onClick={() => toggle(tag)}
              >
                {tag}
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
            placeholder="Add your own"
            maxLength={24}
            aria-label="Custom interest"
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit" variant="outline" disabled={!draft.trim()}>
            Add
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          disabled={needsTag}
          onClick={() =>
            onStart({
              place: touched
                ? { city: city.trim(), region: "", country: "" }
                : { ...place, city: city.trim() || place.city },
              interests: tags,
              openMatch,
            })
          }
        >
          Open a lane
        </Button>
        {needsTag && <p className="text-sm text-muted">Add an interest, or switch to anyone.</p>}
        {error && <p className="text-sm text-muted">{error}</p>}
        <p className="text-sm text-faint tabular-nums">
          {people === null
            ? "Checking who's around…"
            : people === 0
              ? "Quiet right now."
              : `${people} ${people === 1 ? "person" : "people"} around`}
        </p>
        <p className="text-xs text-faint">
          Text stays on the relay. A voice or video call only starts if you both allow it, and that call connects the two
          browsers directly.
        </p>
      </div>
    </section>
  );
}
