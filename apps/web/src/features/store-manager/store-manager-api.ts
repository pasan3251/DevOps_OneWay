import { apiRequest } from "@/lib/api-client";

export interface StoreProfile {
  id: string;
  code: string;
  name: string;
  brand: "Fresh" | "Style" | "Tech";
  district: string;
  address: string;
  contactPhone: string;
  deliveryWindow: string;
  depotName: string;
}

export interface CutoffInfo {
  cutoffTime: string;
  isPastCutoff: boolean;
  minutesToCutoff: number;
  currentColomboTime: string;
  nextDeliveryDate: string;
  message: string;
}

export interface OrderItemLine {
  productId: string;
  productCode: string;
  productName: string;
  category: string;
  quantityRequested: number;
  unitWeightKg: number;
  unitVolumeM3: number;
  unitPrice: number;
}

export type StoreOrderStatus =
  | "ORDER_RECORDED"
  | "QUEUED_NEXT_RUN"
  | "DISPATCH_PENDING"
  | "ASSIGNED"
  | "LOADED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED"
  | "RECEIVED"
  | "DISPUTED"
  | "DEFICIT_PENDING"
  | "CANCELLED";

export interface StoreOrder {
  id: string;
  orderNumber: string;
  outletId: string;
  brand: "Fresh" | "Style" | "Tech";
  tempRequirement: "ambient" | "chilled";
  orderDate: string;
  submissionTime: string;
  status: StoreOrderStatus;
  totalWeightKg: string;
  totalVolumeM3: string;
  totalItemsCount: number;
  isCutoffLocked: boolean;
  deferredCount?: number;
  lastDeferredDate?: string | null;
  deferralReason?: string | null;
  deferralReasonCode?: string | null;
  items: OrderItemLine[];
}

export interface ProofOfDeliveryData {
  id: string;
  storeRepName: string;
  signatureUrl: string;
  photoUrl?: string;
  driverNotes?: string;
  geoLatitude: string;
  geoLongitude: string;
  capturedAt: string;
}

export interface DiscrepancyClaimData {
  id: string;
  claimNumber: string;
  orderId: string;
  discrepancyType: "DAMAGE_IN_TRANSIT" | "STORE_SHORTFALL" | "REJECTED_TEMPERATURE";
  status: "LOGGED" | "INVESTIGATING" | "DEFICIT_ORDER_CREATED" | "CREDITED" | "REJECTED";
  shortfallQty: number;
  notes?: string;
  createdAt: string;
}

export interface StoreReceiptData {
  id: string;
  status: "CONFIRMED" | "DISCREPANCY";
  notes?: string | null;
  confirmedAt: string;
}

export interface StoreDeliveryCard {
  tripStopId: string;
  tripId: string;
  tripNumber: string;
  operatingDate: string;
  orderId: string;
  orderNumber: string;
  brand: "Fresh" | "Style" | "Tech";
  tempRequirement: "ambient" | "chilled";
  status: "SCHEDULED" | "IN_TRANSIT" | "ARRIVED" | "DELIVERED" | "FAILED";
  stopStatus: string;
  stopSequence: number;
  plannedArrivalTime?: string;
  actualArrivalTime?: string;
  actualDepartureTime?: string;
  vehiclePlate: string;
  vehicleType: string;
  vehicleCapacityKg?: string;
  driverName: string;
  driverPhone: string;
  totalItemsCount: number;
  totalWeightKg: string;
  proofOfDelivery?: ProofOfDeliveryData | null;
  discrepancies?: DiscrepancyClaimData[];
  receipt?: StoreReceiptData | null;
  etaNotice?: string;
  manifestNotice?: string;
  etaState?: "on_time" | "watch" | "breach";
}

export interface StoreOverviewData {
  outlet: StoreProfile;
  cutoff: CutoffInfo;
  activeCounts: {
    total: number;
    recorded: number;
    queued: number;
    assigned: number;
    inTransit: number;
    delivered: number;
    deferred: number;
  };
  recentOrders: StoreOrder[];
  inboundDeliveries: StoreDeliveryCard[];
}

export interface ProductCatalogItem {
  id: string;
  sku: string;
  name: string;
  brand: "Fresh" | "Style" | "Tech";
  category: string;
  tempRequirement: "ambient" | "chilled";
  unitWeightKg: number;
  unitVolumeM3: number;
  unitPrice: number;
  packSize: string;
}

type BackendOrderItem = {
  productId: string;
  quantityRequested: number;
  unitWeightKg: string | number;
  unitVolumeM3: string | number;
  unitPrice: string | number;
  product?: { sku?: string; name?: string; category?: string };
};

type BackendOrder = Omit<StoreOrder, "items"> & { items?: BackendOrderItem[] };
type BackendProduct = Omit<ProductCatalogItem, "unitWeightKg" | "unitVolumeM3" | "unitPrice"> & {
  unitWeightKg: string | number;
  unitVolumeM3: string | number;
  unitPrice: string | number;
};

const EMPTY_OUTLET: StoreProfile = {
  id: "",
  code: "",
  name: "Assigned outlet",
  brand: "Fresh",
  district: "",
  address: "",
  contactPhone: "",
  deliveryWindow: "",
  depotName: "",
};

class StoreManagerApiService {
  private activeOutlet = EMPTY_OUTLET;
  private catalog: ProductCatalogItem[] = [];

  private mapOrder(order: BackendOrder): StoreOrder {
    return {
      ...order,
      items: (order.items ?? []).map((item) => ({
        productId: item.productId,
        productCode: item.product?.sku ?? item.productId,
        productName: item.product?.name ?? "Product",
        category: item.product?.category ?? "General",
        quantityRequested: item.quantityRequested,
        unitWeightKg: Number(item.unitWeightKg),
        unitVolumeM3: Number(item.unitVolumeM3),
        unitPrice: Number(item.unitPrice),
      })),
    };
  }

  private async loadCatalog(brand: StoreProfile["brand"]) {
    const products = await apiRequest<BackendProduct[]>(`/master-data/products?brand=${encodeURIComponent(brand)}`);
    this.catalog = products.map((product) => ({
      ...product,
      unitWeightKg: Number(product.unitWeightKg),
      unitVolumeM3: Number(product.unitVolumeM3),
      unitPrice: Number(product.unitPrice),
    }));
  }

  getActiveOutlet() {
    return this.activeOutlet;
  }

  setActiveOutlet() {
    return this.activeOutlet;
  }

  async getOverview(): Promise<StoreOverviewData> {
    const overview = await apiRequest<StoreOverviewData>("/store/overview");
    this.activeOutlet = overview.outlet;
    const [deliveries] = await Promise.all([
      apiRequest<StoreDeliveryCard[]>("/store/deliveries"),
      this.loadCatalog(overview.outlet.brand),
    ]);
    return { ...overview, inboundDeliveries: deliveries };
  }

  async getOrders(): Promise<StoreOrder[]> {
    const response = await apiRequest<{ data: BackendOrder[] }>("/orders?limit=100");
    return response.data.map((order) => this.mapOrder(order));
  }

  async createOrder(params: {
    tempRequirement: "ambient" | "chilled";
    orderDate: string;
    items: { productId: string; quantity: number }[];
  }) {
    const created = await apiRequest<BackendOrder>("/orders", {
      method: "POST",
      body: JSON.stringify({
        outletId: this.activeOutlet.id,
        brand: this.activeOutlet.brand,
        ...params,
      }),
    });
    return this.mapOrder(created);
  }

  async cancelOrder(orderId: string) {
    const cancelled = await apiRequest<BackendOrder>(`/orders/${orderId}/cancel`, { method: "POST" });
    return this.mapOrder(cancelled);
  }

  submitDiscrepancy(params: {
    orderId: string;
    tripStopId?: string;
    discrepancyType: "DAMAGE_IN_TRANSIT" | "STORE_SHORTFALL" | "REJECTED_TEMPERATURE";
    shortfallQty: number;
    notes?: string;
  }) {
    return apiRequest<DiscrepancyClaimData>("/store/discrepancies", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  confirmReceipt(params: { orderId: string; tripStopId: string; notes?: string }) {
    return apiRequest<StoreReceiptData>("/store/receipts", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  getCatalogForStore(brand?: string) {
    return this.catalog.filter((product) => !brand || product.brand === brand);
  }
}

export const storeApi = new StoreManagerApiService();
