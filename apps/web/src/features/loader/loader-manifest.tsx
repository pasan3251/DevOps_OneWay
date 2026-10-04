"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
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

export function generateSkusForOrder(order: Order) {
  if (order.brand === "Fresh") {
    if (order.chilled) {
      return [
        { sku: "SKU-CHL-01", name: "Dairy Crates", qty: Math.ceil((order.kg * 0.45) / 10), unit: "Crates", temp: "Chilled", unitKg: 10, unitM3: 0.05 },
        { sku: "SKU-CHL-02", name: "Chilled Meat & Poultry", qty: Math.ceil((order.kg * 0.35) / 12), unit: "Totes", temp: "Chilled", unitKg: 12, unitM3: 0.06 },
        { sku: "SKU-CHL-03", name: "Fresh Produce", qty: Math.ceil((order.kg * 0.2) / 8), unit: "Cartons", temp: "Chilled", unitKg: 8, unitM3: 0.04 },
      ];
    }
    return [
      { sku: "SKU-AMB-01", name: "Dry Groceries", qty: Math.ceil((order.kg * 0.6) / 15), unit: "Cartons", temp: "Ambient", unitKg: 15, unitM3: 0.08 },
      { sku: "SKU-AMB-02", name: "Bakery & Staples", qty: Math.ceil((order.kg * 0.4) / 10), unit: "Cartons", temp: "Ambient", unitKg: 10, unitM3: 0.05 },
    ];
  }
  if (order.brand === "Style") {
    return [
      { sku: "SKU-STY-01", name: "Footwear & Accessories", qty: Math.ceil((order.kg * 0.4) / 8), unit: "Boxes", temp: "Ambient", unitKg: 8, unitM3: 0.07 },
      { sku: "SKU-STY-02", name: "Apparel", qty: Math.ceil((order.kg * 0.6) / 12), unit: "Garment Packs", temp: "Ambient", unitKg: 12, unitM3: 0.1 },
    ];
  }
  return [
    { sku: "SKU-TCH-01", name: "Electronics & Displays", qty: Math.ceil((order.kg * 0.5) / 25), unit: "Heavy Crates", temp: "Ambient", unitKg: 25, unitM3: 0.15 },
    { sku: "SKU-TCH-02", name: "Accessories", qty: Math.ceil((order.kg * 0.5) / 15), unit: "Cartons", temp: "Ambient", unitKg: 15, unitM3: 0.09 },
  ];
}

export function LoaderManifest({
  plan,
  depot,
  selectedTripId,
  onBack,
  discrepancies,
  onAddDiscrepancy,
  onClearDeparture,
  isCleared,
}: {
  plan: Plan;
  depot: Depot;
  selectedTripId: string;
  onBack: () => void;
  discrepancies: DiscrepancyRecord[];
  onAddDiscrepancy: (record: DiscrepancyRecord) => void;
  onClearDeparture: (tripId: string, clearance: ClearanceRecord) => void;
  isCleared: boolean;
}) {
  const [checkedStops, setCheckedStops] = useState<string[]>([]);
  const [checkedSkus, setCheckedSkus] = useState<Record<string, boolean>>({});
  const [expandedStops, setExpandedStops] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | "pending" | "verified">("all");
  const [manifestVersion, setManifestVersion] = useState("v1.0");
  const [customOrderSequence, setCustomOrderSequence] = useState<string[] | null>(null);
  const [revisionAlert, setRevisionAlert] = useState<PlanRevisionAlert | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [clearanceModalOpen, setClearanceModalOpen] = useState(false);
  const [targetOrder, setTargetOrder] = useState<Order | null>(null);
  const [selectedSku, setSelectedSku] = useState<string>("");
  const [discrepancyType, setDiscrepancyType] = useState<"damaged" | "missing" | "temperature_breach">("missing");
  const [quantity, setQuantity] = useState(1);
  const [itemDescription, setItemDescription] = useState("Standard Cartons");
  const [notes, setNotes] = useState("");

  const trip =
    plan.trips.find((t) => t.id === selectedTripId) ||
    plan.trips.find((t) => t.depot === depot);

  if (!trip) {
    return (
      <div className="workspace-panel p-8 text-center">
        <p className="text-muted-foreground text-sm">No active trip selected for this depot.</p>
        <Button onClick={onBack} variant="outline" className="mt-4">Return to queue</Button>
      </div>
    );
  }

  const vehicle = vehicles.find((v) => v.id === trip.vehicleId);
  const activeOrderIds = customOrderSequence ?? trip.orderIds;
  const tripOrders = activeOrderIds.map((id) => orders.find((o) => o.id === id)!).filter(Boolean);
  const rawTotals = totals(trip);

  const tripDiscrepancies = discrepancies.filter((d) => d.tripId === trip.id);
  const totalKgLoss = tripDiscrepancies.reduce((sum, d) => sum + d.kgImpact, 0);
  const totalM3Loss = Number(tripDiscrepancies.reduce((sum, d) => sum + d.m3Impact, 0).toFixed(2));

  const adjustedTotals = {
    kg: Math.max(0, rawTotals.kg - totalKgLoss),
    m3: Number(Math.max(0, rawTotals.m3 - totalM3Loss).toFixed(1)),
  };

  // LIFO: reverse stop sequence for staging
  const lifoOrderedStops = useMemo(() => [...tripOrders].reverse(), [tripOrders]);

  function toggleStopCheck(order: Order) {
    const orderId = order.id;
    const isCurrentlyChecked = checkedStops.includes(orderId);
    const skus = generateSkusForOrder(order);
    if (isCurrentlyChecked) {
      setCheckedStops((c) => c.filter((id) => id !== orderId));
      setCheckedSkus((c) => {
        const next = { ...c };
        skus.forEach((s) => delete next[`${orderId}-${s.sku}`]);
        return next;
      });
    } else {
      setCheckedStops((c) => [...c, orderId]);
      setCheckedSkus((c) => {
        const next = { ...c };
        skus.forEach((s) => { next[`${orderId}-${s.sku}`] = true; });
        return next;
      });
    }
  }

  function toggleSkuCheck(orderId: string, skuCode: string, totalOrderSkus: number) {
    const key = `${orderId}-${skuCode}`;
    const nextState = !checkedSkus[key];
    const nextMap = { ...checkedSkus, [key]: nextState };
    setCheckedSkus(nextMap);
    const checkedCount = Object.keys(nextMap).filter((k) => k.startsWith(`${orderId}-`) && nextMap[k]).length;
    if (checkedCount === totalOrderSkus && !checkedStops.includes(orderId)) {
      setCheckedStops((c) => [...c, orderId]);
    } else if (checkedCount < totalOrderSkus && checkedStops.includes(orderId)) {
      setCheckedStops((c) => c.filter((id) => id !== orderId));
    }
  }

  function toggleExpand(orderId: string) {
    setExpandedStops((c) => ({ ...c, [orderId]: !c[orderId] }));
  }

  function handleVerifyAll() {
    setCheckedStops(tripOrders.map((o) => o.id));
    const allSkusMap: Record<string, boolean> = {};
    tripOrders.forEach((o) => {
      generateSkusForOrder(o).forEach((s) => { allSkusMap[`${o.id}-${s.sku}`] = true; });
    });
    setCheckedSkus(allSkusMap);
  }

  function handleResetAll() {
    setCheckedStops([]);
    setCheckedSkus({});
  }

  function handleSimulateRouteChange() {
    if (tripOrders.length < 2) return;
    const reordered = [...activeOrderIds];
    const temp = reordered[0];
    reordered[0] = reordered[1];
    reordered[1] = temp;
    const nextVer = manifestVersion === "v1.0"
      ? "v1.1"
      : `v1.${parseInt(manifestVersion.split(".")[1] || "1") + 1}`;
    setManifestVersion(nextVer);
    setCustomOrderSequence(reordered);
    const affectedIds = [reordered[0], reordered[1]];
    setCheckedStops((c) => c.filter((id) => !affectedIds.includes(id)));
    setRevisionAlert({
      active: true,
      previousVersion: manifestVersion,
      newVersion: nextVer,
      reason: "Dispatch altered stop sequence. Re-verify affected stops below.",
      changedOrderIds: affectedIds,
      timestamp: new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit" }),
    });
  }

  function handleAcknowledgeRevision() {
    setRevisionAlert(null);
  }

  function handleOpenDiscrepancy(order: Order, skuItem?: { sku: string; name: string }) {
    setTargetOrder(order);
    if (skuItem) {
      setSelectedSku(skuItem.sku);
      setItemDescription(skuItem.name);
    } else {
      setSelectedSku("");
      setItemDescription(`${order.brand} items`);
    }
    setQuantity(1);
    setNotes("");
    setDialogOpen(true);
  }

  function handleSubmitDiscrepancy(e: React.FormEvent) {
    e.preventDefault();
    if (!targetOrder || !trip) return;
    const unitWeight = targetOrder.kg / (targetOrder.brand === "Tech" ? 10 : 25);
    const unitVol = targetOrder.m3 / (targetOrder.brand === "Tech" ? 10 : 25);
    const kgImpact = Math.round(unitWeight * quantity);
    const m3Impact = Number((unitVol * quantity).toFixed(2));
    const newRecord: DiscrepancyRecord = {
      id: `DISC-${Date.now().toString().slice(-6)}`,
      tripId: trip.id,
      orderId: targetOrder.id,
      outlet: targetOrder.outlet,
      depot,
      vehicleId: trip.vehicleId,
      type: discrepancyType,
      quantity,
      itemDescription,
      skuCode: selectedSku || undefined,
      kgImpact,
      m3Impact,
      notes: notes.trim(),
      reportedBy: "LOAD001 (Warehouse Dock)",
      timestamp: new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit" }),
      resolution: "pending",
    };
    onAddDiscrepancy(newRecord);
    setDialogOpen(false);
  }

  function handleConfirmDepartureClearance() {
    if (!trip) return;
    const clearance: ClearanceRecord = {
      tripId: trip.id,
      vehicleId: trip.vehicleId,
      clearedAt: new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit" }),
      clearedBy: "LOAD001 (Warehouse Loading Team)",
      totalStops: tripOrders.length,
      finalKg: adjustedTotals.kg,
      finalM3: adjustedTotals.m3,
      exceptionsCount: tripDiscrepancies.length,
    };
    onClearDeparture(trip.id, clearance);
    setClearanceModalOpen(false);
  }

  const allVerified =
    tripOrders.length > 0 &&
    tripOrders.every((o) => checkedStops.includes(o.id)) &&
    !revisionAlert?.active;

  const weightPercent = vehicle ? Math.round((adjustedTotals.kg / vehicle.kg) * 100) : 0;
  const volumePercent = vehicle ? Math.round((adjustedTotals.m3 / vehicle.m3) * 100) : 0;

  const filteredStops = lifoOrderedStops.filter((order) => {
    const isChecked = checkedStops.includes(order.id);
    if (filter === "verified") return isChecked;
    if (filter === "pending") return !isChecked;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="workspace-panel">
        <div className="workspace-panel-heading">
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={onBack} className="flex items-center gap-1.5">
              <ArrowLeft size={15} /> Queue
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2>{trip.id} — Loading checklist</h2>
                {vehicle?.chilled && (
                  <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-semibold">Reefer</span>
                )}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {manifestVersion}
                </span>
                {isCleared && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    <CheckCircle2 size={10} /> Cleared
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {trip.vehicleId} · {vehicle?.type} · Departure {formatTime(trip.departure)} · {tripOrders.length} stops
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {tripDiscrepancies.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                <AlertTriangle size={11} /> {tripDiscrepancies.length} exception{tripDiscrepancies.length > 1 ? "s" : ""}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={handleSimulateRouteChange}
              title="Simulate a route change from dispatch"
            >
              <RefreshCw size={13} className="mr-1.5" />
              Simulate route change
            </Button>
            <Button
              size="sm"
              className={isCleared ? "bg-emerald-700 text-white cursor-default" : "dispatch-primary"}
              disabled={!allVerified || isCleared}
              onClick={() => setClearanceModalOpen(true)}
            >
              <ShieldCheck size={15} className="mr-1.5" />
              {isCleared ? "Cleared for departure" : "Clear for departure"}
            </Button>
          </div>
        </div>

        {/* Route change alert */}
        {revisionAlert?.active && (
          <div className="px-5 py-3 bg-amber-50 border-y border-amber-300 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-amber-900">
                Route revised — manifest updated to {revisionAlert.newVersion}
              </p>
              <p className="text-xs text-amber-800 mt-0.5">{revisionAlert.reason}</p>
            </div>
            <Button
              size="sm"
              className="bg-amber-700 hover:bg-amber-800 text-white text-xs whitespace-nowrap"
              onClick={handleAcknowledgeRevision}
            >
              Acknowledge
            </Button>
          </div>
        )}

        {/* Payload summary + progress */}
        <div className="px-5 py-3 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-border bg-muted/20 text-xs">
          <div>
            <div className="flex justify-between text-muted-foreground mb-1">
              <span>Weight</span>
              <span>
                <strong className="text-foreground">{adjustedTotals.kg}</strong> / {vehicle?.kg} kg
                {totalKgLoss > 0 && <span className="text-amber-600 ml-1">(-{totalKgLoss} kg)</span>}
              </span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${weightPercent > 95 ? "bg-red-500" : "bg-primary"}`}
                style={{ width: `${Math.min(weightPercent, 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-muted-foreground mb-1">
              <span>Volume</span>
              <span>
                <strong className="text-foreground">{adjustedTotals.m3}</strong> / {vehicle?.m3} m³
                {totalM3Loss > 0 && <span className="text-amber-600 ml-1">(-{totalM3Loss} m³)</span>}
              </span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${volumePercent > 95 ? "bg-red-500" : "bg-primary"}`}
                style={{ width: `${Math.min(volumePercent, 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-muted-foreground mb-1">
              <span>Stops verified</span>
              <span>
                <strong className="text-foreground">{checkedStops.length}</strong> / {tripOrders.length}
              </span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all"
                style={{ width: `${(checkedStops.length / (tripOrders.length || 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="px-5 py-2.5 border-b border-border flex items-center justify-between flex-wrap gap-2 text-xs bg-muted/10">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={`px-2.5 py-1 rounded font-medium ${filter === "all" ? "bg-primary text-white" : "hover:bg-muted"}`}
              onClick={() => setFilter("all")}
            >
              All ({lifoOrderedStops.length})
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded font-medium ${filter === "pending" ? "bg-primary text-white" : "hover:bg-muted"}`}
              onClick={() => setFilter("pending")}
            >
              Pending ({lifoOrderedStops.length - checkedStops.length})
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded font-medium ${filter === "verified" ? "bg-primary text-white" : "hover:bg-muted"}`}
              onClick={() => setFilter("verified")}
            >
              Verified ({checkedStops.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={handleVerifyAll} disabled={isCleared}>
              Verify all
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={handleResetAll} disabled={isCleared}>
              Reset
            </Button>
          </div>
        </div>

        {/* Stop checklist */}
        <div className="divide-y divide-border">
          {filteredStops.map((order, index) => {
            const originalStopNumber = tripOrders.findIndex((o) => o.id === order.id) + 1;
            const isChecked = checkedStops.includes(order.id);
            const isExpanded = expandedStops[order.id] ?? true;
            const stopExceptions = tripDiscrepancies.filter((d) => d.orderId === order.id);
            const isReordered = revisionAlert?.changedOrderIds.includes(order.id);
            const skus = generateSkusForOrder(order);

            return (
              <div
                key={order.id}
                className={`transition ${
                  isReordered
                    ? "bg-amber-50/40 border-l-4 border-l-amber-400"
                    : isChecked
                      ? "bg-emerald-50/20"
                      : ""
                }`}
              >
                <div className="px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div
                    className="flex items-start gap-3 cursor-pointer min-w-0"
                    onClick={() => toggleExpand(order.id)}
                  >
                    {/* Load order indicator */}
                    <div className="flex-shrink-0 flex flex-col items-center pt-0.5">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${isReordered ? "bg-amber-500" : isChecked ? "bg-emerald-600" : "bg-muted-foreground/30 !text-foreground"}`}>
                        {originalStopNumber}
                      </span>
                      <span className="text-[9px] text-muted-foreground mt-0.5 leading-none">Load {index + 1}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isExpanded ? <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />}
                        <span className="font-semibold text-foreground text-sm">{order.outlet}</span>
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{order.brand}</span>
                        {order.chilled && (
                          <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-medium">Chilled</span>
                        )}
                        {isReordered && (
                          <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-semibold">Re-sequenced</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span>{order.district}</span>
                        <span>·</span>
                        <span>Window: {formatTime(order.window[0])}–{formatTime(order.window[1])}</span>
                        <span>·</span>
                        <span>{order.kg} kg / {order.m3} m³</span>
                      </div>

                      {stopExceptions.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {stopExceptions.map((exc) => (
                            <div key={exc.id} className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                              <AlertCircle size={12} />
                              <span>{exc.quantity}× {exc.itemDescription} ({exc.type.replace("_", " ")}) — {exc.resolution === "pending" ? "Awaiting decision" : exc.resolution.replace("_", " ")}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => handleOpenDiscrepancy(order)}
                      disabled={isCleared}
                    >
                      <AlertTriangle size={12} className="mr-1 text-amber-500" />
                      Flag issue
                    </Button>
                    <Button
                      size="sm"
                      variant={isChecked ? "default" : "outline"}
                      className={`text-xs h-8 gap-1 ${isChecked ? "bg-emerald-600 hover:bg-emerald-700 text-white" : isReordered ? "border-amber-400 text-amber-700" : ""}`}
                      onClick={() => toggleStopCheck(order)}
                      disabled={isCleared}
                    >
                      <Check size={13} />
                      {isChecked ? "Verified" : isReordered ? "Re-verify" : "Verify"}
                    </Button>
                  </div>
                </div>

                {/* SKU item grid */}
                {isExpanded && (
                  <div className="px-14 pb-4 pt-0 bg-muted/10">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {skus.map((item) => {
                        const skuKey = `${order.id}-${item.sku}`;
                        const isSkuChecked = checkedSkus[skuKey] ?? false;
                        return (
                          <div
                            key={item.sku}
                            className={`p-2.5 rounded border text-xs flex items-center justify-between gap-2 cursor-pointer transition ${
                              isSkuChecked
                                ? "bg-emerald-50 border-emerald-300"
                                : "bg-card hover:border-primary/40"
                            }`}
                            onClick={() => { if (!isCleared) toggleSkuCheck(order.id, item.sku, skus.length); }}
                          >
                            <div>
                              <div className="font-semibold text-foreground">{item.sku}</div>
                              <div className="text-muted-foreground truncate max-w-[120px]">{item.name}</div>
                              <div className="text-foreground font-medium mt-0.5">{item.qty} {item.unit}</div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <input
                                type="checkbox"
                                checked={isSkuChecked}
                                disabled={isCleared}
                                onChange={() => toggleSkuCheck(order.id, item.sku, skus.length)}
                                className="w-4 h-4 rounded text-primary cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              />
                              {!isCleared && (
                                <button
                                  type="button"
                                  className="text-[10px] text-amber-600 underline hover:no-underline"
                                  onClick={(e) => { e.stopPropagation(); handleOpenDiscrepancy(order, item); }}
                                >
                                  Flag
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Issue reporting dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Report a staging issue</DialogTitle>
            <DialogDescription>
              Log damaged or missing items before departure. Dispatch will be notified immediately.
            </DialogDescription>
          </DialogHeader>
          {targetOrder && (
            <form onSubmit={handleSubmitDiscrepancy} className="space-y-4 pt-2">
              <div className="bg-muted p-3 rounded text-xs space-y-0.5">
                <div><strong>Outlet:</strong> {targetOrder.outlet} ({targetOrder.id})</div>
                <div><strong>Trip:</strong> {trip.id} · {trip.vehicleId}</div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Issue type</label>
                <select
                  value={discrepancyType}
                  onChange={(e) => setDiscrepancyType(e.target.value as "damaged" | "missing" | "temperature_breach")}
                  className="w-full text-sm bg-background border border-input rounded-md p-2"
                >
                  <option value="missing">Missing inventory</option>
                  <option value="damaged">Damaged packaging</option>
                  <option value="temperature_breach">Temperature breach</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1">Item description</label>
                  <input
                    type="text"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    className="w-full text-sm bg-background border border-input rounded-md p-2"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Quantity affected</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full text-sm bg-background border border-input rounded-md p-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Describe the issue observed…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-sm bg-background border border-input rounded-md p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" className="bg-destructive hover:bg-destructive/90 text-white">
                  Log issue
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Departure clearance modal */}
      <Dialog open={clearanceModalOpen} onOpenChange={setClearanceModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck size={20} /> Confirm departure clearance
            </DialogTitle>
            <DialogDescription>
              This locks the manifest and notifies the driver.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1 text-xs">
            <div className="p-3.5 bg-muted/50 rounded-lg border space-y-2">
              {[
                ["Trip", trip.id],
                ["Vehicle", `${trip.vehicleId} (${vehicle?.type})`],
                ["Stops staged", `${tripOrders.length} stops`],
                ["Final payload", `${adjustedTotals.kg} kg / ${adjustedTotals.m3} m³`],
                ...(tripDiscrepancies.length > 0
                  ? [["Exceptions logged", String(tripDiscrepancies.length)]]
                  : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setClearanceModalOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleConfirmDepartureClearance}
              >
                Confirm & release
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
