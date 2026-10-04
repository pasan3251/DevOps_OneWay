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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-foreground">Inbound Deliveries &amp; Receiving</h1>
          <p className="text-xs text-muted-foreground">
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
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Shipments Cards */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-xl border border-border text-muted-foreground text-xs">
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
                    ? 'bg-card border-border shadow-sm'
                    : isDelivered
                    ? 'bg-card border-border'
                    : 'bg-card border-primary/40 shadow-md'
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Top Row: Cargo Type & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl bg-muted border border-border text-primary`}
                      >
                        {isChilled ? <Snowflake className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-foreground">
                            {isChilled ? 'Chilled Reefer Consignment' : 'Ambient Dry Consignment'}
                          </h3>
                          <Badge
                            variant="outline"
                            className={`text-xs bg-muted text-foreground border-border ${
                              isInTransit ? 'animate-pulse' : ''
                            }`}
                          >
                            {delivery.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          Order #{delivery.orderNumber} • Stop #{delivery.stopSequence}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Trip Reference</span>
                        <span className="font-mono font-medium text-foreground">{delivery.tripNumber}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Planned Window</span>
                        <span className="font-bold text-primary">{delivery.plannedArrivalTime || '10:00 AM'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Grid: Logistics & Carrier Telematics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-background rounded-lg border border-border text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px] mb-0.5">Assigned Vehicle</span>
                      <span className="font-bold text-foreground">{delivery.vehiclePlate}</span>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">{delivery.vehicleType}</span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px] mb-0.5">Fleet Driver</span>
                      <span className="font-bold text-foreground">{delivery.driverName}</span>
                      <span className="text-[11px] text-foreground block mt-0.5 font-mono">{delivery.driverPhone}</span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px] mb-0.5">Payload Dimensions</span>
                      <span className="font-bold text-foreground">{delivery.totalItemsCount} Packages</span>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">{delivery.totalWeightKg} kg Total</span>
                    </div>
                  </div>

                  {/* Discrepancy Claims Alert Section */}
                  {hasClaims && (
                    <div className="space-y-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                        <ShieldAlert className="h-4 w-4" />
                        Logged Receiving Discrepancy Claims
                      </div>
                      <div className="space-y-1.5">
                        {delivery.discrepancies?.map((claim) => (
                          <div
                            key={claim.id}
                            className="flex items-center justify-between text-xs bg-background p-2 rounded border border-border text-foreground"
                          >
                            <div className="space-y-0.5">
                              <span className="font-mono text-foreground font-semibold">{claim.claimNumber}</span>
                              <p className="text-[11px] text-muted-foreground">
                                {claim.discrepancyType.replace(/_/g, ' ')} • {claim.shortfallQty} units short
                              </p>
                              {claim.notes && <p className="text-[11px] text-foreground italic">&ldquo;{claim.notes}&rdquo;</p>}
                            </div>
                            <Badge variant="outline" className="bg-muted text-foreground border-border text-[10px]">
                              {claim.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-muted-foreground">
                      {isDelivered && delivery.proofOfDelivery ? (
                        <span className="flex items-center gap-1.5 text-foreground font-medium">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          POD Handover verified by {delivery.proofOfDelivery.storeRepName}
                        </span>
                      ) : isInTransit ? (
                        <span className="flex items-center gap-1.5 text-foreground animate-pulse">
                          <Clock className="h-4 w-4 text-primary" />
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
                          className="h-8 text-xs border-border text-foreground hover:bg-muted gap-1.5"
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
                          className="h-8 text-xs border-border text-foreground hover:bg-muted gap-1.5"
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
