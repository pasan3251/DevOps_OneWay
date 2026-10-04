"use client";

import { useState } from "react";
import {
  List,
  Map as MapIcon,
  Clock,
  Package,
  Weight,
  Layers,
  ChevronRight,
  Info,
  MapPin,
  ExternalLink,
} from "lucide-react";
import type { DriverRouteData } from "../driver-types";
import { formatMinutesToTime } from "../driver-data";

interface DriverRouteViewProps {
  route: DriverRouteData;
  onOpenStop: (stopId: string) => void;
}

export function DriverRouteView({ route, onOpenStop }: DriverRouteViewProps) {
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [showLifoInfo, setShowLifoInfo] = useState(false);

  const totalKg = route.stops.reduce((sum, s) => sum + s.totalKg, 0);
  const totalM3 = route.stops.reduce((sum, s) => sum + s.totalM3, 0);
  const weightPercent = Math.min(
    100,
    Math.round((totalKg / route.vehicle.weightCapacityKg) * 100),
  );
  const volumePercent = Math.min(
    100,
    Math.round((totalM3 / route.vehicle.volumeCapacityM3) * 100),
  );

  return (
    <div className="driver-main-content">
      {/* Route Header & View Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Route Manifest · {route.brand}
          </span>
          <h1 className="text-xl font-bold text-foreground">
            {route.tripId} ({route.district})
          </h1>
        </div>

        {/* View Mode Toggle */}
        <div className="flex p-0.5 rounded-lg bg-muted border border-border">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
              viewMode === "list"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Timeline List View"
          >
            <List size={15} />
            <span>List</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
              viewMode === "map"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Route Map View"
          >
            <MapIcon size={15} />
            <span>Map</span>
          </button>
        </div>
      </div>

      {/* Vehicle Payload & Capacity Progress Bars */}
      <div className="driver-card p-3">
        <div className="flex items-center justify-between text-xs font-semibold text-foreground mb-2">
          <span className="flex items-center gap-1.5">
            <Layers size={14} className="text-primary" />
            Vehicle Payload ({route.vehicle.id})
          </span>
          <span className="text-muted-foreground font-mono text-[11px]">
            {route.vehicle.type} · {route.vehicle.chilled ? "Reefer" : "Ambient"}
          </span>
        </div>

        <div className="space-y-2">
          {/* Weight Bar */}
          <div>
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>Weight: {totalKg} kg / {route.vehicle.weightCapacityKg} kg</span>
              <span className="font-mono font-bold">{weightPercent}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-primary"
                style={{ width: `${weightPercent}%` }}
              />
            </div>
          </div>

          {/* Volume Bar */}
          <div>
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>Volume: {totalM3.toFixed(1)} m³ / {route.vehicle.volumeCapacityM3.toFixed(1)} m³</span>
              <span className="font-mono font-bold">{volumePercent}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-primary"
                style={{ width: `${volumePercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* LIFO Staging Visual Guide */}
      <div className="driver-card bg-muted/30 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Layers size={14} className="text-primary" />
            LIFO Reverse Loading Sequence
          </span>
          <button
            type="button"
            onClick={() => setShowLifoInfo(!showLifoInfo)}
            className="text-[11px] text-primary flex items-center gap-0.5 hover:underline"
          >
            <Info size={12} />
            <span>Why LIFO?</span>
          </button>
        </div>

        {showLifoInfo && (
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
            Last-In, First-Out (LIFO) ensures that Stop 1 goods were packed adjacent to the rear loading doors, preventing the need to reshuffle heavy cargo at curbside stops.
          </p>
        )}

        <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] mt-2">
          <div className="p-1.5 rounded border border-border bg-secondary text-foreground">
            <span className="font-bold block">Rear Doors</span>
            <span>Stop 1 (First Out)</span>
          </div>
          <div className="p-1.5 rounded border border-border bg-card text-foreground">
            <span className="font-bold block">Mid Bay</span>
            <span>Stop 2</span>
          </div>
          <div className="p-1.5 rounded border border-border bg-card text-foreground">
            <span className="font-bold block">Front Bulkhead</span>
            <span>Stop 3 (Last Out)</span>
          </div>
        </div>
      </div>

      {/* VIEW MODE: LIST TIMELINE */}
      {viewMode === "list" && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Stop Sequence Timeline ({route.stops.length} Stops)
          </h2>

          <div className="space-y-2">
            {route.stops.map((stop) => {
              const isCompleted =
                stop.status === "delivered" || stop.status === "partial";
              const isCurrent =
                stop.status === "en_route" ||
                stop.status === "arrived" ||
                stop.status === "waiting_window";
              const isException = stop.status === "exception";

              return (
                <div
                  key={stop.id}
                  onClick={() => onOpenStop(stop.id)}
                  className={`driver-card cursor-pointer hover:border-primary transition-colors ${
                    isCurrent
                      ? "ring-2 ring-primary/40 border-primary"
                      : isCompleted
                        ? "opacity-80 bg-card/60"
                        : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                          isCompleted
                            ? "bg-primary text-primary-foreground"
                            : isCurrent
                              ? "bg-primary text-primary-foreground"
                              : isException
                                ? "bg-destructive text-primary-foreground"
                                : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {stop.sequence}
                      </div>

                      <div>
                        <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          {stop.outlet}
                          {stop.orders.length > 1 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-normal">
                              Dual Order
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin size={11} className="shrink-0" />
                          <span className="line-clamp-1">{stop.address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`status-chip ${stop.status}`}>
                        {stop.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Window & Cargo Pill Line */}
                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-border/60 text-muted-foreground">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock size={12} className="text-muted-foreground" />
                      {formatMinutesToTime(stop.effectiveWindow[0])} –{" "}
                      {formatMinutesToTime(stop.effectiveWindow[1])}
                    </span>

                    <span className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Package size={12} />
                        {stop.totalCartons} ctns
                      </span>
                      <span className="flex items-center gap-1">
                        <Weight size={12} />
                        {stop.totalKg} kg
                      </span>
                      <ChevronRight size={14} className="text-muted-foreground/60" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE: INTERACTIVE ROUTE MAP */}
      {viewMode === "map" && (
        <div className="driver-card p-0 overflow-hidden">
          <div className="p-3 border-b border-border bg-card flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              {route.district} Route Navigation Corridor
            </span>
            <span className="text-[11px] text-muted-foreground">
              {route.stops.length} Stops Mapped
            </span>
          </div>

          {/* Interactive Visual Map Card */}
          <div className="relative h-64 bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
            {/* SVG Interactive Map Diagram */}
            <svg
              viewBox="0 0 400 240"
              className="w-full h-full"
              style={{ maxHeight: "240px" }}
            >
              <defs>
                <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#15576C" />
                  <stop offset="100%" stopColor="#089B8C" />
                </linearGradient>
              </defs>

              {/* Waterway / Coastline decoration */}
              <path
                d="M 20 0 Q 30 120 15 240 L 0 240 L 0 0 Z"
                fill="#0b222d"
                opacity="0.6"
              />

              {/* Connecting Route Waypoints Path */}
              <path
                d="M 60 40 L 140 85 L 230 135 L 320 190"
                stroke="url(#routeGradient)"
                strokeWidth="4"
                strokeDasharray="6 4"
                fill="none"
              />

              {/* Depot Pin (Peliyagoda) */}
              <circle cx="60" cy="40" r="14" fill="#15576C" stroke="#ffffff" strokeWidth="2" />
              <text x="60" y="44" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">
                DC
              </text>
              <text x="60" y="20" fill="#93E2D8" fontSize="10" fontWeight="bold" textAnchor="middle">
                Peliyagoda DC
              </text>

              {/* Stop 1 (Borella) */}
              <circle
                cx="140"
                cy="85"
                r="12"
                fill={route.stops[0]?.status === "delivered" ? "#089B8C" : "#FFB703"}
                stroke="#ffffff"
                strokeWidth="2"
                className="cursor-pointer"
              />
              <text x="140" y="89" fill="#082A25" fontSize="10" fontWeight="bold" textAnchor="middle">
                1
              </text>
              <text x="140" y="112" fill="#F3F7F6" fontSize="9" textAnchor="middle">
                Borella (05:15)
              </text>

              {/* Stop 2 (Nugegoda) */}
              <circle
                cx="230"
                cy="135"
                r="12"
                fill={route.stops[1]?.status === "delivered" ? "#089B8C" : "#15576C"}
                stroke="#ffffff"
                strokeWidth="2"
                className="cursor-pointer"
              />
              <text x="230" y="139" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">
                2
              </text>
              <text x="230" y="162" fill="#F3F7F6" fontSize="9" textAnchor="middle">
                Nugegoda (06:05)
              </text>

              {/* Stop 3 (Wellawatte) */}
              <circle
                cx="320"
                cy="190"
                r="12"
                fill={route.stops[2]?.status === "delivered" ? "#089B8C" : "#15576C"}
                stroke="#ffffff"
                strokeWidth="2"
                className="cursor-pointer"
              />
              <text x="320" y="194" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">
                3
              </text>
              <text x="320" y="217" fill="#F3F7F6" fontSize="9" textAnchor="middle">
                Wellawatte (07:00)
              </text>
            </svg>

            <div className="absolute bottom-2 left-2 text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded">
              Route distance: ~28.5 km · Colombo District
            </div>
          </div>

          <div className="p-3 bg-muted/40 text-center">
            <span className="text-xs text-muted-foreground block mb-2">
              Select any stop above to view delivery details or launch turn-by-turn directions.
            </span>
            <div className="flex gap-2">
              {route.stops.map((stop) => (
                <button
                  key={stop.id}
                  onClick={() => onOpenStop(stop.id)}
                  className="flex-1 py-1.5 px-2 rounded border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted"
                >
                  Stop {stop.sequence}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
