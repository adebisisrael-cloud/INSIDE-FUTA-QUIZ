import { useEffect, useMemo, useState } from "react";
import { supabase, type Submission } from "./supabase";
import {
  DEFAULT_CONFIG,
  DEFAULT_BANK,
  type Question,
  type QuizConfig,
} from "./quiz-data";
import {
  saveConfigCloud,
  resetConfigCloud,
  saveBankCloud,
  resetBankCloud,
} from "./cloud";

type Tab = "overview" | "leaderboard" | "candidates" | "questions" | "settings";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "fa-chart-pie" },
  { id: "leaderboard", label: "Leaderboard", icon: "fa-trophy" },
  { id: "candidates", label: "Candidates", icon: "fa-users" },
  { id: "questions", label: "Question Bank", icon: "fa-list-check" },
  { id: "settings", label: "Settings", icon: "fa-gear" },
];

export function Admin({
  config,
  bank,
  onConfigChange,
  onBankChange,
  onLogout,
}: {
  config: QuizConfig;
  bank: Question[];
  onConfigChange: (c: QuizConfig) => void;
  onBankChange: (b: Question[]) => void;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .order("points", { ascending: false });
    if (error) setErr(error.message);
    setRows(((data as Submission[]) ?? []).map((r) => ({ ...r })));
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function deleteRow(row: Submission) {
    if (row.id === undefined) return;
    if (!confirm(`Delete submission for ${row.name}?`)) return;
    const { error } = await supabase.from("submissions").delete().eq("id", row.id);
    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }
    setRows((rs) => rs.filter((r) => r.id !== row.id));
  }

  async function deleteAll() {
    if (!confirm(`Delete ALL ${rows.length} submissions? This cannot be undone.`))
      return;
    const ids = rows.map((r) => r.id).filter((x) => x !== undefined) as (number | string)[];
    if (ids.length === 0) return;
    const { error } = await supabase
      .from("submissions")
      .delete()
      .in("id", ids as (string | number)[]);
    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }
    setRows([]);
  }

  function exportCSV() {
    const header = [
      "name",
      "whatsapp",
      "school",
      "dept",
      "score",
      "points",
      "start_time",
      "finish_time",
    ];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      lines.push(
        header
          .map((h) => JSON.stringify((r as Record<string, unknown>)[h] ?? ""))
          .join(","),
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `submissions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card admin-card">
      <div className="admin-head">
        <h2>
          <i className="fa-solid fa-shield-halved"></i> MASTER CONTROL
        </h2>
        <div className="admin-head-actions">
          <button className="btn-icon" onClick={refresh} title="Refresh">
            <i className="fa-solid fa-rotate"></i>
          </button>
          <button className="btn-icon danger" onClick={onLogout} title="Logout">
            <i className="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <i className={`fa-solid ${t.icon}`}></i> {t.label}
          </button>
        ))}
      </div>

      {err && (
        <div className="error-msg" style={{ marginBottom: 15 }}>
          <i className="fa-solid fa-triangle-exclamation"></i> {err}
        </div>
      )}

      {loading && (
        <div className="loading">
          <i className="fa-solid fa-spinner fa-spin"></i> Loading…
        </div>
      )}

      {!loading && tab === "overview" && (
        <Overview rows={rows} schools={Object.keys(config.SCHOOLS)} />
      )}
      {!loading && tab === "leaderboard" && <Leaderboard rows={rows} />}
      {!loading && tab === "candidates" && (
        <Candidates
          rows={rows}
          onDelete={deleteRow}
          onDeleteAll={deleteAll}
          onExport={exportCSV}
          schools={Object.keys(config.SCHOOLS)}
        />
      )}
      {tab === "questions" && <QuestionBank bank={bank} onBankChange={onBankChange} />}
      {tab === "settings" && (
        <Settings config={config} onConfigChange={onConfigChange} />
      )}
    </div>
  );
}

/* ---------------- OVERVIEW ---------------- */
function Overview({ rows, schools }: { rows: Submission[]; schools: string[] }) {
  const total = rows.length;
  const points = rows.map((r) => r.points || 0);
  const highest = points.length ? Math.max(...points) : 0;
  const lowest = points.length ? Math.min(...points) : 0;
  const avg = points.length
    ? Math.round((points.reduce((a, b) => a + b, 0) / points.length) * 10) / 10
    : 0;
  const passRate = points.length
    ? Math.round((points.filter((p) => p >= 15).length / points.length) * 100)
    : 0;

  const bySchool = useMemo(() => {
    const map: Record<string, { count: number; sum: number }> = {};
    schools.forEach((s) => (map[s] = { count: 0, sum: 0 }));
    rows.forEach((r) => {
      if (!map[r.school]) map[r.school] = { count: 0, sum: 0 };
      map[r.school].count += 1;
      map[r.school].sum += r.points || 0;
    });
    return Object.entries(map)
      .map(([school, v]) => ({
        school,
        count: v.count,
        avg: v.count ? Math.round((v.sum / v.count) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [rows, schools]);

  const maxCount = Math.max(1, ...bySchool.map((s) => s.count));

  return (
    <div className="overview">
      <div className="stat-grid">
        <StatCard icon="fa-users" label="TOTAL CANDIDATES" value={total} color="blue" />
        <StatCard icon="fa-trophy" label="HIGHEST SCORE" value={highest} color="gold" />
        <StatCard icon="fa-chart-line" label="AVERAGE" value={avg} color="green" />
        <StatCard icon="fa-arrow-down" label="LOWEST SCORE" value={lowest} color="red" />
        <StatCard icon="fa-percent" label="PASS RATE (≥15)" value={`${passRate}%`} color="purple" />
        <StatCard icon="fa-school" label="ACTIVE SCHOOLS" value={bySchool.filter((s) => s.count > 0).length} color="teal" />
      </div>

      <h3 className="section-title">
        <i className="fa-solid fa-chart-column"></i> By School
      </h3>
      <div className="chart">
        {bySchool.map((s) => (
          <div key={s.school} className="chart-row">
            <div className="chart-label">{s.school}</div>
            <div className="chart-bar-wrap">
              <div className="chart-bar" style={{ width: `${(s.count / maxCount) * 100}%` }}>
                {s.count > 0 && <span>{s.count}</span>}
              </div>
            </div>
            <div className="chart-meta">avg {s.avg}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className={`stat-card ${color}`}>
      <i className={`fa-solid ${icon}`}></i>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

/* ---------------- LEADERBOARD ---------------- */
function Leaderboard({ rows }: { rows: Submission[] }) {
  const ranked = [...rows].sort((a, b) => (b.points || 0) - (a.points || 0));
  return (
    <div className="leaderboard">
      {ranked.length === 0 && (
        <div className="empty">
          <i className="fa-solid fa-inbox"></i> No submissions yet.
        </div>
      )}
      {ranked.map((r, i) => (
        <div key={r.id ?? i} className={`lb-row rank-${i + 1}`}>
          <div className="lb-rank">
            {i === 0 ? <i className="fa-solid fa-crown gold"></i>
              : i === 1 ? <i className="fa-solid fa-medal silver"></i>
              : i === 2 ? <i className="fa-solid fa-award bronze"></i>
              : `#${i + 1}`}
          </div>
          <div className="lb-info">
            <b>{r.name}</b>
            <div className="lb-meta">{r.school} · {r.dept}</div>
          </div>
          <div className="lb-score">{r.score}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- CANDIDATES ---------------- */
function Candidates({
  rows,
  onDelete,
  onDeleteAll,
  onExport,
  schools,
}: {
  rows: Submission[];
  onDelete: (r: Submission) => void;
  onDeleteAll: () => void;
  onExport: () => void;
  schools: string[];
}) {
  const [q, setQ] = useState("");
  const [school, setSchool] = useState("");
  const filtered = rows.filter(
    (r) =>
      (!school || r.school === school) &&
      (!q ||
        r.name?.toLowerCase().includes(q.toLowerCase()) ||
        r.whatsapp?.includes(q) ||
        r.dept?.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div>
      <div className="toolbar">
        <input placeholder="Search name, WhatsApp, or dept…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={school} onChange={(e) => setSchool(e.target.value)}>
          <option value="">All schools</option>
          {schools.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-info small" onClick={onExport}>
          <i className="fa-solid fa-download"></i> CSV
        </button>
        <button className="btn btn-danger small" onClick={onDeleteAll}>
          <i className="fa-solid fa-trash"></i> All
        </button>
      </div>
      <div className="cand-list">
        {filtered.length === 0 && (
          <div className="empty">
            <i className="fa-solid fa-inbox"></i> No matching candidates.
          </div>
        )}
        {filtered.map((r, i) => (
          <div key={r.id ?? i} className="admin-row">
            <div>
              <b>{r.name}</b>
              <div className="row-meta">
                <i className="fa-solid fa-graduation-cap"></i> {r.school} · {r.dept}
              </div>
              <div className="row-meta">
                <i className="fa-brands fa-whatsapp"></i> {r.whatsapp || "—"}
              </div>
              <div className="row-meta">
                <i className="fa-solid fa-clock-rotate-left"></i> {r.start_time} – {r.finish_time}
              </div>
            </div>
            <div className="row-actions">
              <div className="badge">{r.score}</div>
              <button className="btn-icon danger" onClick={() => onDelete(r)} title="Delete">
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- QUESTION BANK (CLOUD) ---------------- */
function QuestionBank({
  bank,
  onBankChange,
}: {
  bank: Question[];
  onBankChange: (b: Question[]) => void;
}) {
  const [editing, setEditing] = useState<{ idx: number; q: Question } | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function persist(next: Question[]) {
    setSaving(true);
    setMsg(null);
    try {
      await saveBankCloud(next);
      onBankChange(next);
      setMsg("Saved to cloud ✔");
      setTimeout(() => setMsg(null), 2000);
    } catch (e) {
      setMsg("Save failed: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function addNew() {
    setEditing({ idx: -1, q: { q: "", o: ["", "", "", ""], a: 0, e: "" } });
  }

  async function save() {
    if (!editing) return;
    if (!editing.q.q.trim() || editing.q.o.some((o) => !o.trim())) {
      alert("Question and all 4 options are required.");
      return;
    }
    const next = [...bank];
    if (editing.idx === -1) next.push(editing.q);
    else next[editing.idx] = editing.q;
    await persist(next);
    setEditing(null);
  }

  async function del(i: number) {
    if (!confirm("Delete this question?")) return;
    await persist(bank.filter((_, j) => j !== i));
  }

  async function reset() {
    if (!confirm("Reset question bank to defaults? This wipes your edits.")) return;
    setSaving(true);
    try {
      await resetBankCloud();
      onBankChange(DEFAULT_BANK);
      setMsg("Reset to defaults ✔");
      setTimeout(() => setMsg(null), 2000);
    } catch (e) {
      setMsg("Reset failed: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = bank
    .map((q, i) => ({ q, i }))
    .filter(({ q }) =>
      !search ? true : q.q.toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <div>
      <div className="toolbar">
        <input
          placeholder="Search questions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-success small" onClick={addNew} disabled={saving}>
          <i className="fa-solid fa-plus"></i> New
        </button>
        <button className="btn btn-warning small" onClick={reset} disabled={saving}>
          <i className="fa-solid fa-rotate-left"></i> Reset
        </button>
      </div>
      <div className="qbank-meta">
        {bank.length} question(s) · synced to Supabase · visible on every device
        {saving && <> · <i className="fa-solid fa-spinner fa-spin"></i> saving…</>}
      </div>
      {msg && <div className="saved-msg" style={{ marginBottom: 10 }}>{msg}</div>}
      <div className="qbank-list">
        {filtered.map(({ q, i }) => (
          <div key={i} className="qbank-row">
            <div className="qbank-q">
              <span className="qbank-num">Q{i + 1}</span> {q.q}
              <div className="qbank-ans">
                <i className="fa-solid fa-check"></i> {q.o[q.a]}
              </div>
            </div>
            <div className="row-actions">
              <button
                className="btn-icon"
                onClick={() => setEditing({ idx: i, q: { ...q, o: [...q.o] } })}
                title="Edit"
                disabled={saving}
              >
                <i className="fa-solid fa-pen"></i>
              </button>
              <button
                className="btn-icon danger"
                onClick={() => del(i)}
                title="Delete"
                disabled={saving}
              >
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="modal-overlay">
          <div className="card modal-card wide">
            <h3>
              <i className="fa-solid fa-pen-to-square"></i>{" "}
              {editing.idx === -1 ? "New Question" : `Edit Q${editing.idx + 1}`}
            </h3>
            <div className="form-item">
              <label>Question</label>
              <textarea
                rows={3}
                value={editing.q.q}
                onChange={(e) =>
                  setEditing({ ...editing, q: { ...editing.q, q: e.target.value } })
                }
              />
            </div>
            {editing.q.o.map((opt, j) => (
              <div className="form-item" key={j}>
                <label>
                  <input
                    type="radio"
                    checked={editing.q.a === j}
                    onChange={() =>
                      setEditing({ ...editing, q: { ...editing.q, a: j } })
                    }
                  />{" "}
                  Option {String.fromCharCode(65 + j)}{" "}
                  {editing.q.a === j && <span className="correct-tag">correct</span>}
                </label>
                <input
                  value={opt}
                  onChange={(e) => {
                    const o = [...editing.q.o];
                    o[j] = e.target.value;
                    setEditing({ ...editing, q: { ...editing.q, o } });
                  }}
                />
              </div>
            ))}
            <div className="form-item">
              <label>Explanation</label>
              <textarea
                rows={2}
                value={editing.q.e}
                onChange={(e) =>
                  setEditing({ ...editing, q: { ...editing.q, e: e.target.value } })
                }
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-sec"
                onClick={() => setEditing(null)}
                disabled={saving}
              >
                CANCEL
              </button>
              <button className="btn btn-success" onClick={save} disabled={saving}>
                <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-save"}`}></i> SAVE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- SETTINGS (CLOUD) ---------------- */
function Settings({
  config,
  onConfigChange,
}: {
  config: QuizConfig;
  onConfigChange: (c: QuizConfig) => void;
}) {
  const [draft, setDraft] = useState<QuizConfig>(config);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  function update<K extends keyof QuizConfig>(key: K, value: QuizConfig[K]) {
    setDraft({ ...draft, [key]: value });
    setMsg(null);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await saveConfigCloud(draft);
      onConfigChange(draft);
      setMsg("Settings synced to cloud ✔");
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg("Save failed: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!confirm("Reset settings to defaults?")) return;
    setSaving(true);
    try {
      await resetConfigCloud();
      setDraft(DEFAULT_CONFIG);
      onConfigChange(DEFAULT_CONFIG);
      setMsg("Reset to defaults ✔");
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg("Reset failed: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings">
      <div className="form-grid">
        <Field label="Portal Title" icon="fa-heading">
          <input value={draft.PORTAL_TITLE} onChange={(e) => update("PORTAL_TITLE", e.target.value)} />
        </Field>
        <Field label="Portal Subtitle" icon="fa-heading">
          <input value={draft.PORTAL_SUBTITLE} onChange={(e) => update("PORTAL_SUBTITLE", e.target.value)} />
        </Field>
        <Field label="Logo URL" icon="fa-image">
          <input value={draft.LOGO_URL} onChange={(e) => update("LOGO_URL", e.target.value)} />
        </Field>
        <Field label="Candidate Access Code" icon="fa-lock">
          <input value={draft.CODE} onChange={(e) => update("CODE", e.target.value)} />
        </Field>
        <Field label="Admin Password" icon="fa-key">
          <input type="password" value={draft.ADMIN_PASSWORD} onChange={(e) => update("ADMIN_PASSWORD", e.target.value)} />
        </Field>
        <Field label="WhatsApp Number" icon="fa-phone">
          <input value={draft.WA} onChange={(e) => update("WA", e.target.value)} />
        </Field>
        <Field label="Time Limit (seconds)" icon="fa-stopwatch">
          <input type="number" value={draft.TIME} onChange={(e) => update("TIME", Number(e.target.value) || 0)} />
        </Field>
        <Field label="Questions Per Test" icon="fa-list-ol">
          <input type="number" value={draft.QUESTIONS_PER_TEST} onChange={(e) => update("QUESTIONS_PER_TEST", Number(e.target.value) || 0)} />
        </Field>
        <Field label="Max Violations Before Auto-Submit" icon="fa-shield-halved">
          <input type="number" value={draft.MAX_VIOLATIONS} onChange={(e) => update("MAX_VIOLATIONS", Number(e.target.value) || 1)} />
        </Field>
        <Field label="Admin Name" icon="fa-user-shield">
          <input value={draft.ADMIN.name} onChange={(e) => update("ADMIN", { ...draft.ADMIN, name: e.target.value })} />
        </Field>
        <Field label="Admin School" icon="fa-building-columns">
          <input value={draft.ADMIN.school} onChange={(e) => update("ADMIN", { ...draft.ADMIN, school: e.target.value })} />
        </Field>
      </div>

      <div className="settings-actions">
        <button className="btn btn-warning" onClick={reset} disabled={saving}>
          <i className="fa-solid fa-rotate-left"></i> RESET DEFAULTS
        </button>
        <button className="btn btn-success" onClick={save} disabled={saving}>
          <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-save"}`}></i> SAVE CHANGES
        </button>
      </div>
      {msg && (
        <div className="saved-msg">
          <i className="fa-solid fa-check-circle"></i> {msg}
        </div>
      )}
      <div className="settings-note">
        <i className="fa-solid fa-cloud"></i> Settings and the question bank are
        stored in your Supabase <code>quiz_settings</code> table, so every edit
        here appears instantly on every candidate's device.
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="form-item">
      <label>
        <i className={`fa-solid ${icon}`}></i> {label}
      </label>
      {children}
    </div>
  );
}
