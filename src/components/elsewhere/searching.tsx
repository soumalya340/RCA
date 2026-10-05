import { Button } from "@/components/ui/button";
import { formatPlace } from "@/lib/elsewhere/format";
import type { Place } from "@/lib/elsewhere/types";

export function Searching({
  place,
  interests,
  openMatch,
  waited,
  people,
  error,
  onHosted,
  onCancel,
}: {
  place: Place;
  interests: string[];
  openMatch: boolean;
  waited: boolean;
  people: number | null;
  error: string | null;
  onHosted: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="rise-in mx-auto flex w-full max-w-xl flex-col gap-6 py-10 sm:py-16">
      <p className="pulse-soft text-xs font-medium tracking-wide text-faint uppercase">Looking</p>
      <h1 className="font-display text-4xl leading-tight text-fg">Finding a lane.</h1>
      <p className="text-base text-muted">
        {openMatch ? "Anyone, anywhere." : interests.length ? `Matching ${interests.join(", ")}.` : "Matching interests."}{" "}
        You appear as {formatPlace(place)}.
      </p>
      <p className="text-sm text-faint tabular-nums">
        {people === null ? "…" : `${people} ${people === 1 ? "person" : "people"} around`}
      </p>
      {error && <p className="text-sm text-muted">{error}</p>}
      {waited && (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <p className="text-sm text-fg">No one with a matching lane yet.</p>
          <p className="text-sm text-muted">
            A hosted traveler can keep you company. They're labeled, and they stay on text.
          </p>
          <Button onClick={onHosted}>Meet a hosted traveler</Button>
        </div>
      )}
      <Button variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </section>
  );
}
