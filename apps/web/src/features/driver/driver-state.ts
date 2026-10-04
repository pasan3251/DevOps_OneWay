"use client";

import { useEffect, useState, useCallback } from "react";
import type {
  DriverRouteData,
  OfflineSyncItem,
  CompletedTripSummary,
  ProofOfDeliveryRecord,
  StopExceptionRecord,
  PreTripChecklist,
  StopItem,
} from "./driver-types";
import {
  initialActiveRoute,
  sampleHistoryTrips,
  sampleInitialSyncQueue,
  formatMinutesToTime,
} from "./driver-data";

const ROUTE_STORAGE_KEY = "waypoint.driver.route.v1";
const SYNC_STORAGE_KEY = "waypoint.driver.sync.v1";
const HISTORY_STORAGE_KEY = "waypoint.driver.history.v1";
const OFFLINE_OVERRIDE_KEY = "waypoint.driver.offline_override.v1";

export function useDriverState() {
  const [route, setRoute] = useState<DriverRouteData>(() => {
    if (typeof window === "undefined") return initialActiveRoute;
    try {
      const saved = localStorage.getItem(ROUTE_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return initialActiveRoute;
  });

  const [syncQueue, setSyncQueue] = useState<OfflineSyncItem[]>(() => {
    if (typeof window === "undefined") return sampleInitialSyncQueue;
    try {
      const saved = localStorage.getItem(SYNC_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return sampleInitialSyncQueue;
  });

  const [history, setHistory] = useState<CompletedTripSummary[]>(() => {
    if (typeof window === "undefined") return sampleHistoryTrips;
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return sampleHistoryTrips;
  });

  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(OFFLINE_OVERRIDE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Monitor physical network connectivity
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsBrowserOnline(navigator.onLine);

    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const effectiveOnline = isBrowserOnline && !isSimulatedOffline;

  // Persist route
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(route));
    }
  }, [route]);

  // Persist sync queue
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(syncQueue));
    }
  }, [syncQueue]);

  // Persist history
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    }
  }, [history]);

  // Persist simulated offline
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        OFFLINE_OVERRIDE_KEY,
        isSimulatedOffline ? "true" : "false",
      );
    }
  }, [isSimulatedOffline]);

  // Queue an offline sync event
  const enqueueSyncItem = useCallback(
    (
      type: OfflineSyncItem["type"],
      description: string,
      payload: Record<string, unknown>,
      stopId?: string,
    ) => {
      const now = new Date().toISOString();
      const item: OfflineSyncItem = {
        id: `SYNC-${Date.now().toString().slice(-6)}`,
        type,
        timestamp: now,
        stopId,
        description,
        payload,
        synced: effectiveOnline, // automatically synced if online, else queued
        retryCount: 0,
      };

      setSyncQueue((prev) => [item, ...prev]);
    },
    [effectiveOnline],
  );

  // Trigger manual or automatic synchronization
  const triggerSync = useCallback(() => {
    if (!effectiveOnline) return;
    setIsSyncing(true);
    setTimeout(() => {
      setSyncQueue((prev) =>
        prev.map((item) => ({ ...item, synced: true, error: undefined })),
      );
      setIsSyncing(false);
    }, 900);
  }, [effectiveOnline]);

  // Auto-sync when transitioning from offline to online
  useEffect(() => {
    if (effectiveOnline) {
      const hasUnsynced = syncQueue.some((i) => !i.synced);
      if (hasUnsynced) {
        triggerSync();
      }
    }
  }, [effectiveOnline, syncQueue, triggerSync]);

  // 1. Depart Depot / Start Trip
  const startRoute = useCallback(() => {
    const nowTimeStr = formatMinutesToTime(route.departurePlannedMin);
    setRoute((prev) => {
      const nextStops = [...prev.stops];
      if (nextStops[0]) {
        nextStops[0] = { ...nextStops[0], status: "en_route" };
      }
      return {
        ...prev,
        shiftStatus: "in_transit",
        departureActualTimestamp: nowTimeStr,
        stops: nextStops,
      };
    });

    enqueueSyncItem(
      "departure",
      `Vehicle ${route.vehicle.id} departed ${route.depot} Depot for ${route.district}`,
      { departureTime: nowTimeStr, vehicleId: route.vehicle.id },
    );
  }, [enqueueSyncItem, route.departurePlannedMin, route.depot, route.district, route.vehicle.id]);

  // 2. Mark Arrived at Stop
  const arriveAtStop = useCallback(
    (stopId: string) => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      setRoute((prev) => {
        const nextStops = prev.stops.map((stop) => {
          if (stop.id !== stopId) return stop;

          // Check if arrival is before window open
          const isEarly = currentMinutes < stop.effectiveWindow[0];
          const remainingHold = isEarly
            ? stop.effectiveWindow[0] - currentMinutes
            : 0;

          return {
            ...stop,
            status: isEarly ? ("waiting_window" as const) : ("arrived" as const),
            actualArrivalTimestamp: timeStr,
            holdingRemainingMinutes: remainingHold,
          };
        });

        return {
          ...prev,
          shiftStatus: "at_stop",
          stops: nextStops,
        };
      });

      const currentStop = route.stops.find((s) => s.id === stopId);
      enqueueSyncItem(
        "arrival",
        `Arrived at ${currentStop?.outlet || stopId} at ${timeStr}`,
        { stopId, arrivalTime: timeStr },
        stopId,
      );
    },
    [enqueueSyncItem, route.stops],
  );

  // 3. Advance from Window Wait to Unloading
  const unlockWindowHold = useCallback(
    (stopId: string) => {
      setRoute((prev) => ({
        ...prev,
        stops: prev.stops.map((stop) =>
          stop.id === stopId
            ? { ...stop, status: "arrived", holdingRemainingMinutes: 0 }
            : stop,
        ),
      }));
    },
    [],
  );

  // 4. Complete Stop Delivery with Proof of Delivery
  const completeDelivery = useCallback(
    (stopId: string, pod: ProofOfDeliveryRecord) => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      setRoute((prev) => {
        const stopIndex = prev.stops.findIndex((s) => s.id === stopId);
        if (stopIndex === -1) return prev;

        const nextStops = [...prev.stops];
        const currentStop = nextStops[stopIndex];
        const status = pod.outcome === "full" ? "delivered" : "partial";

        nextStops[stopIndex] = {
          ...currentStop,
          status,
          actualCompletionTimestamp: timeStr,
          pod,
        };

        // Advance next stop to en_route if available
        let nextShiftStatus = prev.shiftStatus;
        const nextStop = nextStops[stopIndex + 1];
        if (nextStop && nextStop.status === "scheduled") {
          nextStops[stopIndex + 1] = {
            ...nextStop,
            status: "en_route",
          };
          nextShiftStatus = "in_transit";
        } else if (
          nextStops.every((s) => s.status === "delivered" || s.status === "partial" || s.status === "exception")
        ) {
          nextShiftStatus = "returning";
        }

        return {
          ...prev,
          shiftStatus: nextShiftStatus,
          stops: nextStops,
        };
      });

      enqueueSyncItem(
        "pod",
        `Proof of Delivery verified for ${stopId} (${pod.outcome.toUpperCase()} - ${pod.deliveredCartons} cartons)`,
        { stopId, pod, timeStr },
        stopId,
      );
    },
    [enqueueSyncItem],
  );

  // 5. Report Stop Exception or Failure
  const reportException = useCallback(
    (stopId: string, exception: StopExceptionRecord) => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      setRoute((prev) => {
        const stopIndex = prev.stops.findIndex((s) => s.id === stopId);
        if (stopIndex === -1) return prev;

        const nextStops = [...prev.stops];
        const currentStop = nextStops[stopIndex];

        nextStops[stopIndex] = {
          ...currentStop,
          status: "exception",
          actualCompletionTimestamp: timeStr,
          exception,
        };

        // If next stop exists, advance to en_route
        let nextShiftStatus = prev.shiftStatus;
        const nextStop = nextStops[stopIndex + 1];
        if (nextStop && nextStop.status === "scheduled") {
          nextStops[stopIndex + 1] = {
            ...nextStop,
            status: "en_route",
          };
          nextShiftStatus = "in_transit";
        } else if (
          nextStops.every((s) => s.status === "delivered" || s.status === "partial" || s.status === "exception")
        ) {
          nextShiftStatus = "returning";
        }

        return {
          ...prev,
          shiftStatus: nextShiftStatus,
          stops: nextStops,
        };
      });

      enqueueSyncItem(
        "exception",
        `Exception reported for ${stopId}: ${exception.reasonLabel}`,
        { stopId, exception, timeStr },
        stopId,
      );
    },
    [enqueueSyncItem],
  );

  // 6. Report Transit Delay (Monsoon, Traffic, Breakdown)
  const reportTransitDelay = useCallback(
    (reason: string, minutes: number) => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      setRoute((prev) => ({
        ...prev,
        transitDelayMinutes: prev.transitDelayMinutes + minutes,
        delayNotice: {
          reason,
          minutes,
          timestamp: timeStr,
        },
        // Drift downstream stop estimated arrivals
        stops: prev.stops.map((stop) =>
          stop.status === "scheduled" || stop.status === "en_route"
            ? { ...stop, estimatedArrival: stop.estimatedArrival + minutes }
            : stop,
        ),
      }));

      enqueueSyncItem(
        "delay",
        `Transit Delay +${minutes}m reported: ${reason}`,
        { reason, minutes, timeStr },
      );
    },
    [enqueueSyncItem],
  );

  // 7. Complete Pre-Trip Inspection
  const completePreTrip = useCallback(
    (checklist: PreTripChecklist) => {
      setRoute((prev) => ({
        ...prev,
        preTripCompleted: true,
      }));

      enqueueSyncItem(
        "pretrip",
        `Pre-trip safety check verified by ${route.driver.name}`,
        { checklist, driverId: route.driver.id },
      );
    },
    [enqueueSyncItem, route.driver.name, route.driver.id],
  );

  // 8. Confirm Return to Depot & Close Trip
  const completeRouteAndReturn = useCallback(() => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const deliveredStops = route.stops.filter((s) => s.status === "delivered" || s.status === "partial").length;
    const exceptionStops = route.stops.filter((s) => s.status === "exception").length;
    const totalDeliveredKg = route.stops.reduce(
      (sum, s) => (s.status === "delivered" || s.status === "partial" ? sum + s.totalKg : sum),
      0,
    );
    const totalDeliveredCartons = route.stops.reduce(
      (sum, s) =>
        s.pod
          ? sum + s.pod.deliveredCartons
          : s.status === "delivered"
            ? sum + s.totalCartons
            : sum,
      0,
    );

    const summary: CompletedTripSummary = {
      tripId: route.tripId,
      date: new Date().toISOString().slice(0, 10),
      brand: route.brand,
      district: route.district,
      vehicleId: route.vehicle.id,
      stopsCount: route.stops.length,
      deliveredCount: deliveredStops,
      exceptionCount: exceptionStops,
      totalKg: totalDeliveredKg,
      totalCartons: totalDeliveredCartons,
      durationMinutes: route.elapsedMinutes,
      completedAt: timeStr,
    };

    setHistory((prev) => [summary, ...prev]);
    setRoute((prev) => ({
      ...prev,
      shiftStatus: "completed",
    }));

    enqueueSyncItem(
      "trip_complete",
      `Route ${route.tripId} completed at ${route.depot} DC (${deliveredStops}/${route.stops.length} delivered)`,
      { summary },
    );
  }, [enqueueSyncItem, route]);

  // Reset to demo initial state
  const resetDemoState = useCallback(() => {
    setRoute(initialActiveRoute);
    setSyncQueue(sampleInitialSyncQueue);
    setHistory(sampleHistoryTrips);
    setIsSimulatedOffline(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem(ROUTE_STORAGE_KEY);
      localStorage.removeItem(SYNC_STORAGE_KEY);
      localStorage.removeItem(HISTORY_STORAGE_KEY);
      localStorage.removeItem(OFFLINE_OVERRIDE_KEY);
    }
  }, []);

  const toggleSimulatedOffline = useCallback(() => {
    setIsSimulatedOffline((prev) => !prev);
  }, []);

  // Compute active stop
  const activeStop: StopItem | undefined =
    route.stops.find(
      (s) => s.status === "en_route" || s.status === "arrived" || s.status === "waiting_window" || s.status === "unloading",
    ) || route.stops.find((s) => s.status === "scheduled");

  const completedCount = route.stops.filter(
    (s) => s.status === "delivered" || s.status === "partial" || s.status === "exception",
  ).length;

  const unsyncedCount = syncQueue.filter((i) => !i.synced).length;

  return {
    route,
    syncQueue,
    history,
    effectiveOnline,
    isSimulatedOffline,
    isSyncing,
    activeStop,
    completedCount,
    unsyncedCount,
    startRoute,
    arriveAtStop,
    unlockWindowHold,
    completeDelivery,
    reportException,
    reportTransitDelay,
    completePreTrip,
    completeRouteAndReturn,
    triggerSync,
    toggleSimulatedOffline,
    resetDemoState,
  };
}
