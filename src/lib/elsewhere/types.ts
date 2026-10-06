export type Place = {
  city: string;
  region: string;
  country: string;
};

export type LocationScope = "city" | "region" | "country" | "worldwide";
export type ChatMedium = "text" | "voice" | "video";

export type Person = Place & {
  id: string;
  interests: string[];
};

export type ProfileInput = Place & {
  selfId: string;
  interests: string[];
  openMatch: boolean;
  scope?: LocationScope;
  medium?: ChatMedium;
};

export type CallMode = "off" | "voice" | "video";

export type LaneDTO = {
  id: string;
  youAre: "a" | "b";
  self: Person;
  partner: Person;
  youVoice: boolean;
  partnerVoice: boolean;
  youVideo: boolean;
  partnerVideo: boolean;
  medium?: ChatMedium;
};

export type ChatMessage = {
  id: number;
  fromSelf: boolean;
  body: string;
  at: string;
};

export type SeekResult =
  | { ok: true; status: "waiting"; people: number }
  | { ok: true; status: "matched"; people: number; lane: LaneDTO }
  | { ok: false; error: string };

export type PollResult =
  | { ok: true; status: "live"; lane: LaneDTO; messages: ChatMessage[]; partnerTyping?: boolean }
  | { ok: true; status: "ended" | "missing"; messages: ChatMessage[] }
  | { ok: false; error: string };

export type EventDTO = {
  id: string;
  title: string;
  blurb: string;
  city: string;
  region?: string;
  country?: string;
  place: string;
  startsAt: string;
  tags: string[];
  hostLabel: string;
  goingCount: number;
  going: boolean;
  mine: boolean;
};

export type DraftEvent = {
  title: string;
  blurb: string;
  city: string;
  region?: string;
  country?: string;
  place: string;
  startsAt: string;
  tags: string[];
  hostLabel: string;
  token: string;
};
