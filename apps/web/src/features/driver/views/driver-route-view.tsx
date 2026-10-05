"use client";

import { useState } from "react";
import {
  Check,
  ChevronRight,
  Clock,
  List,
  Map as MapIcon,
  MapPin,
  Package,
  RotateCcw,
  Thermometer,
} from "lucide-react";
import type { DriverRouteData, StopItem } from "../driver-types";
import { formatMinutesToTime } from "../driver-data";
import { DriverRouteMap } from "../components/driver-route-map";

interface DriverRouteViewProps {
  route: DriverRouteData;
  activeStop?: StopItem;
  onOpenStop: (stopId: string) => void;
}

const terminalStatuses = new Set(["delivered", "partial", "exception"]);

function statusLabel(status: StopItem["status"]) {
  const labels: Record<StopItem["status"], string> = {
    scheduled: "Upcoming",
    en_route: "Next stop",
    arrived: "At outlet",
    waiting_window: "Waiting",
    unloading: "Handover",
    delivered: "Delivered",
    partial: "Partial",
    exception: "Exception",
  };
  return labels[status];
}

export function DriverRouteView({
  route,
  activeStop,
  onOpenStop,
}: DriverRouteViewProps) {
  const [viewMode, setViewMode] = useState<"map" | "stops">("map");
  const completed = route.stops.filter((stop) =>
    terminalStatuses.has(stop.status),
  ).length;
  const remainingCartons = route.stops
    .filter((stop) => !terminalStatuses.has(stop.status))
    .reduce((sum, stop) => sum + stop.totalCartons, 0);

  return (
    <main className="driver-main-content">
      <section className="driver-section-heading">
        <div>
          <span className="driver-eyebrow">Published route · Trip {route.tripNumber}</span>
          <h1>{route.district} delivery run</h1>
          <p>
            {route.tripId} · {route.depot} depot · {route.routeDistanceKm.toFixed(1)} km outbound
          </p>
        </div>
        <div className="driver-segmented" aria-label="Route view">
          <button
            type="button"
            className={viewMode === "map" ? "is-active" : ""}
            onClick={() => setViewMode("map")}
          >
            <MapIcon size={15} /> Map
          </button>
          <button
            type="button"
            className={viewMode === "stops" ? "is-active" : ""}
            onClick={() => setViewMode("stops")}
          >
            <List size={15} /> Stops
          </button>
        </div>
      </section>

      <section className="driver-run-strip" aria-label="Route summary">
        <div>
          <span>Progress</span>
          <strong>{completed}/{route.stops.length} stops</strong>
        </div>
        <div>
          <span>Cargo remaining</span>
          <strong>{remainingCartons} cartons</strong>
        </div>
        <div>
          <span>Vehicle</span>
          <strong>{route.vehicle.id}</strong>
        </div>
        {route.vehicle.chilled && (
          <div>
            <span>Reefer</span>
            <strong><Thermometer size={13} /> {route.vehicle.reeferTemperatureC === null ? "Gauge check" : `${route.vehicle.reeferTemperatureC.toFixed(1)}°C`}</strong>
          </div>
        )}
      </section>

      {route.shiftStatus === "returning" && (
        <section className="driver-callout" role="status">
          <RotateCcw size={18} />
          <div>
            <strong>Return leg active</strong>
            <span>
              Return to {route.depot} depot before this trip can close or Trip 2 can be released.
            </span>
          </div>
        </section>
      )}

      {viewMode === "map" && (
        <>
          <DriverRouteMap
            route={route}
            activeStopId={activeStop?.id}
            onOpenStop={onOpenStop}
          />
          <p className="driver-map-caption">
            Pins show the dispatcher-published stop order. Use turn-by-turn navigation only for the current stop.
          </p>
        </>
      )}

      <section className={viewMode === "map" ? "driver-stop-list compact" : "driver-stop-list"}>
        <div className="driver-list-heading">
          <div>
            <span className="driver-eyebrow">Locked stop sequence</span>
            <h2>{route.stops.length} delivery stops</h2>
          </div>
          <span>Dispatcher changes appear after sync</span>
        </div>

        {route.stops.map((stop) => {
          const isActive = stop.id === activeStop?.id;
          const isComplete = terminalStatuses.has(stop.status);
          return (
            <button
              key={stop.id}
              type="button"
              onClick={() => onOpenStop(stop.id)}
              className={`driver-stop-row ${isActive ? "is-active" : ""} ${isComplete ? "is-complete" : ""}`}
            >
              <span className="driver-stop-sequence">
                {isComplete ? <Check size={15} /> : stop.sequence}
              </span>
              <span className="driver-stop-copy">
                <strong>{stop.outlet}</strong>
                <span><MapPin size={12} /> {stop.address}</span>
                <span>
                  <Clock size={12} /> {formatMinutesToTime(stop.effectiveWindow[0])}–{formatMinutesToTime(stop.effectiveWindow[1])}
                  <Package size={12} /> {stop.totalCartons} cartons
                </span>
              </span>
              <span className="driver-stop-state">
                <span className={`status-chip ${stop.status}`}>{statusLabel(stop.status)}</span>
                {isActive && stop.status === "en_route" && (
                  <span className="driver-route-hint">Tap for navigation</span>
                )}
              </span>
              <ChevronRight size={17} className="driver-stop-chevron" />
            </button>
          );
        })}
      </section>
    </main>
  );
}
