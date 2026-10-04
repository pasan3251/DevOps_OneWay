"use client";

import { useState } from "react";
import {
  Truck,
  FileCheck,
  ShieldAlert,
  Snowflake,
  Sun,
  MapPin,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PodModal } from "./pod-modal";
import { DiscrepancyModal } from "./discrepancy-modal";
import type { StoreDeliveryCard } from "../store-manager-api";

interface DeliveriesViewProps {
  deliveries: StoreDeliveryCard[];
  onRefresh: () => void;
}

export function DeliveriesView({ deliveries, onRefresh }: DeliveriesViewProps) {
  const [selectedPodDelivery, setSelectedPodDelivery] = useState<StoreDeliveryCard | null>(null);
  const [selectedDiscrepancyDelivery, setSelectedDiscrepancyDelivery] = useState<StoreDeliveryCard | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  const filtered = deliveries.filter((d) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'IN_TRANSIT') return d.status === 'IN_TRANSIT';
    if (filterType === 'DELIVERED') return d.status === 'DELIVERED';
    if (filterType === 'DISCREPANCY') return (d.discrepancies && d.discrepancies.length > 0);
    return true;
  });

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Inbound Deliveries &amp; Receiving</h1>
          <p className="text-xs text-slate-400">
            Real-time dock arrival schedule, driver carrier telemetry, and digital receiving sign-off.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {[
            { id: 'ALL', label: 'All Shipments' },
            { id: 'IN_TRANSIT', label: 'En Route' },
            { id: 'DELIVERED', label: 'Delivered at Dock' },
            { id: 'DISCREPANCY', label: 'With Claims' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilterType(pill.id)}
              className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${
                filterType === pill.id
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Shipments Cards */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/30 rounded-xl border border-slate-800 text-slate-500 text-xs">
          No inbound shipments matching the selected filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((delivery) => {
            const isChilled = delivery.tempRequirement === 'chilled';
            const isDelivered = delivery.status === 'DELIVERED';
            const isInTransit = delivery.status === 'IN_TRANSIT';
            const hasClaims = delivery.discrepancies && delivery.discrepancies.length > 0;

            return (
              <Card
                key={delivery.tripStopId}
                className={`border transition-all ${
                  hasClaims
                    ? 'bg-amber-950/10 border-amber-500/30'
                    : isDelivered
                    ? 'bg-slate-900/60 border-slate-800'
                    : 'bg-sky-950/20 border-sky-500/40 shadow-md shadow-sky-950/30'
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Top Row: Cargo Type & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          isChilled
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {isChilled ? <Snowflake className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-slate-100">
                            {isChilled ? 'Chilled Reefer Consignment' : 'Ambient Dry Consignment'}
                          </h3>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
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
                          Order #{delivery.orderNumber} • Stop Sequence #{delivery.stopSequence}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Trip Reference</span>
                        <span className="font-mono font-medium text-slate-300">{delivery.tripNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Planned Window</span>
                        <span className="font-bold text-sky-400">{delivery.plannedArrivalTime || '10:00 AM'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Grid: Logistics & Carrier Telematics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px] mb-0.5">Assigned Vehicle</span>
                      <span className="font-bold text-slate-200">{delivery.vehiclePlate}</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">{delivery.vehicleType}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px] mb-0.5">Fleet Driver</span>
                      <span className="font-bold text-slate-200">{delivery.driverName}</span>
                      <span className="text-[11px] text-sky-400 block mt-0.5 font-mono">{delivery.driverPhone}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px] mb-0.5">Payload Dimensions</span>
                      <span className="font-bold text-slate-200">{delivery.totalItemsCount} Packages</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">{delivery.totalWeightKg} kg Total</span>
                    </div>
                  </div>

                  {/* Discrepancy Claims Alert Section */}
                  {hasClaims && (
                    <div className="space-y-2 p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                        <ShieldAlert className="h-4 w-4" />
                        Logged Receiving Discrepancy Claims
                      </div>
                      <div className="space-y-1.5">
                        {delivery.discrepancies?.map((claim) => (
                          <div
                            key={claim.id}
                            className="flex items-center justify-between text-xs bg-slate-950/60 p-2 rounded border border-amber-900/30 text-slate-300"
                          >
                            <div className="space-y-0.5">
                              <span className="font-mono text-amber-300 font-semibold">{claim.claimNumber}</span>
                              <p className="text-[11px] text-slate-400">
                                {claim.discrepancyType.replace(/_/g, ' ')} • {claim.shortfallQty} units short
                              </p>
                              {claim.notes && <p className="text-[11px] text-slate-300 italic">&ldquo;{claim.notes}&rdquo;</p>}
                            </div>
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">
                              {claim.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-slate-400">
                      {isDelivered && delivery.proofOfDelivery ? (
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          POD Handover verified by {delivery.proofOfDelivery.storeRepName}
                        </span>
                      ) : isInTransit ? (
                        <span className="flex items-center gap-1.5 text-sky-400 animate-pulse">
                          <Clock className="h-4 w-4" />
                          Truck currently en route to store dock
                        </span>
                      ) : (
                        <span>Awaiting dock arrival</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {delivery.proofOfDelivery && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedPodDelivery(delivery)}
                          className="h-8 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1.5"
                        >
                          <FileCheck className="h-3.5 w-3.5" />
                          Inspect POD Receipt
                        </Button>
                      )}

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
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
