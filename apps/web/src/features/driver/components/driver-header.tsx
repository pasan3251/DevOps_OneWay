"use client";

import { CircleUserRound, CloudOff, MoreHorizontal, Wifi } from "lucide-react";
import { WaypointLogo } from "@/components/waypoint-logo";
import type { DriverRouteData } from "../driver-types";

interface DriverHeaderProps {
  route: DriverRouteData;
  effectiveOnline: boolean;
  unsyncedCount: number;
  onOpenOperations: () => void;
}

export function DriverHeader({
  route,
  effectiveOnline,
  unsyncedCount,
  onOpenOperations,
}: DriverHeaderProps) {
  return (
    <header className="driver-header">
      <div className="driver-header-title">
        <WaypointLogo />
        <div>
          <strong>Driver</strong>
          <span>{route.tripId} · {route.vehicle.id}</span>
        </div>
      </div>

      <div className="driver-header-actions">
        <span
          className={`driver-connectivity ${effectiveOnline ? "is-online" : "is-offline"}`}
          title={effectiveOnline ? "Connected" : "Working offline"}
        >
          {effectiveOnline ? <Wifi size={14} /> : <CloudOff size={14} />}
          {unsyncedCount > 0 ? `${unsyncedCount} pending` : effectiveOnline ? "Synced" : "Offline"}
        </span>
        <button
          type="button"
          className="driver-menu-button"
          onClick={onOpenOperations}
          aria-label="Open driver and vehicle details"
        >
          <CircleUserRound size={20} />
          <MoreHorizontal size={16} />
        </button>
      </div>
    </header>
  );
}
