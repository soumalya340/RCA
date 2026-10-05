-- Ephemeral matchmaking relay (purged on a short timer) plus a public events board.
-- No accounts. Rows are unowned. Chat text is not an archive: polls delete it
-- when a lane closes and again after a few hours.

create table if not exists ew_waiters (
  id text primary key,
  interests text not null default '',
  city text not null default '',
  region text not null default '',
  country text not null default '',
  open_match boolean not null default true,
  claimed_by text,
  heartbeat_at timestamptz not null default now()
);

create table if not exists ew_lanes (
  id text primary key,
  a_id text not null,
  b_id text not null,
  a_city text not null default '',
  a_region text not null default '',
  a_country text not null default '',
  a_interests text not null default '',
  b_city text not null default '',
  b_region text not null default '',
  b_country text not null default '',
  b_interests text not null default '',
  a_video boolean not null default false,
  b_video boolean not null default false,
  a_seen timestamptz not null default now(),
  b_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists ew_lanes_a_idx on ew_lanes (a_id);
create index if not exists ew_lanes_b_idx on ew_lanes (b_id);

create table if not exists ew_messages (
  id bigserial primary key,
  lane_id text not null,
  sender_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists ew_messages_lane_idx on ew_messages (lane_id, id);

create table if not exists ew_events (
  id text primary key,
  title text not null,
  blurb text not null default '',
  city text not null,
  place text not null,
  starts_at timestamptz not null,
  tags text not null default '',
  host_label text not null default 'Anonymous',
  host_token text not null,
  base_going integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists ew_events_starts_idx on ew_events (starts_at);

create table if not exists ew_rsvps (
  event_id text not null,
  token text not null,
  primary key (event_id, token)
);
