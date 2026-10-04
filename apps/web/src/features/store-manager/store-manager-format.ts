import type { StoreDeliveryCard, StoreOrder } from "./store-manager-api";

export const orderStatusMeta: Record<
  StoreOrder["status"],
  { label: string; detail: string; tone: "neutral" | "attention" | "active" | "complete" | "blocked" }
> = {
  ORDER_RECORDED: {
    label: "Received before cutoff",
    detail: "Editable until the 16:00 order lock.",
    tone: "neutral",
  },
  QUEUED_NEXT_RUN: {
    label: "Queued for following run",
    detail: "Submitted after cutoff and moved to the next planning cycle.",
    tone: "attention",
  },
  DISPATCH_PENDING: {
    label: "Awaiting Dispatch decision",
    detail: "The order is in the depot backlog and has not yet been allocated.",
    tone: "attention",
  },
  ASSIGNED: {
    label: "Planned",
    detail: "Dispatch has allocated a vehicle and delivery window.",
    tone: "active",
  },
  IN_TRANSIT: {
    label: "In transit",
    detail: "The vehicle has departed and the ETA may continue to update.",
    tone: "active",
  },
  DELIVERED: {
    label: "Delivered",
    detail: "Review proof of delivery and report any physical difference.",
    tone: "complete",
  },
  DEFICIT_PENDING: {
    label: "Deferred to next run",
    detail: "Dispatch recorded a reason and raised this outlet’s next-run priority.",
    tone: "blocked",
  },
  CANCELLED: {
    label: "Cancelled",
    detail: "This order will not enter dispatch planning.",
    tone: "neutral",
  },
};

export const deliveryStatusMeta: Record<
  StoreDeliveryCard["status"],
  { label: string; tone: "neutral" | "attention" | "active" | "complete" | "blocked" }
> = {
  SCHEDULED: { label: "Scheduled", tone: "neutral" },
  IN_TRANSIT: { label: "In transit", tone: "active" },
  ARRIVED: { label: "At receiving point", tone: "attention" },
  DELIVERED: { label: "Handover recorded", tone: "complete" },
  FAILED: { label: "Delivery exception", tone: "blocked" },
};

export const deferralLabels: Record<string, string> = {
  CAPACITY_WEIGHT_EXCEEDED: "Regional fleet weight capacity was exhausted.",
  CAPACITY_VOLUME_EXCEEDED: "Regional fleet volume capacity was exhausted.",
  NO_REEFER_AVAILABLE: "No refrigerated vehicle capacity was available.",
  NO_VAN_AVAILABLE: "No eligible van was available for this outlet.",
  WINDOW_UNACHIEVABLE: "The receiving window could not be reached safely.",
  VEHICLE_IN_WORKSHOP: "An unexpected workshop exclusion reduced available fleet capacity.",
};

export function friendlyDeferral(reason?: string | null) {
  if (!reason) return "Dispatch reason pending.";
  return deferralLabels[reason] || reason.replaceAll("_", " ").toLowerCase();
}

export function formatDate(value?: string) {
  if (!value) return "Not set";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-LK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatTime(value?: string) {
  if (!value) return "Pending";
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-LK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Colombo",
  }).format(date);
}
