"use client";

import { useState } from "react";
import {
  CheckCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DiscrepancyRecord, DiscrepancyResolution } from "./loader-manifest";

const RESOLUTION_LABELS: Record<DiscrepancyResolution, string> = {
  pending: "Pending",
  ship_partial: "Ship partial",
  hold_replacement: "Hold for replacement",
  emergency_defer: "Deferred",
};

const TYPE_LABELS: Record<string, string> = {
  missing: "Missing",
  damaged: "Damaged",
  temperature_breach: "Temp. breach",
};

export function LoaderDiscrepancies({
  discrepancies,
  onResolve,
  onUpdateResolution,
}: {
  discrepancies: DiscrepancyRecord[];
  onResolve: (id: string) => void;
  onUpdateResolution: (id: string, resolution: DiscrepancyResolution, notes: string) => void;
}) {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = discrepancies.filter((d) => {
    const matchesType = filterType === "all" || d.type === filterType;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "pending" && d.resolution === "pending") ||
      (filterStatus === "resolved" && d.resolution !== "pending");
    return matchesType && matchesStatus;
  });

  const selectedRecord =
    discrepancies.find((d) => d.id === selectedId) || (filtered.length > 0 ? filtered[0] : null);

  const pendingCount = discrepancies.filter((d) => d.resolution === "pending").length;

  return (
    <div className="space-y-5">
      {/* Minimal stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total exceptions", value: discrepancies.length },
          { label: "Pending decision", value: pendingCount, warn: pendingCount > 0 },
          { label: "Ship partial", value: discrepancies.filter((d) => d.resolution === "ship_partial").length },
          { label: "Hold / Deferred", value: discrepancies.filter((d) => d.resolution === "hold_replacement" || d.resolution === "emergency_defer").length },
        ].map(({ label, value, warn }) => (
          <div key={label} className="workspace-panel p-4">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-2xl font-bold tabular-nums ${warn ? "text-amber-600" : "text-foreground"}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Main panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* List */}
        <div className="lg:col-span-7 workspace-panel">
          <div className="workspace-panel-heading">
            <div>
              <h2>Exception log</h2>
              <span>Pre-departure staging issues.</span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="dispatch-search text-xs py-1.5 px-2 rounded"
              >
                <option value="all">All types</option>
                <option value="missing">Missing</option>
                <option value="damaged">Damaged</option>
                <option value="temperature_breach">Temp. breach</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="dispatch-search text-xs py-1.5 px-2 rounded"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-16 text-center">
              <CheckCircle size={32} className="mx-auto text-emerald-500 mb-3 opacity-70" />
              <p className="text-sm font-medium text-foreground">No exceptions found</p>
              <p className="text-xs text-muted-foreground mt-1">No records match the selected filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((item) => {
                const isSelected = selectedRecord?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`px-5 py-3.5 cursor-pointer transition ${
                      isSelected ? "bg-secondary/60 border-l-4 border-l-primary" : "hover:bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          item.type === "missing"
                            ? "bg-amber-100 text-amber-800"
                            : item.type === "damaged"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                        }`}>
                          {TYPE_LABELS[item.type]}
                        </span>
                        <span className="text-sm font-semibold text-foreground">{item.outlet}</span>
                      </div>
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                        item.resolution === "pending"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : item.resolution === "ship_partial"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-muted text-muted-foreground"
                      }`}>
                        {RESOLUTION_LABELS[item.resolution]}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.quantity}× {item.itemDescription} · Impact: -{item.kgImpact} kg / -{item.m3Impact} m³ · {item.tripId}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Logged {item.timestamp} · {item.reportedBy}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inspector */}
        <div className="lg:col-span-5 workspace-panel">
          <div className="workspace-panel-heading">
            <h2>Resolution</h2>
            {selectedRecord && <span className="text-xs text-muted-foreground">{selectedRecord.id}</span>}
          </div>

          {selectedRecord ? (
            <div className="p-5 space-y-5">
              {/* Summary */}
              <div className="p-3.5 bg-muted/40 rounded-lg border text-xs space-y-2">
                {[
                  ["Outlet", selectedRecord.outlet],
                  ["Order / Trip", `${selectedRecord.orderId} · ${selectedRecord.tripId} (${selectedRecord.vehicleId})`],
                  ["Type", TYPE_LABELS[selectedRecord.type]],
                  ["Items", `${selectedRecord.quantity}× ${selectedRecord.itemDescription}`],
                  ["Payload impact", `-${selectedRecord.kgImpact} kg / -${selectedRecord.m3Impact} m³`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <span className="text-muted-foreground shrink-0">{label}</span>
                    <span className="text-right font-medium">{value}</span>
                  </div>
                ))}
                {selectedRecord.notes && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground block mb-0.5">Notes</span>
                    <p className="italic">"{selectedRecord.notes}"</p>
                  </div>
                )}
              </div>

              {/* Resolution options */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Resolution
                </p>
                <div className="space-y-2">
                  {(
                    [
                      {
                        key: "ship_partial" as DiscrepancyResolution,
                        title: "Ship partial",
                        desc: "Adjust manifest with short quantity. Vehicle departs with reduced load.",
                      },
                      {
                        key: "hold_replacement" as DiscrepancyResolution,
                        title: "Hold for replacement",
                        desc: "Delay departure while replacement stock is retrieved from warehouse.",
                      },
                      {
                        key: "emergency_defer" as DiscrepancyResolution,
                        title: "Defer order",
                        desc: "Remove this stop from the trip. Remaining stops are re-sequenced.",
                      },
                    ] as const
                  ).map(({ key, title, desc }) => (
                    <button
                      key={key}
                      type="button"
                      className={`w-full text-left p-3 rounded-lg border text-xs transition flex items-start justify-between gap-2 ${
                        selectedRecord.resolution === key
                          ? "bg-secondary border-primary/50"
                          : "hover:bg-muted/30"
                      }`}
                      onClick={() =>
                        onUpdateResolution(selectedRecord.id, key, `${title} — authorized by planning desk.`)
                      }
                    >
                      <div>
                        <div className="font-semibold text-foreground mb-0.5">{title}</div>
                        <div className="text-muted-foreground">{desc}</div>
                      </div>
                      {selectedRecord.resolution === key && (
                        <CheckCircle2 size={16} className="text-primary flex-shrink-0 mt-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-destructive"
                  onClick={() => onResolve(selectedRecord.id)}
                >
                  Dismiss record
                </Button>
                <span className="text-xs text-muted-foreground">
                  {RESOLUTION_LABELS[selectedRecord.resolution]}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Select an exception to view details and choose a resolution.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
