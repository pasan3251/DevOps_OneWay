"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatTime,
  orders,
  totals,
  vehicles,
  type Depot,
  type Plan,
} from "@/features/dispatcher/planning";
import type { ClearanceRecord, DiscrepancyRecord } from "./loader-manifest";

export function LoaderOverview({
  plan,
  depot,
  discrepancies,
  clearedTrips,
  onSelectTrip,
}: {
  plan: Plan;
  depot: Depot;
  discrepancies: DiscrepancyRecord[];
  clearedTrips: Record<string, ClearanceRecord>;
  onSelectTrip: (tripId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "cleared" | "exception">("all");

  const depotTrips = plan.trips.filter((t) => t.depot === depot);

  const filteredTrips = depotTrips.filter((trip) => {
    const hasException = discrepancies.some((d) => d.tripId === trip.id);
    const isCleared = !!clearedTrips[trip.id];

    const matchesSearch =
      trip.id.toLowerCase().includes(query.toLowerCase()) ||
      trip.vehicleId.toLowerCase().includes(query.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "cleared" && isCleared) ||
      (statusFilter === "exception" && hasException && !isCleared) ||
      (statusFilter === "pending" && !isCleared && !hasException);

    return matchesSearch && matchesStatus;
  });

  const clearedCount = depotTrips.filter((t) => !!clearedTrips[t.id]).length;
  const exceptionCount = depotTrips.filter(
    (t) => discrepancies.some((d) => d.tripId === t.id) && !clearedTrips[t.id]
  ).length;
  const pendingCount = depotTrips.length - clearedCount - exceptionCount;

  return (
    <div className="space-y-5">
      {/* Summary stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total vehicles", value: depotTrips.length },
          { label: "Staging", value: pendingCount },
          { label: "Exceptions", value: exceptionCount, warn: exceptionCount > 0 },
          { label: "Cleared", value: clearedCount, ok: clearedCount > 0 },
        ].map(({ label, value, warn, ok }) => (
          <div key={label} className="workspace-panel p-4">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-2xl font-bold tabular-nums ${warn ? "text-amber-600" : ok ? "text-emerald-600" : "text-foreground"}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Vehicle queue table */}
      <div className="workspace-panel">
        <div className="workspace-panel-heading">
          <div>
            <h2>Vehicle staging queue</h2>
            <span>Select a vehicle to open the loading checklist.</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Search trip or vehicle…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="dispatch-search pl-8 pr-3 py-1.5 text-xs rounded-md"
              />
            </div>

            <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md border text-xs">
              {(["all", "pending", "exception", "cleared"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`px-2.5 py-1 rounded font-medium transition capitalize ${
                    statusFilter === s
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "all" ? "All" : s === "pending" ? "Staging" : s === "exception" ? "Exception" : "Cleared"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredTrips.length === 0 ? (
          <div className="p-16 text-center text-sm text-muted-foreground">
            No vehicles match the selected filter.
          </div>
        ) : (
          <div className="workspace-table">
            <table>
              <thead>
                <tr>
                  <th>Trip</th>
                  <th>Vehicle</th>
                  <th>Departure</th>
                  <th>Stops</th>
                  <th>Payload</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filteredTrips.map((trip) => {
                  const vehicle = vehicles.find((v) => v.id === trip.vehicleId);
                  const loadTotals = totals(trip);
                  const tripExceptions = discrepancies.filter((d) => d.tripId === trip.id);
                  const isCleared = !!clearedTrips[trip.id];
                  const clearanceData = clearedTrips[trip.id];
                  const hasException = tripExceptions.length > 0 && !isCleared;

                  return (
                    <tr key={trip.id}>
                      <td className="font-mono font-semibold text-foreground">{trip.id}</td>
                      <td>
                        <span className="font-semibold">{trip.vehicleId}</span>
                        {vehicle?.chilled && (
                          <span className="ml-1.5 text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-medium">
                            Reefer
                          </span>
                        )}
                        <span className="block text-xs text-muted-foreground">{vehicle?.type}</span>
                      </td>
                      <td className="tabular-nums">{formatTime(trip.departure)}</td>
                      <td className="tabular-nums">{trip.orderIds.length}</td>
                      <td className="tabular-nums text-xs">
                        {isCleared
                          ? `${clearanceData.finalKg} kg / ${clearanceData.finalM3} m³`
                          : `${loadTotals.kg} kg / ${loadTotals.m3} m³`}
                      </td>
                      <td>
                        {isCleared ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={11} /> Cleared
                          </span>
                        ) : hasException ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={11} /> Exception
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            Staging
                          </span>
                        )}
                      </td>
                      <td className="text-right">
                        <Button
                          size="sm"
                          variant={isCleared ? "outline" : "default"}
                          className="text-xs gap-1"
                          onClick={() => onSelectTrip(trip.id)}
                        >
                          {isCleared ? "View manifest" : "Open checklist"}
                          <ArrowRight size={13} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
