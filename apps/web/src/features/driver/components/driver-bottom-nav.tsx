"use client";

import { Home, MapPin, History } from "lucide-react";

export type DriverNavTab = "home" | "route" | "history";

interface DriverBottomNavProps {
  currentTab: DriverNavTab;
  onSelectTab: (tab: DriverNavTab) => void;
  pendingStopsCount: number;
  unsyncedCount: number;
}

export function DriverBottomNav({
  currentTab,
  onSelectTab,
  pendingStopsCount,
  unsyncedCount,
}: DriverBottomNavProps) {
  return (
    <nav className="driver-bottom-nav" aria-label="Driver Navigation">
      <button
        type="button"
        className={`driver-nav-item ${currentTab === "home" ? "is-active" : ""}`}
        onClick={() => onSelectTab("home")}
        aria-current={currentTab === "home" ? "page" : undefined}
      >
        <Home size={20} />
        <span>Today</span>
      </button>

      <button
        type="button"
        className={`driver-nav-item ${currentTab === "route" ? "is-active" : ""}`}
        onClick={() => onSelectTab("route")}
        aria-current={currentTab === "route" ? "page" : undefined}
      >
        <MapPin size={20} />
        <span>Route</span>
        {pendingStopsCount > 0 && (
          <span className="driver-nav-badge" title={`${pendingStopsCount} stops remaining`}>
            {pendingStopsCount}
          </span>
        )}
      </button>

      <button
        type="button"
        className={`driver-nav-item ${currentTab === "history" ? "is-active" : ""}`}
        onClick={() => onSelectTab("history")}
        aria-current={currentTab === "history" ? "page" : undefined}
      >
        <History size={20} />
        <span>Records</span>
        {unsyncedCount > 0 && (
          <span
            className="driver-nav-badge"
            title={`${unsyncedCount} offline items queued for sync`}
          >
            {unsyncedCount}
          </span>
        )}
      </button>
    </nav>
  );
}
