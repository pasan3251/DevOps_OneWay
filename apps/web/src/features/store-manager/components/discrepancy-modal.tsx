"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { storeApi, type StoreDeliveryCard } from "../store-manager-api";

interface DiscrepancyModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: StoreDeliveryCard | null;
  onClaimSubmitted: () => void;
}

export function DiscrepancyModal({
  isOpen,
  onClose,
  delivery,
  onClaimSubmitted,
}: DiscrepancyModalProps) {
  const [discrepancyType, setDiscrepancyType] = useState<
    'DAMAGE_IN_TRANSIT' | 'STORE_SHORTFALL' | 'REJECTED_TEMPERATURE'
  >('DAMAGE_IN_TRANSIT');
  const [shortfallQty, setShortfallQty] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!delivery) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const claim = await storeApi.submitDiscrepancy({
        orderId: delivery.orderId,
        discrepancyType,
        shortfallQty: Number(shortfallQty),
        notes,
      });

      setSuccessMessage(`Claim #${claim.claimNumber} logged successfully and forwarded to Dispatcher.`);
      setTimeout(() => {
        onClaimSubmitted();
        onClose();
        setSuccessMessage(null);
        setNotes('');
        setShortfallQty(1);
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit discrepancy claim');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border text-foreground">
        <DialogHeader>
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <DialogTitle className="text-lg font-semibold text-foreground">
              Log Receiving Discrepancy
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            Report physical damage, SKU shortfalls, or temperature violations for investigation.
          </DialogDescription>
        </DialogHeader>

        {successMessage ? (
          <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg flex items-center gap-3 text-foreground text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
            <span>{successMessage}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {errorMessage && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded flex items-center gap-2 text-destructive text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Context Info */}
            <div className="p-3 bg-background rounded border border-border text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground block">Order</span>
                <span className="font-semibold text-foreground">{delivery.orderNumber}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Carrier Truck</span>
                <span className="font-semibold text-foreground">{delivery.vehiclePlate}</span>
              </div>
            </div>

            {/* Discrepancy Type */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">
                Discrepancy Category *
              </label>
              <select
                value={discrepancyType}
                onChange={(e) => setDiscrepancyType(e.target.value as any)}
                className="w-full h-9 rounded-md bg-background border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="DAMAGE_IN_TRANSIT">Damage in Transit (Physical Crushing/Spillage)</option>
                <option value="STORE_SHORTFALL">Store Shortfall (Missing Packages / Carton Count)</option>
                <option value="REJECTED_TEMPERATURE">Rejected Temperature (Cold Chain Violation &gt; 4°C)</option>
              </select>
            </div>

            {/* Shortfall Quantity */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">
                Affected Quantity (Units / Packages) *
              </label>
              <Input
                type="number"
                min={1}
                max={999}
                value={shortfallQty}
                onChange={(e) => setShortfallQty(parseInt(e.target.value) || 1)}
                className="bg-background border-border text-foreground h-9 text-sm"
                required
              />
            </div>

            {/* Operational Remarks */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">
                Operational Remarks *
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe condition upon unloading at dock bay, packaging damage, temperature reading, etc."
                rows={3}
                className="w-full rounded-md bg-background border border-border p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <DialogFooter className="pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-border text-foreground hover:bg-muted h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9 text-xs"
              >
                {isSubmitting ? "Submitting..." : "Submit Discrepancy Claim"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
