"use client";

import { Wifi, WifiOff, Thermometer, Moon, Sun, ShieldCheck } from "lucide-react";
import { WaypointLogo } from "@/components/waypoint-logo";
import type { DriverRouteData } from "../driver-types";

interface DriverHeaderProps {
  route: DriverRouteData;
  effectiveOnline: boolean;
  isSimulatedOffline: boolean;
  onToggleOffline: () => void;
  onOpenPreTrip: () => void;
}

export function DriverHeader({
  route,
  effectiveOnline,
  isSimulatedOffline,
  onToggleOffline,
  onOpenPreTrip,
}: DriverHeaderProps) {
  const toggleTheme = () => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark");
    }
  };

  return (
    <header className="driver-header">
      <div className="driver-header-title">
        <WaypointLogo />
        <span className="driver-header-badge">
          {route.vehicle.id}
          {route.vehicle.chilled && (
            <span
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-mono ml-1"
              title="Refrigeration unit live temperature"
            >
              <Thermometer size={12} />
              {route.vehicle.reeferTemperatureC.toFixed(1)}°C
            </span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Pre-trip status quick button */}
        {!route.preTripCompleted && (
          <button
            onClick={onOpenPreTrip}
            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 bg-secondary text-secondary-foreground rounded-md border border-border"
            title="Pre-departure safety check pending"
          >
            <ShieldCheck size={13} />
            <span>Pre-Trip</span>
          </button>
        )}

        {/* Interactive Online/Offline Toggle for Testing */}
        <button
          onClick={onToggleOffline}
          className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
            effectiveOnline
              ? "bg-secondary text-foreground border-border"
              : "bg-muted text-muted-foreground border-border animate-pulse"
          }`}
          title={
            isSimulatedOffline
              ? "Simulating Hill Country Signal Loss (Tap to reconnect)"
              : "Online (Tap to simulate hill country offline mode)"
          }
        >
          {effectiveOnline ? (
            <>
              <Wifi size={12} />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff size={12} />
              <span>Offline Mode</span>
            </>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md hover:bg-muted text-foreground transition-colors"
          title="Toggle Day / Night Driving Theme"
          aria-label="Toggle theme"
        >
          <Sun size={15} className="dark:hidden" />
          <Moon size={15} className="hidden dark:block" />
        </button>
      </div>
    </header>
  );
}
