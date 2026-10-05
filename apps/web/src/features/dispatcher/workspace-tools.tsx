"use client";

import { useEffect, useState } from "react";
import { Clock3, Moon, Sun } from "lucide-react";
import type { WorkspaceState } from "./workspace-state";

export function WorkspaceTools({ state, onSave }: {
  state: WorkspaceState;
  onSave: (value: WorkspaceState, feedback: string) => boolean;
}) {
  const [clock, setClock] = useState("");
  useEffect(() => {
    const tick = () => setClock(new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo",
    }).format(new Date()));
    const initial = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 60_000);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); };
  }, []);

  return <>
    <span className="workspace-clock" aria-label="Current time in Asia Colombo">
      <Clock3 size={14} />{clock || "--:--"}<span>Colombo · Cutoff 16:00</span>
    </span>
    <button className="dispatch-icon-button"
      aria-label={state.theme === "light" ? "Use dark theme" : "Use light theme"}
      onClick={() => onSave({ ...state, theme: state.theme === "light" ? "dark" : "light" }, "Appearance saved.")}>
      {state.theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  </>;
}
