import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Check, Compass, MapPin, Plus, Search, Share2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { forgetHost, hostTokenFor, loadHostTokens, loadRsvpToken, rememberHost } from "@/lib/elsewhere/client";
import { deleteGathering, listGatherings, postGathering, rsvpGathering } from "@/lib/elsewhere/events.functions";
import type { EventDTO, Place } from "@/lib/elsewhere/types";

const EVENT_TAGS = [
  "All",
  "Music",
  "Food",
  "Night walks",
  "Games",
  "Film",
  "Art",
  "Books",
  "Tech & Code",
  "Startups",
  "Sports",
  "Travel",
];

function whenValue(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(19, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Time to be set";
  return format(date, "EEE d MMM · HH:mm");
}

export function EventsPane({ place }: { place: Place }) {
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [filter, setFilter] = useState<"city" | "region" | "all">("all");
  const [selectedTag, setSelectedTag] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [city, setCity] = useState(place.city);
  const [region, setRegion] = useState(place.region);
  const [country, setCountry] = useState(place.country);
  const [spot, setSpot] = useState("");
  const [startsAt, setStartsAt] = useState(whenValue(1));
  const [tagText, setTagText] = useState("");
  const [hostLabel, setHostLabel] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (place.city) setCity((current) => current || place.city);
    if (place.region) setRegion((current) => current || place.region);
    if (place.country) setCountry((current) => current || place.country);
  }, [place]);

  async function refresh() {
    const token = loadRsvpToken();
    const result = await listGatherings({ data: { token, hostTokens: loadHostTokens() } });
    if (!result.ok) {
      setError(result.error);
      setEvents(result.events);
      return;
    }
    setError(null);
    setEvents(result.events);
  }

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const result = await listGatherings({ data: { token: loadRsvpToken(), hostTokens: loadHostTokens() } });
      if (cancel) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        setEvents(result.events);
        return;
      }
      setEvents(result.events);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const myCity = (place.city || "").toLowerCase().trim();
    const myRegion = (place.region || "").toLowerCase().trim();

    return events.filter((event) => {
      const evCity = (event.city || "").toLowerCase().trim();
      const evRegion = (event.region || "").toLowerCase().trim();

      if (filter === "city" && myCity) {
        if (evCity !== myCity) return false;
      } else if (filter === "region" && (myRegion || myCity)) {
        const matchRegion = myRegion && evRegion === myRegion;
        const matchCity = myCity && evCity === myCity;
        if (!matchRegion && !matchCity) return false;
      }

      if (selectedTag !== "All") {
        const hasTag = event.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());
        if (!hasTag) return false;
      }

      if (!needle) return true;
      const hay = `${event.title} ${event.city} ${event.region || ""} ${event.country || ""} ${event.place} ${event.tags.join(" ")} ${event.blurb}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [events, filter, place.city, place.region, query, selectedTag]);

  async function toggle(event: EventDTO) {
    const result = await rsvpGathering({ data: { eventId: event.id, token: loadRsvpToken() } });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEvents((current) =>
      current.map((item) =>
        item.id === event.id
          ? {
              ...item,
              going: result.going,
              goingCount: Math.max(0, item.goingCount + (result.going ? 1 : -1)),
            }
          : item,
      ),
    );
  }

  async function remove(event: EventDTO) {
    const hostToken = hostTokenFor(event.id);
    if (!hostToken) return;
    const result = await deleteGathering({ data: { eventId: event.id, hostToken } });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    forgetHost(event.id);
    setEvents((current) => current.filter((item) => item.id !== event.id));
  }

  function shareEvent(event: EventDTO) {
    const loc = [event.place, event.city, event.region].filter(Boolean).join(", ");
    const shareText = `Check out "${event.title}" on Elsewhere in ${loc} (${formatWhen(event.startsAt)})`;
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(shareText);
      setCopiedId(event.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  }

  async function publish() {
    setPosting(true);
    setError(null);
    const parsed = new Date(startsAt);
    if (Number.isNaN(parsed.getTime())) {
      setError("Pick a valid date and time.");
      setPosting(false);
      return;
    }
    try {
      const result = await postGathering({
        data: {
          title,
          blurb,
          city,
          region,
          country,
          place: spot,
          startsAt: parsed.toISOString(),
          tags: tagText.split(",").map((tag) => tag.trim()).filter(Boolean),
          hostLabel,
          token: loadRsvpToken(),
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      rememberHost(result.id, result.hostToken);
      setOpen(false);
      setTitle("");
      setBlurb("");
      setSpot("");
      setTagText("");
      setHostLabel("");
      await refresh();
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="rise-in mx-auto flex w-full max-w-3xl flex-col gap-6 py-6 pb-20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-2.5 py-1 text-xs font-medium text-fg">
              <Calendar className="size-3.5 text-blue-400" />
              <span>Public Board</span>
            </span>
            <span className="text-xs font-semibold tracking-wide text-faint uppercase">Gatherings</span>
          </div>
          <h1 className="font-display text-4xl leading-tight text-fg mt-2">Local Events</h1>
          <p className="mt-1 max-w-lg text-sm text-muted">
            Find casual local meetups, listening parties, walks, and game nights filtered by Province/State and City.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 sm:self-start">
          <Plus className="size-4" />
          Post a Gathering
        </Button>
      </div>

      {/* Filter bar by City / Province / State / All */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex rounded-md border border-line p-0.5 bg-surface text-xs font-medium">
              <button
                type="button"
                className={`pressable min-h-8 rounded-sm px-3 text-xs transition-colors ${
                  filter === "city" ? "bg-subtle text-fg font-semibold shadow-xs" : "text-muted hover:text-fg"
                }`}
                onClick={() => setFilter("city")}
              >
                Same City {place.city ? `(${place.city})` : ""}
              </button>
              <button
                type="button"
                className={`pressable min-h-8 rounded-sm px-3 text-xs transition-colors ${
                  filter === "region" ? "bg-subtle text-fg font-semibold shadow-xs" : "text-muted hover:text-fg"
                }`}
                onClick={() => setFilter("region")}
              >
                Same Province/State {place.region ? `(${place.region})` : ""}
              </button>
              <button
                type="button"
                className={`pressable min-h-8 rounded-sm px-3 text-xs transition-colors ${
                  filter === "all" ? "bg-subtle text-fg font-semibold shadow-xs" : "text-muted hover:text-fg"
                }`}
                onClick={() => setFilter("all")}
              >
                All Locations
              </button>
            </div>

            <span className="text-xs text-faint flex items-center gap-1">
              <Compass className="size-3 text-emerald-400" />
              <span>{visible.length} gatherings found</span>
            </span>
          </div>

          <div className="relative w-full">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
            <Input
              value={query}
              placeholder="Search by city, province, state, title, or topic…"
              aria-label="Filter gatherings"
              className="pl-9 text-xs"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        {/* Topic chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {EVENT_TAGS.map((tag) => {
            const on = selectedTag === tag;
            return (
              <button
                key={tag}
                type="button"
                className={`pressable shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
                  on
                    ? "border-accent bg-accent text-accent-fg font-semibold shadow-xs"
                    : "border-line bg-surface text-muted hover:text-fg hover:border-faint"
                }`}
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Events list */}
      <div className="flex flex-col gap-3">
        {visible.length === 0 && (
          <div className="rounded-xl border border-line bg-surface/50 p-8 text-center flex flex-col items-center gap-2">
            <MapPin className="size-8 text-faint" />
            <p className="font-display text-lg text-fg">No gatherings found for this location filter</p>
            <p className="text-xs text-muted max-w-sm">
              Try switching the filter to &quot;All Locations&quot; or be the first to post a gathering in{" "}
              {place.city || "your city"}!
            </p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setFilter("all")}>
              View All Locations
            </Button>
          </div>
        )}

        {visible.map((event) => (
          <article
            key={event.id}
            className="flex flex-col gap-3 rounded-xl border border-line bg-surface/70 p-4 transition-all hover:border-faint shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-emerald-400">
                {formatWhen(event.startsAt)}
              </span>
              <button
                type="button"
                className="pressable text-xs text-muted hover:text-fg flex items-center gap-1"
                onClick={() => shareEvent(event)}
                title="Copy share link"
              >
                {copiedId === event.id ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <Check className="size-3" />
                    Copied
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Share2 className="size-3" />
                    Share
                  </span>
                )}
              </button>
            </div>

            <div>
              <h2 className="font-display text-2xl leading-tight text-fg">{event.title}</h2>
              <p className="text-xs text-muted flex items-center gap-1.5 mt-1">
                <MapPin className="size-3.5 shrink-0 text-emerald-400" />
                <span className="font-medium text-fg">{event.place}</span>
                <span>·</span>
                <span>
                  {[event.city, event.region, event.country].filter(Boolean).join(", ")}
                </span>
              </p>
            </div>

            {event.blurb && <p className="text-sm text-fg/90 leading-relaxed line-clamp-3">{event.blurb}</p>}

            <div className="flex flex-wrap gap-1.5">
              {event.tags.map((tag) => (
                <Badge key={tag} className="text-xs py-0.5 px-2">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between gap-3 pt-3 border-t border-line/60">
              <p className="text-xs text-faint tabular-nums flex items-center gap-1.5">
                <Users className="size-3.5 text-emerald-400" />
                <span>
                  {event.goingCount} attending · Host: {event.hostLabel}
                </span>
              </p>
              <div className="flex gap-2">
                {event.mine && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void remove(event)}
                    className="text-xs text-muted hover:text-red-400"
                  >
                    Remove
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={event.going ? "primary" : "outline"}
                  onClick={() => void toggle(event)}
                  className={event.going ? "bg-emerald-600 hover:bg-emerald-500 text-white" : ""}
                >
                  {event.going ? "Going ✓" : "I'll go"}
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Post a Gathering Modal */}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Post a gathering"
        description="Public on this board for everyone in your city or region. No account needed."
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void publish();
          }}
        >
          <label className="flex flex-col gap-1 text-sm text-fg">
            Title / Name
            <Input
              value={title}
              maxLength={80}
              placeholder="e.g. Acoustic guitar rooftop session"
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-fg">
            What happens
            <Textarea
              value={blurb}
              maxLength={280}
              placeholder="Brief description of the gathering…"
              onChange={(event) => setBlurb(event.target.value)}
            />
          </label>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs text-fg">
              City *
              <Input
                value={city}
                maxLength={48}
                placeholder="e.g. Toronto"
                onChange={(event) => setCity(event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-fg">
              Province / State *
              <Input
                value={region}
                maxLength={48}
                placeholder="e.g. Ontario / California"
                onChange={(event) => setRegion(event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-fg">
              Country
              <Input
                value={country}
                maxLength={48}
                placeholder="e.g. Canada"
                onChange={(event) => setCountry(event.target.value)}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm text-fg">
            Meeting Spot / Venue *
            <Input
              value={spot}
              maxLength={80}
              placeholder="e.g. Trinity Bellwoods park benches"
              onChange={(event) => setSpot(event.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-fg">
            Date & Time
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-fg">
            Tags (comma separated)
            <Input
              value={tagText}
              placeholder="e.g. Music, Night walks, Food"
              onChange={(event) => setTagText(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-fg">
            Posted as (Your handle / nickname)
            <Input
              value={hostLabel}
              maxLength={32}
              placeholder="e.g. Alex or A neighbor"
              onChange={(event) => setHostLabel(event.target.value)}
            />
          </label>
          <Button type="submit" disabled={posting} className="mt-2 min-h-11">
            {posting ? "Publishing…" : "Publish Gathering"}
          </Button>
        </form>
      </Dialog>
    </section>
  );
}
