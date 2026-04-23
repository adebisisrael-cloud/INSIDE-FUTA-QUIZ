import { useEffect, useRef, useState } from "react";

export type Violation = { type: string; at: string };

export function useAntiCheat(opts: {
  active: boolean;
  maxViolations: number;
  onForceSubmit: (violations: Violation[]) => void;
}) {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const ref = useRef<Violation[]>([]);
  const submittedRef = useRef(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!opts.active) {
      ref.current = [];
      setViolations([]);
      setWarning(null);
      submittedRef.current = false;
      return;
    }

    function record(type: string) {
      if (submittedRef.current) return;
      const v = { type, at: new Date().toLocaleTimeString() };
      ref.current = [...ref.current, v];
      setViolations(ref.current);
      setWarning(type);
      if (ref.current.length >= optsRef.current.maxViolations) {
        submittedRef.current = true;
        optsRef.current.onForceSubmit(ref.current);
      }
    }

    function onVis() {
      if (document.hidden) record("Tab/window switch detected");
    }
    function onBlur() {
      record("Window lost focus");
    }
    function onKey(e: KeyboardEvent) {
      const k = e.key;
      const ctrl = e.ctrlKey || e.metaKey;
      const blocked =
        k === "F12" ||
        (ctrl && e.shiftKey && /^[ijcIJC]$/.test(k)) ||
        (ctrl && /^[uUsSpPcCxXaA]$/.test(k));
      if (blocked) {
        e.preventDefault();
        const combo = `${ctrl ? "Ctrl+" : ""}${e.shiftKey ? "Shift+" : ""}${k.toUpperCase()}`;
        record(`Blocked shortcut: ${combo}`);
      }
    }
    function onCopy(e: ClipboardEvent) {
      e.preventDefault();
      record("Copy attempt blocked");
    }
    function onCut(e: ClipboardEvent) {
      e.preventDefault();
      record("Cut attempt blocked");
    }
    function onPaste(e: ClipboardEvent) {
      e.preventDefault();
    }
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "Your test is in progress. Are you sure?";
    }

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("keydown", onKey);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [opts.active]);

  return {
    violations,
    warning,
    dismissWarning: () => setWarning(null),
    reset: () => {
      ref.current = [];
      setViolations([]);
      setWarning(null);
      submittedRef.current = false;
    },
  };
}
