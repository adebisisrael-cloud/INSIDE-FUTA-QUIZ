import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase";
import {
  loadConfig,
  loadBank,
  type Question,
  type QuizConfig,
} from "./quiz-data";
import { useAntiCheat, type Violation } from "./anti-cheat";
import { Admin } from "./Admin";

type Screen = "auth" | "quiz" | "result" | "admin";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function App() {
  const [config, setConfig] = useState<QuizConfig>(loadConfig);
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
  const [remaining, setRemaining] = useState(config.TIME);
  const [startTime, setStartTime] = useState("");
  const [finalScore, setFinalScore] = useState(0);
  const [finalViolations, setFinalViolations] = useState<Violation[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const timerRef = useRef<number | null>(null);
  const submittedRef = useRef(false);

  const schools = useMemo(() => Object.keys(config.SCHOOLS).sort(), [config]);
  const departments = useMemo(
    () => (faculty ? [...(config.SCHOOLS[faculty] || [])].sort() : []),
    [faculty, config],
  );

  const cheat = useAntiCheat({
    active: screen === "quiz",
    maxViolations: config.MAX_VIOLATIONS,
    onForceSubmit: (vs) => {
      void confirmFinish(true, vs);
    },
  });

  function start() {
    const n = name.trim().toUpperCase();

    // Admin login: name + school + admin password (in code field)
    if (
      n === config.ADMIN.name.toUpperCase() &&
      faculty === config.ADMIN.school
    ) {
      if (code !== config.ADMIN_PASSWORD) {
        setAuthError("Invalid admin password.");
        return;
      }
      setAuthError("");
      setScreen("admin");
      return;
    }

    if (!n || !whatsapp || !faculty || !dept) {
      setAuthError("Please fill in every field.");
      return;
    }
    if (code !== config.CODE) {
      setAuthError("Invalid access code.");
      return;
    }
    setAuthError("");
    setName(n);
    beginQuiz();
  }

  function beginQuiz() {
    const bank = loadBank();
    const picked = shuffle(bank).slice(
      0,
      Math.min(config.QUESTIONS_PER_TEST, bank.length),
    );
    setPool(picked);
    setAnswers(new Array(picked.length).fill(null));
    setIdx(0);
    setRemaining(config.TIME);
    setStartTime(new Date().toLocaleTimeString());
    setFinalScore(0);
    setFinalViolations([]);
    setShowReview(false);
    setShowFinishModal(false);
    submittedRef.current = false;
    cheat.reset();
    setScreen("quiz");
  }

  function retake() {
    // reset auth-only fields stay; reshuffle and go again
    beginQuiz();
  }

  // timer
  useEffect(() => {
    if (screen !== "quiz") return;
    timerRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          void confirmFinish(false, cheat.violations);
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

  async function confirmFinish(forced = false, vs: Violation[] = cheat.violations) {
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
    setFinalViolations(vs);
    setScreen("result");

    try {
      await supabase.from("submissions").insert([
        {
          name,
          whatsapp,
          school: faculty,
          dept,
          score: `${s}/${pool.length}${forced ? " (auto)" : ""}`,
          points: s,
          start_time: startTime,
          finish_time: finishTime,
        },
      ]);
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  }

  function shareWA() {
    const msg = `*${config.PORTAL_TITLE} REPORT*\n*Candidate:* ${name}\n*School:* ${faculty}\n*Dept:* ${dept}\n*Score:* ${finalScore}/${pool.length}`;
    window.open(
      `https://wa.me/${config.WA}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  }

  function logoutAdmin() {
    setScreen("auth");
    setName("");
    setCode("");
    setFaculty("");
    setDept("");
    setConfig(loadConfig());
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div onContextMenu={(e) => e.preventDefault()}>
      <header>
        <img src={config.LOGO_URL} alt="Logo" className="logo" />
        <div className="h-txt">
          <h1>{config.PORTAL_TITLE}</h1>
          <p>{config.PORTAL_SUBTITLE}</p>
        </div>
      </header>

      <div className="container">
        {screen === "auth" && (
          <div className="card">
            <h2 className="card-title">
              <i className="fa-solid fa-user-shield"></i> CANDIDATE LOGIN
            </h2>
            <div className="form-item">
              <label>Full Name</label>
              <i className="fa-solid fa-user input-icon"></i>
              <input
                type="text"
                placeholder="SURNAME FIRSTNAME"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-item">
              <label>WhatsApp Number</label>
              <i className="fa-solid fa-phone input-icon"></i>
              <input
                type="tel"
                placeholder="08112476004"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </div>
            <div className="form-item">
              <label>School (Faculty)</label>
              <i className="fa-solid fa-building-columns input-icon"></i>
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
              <i className="fa-solid fa-graduation-cap input-icon"></i>
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                disabled={!faculty}
              >
                <option value="">
                  {faculty ? "-- Select Department --" : "-- Select School First --"}
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
              <i className="fa-solid fa-lock input-icon"></i>
              <input
                type="password"
                placeholder="Enter Access Code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") start();
                }}
              />
            </div>
            <button className="btn" onClick={start}>
              <i className="fa-solid fa-right-to-bracket"></i> ACCESS PORTAL
            </button>
            {authError && (
              <div className="error-msg">
                <i className="fa-solid fa-triangle-exclamation"></i> {authError}
              </div>
            )}
            <div className="auth-foot">
              <i className="fa-solid fa-shield-halved"></i> Secure proctored test
              · {config.QUESTIONS_PER_TEST} questions ·{" "}
              {Math.floor(config.TIME / 60)} minutes
            </div>
          </div>
        )}

        {screen === "quiz" && pool.length > 0 && (
          <div className="card">
            <div className="stats">
              <div className="u-tag">
                <i className="fa-solid fa-user-check"></i> {name}
              </div>
              <div className="violations-tag" title="Violations">
                <i className="fa-solid fa-shield-halved"></i>{" "}
                {cheat.violations.length}/{config.MAX_VIOLATIONS}
              </div>
              <div className={`timer ${remaining < 60 ? "danger" : ""}`}>
                <i className="fa-solid fa-stopwatch"></i> {minutes}:
                {seconds < 10 ? "0" : ""}
                {seconds}
              </div>
            </div>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${
                    (answers.filter((x) => x !== null).length / pool.length) *
                    100
                  }%`,
                }}
              />
            </div>

            <p className="q-head">
              <i className="fa-solid fa-circle-question"></i> Question {idx + 1}{" "}
              of {pool.length}
            </p>
            <div className="q-body">{pool[idx].q}</div>
            <div className="opts">
              {pool[idx].o.map((t, i) => (
                <div
                  key={i}
                  className={`opt ${answers[idx] === i ? "active" : ""}`}
                  onClick={() => pickAnswer(i)}
                >
                  <span className="opt-letter">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{t}</span>
                </div>
              ))}
            </div>

            <div className="nav-row">
              <button
                className="btn btn-sec"
                onClick={() => move(-1)}
                disabled={idx === 0}
              >
                <i className="fa-solid fa-angle-left"></i> PREVIOUS
              </button>
              <button
                className="btn btn-sec"
                onClick={() => move(1)}
                disabled={idx === pool.length - 1}
              >
                NEXT <i className="fa-solid fa-angle-right"></i>
              </button>
            </div>
            <button
              className="btn btn-danger"
              onClick={() => setShowFinishModal(true)}
            >
              <i className="fa-solid fa-paper-plane"></i> SUBMIT FINAL
            </button>

            <div className="map">
              {pool.map((_, i) => (
                <div
                  key={i}
                  className={`dot ${answers[i] !== null ? "done" : ""} ${
                    idx === i ? "now" : ""
                  }`}
                  onClick={() => setIdx(i)}
                  title={`Question ${i + 1}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        )}

        {screen === "result" && (
          <div className="card result-card">
            <div className="result-icon">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h2 className="final-score">
              {finalScore}/{pool.length}
            </h2>
            <p className="result-pct">
              {pool.length
                ? Math.round((finalScore / pool.length) * 100)
                : 0}
              % ·{" "}
              {finalScore / Math.max(pool.length, 1) >= 0.7
                ? "Excellent"
                : finalScore / Math.max(pool.length, 1) >= 0.5
                  ? "Good"
                  : "Keep practising"}
            </p>
            {finalViolations.length > 0 && (
              <div className="violations-box">
                <i className="fa-solid fa-triangle-exclamation"></i>{" "}
                {finalViolations.length} violation(s) recorded
                {finalViolations.length >= config.MAX_VIOLATIONS &&
                  " — auto-submitted"}
              </div>
            )}
            {submitting && (
              <p className="syncing">
                <i className="fa-solid fa-spinner fa-spin"></i> Syncing to server…
              </p>
            )}
            <div className="result-actions">
              <button
                className="btn btn-info"
                onClick={() => setShowReview((v) => !v)}
              >
                <i className="fa-solid fa-list-check"></i>{" "}
                {showReview ? "HIDE CORRECTIONS" : "VIEW CORRECTIONS"}
              </button>
              <button className="btn btn-success" onClick={shareWA}>
                <i className="fa-brands fa-whatsapp"></i> NOTIFY ADMIN
              </button>
              <button className="btn btn-warning" onClick={retake}>
                <i className="fa-solid fa-rotate"></i> RETAKE TEST
              </button>
              <button
                className="btn btn-dark"
                onClick={() => {
                  setScreen("auth");
                  setName("");
                  setCode("");
                  setWhatsapp("");
                  setFaculty("");
                  setDept("");
                }}
              >
                <i className="fa-solid fa-right-from-bracket"></i> EXIT
              </button>
            </div>

            {showReview && (
              <div className="review-list">
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
                      <div className="review-q">
                        <span className="review-num">Q{i + 1}</span> {q.q}
                      </div>
                      <div
                        className={`review-yours ${
                          correct ? "correct" : "wrong"
                        }`}
                      >
                        <i
                          className={`fa-solid ${
                            correct ? "fa-circle-check" : "fa-circle-xmark"
                          }`}
                        ></i>{" "}
                        Yours:{" "}
                        {answers[i] !== null
                          ? q.o[answers[i] as number]
                          : "Skipped"}
                      </div>
                      {!correct && (
                        <div className="review-correct">
                          <i className="fa-solid fa-check"></i> Correct: {q.o[q.a]}
                        </div>
                      )}
                      <div className="review-explain">
                        <i className="fa-solid fa-circle-info"></i> {q.e}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {screen === "admin" && (
          <Admin
            config={config}
            onConfigChange={(c) => setConfig(c)}
            onLogout={logoutAdmin}
          />
        )}
      </div>

      {showFinishModal && (
        <div className="modal-overlay">
          <div className="card modal-card">
            <div className="modal-icon">
              <i className="fa-solid fa-circle-question"></i>
            </div>
            <h3>FINISH TEST?</h3>
            <p className="modal-text">
              Confirming will end your session and sync your data to the server.
              Answered: {answers.filter((x) => x !== null).length}/{pool.length}.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-sec"
                onClick={() => setShowFinishModal(false)}
              >
                CANCEL
              </button>
              <button
                className="btn btn-success"
                onClick={() => confirmFinish(false)}
              >
                SUBMIT NOW
              </button>
            </div>
          </div>
        </div>
      )}

      {cheat.warning && screen === "quiz" && (
        <div className="modal-overlay">
          <div className="card modal-card warn-modal">
            <div className="modal-icon warn">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3>SECURITY VIOLATION</h3>
            <p className="modal-text">
              <b>{cheat.warning}</b>
              <br />
              Warnings: {cheat.violations.length}/{config.MAX_VIOLATIONS}.
              <br />
              Your test will be auto-submitted at {config.MAX_VIOLATIONS}{" "}
              violations.
            </p>
            <div className="modal-actions">
              <button className="btn btn-warning" onClick={cheat.dismissWarning}>
                I UNDERSTAND
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
