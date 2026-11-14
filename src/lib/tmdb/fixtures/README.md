# TMDB fixtures

Real responses from the TMDB API, captured on 2026-11-14 and saved untouched
apart from indentation. The parser tests run against these, so the tests
describe what TMDB actually sends rather than what we assume it sends.

Do not edit them by hand. To add a case, make the real request and save the
whole body.

| File | Request | Why it is here |
| --- | --- | --- |
| `search-commando.json` | `GET /3/search/movie?query=commando&include_adult=false&page=1` | One page holding a normal film (id 10999), two with no poster (1420715, 940200) and one with no release date (718096) |
| `search-empty.json` | `GET /3/search/movie?query=zzzzqqqqxxxxjjjj&include_adult=false&page=1` | A search with no matches |
| `movie-normal.json` | `GET /3/movie/10999` | Details of a normal film |
| `movie-no-poster.json` | `GET /3/movie/1420715` | `poster_path` is `null` |
| `movie-no-release-date.json` | `GET /3/movie/718096` | `release_date` is `""` (an empty string, not `null`) |
| `movie-not-found.json` | `GET /3/movie/999999999` | The body sent with HTTP 404 |
| `configuration.json` | `GET /3/configuration` | The image base address and the poster size names |
