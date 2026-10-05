import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { forgetHost, hostTokenFor, loadHostTokens, loadRsvpToken, rememberHost } from "@/lib/elsewhere/client";
import { deleteGathering, listGatherings, postGathering, rsvpGathering } from "@/lib/elsewhere/events.functions";
import type { EventDTO, Place } from "@/lib/elsewhere/types";

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
  const [filter, setFilter] = useState<"near" | "all">("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [city, setCity] = useState(place.city);
  const [spot, setSpot] = useState("");
  const [startsAt, setStartsAt] = useState(whenValue(1));
  const [tagText, setTagText] = useState("");
  const [hostLabel, setHostLabel] = useState("");

  useEffect(() => {
    if (place.city) setCity((current) => current || place.city);
  }, [place.city]);

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
    return events.filter((event) => {
      if (filter === "near" && place.city) {
        const near = event.city.toLowerCase() === place.city.toLowerCase();
        if (!near) return false;
      }
      if (!needle) return true;
      const hay = `${event.title} ${event.city} ${event.place} ${event.tags.join(" ")} ${event.blurb}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [events, filter, place.city, query]);

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

  async function publish() {
    setPosting(true);
    setError(null);
    const parsed = new Date(startsAt);
    if (Number.isNaN(parsed.getTime())) {
      setError("Pick a time.");
      setPosting(false);
      return;
    }
    try {
      const result = await postGathering({
        data: {
          title,
          blurb,
          city,
          place: spot,
          startsAt: parsed.toISOString(),
          tags: tagText.split(",").map((tag) => tag.trim()),
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
    <section className="rise-in mx-auto flex w-full max-w-3xl flex-col gap-6 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-faint uppercase">Board</p>
          <h1 className="font-display text-4xl leading-tight text-fg">Gatherings</h1>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Look for something happening, or post one. No account. Anyone here can read the board.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>Post a gathering</Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex rounded-sm border border-line p-1">
          <button
            type="button"
            className={`pressable min-h-9 rounded-xs px-3 text-sm ${filter === "near" ? "bg-subtle text-fg" : "text-muted"}`}
            onClick={() => setFilter("near")}
          >
            Near you
          </button>
          <button
            type="button"
            className={`pressable min-h-9 rounded-xs px-3 text-sm ${filter === "all" ? "bg-subtle text-fg" : "text-muted"}`}
            onClick={() => setFilter("all")}
          >
            Anywhere
          </button>
        </div>
        <Input
          value={query}
          placeholder="Filter by city, tag, or title"
          aria-label="Filter gatherings"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {error && <p className="text-sm text-muted">{error}</p>}
      {loading && <p className="text-sm text-faint">Loading the board…</p>}
      {!loading && visible.length === 0 && (
        <p className="text-sm text-muted">Nothing matches. Post one, or widen the filter.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((event) => (
          <article key={event.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
            <p className="text-xs text-faint tabular-nums">{formatWhen(event.startsAt)}</p>
            <h2 className="font-display text-2xl leading-tight text-fg">{event.title}</h2>
            <p className="text-sm text-muted">
              {event.city} · {event.place}
            </p>
            {event.blurb && <p className="text-sm text-fg">{event.blurb}</p>}
            <div className="flex flex-wrap gap-2">
              {event.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
            <div className="mt-auto flex items-center justify-between gap-3 pt-2">
              <p className="text-xs text-faint tabular-nums">
                {event.goingCount} going · {event.hostLabel}
              </p>
              <div className="flex gap-2">
                {event.mine && (
                  <Button variant="ghost" onClick={() => void remove(event)}>
                    Remove
                  </Button>
                )}
                <Button variant={event.going ? "primary" : "outline"} onClick={() => void toggle(event)}>
                  {event.going ? "Going" : "I'll go"}
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen} title="Post a gathering" description="Public on this board. Don't put a phone number or address you wouldn't say out loud.">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void publish();
          }}
        >
          <label className="flex flex-col gap-1 text-sm text-fg">
            Name
            <Input value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="flex flex-col gap-1 text-sm text-fg">
            What happens
            <Textarea value={blurb} maxLength={280} onChange={(event) => setBlurb(event.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-fg">
              City
              <Input value={city} maxLength={48} onChange={(event) => setCity(event.target.value)} required />
            </label>
            <label className="flex flex-col gap-1 text-sm text-fg">
              Place
              <Input value={spot} maxLength={80} onChange={(event) => setSpot(event.target.value)} required />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm text-fg">
            When
            <Input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required />
          </label>
          <label className="flex flex-col gap-1 text-sm text-fg">
            Tags
            <Input
              value={tagText}
              placeholder="Music, Food"
              onChange={(event) => setTagText(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-fg">
            Posted as
            <Input
              value={hostLabel}
              maxLength={32}
              placeholder="A neighbor"
              onChange={(event) => setHostLabel(event.target.value)}
            />
          </label>
          <Button type="submit" disabled={posting}>
            {posting ? "Posting…" : "Post"}
          </Button>
        </form>
      </Dialog>
    </section>
  );
}
