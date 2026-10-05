import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, Send, Video, VideoOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatPlace } from "@/lib/elsewhere/format";
import { MediaCall } from "@/lib/elsewhere/media-call";
import type { CallMode, LaneDTO } from "@/lib/elsewhere/types";

type Line = { id: string; fromSelf: boolean; body: string };
type MediaKind = Exclude<CallMode, "off">;

function bindStream(node: HTMLVideoElement | null, stream: MediaStream | null) {
  if (node && stream && node.srcObject !== stream) node.srcObject = stream;
}

function ring() {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const now = ctx.currentTime;
  [523.25, 659.25].forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = now + index * 0.18;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.05, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.18);
  });
  window.setTimeout(() => void ctx.close().catch(() => {}), 700);
}

function failureCopy(caught: unknown, kind: MediaKind) {
  const name = caught instanceof DOMException ? caught.name : "";
  if (kind === "voice") {
    if (name === "NotAllowedError") return "Microphone permission was blocked. Text still works.";
    if (name === "NotFoundError") return "No microphone was found. Text still works.";
    return "The microphone didn't start. Text still works.";
  }
  if (name === "NotAllowedError") return "Camera permission was blocked. Text still works.";
  if (name === "NotFoundError") return "No camera was found. Text still works.";
  return "The camera didn't start. Text still works.";
}

function VoiceTile({ title, detail, live }: { title: string; detail: string; live: boolean }) {
  return (
    <figure className="flex aspect-video flex-col items-center justify-center gap-3 rounded-md bg-subtle px-3">
      <span
        className={`flex size-12 items-center justify-center rounded-full border border-line bg-surface text-fg ${live ? "pulse-soft" : ""}`}
      >
        <Phone className="size-5" />
      </span>
      <figcaption className="max-w-full text-center">
        <p className="truncate text-sm text-fg">{title}</p>
        <p className="text-xs text-muted">{detail}</p>
      </figcaption>
    </figure>
  );
}

export function ChatPane({
  selfId,
  lane,
  lines,
  ended,
  typing,
  hosted,
  error,
  onSend,
  onCall,
  onNext,
  onClose,
}: {
  selfId: string;
  lane: LaneDTO | null;
  lines: Line[];
  ended: boolean;
  typing: boolean;
  hosted: boolean;
  error: string | null;
  onSend: (body: string) => Promise<void> | void;
  onCall: (mode: CallMode) => Promise<boolean>;
  onNext: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [ask, setAsk] = useState<MediaKind | null>(null);
  const [hostedNote, setHostedNote] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [remoteLive, setRemoteLive] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const scroller = useRef<HTMLDivElement | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const rang = useRef(false);
  const epoch = useRef(0);
  const arming = useRef(false);
  const sawPartner = useRef(false);
  const partner = lane?.partner;

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [lines, typing]);

  useEffect(() => {
    if (!localStream) return;
    for (const track of localStream.getAudioTracks()) track.enabled = !muted;
  }, [localStream, muted]);

  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach((track) => track.stop());
    };
  }, [localStream]);

  const laneId = lane?.id;
  const partnerId = lane?.partner.id;
  const partnerVoice = Boolean(lane?.partnerVoice);
  const partnerVideo = Boolean(lane?.partnerVideo);
  const partnerReady = partnerVoice || partnerVideo;
  const selfCity = lane?.self.city ?? "Guest";
  const hasLocalVideo = Boolean(localStream?.getVideoTracks().some((track) => track.readyState !== "ended"));

  useEffect(() => {
    if (!ended || !localStream) return;
    epoch.current += 1;
    setLocalStream(null);
    setRemoteLive(false);
    setMuted(false);
  }, [ended, localStream]);

  useEffect(() => {
    if (!partnerVoice) setDismissed(false);
  }, [partnerVoice]);

  useEffect(() => {
    if (localStream) {
      arming.current = false;
      return;
    }
    if (arming.current || hosted || ended || !lane) return;
    if (lane.youVoice || lane.youVideo) void onCall("off");
  }, [ended, hosted, lane, localStream, onCall]);

  useEffect(() => {
    const incoming = partnerVoice && !localStream && !ended && !hosted;
    if (incoming && !rang.current) {
      rang.current = true;
      ring();
    }
    if (!partnerVoice) rang.current = false;
  }, [ended, hosted, localStream, partnerVoice]);

  useEffect(() => {
    if (!localStream || ended || hosted) {
      if (!localStream) sawPartner.current = false;
      return;
    }
    if (partnerReady) {
      sawPartner.current = true;
      return;
    }
    if (!sawPartner.current) return;
    epoch.current += 1;
    sawPartner.current = false;
    setLocalStream(null);
    setRemoteLive(false);
    setMuted(false);
    void onCall("off");
  }, [ended, hosted, localStream, onCall, partnerReady]);

  useEffect(() => {
    if (!laneId || !partnerId || hosted || ended || !localStream || !partnerReady) return;
    if (!remoteStream.current) remoteStream.current = new MediaStream();
    const remote = remoteStream.current;
    let dead = false;
    const call = new MediaCall({
      laneId,
      selfId,
      remoteId: partnerId,
      name: selfCity,
      stream: localStream,
      onRemote: () => {
        if (!dead) setRemoteLive(true);
      },
    });
    void call.start().then(() => {
      if (dead) call.close();
    });
    return () => {
      dead = true;
      setRemoteLive(false);
      call.close();
      remote.getTracks().forEach((track) => remote.removeTrack(track));
    };
  }, [ended, hosted, laneId, localStream, partnerId, partnerReady, selfCity, selfId]);

  function hangUp() {
    epoch.current += 1;
    arming.current = false;
    setLocalStream(null);
    setRemoteLive(false);
    setMuted(false);
    void onCall("off");
  }

  async function restoreVoice(ticket: number) {
    arming.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (ticket !== epoch.current) {
        arming.current = false;
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const ok = await onCall("voice");
      if (ticket !== epoch.current || !ok) {
        arming.current = false;
        stream.getTracks().forEach((track) => track.stop());
        if (ticket === epoch.current) setLocalStream(null);
        return;
      }
      setLocalStream(stream);
    } catch {
      arming.current = false;
      if (ticket === epoch.current) {
        setLocalStream(null);
        void onCall("off");
      }
    }
  }

  async function startMedia(kind: MediaKind) {
    setAsk(null);
    setMediaError(null);
    const replacing = Boolean(localStream);
    const ticket = ++epoch.current;
    arming.current = true;
    localStream?.getTracks().forEach((track) => track.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === "video" ? { video: { facingMode: "user" }, audio: true } : { audio: true },
      );
      if (ticket !== epoch.current) {
        arming.current = false;
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const ok = await onCall(kind);
      if (ticket !== epoch.current || !ok) {
        arming.current = false;
        stream.getTracks().forEach((track) => track.stop());
        if (ticket === epoch.current && replacing) await restoreVoice(ticket);
        return;
      }
      setMuted(false);
      setDismissed(false);
      setLocalStream(stream);
    } catch (caught) {
      if (ticket !== epoch.current) return;
      if (replacing && kind === "video") {
        setMediaError(failureCopy(caught, kind));
        await restoreVoice(ticket);
        return;
      }
      arming.current = false;
      if (replacing) {
        setLocalStream(null);
        void onCall("off");
      }
      setMediaError(failureCopy(caught, kind));
    }
  }

  async function submit() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    try {
      await onSend(body);
    } finally {
      setSending(false);
    }
  }

  const title = hosted ? partner?.id || "Traveler" : partner ? formatPlace(partner) : "Lane";
  const eyebrow = hosted ? "Hosted traveler" : "Stranger";
  const selfPlace = lane ? formatPlace(lane.self) : "You";
  const inCall = Boolean(localStream) && !hosted;
  const incoming = !hosted && !ended && !localStream && partnerVoice && !dismissed;
  const status = remoteLive ? "Connected" : partnerReady ? "Connecting…" : "Waiting for them";
  const partnerLabel = partner?.city || "Them";

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-col gap-3 border-b border-line py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-faint uppercase">{eyebrow}</p>
            <h1 className="truncate font-display text-3xl leading-tight text-fg">{title}</h1>
            {hosted && partner && <p className="mt-1 text-sm text-muted">{formatPlace(partner)}</p>}
            <p className="mt-1 text-sm text-muted">You · {selfPlace}</p>
          </div>
          {hosted && <Badge>Hosted</Badge>}
        </div>
        {partner && partner.interests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {partner.interests.map((tag) => {
              const shared = lane?.self.interests.some((item) => item.toLowerCase() === tag.toLowerCase());
              return (
                <Badge key={tag} className={shared ? "border-accent bg-accent text-accent-fg" : undefined}>
                  {tag}
                </Badge>
              );
            })}
          </div>
        )}
      </header>

      {incoming && (
        <div className="mt-4 flex flex-col gap-3 rounded-md border border-line bg-subtle p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="pulse-soft flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-fg">
              {partnerVideo ? <Video className="size-4" /> : <Phone className="size-4" />}
            </span>
            <div>
              <p className="text-sm text-fg">{partnerVideo ? "Video call" : "Voice call"}</p>
              <p className="text-xs text-muted">They're waiting. Answer to join.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => void startMedia(partnerVideo ? "video" : "voice")}>Answer</Button>
            <Button variant="ghost" onClick={() => setDismissed(true)}>
              Not now
            </Button>
          </div>
        </div>
      )}

      {inCall && (
        <div className="grid grid-cols-2 gap-2 pt-4">
          {hasLocalVideo ? (
            <figure className="overflow-hidden rounded-md bg-subtle">
              <video
                className="aspect-video w-full object-cover"
                autoPlay
                playsInline
                muted
                ref={(node) => bindStream(node, localStream)}
              />
              <figcaption className="px-2 py-1 text-xs text-muted">You{muted ? " · muted" : ""}</figcaption>
            </figure>
          ) : (
            <VoiceTile title="You" detail={muted ? "Muted" : "On the line"} live={!muted} />
          )}
          {partnerVideo ? (
            <figure className="overflow-hidden rounded-md bg-subtle">
              <video
                className="aspect-video w-full bg-bg object-cover"
                autoPlay
                playsInline
                muted
                ref={(node) => bindStream(node, remoteStream.current)}
              />
              <figcaption className="px-2 py-1 text-xs text-muted">{status}</figcaption>
            </figure>
          ) : (
            <VoiceTile title={partnerLabel} detail={status} live={remoteLive} />
          )}
        </div>
      )}
      {inCall && (
        <audio
          className="sr-only"
          autoPlay
          ref={(node) => {
            const stream = remoteStream.current;
            if (node && stream && node.srcObject !== stream) node.srcObject = stream;
            if (node && remoteLive) void node.play().catch(() => {});
          }}
        />
      )}

      <div ref={scroller} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-4">
        {lines.length === 0 && !ended && <p className="text-sm text-faint">You're connected. Say hello.</p>}
        {lines.map((line) => (
          <div key={line.id} className={`flex ${line.fromSelf ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[85%] rounded-md px-3 py-2 text-sm break-words ${
                line.fromSelf ? "bg-subtle text-fg" : "border border-line text-fg"
              }`}
            >
              {line.body}
            </p>
          </div>
        ))}
        {typing && <p className="text-sm text-faint">Typing…</p>}
        {ended && <p className="text-sm text-muted">They left the lane.</p>}
        {(error || mediaError) && <p className="text-sm text-muted">{error || mediaError}</p>}
      </div>

      <form
        className="pb-safe flex flex-col gap-3 border-t border-line pt-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {!ended && (
          <div className="flex items-end gap-2">
            <label className="sr-only" htmlFor="composer">
              Message
            </label>
            <textarea
              id="composer"
              rows={1}
              value={draft}
              maxLength={500}
              placeholder="Write a message"
              className="min-h-11 flex-1 resize-none rounded-sm border border-line bg-bg px-3 py-3 text-sm text-fg placeholder:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/25"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
            />
            <Button type="submit" size="icon" aria-label="Send" disabled={!draft.trim() || sending}>
              <Send className="size-4" />
            </Button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {!hosted && !ended &&
            (localStream ? (
              <>
                {hasLocalVideo ? (
                  <Button variant="outline" onClick={hangUp}>
                    <VideoOff className="size-4" />
                    Stop video
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={hangUp}>
                      <PhoneOff className="size-4" />
                      Hang up
                    </Button>
                    <Button variant="outline" onClick={() => void startMedia("video")}>
                      <Video className="size-4" />
                      Camera
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => setMuted((value) => !value)} aria-pressed={muted}>
                  {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                  {muted ? "Unmute" : "Mute"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setAsk("voice")}>
                  <Phone className="size-4" />
                  Voice
                </Button>
                <Button variant="outline" onClick={() => setAsk("video")}>
                  <Video className="size-4" />
                  Video
                </Button>
              </>
            ))}
          {hosted && !ended && (
            <>
              <Button variant="outline" onClick={() => setHostedNote(true)}>
                <Phone className="size-4" />
                Voice
              </Button>
              <Button variant="outline" onClick={() => setHostedNote(true)}>
                <Video className="size-4" />
                Video
              </Button>
            </>
          )}
          <Button variant="outline" onClick={onNext}>
            Next
          </Button>
          <Button variant="ghost" onClick={onClose}>
            End
          </Button>
        </div>
      </form>

      <Dialog
        open={ask !== null}
        onOpenChange={(open) => {
          if (!open) setAsk(null);
        }}
        title={ask === "video" ? "Start video" : "Start a voice call"}
        description="The call connects your browsers directly. Text stays on the relay. A direct call can reveal a network address — skip it if you'd rather not."
      >
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void startMedia(ask === "video" ? "video" : "voice")}>
            {ask === "video" ? "Start camera" : "Start call"}
          </Button>
          <Button variant="ghost" onClick={() => setAsk(null)}>
            Not now
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={hostedNote}
        onOpenChange={setHostedNote}
        title="Text only"
        description="Hosted travelers stay on text. Open a lane with a person when you want a voice or video call."
      >
        <Button onClick={() => setHostedNote(false)}>Okay</Button>
      </Dialog>
    </section>
  );
}
