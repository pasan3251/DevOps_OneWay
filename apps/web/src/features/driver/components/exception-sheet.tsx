"use client";

import { useRef, useState } from "react";
import { X, AlertTriangle, Camera, Check } from "lucide-react";
import type {
  StopItem,
  StopExceptionRecord,
  ExceptionReasonCode,
} from "../driver-types";
import { Button } from "@/components/ui/button";

interface ExceptionSheetProps {
  stop?: StopItem;
  onClose: () => void;
  onSubmit: (exception: StopExceptionRecord) => void;
}

const EXCEPTION_OPTIONS: Array<{
  code: ExceptionReasonCode;
  label: string;
  category: "delivery" | "incident";
  description: string;
}> = [
  {
    code: "STORE_CLOSED_UNAVAILABLE",
    label: "Store Closed / Manager Absent",
    category: "delivery",
    description: "Outlet premises locked or receiving personnel unavailable.",
  },
  {
    code: "DELIVERY_REJECTED",
    label: "Delivery Rejected by Outlet",
    category: "delivery",
    description: "Store manager refused shipment due to order discrepancy or temperature breach.",
  },
  {
    code: "DAMAGED_GOODS",
    label: "Physical Goods Damage",
    category: "delivery",
    description: "Punctured cartons, crushed packaging, or transit leakage.",
  },
  {
    code: "ACCESS_BLOCKED",
    label: "Dock / Street Access Blocked",
    category: "delivery",
    description: "Road construction, low overhead wires, or impassable approach bridge.",
  },
];

export function ExceptionSheet({
  stop,
  onClose,
  onSubmit,
}: ExceptionSheetProps) {
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedCode, setSelectedCode] =
    useState<ExceptionReasonCode>("STORE_CLOSED_UNAVAILABLE");
  const [affectedCartons, setAffectedCartons] = useState<number>(
    stop ? Math.min(5, stop.totalCartons) : 1,
  );
  const [notes, setNotes] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedOption =
    EXCEPTION_OPTIONS.find((opt) => opt.code === selectedCode) ||
    EXCEPTION_OPTIONS[0];

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!notes.trim()) {
      setValidationError("Add a short field note describing what happened.");
      return;
    }
    if (!photoPreview) {
      setValidationError("Photo evidence is required for a failed or refused delivery.");
      return;
    }

    const record: StopExceptionRecord = {
      code: selectedCode,
      category: selectedOption.category,
      reasonLabel: selectedOption.label,
      notes: notes.trim() || selectedOption.description,
      affectedCartons:
        selectedCode === "DAMAGED_GOODS"
          ? affectedCartons
          : undefined,
      photoDataUrl: photoPreview || undefined,
      reportedAt: new Date().toISOString(),
    };

    onSubmit(record);
  };

  return (
    <div className="driver-sheet-overlay" role="dialog" aria-modal="true">
      <div className="driver-sheet-content">
        <div className="driver-sheet-handle" />

        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-destructive flex items-center gap-1.5">
              <AlertTriangle size={18} />
              Report Exception or Incident
            </h2>
            <p className="text-xs text-muted-foreground">
              {stop ? stop.outlet : "Route Incident"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Reason Code Picker */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-2">
              Select Exception Category
            </label>
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              {EXCEPTION_OPTIONS.map((option) => (
                <label
                  key={option.code}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                    selectedCode === option.code
                      ? "bg-red-50 dark:bg-red-950/50 border-red-500 text-red-950 dark:text-red-100 ring-1 ring-red-500"
                      : "bg-card border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="exceptionReason"
                    value={option.code}
                    checked={selectedCode === option.code}
                    onChange={() => setSelectedCode(option.code)}
                    className="mt-0.5 accent-destructive"
                  />
                  <div>
                    <div className="text-xs font-bold leading-tight">
                      {option.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Affected Cartons if damage/shortage */}
          {selectedCode === "DAMAGED_GOODS" &&
            stop && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                <span className="text-xs font-medium text-foreground">
                  Number of affected cartons:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAffectedCartons((p) => Math.max(1, p - 1))}
                    className="w-7 h-7 rounded border border-border bg-card text-foreground font-bold"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-sm w-6 text-center">
                    {affectedCartons}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setAffectedCartons((p) => Math.min(stop.totalCartons, p + 1))
                    }
                    className="w-7 h-7 rounded border border-border bg-card text-foreground font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

          {/* Explanation Notes */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Field Notes / Justification *
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe condition on site (e.g. Locked gate with security notice, manager refused chilled cartons due to 45 min delay)..."
              rows={2}
              required
              className="w-full text-xs p-2.5 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-destructive outline-none resize-none"
            />
          </div>

          {/* Photo Evidence */}
          <div>
            <input ref={photoInputRef} type="file" accept="image/*" capture="environment"
              id="exception-photo-input" className="hidden" onChange={handlePhotoCapture} />
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Photo Evidence (Required for Claims)
              </label>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="text-xs text-destructive font-semibold flex items-center gap-1"
              >
                <Camera size={13} />
                Snap Evidence
              </button>
            </div>
            {photoPreview ? (
              <div className="relative rounded-lg overflow-hidden border border-border h-24 bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Exception Evidence"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotoPreview(null)}
                  className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="border border-dashed border-border rounded-lg p-2.5 text-center bg-muted/40">
                <label
                  htmlFor="exception-photo-input"
                  className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 cursor-pointer py-1"
                >
                  <Camera size={15} />
                  <span>Attach Locked Gate, Access Barrier or Damaged Box Photo</span>
                </label>
              </div>
            )}
          </div>

          {validationError && (
            <p className="driver-form-error" role="alert">{validationError}</p>
          )}

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
              className="flex-1 h-11 bg-destructive hover:bg-red-700 text-white font-semibold flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Submit Exception
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
