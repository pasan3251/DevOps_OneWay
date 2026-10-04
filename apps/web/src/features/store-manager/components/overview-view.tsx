"use client";

import { useState } from "react";
import {
  Clock,
  Truck,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Store,
  Phone,
  FileCheck,
  ShieldAlert,
  Snowflake,
  Sun,
  ChevronRight,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PodModal } from "./pod-modal";
import { DiscrepancyModal } from "./discrepancy-modal";
import type {
  StoreOverviewData,
  StoreDeliveryCard,
  StoreOrder,
} from "../store-manager-api";

interface OverviewViewProps {
  data: StoreOverviewData;
  onNavigateToNewOrder: () => void;
  onNavigateToOrders: () => void;
  onSelectOrder: (order: StoreOrder) => void;
  onRefresh: () => void;
}

export function OverviewView({
  data,
  onNavigateToNewOrder,
  onNavigateToOrders,
  onSelectOrder,
  onRefresh,
}: OverviewViewProps) {
  const { outlet, cutoff, activeCounts, recentOrders, inboundDeliveries } = data;

  const [selectedPodDelivery, setSelectedPodDelivery] = useState<StoreDeliveryCard | null>(null);
  const [selectedDiscrepancyDelivery, setSelectedDiscrepancyDelivery] = useState<StoreDeliveryCard | null>(null);

  return (
    <div className="space-y-6">
      {/* 1. Store Header & Operational Context Banner */}
      <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-secondary border border-border flex items-center justify-center text-primary shrink-0">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{outlet.name}</h1>
              <Badge
                variant="outline"
                className="bg-secondary text-secondary-foreground border-border"
              >
                {outlet.brand} Retail
              </Badge>
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {outlet.code}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1.5 flex-wrap">
              <span>{outlet.address}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Delivery Window: <strong className="text-foreground">{outlet.deliveryWindow}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {outlet.contactPhone}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={onNavigateToNewOrder}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-2 text-sm h-10 px-4"
          >
            <PlusCircle className="h-4 w-4" />
            Create Replenishment Order
          </Button>
        </div>
      </div>

      {/* 2. Operational 16:00 Cutoff Countdown & Action Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-card border-border">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Daily Order Cutoff Protocol (SM-ORD-001)
                </span>
              </div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                {cutoff.isPastCutoff ? (
                  <>
                    <span className="text-destructive">Cutoff Locked (16:00 Passed)</span>
                  </>
                ) : (
                  <>
                    <span className="text-foreground">
                      {Math.floor(cutoff.minutesToCutoff / 60)}h {cutoff.minutesToCutoff % 60}m
                    </span>{" "}
                    Remaining Before Cutoff
                  </>
                )}
              </h2>
              <p className="text-xs text-muted-foreground max-w-xl">{cutoff.message}</p>
            </div>

            <div className="bg-muted/80 border border-border rounded-lg p-3 shrink-0 flex flex-col items-center justify-center text-center sm:w-44">
              <span className="text-[11px] text-muted-foreground">Target Delivery Date</span>
              <span className="text-sm font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {cutoff.nextDeliveryDate}
              </span>
              <Badge
                variant="outline"
                className="mt-1.5 text-[10px] bg-secondary text-secondary-foreground border-border"
              >
                {cutoff.isPastCutoff ? "Queued Run (T+2)" : "Next-Day Run (T+1)"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Peliyagoda Hub Supply Info */}
        <Card className="bg-card border-border">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Fulfillment Depot
              </span>
              <h3 className="text-base font-bold text-foreground">{outlet.depotName}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Single Central Hub (Peliyagoda) managing route sequencing, LIFO vehicle loading, and fleet departures.
              </p>
            </div>
            <div className="mt-3 text-xs text-muted-foreground flex items-center justify-between border-t border-border pt-2">
              <span>District Route:</span>
              <span className="font-semibold text-foreground">{outlet.district} Zone</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Inbound Shipments Section (Supports ALT-1 Dual-Split Delivery ETAs) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Today&apos;s Inbound Shipments &amp; Dock Schedule
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {inboundDeliveries.length} vehicle(s) scheduled for this outlet
          </span>
        </div>

        {inboundDeliveries.length === 0 ? (
          <div className="p-8 text-center bg-card rounded-xl border border-border text-muted-foreground text-xs">
            No inbound delivery runs scheduled for today.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inboundDeliveries.map((delivery) => {
              const isChilled = delivery.tempRequirement === 'chilled';
              const isDelivered = delivery.status === 'DELIVERED';
              const isInTransit = delivery.status === 'IN_TRANSIT';

              return (
                <Card
                  key={delivery.tripStopId}
                  className={`border transition-all ${
                    isDelivered
                      ? 'bg-card/40 border-border'
                      : isInTransit
                      ? 'bg-secondary/40 border-border'
                      : 'bg-card border-border'
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-muted text-foreground border border-border">
                          {isChilled ? <Snowflake className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-semibold text-sm text-foreground">
                              {isChilled ? 'Chilled Reefer Cargo' : 'Ambient Dry Cargo'}
                            </h4>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                isDelivered
                                  ? 'bg-secondary text-secondary-foreground border-border'
                                  : isInTransit
                                  ? 'bg-secondary text-foreground border-border animate-pulse'
                                  : 'bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              {delivery.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">
                            Order {delivery.orderNumber}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block">Planned ETA</span>
                        <span className="text-sm font-bold text-foreground font-mono">
                          {delivery.plannedArrivalTime || '10:00'}
                        </span>
                      </div>
                    </div>

                    {/* Carrier & Driver Details */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-muted/60 rounded border border-border text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Vehicle Plate</span>
                        <span className="font-medium text-foreground">{delivery.vehiclePlate}</span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">{delivery.vehicleType}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Assigned Driver</span>
                        <span className="font-medium text-foreground">{delivery.driverName}</span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">{delivery.driverPhone}</span>
                      </div>
                    </div>

                    {/* Weight & Item Rollup */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                      <span>Total Consignment:</span>
                      <span className="font-semibold text-foreground">
                        {delivery.totalItemsCount} units ({delivery.totalWeightKg} kg)
                      </span>
                    </div>

                    {/* Contextual Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                      {delivery.proofOfDelivery ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedPodDelivery(delivery)}
                          className="h-8 text-xs border-border text-foreground hover:bg-muted gap-1.5"
                        >
                          <FileCheck className="h-3.5 w-3.5" />
                          View POD Receipt
                        </Button>
                      ) : null}

                      {isDelivered && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDiscrepancyDelivery(delivery)}
                          className="h-8 text-xs border-destructive text-destructive hover:bg-destructive/10 gap-1.5"
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          Report Discrepancy
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Active Orders Status KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground block">Pending Cutoff</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-foreground">{activeCounts.recorded}</span>
              <span className="text-xs text-foreground font-semibold">Active</span>
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 block">Scheduled for next run</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground block">Queued Next Run</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-foreground">{activeCounts.queued}</span>
              <span className="text-xs text-muted-foreground">Post-Cutoff</span>
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 block">Held for subsequent dispatch</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground block">In Transit</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-foreground">{activeCounts.inTransit}</span>
              <span className="text-xs text-foreground font-semibold">En Route</span>
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 block">Carriers on the road</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground block">Delivered Today</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-foreground">{activeCounts.delivered}</span>
              <span className="text-xs text-foreground font-semibold">Complete</span>
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 block">Received at dock</span>
          </CardContent>
        </Card>
      </div>

      {/* 5. Recent Orders Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Recent Replenishment Orders</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToOrders}
            className="text-xs text-foreground hover:bg-muted gap-1 h-8"
          >
            View All Orders
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted border-b border-border text-muted-foreground uppercase font-medium text-[11px]">
                <tr>
                  <th className="py-3 px-4">Order Number</th>
                  <th className="py-3 px-4">Target Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Quantity / Weight</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => onSelectOrder(order)}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-foreground">
                      {order.orderNumber}
                    </td>
                    <td className="py-3 px-4">{order.orderDate}</td>
                    <td className="py-3 px-4">
                      <span className="capitalize">{order.tempRequirement}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {order.totalItemsCount} pkgs ({order.totalWeightKg} kg)
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-secondary text-secondary-foreground border-border"
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PodModal
        isOpen={!!selectedPodDelivery}
        onClose={() => setSelectedPodDelivery(null)}
        orderNumber={selectedPodDelivery?.orderNumber || ''}
        vehiclePlate={selectedPodDelivery?.vehiclePlate || ''}
        pod={selectedPodDelivery?.proofOfDelivery || null}
      />

      <DiscrepancyModal
        isOpen={!!selectedDiscrepancyDelivery}
        onClose={() => setSelectedDiscrepancyDelivery(null)}
        delivery={selectedDiscrepancyDelivery}
        onClaimSubmitted={() => {
          setSelectedDiscrepancyDelivery(null);
          onRefresh();
        }}
      />
    </div>
  );
}
