-- Voice is its own call flag. Video still implies the mic is live.
alter table ew_lanes add column if not exists a_voice boolean not null default false;
alter table ew_lanes add column if not exists b_voice boolean not null default false;
