import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { a as DialogOverlay, c as Slot, i as DialogDescription, n as DialogClose, o as DialogPortal, r as DialogContent, s as DialogTitle, t as Dialog$1 } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { i as getServerFnById, n as createServerFn, r as TSS_SERVER_FUNCTION } from "./ssr.mjs";
import { a as formatPlace, i as cleanText, o as normalizeTags, t as ID_RE } from "./format-DyUhT5ai.mjs";
import { a as Send, c as Mic, l as MicOff, n as Video, o as Phone, r as VideoOff, s as PhoneOff, t as X, u as MapPin } from "../_libs/lucide-react.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { t as format } from "../_libs/date-fns.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CR1iVcW1.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function Badge({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-flex min-h-7 items-center rounded-full border border-line bg-subtle px-3 text-xs text-muted", className),
		...props
	});
}
var buttonVariants = cva("pressable inline-flex items-center justify-center gap-2 rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/30 disabled:pointer-events-none disabled:opacity-40", {
	variants: {
		variant: {
			primary: "bg-accent text-accent-fg hover:opacity-90",
			outline: "border border-line bg-surface text-fg hover:bg-subtle",
			ghost: "bg-transparent text-fg hover:bg-subtle"
		},
		size: {
			md: "min-h-11 px-4 text-sm",
			lg: "min-h-12 px-5 text-base",
			icon: "size-11"
		}
	},
	defaultVariants: {
		variant: "primary",
		size: "md"
	}
});
function Button({ className, variant, size, asChild, type = "button", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		type,
		...props
	});
}
function Dialog({ open, onOpenChange, title, description, children, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog$1, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-40 bg-bg/80" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: cn("rise-in fixed top-1/2 left-1/2 z-50 w-[min(100%-2rem,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-surface p-4 focus:outline-none", className),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
					className: "font-display text-2xl leading-tight text-fg",
					children: title
				}), description ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
					className: "mt-1 text-sm text-muted",
					children: description
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
					className: "sr-only",
					children: title
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
					className: "pressable inline-flex size-11 items-center justify-center rounded-sm text-muted hover:bg-subtle hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/30",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "sr-only",
						children: "Close"
					})]
				})]
			}), children]
		})] })
	});
}
function defaultIceServers() {
	return [{ urls: ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"] }];
}
function unwrap(payload) {
	if (typeof payload !== "string") return payload;
	try {
		return JSON.parse(payload);
	} catch {
		return payload;
	}
}
var MediaCall = class {
	opts;
	pc = null;
	cursor = 0;
	timer = null;
	closed = false;
	pending = [];
	makingOffer = false;
	chain = Promise.resolve();
	remoteStream = new MediaStream();
	constructor(opts) {
		this.opts = opts;
	}
	get room() {
		return `v${this.opts.laneId}`.slice(0, 64);
	}
	async start() {
		if (this.closed) return;
		const pc = new RTCPeerConnection({ iceServers: defaultIceServers() });
		this.pc = pc;
		for (const track of this.opts.stream.getTracks()) pc.addTrack(track, this.opts.stream);
		pc.ontrack = (event) => {
			const tracks = event.streams[0]?.getTracks() ?? [event.track];
			for (const track of tracks) if (!this.remoteStream.getTracks().includes(track)) this.remoteStream.addTrack(track);
			this.opts.onRemote();
		};
		pc.onicecandidate = (event) => {
			if (event.candidate) this.send("ice", event.candidate.toJSON());
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
		fetch("/api/rtc", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				op: "leave",
				room: this.room,
				peer: this.opts.selfId
			}),
			keepalive: true
		}).catch(() => {});
	}
	schedule(delay) {
		if (this.closed) return;
		if (this.timer) clearTimeout(this.timer);
		this.timer = setTimeout(() => void this.poll(), delay);
	}
	async poll() {
		if (this.closed) return;
		try {
			const params = new URLSearchParams({
				room: this.room,
				peer: this.opts.selfId,
				name: this.opts.name.slice(0, 64),
				since: String(this.cursor)
			});
			const res = await fetch(`/api/rtc?${params}`);
			if (!res.ok || this.closed) throw new Error("poll");
			const body = await res.json();
			for (const signal of body.signals ?? []) {
				this.cursor = Math.max(this.cursor, signal.id);
				await this.onSignal(signal.kind, unwrap(signal.payload));
				if (this.closed) return;
			}
		} catch {}
		this.schedule(this.pc?.connectionState === "connected" ? 1500 : 400);
	}
	async offer() {
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
	async onSignal(kind, payload) {
		const pc = this.pc;
		if (!pc || this.closed) return;
		const polite = this.opts.selfId < this.opts.remoteId;
		if (kind === "offer" || kind === "answer") {
			const description = payload;
			if (kind === "offer" && (this.makingOffer || pc.signalingState !== "stable") && !polite) return;
			await pc.setRemoteDescription(description);
			if (this.closed) return;
			await this.flush();
			if (kind === "offer") {
				await pc.setLocalDescription(await pc.createAnswer());
				if (this.closed || !pc.localDescription) return;
				await this.send("answer", pc.localDescription.toJSON());
			}
		} else if (!pc.remoteDescription) this.pending.push(payload);
		else try {
			await pc.addIceCandidate(payload);
		} catch {}
	}
	async flush() {
		const pc = this.pc;
		if (!pc) return;
		while (this.pending.length > 0) {
			const candidate = this.pending.shift();
			if (!candidate) continue;
			try {
				await pc.addIceCandidate(candidate);
			} catch {}
		}
	}
	send(kind, payload) {
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
					payload
				})
			});
		});
		this.chain = run.catch(() => {});
		return run;
	}
};
function bindStream(node, stream) {
	if (node && stream && node.srcObject !== stream) node.srcObject = stream;
}
function ring() {
	const Ctx = window.AudioContext || window.webkitAudioContext;
	if (!Ctx) return;
	const ctx = new Ctx();
	const now = ctx.currentTime;
	[523.25, 659.25].forEach((freq, index) => {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.value = freq;
		const start = now + index * .18;
		gain.gain.setValueAtTime(1e-4, start);
		gain.gain.exponentialRampToValueAtTime(.05, start + .02);
		gain.gain.exponentialRampToValueAtTime(1e-4, start + .16);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(start);
		osc.stop(start + .18);
	});
	window.setTimeout(() => void ctx.close().catch(() => {}), 700);
}
function failureCopy(caught, kind) {
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
function VoiceTile({ title, detail, live }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
		className: "flex aspect-video flex-col items-center justify-center gap-3 rounded-md bg-subtle px-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: `flex size-12 items-center justify-center rounded-full border border-line bg-surface text-fg ${live ? "pulse-soft" : ""}`,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "size-5" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figcaption", {
			className: "max-w-full text-center",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "truncate text-sm text-fg",
				children: title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted",
				children: detail
			})]
		})]
	});
}
function ChatPane({ selfId, lane, lines, ended, typing, hosted, error, onSend, onCall, onNext, onClose }) {
	const [draft, setDraft] = (0, import_react.useState)("");
	const [sending, setSending] = (0, import_react.useState)(false);
	const [ask, setAsk] = (0, import_react.useState)(null);
	const [hostedNote, setHostedNote] = (0, import_react.useState)(false);
	const [mediaError, setMediaError] = (0, import_react.useState)(null);
	const [localStream, setLocalStream] = (0, import_react.useState)(null);
	const [muted, setMuted] = (0, import_react.useState)(false);
	const [remoteLive, setRemoteLive] = (0, import_react.useState)(false);
	const [dismissed, setDismissed] = (0, import_react.useState)(false);
	const scroller = (0, import_react.useRef)(null);
	const remoteStream = (0, import_react.useRef)(null);
	const rang = (0, import_react.useRef)(false);
	const epoch = (0, import_react.useRef)(0);
	const arming = (0, import_react.useRef)(false);
	const sawPartner = (0, import_react.useRef)(false);
	const partner = lane?.partner;
	(0, import_react.useEffect)(() => {
		const node = scroller.current;
		if (!node) return;
		node.scrollTop = node.scrollHeight;
	}, [lines, typing]);
	(0, import_react.useEffect)(() => {
		if (!localStream) return;
		for (const track of localStream.getAudioTracks()) track.enabled = !muted;
	}, [localStream, muted]);
	(0, import_react.useEffect)(() => {
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
	(0, import_react.useEffect)(() => {
		if (!ended || !localStream) return;
		epoch.current += 1;
		setLocalStream(null);
		setRemoteLive(false);
		setMuted(false);
	}, [ended, localStream]);
	(0, import_react.useEffect)(() => {
		if (!partnerVoice) setDismissed(false);
	}, [partnerVoice]);
	(0, import_react.useEffect)(() => {
		if (localStream) {
			arming.current = false;
			return;
		}
		if (arming.current || hosted || ended || !lane) return;
		if (lane.youVoice || lane.youVideo) onCall("off");
	}, [
		ended,
		hosted,
		lane,
		localStream,
		onCall
	]);
	(0, import_react.useEffect)(() => {
		if (partnerVoice && !localStream && !ended && !hosted && !rang.current) {
			rang.current = true;
			ring();
		}
		if (!partnerVoice) rang.current = false;
	}, [
		ended,
		hosted,
		localStream,
		partnerVoice
	]);
	(0, import_react.useEffect)(() => {
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
		onCall("off");
	}, [
		ended,
		hosted,
		localStream,
		onCall,
		partnerReady
	]);
	(0, import_react.useEffect)(() => {
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
			}
		});
		call.start().then(() => {
			if (dead) call.close();
		});
		return () => {
			dead = true;
			setRemoteLive(false);
			call.close();
			remote.getTracks().forEach((track) => remote.removeTrack(track));
		};
	}, [
		ended,
		hosted,
		laneId,
		localStream,
		partnerId,
		partnerReady,
		selfCity,
		selfId
	]);
	function hangUp() {
		epoch.current += 1;
		arming.current = false;
		setLocalStream(null);
		setRemoteLive(false);
		setMuted(false);
		onCall("off");
	}
	async function restoreVoice(ticket) {
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
				onCall("off");
			}
		}
	}
	async function startMedia(kind) {
		setAsk(null);
		setMediaError(null);
		const replacing = Boolean(localStream);
		const ticket = ++epoch.current;
		arming.current = true;
		localStream?.getTracks().forEach((track) => track.stop());
		try {
			const stream = await navigator.mediaDevices.getUserMedia(kind === "video" ? {
				video: { facingMode: "user" },
				audio: true
			} : { audio: true });
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
				onCall("off");
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex min-h-0 flex-1 flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-col gap-3 border-b border-line py-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-medium tracking-wide text-faint uppercase",
								children: eyebrow
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "truncate font-display text-3xl leading-tight text-fg",
								children: title
							}),
							hosted && partner && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-muted",
								children: formatPlace(partner)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-sm text-muted",
								children: ["You · ", selfPlace]
							})
						]
					}), hosted && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: "Hosted" })]
				}), partner && partner.interests.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap gap-2",
					children: partner.interests.map((tag) => {
						const shared = lane?.self.interests.some((item) => item.toLowerCase() === tag.toLowerCase());
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							className: shared ? "border-accent bg-accent text-accent-fg" : void 0,
							children: tag
						}, tag);
					})
				})]
			}),
			incoming && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex flex-col gap-3 rounded-md border border-line bg-subtle p-3 sm:flex-row sm:items-center sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "pulse-soft flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-fg",
						children: partnerVideo ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "size-4" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-fg",
						children: partnerVideo ? "Video call" : "Voice call"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: "They're waiting. Answer to join."
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: () => void startMedia(partnerVideo ? "video" : "voice"),
						children: "Answer"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						onClick: () => setDismissed(true),
						children: "Not now"
					})]
				})]
			}),
			inCall && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2 pt-4",
				children: [hasLocalVideo ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
					className: "overflow-hidden rounded-md bg-subtle",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
						className: "aspect-video w-full object-cover",
						autoPlay: true,
						playsInline: true,
						muted: true,
						ref: (node) => bindStream(node, localStream)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figcaption", {
						className: "px-2 py-1 text-xs text-muted",
						children: ["You", muted ? " · muted" : ""]
					})]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VoiceTile, {
					title: "You",
					detail: muted ? "Muted" : "On the line",
					live: !muted
				}), partnerVideo ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
					className: "overflow-hidden rounded-md bg-subtle",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
						className: "aspect-video w-full bg-bg object-cover",
						autoPlay: true,
						playsInline: true,
						muted: true,
						ref: (node) => bindStream(node, remoteStream.current)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("figcaption", {
						className: "px-2 py-1 text-xs text-muted",
						children: status
					})]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VoiceTile, {
					title: partnerLabel,
					detail: status,
					live: remoteLive
				})]
			}),
			inCall && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("audio", {
				className: "sr-only",
				autoPlay: true,
				ref: (node) => {
					const stream = remoteStream.current;
					if (node && stream && node.srcObject !== stream) node.srcObject = stream;
					if (node && remoteLive) node.play().catch(() => {});
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				ref: scroller,
				className: "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-4",
				children: [
					lines.length === 0 && !ended && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-faint",
						children: "You're connected. Say hello."
					}),
					lines.map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `flex ${line.fromSelf ? "justify-end" : "justify-start"}`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: `max-w-[85%] rounded-md px-3 py-2 text-sm break-words ${line.fromSelf ? "bg-subtle text-fg" : "border border-line text-fg"}`,
							children: line.body
						})
					}, line.id)),
					typing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-faint",
						children: "Typing…"
					}),
					ended && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "They left the lane."
					}),
					(error || mediaError) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: error || mediaError
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "pb-safe flex flex-col gap-3 border-t border-line pt-3",
				onSubmit: (event) => {
					event.preventDefault();
					submit();
				},
				children: [!ended && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-end gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "sr-only",
							htmlFor: "composer",
							children: "Message"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							id: "composer",
							rows: 1,
							value: draft,
							maxLength: 500,
							placeholder: "Write a message",
							className: "min-h-11 flex-1 resize-none rounded-sm border border-line bg-bg px-3 py-3 text-sm text-fg placeholder:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/25",
							onChange: (event) => setDraft(event.target.value),
							onKeyDown: (event) => {
								if (event.key === "Enter" && !event.shiftKey) {
									event.preventDefault();
									submit();
								}
							}
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							size: "icon",
							"aria-label": "Send",
							disabled: !draft.trim() || sending,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "size-4" })
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [
						!hosted && !ended && (localStream ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [hasLocalVideo ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							onClick: hangUp,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VideoOff, { className: "size-4" }), "Stop video"]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							onClick: hangUp,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PhoneOff, { className: "size-4" }), "Hang up"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							onClick: () => void startMedia("video"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, { className: "size-4" }), "Camera"]
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							onClick: () => setMuted((value) => !value),
							"aria-pressed": muted,
							children: [muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MicOff, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "size-4" }), muted ? "Unmute" : "Mute"]
						})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							onClick: () => setAsk("voice"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "size-4" }), "Voice"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							onClick: () => setAsk("video"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, { className: "size-4" }), "Video"]
						})] })),
						hosted && !ended && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							onClick: () => setHostedNote(true),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "size-4" }), "Voice"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							onClick: () => setHostedNote(true),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, { className: "size-4" }), "Video"]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: onNext,
							children: "Next"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							onClick: onClose,
							children: "End"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: ask !== null,
				onOpenChange: (open) => {
					if (!open) setAsk(null);
				},
				title: ask === "video" ? "Start video" : "Start a voice call",
				description: "The call connects your browsers directly. Text stays on the relay. A direct call can reveal a network address — skip it if you'd rather not.",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: () => void startMedia(ask === "video" ? "video" : "voice"),
						children: ask === "video" ? "Start camera" : "Start call"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						onClick: () => setAsk(null),
						children: "Not now"
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: hostedNote,
				onOpenChange: setHostedNote,
				title: "Text only",
				description: "Hosted travelers stay on text. Open a lane with a person when you want a voice or video call.",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: () => setHostedNote(false),
					children: "Okay"
				})
			})
		]
	});
}
function Input({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		className: cn("min-h-11 w-full rounded-sm border border-line bg-bg px-3 text-sm text-fg placeholder:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/25", className),
		...props
	});
}
function Textarea({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		className: cn("min-h-24 w-full resize-none rounded-sm border border-line bg-bg px-3 py-3 text-sm text-fg placeholder:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/25", className),
		...props
	});
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var locateFromRequest = createServerFn({ method: "POST" }).handler(createSsrRpc("3c632afd9a4642d1cac191e595439de29d999b2d98684ee045869e96f58bc088"));
var SELF_KEY = "elsewhere-self";
var RSVP_KEY = "elsewhere-rsvp";
var HOST_KEY = "elsewhere-hosts";
var LANE_KEY = "elsewhere-lane";
function mint(prefix) {
	return `${prefix}${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}
function loadSelfId() {
	const existing = localStorage.getItem(SELF_KEY);
	if (existing && /^u[a-f0-9]{16}$/.test(existing)) return existing;
	const id = mint("u");
	localStorage.setItem(SELF_KEY, id);
	return id;
}
function loadRsvpToken() {
	const existing = localStorage.getItem(RSVP_KEY);
	if (existing && /^r[a-f0-9]{16}$/.test(existing)) return existing;
	const id = mint("r");
	localStorage.setItem(RSVP_KEY, id);
	return id;
}
function loadHostTokens() {
	try {
		const parsed = JSON.parse(localStorage.getItem(HOST_KEY) || "{}");
		return Object.values(parsed).filter((token) => typeof token === "string");
	} catch {
		return [];
	}
}
function rememberHost(eventId, hostToken) {
	let parsed = {};
	try {
		parsed = JSON.parse(localStorage.getItem(HOST_KEY) || "{}");
	} catch {
		parsed = {};
	}
	parsed[eventId] = hostToken;
	localStorage.setItem(HOST_KEY, JSON.stringify(parsed));
}
function hostTokenFor(eventId) {
	try {
		const token = JSON.parse(localStorage.getItem(HOST_KEY) || "{}")[eventId];
		return typeof token === "string" ? token : null;
	} catch {
		return null;
	}
}
function forgetHost(eventId) {
	try {
		const parsed = JSON.parse(localStorage.getItem(HOST_KEY) || "{}");
		delete parsed[eventId];
		localStorage.setItem(HOST_KEY, JSON.stringify(parsed));
	} catch {
		localStorage.removeItem(HOST_KEY);
	}
}
function loadSavedLane() {
	return sessionStorage.getItem(LANE_KEY);
}
function saveLane(id) {
	if (id) sessionStorage.setItem(LANE_KEY, id);
	else sessionStorage.removeItem(LANE_KEY);
}
var empty = {
	city: "",
	region: "",
	country: ""
};
async function fromGeo() {
	const res = await fetch("https://get.geojs.io/v1/ip/geo.json", { signal: AbortSignal.timeout(4500) });
	if (!res.ok) return empty;
	const data = await res.json();
	return {
		city: String(data.city || "").slice(0, 48),
		region: String(data.region || "").slice(0, 48),
		country: String(data.country || "").slice(0, 48)
	};
}
async function detectPlace() {
	const [server, geo] = await Promise.all([locateFromRequest().catch(() => empty), fromGeo().catch(() => empty)]);
	if (server.city || server.country) return server;
	if (geo.city || geo.country) return geo;
	return empty;
}
var listGatherings = createServerFn({ method: "POST" }).validator((input) => {
	return {
		token: typeof input?.token === "string" && ID_RE.test(input.token) ? input.token : "",
		hostTokens: Array.isArray(input?.hostTokens) ? input.hostTokens.filter((item) => typeof item === "string" && ID_RE.test(item)).slice(0, 40) : []
	};
}).handler(createSsrRpc("dda6300d8092989df51a80a018cf2eb746f41e3c16b505610965809c1448420e"));
var postGathering = createServerFn({ method: "POST" }).validator((input) => ({
	title: cleanText(input?.title, 80),
	blurb: cleanText(input?.blurb, 280),
	city: cleanText(input?.city, 48),
	place: cleanText(input?.place, 80),
	startsAt: cleanText(input?.startsAt, 40),
	tags: normalizeTags(input?.tags),
	hostLabel: cleanText(input?.hostLabel, 32),
	token: typeof input?.token === "string" ? input.token : ""
})).handler(createSsrRpc("6cb38a6940366b4c2609ed9c8e75adad936d73842a873304ad7916a42d2de0d8"));
var rsvpGathering = createServerFn({ method: "POST" }).validator((input) => ({
	eventId: typeof input?.eventId === "string" ? input.eventId : "",
	token: typeof input?.token === "string" ? input.token : ""
})).handler(createSsrRpc("bc7aa2cc86a607321d58166dc318bbfa7394914fa60fe589f537228663fcb132"));
var deleteGathering = createServerFn({ method: "POST" }).validator((input) => ({
	eventId: typeof input?.eventId === "string" ? input.eventId : "",
	hostToken: typeof input?.hostToken === "string" ? input.hostToken : ""
})).handler(createSsrRpc("fe1a25d4a42467dc83a5a3205b37c08cb13f05cdfe710943178256728c9fffe5"));
function whenValue(offsetDays) {
	const date = /* @__PURE__ */ new Date();
	date.setDate(date.getDate() + offsetDays);
	date.setHours(19, 0, 0, 0);
	const pad = (n) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function formatWhen(iso) {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "Time to be set";
	return format(date, "EEE d MMM · HH:mm");
}
function EventsPane({ place }) {
	const [events, setEvents] = (0, import_react.useState)([]);
	const [filter, setFilter] = (0, import_react.useState)("all");
	const [query, setQuery] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [open, setOpen] = (0, import_react.useState)(false);
	const [posting, setPosting] = (0, import_react.useState)(false);
	const [title, setTitle] = (0, import_react.useState)("");
	const [blurb, setBlurb] = (0, import_react.useState)("");
	const [city, setCity] = (0, import_react.useState)(place.city);
	const [spot, setSpot] = (0, import_react.useState)("");
	const [startsAt, setStartsAt] = (0, import_react.useState)(whenValue(1));
	const [tagText, setTagText] = (0, import_react.useState)("");
	const [hostLabel, setHostLabel] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		if (place.city) setCity((current) => current || place.city);
	}, [place.city]);
	async function refresh() {
		const result = await listGatherings({ data: {
			token: loadRsvpToken(),
			hostTokens: loadHostTokens()
		} });
		if (!result.ok) {
			setError(result.error);
			setEvents(result.events);
			return;
		}
		setError(null);
		setEvents(result.events);
	}
	(0, import_react.useEffect)(() => {
		let cancel = false;
		(async () => {
			const result = await listGatherings({ data: {
				token: loadRsvpToken(),
				hostTokens: loadHostTokens()
			} });
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
	const visible = (0, import_react.useMemo)(() => {
		const needle = query.trim().toLowerCase();
		return events.filter((event) => {
			if (filter === "near" && place.city) {
				if (!(event.city.toLowerCase() === place.city.toLowerCase())) return false;
			}
			if (!needle) return true;
			return `${event.title} ${event.city} ${event.place} ${event.tags.join(" ")} ${event.blurb}`.toLowerCase().includes(needle);
		});
	}, [
		events,
		filter,
		place.city,
		query
	]);
	async function toggle(event) {
		const result = await rsvpGathering({ data: {
			eventId: event.id,
			token: loadRsvpToken()
		} });
		if (!result.ok) {
			setError(result.error);
			return;
		}
		setEvents((current) => current.map((item) => item.id === event.id ? {
			...item,
			going: result.going,
			goingCount: Math.max(0, item.goingCount + (result.going ? 1 : -1))
		} : item));
	}
	async function remove(event) {
		const hostToken = hostTokenFor(event.id);
		if (!hostToken) return;
		const result = await deleteGathering({ data: {
			eventId: event.id,
			hostToken
		} });
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
			const result = await postGathering({ data: {
				title,
				blurb,
				city,
				place: spot,
				startsAt: parsed.toISOString(),
				tags: tagText.split(",").map((tag) => tag.trim()),
				hostLabel,
				token: loadRsvpToken()
			} });
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rise-in mx-auto flex w-full max-w-3xl flex-col gap-6 py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium tracking-wide text-faint uppercase",
						children: "Board"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display text-4xl leading-tight text-fg",
						children: "Gatherings"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 max-w-lg text-sm text-muted",
						children: "Look for something happening, or post one. No account. Anyone here can read the board."
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: () => setOpen(true),
					children: "Post a gathering"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-3 sm:flex-row",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex rounded-sm border border-line p-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: `pressable min-h-9 rounded-xs px-3 text-sm ${filter === "near" ? "bg-subtle text-fg" : "text-muted"}`,
						onClick: () => setFilter("near"),
						children: "Near you"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: `pressable min-h-9 rounded-xs px-3 text-sm ${filter === "all" ? "bg-subtle text-fg" : "text-muted"}`,
						onClick: () => setFilter("all"),
						children: "Anywhere"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: query,
					placeholder: "Filter by city, tag, or title",
					"aria-label": "Filter gatherings",
					onChange: (event) => setQuery(event.target.value)
				})]
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: error
			}),
			loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-faint",
				children: "Loading the board…"
			}),
			!loading && visible.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Nothing matches. Post one, or widen the filter."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-3 sm:grid-cols-2",
				children: visible.map((event) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "flex flex-col gap-3 rounded-xl border border-line bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-faint tabular-nums",
							children: formatWhen(event.startsAt)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-2xl leading-tight text-fg",
							children: event.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-muted",
							children: [
								event.city,
								" · ",
								event.place
							]
						}),
						event.blurb && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-fg",
							children: event.blurb
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-2",
							children: event.tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: tag }, tag))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-auto flex items-center justify-between gap-3 pt-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-faint tabular-nums",
								children: [
									event.goingCount,
									" going · ",
									event.hostLabel
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-2",
								children: [event.mine && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									onClick: () => void remove(event),
									children: "Remove"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: event.going ? "primary" : "outline",
									onClick: () => void toggle(event),
									children: event.going ? "Going" : "I'll go"
								})]
							})]
						})
					]
				}, event.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open,
				onOpenChange: setOpen,
				title: "Post a gathering",
				description: "Public on this board. Don't put a phone number or address you wouldn't say out loud.",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "flex flex-col gap-3",
					onSubmit: (event) => {
						event.preventDefault();
						publish();
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex flex-col gap-1 text-sm text-fg",
							children: ["Name", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: title,
								maxLength: 80,
								onChange: (event) => setTitle(event.target.value),
								required: true
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex flex-col gap-1 text-sm text-fg",
							children: ["What happens", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								value: blurb,
								maxLength: 280,
								onChange: (event) => setBlurb(event.target.value)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-3 sm:grid-cols-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex flex-col gap-1 text-sm text-fg",
								children: ["City", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: city,
									maxLength: 48,
									onChange: (event) => setCity(event.target.value),
									required: true
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex flex-col gap-1 text-sm text-fg",
								children: ["Place", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: spot,
									maxLength: 80,
									onChange: (event) => setSpot(event.target.value),
									required: true
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex flex-col gap-1 text-sm text-fg",
							children: ["When", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "datetime-local",
								value: startsAt,
								onChange: (event) => setStartsAt(event.target.value),
								required: true
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex flex-col gap-1 text-sm text-fg",
							children: ["Tags", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: tagText,
								placeholder: "Music, Food",
								onChange: (event) => setTagText(event.target.value)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex flex-col gap-1 text-sm text-fg",
							children: ["Posted as", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: hostLabel,
								maxLength: 32,
								placeholder: "A neighbor",
								onChange: (event) => setHostLabel(event.target.value)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							disabled: posting,
							children: posting ? "Posting…" : "Post"
						})
					]
				})
			})
		]
	});
}
var PRESETS = [
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
	"Late hours"
];
function Lobby({ place, locating, people, error, onStart }) {
	const [city, setCity] = (0, import_react.useState)(place.city);
	const [touched, setTouched] = (0, import_react.useState)(false);
	const [tags, setTags] = (0, import_react.useState)([]);
	const [draft, setDraft] = (0, import_react.useState)("");
	const [openMatch, setOpenMatch] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!touched) setCity(place.city);
	}, [place.city, touched]);
	function toggle(tag) {
		setTags((current) => current.some((item) => item.toLowerCase() === tag.toLowerCase()) ? current.filter((item) => item.toLowerCase() !== tag.toLowerCase()) : [...current, tag].slice(0, 8));
	}
	function addDraft() {
		const next = draft.trim().replace(/\s+/g, " ").slice(0, 24);
		if (!next) return;
		toggle(next);
		setDraft("");
	}
	const needsTag = !openMatch && tags.length === 0;
	const hint = !touched && (place.region || place.country) ? [place.region, place.country].filter(Boolean).join(", ") : "";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rise-in mx-auto flex w-full max-w-xl flex-col gap-8 py-8 sm:py-14",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium tracking-wide text-faint uppercase",
						children: "Open a lane"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display text-4xl leading-tight tracking-tight text-fg sm:text-5xl",
						children: "Talk to someone in another city."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "max-w-lg text-base text-muted",
						children: "Match on an interest, or talk to anyone. Your city comes from your network address. A street address never does."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-sm font-medium text-fg",
						htmlFor: "city",
						children: "Your city"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "city",
							className: "pl-10",
							value: city,
							placeholder: locating ? "Finding your city…" : "Add a city",
							maxLength: 48,
							onChange: (event) => {
								setTouched(true);
								setCity(event.target.value);
							}
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-faint",
						children: locating ? "Checking the network…" : hint || (touched ? "This is what the other person sees." : "We couldn't place the network. Type a city.")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-medium text-fg",
							children: "Interests"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex rounded-sm border border-line p-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: `pressable min-h-9 rounded-xs px-3 text-sm ${openMatch ? "text-muted" : "bg-subtle text-fg"}`,
								onClick: () => setOpenMatch(false),
								children: "By interest"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: `pressable min-h-9 rounded-xs px-3 text-sm ${openMatch ? "bg-subtle text-fg" : "text-muted"}`,
								onClick: () => setOpenMatch(true),
								children: "Anyone"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [PRESETS.map((tag) => {
							const on = tags.some((item) => item.toLowerCase() === tag.toLowerCase());
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-pressed": on,
								onClick: () => toggle(tag),
								className: `pressable min-h-9 rounded-full border px-3 text-sm ${on ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface text-muted"}`,
								children: tag
							}, tag);
						}), tags.filter((tag) => !PRESETS.some((preset) => preset.toLowerCase() === tag.toLowerCase())).map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "pressable min-h-9 rounded-full bg-accent px-3 text-sm text-accent-fg",
							onClick: () => toggle(tag),
							children: tag
						}, tag))]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "flex gap-2",
						onSubmit: (event) => {
							event.preventDefault();
							addDraft();
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: draft,
							placeholder: "Add your own",
							maxLength: 24,
							"aria-label": "Custom interest",
							onChange: (event) => setDraft(event.target.value)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							variant: "outline",
							disabled: !draft.trim(),
							children: "Add"
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "lg",
						disabled: needsTag,
						onClick: () => onStart({
							place: touched ? {
								city: city.trim(),
								region: "",
								country: ""
							} : {
								...place,
								city: city.trim() || place.city
							},
							interests: tags,
							openMatch
						}),
						children: "Open a lane"
					}),
					needsTag && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Add an interest, or switch to anyone."
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: error
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-faint tabular-nums",
						children: people === null ? "Checking who's around…" : people === 0 ? "Quiet right now." : `${people} ${people === 1 ? "person" : "people"} around`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-faint",
						children: "Text stays on the relay. A voice or video call only starts if you both allow it, and that call connects the two browsers directly."
					})
				]
			})
		]
	});
}
function Searching({ place, interests, openMatch, waited, people, error, onHosted, onCancel }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rise-in mx-auto flex w-full max-w-xl flex-col gap-6 py-10 sm:py-16",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "pulse-soft text-xs font-medium tracking-wide text-faint uppercase",
				children: "Looking"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl leading-tight text-fg",
				children: "Finding a lane."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-base text-muted",
				children: [
					openMatch ? "Anyone, anywhere." : interests.length ? `Matching ${interests.join(", ")}.` : "Matching interests.",
					" ",
					"You appear as ",
					formatPlace(place),
					"."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-faint tabular-nums",
				children: people === null ? "…" : `${people} ${people === 1 ? "person" : "people"} around`
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: error
			}),
			waited && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-3 rounded-xl border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-fg",
						children: "No one with a matching lane yet."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "A hosted traveler can keep you company. They're labeled, and they stay on text."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: onHosted,
						children: "Meet a hosted traveler"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				onClick: onCancel,
				children: "Cancel"
			})
		]
	});
}
function session(selfId) {
	if (typeof selfId !== "string" || !ID_RE.test(selfId)) throw new Error("Invalid session.");
	return selfId;
}
var seekLane = createServerFn({ method: "POST" }).validator((input) => {
	return {
		selfId: session(input?.selfId),
		city: cleanText(input.city, 48),
		region: cleanText(input.region, 48),
		country: cleanText(input.country, 48),
		interests: normalizeTags(input.interests),
		openMatch: Boolean(input.openMatch)
	};
}).handler(createSsrRpc("975087dc4f78953f43a78cd559d5a5e9cdf25f33c8c8c56a230277022c1edc84"));
var leaveQueue = createServerFn({ method: "POST" }).validator((input) => session(input?.selfId)).handler(createSsrRpc("222341beaac63f66a7cb63ac7c28a4eeb94ab202f1ee0add9d2aa3213886ecfd"));
var pollLane = createServerFn({ method: "POST" }).validator((input) => ({
	selfId: session(input?.selfId),
	laneId: session(input?.laneId),
	since: Number.isFinite(input?.since) ? Math.max(0, Math.floor(input.since)) : 0
})).handler(createSsrRpc("3733872737f9bfcca37637ebe55cb0eae4039cd6290e81f3afeb7dce2971604d"));
var sendLaneMessage = createServerFn({ method: "POST" }).validator((input) => ({
	selfId: session(input?.selfId),
	laneId: session(input?.laneId),
	body: cleanText(input?.body, 500)
})).handler(createSsrRpc("3f3e7dba0fd9d0d7486409599f86d34b8449b54084c25631282eed7d49e39d33"));
var setLaneCall = createServerFn({ method: "POST" }).validator((input) => ({
	selfId: session(input?.selfId),
	laneId: session(input?.laneId),
	mode: input?.mode === "voice" || input?.mode === "video" ? input.mode : "off"
})).handler(createSsrRpc("9a0a1ddc67f35e87ad4d896c9f29b89e7a0c2fe1fb577640ec8cd6cde8e8e7bd"));
var endLane = createServerFn({ method: "POST" }).validator((input) => ({
	selfId: session(input?.selfId),
	laneId: session(input?.laneId)
})).handler(createSsrRpc("360b7976ccef65ce124ca1015955e784e2b16fe9e2875106c64beb149dad4c54"));
var lobbyStats = createServerFn({ method: "POST" }).handler(createSsrRpc("58d1adf2d1e11f84c574728870899820f28e5fa683c1c25b3274fc46fb33b32e"));
var PERSONAS = [
	{
		id: "mira",
		name: "Mira",
		city: "Lisbon",
		region: "Lisbon",
		country: "Portugal",
		interests: [
			"Music",
			"Food",
			"Night walks"
		],
		hello: "Hey. I'm Mira, up on a hill in Lisbon. The trams stopped being romantic about an hour ago.",
		topics: {
			Music: ["What are you listening to this week? I keep replaying one sad guitar loop.", "Lisbon at night is mostly someone practicing in a window. Do you play anything?"],
			Food: ["I ate grilled sardines standing up. What's the late-night food where you are?", "If you had one stall in {city}, what would it sell?"],
			"Night walks": ["I walk when I can't sleep. Is {city} good for that, or do the streets go quiet too early?"]
		},
		fallback: [
			"Tell me one true thing about {city} tonight.",
			"I'm bad at small talk and good at snacks. Which do you need?",
			"What's taking up your head right now?"
		]
	},
	{
		id: "jonah",
		name: "Jonah",
		city: "Chicago",
		region: "Illinois",
		country: "United States",
		interests: [
			"Film",
			"Books",
			"Late hours"
		],
		hello: "Jonah in Chicago. The lake is a black rectangle and I just left a movie I haven't decided about.",
		topics: {
			Film: ["Last thing you watched that stayed with you? Mine was too long and I liked it anyway.", "Do you watch films alone, or do you need someone to complain with after?"],
			Books: ["I'm halfway through a novel I keep putting down to look out the window. Reading anything?", "Recommend me something short. My attention is a weeknight."],
			"Late hours": ["It's late here. Is it late in {city} too, or are you living in another clock?"]
		},
		fallback: [
			"Ask me something. I'll answer, then I get one back.",
			"What's {city} doing while we're talking?",
			"I can do weather, films, or the thing you're avoiding. Your pick."
		]
	},
	{
		id: "aiko",
		name: "Aiko",
		city: "Osaka",
		region: "Osaka",
		country: "Japan",
		interests: [
			"Games",
			"Languages",
			"Art"
		],
		hello: "Aiko here, Osaka. I lost three rounds at the arcade and I'm calling it research.",
		topics: {
			Games: ["What do you play when you want to vanish for an hour?", "I like games that are a little unfair. You?"],
			Languages: ["I'm collecting small phrases. Teach me how to say hello in the way people actually say it in {city}.", "Do you switch languages in your head, or is one of them home?"],
			Art: ["Saw a tiny drawing on a vending machine today. What's the last thing you looked at on purpose?"]
		},
		fallback: [
			"Say the first thing in your head. I'll match the energy.",
			"What's open late in {city}?",
			"I have time. Don't polish it."
		]
	},
	{
		id: "sable",
		name: "Sable",
		city: "Accra",
		region: "Greater Accra",
		country: "Ghana",
		interests: [
			"Startups",
			"Music",
			"Food"
		],
		hello: "Sable, Accra. Generator hummed on, neighbors are louder, which is the better soundtrack.",
		topics: {
			Startups: ["What are you making, even if it's only an idea you're not ready to say out loud?", "I like projects that start as a favor for a friend. Is yours like that?"],
			Music: ["Highlife from a passing car just now. What should be playing under this conversation?"],
			Food: ["Have you eaten? I judge cities by what you can get after midnight."]
		},
		fallback: [
			"Give me the short version of your day in {city}.",
			"I'm in a good mood. Use it.",
			"What's a small thing you want this month?"
		]
	},
	{
		id: "leif",
		name: "Leif",
		city: "Malmö",
		region: "Skåne",
		country: "Sweden",
		interests: [
			"Sports",
			"Travel",
			"Night walks"
		],
		hello: "Leif in Malmö. I swam, I regretted it, I had coffee, I forgave myself.",
		topics: {
			Sports: ["Do you move your body for joy or for guilt? I'm trying to switch teams.", "Any sport you actually watch, or only ones you play?"],
			Travel: ["If you left {city} tomorrow with one bag, where would you point it?", "What's a place that felt nothing like the photos?"],
			"Night walks": ["The path by the water is empty. Would you walk it, or are you a stay-inside person?"]
		},
		fallback: [
			"How's the air in {city} right now? Literally or otherwise.",
			"Tell me something ordinary. Ordinary travels well.",
			"I can talk routes, food, or why you're still awake."
		]
	},
	{
		id: "noor",
		name: "Noor",
		city: "Cairo",
		region: "Cairo",
		country: "Egypt",
		interests: [
			"Books",
			"Languages",
			"Art"
		],
		hello: "Noor, Cairo. The street is still arguing downstairs and I'm letting it.",
		topics: {
			Books: ["Which book do you lend and then quietly hope not to get back?", "I'm reading poetry so short it feels like eavesdropping. You?"],
			Languages: ["Cairo talks over itself. How many languages do you hear in a day in {city}?"],
			Art: ["I like art that doesn't explain itself. Seen anything like that lately?"]
		},
		fallback: [
			"What should I know about {city} that a guide would skip?",
			"Start wherever you are. I'll keep up.",
			"Ask me about the street, a book, or nothing in particular."
		]
	}
];
function pick(lines, salt) {
	if (lines.length === 0) return "I'm here.";
	let h = 0;
	for (let i = 0; i < salt.length; i += 1) h = (h + salt.charCodeAt(i) * (i + 1)) % 997;
	return lines[h % lines.length] ?? lines[0];
}
function pickPersona(interests, avoidId) {
	const wanted = new Set(interests.map((tag) => tag.toLowerCase()));
	const pool = PERSONAS.filter((persona) => persona.id !== avoidId);
	const ranked = (pool.length > 0 ? pool : PERSONAS).map((persona) => ({
		persona,
		score: persona.interests.reduce((sum, tag) => sum + (wanted.has(tag.toLowerCase()) ? 1 : 0), 0)
	}));
	ranked.sort((a, b) => b.score - a.score);
	const top = ranked.filter((item) => item.score === ranked[0].score);
	return top[Math.floor(Math.random() * top.length)]?.persona ?? PERSONAS[0];
}
function hostedReply(persona, text, userCity) {
	const city = userCity.trim() || "your city";
	const q = text.toLowerCase();
	const fill = (line) => line.replaceAll("{city}", city);
	if (/\b(where|from|city|live|based|country)\b/.test(q)) return `I'm in ${persona.city}, ${persona.country}. You're showing up as ${city}. What's the night like there?`;
	if (/\b(name|who are you)\b/.test(q)) return `I'm ${persona.name}. Hosted, so I'm a stand-in when the queue is empty — still happy to talk.`;
	for (const interest of persona.interests) if (q.includes(interest.toLowerCase())) return fill(pick(persona.topics[interest] ?? [], text));
	if (q.includes("?")) return fill(pick(persona.fallback, `${text}?`));
	return fill(pick(persona.fallback, text));
}
function mergeLines(current, incoming) {
	const map = new Map(current.map((line) => [line.id, line]));
	for (const line of incoming) map.set(String(line.id), {
		id: String(line.id),
		fromSelf: line.fromSelf,
		body: line.body
	});
	return [...map.values()].sort((a, b) => Number(a.id) - Number(b.id));
}
function hostedLane(persona, selfId, place, interests) {
	return {
		id: "hosted",
		youAre: "a",
		self: {
			id: selfId,
			...place,
			interests
		},
		partner: {
			id: persona.name,
			city: persona.city,
			region: persona.region,
			country: persona.country,
			interests: persona.interests
		},
		youVoice: false,
		partnerVoice: false,
		youVideo: false,
		partnerVideo: false
	};
}
function ElsewhereApp() {
	const [tab, setTab] = (0, import_react.useState)("talk");
	const [selfId, setSelfId] = (0, import_react.useState)(null);
	const [place, setPlace] = (0, import_react.useState)({
		city: "",
		region: "",
		country: ""
	});
	const [locating, setLocating] = (0, import_react.useState)(true);
	const [people, setPeople] = (0, import_react.useState)(null);
	const [phase, setPhase] = (0, import_react.useState)({ kind: "lobby" });
	const [error, setError] = (0, import_react.useState)(null);
	const [waited, setWaited] = (0, import_react.useState)(false);
	const searchRef = (0, import_react.useRef)(null);
	const sinceRef = (0, import_react.useRef)(0);
	const selfRef = (0, import_react.useRef)(null);
	const phaseRef = (0, import_react.useRef)(phase);
	phaseRef.current = phase;
	selfRef.current = selfId;
	(0, import_react.useEffect)(() => {
		const id = loadSelfId();
		setSelfId(id);
		let cancel = false;
		detectPlace().then((next) => {
			if (!cancel) {
				setPlace(next);
				setLocating(false);
			}
		});
		lobbyStats().then((stats) => {
			if (!cancel) setPeople(stats.people);
		});
		const saved = loadSavedLane();
		if (saved) pollLane({ data: {
			selfId: id,
			laneId: saved,
			since: 0
		} }).then((result) => {
			if (cancel) return;
			if (result.ok && result.status === "live") {
				sinceRef.current = result.messages.reduce((max, message) => Math.max(max, message.id), 0);
				setPhase({
					kind: "live",
					lane: result.lane,
					lines: result.messages.map((message) => ({
						id: String(message.id),
						fromSelf: message.fromSelf,
						body: message.body
					})),
					ended: false
				});
			} else saveLane(null);
		});
		return () => {
			cancel = true;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		if (phase.kind !== "lobby") return;
		const id = window.setInterval(() => {
			lobbyStats().then((stats) => setPeople(stats.people));
		}, 8e3);
		return () => window.clearInterval(id);
	}, [phase.kind]);
	(0, import_react.useEffect)(() => {
		if (phase.kind !== "search" || !selfId) return;
		let stop = false;
		const tick = async () => {
			const current = searchRef.current;
			if (!current || stop) return;
			const result = await seekLane({ data: {
				selfId,
				city: current.place.city,
				region: current.place.region,
				country: current.place.country,
				interests: current.interests,
				openMatch: current.openMatch
			} });
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
				setPhase({
					kind: "live",
					lane: result.lane,
					lines: [],
					ended: false
				});
			}
		};
		tick();
		const id = window.setInterval(() => void tick(), 1500);
		return () => {
			stop = true;
			window.clearInterval(id);
		};
	}, [phase.kind, selfId]);
	const liveId = phase.kind === "live" ? phase.lane.id : "";
	const liveEnded = phase.kind === "live" ? phase.ended : false;
	(0, import_react.useEffect)(() => {
		if (phase.kind !== "live" || liveEnded || !selfId || !liveId) return;
		const laneId = liveId;
		let stop = false;
		const tick = async () => {
			const result = await pollLane({ data: {
				selfId,
				laneId,
				since: sinceRef.current
			} });
			if (stop) return;
			if (!result.ok) {
				setError(result.error);
				return;
			}
			if (result.messages.length > 0) sinceRef.current = result.messages.reduce((max, message) => Math.max(max, message.id), sinceRef.current);
			setPhase((current) => {
				if (current.kind !== "live" || current.lane.id !== laneId) return current;
				const lines = mergeLines(current.lines, result.messages);
				if (result.status === "live") return {
					...current,
					lane: result.lane,
					lines,
					ended: false
				};
				saveLane(null);
				return {
					...current,
					lines,
					ended: true
				};
			});
		};
		tick();
		const id = window.setInterval(() => void tick(), 1200);
		return () => {
			stop = true;
			window.clearInterval(id);
		};
	}, [
		liveEnded,
		liveId,
		phase.kind,
		selfId
	]);
	(0, import_react.useEffect)(() => {
		if (phase.kind !== "search") {
			setWaited(false);
			return;
		}
		const id = window.setTimeout(() => setWaited(true), 7e3);
		return () => window.clearTimeout(id);
	}, [phase.kind]);
	(0, import_react.useEffect)(() => {
		const onHide = () => {
			const id = selfRef.current;
			if (!id || phaseRef.current.kind !== "search") return;
			fetch("/api/presence", {
				method: "POST",
				keepalive: true,
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ selfId: id })
			});
		};
		window.addEventListener("pagehide", onHide);
		return () => window.removeEventListener("pagehide", onHide);
	}, []);
	function startSearch(value) {
		if (!selfId) return;
		setError(null);
		const nextPlace = {
			city: value.place.city.trim(),
			region: value.place.region,
			country: value.place.country
		};
		setPlace(nextPlace);
		searchRef.current = {
			place: nextPlace,
			interests: value.interests,
			openMatch: value.openMatch,
			started: Date.now()
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
		leaveQueue({ data: { selfId } });
		const persona = pickPersona(search.interests);
		setPhase({
			kind: "hosted",
			persona,
			lines: [],
			typing: true
		});
		window.setTimeout(() => {
			setPhase((current) => {
				if (current.kind !== "hosted" || current.persona.id !== persona.id) return current;
				return {
					...current,
					typing: false,
					lines: [{
						id: "hello",
						fromSelf: false,
						body: persona.hello
					}]
				};
			});
		}, 700);
	}
	function sendHosted(body) {
		setPhase((current) => {
			if (current.kind !== "hosted") return current;
			return {
				...current,
				typing: true,
				lines: [...current.lines, {
					id: crypto.randomUUID(),
					fromSelf: true,
					body
				}]
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
					lines: [...current.lines, {
						id: crypto.randomUUID(),
						fromSelf: false,
						body: reply
					}]
				};
			});
		}, 900);
	}
	async function sendLive(body) {
		if (phase.kind !== "live" || !selfId) return;
		const result = await sendLaneMessage({ data: {
			selfId,
			laneId: phase.lane.id,
			body
		} });
		if (!result.ok) {
			setError(result.error);
			return;
		}
		sinceRef.current = Math.max(sinceRef.current, result.message.id);
		setPhase((current) => {
			if (current.kind !== "live") return current;
			return {
				...current,
				lines: mergeLines(current.lines, [result.message])
			};
		});
	}
	async function onCall(mode) {
		if (phase.kind !== "live" || !selfId) return false;
		const result = await setLaneCall({ data: {
			selfId,
			laneId: phase.lane.id,
			mode
		} });
		if (!result.ok) {
			setError(result.error);
			return false;
		}
		setPhase((current) => current.kind === "live" ? {
			...current,
			lane: {
				...current.lane,
				youVoice: result.youVoice,
				partnerVoice: result.partnerVoice,
				youVideo: result.youVideo,
				partnerVideo: result.partnerVideo
			}
		} : current);
		return true;
	}
	async function closeLive() {
		if (phase.kind === "live" && selfId) await endLane({ data: {
			selfId,
			laneId: phase.lane.id
		} });
		saveLane(null);
		setPhase({ kind: "lobby" });
		setTab("talk");
	}
	function nextLane() {
		if (phase.kind === "hosted") {
			const persona = pickPersona(searchRef.current?.interests ?? [], phase.persona.id);
			setPhase({
				kind: "hosted",
				persona,
				lines: [],
				typing: true
			});
			window.setTimeout(() => {
				setPhase((current) => {
					if (current.kind !== "hosted" || current.persona.id !== persona.id) return current;
					return {
						...current,
						typing: false,
						lines: [{
							id: "hello",
							fromSelf: false,
							body: persona.hello
						}]
					};
				});
			}, 600);
			return;
		}
		if (phase.kind === "live" && selfId) {
			const laneId = phase.lane.id;
			endLane({ data: {
				selfId,
				laneId
			} });
		}
		saveLane(null);
		sinceRef.current = 0;
		if (!searchRef.current && phase.kind === "live") searchRef.current = {
			place,
			interests: phase.lane.self.interests,
			openMatch: phase.lane.self.interests.length === 0,
			started: Date.now()
		};
		if (searchRef.current) searchRef.current = {
			...searchRef.current,
			started: Date.now()
		};
		setPhase({ kind: "search" });
	}
	const chatting = phase.kind === "live" || phase.kind === "hosted";
	const placeLabel = locating ? "Locating…" : formatPlace(place);
	const chatLane = phase.kind === "live" ? phase.lane : phase.kind === "hosted" && selfId ? hostedLane(phase.persona, selfId, searchRef.current?.place ?? place, searchRef.current?.interests ?? []) : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex h-dvh w-full max-w-5xl flex-col px-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex shrink-0 items-center justify-between gap-3 border-b border-line py-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-2xl leading-none text-fg",
					children: "Elsewhere"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 truncate text-xs text-muted",
					children: placeLabel
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "flex rounded-sm border border-line p-1",
				"aria-label": "Sections",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: `pressable min-h-11 rounded-xs px-4 text-sm ${tab === "talk" ? "bg-subtle text-fg" : "text-muted"}`,
					onClick: () => setTab("talk"),
					children: "Talk"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: `pressable min-h-11 rounded-xs px-4 text-sm ${tab === "events" ? "bg-subtle text-fg" : "text-muted"}`,
					onClick: () => setTab("events"),
					children: "Events"
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: `min-h-0 flex-1 ${chatting && tab === "talk" ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: tab === "talk" ? "flex min-h-0 flex-1 flex-col" : "hidden",
				children: [
					phase.kind === "lobby" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lobby, {
						place,
						locating,
						people,
						error,
						onStart: startSearch
					}),
					phase.kind === "search" && searchRef.current && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Searching, {
						place: searchRef.current.place,
						interests: searchRef.current.interests,
						openMatch: searchRef.current.openMatch,
						waited,
						people,
						error,
						onHosted: meetHosted,
						onCancel: () => void cancelSearch()
					}),
					chatLane && (phase.kind === "live" || phase.kind === "hosted") && selfId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatPane, {
						selfId,
						lane: chatLane,
						lines: phase.lines,
						ended: phase.kind === "live" ? phase.ended : false,
						typing: phase.kind === "hosted" ? phase.typing : false,
						hosted: phase.kind === "hosted",
						error,
						onSend: phase.kind === "hosted" ? sendHosted : sendLive,
						onCall,
						onNext: nextLane,
						onClose: () => void closeLive()
					})
				]
			}), tab === "events" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EventsPane, { place })]
		})]
	});
}
var SplitComponent = ElsewhereApp;
//#endregion
export { SplitComponent as component };
