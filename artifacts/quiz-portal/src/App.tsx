import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { CONFIG, BANK, type Question } from "./quiz-data";

const SB_URL = "https://viislvqotvivkxcdbtyd.supabase.co";
const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpaXNsdnFvdHZpdmt4Y2RidHlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDY0NzksImV4cCI6MjA5MjUyMjQ3OX0.1xio9peC2hjyMsjUG5b2rMYiU3BW-SaYaObkq4a8vJQ";
const supabase = createClient(SB_URL, SB_KEY);

type Screen = "auth" | "quiz" | "result" | "admin";

type Submission = {
  name: string;
  whatsapp: string;
  school: string;
  dept: string;
  score: string;
  points: number;
  start_time: string;
  finish_time: string;
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => 0.5 - Math.random());
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("auth");

  // auth fields
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [faculty, setFaculty] = useState("");
  const [dept, setDept] = useState("");
  const [code, setCode] = useState("");
  const [authError, setAuthError] = useState("");

  // quiz state
  const [pool, setPool] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(CONFIG.TIME);
  const [startTime, setStartTime] = useState("");
  const [finalScore, setFinalScore] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // admin
  const [adminRows, setAdminRows] = useState<Submission[]>([]);

  const timerRef = useRef<number | null>(null);
  const submittedRef = useRef(false);

  const departments = useMemo(
    () => (faculty ? [...CONFIG.SCHOOLS[faculty]].sort() : []),
    [faculty],
  );
  const schools = useMemo(() => Object.keys(CONFIG.SCHOOLS).sort(), []);

  function start() {
    const n = name.trim().toUpperCase();
    if (
      n === CONFIG.ADMIN.name &&
      faculty === CONFIG.ADMIN.school
    ) {
      void openAdmin();
      return;
    }
    if (!n || !faculty || !dept) {
      setAuthError("Please fill in all fields.");
      return;
    }
    if (code !== CONFIG.CODE) {
      setAuthError("Invalid access code.");
      return;
    }
    setAuthError("");
    setName(n);
    setStartTime(new Date().toLocaleTimeString());
    const picked = shuffle(BANK).slice(0, 30);
    setPool(picked);
    setAnswers(new Array(picked.length).fill(null));
    setIdx(0);
    setRemaining(CONFIG.TIME);
    submittedRef.current = false;
    setScreen("quiz");
  }

  // timer
  useEffect(() => {
    if (screen !== "quiz") return;
    timerRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          void confirmFinish();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  function pickAnswer(i: number) {
    setAnswers((a) => {
      const copy = [...a];
      copy[idx] = i;
      return copy;
    });
  }

  function move(d: number) {
    setIdx((i) => Math.max(0, Math.min(pool.length - 1, i + d)));
  }

  async function confirmFinish() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setShowFinishModal(false);
    setSubmitting(true);
    if (timerRef.current) window.clearInterval(timerRef.current);

    const finishTime = new Date().toLocaleTimeString();
    let s = 0;
    pool.forEach((q, i) => {
      if (answers[i] === q.a) s++;
    });
    setFinalScore(s);
    setScreen("result");

    try {
      await supabase.from("submissions").insert([
        {
          name,
          whatsapp,
          school: faculty,
          dept,
          score: `${s}/${pool.length}`,
          points: s,
          start_time: startTime,
          finish_time: finishTime,
        },
      ]);
    } catch {
      /* swallow — result still shown */
    } finally {
      setSubmitting(false);
    }
  }

  async function openAdmin() {
    setScreen("admin");
    const { data } = await supabase
      .from("submissions")
      .select("*")
      .order("points", { ascending: false });
    setAdminRows((data as Submission[]) ?? []);
  }

  function shareWA() {
    const msg = `*GENERAL KNOWLEDGE REPORT*\n*Candidate:* ${name}\n*Score:* ${finalScore}/${pool.length}`;
    window.open(
      `https://wa.me/${CONFIG.WA}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div onContextMenu={(e) => e.preventDefault()}>
      <header>
        <img
          src="https://files.catbox.moe/33ap4i.jpg"
          alt="Logo"
          className="logo"
        />
        <div className="h-txt">
          <h1>INSIDE FUTA</h1>
          <p>SMART TEST PORTAL</p>
        </div>
      </header>

      <div className="container">
        {screen === "auth" && (
          <div className="card">
            <h2
              style={{
                textAlign: "center",
                marginBottom: 20,
                color: "var(--blue)",
              }}
            >
              CANDIDATE LOGIN
            </h2>
            <div className="form-item">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="SURNAME FIRSTNAME"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-item">
              <label>WhatsApp Number</label>
              <input
                type="tel"
                placeholder="08112476004"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </div>
            <div className="form-item">
              <label>School (Faculty)</label>
              <select
                value={faculty}
                onChange={(e) => {
                  setFaculty(e.target.value);
                  setDept("");
                }}
              >
                <option value="">-- Select School --</option>
                {schools.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-item">
              <label>Department</label>
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                disabled={!faculty}
              >
                <option value="">
                  {faculty
                    ? "-- Select Department --"
                    : "-- Select School First --"}
                </option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-item">
              <label>Access Code</label>
              <input
                type="text"
                placeholder="Enter Access Code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <button className="btn" onClick={start}>
              ACCESS PORTAL
            </button>
            {authError && <div className="error-msg">{authError}</div>}
          </div>
        )}

        {screen === "quiz" && pool.length > 0 && (
          <div className="card">
            <div className="stats">
              <div style={{ fontWeight: "bold", color: "var(--blue)" }}>
                {name}
              </div>
              <div className="timer">
                {minutes}:{seconds < 10 ? "0" : ""}
                {seconds}
              </div>
            </div>

            <p
              style={{
                fontWeight: "bold",
                color: "var(--gold)",
                fontSize: "0.8rem",
                textTransform: "uppercase",
              }}
            >
              Question {idx + 1} of {pool.length}
            </p>
            <div className="q-body">{pool[idx].q}</div>
            <div className="opts">
              {pool[idx].o.map((t, i) => (
                <div
                  key={i}
                  className={`opt ${answers[idx] === i ? "active" : ""}`}
                  onClick={() => pickAnswer(i)}
                >
                  <b>{String.fromCharCode(65 + i)}.</b> {t}
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 25,
              }}
            >
              <button
                className="btn btn-sec"
                onClick={() => move(-1)}
                disabled={idx === 0}
              >
                PREVIOUS
              </button>
              <button
                className="btn btn-sec"
                onClick={() => move(1)}
                disabled={idx === pool.length - 1}
              >
                NEXT
              </button>
            </div>
            <button
              className="btn"
              style={{ background: "var(--err)", marginTop: 15 }}
              onClick={() => setShowFinishModal(true)}
            >
              SUBMIT FINAL
            </button>

            <div className="map">
              {pool.map((_, i) => (
                <div
                  key={i}
                  className={`dot ${answers[i] !== null ? "done" : ""} ${
                    idx === i ? "now" : ""
                  }`}
                  onClick={() => setIdx(i)}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        )}

        {screen === "result" && (
          <div className="card" style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "4rem",
                color: "var(--ok)",
                marginBottom: 15,
              }}
            >
              ✓
            </div>
            <h2
              style={{
                margin: "10px 0",
                fontSize: "2.5rem",
                color: "var(--blue)",
              }}
            >
              {finalScore}/{pool.length}
            </h2>
            {submitting && (
              <p style={{ color: "#666" }}>Syncing to server…</p>
            )}
            <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
              <button
                className="btn"
                style={{ background: "#3498db" }}
                onClick={() => setShowReview((v) => !v)}
              >
                {showReview ? "HIDE CORRECTIONS" : "VIEW CORRECTIONS"}
              </button>
              <button
                className="btn"
                style={{ background: "#27ae60" }}
                onClick={shareWA}
              >
                NOTIFY ADMIN (WhatsApp)
              </button>
              <button
                className="btn"
                style={{ background: "#2c3e50" }}
                onClick={() => location.reload()}
              >
                RESTART
              </button>
            </div>

            {showReview && (
              <div style={{ marginTop: 25, textAlign: "left" }}>
                {pool.map((q, i) => {
                  const correct = answers[i] === q.a;
                  return (
                    <div
                      key={i}
                      className="review-item"
                      style={{
                        borderLeft: `5px solid ${
                          correct ? "var(--ok)" : "var(--err)"
                        }`,
                      }}
                    >
                      <b>
                        Q{i + 1}: {q.q}
                      </b>
                      <br />
                      <span
                        style={{
                          color: correct ? "var(--ok)" : "var(--err)",
                        }}
                      >
                        Yours:{" "}
                        {answers[i] !== null
                          ? q.o[answers[i] as number]
                          : "Skipped"}
                      </span>
                      <br />
                      {!correct && (
                        <>
                          <span style={{ color: "var(--ok)" }}>
                            Correct: {q.o[q.a]}
                          </span>
                          <br />
                        </>
                      )}
                      <small style={{ color: "#666" }}>
                        <i>{q.e}</i>
                      </small>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {screen === "admin" && (
          <div className="card">
            <h2
              style={{
                color: "var(--blue)",
                marginBottom: 20,
              }}
            >
              MASTER CONTROL
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 15,
                marginBottom: 25,
              }}
            >
              <div
                style={{
                  background: "#f0f7ff",
                  padding: 20,
                  borderRadius: 10,
                  textAlign: "center",
                  border: "1px solid #d0e4ff",
                }}
              >
                <p
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    color: "#555",
                  }}
                >
                  TOTAL CANDIDATES
                </p>
                <h2
                  style={{ color: "var(--blue)", fontSize: "2rem" }}
                >
                  {adminRows.length}
                </h2>
              </div>
              <div
                style={{
                  background: "#fff9e6",
                  padding: 20,
                  borderRadius: 10,
                  textAlign: "center",
                  border: "1px solid #ffe8a3",
                }}
              >
                <p
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    color: "#555",
                  }}
                >
                  HIGHEST SCORE
                </p>
                <h2
                  style={{ color: "var(--gold)", fontSize: "2rem" }}
                >
                  {adminRows[0]?.points ?? 0}
                </h2>
              </div>
            </div>
            <div
              style={{
                maxHeight: 500,
                overflowY: "auto",
                border: "1px solid #eee",
                borderRadius: 8,
              }}
            >
              {adminRows.map((r, i) => (
                <div key={i} className="admin-row">
                  <div>
                    <b>{r.name}</b>
                    <br />
                    <small>{r.dept}</small>
                    <br />
                    <small style={{ color: "var(--blue)" }}>
                      {r.start_time} – {r.finish_time}
                    </small>
                  </div>
                  <div className="badge">{r.score}</div>
                </div>
              ))}
              {adminRows.length === 0 && (
                <div style={{ padding: 20, textAlign: "center", color: "#888" }}>
                  No submissions yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showFinishModal && (
        <div className="modal-overlay">
          <div className="card" style={{ maxWidth: 380, textAlign: "center" }}>
            <div
              style={{
                fontSize: 50,
                color: "var(--gold)",
                marginBottom: 15,
              }}
            >
              ?
            </div>
            <h3>FINISH TEST?</h3>
            <p
              style={{
                margin: "15px 0 25px",
                color: "#666",
                fontSize: "0.95rem",
              }}
            >
              Confirming will end your session and sync your data to the server.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-sec"
                onClick={() => setShowFinishModal(false)}
              >
                CANCEL
              </button>
              <button
                className="btn"
                style={{ background: "var(--ok)" }}
                onClick={confirmFinish}
              >
                SUBMIT NOW
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
