import { useState, useEffect, useMemo } from "react";
import {
  CARDS, CARD_BY_ID, PERKS, SETUP_TASKS, SPEND_THRESHOLDS,
  EARN_ONLY, ALWAYS_ON, CADENCE_META, VERIFIED_ON, OWNER,
} from "./data/perks";
import {
  periodFor, daysLeft, valueIn, closedPeriodsInYear,
  urgencyRank, urgencyTone, ymd, parseYmd, fmtDate,
} from "./lib/periods";

// ─── Design tokens ───────────────────────────────────────────────────────────
// Blue carries structure and anything affirmative. Yellow is a FILL colour only —
// bars, buttons, highlights — because #FFC400 text on white is unreadable. Any
// yellow-family text uses `gold`, a deep amber that clears contrast on white.
const T = {
  bg: "#F4F7FC", surface: "#FFFFFF", raised: "#FAFCFF",
  line: "#E3E9F3", lineSoft: "#EFF3F9", track: "#E6ECF6",
  ink: "#0F1E38", body: "#33415C", muted: "#64748B", faint: "#94A3B8",
  blue: "#1B5CF3", blueDeep: "#0B3FBF", blueSoft: "#EAF1FE", blueLine: "#C7D9FD",
  yellow: "#FFC400", gold: "#8A6A00", yellowSoft: "#FFF8DC", yellowLine: "#F5DC8A",
  amber: "#C2410C", amberFill: "#EA7317", amberSoft: "#FFF3E8",
  red: "#B42318", redFill: "#D92D20", redSoft: "#FEECEA",
  slate: "#52627A", slateSoft: "#F1F4F9",
};
const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif';
const SERIF = 'Georgia, "Iowan Old Style", "Times New Roman", serif';
const MONO = { fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace', letterSpacing: 0.2 };
const SHADOW = "0 1px 2px rgba(15,30,56,0.04), 0 1px 3px rgba(15,30,56,0.05)";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const money = (n) => `$${Math.round(n).toLocaleString()}`;
const rkey = (perkId, periodKey) => `${perkId}::${periodKey}`;
const TOTAL_FEES = CARDS.reduce((a, c) => a + c.fee, 0);

/** Recurring dollar value a perk delivers across one full calendar year. */
function annualValueOf(perk) {
  if (perk.nonCash) return 0;
  switch (perk.cadence) {
    case "monthly": {
      let sum = 0;
      for (let m = 1; m <= 12; m++) sum += perk.valueByMonth?.[m] ?? perk.value ?? 0;
      return sum;
    }
    case "quarterly":  return (perk.value ?? 0) * 4;
    case "semiannual": return (perk.value ?? 0) * 2;
    case "annual":     return perk.value ?? 0;
    default:           return 0; // one-time and 4-year credits aren't recurring income
  }
}
const TOTAL_ANNUAL_VALUE = PERKS.reduce((a, p) => a + annualValueOf(p), 0);

// Any card carrying a credit that resets on the account anniversary needs a date
// from the user before its clock can run at all.
const ANNIVERSARY_CARDS = [...new Set(PERKS.filter((p) => p.reset === "account_anniversary").map((p) => p.card))];

// ─── Primitives ──────────────────────────────────────────────────────────────

function Micro({ children, color = T.faint, style = {} }) {
  return <p style={{ ...MONO, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", color, fontWeight: 600, ...style }}>{children}</p>;
}

function Tag({ c, bg, children, title, border }) {
  return (
    <span title={title} style={{
      ...MONO, fontSize: 10, fontWeight: 600, color: c, background: bg,
      border: `1px solid ${border ?? "transparent"}`, padding: "2px 7px",
      borderRadius: 999, whiteSpace: "nowrap", letterSpacing: 0.3,
    }}>{children}</span>
  );
}

function NavBtn({ active, onClick, children, badge }) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: "none",
      borderBottom: `3px solid ${active ? T.blue : "transparent"}`,
      color: active ? T.blue : T.muted, padding: "14px 16px", fontSize: 13,
      fontWeight: active ? 700 : 500, fontFamily: SANS, cursor: "pointer",
      whiteSpace: "nowrap", transition: "color 0.15s", marginBottom: -1,
    }}>
      {children}
      {badge > 0 && (
        <span style={{
          ...MONO, marginLeft: 7, fontSize: 10, fontWeight: 700, color: T.ink,
          background: T.yellow, borderRadius: 999, padding: "1px 6px",
        }}>{badge}</span>
      )}
    </button>
  );
}

function Btn({ onClick, children, tone = "ghost", disabled, style = {} }) {
  const tones = {
    blue:   { background: T.blue, border: `1px solid ${T.blue}`, color: "#FFF", fontWeight: 600 },
    yellow: { background: T.yellow, border: `1px solid ${T.yellow}`, color: T.ink, fontWeight: 700 },
    ghost:  { background: T.surface, border: `1px solid ${T.line}`, color: T.muted, fontWeight: 500 },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...tones[tone], fontFamily: SANS, borderRadius: 7, padding: "7px 13px", fontSize: 12.5,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1,
      transition: "opacity 0.15s", ...style,
    }}>{children}</button>
  );
}

function Input({ value, onChange, placeholder, type = "text", style = {} }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{
      background: T.surface, border: `1px solid ${T.line}`, borderRadius: 7, padding: "8px 11px",
      color: T.ink, fontSize: 13.5, fontFamily: SANS, outline: "none", width: "100%",
      boxSizing: "border-box", ...style,
    }} />
  );
}

function Bar({ pct, color, height = 6, track = T.track }) {
  return (
    <div style={{ width: "100%", height, background: track, borderRadius: 999, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`, background: color, borderRadius: 999, transition: "width 0.35s ease" }} />
    </div>
  );
}

function Stat({ label, value, color = T.ink, sub, accent }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12,
      padding: "15px 18px", minWidth: 130, flex: "1 1 130px", boxShadow: SHADOW,
      borderTop: accent ? `3px solid ${accent}` : `1px solid ${T.line}`,
    }}>
      <div className="tnum" style={{ fontSize: 25, color, lineHeight: 1.1, fontFamily: SANS, fontWeight: 600, letterSpacing: -0.5 }}>{value}</div>
      <Micro style={{ marginTop: 7 }}>{label}</Micro>
      {sub && <p style={{ ...MONO, fontSize: 11, color: T.faint, marginTop: 5 }}>{sub}</p>}
    </div>
  );
}

function Panel({ children, accent, style = {} }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.line}`,
      borderTop: accent ? `3px solid ${accent}` : `1px solid ${T.line}`,
      borderRadius: 12, padding: "22px 24px", boxShadow: SHADOW, ...style,
    }}>{children}</div>
  );
}

// ─── Perk row ────────────────────────────────────────────────────────────────

function PerkRow({ live, draft, setDraft, onLog, onFull, onClear, showCard = true }) {
  const { perk, period, days, value, used, remaining, tone, cad, locked, lockNote } = live;
  const card = CARD_BY_ID[perk.card];
  const done = !locked && remaining <= 0;
  const pct = value > 0 ? (used / value) * 100 : (used > 0 ? 100 : 0);
  const target = perk.quantity ?? 1;
  const edge = done ? T.blue : locked ? T.faint : tone.fill;

  return (
    <div style={{
      background: done ? T.blueSoft : T.surface,
      border: `1px solid ${done ? T.blueLine : T.line}`,
      borderLeft: `4px solid ${edge}`, borderRadius: 12, padding: "16px 20px",
      boxShadow: done ? "none" : SHADOW, fontFamily: SANS,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "baseline" }}>
        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
          <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap", marginBottom: 7 }}>
            <Tag c={cad.color} bg={cad.bg}>{cad.label}</Tag>
            {showCard && <span style={{ fontSize: 12, color: T.muted, fontWeight: 500 }}>{card ? card.name : "3 cards"}</span>}
            {card?.tier === "business" && <Tag c={T.slate} bg={T.slateSoft}>business</Tag>}
            {perk.enrollment && <Tag c="#4F46E5" bg="#EEF0FE" title="Requires a one-time enrollment before it pays out">enroll</Tag>}
            {perk.needsVerification && <Tag c={T.blue} bg={T.blueSoft} border={T.blueLine} title="Added from published card terms, not your original list. Confirm against your own account.">unconfirmed</Tag>}
            {perk.disputed && <Tag c={T.amber} bg={T.amberSoft} title="Your figure disagrees with the issuer's published terms.">check amount</Tag>}
          </div>
          <p style={{ fontSize: 16, color: T.ink, lineHeight: 1.35, fontWeight: 600 }}>
            {done && <span style={{ color: T.blue, marginRight: 6 }}>✓</span>}{perk.name}
          </p>
          <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginTop: 6 }}>{perk.note}</p>
          {perk.verifyNote && <p style={{ fontSize: 13, color: T.amber, lineHeight: 1.6, marginTop: 8 }}>{perk.verifyNote}</p>}
          {lockNote && <p style={{ ...MONO, fontSize: 12, color: T.slate, marginTop: 9 }}>{lockNote}</p>}
        </div>

        <div style={{ textAlign: "right", flex: "0 0 auto" }}>
          {perk.nonCash ? (
            <div className="tnum" style={{ fontSize: 20, fontWeight: 600, color: done ? T.blue : T.ink }}>
              {used}<span style={{ color: T.faint }}>/{target}</span>
            </div>
          ) : (
            <div className="tnum" style={{ fontSize: 22, fontWeight: 600, color: done ? T.blue : tone.color, letterSpacing: -0.5 }}>
              {money(remaining)}
              {used > 0 && <span style={{ fontSize: 12, color: T.faint, fontWeight: 500 }}> left of {money(value)}</span>}
            </div>
          )}
          {days != null
            ? <p style={{ ...MONO, fontSize: 11, color: done ? T.blue : tone.color, marginTop: 5, fontWeight: 600 }}>
                {days === 0 ? "resets today" : `${days}d left`} · {period?.label}
              </p>
            : <p style={{ ...MONO, fontSize: 11, color: T.faint, marginTop: 5 }}>{period?.label}</p>}
        </div>
      </div>

      <div style={{ marginTop: 13 }}>
        <Bar pct={perk.nonCash ? (used / target) * 100 : pct} color={done ? T.blue : tone.fill} track={done ? T.blueLine : T.track} />
      </div>

      {!locked && (
        <div style={{ display: "flex", gap: 8, marginTop: 13, flexWrap: "wrap", alignItems: "center" }}>
          {perk.nonCash ? (
            <>
              <Btn tone="blue" onClick={() => onLog(1)} disabled={used >= target}>
                ✓ {perk.actionLabel ?? "Done"}{target > 1 ? " (+1)" : ""}
              </Btn>
              {used > 0 && <Btn onClick={onClear}>Undo</Btn>}
            </>
          ) : (
            <>
              <div style={{ position: "relative", width: 104 }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.faint, fontSize: 13 }}>$</span>
                <Input value={draft} onChange={(e) => setDraft(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0" style={{ padding: "7px 9px 7px 21px", fontSize: 13 }} />
              </div>
              <Btn tone="ghost" onClick={() => onLog(parseFloat(draft))} disabled={!draft || isNaN(parseFloat(draft))}>Log spend</Btn>
              {remaining > 0 && <Btn tone="blue" onClick={onFull}>✓ Used it all</Btn>}
              {used > 0 && <Btn onClick={onClear}>Reset</Btn>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  anniversaries: {},                       // { cardId: "YYYY-MM-DD" }
  globalEntry: { usedOn: "", card: "" },
  spend: {},                               // { cardId: { "2026": 0 } }
  setupDone: {},                           // { taskId: true }
  trackingStart: "",                       // set on first run; leakage is only counted from here
  lastVerified: VERIFIED_ON,
};

export default function PerkTracker() {
  const [tab, setTab] = useState("now");
  const [drafts, setDrafts] = useState({});
  const [cardFilter, setCardFilter] = useState("All");
  const [showDone, setShowDone] = useState(false);

  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();

  // Read straight out of localStorage on first render. Private browsing and
  // blocked site data throw here, so every access is guarded and falls back to
  // an in-memory session rather than a blank screen.
  const [redemptions, setRedemptions] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ccp_redemptions")) ?? {}; } catch { return {}; }
  });
  const [settings, setSettings] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem("ccp_settings"));
      if (s) return { ...DEFAULT_SETTINGS, ...s };
    } catch { /* fall through to a fresh start */ }
    return { ...DEFAULT_SETTINGS, trackingStart: ymd(new Date()) };
  });

  useEffect(() => { try { localStorage.setItem("ccp_redemptions", JSON.stringify(redemptions)); } catch { /* ignore */ } }, [redemptions]);
  useEffect(() => { try { localStorage.setItem("ccp_settings", JSON.stringify(settings)); } catch { /* ignore */ } }, [settings]);

  const setSetting = (patch) => setSettings((p) => ({ ...p, ...patch }));
  const spendFor = (cardId) => settings.spend?.[cardId]?.[year] ?? 0;

  // ── Derive the live state of every perk ──
  const lives = useMemo(() => PERKS.map((perk) => {
    const period = periodFor(perk, now, settings);
    const cad = CADENCE_META[perk.cadence];
    if (!period) {
      return { perk, period: null, days: null, value: perk.value ?? 0, used: 0,
        remaining: perk.value ?? 0, tone: urgencyTone(null), cad, locked: true,
        lockNote: "Reset date unknown — add your card anniversary in Setup to start the clock.", needsSetup: true };
    }
    const value = valueIn(perk, period);
    const used = redemptions[rkey(perk.id, period.key)] ?? 0;
    const target = perk.quantity ?? 1;
    const remaining = perk.nonCash ? Math.max(0, target - used) : Math.max(0, value - used);
    const days = daysLeft(period, now);

    let locked = false, lockNote = "";
    if (perk.requiresSpend) {
      const spent = spendFor(perk.card);
      if (spent < perk.requiresSpend) {
        locked = true;
        lockNote = `Locked — ${money(spent)} of ${money(perk.requiresSpend)} calendar-year spend. ${money(perk.requiresSpend - spent)} to go.`;
      }
    }
    if (perk.cadence === "every_4_years" && settings.globalEntry?.usedOn) {
      locked = true;
      const used4 = CARD_BY_ID[settings.globalEntry.card]?.name ?? "a card";
      lockNote = `Redeemed on ${used4}, ${fmtDate(parseYmd(settings.globalEntry.usedOn))}. Next eligible ${period.end ? fmtDate(period.end) : "in 4 years"}.`;
    }
    return { perk, period, days, value, used, remaining, tone: urgencyTone(days), cad, locked, lockNote };
  }), [now, settings, redemptions]); // eslint-disable-line react-hooks/exhaustive-deps

  const openLives = lives.filter((l) => l.remaining > 0 && !l.locked);
  const doneLives = lives.filter((l) => l.remaining <= 0 && !l.locked);
  const lockedLives = lives.filter((l) => l.locked);

  const filtered = (list) => cardFilter === "All" ? list
    : list.filter((l) => l.perk.card === cardFilter || l.perk.eligibleCards?.includes(cardFilter));

  const queue = [...filtered(openLives)].sort((a, b) => urgencyRank(a.days, a.remaining) - urgencyRank(b.days, b.remaining));
  const openValue = openLives.reduce((a, l) => a + (l.perk.nonCash ? 0 : l.remaining), 0);
  const closingSoon = openLives.filter((l) => l.days != null && l.days <= 10 && !l.perk.nonCash);
  const closingValue = closingSoon.reduce((a, l) => a + l.remaining, 0);

  // ── Money that actually walked out the door, counted only since tracking began ──
  const leak = useMemo(() => {
    const since = settings.trackingStart ? parseYmd(settings.trackingStart) : now;
    let lost = 0, captured = 0;
    const items = [];
    for (const perk of PERKS) {
      if (perk.nonCash) continue;
      for (const p of closedPeriodsInYear(perk, year, now, settings)) {
        const used = redemptions[rkey(perk.id, p.key)] ?? 0;
        if (p.start < since) { captured += used; continue; } // pre-tracking: credit use, never blame
        const v = valueIn(perk, p);
        captured += Math.min(used, v);
        if (used < v) { lost += v - used; items.push({ perk, period: p, missed: v - used }); }
      }
    }
    // Add redemptions logged inside periods that are still open.
    for (const l of lives) if (!l.perk.nonCash && l.period) captured += Math.min(l.used, l.value);
    items.sort((a, b) => b.missed - a.missed);
    return { lost, captured, items };
  }, [redemptions, settings, lives, year, now]);

  const netPosition = leak.captured - TOTAL_FEES;
  const setupOpen = SETUP_TASKS.filter((t) => !settings.setupDone?.[t.id]).length;
  const verifiedAge = Math.floor((now - parseYmd(settings.lastVerified || VERIFIED_ON)) / 86400000);
  const unconfirmed = PERKS.filter((p) => p.needsVerification);
  const enrollmentGated = PERKS.filter((p) => p.enrollment).length;
  const monthlyPerks = PERKS.filter((p) => p.cadence === "monthly" && !p.nonCash);
  const monthlyPerMonth = monthlyPerks.reduce((a, p) => a + p.value, 0);
  const monthlyAnnual = monthlyPerks.reduce((a, p) => a + annualValueOf(p), 0);

  // ── Mutators ──
  const logAmount = (live, amount) => {
    if (!live.period || isNaN(amount)) return;
    const k = rkey(live.perk.id, live.period.key);
    const cap = live.perk.nonCash ? (live.perk.quantity ?? 1) : live.value;
    setRedemptions((p) => ({ ...p, [k]: Math.min(cap, (p[k] ?? 0) + amount) }));
    setDrafts((d) => ({ ...d, [k]: "" }));
  };
  const markFull = (live) => {
    if (!live.period) return;
    setRedemptions((p) => ({ ...p, [rkey(live.perk.id, live.period.key)]: live.perk.nonCash ? (live.perk.quantity ?? 1) : live.value }));
  };
  const clearPerk = (live) => {
    if (!live.period) return;
    setRedemptions((p) => { const n = { ...p }; delete n[rkey(live.perk.id, live.period.key)]; return n; });
  };

  const rowProps = (live) => {
    const k = live.period ? rkey(live.perk.id, live.period.key) : live.perk.id;
    return {
      live,
      draft: drafts[k] ?? "",
      setDraft: (v) => setDrafts((d) => ({ ...d, [k]: v })),
      onLog: (amt) => logAmount(live, amt),
      onFull: () => markFull(live),
      onClear: () => clearPerk(live),
    };
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: SANS, color: T.body }}>

      {/* ── Header ── */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.line}`, padding: "30px 24px 0" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 22, marginBottom: 22 }}>
            <div>
              <Micro color={T.blue} style={{ marginBottom: 11 }}>Perks Tracker · {OWNER}</Micro>
              <h1 style={{ fontFamily: SERIF, fontSize: "clamp(27px, 5vw, 42px)", fontWeight: 400, letterSpacing: "-0.8px", lineHeight: 1.12, color: T.ink }}>
                Nothing expires<br />
                <span style={{ color: T.blue, background: `linear-gradient(transparent 74%, ${T.yellow} 74%, ${T.yellow} 96%, transparent 96%)`, paddingRight: 2 }}>unused.</span>
              </h1>
            </div>
            <div className="hero-metric">
              <Micro style={{ marginBottom: 6 }}>Open right now</Micro>
              <p className="tnum" style={{ fontSize: 32, fontWeight: 600, color: closingValue > 0 ? T.amber : T.ink, lineHeight: 1, letterSpacing: -1 }}>{money(openValue)}</p>
              <p style={{ ...MONO, fontSize: 11.5, color: T.muted, marginTop: 8 }}>
                {closingSoon.length > 0
                  ? <span style={{ color: T.amber, fontWeight: 600 }}>{money(closingValue)} closes within 10 days</span>
                  : `${money(TOTAL_ANNUAL_VALUE)} recurring value · ${money(TOTAL_FEES)} in fees`}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", overflowX: "auto" }}>
            <NavBtn active={tab === "now"} onClick={() => setTab("now")} badge={closingSoon.length}>Now</NavBtn>
            <NavBtn active={tab === "cards"} onClick={() => setTab("cards")}>Cards</NavBtn>
            <NavBtn active={tab === "value"} onClick={() => setTab("value")}>Value</NavBtn>
            <NavBtn active={tab === "setup"} onClick={() => setTab("setup")} badge={setupOpen}>Setup</NavBtn>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "26px 24px 90px" }}>

        {/* ══════════════ NOW ══════════════ */}
        {tab === "now" && (
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
              <Stat label="Closing ≤10 days" value={money(closingValue)} color={closingValue > 0 ? T.red : T.faint} accent={closingValue > 0 ? T.redFill : T.line} sub={`${closingSoon.length} credits`} />
              <Stat label="Open total" value={money(openValue)} color={T.ink} accent={T.yellow} sub={`${openLives.length} credits`} />
              <Stat label="Captured" value={money(leak.captured)} color={T.blue} accent={T.blue} sub={`${year} to date`} />
              <Stat label="Leaked" value={money(leak.lost)} color={leak.lost > 0 ? T.amber : T.faint} accent={leak.lost > 0 ? T.amberFill : T.line} sub="since tracking began" />
            </div>

            {settings.trackingStart === ymd(now) && (
              <Panel accent={T.blue} style={{ marginBottom: 20 }}>
                <Micro color={T.blue} style={{ marginBottom: 9 }}>First run</Micro>
                <p style={{ fontSize: 14, color: T.body, lineHeight: 1.7 }}>
                  Tracking starts today, so nothing before {fmtDate(now)} counts against you — the Leaked figure only
                  measures periods that close from here on. Start in <strong style={{ color: T.ink }}>Setup</strong>:
                  {" "}{setupOpen} enrollment {setupOpen === 1 ? "step is" : "steps are"} still open, and an unenrolled credit pays out nothing all year.
                </p>
              </Panel>
            )}

            {/* Card filter */}
            <div style={{ display: "flex", gap: 7, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
              {["All", ...CARDS.filter((c) => PERKS.some((p) => p.card === c.id || p.eligibleCards?.includes(c.id))).map((c) => c.id)].map((id) => {
                const label = id === "All" ? "All cards" : CARD_BY_ID[id].name;
                const active = cardFilter === id;
                return (
                  <button key={id} onClick={() => setCardFilter(id)} style={{
                    fontFamily: SANS, background: active ? T.blue : T.surface,
                    border: `1px solid ${active ? T.blue : T.line}`, color: active ? "#FFF" : T.muted,
                    padding: "6px 13px", borderRadius: 999, fontSize: 12.5,
                    fontWeight: active ? 600 : 500, cursor: "pointer", transition: "all 0.15s",
                  }}>{label}</button>
                );
              })}
            </div>

            {queue.length === 0 ? (
              <Panel accent={T.blue} style={{ textAlign: "center", padding: "48px 24px" }}>
                <p style={{ fontSize: 19, color: T.blue, marginBottom: 9, fontWeight: 600 }}>Everything open is claimed.</p>
                <p style={{ fontSize: 14, color: T.muted }}>Credits reopen on the 1st. Check back then.</p>
              </Panel>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {queue.map((l) => <PerkRow key={l.perk.id} {...rowProps(l)} />)}
              </div>
            )}

            {filtered(lockedLives).length > 0 && (
              <div style={{ marginTop: 30 }}>
                <Micro style={{ marginBottom: 12 }}>Locked or waiting</Micro>
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  {filtered(lockedLives).map((l) => <PerkRow key={l.perk.id} {...rowProps(l)} />)}
                </div>
              </div>
            )}

            {filtered(doneLives).length > 0 && (
              <div style={{ marginTop: 30 }}>
                <button onClick={() => setShowDone((s) => !s)} style={{
                  ...MONO, background: "none", border: "none", color: T.muted, fontSize: 11,
                  letterSpacing: 1.6, textTransform: "uppercase", fontWeight: 600,
                  cursor: "pointer", padding: 0, marginBottom: 12,
                }}>
                  {showDone ? "▾" : "▸"} Claimed this period ({filtered(doneLives).length})
                </button>
                {showDone && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                    {filtered(doneLives).map((l) => <PerkRow key={l.perk.id} {...rowProps(l)} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ CARDS ══════════════ */}
        {tab === "cards" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <p style={{ fontSize: 13.5, color: T.muted, marginBottom: 2 }}>
              {CARDS.length} cards · <strong style={{ color: T.ink }}>{money(TOTAL_FEES)}</strong> in annual fees ·{" "}
              <strong style={{ color: T.ink }}>{money(TOTAL_ANNUAL_VALUE)}</strong> of recurring credits against them.
            </p>
            {[...CARDS].sort((a, b) => b.fee - a.fee).map((card) => {
              const cardLives = lives.filter((l) => l.perk.card === card.id);
              const annual = PERKS.filter((p) => p.card === card.id).reduce((a, p) => a + annualValueOf(p), 0);
              const captured = Object.entries(redemptions).reduce((a, [k, v]) => {
                const [pid, periodKey = ""] = k.split("::");
                if (PERKS.find((p) => p.id === pid)?.card !== card.id) return a;
                const yr = periodKey.match(/^(?:AY)?(\d{4})/);      // "2026-09", "2026-Q3", "AY2026"
                if (yr && Number(yr[1]) !== year) return a;          // keys without a year are one-time
                return a + v;
              }, 0);
              const cardOpen = cardLives.reduce((a, l) => a + (l.perk.nonCash || l.locked ? 0 : l.remaining), 0);
              const net = captured - card.fee;
              const covers = card.fee > 0 ? (annual / card.fee) : null;

              return (
                <Panel key={card.id} accent={card.fee >= 150 ? T.yellow : T.line}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "baseline" }}>
                    <div>
                      <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
                        <p style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>{card.name}</p>
                        {card.tier === "business" && <Tag c={T.slate} bg={T.slateSoft}>business</Tag>}
                      </div>
                      <p style={{ fontSize: 12.5, color: T.faint, marginTop: 5 }}>
                        {card.issuer}{card.note ? ` · ${card.note}` : ""}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p className="tnum" style={{ fontSize: 21, fontWeight: 600, color: card.fee > 0 ? T.ink : T.blue }}>
                        {card.fee > 0 ? `${money(card.fee)}/yr` : "No fee"}
                      </p>
                      {covers && <p style={{ ...MONO, fontSize: 11.5, color: covers >= 1 ? T.blue : T.amber, marginTop: 5, fontWeight: 600 }}>
                        {money(annual)} in credits · {covers.toFixed(1)}× the fee
                      </p>}
                    </div>
                  </div>

                  {card.fee > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                        <span style={{ ...MONO, fontSize: 11.5, color: T.muted }}>Captured {year}: {money(captured)}</span>
                        <span style={{ ...MONO, fontSize: 11.5, color: net >= 0 ? T.blue : T.amber, fontWeight: 600 }}>
                          {net >= 0 ? `+${money(net)} ahead` : `${money(-net)} to break even`}
                        </span>
                      </div>
                      <Bar pct={(captured / card.fee) * 100} color={net >= 0 ? T.blue : T.yellow} />
                    </div>
                  )}

                  {cardLives.length > 0 ? (
                    <div style={{ marginTop: 18 }}>
                      {cardLives.sort((a, b) => a.cad.order - b.cad.order).map((l) => (
                        <div key={l.perk.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "9px 0", borderTop: `1px solid ${T.lineSoft}` }}>
                          <div style={{ display: "flex", gap: 9, alignItems: "center", minWidth: 0 }}>
                            <Tag c={l.cad.color} bg={l.cad.bg}>{l.cad.label}</Tag>
                            <span style={{ fontSize: 14, color: l.remaining <= 0 && !l.locked ? T.faint : T.body }}>{l.perk.name}</span>
                          </div>
                          <span className="tnum" style={{ ...MONO, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", color: l.locked ? T.faint : l.remaining <= 0 ? T.blue : l.tone.color }}>
                            {l.locked ? "locked" : l.perk.nonCash ? `${l.used}/${l.perk.quantity ?? 1}` : l.remaining <= 0 ? "claimed ✓" : `${money(l.remaining)} open`}
                          </span>
                        </div>
                      ))}
                      {cardOpen > 0 && (
                        <p style={{ ...MONO, fontSize: 11.5, color: T.gold, marginTop: 10, fontWeight: 600, background: T.yellowSoft, display: "inline-block", padding: "4px 10px", borderRadius: 999 }}>
                          {money(cardOpen)} available right now
                        </p>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.7, marginTop: 16, borderTop: `1px solid ${T.lineSoft}`, paddingTop: 13 }}>
                      <span style={{ ...MONO, fontSize: 10.5, color: T.faint, fontWeight: 600 }}>EARN-ONLY · </span>{EARN_ONLY[card.id]}
                    </p>
                  )}

                  {ALWAYS_ON[card.id] && (
                    <div style={{ marginTop: 16, borderTop: `1px solid ${T.lineSoft}`, paddingTop: 14 }}>
                      <Micro style={{ marginBottom: 10 }}>Always on · nothing to track</Micro>
                      {ALWAYS_ON[card.id].map((b, i) => (
                        <p key={i} style={{ fontSize: 13, color: T.muted, lineHeight: 1.7, marginBottom: 6 }}>· {b}</p>
                      ))}
                    </div>
                  )}
                </Panel>
              );
            })}
          </div>
        )}

        {/* ══════════════ VALUE ══════════════ */}
        {tab === "value" && (
          <div>
            <Panel accent={netPosition >= 0 ? T.blue : T.yellow} style={{ marginBottom: 18 }}>
              <Micro style={{ marginBottom: 14 }}>The honest scoreboard · {year}</Micro>
              <div style={{ display: "flex", gap: 30, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div>
                  <p className="tnum" style={{ fontSize: 40, fontWeight: 600, color: netPosition >= 0 ? T.blue : T.amber, lineHeight: 1, letterSpacing: -1.5 }}>
                    {netPosition >= 0 ? "+" : "−"}{money(Math.abs(netPosition))}
                  </p>
                  <Micro style={{ marginTop: 9 }}>{netPosition >= 0 ? "Ahead of your fees" : "Still behind your fees"}</Micro>
                </div>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                    <span style={{ ...MONO, fontSize: 11.5, color: T.blue, fontWeight: 600 }}>{money(leak.captured)} captured</span>
                    <span style={{ ...MONO, fontSize: 11.5, color: T.muted }}>{money(TOTAL_FEES)} in fees</span>
                  </div>
                  <Bar pct={(leak.captured / TOTAL_FEES) * 100} color={T.blue} height={9} />
                  <p style={{ fontSize: 13.5, color: T.body, lineHeight: 1.7, marginTop: 13 }}>
                    Use every recurring credit and these cards return <strong style={{ color: T.ink }}>{money(TOTAL_ANNUAL_VALUE)}</strong> against{" "}
                    {money(TOTAL_FEES)} in fees — {(TOTAL_ANNUAL_VALUE / TOTAL_FEES).toFixed(1)}× coverage. The gap between that
                    and the number on the left is entirely down to whether the calendar gets watched.
                  </p>
                </div>
              </div>
            </Panel>

            <Micro style={{ marginBottom: 12 }}>Where the value sits</Micro>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 13, marginBottom: 28 }}>
              {Object.entries(CADENCE_META).sort((a, b) => a[1].order - b[1].order).map(([cad, meta]) => {
                const ps = PERKS.filter((p) => p.cadence === cad);
                if (!ps.length) return null;
                const annual = ps.reduce((a, p) => a + annualValueOf(p), 0);
                const perPeriod = ps.reduce((a, p) => a + (p.nonCash ? 0 : p.value ?? 0), 0);
                return (
                  <Panel key={cad} accent={meta.fill} style={{ padding: "18px 20px" }}>
                    <Micro color={meta.color} style={{ marginBottom: 10 }}>{meta.label}</Micro>
                    <p className="tnum" style={{ fontSize: 25, fontWeight: 600, color: T.ink, lineHeight: 1, letterSpacing: -0.5 }}>
                      {money(perPeriod)}<span style={{ fontSize: 12.5, color: T.faint, fontWeight: 500 }}>/{meta.per}</span>
                    </p>
                    <p style={{ ...MONO, fontSize: 11.5, color: T.muted, marginTop: 9 }}>
                      {annual > 0 ? `${money(annual)} a year · ` : ""}{ps.length} credit{ps.length > 1 ? "s" : ""}
                    </p>
                  </Panel>
                );
              })}
            </div>

            <Panel accent={T.amberFill} style={{ marginBottom: 18 }}>
              <Micro color={T.amber} style={{ marginBottom: 11 }}>Leak report</Micro>
              {leak.items.length === 0 ? (
                <p style={{ fontSize: 13.5, color: T.body, lineHeight: 1.7 }}>
                  Nothing has expired unused since tracking began on {settings.trackingStart ? fmtDate(parseYmd(settings.trackingStart)) : "today"}.
                  Periods that closed before that date are left out on purpose — this measures what happens from here, not what
                  you can no longer change.
                </p>
              ) : (
                <>
                  <p style={{ fontSize: 13.5, color: T.body, lineHeight: 1.7, marginBottom: 15 }}>
                    <strong style={{ color: T.amber }}>{money(leak.lost)}</strong> expired unclaimed since {fmtDate(parseYmd(settings.trackingStart))}.
                    Monthly credits are almost always the culprit — they are the smallest individually and the only ones that reset twelve times a year.
                  </p>
                  {leak.items.slice(0, 10).map((it, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: `1px solid ${T.lineSoft}`, gap: 12 }}>
                      <span style={{ fontSize: 13.5, color: T.body }}>
                        {it.perk.name} <span style={{ ...MONO, fontSize: 11, color: T.faint }}>· {it.period.label}</span>
                      </span>
                      <span className="tnum" style={{ ...MONO, fontSize: 12.5, color: T.amber, fontWeight: 600 }}>−{money(it.missed)}</span>
                    </div>
                  ))}
                </>
              )}
            </Panel>

            <Panel accent={T.blue}>
              <Micro color={T.blue} style={{ marginBottom: 16 }}>What the totals hide</Micro>
              {[
                ["Your monthly figure was low by $500 a year.",
                 `The source sheet counted $70 a month. With the Equinox, Instacart and United rideshare credits added it is ${money(monthlyPerMonth)} a month — ${money(monthlyAnnual)} a year once December's larger Uber Cash is counted. Monthly credits are now the single biggest block of value you own, and the easiest to lose.`],
                ["You are carrying three separate rideshare credits.",
                 "Platinum Uber Cash, the Delta rideshare credit and the United rideshare credit all pay out on rides — but one ride only feeds the card you paid with. Getting all three needs three different cards in rotation, not one good month of Ubers."],
                ["Delta's $200 is a rebate, not a credit.",
                 `It only exists past $10,000 of business spend, and you are at ${money(spendFor("delta_gold_biz"))}. United's $100 TravelBank credit works the same way. Neither belongs in your fee math until the spend is real.`],
                ["One number on this page disagrees with the issuer.",
                 "Your sheet has the Walmart+ credit at $20 a month. Amex publishes it as $155 a year, roughly $12.95 a month. Your figure is kept until you check a statement — but if the published number is right, this page is overstating you by about $85 a year."],
              ].map(([t, d]) => (
                <div key={t} style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 14.5, color: T.ink, marginBottom: 5, fontWeight: 600 }}>{t}</p>
                  <p style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.75 }}>{d}</p>
                </div>
              ))}
            </Panel>

            {unconfirmed.length > 0 && (
              <Panel accent={T.blue} style={{ marginTop: 18 }}>
                <Micro color={T.blue} style={{ marginBottom: 11 }}>Unconfirmed · {unconfirmed.length} credits</Micro>
                <p style={{ fontSize: 13.5, color: T.body, lineHeight: 1.75, marginBottom: 15 }}>
                  These were added from the issuers&apos; published terms, not from your original sheet. They are live in the tracker
                  because missing a real credit costs more than double-checking one — but confirm each against your own account,
                  then drop the <code style={{ ...MONO, fontSize: 12, color: T.blue, background: T.blueSoft, padding: "1px 5px", borderRadius: 4 }}>needsVerification</code> flag in{" "}
                  <code style={{ ...MONO, fontSize: 12, color: T.blue, background: T.blueSoft, padding: "1px 5px", borderRadius: 4 }}>src/data/perks.js</code>.
                </p>
                {unconfirmed.map((perk) => (
                  <div key={perk.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: `1px solid ${T.lineSoft}`, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13.5, color: T.body }}>
                      {perk.name} <span style={{ ...MONO, fontSize: 11, color: T.faint }}>· {CARD_BY_ID[perk.card]?.name}</span>
                    </span>
                    <span className="tnum" style={{ ...MONO, fontSize: 12.5, color: T.blue, fontWeight: 600 }}>
                      {perk.nonCash ? CADENCE_META[perk.cadence].label : `${money(perk.value)}/${CADENCE_META[perk.cadence].per}`}
                    </span>
                  </div>
                ))}
              </Panel>
            )}
          </div>
        )}

        {/* ══════════════ SETUP ══════════════ */}
        {tab === "setup" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Panel accent={setupOpen > 0 ? T.yellow : T.blue}>
              <Micro color={setupOpen > 0 ? T.gold : T.blue} style={{ marginBottom: 9 }}>
                One-time setup · {setupOpen} of {SETUP_TASKS.length} open
              </Micro>
              <p style={{ fontSize: 13.5, color: T.body, lineHeight: 1.7, marginBottom: 16 }}>
                Enrollment-gated credits do not fail loudly. They simply never pay out, and you find out a year later.
                Clear this list once and {enrollmentGated} recurring credits start working.
              </p>
              {SETUP_TASKS.map((t) => {
                const done = !!settings.setupDone?.[t.id];
                return (
                  <button key={t.id}
                    onClick={() => setSetting({ setupDone: { ...settings.setupDone, [t.id]: !done } })}
                    style={{
                      display: "flex", gap: 13, alignItems: "flex-start", background: "none", border: "none",
                      borderTop: `1px solid ${T.lineSoft}`, padding: "13px 2px", cursor: "pointer",
                      textAlign: "left", width: "100%", fontFamily: SANS,
                    }}>
                    <span style={{
                      width: 19, height: 19, borderRadius: 5, flexShrink: 0, marginTop: 1,
                      border: `1.5px solid ${done ? T.blue : T.lineSoft === T.line ? T.line : "#CBD5E1"}`,
                      background: done ? T.blue : T.surface, color: "#FFF", fontSize: 12,
                      lineHeight: "17px", textAlign: "center", fontWeight: 700,
                    }}>{done ? "✓" : ""}</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 14.5, color: done ? T.faint : T.ink, fontWeight: 600, textDecoration: done ? "line-through" : "none", display: "block" }}>{t.label}</span>
                      <span style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, display: "block", marginTop: 4 }}>{t.detail}</span>
                    </span>
                  </button>
                );
              })}
            </Panel>

            {/* Anniversary */}
            <Panel accent={T.blue}>
              <Micro color={T.blue} style={{ marginBottom: 9 }}>Card anniversaries</Micro>
              <p style={{ fontSize: 13.5, color: T.body, lineHeight: 1.7, marginBottom: 17 }}>
                Two credits reset on the account anniversary rather than January 1 — the Sapphire Preferred hotel credit and
                the United Hotels credit. Until a date is set, those credits show as locked instead of guessing a deadline at you.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {ANNIVERSARY_CARDS.map((id) => {
                  const set = !!settings.anniversaries?.[id];
                  return (
                    <div key={id} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13.5, color: set ? T.body : T.gold, fontWeight: set ? 500 : 600, minWidth: 210 }}>
                        {set ? "" : "⚠ "}{CARD_BY_ID[id].name} opened
                      </span>
                      <Input type="date" value={settings.anniversaries?.[id] ?? ""}
                        onChange={(e) => setSetting({ anniversaries: { ...settings.anniversaries, [id]: e.target.value } })}
                        style={{ width: 180 }} />
                    </div>
                  );
                })}
              </div>
            </Panel>

            {/* Global Entry */}
            <Panel accent={T.slate}>
              <Micro style={{ marginBottom: 9 }}>Global Entry · one credit, three cards</Micro>
              <p style={{ fontSize: 13.5, color: T.body, lineHeight: 1.7, marginBottom: 17 }}>
                Platinum, Sapphire Preferred and United Explorer each offer up to $120 every four years, but a single
                application can only be reimbursed once. Record which card paid so the other two are deliberately spent on a
                family member rather than quietly wasted.
              </p>
              <div style={{ display: "flex", gap: 11, flexWrap: "wrap", alignItems: "center" }}>
                <select value={settings.globalEntry?.card ?? ""}
                  onChange={(e) => setSetting({ globalEntry: { ...settings.globalEntry, card: e.target.value } })}
                  style={{ fontFamily: SANS, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 7, padding: "8px 11px", color: T.ink, fontSize: 13.5, outline: "none" }}>
                  <option value="">Not used yet</option>
                  {["amex_platinum", "csp", "united_explorer"].map((id) => <option key={id} value={id}>{CARD_BY_ID[id].name}</option>)}
                </select>
                <Input type="date" value={settings.globalEntry?.usedOn ?? ""}
                  onChange={(e) => setSetting({ globalEntry: { ...settings.globalEntry, usedOn: e.target.value } })}
                  style={{ width: 175 }} />
                {settings.globalEntry?.usedOn && <Btn onClick={() => setSetting({ globalEntry: { usedOn: "", card: "" } })}>Clear</Btn>}
              </div>
              {settings.globalEntry?.usedOn && (
                <p style={{ fontSize: 13, color: T.blue, marginTop: 13, fontWeight: 500 }}>
                  Next eligible {fmtDate(new Date(parseYmd(settings.globalEntry.usedOn).getFullYear() + 4, parseYmd(settings.globalEntry.usedOn).getMonth(), parseYmd(settings.globalEntry.usedOn).getDate()))}
                  {settings.globalEntry.card && " · the other two cards' credits are unspent until then"}
                </p>
              )}
            </Panel>

            {/* Spend thresholds */}
            <Panel accent={T.yellow}>
              <Micro color={T.gold} style={{ marginBottom: 9 }}>Spend thresholds · {year}</Micro>
              <p style={{ fontSize: 13.5, color: T.body, lineHeight: 1.7, marginBottom: 20 }}>
                These are not statement credits — they are rebates on spend you have to do anyway. Worth chasing only if you
                were already going to land near the number.
              </p>
              {[...new Set(SPEND_THRESHOLDS.map((t) => t.card))].map((cardId) => {
                const card = CARD_BY_ID[cardId];
                const spent = spendFor(cardId);
                const tiers = SPEND_THRESHOLDS.filter((t) => t.card === cardId).sort((a, b) => a.target - b.target);
                const top = tiers[tiers.length - 1].target;
                return (
                  <div key={cardId} style={{ marginBottom: 26 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 9 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{card.name}</span>
                      <span className="tnum" style={{ ...MONO, fontSize: 12, color: T.muted }}>{money(spent)} spent this year</span>
                    </div>
                    <Bar pct={(spent / top) * 100} color={spent >= top ? T.blue : T.yellow} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 11 }}>
                      {tiers.map((t) => {
                        const hit = spent >= t.target;
                        return (
                          <div key={t.target} style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, color: hit ? T.blue : T.muted, fontWeight: hit ? 600 : 500 }}>
                              {hit ? "✓" : "○"} {money(t.target)} — {t.reward}
                            </span>
                            {!hit && <span className="tnum" style={{ ...MONO, fontSize: 12, color: T.gold, fontWeight: 600 }}>{money(t.target - spent)} to go</span>}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 13, alignItems: "center", flexWrap: "wrap" }}>
                      <Input type="number" value={settings.spend?.[cardId]?.[year] ?? ""}
                        onChange={(e) => setSetting({ spend: { ...settings.spend, [cardId]: { ...settings.spend?.[cardId], [year]: parseFloat(e.target.value) || 0 } } })}
                        placeholder="Year-to-date spend" style={{ width: 190, fontSize: 13 }} />
                      <span style={{ fontSize: 12.5, color: T.faint }}>update from your statement</span>
                    </div>
                  </div>
                );
              })}
            </Panel>

            {/* Re-verify */}
            <Panel accent={verifiedAge > 365 ? T.amberFill : T.line}>
              <Micro color={verifiedAge > 365 ? T.amber : T.faint} style={{ marginBottom: 9 }}>
                Terms last verified {fmtDate(parseYmd(settings.lastVerified || VERIFIED_ON))} · {verifiedAge} days ago
              </Micro>
              <p style={{ fontSize: 13.5, color: T.body, lineHeight: 1.7, marginBottom: 16 }}>
                {verifiedAge > 365
                  ? "Over a year old. Amex refreshed Platinum in late 2025, Chase refreshed Sapphire Preferred in June 2026, Bilt relaunched in February 2026 — assume at least one number on this page is now wrong."
                  : "Card terms change constantly. Re-read each issuer's benefits page annually and update src/data/perks.js, which is the single source of truth behind every number here."}
              </p>
              <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                <Btn tone="ghost" onClick={() => setSetting({ lastVerified: ymd(now) })}>Mark verified today</Btn>
                <Btn tone="ghost" onClick={() => {
                  if (confirm("Clear every logged redemption and setting? This cannot be undone.")) {
                    setRedemptions({}); setSettings({ ...DEFAULT_SETTINGS, trackingStart: ymd(now) });
                  }
                }}>Reset all data</Btn>
              </div>
              <p style={{ fontSize: 12.5, color: T.faint, marginTop: 16, lineHeight: 1.7 }}>
                Everything is stored in this browser only. Nothing is sent anywhere — no account numbers, no card data.
              </p>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
