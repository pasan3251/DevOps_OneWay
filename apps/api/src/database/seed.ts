import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as argon2 from 'argon2';
import * as schema from './schema';

async function seed() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://waypoint_user:waypoint_secure_pass@localhost:5432/waypoint_db';

  console.log('[Seed] Connecting to database...');
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  try {
    console.log('[Seed] Clearing existing demo data...');
    // Clear child tables first in reverse dependency order
    await db.delete(schema.messageReadStates);
    await db.delete(schema.messages);
    await db.delete(schema.conversationParticipants);
    await db.delete(schema.conversations);
    await db.delete(schema.notifications);
    await db.delete(schema.syncConflicts);
    await db.delete(schema.clientMutations);
    await db.delete(schema.auditLogs);
    await db.delete(schema.loadingExceptions);
    await db.delete(schema.storeReceipts);
    await db.delete(schema.discrepancyClaims);
    await db.delete(schema.proofOfDeliveries);
    await db.delete(schema.loadingManifests);
    await db.delete(schema.tripStops);
    await db.delete(schema.trips);
    await db.delete(schema.planVersions);
    await db.delete(schema.deliveryPlans);
    await db.delete(schema.orderItems);
    await db.delete(schema.orders);
    await db.delete(schema.distanceDurationMatrix);
    await db.delete(schema.products);
    await db.delete(schema.drivers);
    await db.delete(schema.vehicles);
    await db.delete(schema.users);
    await db.delete(schema.outlets);
    await db.delete(schema.depots);

    console.log('[Seed] Inserting Depots...');
    const [depotPeliyagoda, depotKandy] = await db.insert(schema.depots).values([
      {
        code: 'DEP-PELIYAGODA',
        name: 'Peliyagoda Central Distribution Hub',
        province: 'Western Province',
        latitude: '6.9667000',
        longitude: '79.9167000',
        operatingHoursOpen: '03:30',
        operatingHoursClose: '22:00',
      },
      {
        code: 'DEP-KANDY',
        name: 'Kandy Regional Distribution Center',
        province: 'Central Province',
        latitude: '7.2906000',
        longitude: '80.6337000',
        operatingHoursOpen: '03:30',
        operatingHoursClose: '22:00',
      },
    ]).returning();

    console.log('[Seed] Inserting Outlets...');
    const insertedOutlets = await db.insert(schema.outlets).values([
      // Fresh Outlets - Western (Peliyagoda)
      {
        code: 'OUT-FRESH-001',
        name: 'Fresh Supermarket - Peliyagoda Main',
        brand: 'Fresh',
        district: 'Gampaha',
        depotId: depotPeliyagoda.id,
        latitude: '6.9680000',
        longitude: '79.9180000',
        address: '14 Negombo Rd, Peliyagoda',
        contactPhone: '+94 11 291 0001',
        windowStart: '05:00',
        windowEnd: '08:00',
        isVanOnly: false,
      },
      {
        code: 'OUT-FRESH-002',
        name: 'Fresh Express - Negombo Lagoon',
        brand: 'Fresh',
        district: 'Gampaha',
        depotId: depotPeliyagoda.id,
        latitude: '7.2083000',
        longitude: '79.8358000',
        address: '88 Main Street, Negombo',
        contactPhone: '+94 31 222 0002',
        windowStart: '05:00',
        windowEnd: '08:00',
        isVanOnly: true, // Narrow street
      },
      {
        code: 'OUT-FRESH-003',
        name: 'Fresh Gourmet - Colombo Cinnamon Gardens',
        brand: 'Fresh',
        district: 'Colombo',
        depotId: depotPeliyagoda.id,
        latitude: '6.9080000',
        longitude: '79.8660000',
        address: '42 Ward Place, Colombo 07',
        contactPhone: '+94 11 269 0003',
        windowStart: '05:00',
        windowEnd: '08:00',
        isVanOnly: false,
      },
      {
        code: 'OUT-FRESH-004',
        name: 'Fresh Mart - Dehiwala Marine Drive',
        brand: 'Fresh',
        district: 'Colombo',
        depotId: depotPeliyagoda.id,
        latitude: '6.8520000',
        longitude: '79.8640000',
        address: '120 Marine Drive, Dehiwala',
        contactPhone: '+94 11 271 0004',
        windowStart: '05:00',
        windowEnd: '08:00',
        isVanOnly: false,
      },

      // Style Outlets - Western (Peliyagoda)
      {
        code: 'OUT-STYLE-001',
        name: 'Style Studio - Colombo Arcade Independence',
        brand: 'Style',
        district: 'Colombo',
        depotId: depotPeliyagoda.id,
        latitude: '6.9030000',
        longitude: '79.8680000',
        address: 'Arcade Independence Square, Colombo 07',
        contactPhone: '+94 11 268 1001',
        windowStart: '10:00',
        windowEnd: '14:00',
        isVanOnly: false,
      },
      {
        code: 'OUT-STYLE-002',
        name: 'Style Boutique - Nugegoda High Level',
        brand: 'Style',
        district: 'Colombo',
        depotId: depotPeliyagoda.id,
        latitude: '6.8720000',
        longitude: '79.8980000',
        address: '250 High Level Rd, Nugegoda',
        contactPhone: '+94 11 282 1002',
        windowStart: '11:00',
        windowEnd: '16:00',
        isVanOnly: false,
      },

      // Tech Outlets - Western (Peliyagoda)
      {
        code: 'OUT-TECH-001',
        name: 'Tech World - Liberty Plaza',
        brand: 'Tech',
        district: 'Colombo',
        depotId: depotPeliyagoda.id,
        latitude: '6.9090000',
        longitude: '79.8510000',
        address: 'Level 2, Liberty Plaza, Colombo 03',
        contactPhone: '+94 11 257 2001',
        windowStart: '10:00',
        windowEnd: '15:00',
        isVanOnly: true, // Basement loading bay with low clearance
      },
      {
        code: 'OUT-TECH-002',
        name: 'Tech Megastore - Majestic City',
        brand: 'Tech',
        district: 'Colombo',
        depotId: depotPeliyagoda.id,
        latitude: '6.8940000',
        longitude: '79.8550000',
        address: 'Level 3, Majestic City, Bambalapitiya',
        contactPhone: '+94 11 258 2002',
        windowStart: '10:00',
        windowEnd: '18:00',
        isVanOnly: false,
      },

      // Fresh Outlets - Central (Kandy)
      {
        code: 'OUT-FRESH-K01',
        name: 'Fresh City - Kandy Lake Round',
        brand: 'Fresh',
        district: 'Kandy',
        depotId: depotKandy.id,
        latitude: '7.2930000',
        longitude: '80.6380000',
        address: '32 Dalada Veediya, Kandy',
        contactPhone: '+94 81 223 3001',
        windowStart: '05:00',
        windowEnd: '08:00',
        isVanOnly: true, // Heritage zone van access
      },
      {
        code: 'OUT-FRESH-K02',
        name: 'Fresh Garden - Peradeniya Junction',
        brand: 'Fresh',
        district: 'Kandy',
        depotId: depotKandy.id,
        latitude: '7.2600000',
        longitude: '80.5980000',
        address: '100 Kandy Rd, Peradeniya',
        contactPhone: '+94 81 238 3002',
        windowStart: '05:00',
        windowEnd: '08:00',
        isVanOnly: false,
      },
    ]).returning();

    console.log('[Seed] Hashing passwords and creating Users...');
    const defaultPasswordHash = await argon2.hash('Password123!');

    const [userAdmin, userDispatcher, userLoaderCmb, userDriverSunil, userDriverKamal, userManagerFresh] = await db.insert(schema.users).values([
      {
        email: 'admin@waypoint.lk',
        passwordHash: defaultPasswordHash,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        phone: '+94 77 100 0000',
      },
      {
        email: 'dispatcher@waypoint.lk',
        passwordHash: defaultPasswordHash,
        firstName: 'Dilan',
        lastName: 'Perera',
        role: 'dispatcher',
        depotId: depotPeliyagoda.id, // Single central dispatcher stationed at Peliyagoda planning office
        phone: '+94 77 200 0001',
      },
      {
        email: 'loader.cmb@waypoint.lk',
        passwordHash: defaultPasswordHash,
        firstName: 'Gamini',
        lastName: 'Silva',
        role: 'loader',
        depotId: depotPeliyagoda.id,
        phone: '+94 77 300 0001',
      },
      {
        email: 'driver.sunil@waypoint.lk',
        passwordHash: defaultPasswordHash,
        firstName: 'Sunil',
        lastName: 'Fernando',
        role: 'driver',
        depotId: depotPeliyagoda.id,
        phone: '+94 77 400 0001',
      },
      {
        email: 'driver.kamal@waypoint.lk',
        passwordHash: defaultPasswordHash,
        firstName: 'Kamal',
        lastName: 'Jayawardena',
        role: 'driver',
        depotId: depotPeliyagoda.id,
        phone: '+94 77 400 0002',
      },
      {
        email: 'manager.fresh1@waypoint.lk',
        passwordHash: defaultPasswordHash,
        firstName: 'Anura',
        lastName: 'Bandara',
        role: 'store_manager',
        outletId: insertedOutlets[0].id,
        phone: '+94 77 500 0001',
      },
    ]).returning();

    console.log('[Seed] Inserting Vehicles...');
    const insertedVehicles = await db.insert(schema.vehicles).values([
      // Peliyagoda Vehicles
      {
        registrationNumber: 'WP-DAA-1001',
        depotId: depotPeliyagoda.id,
        vehicleType: 'truck_reefer',
        bodyType: 'truck',
        refrigerationType: 'reefer',
        maxWeightKg: '5000.00',
        maxVolumeM3: '22.00',
        fuelEfficiencyKmPerL: '4.50',
        weeklyFuelQuotaL: '250.00',
        status: 'available',
      },
      {
        registrationNumber: 'WP-DAA-1002',
        depotId: depotPeliyagoda.id,
        vehicleType: 'van_reefer',
        bodyType: 'van',
        refrigerationType: 'reefer',
        maxWeightKg: '1500.00',
        maxVolumeM3: '8.50',
        fuelEfficiencyKmPerL: '7.00',
        weeklyFuelQuotaL: '180.00',
        status: 'available',
      },
      {
        registrationNumber: 'WP-CAB-2001',
        depotId: depotPeliyagoda.id,
        vehicleType: 'truck_ambient',
        bodyType: 'truck',
        refrigerationType: 'ambient',
        maxWeightKg: '6000.00',
        maxVolumeM3: '26.00',
        fuelEfficiencyKmPerL: '5.00',
        weeklyFuelQuotaL: '250.00',
        status: 'available',
      },
      {
        registrationNumber: 'WP-CAB-2002',
        depotId: depotPeliyagoda.id,
        vehicleType: 'van_ambient',
        bodyType: 'van',
        refrigerationType: 'ambient',
        maxWeightKg: '1800.00',
        maxVolumeM3: '9.00',
        fuelEfficiencyKmPerL: '8.00',
        weeklyFuelQuotaL: '180.00',
        status: 'available',
      },
      // Kandy Vehicles
      {
        registrationNumber: 'CP-DAA-3001',
        depotId: depotKandy.id,
        vehicleType: 'van_reefer',
        bodyType: 'van',
        refrigerationType: 'reefer',
        maxWeightKg: '1500.00',
        maxVolumeM3: '8.50',
        fuelEfficiencyKmPerL: '7.00',
        weeklyFuelQuotaL: '180.00',
        status: 'available',
      },
    ]).returning();

    console.log('[Seed] Inserting Driver profiles...');
    const [driverSunil, driverKamal] = await db.insert(schema.drivers).values([
      {
        userId: userDriverSunil.id,
        depotId: depotPeliyagoda.id,
        licenseNumber: 'B8291039',
        licenseClass: 'heavy',
        phone: '+94 77 400 0001',
        status: 'available',
        currentLatitude: '6.9667000',
        currentLongitude: '79.9167000',
      },
      {
        userId: userDriverKamal.id,
        depotId: depotPeliyagoda.id,
        licenseNumber: 'B9102847',
        licenseClass: 'heavy',
        phone: '+94 77 400 0002',
        status: 'available',
        currentLatitude: '6.9667000',
        currentLongitude: '79.9167000',
      },
    ]).returning();

    console.log('[Seed] Inserting Products...');
    const insertedProducts = await db.insert(schema.products).values([
      // Fresh Ambient
      {
        sku: 'FR-AMB-TEA',
        name: 'Ceylon Supreme BOPF Tea 500g',
        brand: 'Fresh',
        category: 'Dry Grocery',
        tempRequirement: 'ambient',
        unitWeightKg: '0.520',
        unitVolumeM3: '0.0012',
        unitPrice: '950.00',
      },
      {
        sku: 'FR-AMB-RICE',
        name: 'Araliya Keeri Samba 5kg',
        brand: 'Fresh',
        category: 'Grains & Staples',
        tempRequirement: 'ambient',
        unitWeightKg: '5.050',
        unitVolumeM3: '0.0075',
        unitPrice: '1650.00',
      },
      // Fresh Chilled
      {
        sku: 'FR-CHL-MILK',
        name: 'Highland Fresh Pasteurized Milk 1L',
        brand: 'Fresh',
        category: 'Dairy',
        tempRequirement: 'chilled',
        unitWeightKg: '1.050',
        unitVolumeM3: '0.0015',
        unitPrice: '520.00',
      },
      {
        sku: 'FR-CHL-BUTTER',
        name: 'Pelwatte Salted Butter 200g',
        brand: 'Fresh',
        category: 'Dairy',
        tempRequirement: 'chilled',
        unitWeightKg: '0.210',
        unitVolumeM3: '0.0004',
        unitPrice: '780.00',
      },
      // Style
      {
        sku: 'ST-APP-SHIRT',
        name: 'Signature Linen Long Sleeve Shirt (M)',
        brand: 'Style',
        category: 'Men Apparel',
        tempRequirement: 'ambient',
        unitWeightKg: '0.350',
        unitVolumeM3: '0.0020',
        unitPrice: '5800.00',
      },
      // Tech
      {
        sku: 'TC-ACC-CHARGER',
        name: 'Baseus 65W GaN Fast Charger Pro',
        brand: 'Tech',
        category: 'Accessories',
        tempRequirement: 'ambient',
        unitWeightKg: '0.220',
        unitVolumeM3: '0.0008',
        unitPrice: '8900.00',
      },
    ]).returning();

    console.log('[Seed] Inserting Sample Orders...');
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date());

    const [orderFreshAmb, orderFreshChl, orderNegomboChl] = await db.insert(schema.orders).values([
      {
        orderNumber: `ORD-${today}-FR-001`,
        outletId: insertedOutlets[0].id,
        brand: 'Fresh',
        tempRequirement: 'ambient',
        orderDate: today,
        status: 'ORDER_RECORDED',
        totalWeightKg: '60.90',
        totalVolumeM3: '0.0990',
        totalItemsCount: 30,
        createdBy: userManagerFresh.id,
      },
      {
        orderNumber: `ORD-${today}-FR-002`,
        outletId: insertedOutlets[0].id,
        brand: 'Fresh',
        tempRequirement: 'chilled',
        orderDate: today,
        status: 'ORDER_RECORDED',
        totalWeightKg: '39.90',
        totalVolumeM3: '0.0585',
        totalItemsCount: 50,
        createdBy: userManagerFresh.id,
      },
      {
        orderNumber: `ORD-${today}-FR-003`,
        outletId: insertedOutlets[1].id, // Negombo outlet (is_van_only)
        brand: 'Fresh',
        tempRequirement: 'chilled',
        orderDate: today,
        status: 'ORDER_RECORDED',
        totalWeightKg: '68.25',
        totalVolumeM3: '0.0975',
        totalItemsCount: 65,
      },
    ]).returning();

    console.log('[Seed] Inserting Order Items...');
    await db.insert(schema.orderItems).values([
      {
        orderId: orderFreshAmb.id,
        productId: insertedProducts[0].id,
        quantityRequested: 20,
        unitWeightKg: '0.520',
        unitVolumeM3: '0.0012',
        unitPrice: '950.00',
      },
      {
        orderId: orderFreshAmb.id,
        productId: insertedProducts[1].id,
        quantityRequested: 10,
        unitWeightKg: '5.050',
        unitVolumeM3: '0.0075',
        unitPrice: '1650.00',
      },
      {
        orderId: orderFreshChl.id,
        productId: insertedProducts[2].id,
        quantityRequested: 35,
        unitWeightKg: '1.050',
        unitVolumeM3: '0.0015',
        unitPrice: '520.00',
      },
      {
        orderId: orderFreshChl.id,
        productId: insertedProducts[3].id,
        quantityRequested: 15,
        unitWeightKg: '0.210',
        unitVolumeM3: '0.0004',
        unitPrice: '780.00',
      },
      {
        orderId: orderNegomboChl.id,
        productId: insertedProducts[2].id,
        quantityRequested: 65,
        unitWeightKg: '1.050',
        unitVolumeM3: '0.0015',
        unitPrice: '520.00',
      },
    ]);

    console.log('[Seed] Seeding completed successfully!');
    console.log('---------------------------------------------------------');
    console.log('Login credentials:');
    console.log('  Admin:           admin@waypoint.lk / Password123!');
    console.log('  Dispatcher (Peliyagoda Central): dispatcher@waypoint.lk / Password123!');
    console.log('  Loader CMB:      loader.cmb@waypoint.lk / Password123!');
    console.log('  Driver Sunil:    driver.sunil@waypoint.lk / Password123!');
    console.log('  Driver Kamal:    driver.kamal@waypoint.lk / Password123!');
    console.log('  Store Manager:   manager.fresh1@waypoint.lk / Password123!');
    console.log('---------------------------------------------------------');
  } catch (error) {
    console.error('[Seed] Error during seeding:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seed();
}

export { seed };
