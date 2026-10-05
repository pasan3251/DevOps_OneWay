"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  MapPin,
  LoaderCircle,
  ShieldAlert,
  Snowflake,
  Sun,
  Truck,
  UserRound,
} from "lucide-react";
import { DiscrepancyModal } from "./discrepancy-modal";
import { PodModal } from "./pod-modal";
import { storeApi, type StoreDeliveryCard } from "../store-manager-api";
import { deliveryStatusMeta, formatDate, formatTime } from "../store-manager-format";

interface DeliveriesViewProps {
  deliveries: StoreDeliveryCard[];
  outletWindow: string;
  onRefresh: () => void;
}

type DeliveryFilter = "ALL" | "INCOMING" | "DELIVERED" | "EXCEPTION";

const deliveryFilters: Array<{ id: DeliveryFilter; label: string }> = [
  { id: "ALL", label: "All movements" },
  { id: "INCOMING", label: "Incoming" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "EXCEPTION", label: "Exceptions" },
];

const progressSteps = ["SCHEDULED", "IN_TRANSIT", "ARRIVED", "DELIVERED"] as const;

export function DeliveriesView({ deliveries, outletWindow, onRefresh }: DeliveriesViewProps) {
  const [filter, setFilter] = useState<DeliveryFilter>("ALL");
  const [podDelivery, setPodDelivery] = useState<StoreDeliveryCard | null>(null);
  const [claimDelivery, setClaimDelivery] = useState<StoreDeliveryCard | null>(null);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState("");

  async function confirmReceipt(delivery: StoreDeliveryCard) {
    setReceivingId(delivery.tripStopId);
    setReceiptError("");
    try {
      await storeApi.confirmReceipt({
        orderId: delivery.orderId,
        tripStopId: delivery.tripStopId,
      });
      onRefresh();
    } catch (error) {
      setReceiptError(error instanceof Error ? error.message : "Receipt confirmation failed.");
    } finally {
      setReceivingId(null);
    }
  }

  const visibleDeliveries = useMemo(
    () => deliveries.filter((delivery) => {
      if (filter === "ALL") return true;
      if (filter === "INCOMING") return ["SCHEDULED", "IN_TRANSIT", "ARRIVED"].includes(delivery.status);
      if (filter === "DELIVERED") return delivery.status === "DELIVERED";
      return delivery.status === "FAILED" || Boolean(delivery.discrepancies?.length);
    }),
    [deliveries, filter],
  );

  const incoming = deliveries.filter((delivery) => ["SCHEDULED", "IN_TRANSIT", "ARRIVED"].includes(delivery.status));
  const changed = deliveries.filter((delivery) => delivery.etaNotice || delivery.manifestNotice);
  const claims = deliveries.reduce((total, delivery) => total + (delivery.discrepancies?.length || 0), 0);

  return (
    <div className="store-page-stack">
      <section className="store-task-header">
        <div>
          <span className="store-eyebrow">Arrival to confirmed handover</span>
          <h2>Receiving</h2>
          <p>Use one timeline for ETA changes, arrival, POD review, and physical discrepancy reporting.</p>
        </div>
        <div className="store-window-card"><Clock3 size={17} /><span><small>Receiving window</small><strong>{outletWindow}</strong></span></div>
      </section>

      <section className="store-summary-grid" aria-label="Receiving summary">
        <article className="store-stat-card"><span className="store-stat-icon"><Truck size={18} /></span><span><small>Incoming</small><strong>{incoming.length}</strong></span></article>
        <article className="store-stat-card"><span className="store-stat-icon"><Clock3 size={18} /></span><span><small>Schedule changes</small><strong>{changed.length}</strong></span></article>
        <article className="store-stat-card"><span className="store-stat-icon"><CheckCircle2 size={18} /></span><span><small>Received</small><strong>{deliveries.filter((delivery) => delivery.status === "DELIVERED").length}</strong></span></article>
        <article className="store-stat-card"><span className="store-stat-icon"><ShieldAlert size={18} /></span><span><small>Claims logged</small><strong>{claims}</strong></span></article>
      </section>

      {changed.length > 0 && (
        <section className="store-panel store-change-panel" aria-labelledby="receiving-changes-title">
          <header className="store-panel-heading">
            <div><span className="store-eyebrow">Since plan publication</span><h2 id="receiving-changes-title">Receiving changes</h2></div>
          </header>
          <div className="store-change-list">
            {changed.map((delivery) => (
              <article key={`${delivery.tripStopId}-notice`}>
                <AlertTriangle size={17} />
                <span><strong>{delivery.orderNumber} · {delivery.tempRequirement}</strong><small>{delivery.etaNotice || delivery.manifestNotice}</small>{delivery.etaNotice && delivery.manifestNotice && <small>{delivery.manifestNotice}</small>}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="store-panel store-receiving-panel" aria-labelledby="delivery-timeline-title">
        <header className="store-panel-heading">
          <div>
            <span className="store-eyebrow">Delivery timeline</span>
            <h2 id="delivery-timeline-title">{visibleDeliveries.length} movements</h2>
            <p>Fresh ambient and chilled orders remain separate movements when different vehicles are required.</p>
          </div>
          <div className="store-filter-pills" aria-label="Filter delivery movements">
            {deliveryFilters.map((item) => (
              <button key={item.id} type="button" data-selected={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>
            ))}
          </div>
        </header>

        {receiptError && <p className="store-inline-error" role="alert">{receiptError}</p>}

        {visibleDeliveries.length === 0 ? (
          <div className="store-empty-state"><Truck size={22} /><strong>No matching movements</strong><span>Published routes will appear here for receiving preparation.</span></div>
        ) : (
          <div className="store-delivery-list">
            {visibleDeliveries.map((delivery) => {
              const status = deliveryStatusMeta[delivery.status];
              const chilled = delivery.tempRequirement === "chilled";
              const activeStep = progressSteps.indexOf(delivery.status === "FAILED" ? "SCHEDULED" : delivery.status);
              const hasClaims = Boolean(delivery.discrepancies?.length);
              return (
                <article className="store-delivery-card" key={delivery.tripStopId} data-exception={delivery.status === "FAILED" || hasClaims}>
                  <header>
                    <div className="store-delivery-identity">
                      <span className="store-regime-icon">{chilled ? <Snowflake size={19} /> : <Sun size={19} />}</span>
                      <div><span className="store-eyebrow">{formatDate(delivery.operatingDate)} · Stop {delivery.stopSequence}</span><h3>{chilled ? "Chilled" : "Ambient"} delivery</h3><p>{delivery.orderNumber} · {delivery.tripNumber}</p></div>
                    </div>
                    <div className="store-delivery-eta"><small>Planned ETA</small><strong>{formatTime(delivery.plannedArrivalTime)}</strong><span className="store-status" data-tone={status.tone}>{status.label}</span></div>
                  </header>

                  <ol className="store-delivery-progress" aria-label={`${delivery.orderNumber} delivery progress`}>
                    {progressSteps.map((step, index) => (
                      <li key={step} data-state={delivery.status === "FAILED" ? "failed" : index < activeStep ? "complete" : index === activeStep ? "current" : "upcoming"}>
                        <span>{index < activeStep ? <CheckCircle2 size={15} /> : index + 1}</span>
                        <small>{step === "SCHEDULED" ? "Scheduled" : step === "IN_TRANSIT" ? "In transit" : step === "ARRIVED" ? "At store" : "Handover"}</small>
                      </li>
                    ))}
                  </ol>

                  <div className="store-delivery-facts">
                    <div><Truck size={16} /><span><small>Vehicle</small><strong>{delivery.vehiclePlate}</strong><em>{delivery.vehicleType.replaceAll("_", " ")}</em></span></div>
                    <div><UserRound size={16} /><span><small>Driver</small><strong>{delivery.driverName}</strong><em>{delivery.driverPhone}</em></span></div>
                    <div><MapPin size={16} /><span><small>Expected load</small><strong>{delivery.totalItemsCount} units</strong><em>{delivery.totalWeightKg} kg</em></span></div>
                  </div>

                  {(delivery.etaNotice || delivery.manifestNotice) && (
                    <div className="store-inline-notices">
                      {delivery.etaNotice && <p><Clock3 size={15} /><span><strong>ETA update</strong>{delivery.etaNotice}</span></p>}
                      {delivery.manifestNotice && <p><AlertTriangle size={15} /><span><strong>Manifest update</strong>{delivery.manifestNotice}</span></p>}
                    </div>
                  )}

                  {hasClaims && (
                    <div className="store-claims-list">
                      {delivery.discrepancies?.map((claim) => (
                        <div key={claim.id}>
                          <ShieldAlert size={16} />
                          <span><strong>{claim.claimNumber}</strong><small>{claim.discrepancyType.replaceAll("_", " ").toLowerCase()} · {claim.shortfallQty} affected</small></span>
                          <span className="store-status" data-tone="attention">{claim.status.replaceAll("_", " ").toLowerCase()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {delivery.receipt && (
                    <div className="store-inline-notices">
                      <p><CheckCircle2 size={15} /><span><strong>Receiving outcome</strong>{delivery.receipt.status === "CONFIRMED" ? "Receipt confirmed by the store." : "Receiving discrepancy submitted."}</span></p>
                    </div>
                  )}

                  <footer>
                    <p>
                      {delivery.status === "DELIVERED"
                        ? delivery.proofOfDelivery
                          ? `Handover recorded by ${delivery.proofOfDelivery.storeRepName}`
                          : "Delivery completed; proof is awaiting synchronization."
                        : delivery.status === "FAILED"
                          ? "Dispatch recorded a delivery exception."
                          : "Prepare the receiving point and verify physical quantities at handover."}
                    </p>
                    <div>
                      {delivery.proofOfDelivery && <button className="store-secondary-button" type="button" onClick={() => setPodDelivery(delivery)}><FileCheck2 size={15} /> View POD</button>}
                      {delivery.status === "DELIVERED" && !delivery.receipt && delivery.proofOfDelivery && !hasClaims && (
                        <button className="store-primary-button" type="button" disabled={receivingId === delivery.tripStopId} onClick={() => void confirmReceipt(delivery)}>
                          {receivingId === delivery.tripStopId ? <LoaderCircle className="loading-spinner" size={15} /> : <CheckCircle2 size={15} />} Confirm receipt
                        </button>
                      )}
                      {delivery.status === "DELIVERED" && !delivery.receipt && <button className="store-secondary-button" type="button" onClick={() => setClaimDelivery(delivery)}><ShieldAlert size={15} /> Report discrepancy</button>}
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <PodModal
        isOpen={Boolean(podDelivery)}
        onClose={() => setPodDelivery(null)}
        orderNumber={podDelivery?.orderNumber || ""}
        vehiclePlate={podDelivery?.vehiclePlate || ""}
        pod={podDelivery?.proofOfDelivery || null}
      />
      <DiscrepancyModal
        isOpen={Boolean(claimDelivery)}
        onClose={() => setClaimDelivery(null)}
        delivery={claimDelivery}
        onClaimSubmitted={() => {
          setClaimDelivery(null);
          onRefresh();
        }}
      />
    </div>
  );
}
