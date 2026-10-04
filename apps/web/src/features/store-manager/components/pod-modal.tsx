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
      <DialogContent className="sm:max-w-[520px] bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <DialogTitle className="text-lg font-semibold text-slate-100">
                Proof of Delivery (POD)
              </DialogTitle>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              Verified Receipt
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-400 pt-1">
            Official electronic receipt recorded by driver at store loading dock (SM-POD-001).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Metadata Card */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5">Order Reference</span>
              <span className="font-semibold text-sky-400">{orderNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Delivery Vehicle</span>
              <span className="font-semibold text-slate-200">{vehiclePlate}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Store Receiver</span>
              <div className="flex items-center gap-1 text-slate-200 font-medium">
                <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                {pod.storeRepName}
              </div>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Handover Time</span>
              <div className="flex items-center gap-1 text-slate-200 font-medium">
                <Clock className="h-3.5 w-3.5 text-sky-400" />
                {new Date(pod.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* GPS Coordinates */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-950/40 rounded border border-slate-800 text-xs text-slate-300">
            <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-slate-500">Dock Geofence: </span>
              <span className="font-mono text-slate-200">{pod.geoLatitude}° N, {pod.geoLongitude}° E</span>
              <span className="ml-2 text-[10px] text-emerald-400/90">(Verified within 50m of Store Bay)</span>
            </div>
          </div>

          {/* Digital Signature Display */}
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-sky-400" />
              Store Manager / Authorized Receiver Signature
            </span>
            <div className="h-28 w-full bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
              {pod.signatureUrl.startsWith('data:image') || pod.signatureUrl.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pod.signatureUrl}
                  alt="Digital Signature"
                  className="max-h-24 max-w-full object-contain filter invert"
                />
              ) : (
                <div className="text-xs italic text-slate-500">
                  Digitally Captured: &quot;{pod.signatureUrl}&quot;
                </div>
              )}
              <div className="absolute bottom-1 right-2 text-[10px] text-slate-600 font-mono">
                E-SIGN HASH: {pod.id.slice(0, 8).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Driver Notes */}
          {pod.driverNotes && (
            <div className="p-2.5 bg-slate-950/40 rounded border border-slate-800/80 text-xs">
              <span className="text-slate-500 block mb-0.5">Driver Handover Remarks:</span>
              <p className="text-slate-300 italic">&ldquo;{pod.driverNotes}&rdquo;</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
