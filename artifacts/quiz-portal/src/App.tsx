import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase";
import {
  DEFAULT_CONFIG,
  DEFAULT_BANK,
  type Question,
  type QuizConfig,
} from "./quiz-data";
import { fetchConfig, fetchBank } from "./cloud";
import { useAntiCheat, type Violation } from "./anti-cheat";
import { Admin } from "./Admin";

type Screen = "auth" | "quiz" | "result" | "admin" | "closed";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleQuestion(q: Question): Question {
  const idx = shuffle([0, 1, 2, 3]);
  const newO = idx.map((i) => q.o[i]);
  const newA = idx.indexOf(q.a);
  return { ...q, o: newO, a: newA };
}

function windowStatus(cfg: QuizConfig): {
  ok: boolean;
  message?: string;
  startsAt?: Date;
} {
  const now = new Date();
  if (cfg.TEST_START) {
    const start = new Date(cfg.TEST_START);
    if (!isNaN(start.getTime()) && now < start) {
      return {
        ok: false,
        message: "The test window has not opened yet.",
        startsAt: start,
      };
    }
  }
  if (cfg.TEST_END) {
    const end = new Date(cfg.TEST_END);
    if (!isNaN(end.getTime()) && now > end) {
      return { ok: false, message: "The test window has closed." };
    }
  }
  return { ok: true };
}

export default function App() {
  const [config, setConfig] = useState<QuizConfig>(DEFAULT_CONFIG);
  const [bank, setBank] = useState<Question[]>(DEFAULT_BANK);
  const [booting, setBooting] = useState(true);
  const [screen, setScreen] = useState<Screen>("auth");
  const [closedMsg, setClosedMsg] = useState("");

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [faculty, setFaculty] = useState("");
  const [dept, setDept] = useState("");
  const [code, setCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [authChecking, setAuthChecking] = useState(false);

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
  const [webcamDenied, setWebcamDenied] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);

  const timerRef = useRef<number | null>(null);
  const submittedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const snapshotsRef = useRef<string[]>([]);
  const snapshotTimerRef = useRef<number | null>(null);

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

  useEffect(() => {
    (async () => {
      try {
        const [c, b] = await Promise.all([fetchConfig(), fetchBank()]);
        setConfig(c);
        setBank(b);
      } catch {
        /* keep defaults */
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  async function startCamera(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setWebcamActive(true);
      setWebcamDenied(false);
      return true;
    } catch {
      setWebcamActive(false);
      setWebcamDenied(true);
      return false;
    }
  }

  function takeSnapshot() {
    const v = videoRef.current;
    if (!v || !streamRef.current) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, 320, 240);
      snapshotsRef.current = [
        ...snapshotsRef.current,
        canvas.toDataURL("image/jpeg", 0.45),
      ];
    } catch {
      /* ignore */
    }
  }

  function stopCamera() {
    if (snapshotTimerRef.current) {
      window.clearInterval(snapshotTimerRef.current);
      snapshotTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setWebcamActive(false);
  }

  async function start() {
    const n = name.trim().toUpperCase();
    setAuthError("");

    // Admin login
    if (
      n === config.ADMIN.name.toUpperCase() &&
      faculty === config.ADMIN.school
    ) {
      if (code !== config.ADMIN_PASSWORD) {
        setAuthError("Invalid admin password.");
        return;
      }
      setScreen("admin");
      return;
    }

    if (!n || !whatsapp.trim() || !faculty || !dept) {
      setAuthError("Please fill in every field.");
      return;
    }
    if (code !== config.CODE) {
      setAuthError("Invalid access code.");
      return;
    }

    // Schedule check
    const w = windowStatus(config);
    if (!w.ok) {
      setClosedMsg(
        w.message +
          (w.startsAt ? ` Opens ${w.startsAt.toLocaleString()}.` : ""),
      );
      setScreen("closed");
      return;
    }

    setAuthChecking(true);
    try {
      // Duplicate attempt check
      if (config.ONE_ATTEMPT) {
        const { data } = await supabase
          .from("submissions")
          .select("id")
          .eq("name", n)
          .eq("whatsapp", whatsapp.trim())
          .limit(1);
        if (data && data.length > 0) {
          setAuthError(
            "You have already taken this test. Only one attempt per candidate is allowed.",
          );
          setAuthChecking(false);
          return;
        }
      }

      // Webcam
      if (config.REQUIRE_WEBCAM) {
        const ok = await startCamera();
        if (!ok) {
          setAuthError(
            "Webcam access is required. Please allow camera and try again.",
          );
          setAuthChecking(false);
          return;
        }
      }
    } finally {
      setAuthChecking(false);
    }

    setName(n);
    setWhatsapp(whatsapp.trim());
    beginQuiz();
  }

  function beginQuiz() {
    const picked = shuffle(bank)
      .slice(0, Math.min(config.QUESTIONS_PER_TEST, bank.length))
      .map(shuffleQuestion);
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
    snapshotsRef.current = [];
    cheat.reset();
    setScreen("quiz");
  }

  function retake() {
    // Retake still needs webcam and still counts as another attempt (prevented by ONE_ATTEMPT).
    // For admin / explicitly allowed cases, we simply reshuffle from bank.
    beginQuiz();
  }

  // Timer
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

  // Webcam snapshots schedule (first at 5s, then every 45s, max 6)
  useEffect(() => {
    if (screen !== "quiz" || !webcamActive) return;
    const first = window.setTimeout(() => {
      takeSnapshot();
      snapshotTimerRef.current = window.setInterval(() => {
        if (snapshotsRef.current.length >= 6) {
          if (snapshotTimerRef.current)
            window.clearInterval(snapshotTimerRef.current);
          return;
        }
        takeSnapshot();
      }, 45000);
    }, 5000);
    return () => {
      window.clearTimeout(first);
      if (snapshotTimerRef.current)
        window.clearInterval(snapshotTimerRef.current);
    };
  }, [screen, webcamActive]);

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

  async function confirmFinish(
    forced = false,
    vs: Violation[] = cheat.violations,
  ) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setShowFinishModal(false);
    setSubmitting(true);
    if (timerRef.current) window.clearInterval(timerRef.current);

    // Take one final snapshot before stopping
    takeSnapshot();
    stopCamera();

    const finishTime = new Date().toLocaleTimeString();
    let s = 0;
    pool.forEach((q, i) => {
      if (answers[i] === q.a) s++;
    });
    setFinalScore(s);
    setFinalViolations(vs);
    setScreen("result");

    const details = {
      answers: pool.map((q, i) => ({
        q: q.q,
        o: q.o,
        a: q.a,
        chosen: answers[i],
        e: q.e,
      })),
      violations: vs,
      forced,
      snapshots: snapshotsRef.current,
      webcam_denied: webcamDenied,
    };

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
          details,
        },
      ]);
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }

    // Auto-open WhatsApp report (only on manual submit so pop-up is allowed)
    if (config.AUTO_WHATSAPP && !forced) {
      const msg = `*${config.PORTAL_TITLE} REPORT*\n*Candidate:* ${name}\n*School:* ${faculty}\n*Dept:* ${dept}\n*Score:* ${s}/${pool.length}\n*Violations:* ${vs.length}`;
      window.open(
        `https://wa.me/${config.WA}?text=${encodeURIComponent(msg)}`,
        "_blank",
      );
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
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  if (booting) {
    return (
      <div className="boot-loader">
        <i className="fa-solid fa-spinner fa-spin"></i>
        <span>Connecting to server…</span>
      </div>
    );
  }

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
        {screen === "closed" && (
          <div className="card result-card">
            <div className="result-icon" style={{ color: "var(--warn)" }}>
              <i className="fa-solid fa-lock"></i>
            </div>
            <h2 style={{ color: "var(--blue)" }}>Test Unavailable</h2>
            <p style={{ color: "#555", margin: "10px 0 20px" }}>{closedMsg}</p>
            <button
              className="btn btn-dark"
              onClick={() => setScreen("auth")}
            >
              <i className="fa-solid fa-arrow-left"></i> BACK
            </button>
          </div>
        )}

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
                  if (e.key === "Enter") void start();
                }}
              />
            </div>
            <button
              className="btn"
              onClick={() => void start()}
              disabled={authChecking}
            >
              <i
                className={`fa-solid ${
                  authChecking ? "fa-spinner fa-spin" : "fa-right-to-bracket"
                }`}
              ></i>{" "}
              {authChecking ? "VERIFYING…" : "ACCESS PORTAL"}
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
              {config.REQUIRE_WEBCAM && (
                <>
                  {" "}
                  · <i className="fa-solid fa-camera"></i> Webcam required
                </>
              )}
              {config.ONE_ATTEMPT && (
                <>
                  {" "}
                  · <i className="fa-solid fa-user-lock"></i> One attempt only
                </>
              )}
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
            bank={bank}
            onConfigChange={setConfig}
            onBankChange={setBank}
            onLogout={logoutAdmin}
          />
        )}
      </div>

      {/* webcam preview (always mounted while quiz is on) */}
      {screen === "quiz" && webcamActive && (
        <div className="webcam-preview" title="Proctor camera active">
          <video ref={videoRef} autoPlay muted playsInline />
          <span className="rec-dot" />
        </div>
      )}
      {/* hidden video for camera to bind to before quiz screen renders */}
      {screen !== "quiz" && webcamActive && (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ display: "none" }}
        />
      )}

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
