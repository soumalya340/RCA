import { useEffect, useRef, useState } from "react";
import {
  Lightbulb,
  MapPin,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Radio,
  Send,
  Sparkles,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatPlace } from "@/lib/elsewhere/format";
import { MediaCall } from "@/lib/elsewhere/media-call";
import type { CallMode, LaneDTO } from "@/lib/elsewhere/types";

const ICEBREAKERS = [
  "What's the weather like in your city right now?",
  "What music are you listening to this week?",
  "What's the best late-night food spot where you live?",
  "Are you a morning person or a night owl?",
  "What's a cool hidden gem about your hometown?",
  "If you could travel anywhere tomorrow, where to?",
  "What was the highlight of your day today?",
];

type Line = { id: string; fromSelf: boolean; body: string; at?: string };
type MediaKind = Exclude<CallMode, "off">;

function formatMessageTime(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function bindStream(node: HTMLVideoElement | null, stream: MediaStream | null) {
  if (node && stream && node.srcObject !== stream) node.srcObject = stream;
}

function Soundwaves({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-1 h-5" aria-hidden="true">
      <span className={`w-1 rounded-full bg-emerald-400 transition-all ${active ? "h-5 animate-pulse" : "h-1.5 opacity-40"}`} />
      <span className={`w-1 rounded-full bg-emerald-400 transition-all ${active ? "h-3.5 animate-pulse [animation-delay:0.15s]" : "h-2 opacity-40"}`} />
      <span className={`w-1 rounded-full bg-emerald-400 transition-all ${active ? "h-4.5 animate-pulse [animation-delay:0.3s]" : "h-1 opacity-40"}`} />
      <span className={`w-1 rounded-full bg-emerald-400 transition-all ${active ? "h-3 animate-pulse [animation-delay:0.2s]" : "h-2.5 opacity-40"}`} />
      <span className={`w-1 rounded-full bg-emerald-400 transition-all ${active ? "h-5 animate-pulse [animation-delay:0.4s]" : "h-1.5 opacity-40"}`} />
    </div>
  );
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

function VoiceTile({
  title,
  detail,
  live,
  speaking,
}: {
  title: string;
  detail: string;
  live: boolean;
  speaking?: boolean;
}) {
  return (
    <figure className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl border border-line bg-subtle/80 px-3 py-2 text-center">
      <div className="relative flex size-12 items-center justify-center">
        {live && <span className="absolute inline-flex size-full rounded-full bg-emerald-500/20 animate-ping" />}
        <span
          className={`flex size-11 items-center justify-center rounded-full border border-line bg-surface text-fg shadow-xs ${
            live ? "border-emerald-500/50 text-emerald-400" : ""
          }`}
        >
          <Phone className="size-5" />
        </span>
      </div>
      <figcaption className="max-w-full text-center flex flex-col items-center gap-0.5">
        <p className="truncate text-xs font-semibold text-fg">{title}</p>
        <p className="text-[11px] text-muted">{detail}</p>
        <Soundwaves active={Boolean(speaking ?? live)} />
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
  onTyping,
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
  onTyping?: (typing: boolean) => void;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [ask, setAsk] = useState<MediaKind | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [remoteLive, setRemoteLive] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hostedSpeaking, setHostedSpeaking] = useState(false);
  const [speechAudio, setSpeechAudio] = useState(true);
  const [hostedVoiceActive, setHostedVoiceActive] = useState(lane?.medium === "voice");
  const [listening, setListening] = useState(false);

  const scroller = useRef<HTMLDivElement | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const rang = useRef(false);
  const epoch = useRef(0);
  const arming = useRef(false);
  const sawPartner = useRef(false);
  const typingTimeout = useRef<number | null>(null);
  const isTypingRef = useRef(false);
  const partner = lane?.partner;

  // Speak hosted persona replies out loud when in voice mode or speech is enabled
  useEffect(() => {
    if (!hosted || !speechAudio || lines.length === 0) return;
    const lastLine = lines[lines.length - 1];
    if (lastLine && !lastLine.fromSelf && typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const clean = lastLine.body.replace(/[^\w\s.,?!'-]/g, " ");
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        setHostedSpeaking(true);
        utterance.onend = () => setHostedSpeaking(false);
        utterance.onerror = () => setHostedSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } catch {
        setHostedSpeaking(false);
      }
    }
  }, [hosted, lines, speechAudio]);

  // Clean up speech synthesis on unmount or end
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  // Auto-connect voice call if lane was started in voice mode
  useEffect(() => {
    if (lane?.medium === "voice" && !localStream && !ended && !hosted && !arming.current) {
      void startMedia("voice");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lane?.medium, ended, hosted]);

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

  useEffect(() => {
    return () => {
      if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTyping?.(false);
      }
    };
  }, [onTyping]);

  useEffect(() => {
    if (ended && isTypingRef.current) {
      if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
      isTypingRef.current = false;
      onTyping?.(false);
    }
  }, [ended, onTyping]);

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
    if (hosted) {
      setHostedVoiceActive(false);
    } else {
      void onCall("off");
    }
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
    if (hosted) {
      setHostedVoiceActive(true);
      return;
    }
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
    if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTyping?.(false);
    }
    setSending(true);
    setDraft("");
    try {
      await onSend(body);
    } finally {
      setSending(false);
    }
  }

  function startSpeechRecognition() {
    if (typeof window === "undefined") return;
    const navWindow = window as unknown as Record<string, unknown>;
    const SpeechRec = (navWindow.SpeechRecognition || navWindow.webkitSpeechRecognition) as
      | (new () => {
          lang: string;
          interimResults: boolean;
          onresult: (event: { results: Array<Array<{ transcript: string }>> }) => void;
          onend: () => void;
          onerror: () => void;
          start: () => void;
        })
      | undefined;
    if (!SpeechRec) {
      setMediaError("Speech recognition is not supported in this browser. You can type your message.");
      return;
    }
    try {
      const recognition = new SpeechRec();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      setListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      recognition.onend = () => setListening(false);
      recognition.onerror = () => setListening(false);
      recognition.start();
    } catch {
      setListening(false);
    }
  }

  const title = hosted ? partner?.id || "Traveler" : partner ? formatPlace(partner) : "Lane";
  const eyebrow = hosted ? "Hosted traveler" : "Stranger";
  const selfPlace = lane ? formatPlace(lane.self) : "You";

  const sameCity = Boolean(
    lane?.self.city && partner?.city && lane.self.city.toLowerCase() === partner.city.toLowerCase(),
  );
  const sameRegion = Boolean(
    lane?.self.region && partner?.region && lane.self.region.toLowerCase() === partner.region.toLowerCase(),
  );
  const sameCountry = Boolean(
    lane?.self.country && partner?.country && lane.self.country.toLowerCase() === partner.country.toLowerCase(),
  );

  const sharedInterests =
    partner?.interests.filter((tag) =>
      lane?.self.interests.some((item) => item.toLowerCase() === tag.toLowerCase()),
    ) || [];

  const inCall = (Boolean(localStream) && !hosted) || (hosted && hostedVoiceActive);
  const incoming = !hosted && !ended && !localStream && partnerVoice && !dismissed;
  const status = remoteLive ? "Audio Connected" : partnerReady ? "Connecting audio…" : "Calling partner…";
  const partnerLabel = partner?.city ? `${partner.id || "Stranger"} (${partner.city})` : partner?.id || "Them";

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {/* Header with Location Proximity & Shared Interests */}
      <header className="flex flex-col gap-3 border-b border-line py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold tracking-wider text-faint uppercase">{eyebrow}</p>
              {sameCity ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                  <MapPin className="size-3" />
                  Same City Match ({partner?.city})
                </span>
              ) : sameRegion ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[11px] font-bold text-blue-300">
                  <MapPin className="size-3" />
                  Same State/Province ({partner?.region})
                </span>
              ) : sameCountry ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                  <MapPin className="size-3" />
                  Same Country ({partner?.country})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface border border-line px-2 py-0.5 text-[11px] text-muted">
                  <Radio className="size-3 text-faint" />
                  Worldwide
                </span>
              )}
            </div>

            <h1 className="truncate font-display text-2xl sm:text-3xl leading-tight text-fg mt-1">
              {title}
            </h1>
            <p className="mt-0.5 text-xs text-muted flex items-center gap-1.5">
              <span>You: {selfPlace}</span>
              {hosted && partner && <span>· Hosted in {formatPlace(partner)}</span>}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {hosted ? (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                Hosted Traveler
              </Badge>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Peer
              </span>
            )}
            {inCall && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                <Mic className="size-3 text-emerald-400 animate-pulse" />
                Voice Active
              </span>
            )}
          </div>
        </div>

        {/* Highlighted Shared Interests & Topics */}
        {partner && partner.interests.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {sharedInterests.length > 0 && (
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1 mr-1">
                <Sparkles className="size-3.5" />
                Shared:
              </span>
            )}
            {partner.interests.map((tag) => {
              const shared = lane?.self.interests.some((item) => item.toLowerCase() === tag.toLowerCase());
              return (
                <Badge
                  key={tag}
                  className={`text-xs px-2.5 py-0.5 ${
                    shared
                      ? "border-amber-500/40 bg-amber-500/20 text-amber-300 font-bold shadow-xs"
                      : "border-line bg-surface/80 text-muted"
                  }`}
                >
                  {shared ? `✨ ${tag}` : tag}
                </Badge>
              );
            })}
          </div>
        )}
      </header>

      {/* INCOMING VOICE/VIDEO CALL PROMPT */}
      {incoming && (
        <div className="mt-3 flex flex-col gap-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 sm:flex-row sm:items-center sm:justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <span className="pulse-soft flex size-10 shrink-0 items-center justify-center rounded-full border border-emerald-500/50 bg-surface text-emerald-400">
              {partnerVideo ? <Video className="size-5" /> : <Phone className="size-5" />}
            </span>
            <div>
              <p className="text-sm font-semibold text-fg">
                Incoming {partnerVideo ? "Video Call" : "Voice Call"}
              </p>
              <p className="text-xs text-muted">Stranger wants to connect audio. Answer to speak.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              onClick={() => void startMedia(partnerVideo ? "video" : "voice")}
            >
              Answer Call
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
              Decline
            </Button>
          </div>
        </div>
      )}

      {/* ACTIVE CALL TILES (Voice or Video) */}
      {inCall && (
        <div className="flex flex-col gap-2 pt-3">
          <div className="grid grid-cols-2 gap-2">
            {hasLocalVideo ? (
              <figure className="overflow-hidden rounded-lg bg-subtle border border-line">
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
              <VoiceTile
                title="You"
                detail={muted ? "Microphone muted" : "Live mic"}
                live={!muted}
                speaking={!muted}
              />
            )}

            {partnerVideo ? (
              <figure className="overflow-hidden rounded-lg bg-subtle border border-line">
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
              <VoiceTile
                title={partnerLabel}
                detail={hosted ? "Speaking aloud via audio synthesis" : status}
                live={hosted ? hostedSpeaking : remoteLive}
                speaking={hosted ? hostedSpeaking : remoteLive}
              />
            )}
          </div>

          {/* Voice call action strip */}
          <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border border-line bg-surface/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium text-emerald-400">
                {hosted ? "Simulated Voice Call" : "Live Voice Call"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {hosted && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2 gap-1 border-line"
                  onClick={() => setSpeechAudio((prev) => !prev)}
                >
                  {speechAudio ? <Volume2 className="size-3 text-emerald-400" /> : <VolumeX className="size-3 text-faint" />}
                  <span>{speechAudio ? "Voice On" : "Voice Muted"}</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 gap-1 border-line"
                onClick={() => setMuted((prev) => !prev)}
              >
                {muted ? <MicOff className="size-3 text-red-400" /> : <Mic className="size-3 text-emerald-400" />}
                <span>{muted ? "Unmute" : "Mute"}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 gap-1 text-red-400 hover:bg-red-950/20 border-red-500/30"
                onClick={hangUp}
              >
                <PhoneOff className="size-3" />
                <span>End Call</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {inCall && !hosted && (
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

      {/* MESSAGES SCROLLER */}
      <div ref={scroller} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-3">
        {lines.length === 0 && !ended && (
          <div className="flex flex-col gap-3 py-2">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-faint uppercase">
              <Sparkles className="size-3.5 text-amber-400" />
              <span>You're connected! Tap an icebreaker to start:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ICEBREAKERS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="pressable rounded-full border border-line bg-surface/80 hover:bg-subtle px-3 py-1.5 text-xs text-muted hover:text-fg text-left transition-colors"
                  onClick={() => setDraft(prompt)}
                >
                  💡 {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {lines.map((line) => {
          const time = formatMessageTime(line.at);
          return (
            <div key={line.id} className={`flex flex-col ${line.fromSelf ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm break-words shadow-xs ${
                  line.fromSelf
                    ? "bg-accent text-accent-fg font-normal rounded-br-xs"
                    : "bg-surface border border-line text-fg rounded-bl-xs"
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{line.body}</p>
                {time && (
                  <div
                    className={`mt-1 flex items-center gap-1 text-[10px] tabular-nums select-none ${
                      line.fromSelf ? "justify-end text-accent-fg/75" : "justify-start text-faint"
                    }`}
                  >
                    <span>{time}</span>
                    {line.fromSelf && <span className="opacity-75">✓</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="flex items-center gap-2.5 pl-1 py-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-xs border border-line bg-surface/90 px-3.5 py-2.5 shadow-xs">
              <span className="size-2 rounded-full bg-emerald-400 animate-bounce [animation-duration:0.8s]" />
              <span className="size-2 rounded-full bg-emerald-400 animate-bounce [animation-duration:0.8s] [animation-delay:0.18s]" />
              <span className="size-2 rounded-full bg-emerald-400 animate-bounce [animation-duration:0.8s] [animation-delay:0.36s]" />
            </div>
            <span className="text-xs text-muted font-medium">
              {hosted
                ? `${partner?.id || "Traveler"} is typing…`
                : `${partner?.city ? `${partner.city} stranger` : "Stranger"} is typing…`}
            </span>
          </div>
        )}
        {ended && (
          <div className="my-2 rounded-lg border border-line bg-subtle p-3 text-center">
            <p className="text-sm font-medium text-muted">Stranger has disconnected.</p>
            <p className="mt-1 text-xs text-faint">Tap Next to instantly match with someone new.</p>
          </div>
        )}
        {(error || mediaError) && <p className="text-sm text-red-400">{error || mediaError}</p>}
      </div>

      {/* COMPOSER & ACTIONS */}
      <form
        className="pb-safe flex flex-col gap-2.5 border-t border-line pt-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {!ended && typing && (
          <div className="flex items-center gap-2 px-1 text-xs text-emerald-400 font-medium animate-pulse">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>
              {hosted
                ? `${partner?.id || "Traveler"} is typing a reply…`
                : `${partner?.city ? `${partner.city} stranger` : "Stranger"} is typing a message…`}
            </span>
          </div>
        )}
        {!ended && (
          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Icebreaker prompt"
              className="min-h-11 shrink-0 text-amber-400 border-line hover:bg-subtle"
              onClick={() => {
                const random = ICEBREAKERS[Math.floor(Math.random() * ICEBREAKERS.length)];
                setDraft(random);
              }}
              title="Insert icebreaker"
            >
              <Lightbulb className="size-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Voice input"
              className={`min-h-11 shrink-0 border-line hover:bg-subtle ${
                listening ? "border-red-500 bg-red-500/20 text-red-400 animate-pulse" : "text-emerald-400"
              }`}
              onClick={startSpeechRecognition}
              title={listening ? "Listening to voice…" : "Speak message (Dictation)"}
            >
              <Mic className="size-4" />
            </Button>

            <label className="sr-only" htmlFor="composer">
              Message
            </label>
            <textarea
              id="composer"
              rows={1}
              value={draft}
              maxLength={500}
              placeholder={listening ? "Listening to your voice…" : "Write a message or say hello…"}
              className="min-h-11 flex-1 resize-none rounded-lg border border-line bg-bg px-3.5 py-3 text-sm text-fg placeholder:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/25"
              onChange={(event) => {
                const val = event.target.value;
                setDraft(val);
                if (val.trim() && !ended) {
                  if (!isTypingRef.current) {
                    isTypingRef.current = true;
                    onTyping?.(true);
                  }
                  if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
                  typingTimeout.current = window.setTimeout(() => {
                    isTypingRef.current = false;
                    onTyping?.(false);
                  }, 2500);
                } else if (isTypingRef.current) {
                  isTypingRef.current = false;
                  if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
                  onTyping?.(false);
                }
              }}
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

        {/* BOTTOM ACTION BAR: Media Toggles & Next Stranger */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {!ended &&
              (inCall ? (
                <>
                  <Button variant="outline" size="sm" onClick={hangUp} className="text-xs">
                    <PhoneOff className="size-3.5 mr-1 text-red-400" />
                    Hang up
                  </Button>
                  {!hosted && !hasLocalVideo && (
                    <Button variant="outline" size="sm" onClick={() => void startMedia("video")} className="text-xs">
                      <Video className="size-3.5 mr-1 text-blue-400" />
                      Add Camera
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (hosted) setHostedVoiceActive(true);
                      else setAsk("voice");
                    }}
                    className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <Mic className="size-3.5 mr-1" />
                    Start Voice Call
                  </Button>
                  {!hosted && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAsk("video")}
                      className="text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                    >
                      <Video className="size-3.5 mr-1" />
                      Video Call
                    </Button>
                  )}
                </>
              ))}
          </div>

          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onNext}
              className="border-accent text-fg font-semibold text-xs"
            >
              Next Stranger →
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted hover:text-red-400 text-xs"
            >
              Leave
            </Button>
          </div>
        </div>
      </form>

      <Dialog
        open={ask !== null}
        onOpenChange={(open) => {
          if (!open) setAsk(null);
        }}
        title={ask === "video" ? "Start video call" : "Start random voice call"}
        description="The call connects directly peer-to-peer. Audio streams hands-free while text continues to work."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={() => void startMedia(ask === "video" ? "video" : "voice")}
          >
            {ask === "video" ? "Start Camera" : "Connect Voice Mic"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAsk(null)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
