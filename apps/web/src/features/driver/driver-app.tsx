"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { WifiOff } from "lucide-react";
import "./driver.css";
import "@/features/dispatcher/monochrome.css";

import { useDriverState } from "./driver-state";
import type { StopItem, ProofOfDeliveryRecord, StopExceptionRecord, PreTripChecklist } from "./driver-types";
import { DriverHeader } from "./components/driver-header";
import { DriverBottomNav, type DriverNavTab } from "./components/driver-bottom-nav";
import { DriverHome } from "./views/driver-home";
import { DriverRouteView } from "./views/driver-route-view";
import { DriverStopDetail } from "./views/driver-stop-detail";
import { DriverHistoryView } from "./views/driver-history-view";
import { DriverOperationsSheet } from "./views/driver-profile-view";
import { ProofOfDeliverySheet } from "./components/proof-of-delivery-sheet";
import { ExceptionSheet } from "./components/exception-sheet";
import { PreTripModal } from "./components/pre-trip-modal";
import { TransitDelayModal } from "./components/transit-delay-modal";
import { authService } from "../auth/auth-service";

export function DriverApp() {
  const router = useRouter();
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const {
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
  } = useDriverState();

  const [currentTab, setCurrentTab] = useState<DriverNavTab>("home");
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  // Modal / Sheet overlay states
  const [podStop, setPodStop] = useState<StopItem | null>(null);
  const [exceptionStop, setExceptionStop] = useState<StopItem | null>(null);
  const [showPreTrip, setShowPreTrip] = useState<boolean>(false);
  const [showDelayModal, setShowDelayModal] = useState<boolean>(false);
  const [showOperations, setShowOperations] = useState<boolean>(false);

  const selectedStop = route.stops.find((s) => s.id === selectedStopId);
  const pendingStopsCount = route.stops.length - completedCount;

  const handleSignOut = () => {
    authService.signOut();
    router.replace("/login");
  };

  const handleOpenStop = (stopId: string) => {
    setSelectedStopId(stopId);
  };

  const handleCloseStopDetail = () => {
    setSelectedStopId(null);
  };

  if (!isHydrated) {
    return (
      <div className="driver-app-shell" aria-busy="true">
        <div className="driver-viewport-wrapper driver-loading-shell">
          <span>Loading today&apos;s assigned run…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="driver-app-shell">
      {/* OFFLINE DEGRADATION BANNER (FAIL-C: Signal Lost, Work Continues) */}
      {!effectiveOnline && (
        <aside
          className="driver-offline-banner is-outage"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-1.5">
            <WifiOff size={14} className="shrink-0 animate-pulse text-destructive" />
            <span>
              <strong>Signal Lost, Work Continues.</strong> Offline mode active
              — all actions store safely.
            </span>
          </div>
          {unsyncedCount > 0 && (
            <span className="font-mono text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded border border-border">
              {unsyncedCount} queued
            </span>
          )}
        </aside>
      )}

      {/* Main Responsive Viewport Wrapper */}
      <div className="driver-viewport-wrapper">
        <DriverHeader
          route={route}
          effectiveOnline={effectiveOnline}
          unsyncedCount={unsyncedCount}
          onOpenOperations={() => setShowOperations(true)}
        />

        {/* View Switcher based on Selected Stop or Active Tab */}
        {selectedStop ? (
          <DriverStopDetail
            stop={selectedStop}
            isActive={selectedStop.id === activeStop?.id}
            onBack={handleCloseStopDetail}
            onArrive={arriveAtStop}
            onUnlockHold={unlockWindowHold}
            onOpenPod={(stop) => setPodStop(stop)}
            onOpenException={(stop) => setExceptionStop(stop)}
          />
        ) : (
          <>
            {currentTab === "home" && (
              <DriverHome
                route={route}
                activeStop={activeStop}
                completedCount={completedCount}
                unsyncedCount={unsyncedCount}
                onStartRoute={startRoute}
                onOpenStop={handleOpenStop}
                onOpenPreTrip={() => setShowPreTrip(true)}
                onOpenDelay={() => setShowDelayModal(true)}
                onCompleteRoute={completeRouteAndReturn}
              />
            )}

            {currentTab === "route" && (
              <DriverRouteView
                route={route}
                activeStop={activeStop}
                onOpenStop={handleOpenStop}
              />
            )}

            {currentTab === "history" && (
              <DriverHistoryView
                history={history}
                syncQueue={syncQueue}
                effectiveOnline={effectiveOnline}
                isSyncing={isSyncing}
                onTriggerSync={triggerSync}
              />
            )}

          </>
        )}

        {/* Persistent Bottom Navigation Bar */}
        <DriverBottomNav
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setSelectedStopId(null);
            setCurrentTab(tab);
          }}
          pendingStopsCount={pendingStopsCount}
          unsyncedCount={unsyncedCount}
        />
      </div>

      {/* MODAL 1: PROOF OF DELIVERY (POD) SHEET */}
      {podStop && (
        <ProofOfDeliverySheet
          stop={podStop}
          onClose={() => setPodStop(null)}
          onSubmit={(pod: ProofOfDeliveryRecord) => {
            completeDelivery(podStop.id, pod);
            setPodStop(null);
          }}
        />
      )}

      {/* MODAL 2: EXCEPTION & INCIDENT SHEET */}
      {exceptionStop && (
        <ExceptionSheet
          stop={exceptionStop}
          onClose={() => setExceptionStop(null)}
          onSubmit={(exception: StopExceptionRecord) => {
            reportException(exceptionStop.id, exception);
            setExceptionStop(null);
          }}
        />
      )}

      {/* MODAL 3: PRE-TRIP SAFETY CHECK MODAL */}
      {showPreTrip && (
        <PreTripModal
          vehicle={route.vehicle}
          onClose={() => setShowPreTrip(false)}
          onComplete={(checklist: PreTripChecklist) => {
            completePreTrip(checklist);
            setShowPreTrip(false);
          }}
        />
      )}

      {/* MODAL 4: TRANSIT DELAY REPORTING MODAL */}
      {showDelayModal && (
        <TransitDelayModal
          onClose={() => setShowDelayModal(false)}
          onSubmit={(reason: string, minutes: number) => {
            reportTransitDelay(reason, minutes);
            setShowDelayModal(false);
          }}
        />
      )}

      {showOperations && (
        <DriverOperationsSheet
          route={route}
          effectiveOnline={effectiveOnline}
          isSimulatedOffline={isSimulatedOffline}
          isSyncing={isSyncing}
          unsyncedCount={unsyncedCount}
          onToggleOffline={toggleSimulatedOffline}
          onTriggerSync={triggerSync}
          onResetDemo={() => {
            resetDemoState();
            setShowOperations(false);
          }}
          onSignOut={handleSignOut}
          onClose={() => setShowOperations(false)}
        />
      )}
    </div>
  );
}
