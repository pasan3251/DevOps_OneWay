"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  PackageX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DiscrepancyRecord, DiscrepancyResolution } from "./loader-manifest";

const TYPE_LABELS: Record<DiscrepancyRecord["type"], string> = {
  missing: "Missing inventory",
  damaged: "Damaged packaging",
  temperature_breach: "Temperature breach",
};

const RESOLUTION_COPY: Record<
  DiscrepancyResolution,
  { label: string; instruction: string; blocking: boolean }
> = {
  pending: {
    label: "Waiting on Dispatch",
    instruction: "Keep this trip on hold. Dispatch must choose whether to ship partial, replace stock, or defer the order.",
    blocking: true,
  },
  ship_partial: {
    label: "Ship partial",
    instruction: "Proceed with the reduced manifest. Re-check the affected stop and the revised payload before clearance.",
    blocking: false,
  },
  hold_replacement: {
    label: "Hold for replacement",
    instruction: "Do not clear the vehicle. Wait for replacement stock and a refreshed dispatch instruction.",
    blocking: true,
  },
  emergency_defer: {
    label: "Manifest update required",
    instruction: "Do not clear the vehicle until the deferred stop is removed, the LIFO sequence is updated, and changed stops are re-verified.",
    blocking: true,
  },
};

export function LoaderDiscrepancies({
  discrepancies,
  onOpenTrip,
}: {
  discrepancies: DiscrepancyRecord[];
  onOpenTrip: (tripId: string) => void;
}) {
  const [filterType, setFilterType] = useState<"all" | DiscrepancyRecord["type"]>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "waiting" | "instruction">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = discrepancies.filter((record) => {
    const matchesType = filterType === "all" || record.type === filterType;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "waiting" && record.resolution === "pending") ||
      (filterStatus === "instruction" && record.resolution !== "pending");
    return matchesType && matchesStatus;
  });

  const selectedRecord =
    discrepancies.find((record) => record.id === selectedId) ?? filtered[0] ?? null;
  const waitingCount = discrepancies.filter((record) => record.resolution === "pending").length;
  const instructionCount = discrepancies.length - waitingCount;
  const blockingCount = discrepancies.filter(
    (record) => RESOLUTION_COPY[record.resolution].blocking
  ).length;

  return (
    <div className="loader-page-stack">
      <section className="loader-summary-strip" aria-label="Exception summary">
        {[
          { label: "Exception records", value: discrepancies.length },
          { label: "Waiting on Dispatch", value: waitingCount },
          { label: "Instructions received", value: instructionCount },
          { label: "Blocking departure", value: blockingCount },
        ].map((item) => (
          <article className="loader-stat-card" key={item.label}>
            <span className="loader-stat-body">
              <span className="loader-stat-label">{item.label}</span>
              <strong className="loader-stat-value">{item.value}</strong>
            </span>
          </article>
        ))}
      </section>

      <section className="loader-exception-layout">
        <div className="workspace-panel loader-exception-list">
          <div className="workspace-panel-heading loader-exception-heading">
            <div>
              <h2>Exception history</h2>
              <span>Loader reports and dispatcher instructions for this depot.</span>
            </div>
            <div className="loader-filter-row">
              <label>
                <span className="sr-only">Filter by exception type</span>
                <select
                  value={filterType}
                  onChange={(event) =>
                    setFilterType(event.target.value as "all" | DiscrepancyRecord["type"])
                  }
                >
                  <option value="all">All issue types</option>
                  <option value="missing">Missing inventory</option>
                  <option value="damaged">Damaged packaging</option>
                  <option value="temperature_breach">Temperature breach</option>
                </select>
              </label>
              <label>
                <span className="sr-only">Filter by instruction status</span>
                <select
                  value={filterStatus}
                  onChange={(event) =>
                    setFilterStatus(event.target.value as "all" | "waiting" | "instruction")
                  }
                >
                  <option value="all">All instruction states</option>
                  <option value="waiting">Waiting on Dispatch</option>
                  <option value="instruction">Instruction received</option>
                </select>
              </label>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="loader-empty-state">
              <CheckCircle2 size={30} aria-hidden="true" />
              <strong>No exception records</strong>
              <span>No reports match the selected filters.</span>
            </div>
          ) : (
            <div className="loader-exception-rows">
              {filtered.map((record) => {
                const selected = selectedRecord?.id === record.id;
                const resolution = RESOLUTION_COPY[record.resolution];
                return (
                  <button
                    type="button"
                    key={record.id}
                    aria-pressed={selected}
                    className="loader-exception-row"
                    onClick={() => setSelectedId(record.id)}
                  >
                    <span className="loader-exception-row-top">
                      <span>
                        <b>{TYPE_LABELS[record.type]}</b>
                        <small>{record.id}</small>
                      </span>
                      <em data-blocking={resolution.blocking}>{resolution.label}</em>
                    </span>
                    <strong>{record.outlet}</strong>
                    <span>{record.quantity} × {record.itemDescription}</span>
                    <small>{record.tripId} · {record.vehicleId} · Logged {record.timestamp}</small>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="workspace-panel loader-exception-detail" aria-label="Selected exception">
          <div className="workspace-panel-heading">
            <div>
              <h2>Dispatch instruction</h2>
              <span>{selectedRecord?.id ?? "Select a record"}</span>
            </div>
          </div>

          {selectedRecord ? (
            <div className="loader-exception-detail-body">
              <div className="loader-exception-title">
                <span className="loader-status-icon" aria-hidden="true">
                  {selectedRecord.resolution === "pending" ? <Clock3 size={20} /> : <PackageX size={20} />}
                </span>
                <div>
                  <span className="loader-eyebrow">{TYPE_LABELS[selectedRecord.type]}</span>
                  <h3>{selectedRecord.outlet}</h3>
                </div>
              </div>

              <dl className="loader-detail-list">
                <div><dt>Order / trip</dt><dd>{selectedRecord.orderId} · {selectedRecord.tripId}</dd></div>
                <div><dt>Vehicle</dt><dd>{selectedRecord.vehicleId}</dd></div>
                <div><dt>Quantity</dt><dd>{selectedRecord.quantity} × {selectedRecord.itemDescription}</dd></div>
                <div><dt>Payload change</dt><dd>−{selectedRecord.kgImpact} kg · −{selectedRecord.m3Impact} m³</dd></div>
                <div><dt>Reported by</dt><dd>{selectedRecord.reportedBy}</dd></div>
              </dl>

              {selectedRecord.notes && (
                <div className="loader-note">
                  <span>Loader note</span>
                  <p>{selectedRecord.notes}</p>
                </div>
              )}

              <div
                className="loader-dispatch-instruction"
                data-blocking={RESOLUTION_COPY[selectedRecord.resolution].blocking}
              >
                <span>
                  {RESOLUTION_COPY[selectedRecord.resolution].blocking ? (
                    <AlertTriangle size={17} aria-hidden="true" />
                  ) : (
                    <CheckCircle2 size={17} aria-hidden="true" />
                  )}
                  {RESOLUTION_COPY[selectedRecord.resolution].label}
                </span>
                <p>{selectedRecord.resolutionNotes || RESOLUTION_COPY[selectedRecord.resolution].instruction}</p>
                {selectedRecord.resolvedAt && <small>Instruction received at {selectedRecord.resolvedAt}</small>}
              </div>

              <p className="loader-role-note">
                Only Dispatch can choose the resolution. The loader reports the physical issue, follows the instruction, and re-verifies the affected stop.
              </p>

              <Button onClick={() => onOpenTrip(selectedRecord.tripId)}>
                Open loading checklist
                <ArrowRight size={15} aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <div className="loader-empty-state">
              <PackageX size={30} aria-hidden="true" />
              <strong>Select an exception</strong>
              <span>The corresponding dispatch instruction will appear here.</span>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
