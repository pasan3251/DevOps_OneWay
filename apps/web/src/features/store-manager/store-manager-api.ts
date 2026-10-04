/**
 * Store Manager API Bridge & Resilient Client Service
 * Enforces SM-1, SM-ORD-001 (16:00 cutoff), SM-ORD-002 (Fresh dual-order),
 * ALT-1 (split inbound delivery cards), and SM-3 (receiving discrepancy claims).
 */

export interface StoreProfile {
  id: string;
  code: string;
  name: string;
  brand: 'Fresh' | 'Style' | 'Tech';
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

export interface StoreOrder {
  id: string;
  orderNumber: string;
  outletId: string;
  brand: 'Fresh' | 'Style' | 'Tech';
  tempRequirement: 'ambient' | 'chilled';
  orderDate: string;
  submissionTime: string;
  status: 'ORDER_RECORDED' | 'QUEUED_NEXT_RUN' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  totalWeightKg: string;
  totalVolumeM3: string;
  totalItemsCount: number;
  isCutoffLocked: boolean;
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
  discrepancyType: 'DAMAGE_IN_TRANSIT' | 'STORE_SHORTFALL' | 'REJECTED_TEMPERATURE';
  status: 'LOGGED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  shortfallQty: number;
  notes?: string;
  createdAt: string;
}

export interface StoreDeliveryCard {
  tripStopId: string;
  tripId: string;
  tripNumber: string;
  operatingDate: string;
  orderId: string;
  orderNumber: string;
  brand: 'Fresh' | 'Style' | 'Tech';
  tempRequirement: 'ambient' | 'chilled';
  status: 'SCHEDULED' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED' | 'FAILED';
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
  };
  recentOrders: StoreOrder[];
  inboundDeliveries: StoreDeliveryCard[];
}

export interface ProductCatalogItem {
  id: string;
  sku: string;
  name: string;
  brand: 'Fresh' | 'Style' | 'Tech';
  category: string;
  tempRequirement: 'ambient' | 'chilled';
  unitWeightKg: number;
  unitVolumeM3: number;
  unitPrice: number;
  packSize: string;
}

// -------------------------------------------------------------------------------------
// Default Resilient Mock Database for Zero-Latency Local Operation & Fallback
// -------------------------------------------------------------------------------------

export const DEMO_OUTLETS: StoreProfile[] = [
  {
    id: 'c1a11111-1111-4111-8111-111111111101',
    code: 'F-COL-01',
    name: 'Cargills Food City — Kollupitiya',
    brand: 'Fresh',
    district: 'Colombo',
    address: '422 Galle Road, Kollupitiya, Colombo 03',
    contactPhone: '+94 11 257 3291',
    deliveryWindow: '08:00 - 18:00',
    depotName: 'Peliyagoda Central Hub',
  },
  {
    id: 'c2a22222-2222-4222-8222-222222222202',
    code: 'S-COL-07',
    name: 'Odel Flagship — Alexandra Place',
    brand: 'Style',
    district: 'Colombo',
    address: '5 Alexandra Place, Cinnamon Gardens, Colombo 07',
    contactPhone: '+94 11 462 5800',
    deliveryWindow: '09:00 - 18:00',
    depotName: 'Peliyagoda Central Hub',
  },
  {
    id: 'c3a33333-3333-4333-8333-333333333303',
    code: 'T-BAM-04',
    name: 'Singer Mega — Bambalapitiya',
    brand: 'Tech',
    district: 'Colombo',
    address: '180 Galle Road, Bambalapitiya, Colombo 04',
    contactPhone: '+94 11 250 8299',
    deliveryWindow: '08:30 - 17:30',
    depotName: 'Peliyagoda Central Hub',
  },
];

export const DEMO_CATALOG: ProductCatalogItem[] = [
  // Fresh - Chilled
  {
    id: 'p-fr-ch-01',
    sku: 'FR-DAI-001',
    name: 'Highland Fresh Whole Milk (1L Pack)',
    brand: 'Fresh',
    category: 'Dairy & Cold Chain',
    tempRequirement: 'chilled',
    unitWeightKg: 1.05,
    unitVolumeM3: 0.0012,
    unitPrice: 520,
    packSize: 'Crate of 12',
  },
  {
    id: 'p-fr-ch-02',
    sku: 'FR-DAI-002',
    name: 'Kotmale Full Cream Cheddar (200g)',
    brand: 'Fresh',
    category: 'Dairy & Cold Chain',
    tempRequirement: 'chilled',
    unitWeightKg: 0.22,
    unitVolumeM3: 0.0004,
    unitPrice: 980,
    packSize: 'Box of 24',
  },
  {
    id: 'p-fr-ch-03',
    sku: 'FR-PRO-003',
    name: 'Nuwara Eliya Leeks & Carrots Crate (10kg)',
    brand: 'Fresh',
    category: 'Fresh Produce',
    tempRequirement: 'chilled',
    unitWeightKg: 10.2,
    unitVolumeM3: 0.038,
    unitPrice: 3800,
    packSize: 'Standard Agri Crate',
  },
  {
    id: 'p-fr-ch-04',
    sku: 'FR-POU-004',
    name: 'Bairaha Dressed Chicken (Chilled Bulk 15kg)',
    brand: 'Fresh',
    category: 'Meat & Poultry',
    tempRequirement: 'chilled',
    unitWeightKg: 15.5,
    unitVolumeM3: 0.045,
    unitPrice: 19500,
    packSize: 'Insulated Tub',
  },

  // Fresh - Ambient
  {
    id: 'p-fr-am-01',
    sku: 'FR-DRY-001',
    name: 'Araliya Keeri Samba Rice (10kg Bag)',
    brand: 'Fresh',
    category: 'Staples & Dry Goods',
    tempRequirement: 'ambient',
    unitWeightKg: 10.05,
    unitVolumeM3: 0.015,
    unitPrice: 3200,
    packSize: 'Heavy Bag',
  },
  {
    id: 'p-fr-am-02',
    sku: 'FR-DRY-002',
    name: 'Munchee Super Cream Cracker (Carton 24x490g)',
    brand: 'Fresh',
    category: 'Biscuits & Snacks',
    tempRequirement: 'ambient',
    unitWeightKg: 12.4,
    unitVolumeM3: 0.032,
    unitPrice: 10800,
    packSize: 'Master Carton',
  },
  {
    id: 'p-fr-am-03',
    sku: 'FR-DRY-003',
    name: 'Dilmah Premium Ceylon Tea (500g Box x 20)',
    brand: 'Fresh',
    category: 'Beverages',
    tempRequirement: 'ambient',
    unitWeightKg: 11.2,
    unitVolumeM3: 0.028,
    unitPrice: 18400,
    packSize: 'Export Master Box',
  },

  // Style - Ambient
  {
    id: 'p-st-am-01',
    sku: 'ST-APP-001',
    name: 'Linen Button-down Casual Shirt (Pack of 10)',
    brand: 'Style',
    category: 'Men Apparel',
    tempRequirement: 'ambient',
    unitWeightKg: 2.8,
    unitVolumeM3: 0.018,
    unitPrice: 34500,
    packSize: 'Hanging Wardrobe Pack',
  },
  {
    id: 'p-st-am-02',
    sku: 'ST-APP-002',
    name: 'Batik Floral Silk Sari (Gift Box of 5)',
    brand: 'Style',
    category: 'Ethnic Wear',
    tempRequirement: 'ambient',
    unitWeightKg: 3.2,
    unitVolumeM3: 0.012,
    unitPrice: 62000,
    packSize: 'Pre-boxed Set',
  },

  // Tech - Ambient
  {
    id: 'p-tc-am-01',
    sku: 'TC-ELE-001',
    name: 'Samsung 55-inch Crystal UHD 4K Smart TV',
    brand: 'Tech',
    category: 'Home Appliances',
    tempRequirement: 'ambient',
    unitWeightKg: 16.5,
    unitVolumeM3: 0.14,
    unitPrice: 215000,
    packSize: 'Palletized Unit',
  },
  {
    id: 'p-tc-am-02',
    sku: 'TC-ELE-002',
    name: 'Apple MacBook Air 13-inch M2 (Master 5-Pack)',
    brand: 'Tech',
    category: 'Computing & IT',
    tempRequirement: 'ambient',
    unitWeightKg: 9.8,
    unitVolumeM3: 0.024,
    unitPrice: 1450000,
    packSize: 'High-Security Carton',
  },
];

class StoreManagerApiService {
  private activeOutlet: StoreProfile = DEMO_OUTLETS[0];
  private orders: StoreOrder[] = [];
  private discrepancies: DiscrepancyClaimData[] = [];

  constructor() {
    this.seedInitialState();
  }

  private seedInitialState() {
    // Initial active replenishment orders
    this.orders = [
      {
        id: 'ord-fresh-ch-01',
        orderNumber: 'ORD-20261005-FR-1044',
        outletId: this.activeOutlet.id,
        brand: 'Fresh',
        tempRequirement: 'chilled',
        orderDate: '2026-10-05',
        submissionTime: new Date(Date.now() - 3600000 * 4).toISOString(),
        status: 'IN_TRANSIT',
        totalWeightKg: '380.50',
        totalVolumeM3: '1.42',
        totalItemsCount: 48,
        isCutoffLocked: true,
        items: [
          {
            productId: 'p-fr-ch-01',
            productCode: 'FR-DAI-001',
            productName: 'Highland Fresh Whole Milk (1L Pack)',
            category: 'Dairy & Cold Chain',
            quantityRequested: 24,
            unitWeightKg: 1.05,
            unitVolumeM3: 0.0012,
            unitPrice: 520,
          },
          {
            productId: 'p-fr-ch-03',
            productCode: 'FR-PRO-003',
            productName: 'Nuwara Eliya Leeks & Carrots Crate (10kg)',
            category: 'Fresh Produce',
            quantityRequested: 10,
            unitWeightKg: 10.2,
            unitVolumeM3: 0.038,
            unitPrice: 3800,
          },
        ],
      },
      {
        id: 'ord-fresh-am-01',
        orderNumber: 'ORD-20261005-FR-1045',
        outletId: this.activeOutlet.id,
        brand: 'Fresh',
        tempRequirement: 'ambient',
        orderDate: '2026-10-05',
        submissionTime: new Date(Date.now() - 3600000 * 5).toISOString(),
        status: 'DELIVERED',
        totalWeightKg: '820.00',
        totalVolumeM3: '3.10',
        totalItemsCount: 95,
        isCutoffLocked: true,
        items: [
          {
            productId: 'p-fr-am-01',
            productCode: 'FR-DRY-001',
            productName: 'Araliya Keeri Samba Rice (10kg Bag)',
            category: 'Staples & Dry Goods',
            quantityRequested: 50,
            unitWeightKg: 10.05,
            unitVolumeM3: 0.015,
            unitPrice: 3200,
          },
          {
            productId: 'p-fr-am-02',
            productCode: 'FR-DRY-002',
            productName: 'Munchee Super Cream Cracker (Carton 24x490g)',
            category: 'Biscuits & Snacks',
            quantityRequested: 25,
            unitWeightKg: 12.4,
            unitVolumeM3: 0.032,
            unitPrice: 10800,
          },
        ],
      },
      {
        id: 'ord-fresh-am-next',
        orderNumber: 'ORD-20261006-FR-1089',
        outletId: this.activeOutlet.id,
        brand: 'Fresh',
        tempRequirement: 'ambient',
        orderDate: '2026-10-06',
        submissionTime: new Date(Date.now() - 3600000).toISOString(),
        status: 'ORDER_RECORDED',
        totalWeightKg: '450.00',
        totalVolumeM3: '1.85',
        totalItemsCount: 35,
        isCutoffLocked: false,
        items: [
          {
            productId: 'p-fr-am-01',
            productCode: 'FR-DRY-001',
            productName: 'Araliya Keeri Samba Rice (10kg Bag)',
            category: 'Staples & Dry Goods',
            quantityRequested: 30,
            unitWeightKg: 10.05,
            unitVolumeM3: 0.015,
            unitPrice: 3200,
          },
        ],
      },
    ];

    this.discrepancies = [
      {
        id: 'clm-001',
        claimNumber: 'CLM-20261005-4109',
        orderId: 'ord-fresh-am-01',
        discrepancyType: 'DAMAGE_IN_TRANSIT',
        status: 'LOGGED',
        shortfallQty: 2,
        notes: '2 sacks of Samba rice sustained puncture tears during pallet transit',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      },
    ];
  }

  public getColomboCutoff(): CutoffInfo {
    const now = new Date();
    const colomboMs = now.getTime() + 5.5 * 60 * 60 * 1000;
    const colomboDate = new Date(colomboMs);
    const hour = colomboDate.getUTCHours();
    const minute = colomboDate.getUTCMinutes();
    const isPastCutoff = hour >= 16;
    const minutesToCutoff = isPastCutoff ? 0 : (15 - hour) * 60 + (60 - minute);

    const d = new Date();
    d.setDate(d.getDate() + (isPastCutoff ? 2 : 1));
    const nextDeliveryDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    return {
      cutoffTime: '16:00:00',
      isPastCutoff,
      minutesToCutoff,
      currentColomboTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      nextDeliveryDate,
      message: isPastCutoff
        ? 'Cutoff locked for tomorrow. Orders submitted now are scheduled for the following delivery run.'
        : `Daily order cutoff is 16:00 Colombo time. ${Math.floor(minutesToCutoff / 60)}h ${minutesToCutoff % 60}m remaining for next-day delivery.`,
    };
  }

  public getActiveOutlet(): StoreProfile {
    return this.activeOutlet;
  }

  public setActiveOutlet(outletId: string): StoreProfile {
    const found = DEMO_OUTLETS.find((o) => o.id === outletId);
    if (found) {
      this.activeOutlet = found;
    }
    return this.activeOutlet;
  }

  /**
   * Fetch Store Overview (Aggregated)
   */
  public async getOverview(): Promise<StoreOverviewData> {
    try {
      const res = await fetch(`/api/v1/store/overview?outletId=${this.activeOutlet.id}`);
      if (res.ok) {
        const json = await res.json();
        return json;
      }
    } catch {
      // Graceful fallback to resilient client state
    }

    const cutoff = this.getColomboCutoff();
    const activeCounts = {
      total: this.orders.length,
      recorded: this.orders.filter((o) => o.status === 'ORDER_RECORDED').length,
      queued: this.orders.filter((o) => o.status === 'QUEUED_NEXT_RUN').length,
      assigned: this.orders.filter((o) => o.status === 'ASSIGNED').length,
      inTransit: this.orders.filter((o) => o.status === 'IN_TRANSIT').length,
      delivered: this.orders.filter((o) => o.status === 'DELIVERED').length,
    };

    // Inbound deliveries with Fresh split delivery support (ALT-1)
    const inboundDeliveries: StoreDeliveryCard[] = [
      {
        tripStopId: 'stop-chilled-01',
        tripId: 'trip-01',
        tripNumber: 'TRIP-20261005-01',
        operatingDate: '2026-10-05',
        orderId: 'ord-fresh-ch-01',
        orderNumber: 'ORD-20261005-FR-1044',
        brand: 'Fresh',
        tempRequirement: 'chilled',
        status: 'IN_TRANSIT',
        stopStatus: 'ARRIVING',
        stopSequence: 1,
        plannedArrivalTime: '10:15',
        actualArrivalTime: undefined,
        vehiclePlate: 'WP-CAD-1029',
        vehicleType: 'Reefer Truck (5 Ton)',
        vehicleCapacityKg: '5000',
        driverName: 'Sunil Perera',
        driverPhone: '+94 77 123 4567',
        totalItemsCount: 48,
        totalWeightKg: '380.50',
        proofOfDelivery: null,
      },
      {
        tripStopId: 'stop-ambient-02',
        tripId: 'trip-02',
        tripNumber: 'TRIP-20261005-02',
        operatingDate: '2026-10-05',
        orderId: 'ord-fresh-am-01',
        orderNumber: 'ORD-20261005-FR-1045',
        brand: 'Fresh',
        tempRequirement: 'ambient',
        status: 'DELIVERED',
        stopStatus: 'COMPLETED',
        stopSequence: 2,
        plannedArrivalTime: '08:45',
        actualArrivalTime: '08:41',
        actualDepartureTime: '09:15',
        vehiclePlate: 'WP-DAA-4481',
        vehicleType: 'Ambient Box Truck (8 Ton)',
        vehicleCapacityKg: '8000',
        driverName: 'Kamal Fernando',
        driverPhone: '+94 71 987 6543',
        totalItemsCount: 95,
        totalWeightKg: '820.00',
        proofOfDelivery: {
          id: 'pod-01',
          storeRepName: 'N. Silva (Store Mgr)',
          signatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><path d="M10 20 Q 30 5 50 20 T 90 20" stroke="%230ea5e9" fill="none" stroke-width="2"/></svg>',
          driverNotes: 'Unloaded at rear loading bay without incident.',
          geoLatitude: '6.89745',
          geoLongitude: '79.85612',
          capturedAt: '2026-10-05T08:58:22Z',
        },
        discrepancies: this.discrepancies,
      },
    ];

    return {
      outlet: this.activeOutlet,
      cutoff,
      activeCounts,
      recentOrders: this.orders.slice(0, 5),
      inboundDeliveries,
    };
  }

  /**
   * List all orders for the active outlet
   */
  public async getOrders(): Promise<StoreOrder[]> {
    try {
      const res = await fetch(`/api/v1/orders?outletId=${this.activeOutlet.id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) return json.data;
      }
    } catch {
      // Fallback to local store state
    }
    return [...this.orders];
  }

  /**
   * Submit Replenishment Order (SM-1, SM-ORD-001, SM-ORD-002)
   */
  public async createOrder(params: {
    tempRequirement: 'ambient' | 'chilled';
    orderDate: string;
    items: { productId: string; quantity: number }[];
  }): Promise<StoreOrder> {
    const cutoff = this.getColomboCutoff();

    // Check Fresh dual-order invariant (SM-ORD-002)
    const existing = this.orders.find(
      (o) =>
        o.orderDate === params.orderDate &&
        o.tempRequirement === params.tempRequirement &&
        o.status !== 'CANCELLED',
    );

    if (existing) {
      throw new Error(
        `Dual-order invariant violation: A ${params.tempRequirement} order (#${existing.orderNumber}) is already submitted for delivery on ${params.orderDate}. Only 1 ambient and 1 chilled order allowed per date.`,
      );
    }

    // Try backend API first
    try {
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outletId: this.activeOutlet.id,
          brand: this.activeOutlet.brand,
          tempRequirement: params.tempRequirement,
          orderDate: params.orderDate,
          items: params.items,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        this.orders.unshift(created);
        return created;
      } else {
        const errJson = await res.json();
        throw new Error(errJson.message || 'Server rejected order submission');
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Dual-order invariant')) {
        throw err;
      }
      // Offline fallback: construct order locally
    }

    // Assemble locally
    let totalWeight = 0;
    let totalVolume = 0;
    let totalItems = 0;

    const lineItems: OrderItemLine[] = params.items.map((item) => {
      const prod = DEMO_CATALOG.find((p) => p.id === item.productId);
      if (!prod) throw new Error(`Product not found: ${item.productId}`);
      totalWeight += prod.unitWeightKg * item.quantity;
      totalVolume += prod.unitVolumeM3 * item.quantity;
      totalItems += item.quantity;

      return {
        productId: prod.id,
        productCode: prod.sku,
        productName: prod.name,
        category: prod.category,
        quantityRequested: item.quantity,
        unitWeightKg: prod.unitWeightKg,
        unitVolumeM3: prod.unitVolumeM3,
        unitPrice: prod.unitPrice,
      };
    });

    const isLocked = cutoff.isPastCutoff;
    const status = isLocked ? 'QUEUED_NEXT_RUN' : 'ORDER_RECORDED';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${params.orderDate.replace(/-/g, '')}-${this.activeOutlet.brand.slice(0, 2).toUpperCase()}-${randNum}`;

    const newOrder: StoreOrder = {
      id: `ord-local-${Date.now()}`,
      orderNumber,
      outletId: this.activeOutlet.id,
      brand: this.activeOutlet.brand,
      tempRequirement: params.tempRequirement,
      orderDate: params.orderDate,
      submissionTime: new Date().toISOString(),
      status,
      totalWeightKg: totalWeight.toFixed(2),
      totalVolumeM3: totalVolume.toFixed(2),
      totalItemsCount: totalItems,
      isCutoffLocked: isLocked,
      items: lineItems,
    };

    this.orders.unshift(newOrder);
    return newOrder;
  }

  /**
   * Cancel an unassigned order before 16:00 cutoff (SM-ORD-005)
   */
  public async cancelOrder(orderId: string): Promise<StoreOrder> {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');

    if (order.status !== 'ORDER_RECORDED' && order.status !== 'QUEUED_NEXT_RUN') {
      throw new Error(`Order cannot be cancelled in state '${order.status}'. Dispatch has already locked the order for route execution.`);
    }

    order.status = 'CANCELLED';
    return order;
  }

  /**
   * Submit Receiving Discrepancy Claim (SM-3, SM-DISC-001)
   */
  public async submitDiscrepancy(params: {
    orderId: string;
    discrepancyType: 'DAMAGE_IN_TRANSIT' | 'STORE_SHORTFALL' | 'REJECTED_TEMPERATURE';
    shortfallQty: number;
    notes?: string;
  }): Promise<DiscrepancyClaimData> {
    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const claimNumber = `CLM-${dateCode}-${randSuffix}`;

    const newClaim: DiscrepancyClaimData = {
      id: `clm-${Date.now()}`,
      claimNumber,
      orderId: params.orderId,
      discrepancyType: params.discrepancyType,
      status: 'LOGGED',
      shortfallQty: params.shortfallQty,
      notes: params.notes,
      createdAt: new Date().toISOString(),
    };

    this.discrepancies.unshift(newClaim);
    return newClaim;
  }

  /**
   * Get available product catalog filtered by outlet brand
   */
  public getCatalogForStore(brand?: string): ProductCatalogItem[] {
    const targetBrand = brand || this.activeOutlet.brand;
    return DEMO_CATALOG.filter((p) => p.brand === targetBrand);
  }
}

export const storeApi = new StoreManagerApiService();
