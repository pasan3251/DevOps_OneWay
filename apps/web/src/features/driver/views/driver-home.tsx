"use client";

import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Package,
  RotateCcw,
  ShieldCheck,
  Thermometer,
  Truck,
  WifiOff,
} from "lucide-react";
import type { DriverRouteData, StopItem } from "../driver-types";
import { formatMinutesDuration, formatMinutesToTime } from "../driver-data";
import { Button } from "@/components/ui/button";

interface DriverHomeProps {
  route: DriverRouteData;
  activeStop?: StopItem;
  completedCount: number;
  unsyncedCount: number;
  onStartRoute: () => void;
  onOpenStop: (stopId: string) => void;
  onOpenPreTrip: () => void;
  onOpenDelay: () => void;
  onCompleteRoute: () => void;
}

const terminalStatuses = new Set(["delivered", "partial", "exception"]);

export function DriverHome({
  route,
  activeStop,
  completedCount,
  unsyncedCount,
  onStartRoute,
  onOpenStop,
  onOpenPreTrip,
  onOpenDelay,
  onCompleteRoute,
}: DriverHomeProps) {
  const progress = Math.round(
    (completedCount / Math.max(route.stops.length, 1)) * 100,
  );
  const remainingCartons = route.stops
    .filter((stop) => !terminalStatuses.has(stop.status))
    .reduce((sum, stop) => sum + stop.totalCartons, 0);
  const canDepart = route.loaderClearance.cleared && route.preTripCompleted;
  const isReturning = route.shiftStatus === "returning";
  const isComplete = route.shiftStatus === "completed";

  return (
    <main className="driver-main-content driver-home">
      <section className="driver-section-heading">
        <div>
          <span className="driver-eyebrow">Today · Trip {route.tripNumber} of maximum 2</span>
          <h1>{route.brand} · {route.district}</h1>
          <p>{route.tripId} · {route.vehicle.id} · {route.depot} depot</p>
        </div>
        <span className={`driver-shift-state ${route.shiftStatus}`}>
          {route.shiftStatus.replaceAll("_", " ")}
        </span>
      </section>

      {unsyncedCount > 0 && (
        <section className="driver-callout" role="status">
          <WifiOff size={18} />
          <div>
            <strong>{unsyncedCount} field {unsyncedCount === 1 ? "record" : "records"} waiting to sync</strong>
            <span>Delivery work can continue. Records remain stored on this device.</span>
          </div>
        </section>
      )}

      {route.shiftStatus === "assigned" && (
        <section className="driver-card driver-readiness-card">
          <div className="driver-card-heading">
            <div>
              <span className="driver-eyebrow">Departure readiness</span>
              <h2>Manifest and vehicle check</h2>
            </div>
            <ShieldCheck size={20} />
          </div>
          <div className="driver-readiness-row is-complete">
            <span><Check size={14} /></span>
            <div>
              <strong>Loader released the trip</strong>
              <small>{route.loaderClearance.manifestVersion} · {route.loaderClearance.clearedAt}</small>
            </div>
          </div>
          <button
            type="button"
            className={`driver-readiness-row ${route.preTripCompleted ? "is-complete" : "is-pending"}`}
            onClick={onOpenPreTrip}
          >
            <span>{route.preTripCompleted ? <Check size={14} /> : "2"}</span>
            <div>
              <strong>{route.preTripCompleted ? "Driver check completed" : "Complete driver readiness check"}</strong>
              <small>Vehicle, seal, fuel and reefer readiness</small>
            </div>
            {!route.preTripCompleted && <ArrowRight size={16} />}
          </button>
        </section>
      )}

      {route.transitDelayMinutes > 0 && route.delayNotice && (
        <section className="driver-callout is-warning" role="status">
          <AlertTriangle size={18} />
          <div>
            <strong>Delay shared with dispatch · +{route.transitDelayMinutes} min</strong>
            <span>{route.delayNotice.reason}</span>
          </div>
        </section>
      )}

      {!isComplete && !isReturning && activeStop && route.shiftStatus !== "assigned" && (
        <section className="driver-card driver-next-stop">
          <div className="driver-card-heading">
            <div>
              <span className="driver-eyebrow">Next required action · Stop {activeStop.sequence}</span>
              <h2>{activeStop.outlet}</h2>
            </div>
            <span className={`status-chip ${activeStop.status}`}>
              {activeStop.status.replaceAll("_", " ")}
            </span>
          </div>
          <p className="driver-address"><MapPin size={14} /> {activeStop.address}</p>
          <div className="driver-next-metrics">
            <div><Clock size={14} /><span>Window<strong>{formatMinutesToTime(activeStop.effectiveWindow[0])}–{formatMinutesToTime(activeStop.effectiveWindow[1])}</strong></span></div>
            <div><Package size={14} /><span>Handover<strong>{activeStop.totalCartons} cartons</strong></span></div>
            {route.vehicle.chilled && <div><Thermometer size={14} /><span>Reefer<strong>{route.vehicle.reeferTemperatureC === null ? "Check gauge" : `${route.vehicle.reeferTemperatureC.toFixed(1)}°C`}</strong></span></div>}
          </div>
          <div className="driver-action-row">
            {activeStop.status === "en_route" && (
              <a
                className="driver-secondary-action"
                href={`https://www.google.com/maps/dir/?api=1&destination=${activeStop.coordinates.lat},${activeStop.coordinates.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation size={16} /> Navigate
              </a>
            )}
            <Button onClick={() => onOpenStop(activeStop.id)} className="driver-primary-action">
              {activeStop.status === "en_route" ? "Open stop" : "Continue handover"}
              <ArrowRight size={16} />
            </Button>
          </div>
        </section>
      )}

      {isReturning && (
        <section className="driver-card driver-return-card">
          <div className="driver-return-icon"><RotateCcw size={24} /></div>
          <span className="driver-eyebrow">All stops resolved</span>
          <h2>Return to {route.depot} depot</h2>
          <p>
            The return journey is part of the trip time budget. Confirm arrival only after the vehicle reaches the depot gate.
          </p>
          <div className="driver-action-row">
            <a
              className="driver-secondary-action"
              href={`https://www.google.com/maps/dir/?api=1&destination=${route.depotCoordinates.lat},${route.depotCoordinates.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              <Navigation size={16} /> Navigate to depot
            </a>
            <Button onClick={onCompleteRoute} className="driver-primary-action">
              Confirm depot arrival
            </Button>
          </div>
        </section>
      )}

      {isComplete && (
        <section className="driver-card driver-complete-card">
          <CheckCircle2 size={30} />
          <span className="driver-eyebrow">Trip reconciled</span>
          <h2>{route.tripId} is complete</h2>
          <p>{completedCount} stops resolved and the vehicle returned to {route.depot}.</p>
          {route.nextTrip && (
            <div className="driver-next-trip">
              <span>Next assignment</span>
              <strong>{route.nextTrip.tripId} · {route.nextTrip.brand}</strong>
              <small>
                {route.nextTrip.releaseStatus === "awaiting_loader"
                  ? "Waiting for loader clearance. Departure remains locked."
                  : "Ready for review."}
              </small>
            </div>
          )}
        </section>
      )}

      <section className="driver-card driver-progress-card">
        <div className="driver-card-heading">
          <div>
            <span className="driver-eyebrow">Run progress</span>
            <h2>{completedCount} of {route.stops.length} stops resolved</h2>
          </div>
          <strong>{progress}%</strong>
        </div>
        <div className="driver-progress-track"><span style={{ width: `${progress}%` }} /></div>
        <div className="driver-progress-facts">
          <span><strong>{remainingCartons}</strong> cartons remaining</span>
          <span><strong>{formatMinutesDuration(Math.max(0, route.shiftBudgetMinutes - route.elapsedMinutes))}</strong> budget left</span>
          <span><strong>{route.returnDistanceKm === null ? "Included" : `${route.returnDistanceKm.toFixed(1)} km`}</strong> return leg</span>
        </div>
      </section>

      {(route.shiftStatus === "in_transit" || route.shiftStatus === "at_stop") && (
        <button type="button" className="driver-delay-action" onClick={onOpenDelay}>
          <AlertTriangle size={17} />
          <span><strong>Report a road delay</strong><small>Use only while safely stopped</small></span>
          <ArrowRight size={16} />
        </button>
      )}

      {route.shiftStatus === "assigned" && (
        <div className="driver-sticky-action-bar">
          <Button
            onClick={onStartRoute}
            disabled={!canDepart}
            className="driver-cta-button"
          >
            <Truck size={18} />
            {canDepart ? `Depart ${route.depot} depot` : "Complete readiness check to depart"}
          </Button>
        </div>
      )}
    </main>
  );
}
