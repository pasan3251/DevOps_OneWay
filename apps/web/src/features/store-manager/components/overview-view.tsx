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
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-5 rounded-xl border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-100">{outlet.name}</h1>
              <Badge
                variant="outline"
                className={
                  outlet.brand === 'Fresh'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : outlet.brand === 'Style'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                }
              >
                {outlet.brand} Retail
              </Badge>
              <span className="text-xs font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">
                {outlet.code}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-1.5 flex-wrap">
              <span>{outlet.address}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                Delivery Window: <strong className="text-slate-300">{outlet.deliveryWindow}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-slate-500" />
                {outlet.contactPhone}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={onNavigateToNewOrder}
            className="bg-sky-600 hover:bg-sky-500 text-white font-medium gap-2 shadow-lg shadow-sky-600/20 text-sm h-10 px-4"
          >
            <PlusCircle className="h-4 w-4" />
            Create Replenishment Order
          </Button>
        </div>
      </div>

      {/* 2. Operational 16:00 Cutoff Countdown & Action Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-slate-900/80 border-slate-800">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Daily Order Cutoff Protocol (SM-ORD-001)
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                {cutoff.isPastCutoff ? (
                  <>
                    <span className="text-rose-400">Cutoff Locked (16:00 Passed)</span>
                  </>
                ) : (
                  <>
                    <span className="text-amber-400">
                      {Math.floor(cutoff.minutesToCutoff / 60)}h {cutoff.minutesToCutoff % 60}m
                    </span>{" "}
                    Remaining Before Cutoff
                  </>
                )}
              </h2>
              <p className="text-xs text-slate-400 max-w-xl">{cutoff.message}</p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 shrink-0 flex flex-col items-center justify-center text-center sm:w-44">
              <span className="text-[11px] text-slate-500">Target Delivery Date</span>
              <span className="text-sm font-bold text-sky-400 mt-0.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {cutoff.nextDeliveryDate}
              </span>
              <Badge
                variant="outline"
                className={`mt-1.5 text-[10px] ${
                  cutoff.isPastCutoff
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                }`}
              >
                {cutoff.isPastCutoff ? "Queued Run (T+2)" : "Next-Day Run (T+1)"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Peliyagoda Hub Supply Info */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Fulfillment Depot
              </span>
              <h3 className="text-base font-bold text-slate-100">{outlet.depotName}</h3>
              <p className="text-xs text-slate-400 mt-1">
                Single Central Hub (Peliyagoda) managing route sequencing, LIFO vehicle loading, and fleet departures.
              </p>
            </div>
            <div className="mt-3 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
              <span>District Route:</span>
              <span className="font-semibold text-slate-200">{outlet.district} Zone</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Inbound Shipments Section (Supports ALT-1 Dual-Split Delivery ETAs) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-sky-400" />
            <h2 className="text-base font-bold text-slate-100">
              Today&apos;s Inbound Shipments &amp; Dock Schedule
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {inboundDeliveries.length} vehicle(s) scheduled for this outlet
          </span>
        </div>

        {inboundDeliveries.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-slate-500 text-xs">
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
                      ? 'bg-slate-900/40 border-slate-800'
                      : isInTransit
                      ? 'bg-sky-950/20 border-sky-500/40 shadow-sm shadow-sky-900/20'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-2 rounded-lg ${
                            isChilled
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {isChilled ? <Snowflake className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-semibold text-sm text-slate-100">
                              {isChilled ? 'Chilled Reefer Cargo' : 'Ambient Dry Cargo'}
                            </h4>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                isDelivered
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : isInTransit
                                  ? 'bg-sky-500/10 text-sky-400 border-sky-500/30 animate-pulse'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {delivery.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-slate-400 font-mono">
                            Order {delivery.orderNumber}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Planned ETA</span>
                        <span className="text-sm font-bold text-sky-400">
                          {delivery.plannedArrivalTime || '10:00'}
                        </span>
                      </div>
                    </div>

                    {/* Carrier & Driver Details */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-950/60 rounded border border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Vehicle Plate</span>
                        <span className="font-medium text-slate-200">{delivery.vehiclePlate}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{delivery.vehicleType}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Assigned Driver</span>
                        <span className="font-medium text-slate-200">{delivery.driverName}</span>
                        <span className="text-[10px] text-sky-400 block mt-0.5">{delivery.driverPhone}</span>
                      </div>
                    </div>

                    {/* Weight & Item Rollup */}
                    <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                      <span>Total Consignment:</span>
                      <span className="font-semibold text-slate-200">
                        {delivery.totalItemsCount} units ({delivery.totalWeightKg} kg)
                      </span>
                    </div>

                    {/* Contextual Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                      {delivery.proofOfDelivery ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedPodDelivery(delivery)}
                          className="h-8 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1.5"
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
                          className="h-8 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10 gap-1.5"
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
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4">
            <span className="text-xs text-slate-400 block">Pending Cutoff</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-100">{activeCounts.recorded}</span>
              <span className="text-xs text-emerald-400">Active</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Scheduled for next run</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4">
            <span className="text-xs text-slate-400 block">Queued Next Run</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-100">{activeCounts.queued}</span>
              <span className="text-xs text-amber-400">Post-Cutoff</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Held for subsequent dispatch</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4">
            <span className="text-xs text-slate-400 block">In Transit</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-sky-400">{activeCounts.inTransit}</span>
              <span className="text-xs text-sky-400">En Route</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Carriers on the road</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4">
            <span className="text-xs text-slate-400 block">Delivered Today</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-emerald-400">{activeCounts.delivered}</span>
              <span className="text-xs text-emerald-400">Complete</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Received at dock</span>
          </CardContent>
        </Card>
      </div>

      {/* 5. Recent Orders Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">Recent Replenishment Orders</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToOrders}
            className="text-xs text-sky-400 hover:text-sky-300 hover:bg-slate-800/60 gap-1 h-8"
          >
            View All Orders
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-medium text-[11px]">
                <tr>
                  <th className="py-3 px-4">Order Number</th>
                  <th className="py-3 px-4">Target Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Quantity / Weight</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => onSelectOrder(order)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-sky-400">
                      {order.orderNumber}
                    </td>
                    <td className="py-3 px-4">{order.orderDate}</td>
                    <td className="py-3 px-4">
                      <span className="capitalize">{order.tempRequirement}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {order.totalItemsCount} pkgs ({order.totalWeightKg} kg)
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          order.status === 'DELIVERED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : order.status === 'IN_TRANSIT'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                            : order.status === 'QUEUED_NEXT_RUN'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : order.status === 'CANCELLED'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-slate-100"
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
