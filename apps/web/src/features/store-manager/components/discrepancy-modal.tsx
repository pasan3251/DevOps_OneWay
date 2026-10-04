"use client";

import { useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { storeApi, type StoreDeliveryCard } from "../store-manager-api";

interface DiscrepancyModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: StoreDeliveryCard | null;
  onClaimSubmitted: () => void;
}

type DiscrepancyType = "DAMAGE_IN_TRANSIT" | "STORE_SHORTFALL" | "REJECTED_TEMPERATURE";

export function DiscrepancyModal({
  isOpen,
  onClose,
  delivery,
  onClaimSubmitted,
}: DiscrepancyModalProps) {
  const [type, setType] = useState<DiscrepancyType>("STORE_SHORTFALL");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function resetForm() {
    setType("STORE_SHORTFALL");
    setQuantity(1);
    setNotes("");
    setError("");
  }

  function closeDialog() {
    resetForm();
    onClose();
  }

  if (!delivery) return null;
  const currentDelivery = delivery;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (notes.trim().length < 8) {
      setError("Add a short receiving note so Dispatch can investigate the physical difference.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await storeApi.submitDiscrepancy({
        orderId: currentDelivery.orderId,
        tripStopId: currentDelivery.tripStopId,
        discrepancyType: type,
        shortfallQty: quantity,
        notes: notes.trim(),
      });
      resetForm();
      onClaimSubmitted();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "The discrepancy could not be logged.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="sm:max-w-[500px] store-dialog">
        <DialogHeader>
          <div className="store-dialog-icon-title"><ShieldAlert size={20} /><DialogTitle>Report receiving discrepancy</DialogTitle></div>
          <DialogDescription>Use this only after handover for damage, missing quantities, or a cold-chain rejection.</DialogDescription>
        </DialogHeader>

        <form className="store-dialog-form" onSubmit={submit}>
          <dl className="store-dialog-context">
            <div><dt>Order</dt><dd>{currentDelivery.orderNumber}</dd></div>
            <div><dt>Vehicle</dt><dd>{currentDelivery.vehiclePlate}</dd></div>
          </dl>

          {error && <div className="store-dialog-error" role="alert"><AlertTriangle size={16} /><span>{error}</span></div>}

          <label>
            <span>Difference type</span>
            <select value={type} onChange={(event) => setType(event.target.value as DiscrepancyType)}>
              <option value="STORE_SHORTFALL">Missing quantity</option>
              <option value="DAMAGE_IN_TRANSIT">Damage found at handover</option>
              <option value="REJECTED_TEMPERATURE">Temperature rejection</option>
            </select>
          </label>

          <label>
            <span>Affected units</span>
            <input type="number" min="1" max={currentDelivery.totalItemsCount || 999} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} />
            <small>Expected load: {currentDelivery.totalItemsCount} units.</small>
          </label>

          <label>
            <span>Receiving note</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Describe the count, visible damage, seal condition, or measured temperature." />
          </label>

          <DialogFooter className="store-dialog-actions">
            <button className="store-secondary-button" type="button" onClick={closeDialog}>Cancel</button>
            <button className="store-primary-button" type="submit" disabled={submitting}>{submitting ? "Logging…" : "Log discrepancy"}</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
