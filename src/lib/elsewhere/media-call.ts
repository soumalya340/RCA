import { defaultIceServers } from "@/lib/multiplayer";

type SignalKind = "offer" | "answer" | "ice";

type SignalRow = {
  id: number;
  from: string;
  kind: SignalKind;
  payload: unknown;
};

function unwrap(payload: unknown): unknown {
  if (typeof payload !== "string") return payload;
  try {
    return JSON.parse(payload) as unknown;
  } catch {
    return payload;
  }
}

export class MediaCall {
  private pc: RTCPeerConnection | null = null;
  private cursor = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private pending: RTCIceCandidateInit[] = [];
  private makingOffer = false;
  private chain: Promise<void> = Promise.resolve();
  readonly remoteStream = new MediaStream();

  constructor(
    private readonly opts: {
      laneId: string;
      selfId: string;
      remoteId: string;
      name: string;
      stream: MediaStream;
      onRemote: () => void;
    },
  ) {}

  private get room() {
    return `v${this.opts.laneId}`.slice(0, 64);
  }

  async start() {
    if (this.closed) return;
    const pc = new RTCPeerConnection({ iceServers: defaultIceServers() });
    this.pc = pc;
    for (const track of this.opts.stream.getTracks()) {
      pc.addTrack(track, this.opts.stream);
    }
    pc.ontrack = (event) => {
      const tracks = event.streams[0]?.getTracks() ?? [event.track];
      for (const track of tracks) {
        if (!this.remoteStream.getTracks().includes(track)) this.remoteStream.addTrack(track);
      }
      this.opts.onRemote();
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) void this.send("ice", event.candidate.toJSON());
    };
    if (this.opts.selfId > this.opts.remoteId) await this.offer();
    if (this.closed) {
      pc.close();
      return;
    }
    this.schedule(200);
  }

  close() {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    this.pc?.close();
    this.pc = null;
    void fetch("/api/rtc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "leave", room: this.room, peer: this.opts.selfId }),
      keepalive: true,
    }).catch(() => {});
  }

  private schedule(delay: number) {
    if (this.closed) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.poll(), delay);
  }

  private async poll() {
    if (this.closed) return;
    try {
      const params = new URLSearchParams({
        room: this.room,
        peer: this.opts.selfId,
        name: this.opts.name.slice(0, 64),
        since: String(this.cursor),
      });
      const res = await fetch(`/api/rtc?${params}`);
      if (!res.ok || this.closed) throw new Error("poll");
      const body = (await res.json()) as { signals?: SignalRow[] };
      for (const signal of body.signals ?? []) {
        this.cursor = Math.max(this.cursor, signal.id);
        await this.onSignal(signal.kind, unwrap(signal.payload));
        if (this.closed) return;
      }
    } catch {
      // The next tick retries.
    }
    this.schedule(this.pc?.connectionState === "connected" ? 1500 : 400);
  }

  private async offer() {
    const pc = this.pc;
    if (!pc || this.closed) return;
    this.makingOffer = true;
    try {
      await pc.setLocalDescription(await pc.createOffer());
      if (this.closed || !pc.localDescription) return;
      await this.send("offer", pc.localDescription.toJSON());
    } finally {
      this.makingOffer = false;
    }
  }

  private async onSignal(kind: SignalKind, payload: unknown) {
    const pc = this.pc;
    if (!pc || this.closed) return;
    const polite = this.opts.selfId < this.opts.remoteId;
    if (kind === "offer" || kind === "answer") {
      const description = payload as RTCSessionDescriptionInit;
      const collision = kind === "offer" && (this.makingOffer || pc.signalingState !== "stable");
      if (collision && !polite) return;
      await pc.setRemoteDescription(description);
      if (this.closed) return;
      await this.flush();
      if (kind === "offer") {
        await pc.setLocalDescription(await pc.createAnswer());
        if (this.closed || !pc.localDescription) return;
        await this.send("answer", pc.localDescription.toJSON());
      }
    } else if (!pc.remoteDescription) {
      this.pending.push(payload as RTCIceCandidateInit);
    } else {
      try {
        await pc.addIceCandidate(payload as RTCIceCandidateInit);
      } catch {
        // A stale candidate should not kill the call.
      }
    }
  }

  private async flush() {
    const pc = this.pc;
    if (!pc) return;
    while (this.pending.length > 0) {
      const candidate = this.pending.shift();
      if (!candidate) continue;
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // Ignore late candidates.
      }
    }
  }

  private send(kind: SignalKind, payload: unknown) {
    const run = this.chain.then(async () => {
      if (this.closed) return;
      await fetch("/api/rtc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "signal",
          room: this.room,
          from: this.opts.selfId,
          to: this.opts.remoteId,
          kind,
          payload,
        }),
      });
    });
    this.chain = run.catch(() => {});
    return run;
  }
}
