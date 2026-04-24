import { useEffect, useMemo, useState } from "react";
import { supabase, type Submission, type SubmissionDetail } from "./supabase";
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
  fetchLiveSessions, // Make sure this is exported in your cloud.ts
} from "./cloud";

type Tab = "overview" | "live" | "leaderboard" | "candidates" | "questions" | "settings";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "fa-chart-pie" },
  { id: "live", label: "Live Monitor", icon: "fa-satellite-dish" },
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
  const [viewing, setViewing] = useState<Submission | null>(null);

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
    if (error) return alert("Delete failed: " + error.message);
    setRows((rs) => rs.filter((r) => r.id !== row.id));
  }

  async function deleteAll() {
    if (!confirm(`Delete ALL ${rows.length} submissions?`)) return;
    const ids = rows.map((r) => r.id).filter((x) => x !== undefined);
    if (ids.length === 0) return;
    const { error } = await supabase.from("submissions").delete().in("id", ids);
    if (error) return alert("Delete failed: " + error.message);
    setRows([]);
  }

  function exportCSV() {
    const header = ["name", "whatsapp", "school", "dept", "score", "points", "start_time", "finish_time"];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      lines.push(header.map((h) => JSON.stringify((r as any)[h] ?? "")).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `submissions-${Date.now()}.csv`;
    a.click();
  }

  return (
    <div className="card admin-card">
      <div className="admin-head">
        <h2><i className="fa-solid fa-shield-halved"></i> MASTER CONTROL</h2>
        <div className="admin-head-actions">
          <button className="btn-icon" onClick={refresh} title="Refresh"><i className="fa-solid fa-rotate"></i></button>
          <button className="btn-icon danger" onClick={onLogout} title="Logout"><i className="fa-solid fa-right-from-bracket"></i></button>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            <i className={`fa-solid ${t.icon}`}></i> {t.label}
          </button>
        ))}
      </div>

      {err && <div className="error-msg"><i className="fa-solid fa-triangle-exclamation"></i> {err}</div>}
      {loading && <div className="loading"><i className="fa-solid fa-spinner fa-spin"></i> Loading…</div>}

      {!loading && tab === "overview" && <Overview rows={rows} schools={Object.keys(config.SCHOOLS)} />}
      {!loading && tab === "live" && <LiveMonitor />}
      {!loading && tab === "leaderboard" && <Leaderboard rows={rows} />}
      {!loading && tab === "candidates" && (
        <Candidates 
          rows={rows} 
          onDelete={deleteRow} 
          onDeleteAll={deleteAll} 
          onExport={exportCSV} 
          schools={Object.keys(config.SCHOOLS)} 
          onView={setViewing} 
        />
      )}
      {tab === "questions" && <QuestionBank bank={bank} onBankChange={onBankChange} aiKey={config.AI_API_KEY} />}
      {tab === "settings" && <Settings config={config} onConfigChange={onConfigChange} />}
      
      {viewing && <CandidateDetail row={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

/* ---------------- LIVE MONITOR (1s AUTO REFRESH) ---------------- */
function LiveMonitor() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [auto, setAuto] = useState(true);

  async function load() {
    const data = await fetchLiveSessions();
    setSessions(data || []);
  }

  useEffect(() => {
    load();
    if (!auto) return;
    const t = setInterval(load, 1000); 
    return () => clearInterval(t);
  }, [auto]);

  return (
    <div className="live-monitor">
      <div className="live-toolbar">
        <div className="live-stats">
          <i className="fa-solid fa-circle" style={{color: 'red', fontSize: '10px'}}></i> {sessions.length} Candidates Live
        </div>
        <label className="toggle inline">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          <span>Auto-refresh (1s)</span>
        </label>
      </div>
      <div className="cand-list">
        {sessions.length === 0 ? (
          <div className="empty">No active candidates.</div>
        ) : (
          sessions.map((s, i) => (
            <div key={i} className="admin-row live-pulse-row">
              <div>
                <b>{s.name}</b>
                <div className="row-meta">{s.school} · {s.dept}</div>
              </div>
              <div className="live-indicator"><span className="pulse-dot"></span> ACTIVE</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ---------------- QUESTION BANK (AI PREVIEW LOGIC) ---------------- */
function QuestionBank({ bank, onBankChange, aiKey }: { bank: Question[], onBankChange: (b: Question[]) => void, aiKey?: string }) {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiPreview, setAiPreview] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function runAIGenerate() {
    if (!aiKey) return alert("Add Gemini API Key in Settings first.");
    setAiBusy(true);
    try {
      // This calls your backend/edge function for Gemini
      const res = await fetch("/api/ai-generate", {
        method: "POST",
        body: JSON.stringify({ key: aiKey, topic: aiTopic })
      });
      const data = await res.json();
      setAiPreview(data);
    } catch (e) {
      alert("AI Generation failed.");
    } finally {
      setAiBusy(false);
    }
  }

  async function acceptAIPreview() {
    const next = [...bank, ...aiPreview];
    setSaving(true);
    await saveBankCloud(next);
    onBankChange(next);
    setAiPreview([]);
    setAiOpen(false);
    setSaving(false);
    setMsg(`Added ${aiPreview.length} questions ✔`);
    setTimeout(() => setMsg(null), 2500);
  }

  return (
    <div>
      <div className="toolbar">
        <button className="btn btn-purple small" onClick={() => setAiOpen(true)}>
          <i className="fa-solid fa-wand-magic-sparkles"></i> AI Generate
        </button>
      </div>

      {aiOpen && (
        <div className="modal-overlay">
          <div className="card modal-card wide">
            <h3>AI Generator</h3>
            <div className="form-item">
              <label>Topic / Subject</label>
              <input value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="e.g. MTH 101, Nigerian History" />
            </div>

            {aiPreview.length > 0 && (
              <div className="ai-preview-box">
                {aiPreview.map((q, i) => <div key={i} className="ai-preview-item"><b>Q{i+1}:</b> {q.q}</div>)}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-sec" onClick={() => setAiOpen(false)}>CANCEL</button>
              {aiPreview.length === 0 ? (
                <button className="btn btn-success" onClick={runAIGenerate} disabled={aiBusy}>
                  {aiBusy ? "GENERATING..." : "GENERATE"}
                </button>
              ) : (
                <button className="btn btn-success" onClick={acceptAIPreview} disabled={saving}>
                  {saving ? "SAVING..." : "ADD TO BANK"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {msg && <div className="saved-msg">{msg}</div>}
      <div className="qbank-list">
        {bank.map((q, i) => <div key={i} className="qbank-row"><b>Q{i+1}</b> {q.q}</div>)}
      </div>
    </div>
  );
}

/* ---------------- SETTINGS (ALL FIELDS RESTORED) ---------------- */
function Settings({ config, onConfigChange }: { config: QuizConfig, onConfigChange: (c: QuizConfig) => void }) {
  const [draft, setDraft] = useState<QuizConfig>(config);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const update = (k: keyof QuizConfig, v: any) => setDraft({...draft, [k]: v});

  async function save() {
    setSaving(true);
    await saveConfigCloud(draft);
    onConfigChange(draft);
    setMsg("Settings saved ✔");
    setSaving(false);
    setTimeout(() => setMsg(null), 2500);
  }

  return (
    <div className="settings">
      <div className="form-grid">
        <Field label="Portal Title" icon="fa-heading"><input value={draft.PORTAL_TITLE} onChange={e => update("PORTAL_TITLE", e.target.value)} /></Field>
        <Field label="Logo URL" icon="fa-image"><input value={draft.LOGO_URL} onChange={e => update("LOGO_URL", e.target.value)} /></Field>
        <Field label="Access Code" icon="fa-lock"><input value={draft.CODE} onChange={e => update("CODE", e.target.value)} /></Field>
        <Field label="Admin Password" icon="fa-key"><input type="password" value={draft.ADMIN_PASSWORD} onChange={e => update("ADMIN_PASSWORD", e.target.value)} /></Field>
        <Field label="Time (sec)" icon="fa-clock"><input type="number" value={draft.TIME} onChange={e => update("TIME", Number(e.target.value))} /></Field>
        <Field label="Gemini AI Key" icon="fa-wand-magic-sparkles"><input type="password" value={draft.AI_API_KEY} onChange={e => update("AI_API_KEY", e.target.value)} /></Field>
        <Field label="Test Starts" icon="fa-calendar-check"><input type="datetime-local" value={draft.TEST_START} onChange={e => update("TEST_START", e.target.value)} /></Field>
        <Field label="Test Ends" icon="fa-calendar-xmark"><input type="datetime-local" value={draft.TEST_END} onChange={e => update("TEST_END", e.target.value)} /></Field>
      </div>
      <div className="toggle-grid">
        <label className="toggle">
          <input type="checkbox" checked={draft.REQUIRE_WEBCAM} onChange={e => update("REQUIRE_WEBCAM", e.target.checked)} />
          <span>Require Webcam</span>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={draft.ONE_ATTEMPT} onChange={e => update("ONE_ATTEMPT", e.target.checked)} />
          <span>One Attempt Only</span>
        </label>
      </div>
      <div className="settings-actions">
        <button className="btn btn-success" onClick={save} disabled={saving}>{saving ? "SAVING..." : "SAVE CHANGES"}</button>
      </div>
      {msg && <div className="saved-msg">{msg}</div>}
    </div>
  );
}

// Sub-components to keep the main file clean and functional
function Field({ label, icon, children }: any) { 
  return <div className="form-item"><label><i className={`fa-solid ${icon}`}></i> {label}</label>{children}</div>; 
}

function Overview({ rows }: any) {
  return (
    <div className="overview">
      <div className="stat-grid">
        <div className="stat-card blue"><b>{rows.length}</b><span>Candidates</span></div>
        <div className="stat-card gold"><b>{rows.length ? Math.max(...rows.map((r: any) => r.points || 0)) : 0}</b><span>Top Score</span></div>
      </div>
    </div>
  );
}

function Leaderboard({ rows }: any) {
  return (
    <div className="leaderboard">
      {rows.map((r: any, i: number) => (
        <div key={i} className="lb-row">
          <span>#{i+1}</span> <b>{r.name}</b> <span>{r.score}</span>
        </div>
      ))}
    </div>
  );
}

function Candidates({ rows, onDelete, onDeleteAll, onExport, onView }: any) {
  return (
    <div className="candidates">
      <div className="toolbar">
        <button className="btn btn-info small" onClick={onExport}>CSV Export</button>
        <button className="btn btn-danger small" onClick={onDeleteAll}>Clear All</button>
      </div>
      <div className="cand-list">
        {rows.map((r: any, i: number) => (
          <div key={i} className="admin-row">
            <div><b>{r.name}</b><div className="row-meta">{r.school}</div></div>
            <div className="row-actions">
              <button className="btn-icon" onClick={() => onView(r)}><i className="fa-solid fa-eye"></i></button>
              <button className="btn-icon danger" onClick={() => onDelete(r)}><i className="fa-solid fa-trash"></i></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CandidateDetail({ row, onClose }: any) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card modal-card wide" onClick={e => e.stopPropagation()}>
        <h3>Report: {row.name}</h3>
        <p>Score: {row.score}</p>
        <button className="btn btn-dark" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
