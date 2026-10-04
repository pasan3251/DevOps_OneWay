"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Calendar,
  Clock,
  RefreshCw,
  WifiOff,
  Wifi,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { CompletedTripSummary, OfflineSyncItem } from "../driver-types";
import { Button } from "@/components/ui/button";

interface DriverHistoryViewProps {
  history: CompletedTripSummary[];
  syncQueue: OfflineSyncItem[];
  effectiveOnline: boolean;
  isSyncing: boolean;
  onTriggerSync: () => void;
}

export function DriverHistoryView({
  history,
  syncQueue,
  effectiveOnline,
  isSyncing,
  onTriggerSync,
}: DriverHistoryViewProps) {
  const [activeTab, setActiveTab] = useState<"trips" | "sync">("trips");
  const [expandedTrip, setExpandedTrip] = useState<string | null>(
    history[0]?.tripId || null,
  );

  const unsyncedCount = syncQueue.filter((i) => !i.synced).length;

  return (
    <div className="driver-main-content">
      {/* Header & Section Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Field records
          </span>
          <h1 className="text-xl font-bold text-foreground">Trips and sync</h1>
        </div>

        <div className="flex p-0.5 rounded-lg bg-muted border border-border">
          <button
            type="button"
            onClick={() => setActiveTab("trips")}
            className={`py-1.5 px-3 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "trips"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Trips ({history.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sync")}
            className={`py-1.5 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === "sync"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Field sync</span>
            {unsyncedCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                {unsyncedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: COMPLETED TRIPS */}
      {activeTab === "trips" && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Logged Route Executions
          </h2>

          <div className="space-y-2">
            {history.map((trip) => {
              const isExpanded = expandedTrip === trip.tripId;

              return (
                <div
                  key={trip.tripId}
                  className="driver-card p-3 transition-colors border border-border"
                >
                  <div
                    onClick={() =>
                      setExpandedTrip(isExpanded ? null : trip.tripId)
                    }
                    className="flex items-start justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {trip.tripId}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-semibold">
                          {trip.brand} · {trip.district}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {trip.date}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {trip.completedAt}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-foreground">
                        {trip.deliveredCount}/{trip.stopsCount} Delivered
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={16} className="text-muted-foreground" />
                      ) : (
                        <ChevronDown size={16} className="text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Breakdown */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">
                          Assigned Vehicle
                        </span>
                        <span className="font-bold text-foreground">
                          {trip.vehicleId}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">
                          Total Duration
                        </span>
                        <span className="font-bold text-foreground font-mono">
                          {trip.durationMinutes} minutes
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">
                          Cargo Volume
                        </span>
                        <span className="font-bold text-foreground">
                          {trip.totalCartons} Cartons ({trip.totalKg} kg)
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">
                          Discrepancies
                        </span>
                        <span
                          className={`font-bold ${
                            trip.exceptionCount > 0
                              ? "text-destructive"
                              : "text-foreground"
                          }`}
                        >
                          {trip.exceptionCount} recorded
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: OFFLINE SYNC RECONCILIATION QUEUE */}
      {activeTab === "sync" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Offline Mutation Queue ({syncQueue.length} Events)
            </h2>

            <Button
              size="sm"
              disabled={!effectiveOnline || isSyncing || unsyncedCount === 0}
              onClick={onTriggerSync}
              className="text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5"
            >
              <RefreshCw
                size={12}
                className={isSyncing ? "animate-spin" : ""}
              />
              <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
            </Button>
          </div>

          <div className="p-2.5 rounded-lg bg-muted/60 border border-border text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
            {effectiveOnline ? (
              <Wifi size={15} className="text-foreground shrink-0 mt-0.5" />
            ) : (
              <WifiOff size={15} className="text-muted-foreground shrink-0 mt-0.5" />
            )}
            <span>
              {effectiveOnline
                ? "Connected to Peliyagoda central telematics server. Offline events synchronize automatically in chronological order."
                : "Offline mode active. All stop timestamps, POD signatures, and exceptions are stored safely on this device."}
            </span>
          </div>

          <div className="space-y-2">
            {syncQueue.map((item) => (
              <div
                key={item.id}
                className="driver-card p-3 border border-border flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-foreground">
                      {item.description}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {item.id} · {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="shrink-0 text-right">
                  {item.synced ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
                      <CheckCircle2 size={12} />
                      Synced
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border animate-pulse">
                      <RefreshCw size={12} />
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
