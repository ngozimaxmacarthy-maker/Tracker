import { useState, useEffect } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const SAVING_TARGET = 10000;
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

const GOAL_STEPS = {
  notary: {
    label: "Notary Public", emoji: "📋", color: "#E8C547",
    steps: [
      { id: "n1", text: "Download NY Notary study booklet from dos.ny.gov", done: false },
      { id: "n2", text: "Study License Law booklet (2–3 hrs total)", done: false },
      { id: "n3", text: "Walk in to exam location in NYC ($15, no scheduling)", done: false },
      { id: "n4", text: "Download & notarize Oath of Office (DOS-2201)", done: false },
      { id: "n5", text: "Submit application via NY Business Express ($60)", done: false },
      { id: "n6", text: "Commission arrives in mail ✓", done: false },
    ],
  },
  llc: {
    label: "Form LLC", emoji: "🏢", color: "#FF7A5C",
    steps: [
      { id: "l1", text: "Review new job offer for side-business restrictions", done: false },
      { id: "l2", text: "Choose LLC name & check NY availability", done: false },
      { id: "l3", text: "File Articles of Organization via NY DOS ($200)", done: false },
      { id: "l4", text: "Get EIN from IRS (free, online)", done: false },
      { id: "l5", text: "Open a business bank account", done: false },
      { id: "l6", text: "LLC active ✓", done: false },
    ],
  },
  website: {
    label: "Website", emoji: "🌐", color: "#7ED8A4",
    steps: [
      { id: "w1", text: "Define your offer: what does the site sell/show?", done: false },
      { id: "w2", text: "Choose domain name & register it", done: false },
      { id: "w3", text: "Pick platform (Squarespace, Webflow, etc.)", done: false },
      { id: "w4", text: "Build & publish MVP — 3 pages max", done: false },
      { id: "w5", text: "Add notary services page", done: false },
      { id: "w6", text: "Site live ✓", done: false },
    ],
  },
};

const ROADMAP = [
  { month: "May", focus: "Pass notary exam. Update resume + LinkedIn.", color: "#E8C547" },
  { month: "Jun", focus: "Submit notary application. 8 applications sent.", color: "#E8C547" },
  { month: "Jul", focus: "Commission arrives. Actively interviewing.", color: "#5B8FFF" },
  { month: "Aug", focus: "Land offer. Review for LLC restrictions.", color: "#5B8FFF" },
  { month: "Sep", focus: "Form LLC. Start website.", color: "#FF7A5C" },
  { month: "Oct", focus: "Website live. $10k saved. Exit ready.", color: "#7ED8A4" },
];

const STATUS_CONFIG = {
  "Saved":        { color: "#555",    bg: "#1A1A1A" },
  "Applied":      { color: "#5B8FFF", bg: "#0D1829" },
  "Interviewing": { color: "#E8C547", bg: "#1A1600" },
  "Offer":        { color: "#7ED8A4", bg: "#0A1A10" },
  "Rejected":     { color: "#FF7A5C", bg: "#1A0D0A" },
};

const EDUCATION_KEYWORDS = [
  "education","edtech","learning","curriculum","k-12","k12","school","university",
  "college","academic","training","workforce","instructional","student","teaching",
  "literacy","stem","classroom","district","nonprofit","talent development","l&d",
  "learning & development","learning and development","maintainx educational",
  "general motors learning","ubc",
];
const EXCLUDED_KEYWORDS = ["staffing","recruiter","recruiting agency","sales","insurance","real estate","marketing manager","remotehunter","synergis"];
const SENIOR_KEYWORDS = ["senior","lead","manager","director","sr.","principal","head of"];

function isGoodFit(role, company) {
  const text = `${role} ${company}`.toLowerCase();
  return EDUCATION_KEYWORDS.some(k => text.includes(k))
    && !EXCLUDED_KEYWORDS.some(k => text.includes(k))
    && SENIOR_KEYWORDS.some(k => text.includes(k));
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((new Date() - new Date(dateStr)) / 86400000);
}

async function callClaude(prompt, maxTokens = 1000) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.find(b => b.type === "text")?.text || "";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StalenessTag({ days }) {
  if (days === null) return null;
  if (days <= 3)  return <Tag c="#7ED8A4" bg="#0A1A10">Fresh</Tag>;
  if (days <= 10) return <Tag c="#E8C547" bg="#1A1600">{days}d ago</Tag>;
  return <Tag c="#FF7A5C" bg="#1A0D0A">⚠ {days}d — follow up?</Tag>;
}

function TimeTag({ estimate }) {
  if (!estimate) return null;
  const isQuick = estimate.toLowerCase().includes("resume only") || estimate.includes("5 min") || estimate.includes("10 min");
  return <Tag c={isQuick ? "#7ED8A4" : "#E8C547"} bg={isQuick ? "#0A1A10" : "#1A1600"}>⏱ {estimate}</Tag>;
}

function Tag({ c, bg, children }) {
  return (
    <span style={{ fontSize: 10, color: c, background: bg, padding: "2px 7px", borderRadius: 2, fontFamily: "monospace", letterSpacing: 0.5 }}>
      {children}
    </span>
  );
}

function NavBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: "none",
      borderBottom: active ? "2px solid #E8C547" : "2px solid transparent",
      color: active ? "#F0EDE6" : "#444",
      padding: "14px 20px", fontSize: 11,
      letterSpacing: 3, textTransform: "uppercase",
      cursor: "pointer", fontFamily: "monospace",
      transition: "color 0.2s", whiteSpace: "nowrap",
    }}>{children}</button>
  );
}

function Input({ value, onChange, placeholder, type = "text", style = {} }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{
        background: "#0A0A0A", border: "1px solid #1E1E1E", borderRadius: 2,
        padding: "9px 12px", color: "#E8E4DC", fontSize: 13, outline: "none",
        width: "100%", boxSizing: "border-box", fontFamily: "Georgia, serif", ...style,
      }}
    />
  );
}

function SmallBtn({ onClick, disabled, color = "#333", children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: "transparent", border: "1px solid #1A1A1A", borderRadius: 2,
      padding: "4px 8px", color: disabled ? "#222" : color,
      fontSize: 10, fontFamily: "monospace", cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
    }}>{children}</button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FreedomPlan() {
  const [tab, setTab] = useState("jobs");

  const SEED_JOBS = [
    { id: "lj6", company: "The Luminos Fund", role: "Associate Director, Teaching & Learning", location: "Remote (GMT to GMT+4) or Boston/London/Accra", salary: "Verify ≥ $150k — nonprofit, confirm before applying", status: "Saved", appliedDate: "", url: "https://the-luminos-fund.breezy.hr/p/30ea355fadb9-associate-director-teaching-and-learning", notes: "⭐ Priority. Ghana + PYP + Zearn curriculum = near-perfect match. International nonprofit. Requires sample teacher guide/lesson plan. NO AI applications — write in your own voice. Verify salary first.", source: "manual", archived: false, timeEstimate: "" },
    { id: "lj2", company: "Affirm", role: "Senior Manager, Learning", location: "New York, NY", salary: "Verify ≥ $150k", status: "Saved", appliedDate: "", url: "https://www.linkedin.com/comm/jobs/view/4366537975/", notes: "🔥 Top pick. Fintech L&D, NYC, step up from current role. Confirm salary before applying.", source: "linkedin", archived: false, timeEstimate: "" },
    { id: "lj3", company: "General Motors", role: "Learning Program Manager, Corporate Staff", location: "United States", salary: "Verify ≥ $150k", status: "Saved", appliedDate: "", url: "https://www.linkedin.com/comm/jobs/view/4406666626/", notes: "Corporate workforce learning. Strong match for training background. 1 connection — reach out.", source: "linkedin", archived: false, timeEstimate: "" },
    { id: "lj4", company: "MaintainX", role: "Educational Program Manager", location: "United States", salary: "Verify ≥ $150k", status: "Saved", appliedDate: "", url: "https://www.linkedin.com/comm/jobs/view/4405766054/", notes: "Education-focused. Check salary — may be below floor. Good for contract/consulting conversation.", source: "linkedin", archived: false, timeEstimate: "" },
    { id: "lj5", company: "UBC", role: "Manager, Program Management", location: "United States", salary: "Verify ≥ $150k", status: "Saved", appliedDate: "", url: "https://www.linkedin.com/comm/jobs/view/4403795837/", notes: "University / higher ed. Actively hiring. Confirm remote status and comp before applying.", source: "linkedin", archived: false, timeEstimate: "" },
  ];

  const [goals, setGoals] = useState(GOAL_STEPS);
  const [jobs, setJobs] = useState(SEED_JOBS);
  const [savings, setSavings] = useState(0);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    try {
      const g = localStorage.getItem("fp_goals");
      const j = localStorage.getItem("fp_jobs");
      const s = localStorage.getItem("fp_savings");
      if (g) setGoals(JSON.parse(g));
      if (j) setJobs(JSON.parse(j));
      if (s) setSavings(parseInt(s) || 0);
    } catch {}
    setStorageReady(true);
  }, []);

  const [savingsInput, setSavingsInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [showArchived, setShowArchived] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [estimatingId, setEstimatingId] = useState(null);
  const [form, setForm] = useState({ company: "", role: "", location: "", salary: "", status: "Saved", appliedDate: "", url: "", notes: "", source: "manual", archived: false, timeEstimate: "" });

  useEffect(() => { if (!storageReady) return; try { localStorage.setItem("fp_goals", JSON.stringify(goals)); } catch {} }, [goals, storageReady]);
  useEffect(() => { if (!storageReady) return; try { localStorage.setItem("fp_jobs", JSON.stringify(jobs)); } catch {} }, [jobs, storageReady]);
  useEffect(() => { if (!storageReady) return; try { localStorage.setItem("fp_savings", savings.toString()); } catch {} }, [savings, storageReady]);

  const toggleStep = (gk, sid) => setGoals(p => ({ ...p, [gk]: { ...p[gk], steps: p[gk].steps.map(s => s.id === sid ? { ...s, done: !s.done } : s) } }));
  const getProgress = (gk) => { const s = goals[gk].steps; return Math.round(s.filter(x => x.done).length / s.length * 100); };

  const updateJobStatus = (id, status) => setJobs(p => p.map(j => j.id !== id ? j : { ...j, status, appliedDate: status === "Applied" && !j.appliedDate ? new Date().toISOString().split("T")[0] : j.appliedDate }));
  const archiveJob = (id) => setJobs(p => p.map(j => j.id === id ? { ...j, archived: true } : j));
  const unarchiveJob = (id) => setJobs(p => p.map(j => j.id === id ? { ...j, archived: false } : j));
  const deleteJob = (id) => setJobs(p => p.filter(j => j.id !== id));

  const saveForm = () => {
    if (!form.company && !form.role) return;
    if (editId) { setJobs(p => p.map(j => j.id === editId ? { ...j, ...form } : j)); setEditId(null); }
    else setJobs(p => [...p, { ...form, id: Date.now().toString() }]);
    setForm({ company: "", role: "", location: "", salary: "", status: "Saved", appliedDate: "", url: "", notes: "", source: "manual", archived: false, timeEstimate: "" });
    setShowAdd(false);
  };

  const startEdit = (job) => { setForm({ ...job }); setEditId(job.id); setShowAdd(true); };

  const fetchUrl = async () => {
    if (!urlInput.trim()) return;
    setFetchingUrl(true);
    try {
      const text = await callClaude(
        `Visit this job posting URL and extract the details: ${urlInput}

Return ONLY valid JSON with no markdown fences:
{
  "company": "Company name",
  "role": "Job title",
  "location": "Location or Remote",
  "salary": "Salary range if listed, else empty string",
  "notes": "1–2 sentence summary of what makes this role notable",
  "timeEstimate": "Estimated time to complete the application. Be specific, e.g. '~5 min (resume only)', '~20 min (resume + 4 screening questions)', '~45 min (resume + cover letter + 8 questions)'. Base this on what the application process typically looks like for this type of role/company."
}`
      );
      const match = text.match(/{[\s\S]*}/);
      if (match) {
        const p = JSON.parse(match[0]);
        setForm(prev => ({ ...prev, ...p, url: urlInput, source: "manual" }));
      }
    } catch {}
    setFetchingUrl(false);
    setUrlInput("");
  };

  const estimateTime = async (job) => {
    if (!job.url || !API_KEY) return;
    setEstimatingId(job.id);
    try {
      const text = await callClaude(
        `Look up this job posting: ${job.url}
Role: ${job.role} at ${job.company}

Estimate how long the application will take to complete. Consider:
- Does it require just a resume upload?
- Does it ask screening questions? How many?
- Does it require a cover letter?
- Does it require work samples or assessments?

Reply with ONLY a short estimate string like these examples:
"~5 min (resume only)"
"~15 min (resume + 3 screening questions)"
"~30 min (resume + cover letter + 6 questions)"
"~45 min (resume + cover letter + writing sample)"

Return just the estimate string, nothing else.`
      );
      const estimate = text.trim().replace(/^["']|["']$/g, "");
      setJobs(p => p.map(j => j.id === job.id ? { ...j, timeEstimate: estimate } : j));
    } catch {}
    setEstimatingId(null);
  };

  const importFromLinkedIn = async () => {
    setImporting(true);
    setImportLog("Checking Gmail for LinkedIn job alerts…");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 2000,
          mcp_servers: [{ type: "url", url: "https://gmailmcp.googleapis.com/mcp/v1", name: "gmail-mcp" }],
          messages: [{
            role: "user",
            content: `Search Gmail for the most recent email from jobalerts-noreply@linkedin.com (newer than 2 days). Extract ALL job listings and return a raw JSON array (no markdown):
[{ "company": "", "role": "", "location": "", "salary": "", "url": "", "fit": true/false }]

Set fit=true only if: role is education/edtech/L&D/workforce dev AND senior-level (Senior/Manager/Lead/Director/Principal/Head of) AND company is NOT a staffing agency.`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const allJobs = JSON.parse(match[0]);
        const goodFit = allJobs.filter(j => j.fit === true);
        const existingUrls = new Set(jobs.map(j => j.url));
        const newJobs = goodFit.filter(j => j.url && !existingUrls.has(j.url));
        if (newJobs.length > 0) {
          setJobs(p => [...p, ...newJobs.map(j => ({
            id: Date.now().toString() + Math.random(),
            company: j.company || "", role: j.role || "", location: j.location || "",
            salary: j.salary || "", url: j.url || "", notes: "",
            status: "Saved", appliedDate: "", source: "linkedin", archived: false, timeEstimate: "",
          }))]);
          setImportLog(`✓ Added ${newJobs.length} new role${newJobs.length > 1 ? "s" : ""}. ${allJobs.length - goodFit.length} filtered out.`);
        } else {
          setImportLog(`No new matching roles. ${allJobs.length} scanned.`);
        }
      } else {
        setImportLog("Couldn't parse jobs. Check your LinkedIn alerts are arriving.");
      }
    } catch {
      setImportLog("Import failed. Add your API key to Vercel env vars.");
    }
    setImporting(false);
  };

  const activeJobs = jobs.filter(j => !j.archived);
  const archivedJobs = jobs.filter(j => j.archived);
  const displayedJobs = showArchived
    ? archivedJobs
    : (filterStatus === "All" ? activeJobs : activeJobs.filter(j => j.status === filterStatus));

  const savingsPct = Math.min((savings / SAVING_TARGET) * 100, 100);

  const jobStats = {
    total: activeJobs.length,
    applied: activeJobs.filter(j => j.status === "Applied").length,
    interviewing: activeJobs.filter(j => j.status === "Interviewing").length,
    offers: activeJobs.filter(j => j.status === "Offer").length,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080808", fontFamily: "Georgia, serif", color: "#E8E4DC" }}>
      {!storageReady && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "#0C0C0C", borderBottom: "1px solid #1A1A1A", padding: "10px 28px", fontFamily: "monospace", fontSize: 11, color: "#444", letterSpacing: 2 }}>
          Loading your saved data…
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ background: "#0C0C0C", borderBottom: "1px solid #181818", padding: "36px 28px 0" }}>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
            <div>
              <p style={{ color: "#E8C547", fontSize: 9, letterSpacing: 5, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 10 }}>The Exit Plan</p>
              <h1 style={{ fontSize: "clamp(26px, 5vw, 42px)", fontWeight: 400, letterSpacing: "-0.5px", lineHeight: 1.1 }}>
                Financial Independence<br /><span style={{ color: "#E8C547" }}>on your terms.</span>
              </h1>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 11, color: "#333", fontFamily: "monospace", marginBottom: 4 }}>Exit Fund</p>
              <p style={{ fontSize: 24, color: savings >= SAVING_TARGET ? "#7ED8A4" : "#E8E4DC", fontWeight: 400 }}>
                ${savings.toLocaleString()} <span style={{ fontSize: 13, color: "#333" }}>/ $10,000</span>
              </p>
              <div style={{ width: 160, height: 3, background: "#1A1A1A", borderRadius: 2, marginTop: 6, marginLeft: "auto" }}>
                <div style={{ height: "100%", width: `${savingsPct}%`, background: "linear-gradient(90deg,#E8C547,#7ED8A4)", borderRadius: 2, transition: "width 0.5s" }} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
            {[["jobs", "💼 Jobs"], ["goals", "🎯 Goals"], ["savings", "💰 Savings"], ["roadmap", "🗓 Roadmap"]].map(([t, l]) => (
              <NavBtn key={t} active={tab === t} onClick={() => setTab(t)}>{l}</NavBtn>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "28px 28px 80px" }}>

        {/* ══ JOBS TAB ══ */}
        {tab === "jobs" && (
          <div>
            {/* Stats row */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
              {[["Total", jobStats.total, "#555"], ["Applied", jobStats.applied, "#5B8FFF"], ["Interviews", jobStats.interviewing, "#E8C547"], ["Offers", jobStats.offers, "#7ED8A4"]].map(([l, v, c]) => (
                <div key={l} style={{ background: "#0F0F0F", border: "1px solid #1A1A1A", borderRadius: 3, padding: "12px 20px", minWidth: 80 }}>
                  <div style={{ fontSize: 22, color: c, lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 9, color: "#333", fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>{l}</div>
                </div>
              ))}
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
                {importLog && (
                  <span style={{ fontSize: 11, color: importLog.startsWith("✓") ? "#7ED8A4" : "#555", fontFamily: "monospace", maxWidth: 300 }}>
                    {importLog}
                  </span>
                )}
                <button onClick={importFromLinkedIn} disabled={importing || !API_KEY} style={{
                  background: "#0D1829", border: "1px solid #5B8FFF", borderRadius: 2,
                  padding: "10px 16px", color: "#5B8FFF", fontSize: 11, fontFamily: "monospace",
                  cursor: (importing || !API_KEY) ? "not-allowed" : "pointer", letterSpacing: 1,
                  opacity: (importing || !API_KEY) ? 0.4 : 1,
                }}>
                  {importing ? "Scanning Gmail..." : "⟳ Import from LinkedIn"}
                </button>
                <button onClick={() => { setShowAdd(true); setEditId(null); setForm({ company: "", role: "", location: "", salary: "", status: "Saved", appliedDate: "", url: "", notes: "", source: "manual", archived: false, timeEstimate: "" }); }} style={{
                  background: "#E8C547", border: "none", borderRadius: 2,
                  padding: "10px 16px", color: "#080808", fontSize: 11, fontFamily: "monospace",
                  cursor: "pointer", letterSpacing: 1, fontWeight: 700,
                }}>+ Add Job</button>
              </div>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
              {!showArchived && ["All", ...Object.keys(STATUS_CONFIG)].map(s => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button key={s} onClick={() => setFilterStatus(s)} style={{
                    background: filterStatus === s ? (cfg?.bg || "#1A1A1A") : "transparent",
                    border: `1px solid ${filterStatus === s ? (cfg?.color || "#444") : "#1E1E1E"}`,
                    color: filterStatus === s ? (cfg?.color || "#E8E4DC") : "#444",
                    padding: "5px 12px", borderRadius: 2, fontSize: 10,
                    fontFamily: "monospace", cursor: "pointer", letterSpacing: 1,
                  }}>{s} {s !== "All" && <span style={{ opacity: 0.5 }}>{activeJobs.filter(j => j.status === s).length}</span>}</button>
                );
              })}
              <button onClick={() => { setShowArchived(v => !v); setFilterStatus("All"); }} style={{
                background: showArchived ? "#1A1A1A" : "transparent",
                border: `1px solid ${showArchived ? "#555" : "#1E1E1E"}`,
                color: showArchived ? "#888" : "#333",
                padding: "5px 12px", borderRadius: 2, fontSize: 10,
                fontFamily: "monospace", cursor: "pointer", letterSpacing: 1, marginLeft: "auto",
              }}>
                {showArchived ? "← Back" : `Archived ${archivedJobs.length > 0 ? `(${archivedJobs.length})` : ""}`}
              </button>
            </div>

            {/* Add/Edit form */}
            {showAdd && (
              <div style={{ background: "#0F0F0F", border: "1px solid #222", borderRadius: 4, padding: 24, marginBottom: 20 }}>
                <p style={{ color: "#5B8FFF", fontSize: 10, letterSpacing: 3, fontFamily: "monospace", textTransform: "uppercase", marginBottom: 16 }}>
                  {editId ? "Edit Job" : "Add Job"}
                </p>
                {!editId && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ color: "#444", fontSize: 11, fontFamily: "monospace", marginBottom: 6 }}>
                      Paste a job URL to auto-fill {!API_KEY && <span style={{ color: "#FF7A5C" }}>(add VITE_ANTHROPIC_API_KEY to Vercel to enable)</span>}
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://linkedin.com/jobs/view/..." style={{ flex: 1 }} />
                      <button onClick={fetchUrl} disabled={fetchingUrl || !API_KEY} style={{
                        background: "#1A2540", border: "1px solid #5B8FFF", borderRadius: 2,
                        padding: "9px 14px", color: "#5B8FFF", fontSize: 11, fontFamily: "monospace",
                        cursor: (fetchingUrl || !API_KEY) ? "not-allowed" : "pointer",
                        opacity: (fetchingUrl || !API_KEY) ? 0.5 : 1,
                      }}>
                        {fetchingUrl ? "Fetching…" : "Fetch + Estimate"}
                      </button>
                    </div>
                    {form.timeEstimate && (
                      <p style={{ marginTop: 8, fontSize: 11, color: "#E8C547", fontFamily: "monospace" }}>
                        ⏱ {form.timeEstimate}
                      </p>
                    )}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  {[["company", "Company", "Teach For America"], ["role", "Role", "Senior Program Manager"], ["location", "Location", "New York, NY"], ["salary", "Salary", "$130k–$160k"]].map(([k, l, ph]) => (
                    <div key={k}>
                      <p style={{ color: "#333", fontSize: 10, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>{l}</p>
                      <Input value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} placeholder={ph} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <p style={{ color: "#333", fontSize: 10, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>Status</p>
                    <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={{ width: "100%", background: "#0A0A0A", border: "1px solid #1E1E1E", borderRadius: 2, padding: "9px 12px", color: "#E8E4DC", fontSize: 13, outline: "none" }}>
                      {Object.keys(STATUS_CONFIG).map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <p style={{ color: "#333", fontSize: 10, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>Date Applied</p>
                    <Input type="date" value={form.appliedDate} onChange={e => setForm(p => ({ ...p, appliedDate: e.target.value }))} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ color: "#333", fontSize: 10, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>Notes</p>
                  <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Why this role? Any connections?" style={{ width: "100%", background: "#0A0A0A", border: "1px solid #1E1E1E", borderRadius: 2, padding: "9px 12px", color: "#E8E4DC", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "Georgia, serif" }} />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={saveForm} style={{ background: "#E8C547", border: "none", borderRadius: 2, padding: "10px 20px", color: "#080808", fontSize: 11, fontFamily: "monospace", cursor: "pointer", fontWeight: 700, letterSpacing: 1 }}>
                    {editId ? "Save Changes" : "Add to Pipeline"}
                  </button>
                  <button onClick={() => { setShowAdd(false); setEditId(null); }} style={{ background: "transparent", border: "1px solid #1E1E1E", borderRadius: 2, padding: "10px 20px", color: "#444", fontSize: 11, fontFamily: "monospace", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Job cards */}
            {displayedJobs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#222" }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>{showArchived ? "🗂" : "📭"}</p>
                <p style={{ fontFamily: "monospace", fontSize: 13 }}>
                  {showArchived ? "No archived jobs." : `No jobs here. Hit "Import from LinkedIn" or add one manually.`}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {displayedJobs.map(job => {
                  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG["Saved"];
                  const days = daysSince(job.appliedDate);
                  const isEstimating = estimatingId === job.id;
                  return (
                    <div key={job.id} style={{ background: "#0C0C0C", border: "1px solid #161616", borderLeft: `3px solid ${job.archived ? "#222" : cfg.color}`, borderRadius: 3, padding: "14px 18px", opacity: job.archived ? 0.6 : 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                            <span style={{ fontSize: 14 }}>{job.role}</span>
                            <span style={{ color: "#333" }}>@</span>
                            <span style={{ fontSize: 14, color: "#5B8FFF" }}>{job.company}</span>
                            {job.source === "linkedin" && <Tag c="#333" bg="#111">LinkedIn</Tag>}
                            {days !== null && <StalenessTag days={days} />}
                            {job.timeEstimate && <TimeTag estimate={job.timeEstimate} />}
                          </div>
                          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                            {job.location && <span style={{ fontSize: 11, color: "#444", fontFamily: "monospace" }}>📍 {job.location}</span>}
                            {job.salary && <span style={{ fontSize: 11, color: "#7ED8A4", fontFamily: "monospace" }}>💰 {job.salary}</span>}
                            {job.appliedDate && <span style={{ fontSize: 11, color: "#333", fontFamily: "monospace" }}>Applied {job.appliedDate}</span>}
                          </div>
                          {job.notes && <p style={{ fontSize: 12, color: "#3A3A3A", marginTop: 5, fontStyle: "italic" }}>{job.notes}</p>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                          {!job.archived && (
                            <select value={job.status} onChange={e => updateJobStatus(job.id, e.target.value)} style={{ background: cfg.bg, border: `1px solid ${cfg.color}`, borderRadius: 2, padding: "4px 8px", color: cfg.color, fontSize: 10, fontFamily: "monospace", cursor: "pointer", outline: "none", letterSpacing: 1 }}>
                              {Object.keys(STATUS_CONFIG).map(s => <option key={s}>{s}</option>)}
                            </select>
                          )}
                          {!job.archived && (
                            <SmallBtn onClick={() => startEdit(job)}>Edit</SmallBtn>
                          )}
                          {job.url && !job.archived && API_KEY && !job.timeEstimate && (
                            <SmallBtn onClick={() => estimateTime(job)} disabled={isEstimating} color="#E8C547">
                              {isEstimating ? "…" : "⏱ Estimate"}
                            </SmallBtn>
                          )}
                          {job.url && (
                            <a href={job.url} target="_blank" rel="noreferrer" style={{ background: "transparent", border: "1px solid #1A1A1A", borderRadius: 2, padding: "4px 8px", color: "#333", fontSize: 10, fontFamily: "monospace", textDecoration: "none" }}>↗</a>
                          )}
                          {job.archived ? (
                            <SmallBtn onClick={() => unarchiveJob(job.id)} color="#5B8FFF">Restore</SmallBtn>
                          ) : (
                            <SmallBtn onClick={() => archiveJob(job.id)} color="#555">Archive</SmallBtn>
                          )}
                          <SmallBtn onClick={() => { if (window.confirm(`Delete "${job.role}" permanently?`)) deleteJob(job.id); }} color="#FF7A5C">Delete</SmallBtn>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Weekly rhythm footer */}
            {!showArchived && (
              <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[["Internal — this week", "Send 2 applications. Mark saved jobs as Applied."], ["External — this week", "DM 1 person. Go to 1 event. Ask for 1 intro."]].map(([t, d]) => (
                  <div key={t} style={{ background: "#0C0C0C", border: "1px solid #161616", borderRadius: 3, padding: "16px 18px" }}>
                    <p style={{ color: "#333", fontSize: 9, fontFamily: "monospace", letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>{t}</p>
                    <p style={{ fontSize: 13, color: "#666" }}>{d}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ GOALS TAB ══ */}
        {tab === "goals" && (
          <div>
            <p style={{ color: "#333", fontSize: 11, fontFamily: "monospace", marginBottom: 28 }}>
              Sequenced for completion. Finish one before starting the next.
            </p>
            {Object.entries(goals).map(([key, goal], i) => {
              const pct = getProgress(key);
              return (
                <div key={key} style={{ marginBottom: 24, background: "#0C0C0C", border: "1px solid #161616", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #141414", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ width: 26, height: 26, borderRadius: "50%", border: `1.5px solid ${goal.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: goal.color, fontFamily: "monospace", fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: 15 }}>{goal.emoji} {goal.label}</span>
                    </div>
                    <span style={{ fontSize: 11, color: pct === 100 ? goal.color : "#333", fontFamily: "monospace" }}>{pct}%</span>
                  </div>
                  <div style={{ height: 2, background: "#141414" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: goal.color, transition: "width 0.4s" }} />
                  </div>
                  {goal.steps.map(step => (
                    <div key={step.id} onClick={() => toggleStep(key, step.id)}
                      style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 22px", cursor: "pointer", borderBottom: "1px solid #0F0F0F" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#0F0F0F"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ width: 16, height: 16, borderRadius: 2, border: step.done ? `1.5px solid ${goal.color}` : "1.5px solid #222", background: step.done ? goal.color : "transparent", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                        {step.done && <svg width="9" height="7" viewBox="0 0 9 7"><path d="M1 3.5L3 6L8 1" stroke="#080808" strokeWidth="1.5" strokeLinecap="round" fill="none" /></svg>}
                      </div>
                      <span style={{ fontSize: 13, color: step.done ? "#2A2A2A" : "#B8B4AC", textDecoration: step.done ? "line-through" : "none", lineHeight: 1.5 }}>{step.text}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ SAVINGS TAB ══ */}
        {tab === "savings" && (
          <div style={{ maxWidth: 480 }}>
            <div style={{ textAlign: "center", padding: "40px 0 36px" }}>
              <p style={{ fontSize: "clamp(48px,10vw,72px)", fontWeight: 400, letterSpacing: -2, lineHeight: 1 }}>
                <span style={{ color: "#E8C547" }}>${savings.toLocaleString()}</span>
              </p>
              <p style={{ color: "#333", fontFamily: "monospace", fontSize: 12, marginTop: 8 }}>${(SAVING_TARGET - savings).toLocaleString()} to go</p>
            </div>
            <div style={{ height: 6, background: "#141414", borderRadius: 3, marginBottom: 32, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${savingsPct}%`, background: "linear-gradient(90deg,#E8C547,#7ED8A4)", borderRadius: 3, transition: "width 0.5s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 40 }}>
              {[2500, 5000, 7500, 10000].map(m => (
                <div key={m} style={{ textAlign: "center" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", border: savings >= m ? `1.5px solid #7ED8A4` : "1.5px solid #1E1E1E", background: savings >= m ? "#7ED8A4" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontSize: 12, color: savings >= m ? "#080808" : "transparent", fontWeight: 700 }}>✓</div>
                  <p style={{ fontFamily: "monospace", fontSize: 10, color: savings >= m ? "#7ED8A4" : "#222" }}>${(m / 1000).toFixed(0)}k</p>
                </div>
              ))}
            </div>
            <div style={{ background: "#0C0C0C", border: "1px solid #161616", borderRadius: 4, padding: 22 }}>
              <p style={{ color: "#333", fontSize: 10, fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Log a deposit</p>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#333", fontSize: 14 }}>$</span>
                  <Input value={savingsInput} onChange={e => setSavingsInput(e.target.value)} placeholder="0" style={{ paddingLeft: 26 }} />
                </div>
                <button onClick={() => { const v = parseInt(savingsInput); if (!isNaN(v) && v > 0) { setSavings(p => Math.min(p + v, SAVING_TARGET)); setSavingsInput(""); } }} style={{ background: "#E8C547", border: "none", borderRadius: 2, padding: "9px 20px", color: "#080808", fontSize: 11, fontFamily: "monospace", cursor: "pointer", fontWeight: 700, letterSpacing: 1 }}>Add</button>
              </div>
            </div>
            {savings >= SAVING_TARGET && <div style={{ marginTop: 20, padding: 20, background: "#0A1A0A", border: "1px solid #7ED8A4", borderRadius: 4, textAlign: "center" }}><p style={{ color: "#7ED8A4" }}>$10k reached. You&apos;re ready to exit. 🌱</p></div>}
          </div>
        )}

        {/* ══ ROADMAP TAB ══ */}
        {tab === "roadmap" && (
          <div>
            <p style={{ color: "#333", fontSize: 11, fontFamily: "monospace", marginBottom: 28 }}>6-month exit timeline.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
              {ROADMAP.map((m, i) => (
                <div key={i} style={{ background: "#0C0C0C", border: "1px solid #161616", borderTop: `2px solid ${m.color}`, borderRadius: 3, padding: "18px 20px" }}>
                  <p style={{ fontFamily: "monospace", fontSize: 10, color: m.color, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>{m.month}</p>
                  <p style={{ fontSize: 13, color: "#666", lineHeight: 1.7 }}>{m.focus}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 36, background: "#0C0C0C", border: "1px solid #161616", borderRadius: 3, padding: "20px 24px" }}>
              <p style={{ color: "#E8C547", fontSize: 10, fontFamily: "monospace", letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>Weekly rhythm</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {[["Internal", "Applications, notary study, LLC research — solo work that moves the plan."], ["External", "Reach out to 1 person, attend 1 event, ask for 1 intro — every week."]].map(([t, d]) => (
                  <div key={t}>
                    <p style={{ fontSize: 10, fontFamily: "monospace", color: "#333", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>{t}</p>
                    <p style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>{d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
