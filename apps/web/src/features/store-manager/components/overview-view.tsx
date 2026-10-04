"use client";

import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  PackagePlus,
  Snowflake,
  Sun,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { StoreOverviewData } from "../store-manager-api";
import {
  deliveryStatusMeta,
  formatDate,
  formatTime,
  friendlyDeferral,
  orderStatusMeta,
} from "../store-manager-format";

interface OverviewViewProps {
  data: StoreOverviewData;
  onNavigateToNewOrder: () => void;
  onNavigateToOrders: () => void;
  onNavigateToReceiving: () => void;
}

export function OverviewView({
  data,
  onNavigateToNewOrder,
  onNavigateToOrders,
  onNavigateToReceiving,
}: OverviewViewProps) {
  const { cutoff, activeCounts, recentOrders, inboundDeliveries, outlet } = data;
  const activeDeliveries = inboundDeliveries.filter(
    (delivery) => delivery.status !== "DELIVERED" && delivery.status !== "FAILED",
  );
  const attentionOrders = recentOrders.filter((order) => order.status === "DEFICIT_PENDING");
  const changedDeliveries = inboundDeliveries.filter(
    (delivery) => delivery.etaNotice || delivery.manifestNotice,
  );
  const metrics: Array<{ label: string; value: number; Icon: LucideIcon }> = [
    { label: "Awaiting Dispatch", value: activeCounts.recorded + activeCounts.queued, Icon: Clock3 },
    { label: "Planned / assigned", value: activeCounts.assigned, Icon: ClipboardCheck },
    { label: "Incoming vehicles", value: activeDeliveries.length, Icon: Truck },
    { label: "Deferred with reason", value: activeCounts.deferred || attentionOrders.length, Icon: AlertTriangle },
  ];

  return (
    <div className="store-page-stack">
      <section className="store-cutoff-card" aria-labelledby="cutoff-title">
        <div className="store-cutoff-icon"><CalendarClock size={22} aria-hidden="true" /></div>
        <div className="store-cutoff-copy">
          <span className="store-eyebrow">Daily order cycle</span>
          <h2 id="cutoff-title">
            {cutoff.isPastCutoff ? "Tomorrow’s order book is locked" : `${Math.floor(cutoff.minutesToCutoff / 60)}h ${cutoff.minutesToCutoff % 60}m before cutoff`}
          </h2>
          <p>{cutoff.message}</p>
        </div>
        <dl className="store-cutoff-facts">
          <div><dt>Colombo time</dt><dd>{cutoff.currentColomboTime}</dd></div>
          <div><dt>Earliest delivery</dt><dd>{formatDate(cutoff.nextDeliveryDate)}</dd></div>
        </dl>
        <button className="store-primary-button" type="button" onClick={onNavigateToNewOrder}>
          <PackagePlus size={17} aria-hidden="true" />
          Create order
        </button>
      </section>

      <section className="store-workflow" aria-labelledby="store-workflow-title">
        <div>
          <span className="store-eyebrow">Standard store flow</span>
          <h2 id="store-workflow-title">One order, one visible decision</h2>
        </div>
        <ol>
          <li><strong>1</strong><span>Submit before cutoff</span></li>
          <li><strong>2</strong><span>Receive ETA or reason</span></li>
          <li><strong>3</strong><span>Prepare receiving point</span></li>
          <li><strong>4</strong><span>Check POD or report issue</span></li>
        </ol>
      </section>

      <section className="store-summary-grid" aria-label="Store operations summary">
        {metrics.map(({ label, value, Icon }) => (
          <article className="store-stat-card" key={label}>
            <span className="store-stat-icon"><Icon size={18} aria-hidden="true" /></span>
            <span><small>{label}</small><strong>{value}</strong></span>
          </article>
        ))}
      </section>

      <div className="store-overview-grid">
        <section className="store-panel" aria-labelledby="arrivals-title">
          <header className="store-panel-heading">
            <div>
              <span className="store-eyebrow">Receiving readiness</span>
              <h2 id="arrivals-title">Next arrivals</h2>
              <p>{outlet.deliveryWindow} receiving window · {outlet.depotName}</p>
            </div>
            <button className="store-text-button" type="button" onClick={onNavigateToReceiving}>
              Open receiving <ArrowRight size={15} />
            </button>
          </header>

          {activeDeliveries.length === 0 ? (
            <div className="store-empty-state">
              <CheckCircle2 size={22} aria-hidden="true" />
              <strong>No vehicle is currently inbound</strong>
              <span>Published trips will appear here with their delivery window.</span>
            </div>
          ) : (
            <div className="store-arrival-list">
              {activeDeliveries.slice(0, 2).map((delivery) => {
                const status = deliveryStatusMeta[delivery.status];
                const TempIcon = delivery.tempRequirement === "chilled" ? Snowflake : Sun;
                return (
                  <article className="store-arrival-card" key={delivery.tripStopId}>
                    <div className="store-arrival-time">
                      <span>ETA</span>
                      <strong>{formatTime(delivery.plannedArrivalTime)}</strong>
                    </div>
                    <div className="store-arrival-copy">
                      <span className="store-status" data-tone={status.tone}>{status.label}</span>
                      <h3><TempIcon size={16} />{delivery.tempRequirement === "chilled" ? "Chilled" : "Ambient"} order</h3>
                      <p>{delivery.orderNumber} · {delivery.vehiclePlate}</p>
                    </div>
                    <dl>
                      <div><dt>Driver</dt><dd>{delivery.driverName}</dd></div>
                      <div><dt>Payload</dt><dd>{delivery.totalItemsCount} units · {delivery.totalWeightKg} kg</dd></div>
                    </dl>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="store-panel" aria-labelledby="attention-title">
          <header className="store-panel-heading">
            <div>
              <span className="store-eyebrow">Changes requiring awareness</span>
              <h2 id="attention-title">Attention</h2>
            </div>
          </header>
          <div className="store-attention-list">
            {attentionOrders.map((order) => (
              <article className="store-notice" data-tone="blocked" key={order.id}>
                <AlertTriangle size={18} aria-hidden="true" />
                <div>
                  <strong>{order.orderNumber} deferred</strong>
                  <p>{friendlyDeferral(order.deferralReason)}</p>
                  <small>Priority raised for the next planning run.</small>
                </div>
              </article>
            ))}
            {changedDeliveries.map((delivery) => (
              <article className="store-notice" data-tone="attention" key={`${delivery.tripStopId}-change`}>
                <Clock3 size={18} aria-hidden="true" />
                <div>
                  <strong>{delivery.orderNumber} updated</strong>
                  <p>{delivery.manifestNotice || delivery.etaNotice}</p>
                </div>
              </article>
            ))}
            {attentionOrders.length === 0 && changedDeliveries.length === 0 && (
              <div className="store-empty-state compact">
                <CheckCircle2 size={20} aria-hidden="true" />
                <strong>No new exceptions</strong>
                <span>Schedule and expected quantities are unchanged.</span>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="store-panel" aria-labelledby="recent-orders-title">
        <header className="store-panel-heading">
          <div>
            <span className="store-eyebrow">Order lifecycle</span>
            <h2 id="recent-orders-title">Recent orders</h2>
          </div>
          <button className="store-text-button" type="button" onClick={onNavigateToOrders}>
            View all orders <ArrowRight size={15} />
          </button>
        </header>
        <div className="store-recent-list">
          {recentOrders.slice(0, 4).map((order) => {
            const meta = orderStatusMeta[order.status];
            return (
              <button type="button" onClick={onNavigateToOrders} key={order.id}>
                <span><strong>{order.orderNumber}</strong><small>{formatDate(order.orderDate)} · {order.tempRequirement}</small></span>
                <span className="store-status" data-tone={meta.tone}>{meta.label}</span>
                <span>{order.totalItemsCount} units</span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
