"use client";

import { CheckCircle2, Clock3, FileSignature, MapPin, UserRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  const capturedAt = new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(new Date(pod.capturedAt));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[540px] store-dialog">
        <DialogHeader>
          <div className="store-dialog-title-row">
            <div className="store-dialog-icon-title"><CheckCircle2 size={20} /><DialogTitle>Proof of delivery</DialogTitle></div>
            <span className="store-status" data-tone="complete">Handover recorded</span>
          </div>
          <DialogDescription>Driver-captured receipt for the physical store handover.</DialogDescription>
        </DialogHeader>

        <dl className="store-pod-grid">
          <div><dt>Order</dt><dd>{orderNumber}</dd></div>
          <div><dt>Vehicle</dt><dd>{vehiclePlate}</dd></div>
          <div><dt><UserRound size={14} /> Receiver</dt><dd>{pod.storeRepName}</dd></div>
          <div><dt><Clock3 size={14} /> Captured</dt><dd>{capturedAt}</dd></div>
        </dl>

        <div className="store-pod-location"><MapPin size={17} /><span><small>Recorded handover location</small><strong>{pod.geoLatitude}, {pod.geoLongitude}</strong></span></div>

        <section className="store-signature-block" aria-labelledby="signature-title">
          <h3 id="signature-title"><FileSignature size={16} /> Receiver signature</h3>
          <div>
            {pod.signatureUrl.startsWith("data:image") || pod.signatureUrl.startsWith("http") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pod.signatureUrl} alt="Digitally captured receiver signature" />
            ) : (
              <span>Digitally captured: “{pod.signatureUrl}”</span>
            )}
            <small>Record {pod.id.slice(0, 8).toUpperCase()}</small>
          </div>
        </section>

        {pod.driverNotes && <div className="store-driver-note"><strong>Driver handover note</strong><p>{pod.driverNotes}</p></div>}
      </DialogContent>
    </Dialog>
  );
}
