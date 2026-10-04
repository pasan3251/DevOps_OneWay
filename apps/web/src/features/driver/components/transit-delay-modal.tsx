"use client";

import { useState } from "react";
import { X, Clock, AlertTriangle, Check, CloudRain, Car, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TransitDelayModalProps {
  onClose: () => void;
  onSubmit: (reason: string, minutes: number) => void;
}

const DELAY_PRESETS = [
  {
    icon: CloudRain,
    title: "Monsoon Downpour / Flood Detour",
    reason: "Heavy monsoon rainfall causing localized road flooding and slow transit.",
    defaultMinutes: 25,
  },
  {
    icon: Car,
    title: "Urban Traffic Congestion",
    reason: "Unexpected peak commuter congestion or arterial road bottleneck.",
    defaultMinutes: 20,
  },
  {
    icon: Wrench,
    title: "Mechanical / Tire Issue (Curbside Stop)",
    reason: "Slow puncture inspection or engine overheat cooldown while parked safely.",
    defaultMinutes: 30,
  },
];

export function TransitDelayModal({
  onClose,
  onSubmit,
}: TransitDelayModalProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [delayMinutes, setDelayMinutes] = useState(20);
  const [customNote, setCustomNote] = useState("");
  const [safelyStopped, setSafelyStopped] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const preset = DELAY_PRESETS[selectedIdx];
    const finalReason = customNote.trim()
      ? `${preset.title}: ${customNote.trim()}`
      : `${preset.title}: ${preset.reason}`;
    onSubmit(finalReason, delayMinutes);
  };

  return (
    <div className="driver-sheet-overlay" role="dialog" aria-modal="true">
      <div className="driver-sheet-content">
        <div className="driver-sheet-handle" />

        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted text-foreground">
              <Clock size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Report On-Road Transit Delay
              </h2>
              <p className="text-xs text-muted-foreground">
                Alerts Dispatcher & updates downstream store ETAs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="p-2.5 rounded-lg bg-muted border border-border text-foreground text-xs flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0 text-muted-foreground" />
            <span>
              Vehicle must be safely stopped or parked curbside before logging delays.
            </span>
          </div>

          <label className="driver-safety-confirmation">
            <input
              type="checkbox"
              checked={safelyStopped}
              onChange={(event) => setSafelyStopped(event.target.checked)}
            />
            <span>
              <strong>I am safely stopped</strong>
              <small>Delay reporting is locked while the vehicle is moving.</small>
            </span>
          </label>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-2">
              Select Primary Delay Cause
            </label>
            <div className="flex flex-col gap-2">
              {DELAY_PRESETS.map((preset, idx) => {
                const Icon = preset.icon;
                const isSelected = selectedIdx === idx;
                return (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => {
                      setSelectedIdx(idx);
                      setDelayMinutes(preset.defaultMinutes);
                    }}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? "bg-secondary border-border text-foreground ring-1 ring-border"
                        : "bg-card border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="p-1.5 rounded-md bg-muted text-foreground shrink-0 mt-0.5">
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold">{preset.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {preset.reason}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Minute Adjuster */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Estimated Delay Duration
            </label>
            <div className="flex items-center gap-2">
              {[15, 20, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDelayMinutes(mins)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border text-center transition-colors ${
                    delayMinutes === mins
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-foreground hover:bg-muted"
                  }`}
                >
                  +{mins}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Additional Details (Optional)
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Police detour near Borella junction..."
              className="w-full text-xs p-2.5 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!safelyStopped}
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Broadcast Delay (+{delayMinutes}m)
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
