"use client";

import { useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Clock,
  Package,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Thermometer,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { StopItem } from "../driver-types";
import { formatMinutesToTime } from "../driver-data";
import { Button } from "@/components/ui/button";

interface DriverStopDetailProps {
  stop: StopItem;
  isActive: boolean;
  onBack: () => void;
  onArrive: (stopId: string) => void;
  onUnlockHold: (stopId: string) => void;
  onOpenPod: (stop: StopItem) => void;
  onOpenException: (stop: StopItem) => void;
}

export function DriverStopDetail({
  stop,
  isActive,
  onBack,
  onArrive,
  onUnlockHold,
  onOpenPod,
  onOpenException,
}: DriverStopDetailProps) {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(
    stop.orders[0]?.id || null,
  );

  const isCompleted =
    stop.status === "delivered" || stop.status === "partial";
  const isException = stop.status === "exception";
  const isEarlyHold = stop.status === "waiting_window";

  return (
    <div className="driver-main-content">
      {/* Top Navigation & Status */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline p-1 -ml-1"
        >
          <ArrowLeft size={16} />
          <span>Back to Run</span>
        </button>

        <span className={`status-chip ${stop.status}`}>
          {stop.status.replace("_", " ")}
        </span>
      </div>

      {/* Destination Hero Card */}
      <div className="driver-card">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-bold text-primary">
            STOP #{stop.sequence} (LIFO Pos #{stop.lifoPosition})
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-muted">
            {stop.dockType.replace("_", " ")}
          </span>
        </div>

        <div>
          <h1 className="text-xl font-bold text-foreground">{stop.outlet}</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin size={13} className="shrink-0 text-muted-foreground" />
            {stop.address}
          </p>
        </div>

        {/* Contact & Navigation Action Row */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <a
            href={`tel:${stop.contact.phone}`}
            className="flex-1 py-2 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold flex items-center justify-center gap-2 text-foreground transition-colors"
          >
            <Phone size={14} className="text-primary" />
            <span>Call {stop.contact.name}</span>
          </a>

          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(stop.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold flex items-center justify-center gap-2 text-foreground transition-colors"
          >
            <Navigation size={14} className="text-primary" />
            <span>Open Directions</span>
          </a>
        </div>
      </div>

      {/* Operating Window & Early Arrival Holding Box */}
      {stop.deliveryWindowState === "breach" && (
        <div className="driver-callout is-warning" role="status">
          <AlertTriangle size={17} />
          <div>
            <strong>Delivery window exceeded by {stop.lateByMinutes} minutes</strong>
            <span>Continue only if receiving staff are available. This stop will retain an SLA breach marker.</span>
          </div>
        </div>
      )}

      {isEarlyHold ? (
        <div className="window-hold-box">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={16} />
              Early Arrival Holding Rule Active
            </span>
            <span className="text-xs font-mono font-bold">
              Opens {formatMinutesToTime(stop.effectiveWindow[0])}
            </span>
          </div>

          <div className="window-hold-timer">
            <span>Holding on Site:</span>
            <span>~{stop.holdingRemainingMinutes ?? 12} min remaining</span>
          </div>

          <p className="text-xs leading-relaxed opacity-90">
            Per Waypoint retail operating policy, vehicles arriving early cannot unload before store receiving opens to avoid blocking residential access.
          </p>

          <Button
            size="sm"
            disabled={(stop.holdingRemainingMinutes ?? 1) > 0}
            onClick={() => onUnlockHold(stop.id)}
            className="mt-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
          >
            {(stop.holdingRemainingMinutes ?? 1) > 0
              ? "Handover locked until window opens"
              : "Window open · Begin handover"}
          </Button>
        </div>
      ) : (
        <div className="driver-card p-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-muted-foreground" />
              <div>
                <span className="font-bold text-foreground block">
                  Delivery Window
                </span>
                <span className="text-muted-foreground text-[11px] font-mono">
                  {formatMinutesToTime(stop.effectiveWindow[0])} –{" "}
                  {formatMinutesToTime(stop.effectiveWindow[1])}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-muted-foreground block">
                Handling Allowance
              </span>
              <span className="text-xs font-bold text-foreground">
                {stop.serviceAllowanceMinutes} minutes
              </span>
            </div>
          </div>

          {stop.actualArrivalTimestamp && (
            <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Arrival logged at:</span>
              <span className="font-mono font-bold text-foreground">
                {stop.actualArrivalTimestamp}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Special Delivery Instructions */}
      {stop.specialInstructions && (
        <div className="driver-card p-3 bg-muted/40 border-l-4 border-l-primary">
          <div className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1">
            <ShieldCheck size={14} className="text-primary" />
            Dock & Access Instructions
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {stop.specialInstructions}
          </p>
        </div>
      )}

      {/* Cargo & Order Manifest Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Cargo Manifest ({stop.orders.length}{" "}
            {stop.orders.length > 1 ? "Consignments" : "Consignment"})
          </h2>
          <span className="text-xs font-mono font-bold text-foreground">
            {stop.totalCartons} Cartons · {stop.totalKg} kg
          </span>
        </div>

        {stop.orders.map((order) => {
          const isExpanded = expandedOrder === order.id;

          return (
            <div
              key={order.id}
              className="driver-card border border-border p-3 transition-colors"
            >
              <div
                onClick={() =>
                  setExpandedOrder(isExpanded ? null : order.id)
                }
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Package
                    size={16}
                    className="text-primary"
                  />
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center gap-2">
                      <span>{order.id}</span>
                      {order.chilled ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-semibold flex items-center gap-1">
                          <Thermometer size={10} />
                          Chilled Reefer
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                          Ambient
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {order.category}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right text-xs">
                    <span className="font-bold text-foreground block font-mono">
                      {order.cartons} ctns
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {order.kg} kg
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={16} className="text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Itemized SKUs List */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Itemized SKU Manifest
                  </span>
                  <div className="space-y-1.5">
                    {order.items.map((sku) => (
                      <div
                        key={sku.sku}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/50"
                      >
                        <div>
                          <span className="font-bold text-foreground block">
                            {sku.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            SKU: {sku.sku}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-foreground text-xs">
                          {sku.qty} {sku.unit}s
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completed POD Summary if stop is delivered */}
      {isCompleted && stop.pod && (
        <div className="driver-card bg-secondary/60 border-border p-4">
          <div className="flex items-center gap-2 text-foreground font-bold text-xs mb-2">
            <CheckCircle2 size={16} />
            Proof of Delivery Captured ({stop.pod.outcome.toUpperCase()})
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground block">
                Received By
              </span>
              <span className="font-bold text-foreground">
                {stop.pod.recipientName}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                {stop.pod.recipientDesignation}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">
                Delivered Count
              </span>
              <span className="font-bold text-foreground font-mono">
                {stop.pod.deliveredCartons} of {stop.pod.expectedCartons} ctns
              </span>
              <span className="text-[10px] text-muted-foreground block">
                Logged at {stop.pod.timestamp}
              </span>
            </div>
          </div>

          {stop.pod.signatureDataUrl && (
            <div className="mt-3 pt-2 border-t border-border">
              <span className="text-[10px] text-muted-foreground block mb-1">
                Recipient Signature
              </span>
              <div className="h-16 w-48 bg-card border rounded p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={stop.pod.signatureDataUrl}
                  alt="Recipient Signature"
                  className="h-full object-contain"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Exception Notice if stop failed */}
      {isException && stop.exception && (
        <div className="driver-card bg-secondary/60 border-border p-4">
          <div className="flex items-center gap-2 text-destructive font-bold text-xs mb-1">
            <AlertTriangle size={16} />
            Exception Logged: {stop.exception.reasonLabel}
          </div>
          <p className="text-xs text-foreground/90 mt-1">
            {stop.exception.notes}
          </p>
          <span className="text-[10px] text-muted-foreground block mt-2">
            Reported at {stop.exception.reportedAt} · Telemetry notified
          </span>
        </div>
      )}

      {/* STICKY BOTTOM ACTION BAR */}
      <div className="driver-sticky-action-bar">
        {isActive && !isCompleted && !isException && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenException(stop)}
            className="w-1/3 h-12 border-destructive text-destructive hover:bg-destructive/10 text-xs font-semibold flex items-center justify-center gap-1"
          >
            <AlertTriangle size={15} />
            <span>Problem</span>
          </Button>
        )}

        {isActive && stop.status === "en_route" ? (
          <Button
            onClick={() => onArrive(stop.id)}
            className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2"
          >
            <MapPin size={18} />
            <span>Mark Arrived at Outlet</span>
          </Button>
        ) : isActive && isEarlyHold ? (
          <Button
            onClick={() => onUnlockHold(stop.id)}
            className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2"
          >
            <Clock size={18} />
            <span>Window Open · Begin Handover</span>
          </Button>
        ) : isActive && (stop.status === "arrived" || stop.status === "unloading") ? (
          <Button
            onClick={() => onOpenPod(stop)}
            className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            <span>Record POD & Complete Stop</span>
          </Button>
        ) : (
          <Button
            onClick={onBack}
            className="w-full h-12 bg-muted text-foreground hover:bg-card border border-border font-semibold text-xs"
          >
            <ArrowLeft size={16} />
            <span>Return to Route Manifest</span>
          </Button>
        )}
      </div>
    </div>
  );
}
