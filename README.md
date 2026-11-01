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

The HTML dashboard and GitHub Pages deployment are not implemented yet.
Fetch JSON with a relative URL (`./data/jobs.json`) when building the dashboard.
Do not add database files, logs, credentials, CVs or private review decisions here.
