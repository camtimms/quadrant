-- Migration 4: keep each film's description (R14, R54).
-- Design reference: docs/specs/02-design.md sections 3.3 and 4.2.
--
-- The film page shows TMDB's description of the film. Like the title, year
-- and poster path, it is stored with our own copy of the film, so the page
-- of a film somebody has rated still works when TMDB is down.
--
-- "alter table ... add column" changes an existing table without touching
-- the rows already in it. Every existing film simply gets an empty value
-- (null) in the new column.
alter table public.titles
  add column overview text;

-- The two kinds of "nothing" mean different things here, on purpose:
--
--   null  we have not fetched a description for this film yet. That is every
--         film stored before this migration. The app fills it in the next
--         time the film's page is opened.
--   ''    we asked, and TMDB has no description for this film. Nothing more
--         to fetch.
--
-- Without that difference the app could not tell "never asked" from "asked,
-- and there is none", and would either never fill old films in or ask TMDB
-- again on every single view.
comment on column public.titles.overview is
  'TMDB''s description. null = not fetched yet; empty string = TMDB has none.';

-- No new permissions are needed. Members already may read every column of
-- titles and write none of them, and the server (service_role) may insert and
-- update: those permissions were granted on the whole table in migration 3,
-- so they cover a column added later. The row-level policies are unchanged.
