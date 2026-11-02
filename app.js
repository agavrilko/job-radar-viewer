"use strict";

const el = (id) => document.getElementById(id);
const state = { jobs: [], loaded: false };
const labels = {
  id: "Record ID", source_id: "Source job ID", source: "Source", company_priority: "Company priority",
  score: "Relevance score", eligibility: "Eligibility", employment_type: "Employment type",
  first_seen_at: "First discovered", last_seen_at: "Last observed", posted_at: "Published by source",
  last_verified_at: "Last verified", salary_match: "Salary match", verification: "Availability evidence",
  schema_version: "Schema version", run_id: "Collection run", generated_at: "Snapshot generated",
  update_sequence: "Update sequence", coverage: "Coverage", last_attempt_at: "Last attempt",
  last_success_at: "Last successful collection", status: "Status", found: "Listings found",
};
const readable = (value) => String(value).replaceAll("_", " ");
function text(tag, value, className = "") {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  return node;
}
function date(value) {
  if (!value) return "Not available";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium", timeStyle: "short",
  }).format(parsed);
}
function valueText(value, key = "") {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (key.endsWith("_at")) return `${date(value)} (${value})`;
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}
function safeURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch { return null; }
}
function recordFields(target, entries) {
  for (const [key, value] of entries) {
    target.append(text("dt", labels[key] || readable(key)), text("dd", valueText(value, key)));
  }
}
function badge(value, tone = "") { return text("span", value, `badge ${tone}`); }
function salaryLabel(salary) {
  if (!salary || typeof salary !== "object") return "Annual base salary unverified";
  const format = (amount) => {
    if (typeof amount !== "number" || !Number.isFinite(amount)) return "Not provided";
    try { return new Intl.NumberFormat(undefined, { style: "currency", currency: salary.currency || "USD", maximumFractionDigits: 0 }).format(amount); }
    catch { return `${amount} ${salary.currency || ""}`; }
  };
  return `${format(salary.min)} – ${format(salary.max)} · ${readable(salary.basis || "basis unverified")}`;
}
function jobCard(job, index) {
  const card = text("article", "", "job");
  const top = text("div", "", "job-top");
  const heading = text("div", "");
  heading.append(text("p", job.company || "Company not provided", "company"));
  const title = text("h3", "");
  const url = safeURL(job.url);
  if (url) {
    const link = text("a", job.title || "Untitled vacancy");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    title.append(link);
  } else title.textContent = job.title || "Untitled vacancy";
  heading.append(title, text("p", Array.isArray(job.locations) ? job.locations.join(" · ") : valueText(job.locations), "location"));
  top.append(heading, text("span", String(index + 1).padStart(2, "0"), "job-number"));
  const badges = text("div", "", "badges");
  badges.append(badge(readable(job.source || "Source unknown")));
  badges.append(badge(job.eligibility === "match" ? "Matches criteria" : readable(job.eligibility || "Needs review"), job.eligibility === "match" ? "positive" : "warning"));
  badges.append(badge(job.salary_match === "partial" ? "Salary range includes below $200k" : `Salary ${readable(job.salary_match || "unverified")}`, job.salary_match === "full" ? "positive" : "warning"));
  card.append(top, badges, text("p", salaryLabel(job.salary), "salary"));
  if (job.summary) card.append(text("p", job.summary, "job-summary"));
  if (Array.isArray(job.reasons) && job.reasons.length) card.append(text("p", job.reasons.join(" · "), "reason"));
  const verification = job.verification === "open" ? "Visible when last checked" : readable(job.verification || "Unverified");
  card.append(text("p", `${verification} · ${job.last_verified_at ? date(job.last_verified_at) : "No verification date"}`, "verification-note"));
  const details = document.createElement("details");
  details.append(text("summary", "Full description & record details"));
  details.append(text("h4", "Description", "detail-heading"), text("p", job.description || "No description provided.", "description"));
  const fields = text("dl", "", "record-grid");
  // Show every original field (including future fields), without injecting HTML.
  recordFields(fields, Object.entries(job).filter(([key]) => key !== "description"));
  details.append(fields);
  card.append(details);
  return card;
}
function renderJobs() {
  const query = el("search").value.trim().toLocaleLowerCase();
  const jobs = state.jobs.filter((job) => !query || JSON.stringify(job).toLocaleLowerCase().includes(query));
  el("count").textContent = query ? `${jobs.length} of ${state.jobs.length} jobs` : `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"}`;
  el("jobs").replaceChildren(...jobs.map(jobCard));
  el("empty").hidden = jobs.length !== 0;
  el("empty").textContent = state.jobs.length ? "No jobs match your search. Try another title, company or location." : "No jobs in this snapshot yet. Check the source status above for collection details.";
}
function renderSnapshot(data) {
  const age = Date.now() - new Date(data.generated_at).getTime();
  el("updated").textContent = `Snapshot updated ${date(data.generated_at)}${data.update_sequence != null ? ` · Update #${data.update_sequence}` : ""}`;
  el("coverage").textContent = `${age > 36 * 60 * 60 * 1000 ? "This snapshot is more than 36 hours old. " : ""}Coverage: ${readable(data.coverage || "not specified")}. Availability reflects the last verification, not a guarantee that a role is still open.`;
  el("sources").replaceChildren();
  for (const [source, info] of Object.entries(data.sources || {})) {
    const box = text("section", "", "source");
    box.append(text("h3", source === "linkedin" ? "LinkedIn" : source.charAt(0).toUpperCase() + source.slice(1)));
    const fields = document.createElement("dl");
    recordFields(fields, info && typeof info === "object" ? Object.entries(info) : [["status", info]]);
    box.append(fields);
    el("sources").append(box);
  }
  el("snapshot-details").replaceChildren();
  recordFields(el("snapshot-details"), Object.entries(data).filter(([key]) => !["jobs", "sources"].includes(key)));
}
async function load() {
  el("refresh").disabled = true;
  el("jobs").setAttribute("aria-busy", "true");
  el("status").className = "status";
  el("status").textContent = "Loading jobs…";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(new URL("./data/jobs.json", document.baseURI), { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`The data request returned HTTP ${response.status}.`);
    const data = await response.json();
    if (!data || !Array.isArray(data.jobs) || data.jobs.some((job) => !job || typeof job !== "object" || Array.isArray(job))) {
      throw new Error("The jobs file has an unexpected format.");
    }
    renderSnapshot(data);
    state.jobs = data.jobs;
    state.loaded = true;
    el("search").disabled = false;
    renderJobs();
    el("status").textContent = "";
  } catch (error) {
    el("status").className = "status error";
    const reason = error.name === "AbortError" ? "The request timed out." : error.message;
    el("status").textContent = `Could not refresh jobs. ${reason} ${state.loaded ? "The previously loaded snapshot is still shown. " : ""}Check your connection and select Refresh data to retry.${location.protocol === "file:" ? " Open this page through a web server or GitHub Pages, rather than directly from disk." : ""}`;
    if (!state.loaded) el("updated").textContent = "Snapshot unavailable";
  } finally {
    clearTimeout(timeout);
    el("refresh").disabled = false;
    el("jobs").setAttribute("aria-busy", "false");
  }
}
el("refresh").addEventListener("click", load);
el("search").addEventListener("input", renderJobs);
load();
