import { apiRequest } from "@/lib/api-client";
import type { DiscrepancyRecord } from "./loader-manifest";

export type LoadingExceptionRecord = {
  id: string;
  orderId: string;
  type: "SHORTFALL" | "DAMAGE" | "TEMPERATURE" | "OTHER";
  affectedSku?: string | null;
  affectedQuantity: number;
  notes: string;
  status: "OPEN" | "RESOLVED";
  resolution?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
};

export type LoadingManifestDetail = {
  id: string;
  tripNumber: string;
  status: string;
  vehicle: { registrationNumber: string };
  manifest: { status: string; manifestVersion: number; clearedAt?: string | null };
  loadingExceptions: LoadingExceptionRecord[];
};

export const loaderApi = {
  getManifest(tripId: string) {
    return apiRequest<LoadingManifestDetail>(`/loader/manifests/${tripId}`);
  },

  verifyManifest(tripId: string) {
    return apiRequest(`/loader/manifests/${tripId}/verify`, {
      method: "POST",
      body: JSON.stringify({ notes: "Every stop and SKU was physically verified." }),
    });
  },

  reportException(tripId: string, record: DiscrepancyRecord) {
    const exceptionType =
      record.type === "missing"
        ? "SHORTFALL"
        : record.type === "damaged"
          ? "DAMAGE"
          : "TEMPERATURE";
    return apiRequest<{ id: string }>(`/loader/manifests/${tripId}/discrepancy`, {
      method: "POST",
      body: JSON.stringify({
        orderId: record.orderId,
        shortfallQty: record.quantity,
        exceptionType,
        affectedSku: record.skuCode,
        notes: record.notes || `${record.quantity} × ${record.itemDescription}`,
      }),
    });
  },

  resolveException(exceptionId: string, resolution: string) {
    return apiRequest(`/loader/exceptions/${exceptionId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolution }),
    });
  },

  clearDeparture(tripId: string) {
    return apiRequest(`/loader/manifests/${tripId}/gate-clear`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },
};
