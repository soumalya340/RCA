-- Location scope (city/region/country/worldwide) and preferred medium (text/voice/video)
alter table ew_waiters add column if not exists scope text not null default 'worldwide';
alter table ew_waiters add column if not exists medium text not null default 'text';
alter table ew_lanes add column if not exists medium text not null default 'text';
alter table ew_events add column if not exists region text not null default '';
alter table ew_events add column if not exists country text not null default '';
