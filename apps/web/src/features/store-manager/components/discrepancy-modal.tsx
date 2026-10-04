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
      <DialogContent className="sm:max-w-[480px] bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            <DialogTitle className="text-lg font-semibold text-slate-100">
              Log Receiving Discrepancy
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-400 pt-1">
            Report physical damage, SKU shortfalls, or temperature violations for investigation (SM-3, SM-DISC-001).
          </DialogDescription>
        </DialogHeader>

        {successMessage ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3 text-emerald-400 text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded flex items-center gap-2 text-rose-400 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Context Info */}
            <div className="p-3 bg-slate-950/60 rounded border border-slate-800 text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 block">Order</span>
                <span className="font-semibold text-sky-400">{delivery.orderNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Carrier Truck</span>
                <span className="font-semibold text-slate-200">{delivery.vehiclePlate}</span>
              </div>
            </div>

            {/* Discrepancy Type */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Discrepancy Category *
              </label>
              <select
                value={discrepancyType}
                onChange={(e) => setDiscrepancyType(e.target.value as any)}
                className="w-full h-9 rounded-md bg-slate-950 border border-slate-700 px-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="DAMAGE_IN_TRANSIT">Damage in Transit (Physical Crushing/Spillage)</option>
                <option value="STORE_SHORTFALL">Store Shortfall (Missing Packages / Carton Count)</option>
                <option value="REJECTED_TEMPERATURE">Rejected Temperature (Cold Chain Violation &gt; 4°C)</option>
              </select>
            </div>

            {/* Shortfall Quantity */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Affected Quantity (Units / Packages) *
              </label>
              <Input
                type="number"
                min={1}
                max={999}
                value={shortfallQty}
                onChange={(e) => setShortfallQty(parseInt(e.target.value) || 1)}
                className="bg-slate-950 border-slate-700 text-slate-100 h-9 text-sm"
                required
              />
            </div>

            {/* Operational Remarks */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Store Manager Operational Remarks *
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe condition upon unloading at dock bay, packaging damage, temperature reading, etc."
                rows={3}
                className="w-full rounded-md bg-slate-950 border border-slate-700 p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                required
              />
            </div>

            <DialogFooter className="pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold h-9 text-xs"
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
