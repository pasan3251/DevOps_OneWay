"use client";

import {
  User,
  Truck,
  Fuel,
  Thermometer,
  Shield,
  Wifi,
  WifiOff,
  PhoneCall,
  LogOut,
  RotateCcw,
  Gauge,
  Layers,
} from "lucide-react";
import type { DriverRouteData } from "../driver-types";
import { Button } from "@/components/ui/button";

interface DriverProfileViewProps {
  route: DriverRouteData;
  effectiveOnline: boolean;
  isSimulatedOffline: boolean;
  unsyncedCount: number;
  onToggleOffline: () => void;
  onResetDemo: () => void;
  onSignOut: () => void;
}

export function DriverProfileView({
  route,
  effectiveOnline,
  isSimulatedOffline,
  unsyncedCount,
  onToggleOffline,
  onResetDemo,
  onSignOut,
}: DriverProfileViewProps) {
  const fuelPercent = Math.round(
    (route.vehicle.fuelRemainingLiters / route.vehicle.fuelQuotaLiters) * 100,
  );

  return (
    <div className="driver-main-content">
      {/* Driver Profile Overview */}
      <div className="driver-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
            <User size={24} />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-foreground">
                {route.driver.name}
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                {route.driver.employeeId}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Assigned Home Depot:{" "}
              <strong className="text-foreground">{route.depot} Central DC</strong>
            </p>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              Contact: {route.driver.phone}
            </p>
          </div>
        </div>
      </div>

      {/* Vehicle Telematics Card */}
      <div className="driver-card p-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              Vehicle Telematics & Specs
            </h2>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted">
            {route.vehicle.id} ({route.vehicle.plate})
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground block">
              Vehicle Model
            </span>
            <span className="font-bold text-foreground">
              {route.vehicle.model}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-muted-foreground block">
              Thermal Classification
            </span>
            <span className="font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1">
              <Thermometer size={12} />
              Refrigerated Reefer
            </span>
          </div>

          <div>
            <span className="text-[10px] text-muted-foreground block">
              Weight Rating
            </span>
            <span className="font-bold font-mono text-foreground">
              {route.vehicle.weightCapacityKg.toLocaleString()} kg max
            </span>
          </div>

          <div>
            <span className="text-[10px] text-muted-foreground block">
              Volume Rating
            </span>
            <span className="font-bold font-mono text-foreground">
              {route.vehicle.volumeCapacityM3.toFixed(1)} m³ payload
            </span>
          </div>

          <div>
            <span className="text-[10px] text-muted-foreground block">
              Odometer Reading
            </span>
            <span className="font-bold font-mono text-foreground flex items-center gap-1">
              <Gauge size={12} />
              {route.vehicle.odometerKm.toLocaleString()} km
            </span>
          </div>

          <div>
            <span className="text-[10px] text-muted-foreground block">
              Fuel Efficiency
            </span>
            <span className="font-bold font-mono text-foreground">
              {route.vehicle.kmPerLiter} km / liter
            </span>
          </div>
        </div>

        {/* Live Fuel Quota Bar */}
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Fuel size={13} className="text-amber-600" />
              Weekly Fuel Quota Allowance
            </span>
            <span className="font-mono font-bold text-foreground">
              {route.vehicle.fuelRemainingLiters}L / {route.vehicle.fuelQuotaLiters}L ({fuelPercent}%)
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full ${
                fuelPercent < 25 ? "bg-red-500" : "bg-amber-500"
              }`}
              style={{ width: `${fuelPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Field Connectivity & Offline Testing Sandbox */}
      <div className="driver-card p-4">
        <h2 className="text-sm font-bold text-foreground mb-1 flex items-center gap-1.5">
          <Shield size={16} className="text-primary" />
          Field Network & Offline Mode
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The driver application is built offline-first for central highland corridors. You can toggle simulated offline mode to inspect the degradation screen and local queuing behavior.
        </p>

        <div className="mt-3 p-3 rounded-lg border border-border bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {effectiveOnline ? (
              <Wifi size={18} className="text-teal-600" />
            ) : (
              <WifiOff size={18} className="text-destructive animate-pulse" />
            )}
            <div>
              <div className="text-xs font-bold text-foreground">
                {effectiveOnline ? "Signal Active (Online)" : "Signal Lost (Offline Mode)"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {unsyncedCount} mutations pending local upload
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={onToggleOffline}
            className="text-xs font-semibold"
          >
            {isSimulatedOffline ? "Restore Signal" : "Simulate Outage"}
          </Button>
        </div>
      </div>

      {/* Emergency Dispatch Desk Contact */}
      <div className="driver-card p-4">
        <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
          <PhoneCall size={16} className="text-teal-600" />
          Dispatch Hotline
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Need an immediate reroute, order deferral approval, or emergency breakdown towing?
        </p>

        <a
          href="tel:+94112489000"
          className="w-full py-2.5 px-3 rounded-lg bg-card border border-border hover:bg-muted text-xs font-bold flex items-center justify-center gap-2 text-foreground transition-colors"
        >
          <PhoneCall size={14} className="text-teal-600" />
          <span>Call Peliyagoda Planning Desk (+94 11 248 9000)</span>
        </a>
      </div>

      {/* Session & Maintenance Utilities */}
      <div className="space-y-2 pt-1">
        <Button
          variant="outline"
          onClick={onResetDemo}
          className="w-full h-11 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
        >
          <RotateCcw size={14} />
          <span>Reset Demo Route & Local Storage</span>
        </Button>

        <Button
          variant="destructive"
          onClick={onSignOut}
          className="w-full h-11 text-xs font-bold flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          <span>Sign Out of Driver Session</span>
        </Button>
      </div>
    </div>
  );
}
