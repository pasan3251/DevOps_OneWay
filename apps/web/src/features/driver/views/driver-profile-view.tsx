"use client";

import {
  CloudOff,
  Fuel,
  LogOut,
  PhoneCall,
  RefreshCw,
  Thermometer,
  Truck,
  User,
  Wifi,
  X,
} from "lucide-react";
import type { DriverRouteData } from "../driver-types";
import { Button } from "@/components/ui/button";
import { authService } from "@/features/auth/auth-service";
import { SharedAccountTools } from "@/features/shared/account-tools";

interface DriverOperationsSheetProps {
  route: DriverRouteData;
  effectiveOnline: boolean;
  isSimulatedOffline: boolean;
  isSyncing: boolean;
  unsyncedCount: number;
  onToggleOffline: () => void;
  onTriggerSync: () => void;
  onSignOut: () => void;
  onClose: () => void;
}

export function DriverOperationsSheet({
  route,
  effectiveOnline,
  isSimulatedOffline,
  isSyncing,
  unsyncedCount,
  onToggleOffline,
  onTriggerSync,
  onSignOut,
  onClose,
}: DriverOperationsSheetProps) {
  const session = authService.getSession();
  return (
    <div className="driver-sheet-overlay" role="dialog" aria-modal="true" aria-label="Driver and vehicle details">
      <div className="driver-sheet-content driver-operations-sheet">
        <div className="driver-sheet-handle" />
        <div className="driver-sheet-header">
          <div>
            <span className="driver-eyebrow">Active field session</span>
            <h2>Driver and vehicle</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close details"><X size={19} /></button>
        </div>

        <section className="driver-identity-card">
          <span className="driver-avatar"><User size={22} /></span>
          <div>
            <strong>{route.driver.name}</strong>
            <span>{route.driver.employeeId} · {route.depot} home depot</span>
          </div>
        </section>

        <section className="driver-operations-grid">
          <div><Truck size={16} /><span>Assigned vehicle<strong>{route.vehicle.id} · {route.vehicle.plate}</strong></span></div>
          <div><Fuel size={16} /><span>Fuel remaining<strong>{route.vehicle.fuelRemainingLiters} litres</strong></span></div>
          {route.vehicle.chilled && (
            <div><Thermometer size={16} /><span>Reefer status<strong>{route.vehicle.reeferTemperatureC === null ? "Physical check required" : `${route.vehicle.reeferTemperatureC.toFixed(1)}°C`}</strong></span></div>
          )}
          <div>{effectiveOnline ? <Wifi size={16} /> : <CloudOff size={16} />}<span>Field records<strong>{effectiveOnline ? "Connected" : "Stored offline"} · {unsyncedCount} pending</strong></span></div>
        </section>

        <Button
          variant="outline"
          disabled={!effectiveOnline || unsyncedCount === 0 || isSyncing}
          onClick={onTriggerSync}
          className="w-full h-11"
        >
          <RefreshCw size={15} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "Synchronizing records…" : "Synchronize field records"}
        </Button>

        {session && <div className="flex gap-2"><SharedAccountTools session={session} compact={false} /></div>}

        <a href="tel:+94112489000" className="driver-dispatch-contact">
          <PhoneCall size={17} />
          <span><strong>Call dispatch</strong><small>Route changes, emergencies and breakdown support</small></span>
        </a>

        {process.env.NODE_ENV !== "production" && (
          <details className="driver-demo-controls">
            <summary>Offline testing</summary>
            <div>
              <Button type="button" variant="outline" onClick={onToggleOffline}>
                {isSimulatedOffline ? <Wifi size={15} /> : <CloudOff size={15} />}
                {isSimulatedOffline ? "Restore connection" : "Simulate signal loss"}
              </Button>
            </div>
          </details>
        )}

        <Button variant="outline" onClick={onSignOut} className="w-full h-11">
          <LogOut size={16} /> Sign out
        </Button>
      </div>
    </div>
  );
}
