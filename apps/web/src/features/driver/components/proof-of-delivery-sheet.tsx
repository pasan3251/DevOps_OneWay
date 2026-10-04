"use client";

import { useState, useRef, useEffect } from "react";
import { X, Check, Camera, RotateCcw, AlertTriangle } from "lucide-react";
import type { StopItem, ProofOfDeliveryRecord, DeliveryOutcome } from "../driver-types";
import { Button } from "@/components/ui/button";

interface ProofOfDeliverySheetProps {
  stop: StopItem;
  onClose: () => void;
  onSubmit: (pod: ProofOfDeliveryRecord) => void;
}

export function ProofOfDeliverySheet({
  stop,
  onClose,
  onSubmit,
}: ProofOfDeliverySheetProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const [recipientName, setRecipientName] = useState(stop.contact.name || "");
  const [recipientDesignation, setRecipientDesignation] = useState(
    stop.contact.designation || "Store Receiving Manager",
  );
  const [outcome, setOutcome] = useState<DeliveryOutcome>("full");
  const [deliveredCartons, setDeliveredCartons] = useState(stop.totalCartons);
  const [notes, setNotes] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    "Count verified with store manager",
  ]);

  // Setup HTML5 canvas for touch signature
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#15576C";
    ctx.lineWidth = 2.5;
  }, []);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const pos = getCanvasPos(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const pos = getCanvasPos(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasSignature(true);
    }
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // Simulate photo capture or file upload
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

  const triggerMockCamera = () => {
    // Generate a clean SVG mock receipt photo data URL if no camera attached
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, 400, 300);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("WAYPOINT LOGISTICS - PROOF PHOTO", 20, 40);
      ctx.font = "14px sans-serif";
      ctx.fillText(`Outlet: ${stop.outlet}`, 20, 80);
      ctx.fillText(`Delivered: ${deliveredCartons} Cartons`, 20, 110);
      ctx.fillText(`Receiver: ${recipientName}`, 20, 140);
      ctx.fillText(`Timestamp: ${new Date().toLocaleTimeString()}`, 20, 170);
      ctx.fillStyle = "#089B8C";
      ctx.fillRect(20, 200, 120, 30);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("SEAL VERIFIED", 30, 220);
      setPhotoPreview(canvas.toDataURL("image/png"));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) return;

    let signatureDataUrl: string | undefined;
    if (canvasRef.current && hasSignature) {
      signatureDataUrl = canvasRef.current.toDataURL("image/png");
    }

    const pod: ProofOfDeliveryRecord = {
      recipientName: recipientName.trim(),
      recipientDesignation: recipientDesignation.trim(),
      deliveredCartons,
      expectedCartons: stop.totalCartons,
      outcome,
      signatureDataUrl,
      photoDataUrl: photoPreview || undefined,
      notes: [notes, ...selectedTags].filter(Boolean).join(" | "),
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    onSubmit(pod);
  };

  return (
    <div className="driver-sheet-overlay" role="dialog" aria-modal="true">
      <div className="driver-sheet-content">
        <div className="driver-sheet-handle" />

        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Proof of Delivery (POD)
            </h2>
            <p className="text-xs text-muted-foreground">{stop.outlet}</p>
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
          {/* Outcome Selector */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              Handover Outcome
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setOutcome("full");
                  setDeliveredCartons(stop.totalCartons);
                }}
                className={`py-2 px-1 text-xs font-semibold rounded-lg border text-center transition-colors ${
                  outcome === "full"
                    ? "bg-secondary border-border text-foreground ring-1 ring-border"
                    : "bg-card border-border text-foreground hover:bg-muted"
                }`}
              >
                In Full ({stop.totalCartons})
              </button>

              <button
                type="button"
                onClick={() => setOutcome("partial")}
                className={`py-2 px-1 text-xs font-semibold rounded-lg border text-center transition-colors ${
                  outcome === "partial"
                    ? "bg-secondary border-border text-foreground ring-1 ring-border"
                    : "bg-card border-border text-foreground hover:bg-muted"
                }`}
              >
                Partial Shortage
              </button>

              <button
                type="button"
                onClick={() => setOutcome("damaged")}
                className={`py-2 px-1 text-xs font-semibold rounded-lg border text-center transition-colors ${
                  outcome === "damaged"
                    ? "bg-secondary border-border text-foreground ring-1 ring-border"
                    : "bg-card border-border text-foreground hover:bg-muted"
                }`}
              >
                Damage Claim
              </button>
            </div>
          </div>

          {/* Carton Count Check */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/60 border border-border">
            <div>
              <div className="text-xs font-medium text-muted-foreground">
                Delivered Cartons / Crated Units
              </div>
              <div className="text-sm font-bold text-foreground">
                {deliveredCartons} of {stop.totalCartons} packages
              </div>
            </div>
            {outcome !== "full" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveredCartons((prev) => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded border border-border bg-card font-bold text-foreground"
                >
                  -
                </button>
                <span className="font-mono font-bold text-sm w-6 text-center">
                  {deliveredCartons}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setDeliveredCartons((prev) => Math.min(stop.totalCartons, prev + 1))
                  }
                  className="w-8 h-8 rounded border border-border bg-card font-bold text-foreground"
                >
                  +
                </button>
              </div>
            )}
          </div>

          {/* Receiver Information */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Recipient Name *
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. K. Perera"
                required
                className="w-full text-sm p-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Designation
              </label>
              <input
                type="text"
                value={recipientDesignation}
                onChange={(e) => setRecipientDesignation(e.target.value)}
                placeholder="Store Manager / Supervisor"
                className="w-full text-sm p-2 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {/* Quick Confirmation Tags */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              Quick Handover Notes
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Rear dock handover",
                "Chilled temp verified < 4°C",
                "Count verified with store manager",
                "Seals intact",
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:bg-card"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Digital Signature Pad */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Recipient Signature *
              </label>
              {hasSignature && (
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  Clear
                </button>
              )}
            </div>
            <div className="signature-canvas-wrapper">
              <canvas
                ref={canvasRef}
                className="signature-canvas"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/40 text-xs">
                  Sign with finger or stylus inside box
                </div>
              )}
            </div>
          </div>

          {/* Photo Proof Option */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Photo Evidence (Optional / Discrepancy)
              </label>
              <button
                type="button"
                onClick={triggerMockCamera}
                className="text-xs text-primary font-semibold flex items-center gap-1"
              >
                <Camera size={13} />
                Snap Photo
              </button>
            </div>
            {photoPreview ? (
              <div className="relative rounded-lg overflow-hidden border border-border h-24 bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="POD Snapshot"
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
                <input
                  type="file"
                  accept="image/*"
                  id="pod-photo-input"
                  className="hidden"
                  onChange={handlePhotoCapture}
                />
                <label
                  htmlFor="pod-photo-input"
                  className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 cursor-pointer py-1"
                >
                  <Camera size={15} />
                  <span>Attach Unload or Receiving Stamp Photo</span>
                </label>
              </div>
            )}
          </div>

          {outcome !== "full" && (
            <div className="p-2.5 rounded-lg bg-muted border border-border text-foreground text-xs flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
              <span>
                Discrepancy notice will be automatically dispatched to Peliyagoda Planning Desk and Store Portal upon sync.
              </span>
            </div>
          )}

          {/* Action Buttons */}
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
              disabled={!recipientName.trim()}
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Confirm Delivery
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
