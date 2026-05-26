import { useState, useEffect } from "react";

// ─── Seed data (used only if localStorage is empty) ───────────────────────────

const SEED_JOBS = [
  {
    id: "lj1",
    company: "The Luminos Fund",
    role: "Associate Director, Teaching & Learning",
    location: "Remote (GMT to GMT+4) or Boston/London/Accra",
    salary: "Verify ≥ $150k — nonprofit, confirm before applying",
    status: "Saved",
    appliedDate: "",
    url: "https://the-luminos-fund.breezy.hr/p/30ea355fadb9-associate-director-teaching-and-learning",
    notes: "Priority. Ghana + PYP + Zearn curriculum = near-perfect match. International nonprofit. Requires sample teacher guide/lesson plan. NO AI applications — write in your own voice. Verify salary first.",
  },
  {
    id: "lj2",
    company: "Affirm",
    role: "Senior Manager, Learning",
    location: "New York, NY",
    salary: "Verify ≥ $150k",
    status: "Saved",
    appliedDate: "",
    url: "https://www.linkedin.com/comm/jobs/view/4366537975/",
    notes: "Top pick. Fintech L&D, NYC, step up from current role. Confirm salary before applying.",
  },
  {
    id: "lj3",
    company: "General Motors",
    role: "Learning Program Manager, Corporate Staff",
    location: "United States",
    salary: "Verify ≥ $150k",
    status: "Saved",
    appliedDate: "",
    url: "https://www.linkedin.com/comm/jobs/view/4406666626/",
    notes: "Corporate workforce learning. Strong match for training background. 1 connection — reach out.",
  },
  {
    id: "lj4",
    company: "MaintainX",
    role: "Educational Program Manager",
    location: "United States",
    salary: "Verify ≥ $150k",
    status: "Saved",
    appliedDate: "",
    url: "https://www.linkedin.com/comm/jobs/view/4405766054/",
    notes: "Education-focused. Check salary — may be below floor. Good for contract/consulting conversation.",
  },
  {
    id: "lj5",
    company: "UBC",
    role: "Manager, Program Management",
    location: "United States",
    salary: "Verify ≥ $150k",
    status: "Saved",
    appliedDate: "",
    url: "https://www.linkedin.com/comm/jobs/view/4403795837/",
    notes: "University / higher ed. Actively hiring. Confirm remote status and comp before applying.",
  },
];

const SEED_GOALS = {
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
  { month: "May",  focus: "Pass notary exam. Update resume + LinkedIn.", color: "#E8C547" },
  { month: "Jun",  focus: "Submit notary application. 8 applications sent.", color: "#E8C547" },
  { month: "Jul",  focus: "Commission arrives. Actively interviewing.", color: "#5B8FFF" },
  { month: "Aug",  focus: "Land offer. Review for LLC restrictions.", color: "#5B8FFF" },
  { month: "Sep",  focus: "Form LLC. Start website.", color: "#FF7A5C" },
  { month: "Oct",  focus: "Website live. $10k saved. Exit ready.", color: "#7ED8A4" },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const SAVING_TARGET = 10000;

const STATUS_CONFIG = {
  "Saved":        { color: "#666",    bg: "#141414" },
  "Applied":      { color: "#5B8FFF", bg: "#0D1829" },
  "Interviewing": { color: "#E8C547", bg: "#1A1600" },
  "Offer":        { color: "#7ED8A4", bg: "#0A1A10" },
  "Rejected":     { color: "#FF7A5C", bg: "#1A0D0A" },
  "Ruled Out":    { color: "#444",    bg: "#111"    },
};

const STATUSES = Object.keys(STATUS_CONFIG);

const TX_CATEGORIES = ["Paycheck", "Side income", "Freelance", "Bonus", "Gift", "Expense", "Other"];

// ─── localStorage helpers ─────────────────────────────────────────────────────

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((new Date() - new Date(dateStr)) / 86400000);
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(str) {
  if (!str) return "";
  const d = new Date(str + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function newJob(overrides = {}) {
  return {
    id: Date.now().toString() + Math.random(),
    company: "", role: "", location: "", salary: "",
    url: "", notes: "", status: "Saved", appliedDate: "",
    ...overrides,
  };
}

// ─── UI primitives ────────────────────────────────────────────────────────────

function Tag({ c, bg, children }) {
  return (
    <span style={{ fontSize: 10, color: c, background: bg, padding: "2px 7px", borderRadius: 2, fontFamily: "monospace", letterSpacing: 0.5 }}>
      {children}
    </span>
  );
}

function StalenessTag({ days }) {
  if (days === null) return null;
  if (days <= 3)  return <Tag c="#7ED8A4" bg="#0A1A10">Fresh</Tag>;
  if (days <= 10) return <Tag c="#E8C547" bg="#1A1600">{days}d ago</Tag>;
  return <Tag c="#FF7A5C" bg="#1A0D0A">⚠ {days}d — follow up?</Tag>;
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

function FieldLabel({ children }) {
  return <p style={{ color: "#333", fontSize: 10, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>{children}</p>;
}

function TextInput({ value, onChange, placeholder, type = "text", style = {} }) {
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

// ─── Job Form ─────────────────────────────────────────────────────────────────

function JobForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.company.trim() || form.role.trim();

  return (
    <div style={{ background: "#0F0F0F", border: "1px solid #222", borderRadius: 4, padding: 24, marginBottom: 20 }}>
      <p style={{ color: "#5B8FFF", fontSize: 10, letterSpacing: 3, fontFamily: "monospace", textTransform: "uppercase", marginBottom: 18 }}>
        {initial.id ? "Edit Job" : "Add Job"}
      </p>

      <div style={{ marginBottom: 12 }}>
        <FieldLabel>Job URL</FieldLabel>
        <TextInput value={form.url} onChange={e => set("url", e.target.value)} placeholder="https://linkedin.com/jobs/view/..." />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        {[["company", "Company", "Teach For America"], ["role", "Role", "Senior Program Manager"], ["location", "Location", "New York, NY / Remote"], ["salary", "Salary", "$130k–$160k"]].map(([k, l, ph]) => (
          <div key={k}>
            <FieldLabel>{l}</FieldLabel>
            <TextInput value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph} />
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <FieldLabel>Status</FieldLabel>
          <select value={form.status} onChange={e => set("status", e.target.value)}
            style={{ width: "100%", background: "#0A0A0A", border: "1px solid #1E1E1E", borderRadius: 2, padding: "9px 12px", color: "#E8E4DC", fontSize: 13, outline: "none" }}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>Date Applied</FieldLabel>
          <TextInput type="date" value={form.appliedDate} onChange={e => set("appliedDate", e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <FieldLabel>Notes</FieldLabel>
        <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3}
          placeholder="Why this role? Connections? Salary confirmed? Next steps?"
          style={{ width: "100%", background: "#0A0A0A", border: "1px solid #1E1E1E", borderRadius: 2, padding: "9px 12px", color: "#E8E4DC", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "Georgia, serif" }}
        />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => valid && onSave(form)} disabled={!valid}
          style={{ background: valid ? "#E8C547" : "#1A1A1A", border: "none", borderRadius: 2, padding: "10px 20px", color: valid ? "#080808" : "#333", fontSize: 11, fontFamily: "monospace", cursor: valid ? "pointer" : "default", fontWeight: 700, letterSpacing: 1 }}>
          {initial.id ? "Save Changes" : "Add to Pipeline"}
        </button>
        <button onClick={onCancel}
          style={{ background: "transparent", border: "1px solid #1E1E1E", borderRadius: 2, padding: "10px 20px", color: "#444", fontSize: 11, fontFamily: "monospace", cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job, onStatusChange, onEdit, onDelete }) {
  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG["Saved"];
  const days = daysSince(job.appliedDate);

  return (
    <div style={{ background: "#0C0C0C", border: "1px solid #161616", borderLeft: `3px solid ${cfg.color}`, borderRadius: 3, padding: "14px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 14 }}>{job.role || "Untitled Role"}</span>
            {job.company && <><span style={{ color: "#2A2A2A" }}>@</span><span style={{ fontSize: 14, color: "#5B8FFF" }}>{job.company}</span></>}
            {days !== null && <StalenessTag days={days} />}
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {job.location    && <span style={{ fontSize: 11, color: "#444", fontFamily: "monospace" }}>📍 {job.location}</span>}
            {job.salary      && <span style={{ fontSize: 11, color: "#7ED8A4", fontFamily: "monospace" }}>💰 {job.salary}</span>}
            {job.appliedDate && <span style={{ fontSize: 11, color: "#333", fontFamily: "monospace" }}>Applied {job.appliedDate}</span>}
          </div>
          {job.notes && <p style={{ fontSize: 12, color: "#3A3A3A", marginTop: 6, fontStyle: "italic", lineHeight: 1.5 }}>{job.notes}</p>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <select value={job.status} onChange={e => onStatusChange(job.id, e.target.value)}
            style={{ background: cfg.bg, border: `1px solid ${cfg.color}`, borderRadius: 2, padding: "4px 8px", color: cfg.color, fontSize: 10, fontFamily: "monospace", cursor: "pointer", outline: "none", letterSpacing: 1 }}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={() => onEdit(job)} style={{ background: "transparent", border: "1px solid #1A1A1A", borderRadius: 2, padding: "4px 8px", color: "#333", fontSize: 10, fontFamily: "monospace", cursor: "pointer" }}>Edit</button>
          {job.url && <a href={job.url} target="_blank" rel="noreferrer" style={{ background: "transparent", border: "1px solid #1A1A1A", borderRadius: 2, padding: "4px 8px", color: "#333", fontSize: 10, fontFamily: "monospace", textDecoration: "none" }}>↗</a>}
          <button onClick={() => onDelete(job.id)} style={{ background: "transparent", border: "none", color: "#222", fontSize: 18, cursor: "pointer", padding: "2px 6px", lineHeight: 1 }}>×</button>
        </div>
      </div>
    </div>
  );
}

// ─── Savings Tab ──────────────────────────────────────────────────────────────

function SavingsTab({ transactions, onAdd, onDelete, goal }) {
  const [amount, setAmount]   = useState("");
  const [note, setNote]       = useState("");
  const [category, setCategory] = useState("Paycheck");
  const [type, setType]       = useState("deposit");

  const balance = transactions.reduce((sum, t) => sum + t.amount, 0);
  const saved   = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const spent   = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
  const pct     = Math.min((balance / goal) * 100, 100);

  const handleAdd = () => {
    const v = parseFloat(amount);
    if (isNaN(v) || v <= 0) return;
    onAdd({
      id: Date.now().toString(),
      date: today(),
      amount: type === "deposit" ? v : -v,
      category,
      note: note.trim(),
    });
    setAmount("");
    setNote("");
  };

  const milestones = [goal * 0.25, goal * 0.5, goal * 0.75, goal];

  return (
    <div>
      {/* Balance hero */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
        {[
          ["Balance",  `$${Math.max(balance, 0).toLocaleString()}`, balance >= goal ? "#7ED8A4" : "#E8E4DC"],
          ["Saved in", `$${saved.toLocaleString()}`,                "#7ED8A4"],
          ["Spent",    `$${Math.abs(spent).toLocaleString()}`,      "#FF7A5C"],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: "#0C0C0C", border: "1px solid #161616", borderRadius: 3, padding: "18px 20px" }}>
            <p style={{ color: "#333", fontSize: 9, fontFamily: "monospace", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>{label}</p>
            <p style={{ fontSize: 26, color, fontWeight: 400, letterSpacing: -1 }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: "#333", fontFamily: "monospace", letterSpacing: 2 }}>EXIT FUND</span>
          <span style={{ fontSize: 10, color: pct >= 100 ? "#7ED8A4" : "#555", fontFamily: "monospace" }}>{Math.round(pct)}% of ${goal.toLocaleString()}</span>
        </div>
        <div style={{ height: 6, background: "#141414", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#E8C547,#7ED8A4)", borderRadius: 3, transition: "width 0.5s" }} />
        </div>
      </div>

      {/* Milestones */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
        {milestones.map(m => (
          <div key={m} style={{ textAlign: "center" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", border: balance >= m ? "1.5px solid #7ED8A4" : "1.5px solid #1E1E1E", background: balance >= m ? "#7ED8A4" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 5px", fontSize: 11, color: balance >= m ? "#080808" : "transparent", fontWeight: 700 }}>✓</div>
            <p style={{ fontFamily: "monospace", fontSize: 10, color: balance >= m ? "#7ED8A4" : "#222" }}>${(m / 1000).toFixed(0)}k</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
        {/* Log entry form */}
        <div style={{ background: "#0C0C0C", border: "1px solid #161616", borderRadius: 4, padding: 20 }}>
          <p style={{ color: "#E8C547", fontSize: 9, fontFamily: "monospace", letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>Log transaction</p>

          {/* Deposit / Expense toggle */}
          <div style={{ display: "flex", marginBottom: 14, gap: 0 }}>
            {[["deposit", "+ Deposit"], ["expense", "− Expense"]].map(([v, label]) => (
              <button key={v} onClick={() => setType(v)} style={{
                flex: 1, background: type === v ? (v === "deposit" ? "#0A1A10" : "#1A0D0A") : "transparent",
                border: `1px solid ${type === v ? (v === "deposit" ? "#7ED8A4" : "#FF7A5C") : "#1E1E1E"}`,
                color: type === v ? (v === "deposit" ? "#7ED8A4" : "#FF7A5C") : "#333",
                padding: "7px 0", fontSize: 10, fontFamily: "monospace", cursor: "pointer", letterSpacing: 1,
                borderRadius: v === "deposit" ? "2px 0 0 2px" : "0 2px 2px 0",
              }}>{label}</button>
            ))}
          </div>

          <div style={{ marginBottom: 10 }}>
            <FieldLabel>Amount ($)</FieldLabel>
            <TextInput value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" type="number" />
          </div>

          <div style={{ marginBottom: 10 }}>
            <FieldLabel>Category</FieldLabel>
            <select value={category} onChange={e => setCategory(e.target.value)}
              style={{ width: "100%", background: "#0A0A0A", border: "1px solid #1E1E1E", borderRadius: 2, padding: "9px 12px", color: "#E8E4DC", fontSize: 13, outline: "none" }}>
              {TX_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <FieldLabel>Note (optional)</FieldLabel>
            <TextInput value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. May paycheck, freelance gig…" />
          </div>

          <button onClick={handleAdd}
            style={{ width: "100%", background: type === "deposit" ? "#7ED8A4" : "#FF7A5C", border: "none", borderRadius: 2, padding: "10px 0", color: "#080808", fontSize: 11, fontFamily: "monospace", cursor: "pointer", fontWeight: 700, letterSpacing: 1 }}>
            {type === "deposit" ? "+ Add Deposit" : "− Log Expense"}
          </button>
        </div>

        {/* Transaction history */}
        <div>
          <p style={{ color: "#333", fontSize: 9, fontFamily: "monospace", letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>History</p>
          {transactions.length === 0 ? (
            <p style={{ color: "#222", fontFamily: "monospace", fontSize: 12 }}>No transactions yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 400, overflowY: "auto" }}>
              {[...transactions].reverse().map(tx => (
                <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0C0C0C", border: "1px solid #141414", borderRadius: 2, padding: "9px 12px", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: "#333", fontFamily: "monospace", flexShrink: 0 }}>{fmtDate(tx.date)}</span>
                      <span style={{ fontSize: 10, color: "#2A2A2A", fontFamily: "monospace", background: "#141414", padding: "1px 6px", borderRadius: 2 }}>{tx.category}</span>
                    </div>
                    {tx.note && <p style={{ fontSize: 11, color: "#3A3A3A", marginTop: 3, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.note}</p>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 14, fontFamily: "monospace", color: tx.amount >= 0 ? "#7ED8A4" : "#FF7A5C", fontWeight: 600 }}>
                      {tx.amount >= 0 ? "+" : "−"}${Math.abs(tx.amount).toLocaleString()}
                    </span>
                    <button onClick={() => onDelete(tx.id)} style={{ background: "transparent", border: "none", color: "#222", fontSize: 16, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {balance >= goal && (
            <div style={{ marginTop: 16, padding: 16, background: "#0A1A0A", border: "1px solid #7ED8A4", borderRadius: 3, textAlign: "center" }}>
              <p style={{ color: "#7ED8A4", fontFamily: "monospace", fontSize: 12 }}>$10k reached. You're ready to exit.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FreedomPlan() {
  const [tab,          setTab]          = useState("jobs");
  const [jobs,         setJobs]         = useState(null);   // null = not loaded yet
  const [goals,        setGoals]        = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [showForm,     setShowForm]     = useState(false);
  const [editJob,      setEditJob]      = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");

  // Load once from localStorage; fall back to seed data
  useEffect(() => {
    setJobs(load("fp_jobs", SEED_JOBS));
    setGoals(load("fp_goals", SEED_GOALS));
    setTransactions(load("fp_transactions", []));
  }, []);

  // Persist whenever state changes (skip while still loading)
  useEffect(() => { if (jobs         !== null) save("fp_jobs",         jobs);         }, [jobs]);
  useEffect(() => { if (goals        !== null) save("fp_goals",        goals);        }, [goals]);
  useEffect(() => { if (transactions !== null) save("fp_transactions", transactions); }, [transactions]);

  const loaded = jobs !== null && goals !== null && transactions !== null;

  // Jobs
  const addOrUpdateJob = (form) => {
    if (editJob) setJobs(p => p.map(j => j.id === form.id ? form : j));
    else         setJobs(p => [...p, newJob(form)]);
    setShowForm(false);
    setEditJob(null);
  };
  const updateStatus = (id, status) => setJobs(p => p.map(j => j.id !== id ? j : {
    ...j, status,
    appliedDate: status === "Applied" && !j.appliedDate ? today() : j.appliedDate,
  }));
  const startEdit  = (job) => { setEditJob(job); setShowForm(true); };
  const cancelForm = ()    => { setShowForm(false); setEditJob(null); };
  const deleteJob  = (id)  => setJobs(p => p.filter(j => j.id !== id));

  // Goals
  const toggleStep  = (gk, sid) => setGoals(p => ({ ...p, [gk]: { ...p[gk], steps: p[gk].steps.map(s => s.id === sid ? { ...s, done: !s.done } : s) } }));
  const getProgress = (gk)      => { const s = goals[gk].steps; return Math.round(s.filter(x => x.done).length / s.length * 100); };

  // Transactions
  const addTransaction    = (tx)  => setTransactions(p => [...p, tx]);
  const deleteTransaction = (id)  => setTransactions(p => p.filter(t => t.id !== id));

  const balance    = loaded ? transactions.reduce((sum, t) => sum + t.amount, 0) : 0;
  const filtered   = loaded ? (filterStatus === "All" ? jobs : jobs.filter(j => j.status === filterStatus)) : [];
  const savingsPct = Math.min((balance / SAVING_TARGET) * 100, 100);

  const stats = loaded ? {
    total:        jobs.length,
    applied:      jobs.filter(j => j.status === "Applied").length,
    interviewing: jobs.filter(j => j.status === "Interviewing").length,
    offers:       jobs.filter(j => j.status === "Offer").length,
  } : { total: 0, applied: 0, interviewing: 0, offers: 0 };

  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#333", fontFamily: "monospace", fontSize: 11, letterSpacing: 3 }}>LOADING…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#080808", fontFamily: "Georgia, serif", color: "#E8E4DC" }}>

      {/* ── Header ── */}
      <div style={{ background: "#0C0C0C", borderBottom: "1px solid #181818", padding: "36px 28px 0" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
            <div>
              <p style={{ color: "#E8C547", fontSize: 9, letterSpacing: 5, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 10 }}>The Exit Plan</p>
              <h1 style={{ fontSize: "clamp(26px, 5vw, 42px)", fontWeight: 400, letterSpacing: "-0.5px", lineHeight: 1.1 }}>
                Financial Independence<br /><span style={{ color: "#E8C547" }}>on your terms.</span>
              </h1>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 11, color: "#333", fontFamily: "monospace", marginBottom: 4 }}>Exit Fund</p>
              <p style={{ fontSize: 24, color: balance >= SAVING_TARGET ? "#7ED8A4" : "#E8E4DC", fontWeight: 400 }}>
                ${Math.max(balance, 0).toLocaleString()} <span style={{ fontSize: 13, color: "#333" }}>/ $10,000</span>
              </p>
              <div style={{ width: 160, height: 3, background: "#1A1A1A", borderRadius: 2, marginTop: 6, marginLeft: "auto" }}>
                <div style={{ height: "100%", width: `${savingsPct}%`, background: "linear-gradient(90deg,#E8C547,#7ED8A4)", borderRadius: 2, transition: "width 0.5s" }} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
            {[["jobs","💼 Jobs"],["goals","🎯 Goals"],["savings","💰 Savings"],["roadmap","🗓 Roadmap"]].map(([t, l]) => (
              <NavBtn key={t} active={tab === t} onClick={() => setTab(t)}>{l}</NavBtn>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 28px 80px" }}>

        {/* ══ JOBS ══ */}
        {tab === "jobs" && (
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
              {[["Total", stats.total, "#555"],["Applied", stats.applied, "#5B8FFF"],["Interviews", stats.interviewing, "#E8C547"],["Offers", stats.offers, "#7ED8A4"]].map(([l, v, c]) => (
                <div key={l} style={{ background: "#0F0F0F", border: "1px solid #1A1A1A", borderRadius: 3, padding: "12px 20px", minWidth: 80 }}>
                  <div style={{ fontSize: 22, color: c, lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 9, color: "#333", fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>{l}</div>
                </div>
              ))}
              <div style={{ flex: 1 }} />
              <button onClick={() => { setEditJob(null); setShowForm(s => !s); }}
                style={{ background: "#E8C547", border: "none", borderRadius: 2, padding: "10px 18px", color: "#080808", fontSize: 11, fontFamily: "monospace", cursor: "pointer", fontWeight: 700, letterSpacing: 1 }}>
                + Add Job
              </button>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
              {["All", ...STATUSES].map(s => {
                const cfg = STATUS_CONFIG[s];
                const active = filterStatus === s;
                return (
                  <button key={s} onClick={() => setFilterStatus(s)} style={{
                    background: active ? (cfg?.bg || "#1A1A1A") : "transparent",
                    border: `1px solid ${active ? (cfg?.color || "#444") : "#1E1E1E"}`,
                    color: active ? (cfg?.color || "#E8E4DC") : "#444",
                    padding: "5px 12px", borderRadius: 2, fontSize: 10, fontFamily: "monospace", cursor: "pointer", letterSpacing: 1,
                  }}>
                    {s}{s !== "All" && <span style={{ opacity: 0.5, marginLeft: 4 }}>{jobs.filter(j => j.status === s).length}</span>}
                  </button>
                );
              })}
            </div>

            {showForm && (
              <JobForm
                initial={editJob ?? newJob()}
                onSave={addOrUpdateJob}
                onCancel={cancelForm}
              />
            )}

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#222" }}>
                <p style={{ fontSize: 36, marginBottom: 12 }}>📭</p>
                <p style={{ fontFamily: "monospace", fontSize: 13 }}>
                  {jobs.length === 0 ? "No jobs yet. Hit \"+ Add Job\" to start." : "No jobs match this filter."}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {filtered.map(job => (
                  <JobCard key={job.id} job={job} onStatusChange={updateStatus} onEdit={startEdit} onDelete={deleteJob} />
                ))}
              </div>
            )}

            {jobs.length > 0 && (
              <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[["Internal — this week","Send 2 applications. Move saved jobs to Applied."],["External — this week","DM 1 person. Go to 1 event. Ask for 1 intro."]].map(([t, d]) => (
                  <div key={t} style={{ background: "#0C0C0C", border: "1px solid #161616", borderRadius: 3, padding: "16px 18px" }}>
                    <p style={{ color: "#333", fontSize: 9, fontFamily: "monospace", letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>{t}</p>
                    <p style={{ fontSize: 13, color: "#666" }}>{d}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ GOALS ══ */}
        {tab === "goals" && (
          <div>
            <p style={{ color: "#333", fontSize: 11, fontFamily: "monospace", marginBottom: 28 }}>Sequenced for completion. Finish one before starting the next.</p>
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

        {/* ══ SAVINGS ══ */}
        {tab === "savings" && (
          <SavingsTab
            transactions={transactions}
            onAdd={addTransaction}
            onDelete={deleteTransaction}
            goal={SAVING_TARGET}
          />
        )}

        {/* ══ ROADMAP ══ */}
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
                {[["Internal","Applications, notary study, LLC research — solo work that moves the plan."],["External","Reach out to 1 person, attend 1 event, ask for 1 intro — every week."]].map(([t, d]) => (
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
