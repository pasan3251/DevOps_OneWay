"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  LockKeyhole,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatTime,
  orders,
  totals,
  vehicles,
  type Depot,
  type Order,
  type Plan,
} from "@/features/dispatcher/planning";

export type DiscrepancyResolution =
  | "pending"
  | "ship_partial"
  | "hold_replacement"
  | "emergency_defer";

export type DiscrepancyRecord = {
  id: string;
  tripId: string;
  orderId: string;
  outlet: string;
  depot: Depot;
  vehicleId: string;
  type: "damaged" | "missing" | "temperature_breach";
  quantity: number;
  itemDescription: string;
  skuCode?: string;
  kgImpact: number;
  m3Impact: number;
  notes: string;
  reportedBy: string;
  timestamp: string;
  resolution: DiscrepancyResolution;
  resolutionNotes?: string;
  resolvedAt?: string;
};

export type PlanRevisionAlert = {
  active: boolean;
  previousVersion: string;
  newVersion: string;
  reason: string;
  changedOrderIds: string[];
  timestamp: string;
};

export type ClearanceRecord = {
  tripId: string;
  vehicleId: string;
  clearedAt: string;
  clearedBy: string;
  totalStops: number;
  finalKg: number;
  finalM3: number;
  exceptionsCount: number;
};

export type ManifestVerification = {
  checkedStops: string[];
  checkedSkus: Record<string, boolean>;
};

export function generateSkusForOrder(order: Order) {
  if (order.brand === "Fresh") {
    if (order.chilled) {
      return [
        { sku: "SKU-CHL-01", name: "Dairy crates", qty: Math.ceil((order.kg * 0.45) / 10), unit: "crates", temp: "Chilled", unitKg: 10, unitM3: 0.05 },
        { sku: "SKU-CHL-02", name: "Meat and poultry", qty: Math.ceil((order.kg * 0.35) / 12), unit: "totes", temp: "Chilled", unitKg: 12, unitM3: 0.06 },
        { sku: "SKU-CHL-03", name: "Fresh produce", qty: Math.ceil((order.kg * 0.2) / 8), unit: "cartons", temp: "Chilled", unitKg: 8, unitM3: 0.04 },
      ];
    }
    return [
      { sku: "SKU-AMB-01", name: "Dry groceries", qty: Math.ceil((order.kg * 0.6) / 15), unit: "cartons", temp: "Ambient", unitKg: 15, unitM3: 0.08 },
      { sku: "SKU-AMB-02", name: "Bakery and staples", qty: Math.ceil((order.kg * 0.4) / 10), unit: "cartons", temp: "Ambient", unitKg: 10, unitM3: 0.05 },
    ];
  }
  if (order.brand === "Style") {
    return [
      { sku: "SKU-STY-01", name: "Footwear and accessories", qty: Math.ceil((order.kg * 0.4) / 8), unit: "boxes", temp: "Ambient", unitKg: 8, unitM3: 0.07 },
      { sku: "SKU-STY-02", name: "Apparel", qty: Math.ceil((order.kg * 0.6) / 12), unit: "garment packs", temp: "Ambient", unitKg: 12, unitM3: 0.1 },
    ];
  }
  return [
    { sku: "SKU-TCH-01", name: "Electronics and displays", qty: Math.ceil((order.kg * 0.5) / 25), unit: "heavy crates", temp: "Ambient", unitKg: 25, unitM3: 0.15 },
    { sku: "SKU-TCH-02", name: "Accessories", qty: Math.ceil((order.kg * 0.5) / 15), unit: "cartons", temp: "Ambient", unitKg: 15, unitM3: 0.09 },
  ];
}

function isIssueBlocking(record: DiscrepancyRecord) {
  return record.resolution !== "ship_partial";
}

export function LoaderManifest({
  plan,
  depot,
  selectedTripId,
  onBack,
  discrepancies,
  onAddDiscrepancy,
  onClearDeparture,
  verification,
  onVerificationChange,
  isCleared,
}: {
  plan: Plan;
  depot: Depot;
  selectedTripId: string;
  onBack: () => void;
  discrepancies: DiscrepancyRecord[];
  onAddDiscrepancy: (record: DiscrepancyRecord) => void;
  onClearDeparture: (tripId: string, clearance: ClearanceRecord) => void;
  verification: ManifestVerification;
  onVerificationChange: (next: ManifestVerification) => void;
  isCleared: boolean;
}) {
  const { checkedStops, checkedSkus } = verification;
  const [expandedStops, setExpandedStops] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | "pending" | "verified">("all");
  const [manifestVersion, setManifestVersion] = useState("v1.0");
  const [revisionAlert, setRevisionAlert] = useState<PlanRevisionAlert | null>(null);
  const [changedOrderIds, setChangedOrderIds] = useState<string[]>([]);
  const previousManifestRef = useRef<{ tripId: string; signature: string }>({
    tripId: "",
    signature: "",
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [clearanceModalOpen, setClearanceModalOpen] = useState(false);
  const [targetOrder, setTargetOrder] = useState<Order | null>(null);
  const [selectedSku, setSelectedSku] = useState("");
  const [discrepancyType, setDiscrepancyType] = useState<DiscrepancyRecord["type"]>("missing");
  const [quantity, setQuantity] = useState(1);
  const [itemDescription, setItemDescription] = useState("");
  const [notes, setNotes] = useState("");

  const trip = plan.trips.find(
    (item) => item.id === selectedTripId && item.depot === depot
  );
  const vehicle = trip ? vehicles.find((item) => item.id === trip.vehicleId) : undefined;
  const tripOrders = trip
    ? trip.orderIds
        .map((id) => orders.find((order) => order.id === id))
        .filter((order) => order !== undefined)
    : [];
  const lifoOrderedStops = [...tripOrders].reverse();
  const sequenceSignature = trip?.orderIds.join("|") ?? "";

  useEffect(() => {
    if (!trip) return;

    const previous = previousManifestRef.current;
    if (previous.tripId !== trip.id) {
      previousManifestRef.current = { tripId: trip.id, signature: sequenceSignature };
      setExpandedStops({});
      setManifestVersion("v1.0");
      setRevisionAlert(null);
      setChangedOrderIds([]);
      return;
    }

    if (previous.signature && previous.signature !== sequenceSignature) {
      const previousIds = previous.signature.split("|");
      const changedIds = trip.orderIds.filter(
        (id, index) => previousIds[index] !== id
      );
      const nextVersion = `v1.${Number(manifestVersion.split(".")[1] ?? 0) + 1}`;
      setManifestVersion(nextVersion);
      setChangedOrderIds(changedIds);
      onVerificationChange({
        checkedStops: checkedStops.filter((id) => !changedIds.includes(id)),
        checkedSkus,
      });
      setRevisionAlert({
        active: true,
        previousVersion: manifestVersion,
        newVersion: nextVersion,
        reason: "Dispatch changed the stop sequence after loading began.",
        changedOrderIds: changedIds,
        timestamp: new Date().toLocaleTimeString("en-GB", {
          timeZone: "Asia/Colombo",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    }

    previousManifestRef.current = { tripId: trip.id, signature: sequenceSignature };
  }, [checkedSkus, checkedStops, manifestVersion, onVerificationChange, sequenceSignature, trip]);

  if (!trip) {
    return (
      <div className="workspace-panel loader-empty-state">
        <LockKeyhole size={30} aria-hidden="true" />
        <strong>No released trip selected for {depot}</strong>
        <span>Return to the staging queue and choose a trip from this depot.</span>
        <Button onClick={onBack} variant="outline">Return to staging queue</Button>
      </div>
    );
  }

  const activeTrip = trip;

  const rawTotals = totals(trip);
  const tripDiscrepancies = discrepancies.filter((record) => record.tripId === trip.id);
  const blockingDiscrepancies = tripDiscrepancies.filter(isIssueBlocking);
  const totalKgLoss = tripDiscrepancies.reduce((sum, record) => sum + record.kgImpact, 0);
  const totalM3Loss = Number(
    tripDiscrepancies.reduce((sum, record) => sum + record.m3Impact, 0).toFixed(2)
  );
  const adjustedTotals = {
    kg: Math.max(0, rawTotals.kg - totalKgLoss),
    m3: Number(Math.max(0, rawTotals.m3 - totalM3Loss).toFixed(2)),
  };

  const weightPercent = vehicle ? Math.round((adjustedTotals.kg / vehicle.kg) * 100) : 0;
  const volumePercent = vehicle ? Math.round((adjustedTotals.m3 / vehicle.m3) * 100) : 0;
  const capacityValid = Boolean(
    vehicle && adjustedTotals.kg <= vehicle.kg && adjustedTotals.m3 <= vehicle.m3
  );
  const temperatureValid = Boolean(
    vehicle && (!tripOrders.some((order) => order.chilled) || vehicle.chilled)
  );
  const accessValid = Boolean(
    vehicle && (!tripOrders.some((order) => order.vanOnly) || vehicle.type === "Van")
  );
  const depotValid = Boolean(
    vehicle &&
    vehicle.depot === depot &&
    !vehicle.workshop &&
    trip.depot === depot &&
    tripOrders.every((order) => order.depot === depot)
  );
  const routeGroupValid =
    new Set(tripOrders.map((order) => order.brand)).size <= 1 &&
    new Set(tripOrders.map((order) => order.district)).size <= 1 &&
    new Set(trip.orderIds).size === trip.orderIds.length;
  const constraintsValid =
    capacityValid && temperatureValid && accessValid && depotValid && routeGroupValid;
  const allVerified =
    tripOrders.length > 0 && tripOrders.every((order) => checkedStops.includes(order.id));
  const revisionAcknowledged = !revisionAlert?.active;
  const issuesResolved = blockingDiscrepancies.length === 0;
  const canClear = allVerified && revisionAcknowledged && issuesResolved && constraintsValid && !isCleared;

  const filteredStops = lifoOrderedStops.filter((order) => {
    const checked = checkedStops.includes(order.id);
    if (filter === "verified") return checked;
    if (filter === "pending") return !checked;
    return true;
  });

  function toggleSkuCheck(orderId: string, skuCode: string, totalOrderSkus: number) {
    const key = `${orderId}-${skuCode}`;
    const nextMap = { ...checkedSkus, [key]: !checkedSkus[key] };
    const checkedCount = Object.keys(nextMap).filter(
      (item) => item.startsWith(`${orderId}-`) && nextMap[item]
    ).length;
    onVerificationChange({
      checkedSkus: nextMap,
      checkedStops:
        checkedCount < totalOrderSkus
          ? checkedStops.filter((id) => id !== orderId)
          : checkedStops,
    });
  }

  function toggleStopVerification(order: Order) {
    const isVerified = checkedStops.includes(order.id);
    if (isVerified) {
      onVerificationChange({
        checkedSkus,
        checkedStops: checkedStops.filter((id) => id !== order.id),
      });
      return;
    }

    const skus = generateSkusForOrder(order);
    const allSkusChecked = skus.every((item) => checkedSkus[`${order.id}-${item.sku}`]);
    if (!allSkusChecked) return;
    onVerificationChange({
      checkedSkus,
      checkedStops: [...checkedStops, order.id],
    });
    setChangedOrderIds((current) => current.filter((id) => id !== order.id));
  }

  function handleResetVerification() {
    onVerificationChange({ checkedStops: [], checkedSkus: {} });
  }

  function handleOpenDiscrepancy(
    order: Order,
    skuItem?: ReturnType<typeof generateSkusForOrder>[number]
  ) {
    setTargetOrder(order);
    setSelectedSku(skuItem?.sku ?? "");
    setItemDescription(skuItem?.name ?? `${order.brand} items`);
    setQuantity(1);
    setNotes("");
    setDialogOpen(true);
  }

  function handleSubmitDiscrepancy(event: React.FormEvent) {
    event.preventDefault();
    if (!targetOrder) return;
    const selectedItem = generateSkusForOrder(targetOrder).find(
      (item) => item.sku === selectedSku
    );
    const fallbackUnitCount = targetOrder.brand === "Tech" ? 10 : 25;
    const kgImpact = Math.min(
      targetOrder.kg,
      Math.round((selectedItem?.unitKg ?? targetOrder.kg / fallbackUnitCount) * quantity)
    );
    const m3Impact = Math.min(
      targetOrder.m3,
      Number(
        ((selectedItem?.unitM3 ?? targetOrder.m3 / fallbackUnitCount) * quantity).toFixed(2)
      )
    );
    const newRecord: DiscrepancyRecord = {
      id: `DISC-${Date.now().toString().slice(-6)}`,
      tripId: activeTrip.id,
      orderId: targetOrder.id,
      outlet: targetOrder.outlet,
      depot,
      vehicleId: activeTrip.vehicleId,
      type: discrepancyType,
      quantity,
      itemDescription,
      skuCode: selectedSku || undefined,
      kgImpact,
      m3Impact,
      notes: notes.trim(),
      reportedBy: "LOAD001 (Warehouse Dock)",
      timestamp: new Date().toLocaleTimeString("en-GB", {
        timeZone: "Asia/Colombo",
        hour: "2-digit",
        minute: "2-digit",
      }),
      resolution: "pending",
    };
    onVerificationChange({
      checkedStops: checkedStops.filter((id) => id !== targetOrder.id),
      checkedSkus: selectedSku
        ? { ...checkedSkus, [`${targetOrder.id}-${selectedSku}`]: false }
        : checkedSkus,
    });
    onAddDiscrepancy(newRecord);
    setDialogOpen(false);
  }

  function handleConfirmDepartureClearance() {
    const clearance: ClearanceRecord = {
      tripId: activeTrip.id,
      vehicleId: activeTrip.vehicleId,
      clearedAt: new Date().toLocaleTimeString("en-GB", {
        timeZone: "Asia/Colombo",
        hour: "2-digit",
        minute: "2-digit",
      }),
      clearedBy: "LOAD001 (Warehouse Loading Team)",
      totalStops: tripOrders.length,
      finalKg: adjustedTotals.kg,
      finalM3: adjustedTotals.m3,
      exceptionsCount: tripDiscrepancies.length,
    };
    onClearDeparture(activeTrip.id, clearance);
    setClearanceModalOpen(false);
  }

  const clearanceChecks = [
    { label: "Published trip matches depot and vehicle constraints", pass: constraintsValid },
    { label: "Latest manifest change acknowledged", pass: revisionAcknowledged },
    { label: "Every stop and SKU physically verified", pass: allVerified },
    { label: "No unresolved dispatch hold", pass: issuesResolved },
  ];

  return (
    <div className="loader-page-stack">
      <section className="workspace-panel loader-manifest-header">
        <div>
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft size={15} aria-hidden="true" />
            Staging queue
          </Button>
          <div>
            <span className="loader-eyebrow">{trip.id} · {manifestVersion}</span>
            <h2>{trip.vehicleId} loading checklist</h2>
            <p>{vehicle?.type} · {vehicle?.chilled ? "Refrigerated" : "Ambient"} · Planned departure {formatTime(trip.departure)}</p>
          </div>
        </div>
        <span className="loader-status-badge" data-status={isCleared ? "cleared" : canClear ? "ready" : "blocked"}>
          {isCleared ? "Departure cleared" : canClear ? "Ready for clearance" : "Clearance locked"}
        </span>
      </section>

      <section className="loader-lifo-banner" aria-label="LIFO loading instruction">
        <PackageCheck size={20} aria-hidden="true" />
        <div>
          <strong>Load in reverse delivery order</strong>
          <span>Load the final delivery stop first at the front of the cargo bay. Load Stop 1 last, nearest the rear door.</span>
        </div>
      </section>

      {revisionAlert?.active && (
        <section className="loader-revision-alert" role="alert">
          <AlertTriangle size={20} aria-hidden="true" />
          <div>
            <strong>Previous load sheet is void · {revisionAlert.previousVersion} → {revisionAlert.newVersion}</strong>
            <span>{revisionAlert.reason} Reorder the affected cargo and re-verify the marked stops.</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRevisionAlert({ ...revisionAlert, active: false })}>
            Acknowledge update
          </Button>
        </section>
      )}

      <div className="loader-manifest-layout">
        <aside className="workspace-panel loader-clearance-panel" aria-labelledby="clearance-gate-title">
          <div className="workspace-panel-heading">
            <div>
              <span className="loader-eyebrow">Final gate</span>
              <h2 id="clearance-gate-title">Departure clearance</h2>
            </div>
          </div>

          <div className="loader-clearance-body">
            <div className="loader-capacity-grid">
              <div>
                <span><b>Weight</b><em>{adjustedTotals.kg} / {vehicle?.kg ?? 0} kg</em></span>
                <progress max="100" value={Math.min(weightPercent, 100)} />
                {totalKgLoss > 0 && <small>Reduced by {totalKgLoss} kg after reported issues</small>}
              </div>
              <div>
                <span><b>Volume</b><em>{adjustedTotals.m3} / {vehicle?.m3 ?? 0} m³</em></span>
                <progress max="100" value={Math.min(volumePercent, 100)} />
                {totalM3Loss > 0 && <small>Reduced by {totalM3Loss} m³ after reported issues</small>}
              </div>
            </div>

            <ul className="loader-clearance-checks">
              {clearanceChecks.map((check) => (
                <li key={check.label} data-pass={check.pass}>
                  {check.pass ? <CheckCircle2 size={17} aria-hidden="true" /> : <Circle size={17} aria-hidden="true" />}
                  <span>{check.label}</span>
                </li>
              ))}
            </ul>

            {blockingDiscrepancies.length > 0 && (
              <div className="loader-inline-alert" role="status">
                <AlertTriangle size={17} aria-hidden="true" />
                <span>{blockingDiscrepancies.length} issue{blockingDiscrepancies.length === 1 ? "" : "s"} still require Dispatch action.</span>
              </div>
            )}

            <Button
              className="loader-clearance-button"
              disabled={!canClear}
              onClick={() => setClearanceModalOpen(true)}
            >
              <ShieldCheck size={17} aria-hidden="true" />
              {isCleared ? "Departure cleared" : "Clear vehicle for departure"}
            </Button>
            <p>Clearing locks this manifest, updates Dispatch, and releases the trip to the driver.</p>
          </div>
        </aside>

        <section className="workspace-panel loader-checklist-panel" aria-labelledby="lifo-checklist-title">
          <div className="workspace-panel-heading loader-checklist-heading">
            <div>
              <h2 id="lifo-checklist-title">LIFO stop checklist</h2>
              <span>{checkedStops.length} of {tripOrders.length} stops verified · physical loading order shown below</span>
            </div>
            <div className="loader-checklist-controls">
              <div className="loader-segmented" aria-label="Filter loading checklist">
                {(["all", "pending", "verified"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {value === "all" ? "All stops" : value === "pending" ? "Not verified" : "Verified"}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={handleResetVerification} disabled={isCleared}>
                Reset checks
              </Button>
            </div>
          </div>

          <div className="loader-stop-list">
            {filteredStops.map((order, loadIndex) => {
              const deliveryStopNumber = tripOrders.findIndex((item) => item.id === order.id) + 1;
              const verified = checkedStops.includes(order.id);
              const expanded = expandedStops[order.id] ?? true;
              const stopIssues = tripDiscrepancies.filter((record) => record.orderId === order.id);
              const skus = generateSkusForOrder(order);
              const allSkusChecked = skus.every((item) => checkedSkus[`${order.id}-${item.sku}`]);
              const changed = changedOrderIds.includes(order.id);
              const cargoPosition = loadIndex === 0 ? "Front of cargo bay" : loadIndex === lifoOrderedStops.length - 1 ? "Nearest rear door" : "Middle bay";

              return (
                <article className="loader-stop-card" data-verified={verified} data-changed={changed} key={order.id}>
                  <button
                    type="button"
                    className="loader-stop-summary"
                    aria-expanded={expanded}
                    onClick={() => setExpandedStops((current) => ({ ...current, [order.id]: !expanded }))}
                  >
                    <span className="loader-load-step">
                      <b>Load {loadIndex + 1}</b>
                      <small>of {lifoOrderedStops.length}</small>
                    </span>
                    <span className="loader-stop-copy">
                      <span>
                        <strong>{order.outlet}</strong>
                        {order.chilled && <em>Chilled</em>}
                        {changed && <em>Re-sequence</em>}
                      </span>
                      <small>Delivery Stop {deliveryStopNumber} · {cargoPosition} · {order.id}</small>
                    </span>
                    <span className="loader-stop-toggle">
                      {verified && <CheckCircle2 size={17} aria-label="Verified" />}
                      {expanded ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
                    </span>
                  </button>

                  {expanded && (
                    <div className="loader-stop-body">
                      <dl className="loader-stop-facts">
                        <div><dt>Delivery window</dt><dd>{formatTime(order.window[0])}–{formatTime(order.window[1])}</dd></div>
                        <div><dt>Route group</dt><dd>{order.brand} · {order.district}</dd></div>
                        <div><dt>Order payload</dt><dd>{order.kg} kg · {order.m3} m³</dd></div>
                        <div><dt>Load position</dt><dd>{cargoPosition}</dd></div>
                      </dl>

                      {stopIssues.map((record) => (
                        <div className="loader-inline-alert" role="status" key={record.id}>
                          <AlertTriangle size={16} aria-hidden="true" />
                          <span>{record.quantity} × {record.itemDescription} · {record.resolution === "pending" ? "Waiting on Dispatch" : record.resolution.replaceAll("_", " ")}</span>
                        </div>
                      ))}

                      <div className="loader-sku-list">
                        {skus.map((item) => {
                          const skuKey = `${order.id}-${item.sku}`;
                          const skuChecked = checkedSkus[skuKey] ?? false;
                          return (
                            <div className="loader-sku-row" data-checked={skuChecked} key={item.sku}>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={skuChecked}
                                  disabled={isCleared}
                                  onChange={() => toggleSkuCheck(order.id, item.sku, skus.length)}
                                />
                                <span>
                                  <b>{item.name}</b>
                                  <small>{item.sku} · {item.qty} {item.unit} · {item.temp}</small>
                                </span>
                              </label>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isCleared}
                                onClick={() => handleOpenDiscrepancy(order, item)}
                              >
                                Report issue
                              </Button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="loader-stop-actions">
                        <span>{allSkusChecked ? "All SKU lines checked" : "Check every SKU line before confirming this stop"}</span>
                        <Button
                          variant={verified ? "outline" : "default"}
                          disabled={(!allSkusChecked && !verified) || isCleared}
                          onClick={() => toggleStopVerification(order)}
                        >
                          <Check size={15} aria-hidden="true" />
                          {verified ? "Undo stop verification" : "Confirm stop loaded"}
                        </Button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="dispatch-dialog sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Report a pre-departure issue</DialogTitle>
            <DialogDescription>
              Record the physical problem. Dispatch—not the loader—will choose whether to ship partial, replace stock, or defer the order.
            </DialogDescription>
          </DialogHeader>
          {targetOrder && (
            <form onSubmit={handleSubmitDiscrepancy} className="loader-issue-form">
              <div className="loader-form-context">
                <strong>{targetOrder.outlet}</strong>
                <span>{targetOrder.id} · {trip.id} · {trip.vehicleId}</span>
              </div>

              <label>
                Issue type
                <select
                  value={discrepancyType}
                  onChange={(event) => setDiscrepancyType(event.target.value as DiscrepancyRecord["type"])}
                >
                  <option value="missing">Missing inventory</option>
                  <option value="damaged">Damaged packaging</option>
                  <option value="temperature_breach">Temperature breach</option>
                </select>
              </label>

              <div className="loader-form-grid">
                <label>
                  Item
                  <input value={itemDescription} onChange={(event) => setItemDescription(event.target.value)} required />
                </label>
                <label>
                  Quantity affected
                  <input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} required />
                </label>
              </div>

              <label>
                Loader note
                <textarea rows={3} placeholder="Describe what you observed" value={notes} onChange={(event) => setNotes(event.target.value)} />
              </label>

              <div className="loader-form-actions">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Report and notify Dispatch</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={clearanceModalOpen} onOpenChange={setClearanceModalOpen}>
        <DialogContent className="dispatch-dialog sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Confirm departure clearance</DialogTitle>
            <DialogDescription>
              This locks the verified manifest and releases it to the driver.
            </DialogDescription>
          </DialogHeader>
          <div className="loader-clearance-confirm">
            <dl className="loader-detail-list">
              <div><dt>Trip</dt><dd>{trip.id}</dd></div>
              <div><dt>Vehicle</dt><dd>{trip.vehicleId}</dd></div>
              <div><dt>Stops verified</dt><dd>{tripOrders.length}</dd></div>
              <div><dt>Final payload</dt><dd>{adjustedTotals.kg} kg · {adjustedTotals.m3} m³</dd></div>
              <div><dt>Exception records</dt><dd>{tripDiscrepancies.length}</dd></div>
            </dl>
            <div className="loader-form-actions">
              <Button variant="outline" onClick={() => setClearanceModalOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmDepartureClearance}>Confirm and release</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
