"use client";

import {
  MapPin,
  Clock,
  Package,
  ArrowRight,
  Phone,
  ShieldCheck,
  AlertCircle,
  Truck,
  CheckCircle2,
  Navigation,
  Thermometer,
} from "lucide-react";
import type { DriverRouteData, StopItem } from "../driver-types";
import { formatMinutesToTime, formatMinutesDuration } from "../driver-data";
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
  const allStopsCompleted =
    route.stops.length > 0 &&
    route.stops.every(
      (s) => s.status === "delivered" || s.status === "partial" || s.status === "exception",
    );

  const progressPercent = Math.round(
    (completedCount / Math.max(1, route.stops.length)) * 100,
  );

  return (
    <div className="driver-main-content">
      {/* Shift Greeting & Operational Context */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Today&apos;s Run · {route.brand} ({route.district})
          </span>
          <h1 className="text-xl font-bold text-foreground">
            {route.driver.name}
          </h1>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-muted-foreground block">
            Trip {route.tripId}
          </span>
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-primary/10 text-primary">
            {route.depot} DC
          </span>
        </div>
      </div>

      {/* Pre-Trip Checklist Warning Banner if not yet verified */}
      {!route.preTripCompleted && (
        <div className="driver-card bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 p-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-amber-950 dark:text-amber-200">
                Pre-Departure Vehicle Check Required
              </div>
              <div className="text-[11px] text-amber-900/80 dark:text-amber-300/80 mt-0.5">
                Verify tire pressure, LIFO cargo seals, and reefer temperature before departing {route.depot}.
              </div>
            </div>
            <Button
              size="sm"
              onClick={onOpenPreTrip}
              className="text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              Verify
            </Button>
          </div>
        </div>
      )}

      {/* Route Delay Notice if Active */}
      {route.transitDelayMinutes > 0 && route.delayNotice && (
        <div className="driver-card bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-destructive shrink-0" />
              <div>
                <span className="text-xs font-bold text-destructive">
                  Transit Delay Reported (+{route.transitDelayMinutes}m)
                </span>
                <p className="text-[11px] text-muted-foreground">
                  {route.delayNotice.reason}
                </p>
              </div>
            </div>
            <button
              onClick={onOpenDelay}
              className="text-[11px] font-semibold text-destructive underline"
            >
              Adjust
            </button>
          </div>
        </div>
      )}

      {/* Route Progress Snapshot */}
      <div className="driver-card">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Truck size={14} className="text-primary" />
            Route Progress
          </span>
          <span className="text-muted-foreground font-mono font-medium">
            {completedCount} of {route.stops.length} stops ({progressPercent}%)
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Quick Route KPIs */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/60 text-center">
          <div>
            <span className="text-[10px] text-muted-foreground block">
              Remaining Cargo
            </span>
            <span className="text-xs font-bold font-mono text-foreground">
              {route.stops
                .filter((s) => s.status !== "delivered" && s.status !== "partial")
                .reduce((sum, s) => sum + s.totalCartons, 0)}{" "}
              Cartons
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block">
              Reefer Temp
            </span>
            <span className="text-xs font-bold font-mono text-teal-700 dark:text-teal-400 flex items-center justify-center gap-1">
              <Thermometer size={12} />
              {route.vehicle.reeferTemperatureC.toFixed(1)}°C
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block">
              Shift Budget
            </span>
            <span className="text-xs font-bold font-mono text-foreground">
              {formatMinutesDuration(
                Math.max(0, route.shiftBudgetMinutes - route.elapsedMinutes),
              )}{" "}
              left
            </span>
          </div>
        </div>
      </div>

      {/* NEXT IMMEDIATE STOP HERO CARD */}
      {!allStopsCompleted && activeStop ? (
        <div className="driver-card driver-card-hero">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center">
                {activeStop.sequence}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Next Stop · LIFO #{activeStop.lifoPosition}
              </span>
            </div>
            <span className={`status-chip ${activeStop.status}`}>
              {activeStop.status.replace("_", " ")}
            </span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-foreground">
              {activeStop.outlet}
            </h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin size={13} className="shrink-0 text-muted-foreground" />
              {activeStop.address}
            </p>
          </div>

          {/* Delivery Window & Arrival Timing */}
          <div className="p-2.5 rounded-lg bg-card/80 border border-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-amber-600" />
              <div>
                <span className="font-semibold block text-foreground">
                  Delivery Window
                </span>
                <span className="text-muted-foreground text-[11px] font-mono">
                  {formatMinutesToTime(activeStop.effectiveWindow[0])} –{" "}
                  {formatMinutesToTime(activeStop.effectiveWindow[1])}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground block">
                Target ETA
              </span>
              <span className="font-bold text-foreground font-mono">
                {formatMinutesToTime(activeStop.estimatedArrival)}
              </span>
            </div>
          </div>

          {/* Consignment Overview */}
          <div className="flex items-center justify-between text-xs text-muted-foreground py-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Package size={14} className="text-primary" />
              {activeStop.totalCartons} packages ({activeStop.totalKg} kg)
            </span>
            <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">
              {activeStop.orders.length > 1
                ? "Dual Order (Ambient + Chilled)"
                : activeStop.dockType.replace("_", " ")}
            </span>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <a
              href={`tel:${activeStop.contact.phone}`}
              className="p-2.5 rounded-lg border border-border bg-card text-foreground hover:bg-muted flex items-center justify-center shrink-0"
              title={`Call ${activeStop.contact.name}`}
            >
              <Phone size={16} />
            </a>

            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(
                activeStop.address,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-lg border border-border bg-card text-foreground hover:bg-muted flex items-center justify-center shrink-0"
              title="Open Navigation App"
            >
              <Navigation size={16} />
            </a>

            <Button
              onClick={() => onOpenStop(activeStop.id)}
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2 text-xs"
            >
              <span>View Stop & Execute Handover</span>
              <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      ) : allStopsCompleted ? (
        /* ALL STOPS COMPLETED HERO */
        <div className="driver-card bg-teal-50/50 dark:bg-teal-950/30 border-teal-300 dark:border-teal-800 text-center p-6">
          <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={28} />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            All Deliveries Completed!
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            You have executed all {route.stops.length} stops on Route{" "}
            {route.tripId}. Return to {route.depot} Distribution Center for gate close.
          </p>

          <Button
            onClick={onCompleteRoute}
            disabled={route.shiftStatus === "completed"}
            className="w-full mt-4 h-12 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm"
          >
            {route.shiftStatus === "completed"
              ? "Route Closed & Recorded"
              : `Confirm Return to ${route.depot} DC`}
          </Button>
        </div>
      ) : null}

      {/* QUICK TRANSIT TOOLS CARD */}
      <div className="driver-card">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Road & Fleet Operations
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenDelay}
            className="p-3 rounded-lg border border-border bg-card hover:bg-muted text-left transition-colors flex items-center gap-2.5"
          >
            <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
              <Clock size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">
                Report Delay
              </div>
              <div className="text-[10px] text-muted-foreground">
                Monsoon / Traffic
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenPreTrip}
            className="p-3 rounded-lg border border-border bg-card hover:bg-muted text-left transition-colors flex items-center gap-2.5"
          >
            <div className="p-2 rounded-md bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300">
              <ShieldCheck size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">
                Vehicle Check
              </div>
              <div className="text-[10px] text-muted-foreground">
                Tires & LIFO seals
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* STICKY BOTTOM PRIMARY CTA BAR */}
      <div className="driver-sticky-action-bar">
        {route.shiftStatus === "assigned" ? (
          <Button
            onClick={onStartRoute}
            className="driver-cta-button bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Truck size={18} />
            <span>Depart {route.depot} Depot & Start Route</span>
          </Button>
        ) : activeStop && !allStopsCompleted ? (
          <Button
            onClick={() => onOpenStop(activeStop.id)}
            className="driver-cta-button bg-teal-700 hover:bg-teal-800 text-white"
          >
            <MapPin size={18} />
            <span>
              {activeStop.status === "en_route"
                ? `Arrive at Stop ${activeStop.sequence}: ${activeStop.outlet}`
                : activeStop.status === "waiting_window"
                  ? `Holding for Window (${activeStop.holdingRemainingMinutes}m)`
                  : `Complete Handover at Stop ${activeStop.sequence}`}
            </span>
          </Button>
        ) : (
          <Button
            onClick={onCompleteRoute}
            disabled={route.shiftStatus === "completed"}
            className="driver-cta-button bg-teal-700 hover:bg-teal-800 text-white"
          >
            <CheckCircle2 size={18} />
            <span>
              {route.shiftStatus === "completed"
                ? "Shift Complete · View Summary in History"
                : `Return to ${route.depot} DC & Day Close`}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
