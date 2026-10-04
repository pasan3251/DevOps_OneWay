"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, MapPin, UserCheck, FileText } from "lucide-react";
import type { ProofOfDeliveryData } from "../store-manager-api";

interface PodModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  vehiclePlate: string;
  pod: ProofOfDeliveryData | null;
}

export function PodModal({ isOpen, onClose, orderNumber, vehiclePlate, pod }: PodModalProps) {
  if (!pod) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] bg-card border-border text-foreground">
        <DialogHeader>
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg font-semibold text-foreground">
                Proof of Delivery (POD)
              </DialogTitle>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-foreground border-primary/30">
              Verified Receipt
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            Official electronic receipt recorded by driver at store loading dock.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Metadata Card */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-background rounded-lg border border-border text-xs">
            <div>
              <span className="text-muted-foreground block mb-0.5">Order Reference</span>
              <span className="font-semibold text-foreground">{orderNumber}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">Delivery Vehicle</span>
              <span className="font-semibold text-foreground">{vehiclePlate}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">Store Receiver</span>
              <div className="flex items-center gap-1 text-foreground font-medium">
                <UserCheck className="h-3.5 w-3.5 text-primary" />
                {pod.storeRepName}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">Handover Time</span>
              <div className="flex items-center gap-1 text-foreground font-medium">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {new Date(pod.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* GPS Coordinates */}
          <div className="flex items-center gap-2 p-2.5 bg-background rounded border border-border text-xs text-foreground">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <div>
              <span className="text-muted-foreground">Dock Geofence: </span>
              <span className="font-mono text-foreground">{pod.geoLatitude}° N, {pod.geoLongitude}° E</span>
              <span className="ml-2 text-[10px] text-primary/80">(Verified within 50m of Store Bay)</span>
            </div>
          </div>

          {/* Digital Signature Display */}
          <div>
            <span className="text-xs font-medium text-muted-foreground block mb-1.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" />
              Authorized Receiver Signature
            </span>
            <div className="h-28 w-full bg-background border border-border rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
              {pod.signatureUrl.startsWith('data:image') || pod.signatureUrl.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pod.signatureUrl}
                  alt="Digital Signature"
                  className="max-h-24 max-w-full object-contain filter invert"
                />
              ) : (
                <div className="text-xs italic text-muted-foreground">
                  Digitally Captured: &quot;{pod.signatureUrl}&quot;
                </div>
              )}
              <div className="absolute bottom-1 right-2 text-[10px] text-muted-foreground font-mono">
                E-SIGN HASH: {pod.id.slice(0, 8).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Driver Notes */}
          {pod.driverNotes && (
            <div className="p-2.5 bg-background rounded border border-border text-xs">
              <span className="text-muted-foreground block mb-0.5">Driver Handover Remarks:</span>
              <p className="text-foreground italic">&ldquo;{pod.driverNotes}&rdquo;</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
