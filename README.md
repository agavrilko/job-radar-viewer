# Job Radar Viewer

Public web-project repository, attached to the local Job Radar project as a submodule.

`data/jobs.json` is generated from the Core normalized_vacancies table. It contains
public vacancy fields, source health, a generation timestamp and schema version.
Coverage is partial; inspect eligibility, salary_match, verification and timestamps.
Schema version 2 adds `update_sequence`, a persistent integer allocated by Core.
Publication commits use `Update job data #000001` (incrementing thereafter).
Retries reuse the same saved snapshot and sequence; a matching remote sequence and
payload requires no additional commit or push.
`needs_review` entries are leads, not confirmed matches. Source failure means old
verification evidence may be stale. Never interpret a historical open check as a
guarantee that a job remains available.

`index.html` is a responsive, buildless dashboard. It loads `./data/jobs.json` and
shows every vacancy, searchable across all fields. Expand a job to read the full
description and every original record field. Source health and snapshot metadata
are available above the list. Dates use the browser's local time; record details
also retain their original timestamps. Refresh reloads JSON without reloading the page.

The page supports the existing schema-1 snapshot and schema-2 numbered snapshots.
All source text is rendered as text, and job links accept only HTTP(S) URLs.
There are no external libraries, fonts, build tools or API credentials.

For local preview, from the parent project run `py -m http.server 8765 --directory Viewer`
and open http://localhost:8765. Serve the page over HTTP rather than opening the HTML
directly from disk, because browsers restrict local JSON fetching.

For GitHub Pages, choose Settings > Pages > Deploy from a branch, then select
`master` and `/ (root)`. The HTML, CSS, JavaScript and JSON are all in this repository.
GitHub Pages deployment must be enabled separately if it has not already been configured.
Do not add database files, logs, credentials, CVs or private review decisions here.
