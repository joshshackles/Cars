import { PrismaClient } from "@prisma/client";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
  throw new Error("Refusing to seed production. Set ALLOW_PRODUCTION_SEED=true to run the demo seed intentionally.");
}

const prisma = new PrismaClient();

const permissions = [
  ["dashboard:view", "View dashboard"],
  ["riders:view", "View riders"],
  ["riders:manage", "Manage riders"],
  ["riders:sensitive:view", "View sensitive rider notes"],
  ["drivers:view", "View drivers"],
  ["drivers:manage", "Manage drivers"],
  ["ride_requests:view", "View ride requests"],
  ["ride_requests:manage", "Manage ride requests"],
  ["dispatch:view", "View dispatch"],
  ["dispatch:manage", "Manage dispatch"],
  ["dispatch:override", "Override dispatch warnings"],
  ["driver_portal:view", "View assigned driver trips"],
  ["driver_portal:update", "Update assigned driver trips"],
  ["mileage:view", "View mileage"],
  ["mileage:manage", "Approve, reject, and adjust mileage"],
  ["reimbursements:view", "View reimbursements"],
  ["reimbursements:manage", "Manage reimbursement batches"],
  ["reports:view", "View reports"],
  ["incidents:view", "View incidents"],
  ["settings:view", "View settings"],
  ["settings:manage", "Manage settings"],
  ["settings:audit", "Audit setting changes"],
  ["admin:view", "View admin"],
  ["admin:users:manage", "Manage users"],
  ["admin:roles:manage", "Manage roles"],
  ["admin:memberships:manage", "Manage memberships"],
] as const;

const roleDefinitions = {
  system_admin: permissions.map(([key]) => key).filter((key) => !key.startsWith("driver_portal:")),
  organization_admin: permissions.map(([key]) => key).filter((key) => !key.startsWith("driver_portal:")),
  program_manager: [
    "dashboard:view",
    "riders:view",
    "riders:manage",
    "riders:sensitive:view",
    "drivers:view",
    "drivers:manage",
    "ride_requests:view",
    "ride_requests:manage",
    "dispatch:view",
    "dispatch:manage",
    "dispatch:override",
    "reports:view",
    "incidents:view",
  ],
  dispatcher: [
    "dashboard:view",
    "riders:view",
    "riders:manage",
    "drivers:view",
    "drivers:manage",
    "ride_requests:view",
    "ride_requests:manage",
    "dispatch:view",
    "dispatch:manage",
    "incidents:view",
  ],
  finance_user: ["dashboard:view", "mileage:view", "mileage:manage", "reimbursements:view", "reimbursements:manage", "reports:view"],
  driver: ["dashboard:view", "driver_portal:view", "driver_portal:update"],
  reporting_viewer: ["dashboard:view", "reports:view"],
  agency_partner: ["dashboard:view", "ride_requests:view", "reports:view"],
} as const;

const roleLabels: Record<keyof typeof roleDefinitions, string> = {
  system_admin: "System Admin",
  organization_admin: "Organization Admin",
  program_manager: "Program Manager",
  dispatcher: "Dispatcher",
  finance_user: "Finance User",
  driver: "Driver",
  reporting_viewer: "Reporting Viewer",
  agency_partner: "Agency Partner",
};

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: "economic-security-corporation" },
    update: {},
    create: {
      name: "Economic Security Corporation",
      slug: "economic-security-corporation",
    },
  });

  const permissionRecords = new Map<string, string>();

  for (const [key, name] of permissions) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: { name },
      create: { key, name },
    });
    permissionRecords.set(key, permission.id);
  }

  const roleRecords = new Map<keyof typeof roleDefinitions, string>();

  for (const [key, rolePermissions] of Object.entries(roleDefinitions) as [
    keyof typeof roleDefinitions,
    readonly string[],
  ][]) {
    const role = await prisma.role.upsert({
      where: {
        organizationId_key: {
          organizationId: organization.id,
          key,
        },
      },
      update: {
        name: roleLabels[key],
        isSystem: key === "system_admin",
      },
      create: {
        organizationId: organization.id,
        key,
        name: roleLabels[key],
        isSystem: key === "system_admin",
      },
    });

    roleRecords.set(key, role.id);

    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    await prisma.rolePermission.createMany({
      data: rolePermissions.map((permissionKey) => ({
        roleId: role.id,
        permissionId: permissionRecords.get(permissionKey)!,
      })),
      skipDuplicates: true,
    });
  }

  const users = [
    ["admin@esc.example", "Olivia Admin", "organization_admin"],
    ["manager@esc.example", "Marcus Manager", "program_manager"],
    ["dispatcher@esc.example", "Dana Dispatcher", "dispatcher"],
    ["finance@esc.example", "Finley Finance", "finance_user"],
    ["driver@esc.example", "Drew Driver", "driver"],
    ["reports@esc.example", "Riley Reports", "reporting_viewer"],
    ["partner@esc.example", "Avery Partner", "agency_partner"],
    ["system@cars.example", "Sam System", "system_admin"],
  ] as const;

  const userRecords = new Map<(typeof users)[number][0], string>();

  for (const [email, name, roleKey] of users) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, organizationId: organization.id },
      create: { email, name, organizationId: organization.id },
    });
    userRecords.set(email, user.id);

    await prisma.membership.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: organization.id,
        },
      },
      update: {
        roleId: roleRecords.get(roleKey)!,
      },
      create: {
        userId: user.id,
        organizationId: organization.id,
        roleId: roleRecords.get(roleKey)!,
      },
    });
  }

  await resetOperationalData(organization.id);

  const adminUserId = userRecords.get("admin@esc.example");
  const dispatcherUserId = userRecords.get("dispatcher@esc.example");
  const financeUserId = userRecords.get("finance@esc.example");

  const fundingSource = await prisma.fundingSource.create({
    data: {
      organizationId: organization.id,
      name: "Older Americans Act Transportation",
      code: "OAA-TRANSPORT",
      description: "Transportation funding for eligible rider services.",
      createdById: adminUserId,
      updatedById: adminUserId,
    },
  });

  await prisma.programSetting.createMany({
    data: buildProgramSettings(organization.id, adminUserId),
  });

  const seededSettings = await prisma.programSetting.findMany({
    where: {
      organizationId: organization.id,
    },
  });

  await prisma.auditLog.createMany({
    data: seededSettings.map((setting) => ({
      organizationId: organization.id,
      actorUserId: adminUserId,
      action: "setting.seeded",
      entityType: "ProgramSetting",
      entityId: setting.id,
      metadata: {
        key: setting.key,
        value: setting.value,
      },
    })),
  });

  const riderMaria = await prisma.rider.create({
    data: {
      organizationId: organization.id,
      displayName: "Maria Thompson",
      firstName: "Maria",
      lastName: "Thompson",
      phone: "417-555-0182",
      email: "maria.thompson@example.org",
      addressLine1: "418 W 7th St",
      city: "Joplin",
      county: "jasper",
      state: "MO",
      postalCode: "64801",
      emergencyContactName: "Elena Thompson",
      emergencyContactPhone: "417-555-0118",
      communicationPreference: "phone",
      status: "active",
      mobilityNotes: "Uses a folding walker and prefers curb-to-curb assistance.",
      riderNotes: "Prefers morning appointments when possible.",
      sensitiveNotes: "Family contact asked to be notified if appointments are repeatedly missed.",
      eligibilityConfirmed: true,
      intakeDate: new Date("2026-01-12T16:00:00.000Z"),
      pickupInstructions: "Use the side entrance near the blue mailbox.",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const riderJames = await prisma.rider.create({
    data: {
      organizationId: organization.id,
      displayName: "James Walker",
      firstName: "James",
      lastName: "Walker",
      phone: "417-555-0144",
      addressLine1: "220 N Main St",
      city: "Neosho",
      county: "newton",
      state: "MO",
      postalCode: "64850",
      emergencyContactName: "Pat Walker",
      emergencyContactPhone: "417-555-0129",
      communicationPreference: "sms",
      status: "active",
      riderNotes: "Usually schedules grocery trips on Fridays.",
      eligibilityConfirmed: true,
      intakeDate: new Date("2026-02-04T15:30:00.000Z"),
      pickupInstructions: "Call on arrival.",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const riderAna = await prisma.rider.create({
    data: {
      organizationId: organization.id,
      displayName: "Ana Rodriguez",
      firstName: "Ana",
      lastName: "Rodriguez",
      phone: "417-555-0188",
      email: "ana.rodriguez@example.org",
      addressLine1: "48 Pine St",
      city: "Lamar",
      county: "barton",
      state: "MO",
      postalCode: "64759",
      emergencyContactName: "Luis Rodriguez",
      emergencyContactPhone: "417-555-0171",
      communicationPreference: "phone",
      status: "active",
      mobilityNotes: "Needs door-to-door assistance on rainy days.",
      riderNotes: "Recurring senior center rides on Wednesdays.",
      eligibilityConfirmed: true,
      intakeDate: new Date("2026-03-11T14:00:00.000Z"),
      pickupInstructions: "Apartment B, west side entrance.",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const driverDrew = await prisma.driver.create({
    data: {
      organizationId: organization.id,
      displayName: "Drew Driver",
      firstName: "Drew",
      lastName: "Driver",
      phone: "417-555-0160",
      email: "driver@esc.example",
      addressLine1: "710 S Pearl Ave",
      city: "Joplin",
      state: "MO",
      postalCode: "64801",
      countiesServed: ["jasper", "newton"],
      preferredRideTypes: ["medical", "grocery"],
      vehicleMake: "Toyota",
      vehicleModel: "Sienna",
      vehicleYear: 2021,
      licenseVerificationDate: new Date("2026-01-15T00:00:00.000Z"),
      insuranceVerificationDate: new Date("2026-02-01T00:00:00.000Z"),
      backgroundCheckStatus: "cleared",
      onboardingStatus: "approved",
      reimbursementPreference: "direct_deposit",
      status: "active",
      vehicleLabel: "2021 Toyota Sienna",
      driverNotes: "Prefers longer medical trips in Jasper County.",
      createdById: adminUserId,
      updatedById: adminUserId,
    },
  });

  const driverNina = await prisma.driver.create({
    data: {
      organizationId: organization.id,
      displayName: "Nina Patel",
      firstName: "Nina",
      lastName: "Patel",
      phone: "417-555-0199",
      email: "nina.patel@example.org",
      addressLine1: "1348 Oak Ridge Dr",
      city: "Neosho",
      state: "MO",
      postalCode: "64850",
      countiesServed: ["newton", "mcdonald"],
      preferredRideTypes: ["grocery", "social_service"],
      vehicleMake: "Honda",
      vehicleModel: "CR-V",
      vehicleYear: 2019,
      licenseVerificationDate: new Date("2026-03-05T00:00:00.000Z"),
      insuranceVerificationDate: new Date("2025-04-10T00:00:00.000Z"),
      backgroundCheckStatus: "cleared",
      onboardingStatus: "approved",
      reimbursementPreference: "paper_check",
      status: "active",
      vehicleLabel: "2019 Honda CR-V",
      driverNotes: "Best fit for short local routes.",
      createdById: adminUserId,
      updatedById: adminUserId,
    },
  });

  const driverOmar = await prisma.driver.create({
    data: {
      organizationId: organization.id,
      displayName: "Omar Reed",
      firstName: "Omar",
      lastName: "Reed",
      phone: "417-555-0135",
      email: "omar.reed@example.org",
      addressLine1: "92 Maple Ave",
      city: "Lamar",
      state: "MO",
      postalCode: "64759",
      countiesServed: ["barton", "jasper"],
      preferredRideTypes: ["social_service", "medical"],
      vehicleMake: "Ford",
      vehicleModel: "Escape",
      vehicleYear: 2020,
      licenseVerificationDate: new Date("2026-04-02T00:00:00.000Z"),
      insuranceVerificationDate: new Date("2026-04-02T00:00:00.000Z"),
      backgroundCheckStatus: "cleared",
      onboardingStatus: "approved",
      reimbursementPreference: "direct_deposit",
      status: "active",
      vehicleLabel: "2020 Ford Escape",
      driverNotes: "Available for Barton County recurring rides.",
      createdById: adminUserId,
      updatedById: adminUserId,
    },
  });

  await prisma.driverAvailability.createMany({
    data: [
      {
        organizationId: organization.id,
        driverId: driverDrew.id,
        status: "AVAILABLE",
        availabilityType: "recurring",
        recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
        preferredCounties: ["jasper", "newton"],
        maxDistanceMiles: 45,
        startsAt: new Date("2026-06-01T13:00:00.000Z"),
        endsAt: new Date("2026-06-01T22:00:00.000Z"),
        notes: "Available for medical and grocery trips.",
        createdById: dispatcherUserId,
        updatedById: dispatcherUserId,
      },
      {
        organizationId: organization.id,
        driverId: driverNina.id,
        status: "TENTATIVE",
        availabilityType: "one_time",
        preferredCounties: ["newton"],
        maxDistanceMiles: 25,
        startsAt: new Date("2026-06-01T15:00:00.000Z"),
        endsAt: new Date("2026-06-01T20:00:00.000Z"),
        notes: "Can cover short local routes.",
        createdById: dispatcherUserId,
        updatedById: dispatcherUserId,
      },
      {
        organizationId: organization.id,
        driverId: driverOmar.id,
        status: "AVAILABLE",
        availabilityType: "recurring",
        recurrenceRule: "FREQ=WEEKLY;BYDAY=WE,TH",
        preferredCounties: ["barton", "jasper"],
        maxDistanceMiles: 55,
        startsAt: new Date("2026-06-03T14:00:00.000Z"),
        endsAt: new Date("2026-06-03T22:00:00.000Z"),
        notes: "Best for Barton County senior center trips.",
        createdById: dispatcherUserId,
        updatedById: dispatcherUserId,
      },
    ],
  });

  const escOffice = await prisma.destination.create({
    data: {
      organizationId: organization.id,
      name: "Economic Security Corporation",
      destinationType: "agency_office",
      addressLine1: "302 S Joplin Ave",
      city: "Joplin",
      state: "MO",
      postalCode: "64801",
      latitude: "37.087100",
      longitude: "-94.513300",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const mercyClinic = await prisma.destination.create({
    data: {
      organizationId: organization.id,
      name: "Mercy Clinic Joplin",
      destinationType: "medical_facility",
      addressLine1: "100 Mercy Way",
      city: "Joplin",
      state: "MO",
      postalCode: "64804",
      latitude: "37.051100",
      longitude: "-94.525000",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const grocery = await prisma.destination.create({
    data: {
      organizationId: organization.id,
      name: "Community Market",
      destinationType: "grocery",
      addressLine1: "1602 S Main St",
      city: "Joplin",
      state: "MO",
      postalCode: "64804",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const seniorCenter = await prisma.destination.create({
    data: {
      organizationId: organization.id,
      name: "Barton County Senior Center",
      destinationType: "social_service",
      addressLine1: "1200 Senior Way",
      city: "Lamar",
      state: "MO",
      postalCode: "64759",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const medicalRequest = await prisma.rideRequest.create({
    data: {
      organizationId: organization.id,
      riderId: riderMaria.id,
      fundingSourceId: fundingSource.id,
      status: "SCHEDULED",
      purpose: "medical",
      requestSource: "phone",
      neededAt: new Date("2026-06-01T15:00:00.000Z"),
      pickupWindowStart: new Date("2026-06-01T14:30:00.000Z"),
      pickupWindowEnd: new Date("2026-06-01T14:45:00.000Z"),
      returnTripNeeded: false,
      multipleStops: false,
      recurringRide: false,
      specialInstructions: "Rider uses a folding walker.",
      internalNotes: "Reminder call requested.",
      warnings: [],
      notes: "Follow-up appointment. Rider requested a reminder call.",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const groceryRequest = await prisma.rideRequest.create({
    data: {
      organizationId: organization.id,
      riderId: riderJames.id,
      fundingSourceId: fundingSource.id,
      status: "COMPLETED",
      purpose: "grocery",
      requestSource: "partner_referral",
      requestedAt: new Date("2026-05-20T16:20:00.000Z"),
      neededAt: new Date("2026-05-22T17:00:00.000Z"),
      pickupWindowStart: new Date("2026-05-22T16:45:00.000Z"),
      pickupWindowEnd: new Date("2026-05-22T17:00:00.000Z"),
      returnTripNeeded: false,
      multipleStops: false,
      recurringRide: false,
      warnings: [],
      notes: "Weekly grocery access trip.",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const driverPortalRequest = await prisma.rideRequest.create({
    data: {
      organizationId: organization.id,
      riderId: riderMaria.id,
      fundingSourceId: fundingSource.id,
      status: "SCHEDULED",
      purpose: "medical",
      requestSource: "phone",
      requestedAt: new Date("2026-05-21T15:20:00.000Z"),
      neededAt: new Date("2026-05-22T19:30:00.000Z"),
      pickupWindowStart: new Date("2026-05-22T18:55:00.000Z"),
      pickupWindowEnd: new Date("2026-05-22T19:10:00.000Z"),
      returnTripNeeded: false,
      multipleStops: false,
      recurringRide: false,
      specialInstructions: "Please call when parked near the front entrance.",
      internalNotes: "Portal demo trip. Do not expose this staff note to the driver.",
      warnings: [],
      notes: "Driver portal demo assignment.",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const recurringRequest = await prisma.rideRequest.create({
    data: {
      organizationId: organization.id,
      riderId: riderAna.id,
      fundingSourceId: fundingSource.id,
      status: "SCHEDULED",
      purpose: "social_service",
      requestSource: "phone",
      requestedAt: new Date("2026-05-18T14:10:00.000Z"),
      neededAt: new Date("2026-06-03T16:00:00.000Z"),
      pickupWindowStart: new Date("2026-06-03T15:25:00.000Z"),
      pickupWindowEnd: new Date("2026-06-03T15:40:00.000Z"),
      returnTripNeeded: true,
      recurringRide: true,
      specialInstructions: "Recurring senior center ride.",
      warnings: [],
      notes: "Weekly ride volume demo.",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const canceledRequest = await prisma.rideRequest.create({
    data: {
      organizationId: organization.id,
      riderId: riderAna.id,
      fundingSourceId: fundingSource.id,
      status: "CANCELED",
      purpose: "medical",
      requestSource: "phone",
      requestedAt: new Date("2026-05-19T16:00:00.000Z"),
      neededAt: new Date("2026-05-24T15:00:00.000Z"),
      pickupWindowStart: new Date("2026-05-24T14:20:00.000Z"),
      pickupWindowEnd: new Date("2026-05-24T14:40:00.000Z"),
      warnings: [],
      notes: "Canceled by rider after appointment changed.",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const noShowRequest = await prisma.rideRequest.create({
    data: {
      organizationId: organization.id,
      riderId: riderJames.id,
      fundingSourceId: fundingSource.id,
      status: "UNRESOLVED",
      purpose: "grocery",
      requestSource: "partner_referral",
      requestedAt: new Date("2026-05-18T16:00:00.000Z"),
      neededAt: new Date("2026-05-25T17:00:00.000Z"),
      pickupWindowStart: new Date("2026-05-25T16:20:00.000Z"),
      pickupWindowEnd: new Date("2026-05-25T16:40:00.000Z"),
      warnings: [],
      notes: "Rider no-show for demo reporting.",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const deniedRequest = await prisma.rideRequest.create({
    data: {
      organizationId: organization.id,
      riderId: riderAna.id,
      status: "DENIED",
      purpose: "medical",
      requestSource: "phone",
      requestedAt: new Date("2026-05-26T15:00:00.000Z"),
      neededAt: new Date("2026-05-26T17:00:00.000Z"),
      warnings: [{ type: "short_notice", message: "Same-day request could not be staffed." }],
      notes: "Unmet same-day request for MVP reports.",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const socialCompletedRequest = await prisma.rideRequest.create({
    data: {
      organizationId: organization.id,
      riderId: riderAna.id,
      fundingSourceId: fundingSource.id,
      status: "COMPLETED",
      purpose: "social_service",
      requestSource: "phone",
      requestedAt: new Date("2026-05-16T15:00:00.000Z"),
      neededAt: new Date("2026-05-21T16:00:00.000Z"),
      pickupWindowStart: new Date("2026-05-21T15:25:00.000Z"),
      pickupWindowEnd: new Date("2026-05-21T15:40:00.000Z"),
      returnTripNeeded: false,
      recurringRide: true,
      warnings: [],
      notes: "Completed recurring social service ride.",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const medicalOutbound = await prisma.tripLeg.create({
    data: {
      organizationId: organization.id,
      rideRequestId: medicalRequest.id,
      originDestinationId: escOffice.id,
      dropoffDestinationId: mercyClinic.id,
      pickupAddress: "302 S Joplin Ave",
      pickupCity: "Joplin",
      pickupCounty: "jasper",
      pickupState: "MO",
      pickupPostalCode: "64801",
      dropoffAddress: "100 Mercy Way",
      dropoffCity: "Joplin",
      dropoffCounty: "jasper",
      dropoffState: "MO",
      dropoffPostalCode: "64804",
      sequence: 1,
      status: "ASSIGNED",
      scheduledPickupAt: new Date("2026-06-01T14:30:00.000Z"),
      scheduledDropoffAt: new Date("2026-06-01T15:00:00.000Z"),
      estimatedMiles: "6.40",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const groceryLeg = await prisma.tripLeg.create({
    data: {
      organizationId: organization.id,
      rideRequestId: groceryRequest.id,
      originDestinationId: escOffice.id,
      dropoffDestinationId: grocery.id,
      pickupAddress: "302 S Joplin Ave",
      pickupCity: "Joplin",
      pickupCounty: "jasper",
      pickupState: "MO",
      pickupPostalCode: "64801",
      dropoffAddress: "1602 S Main St",
      dropoffCity: "Joplin",
      dropoffCounty: "jasper",
      dropoffState: "MO",
      dropoffPostalCode: "64804",
      sequence: 1,
      status: "COMPLETED",
      scheduledPickupAt: new Date("2026-05-22T16:45:00.000Z"),
      scheduledDropoffAt: new Date("2026-05-22T17:10:00.000Z"),
      completedAt: new Date("2026-05-22T18:05:00.000Z"),
      estimatedMiles: "4.90",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const driverPortalLeg = await prisma.tripLeg.create({
    data: {
      organizationId: organization.id,
      rideRequestId: driverPortalRequest.id,
      originDestinationId: escOffice.id,
      dropoffDestinationId: mercyClinic.id,
      pickupAddress: "302 S Joplin Ave",
      pickupCity: "Joplin",
      pickupCounty: "jasper",
      pickupState: "MO",
      pickupPostalCode: "64801",
      dropoffAddress: "100 Mercy Way",
      dropoffCity: "Joplin",
      dropoffCounty: "jasper",
      dropoffState: "MO",
      dropoffPostalCode: "64804",
      sequence: 1,
      status: "ASSIGNED",
      scheduledPickupAt: new Date("2026-05-22T18:55:00.000Z"),
      scheduledDropoffAt: new Date("2026-05-22T19:30:00.000Z"),
      estimatedMiles: "6.40",
      notes: "Dispatch-only operational note.",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const recurringOutbound = await prisma.tripLeg.create({
    data: {
      organizationId: organization.id,
      rideRequestId: recurringRequest.id,
      originDestinationId: escOffice.id,
      dropoffDestinationId: seniorCenter.id,
      pickupAddress: "48 Pine St",
      pickupCity: "Lamar",
      pickupCounty: "barton",
      pickupState: "MO",
      pickupPostalCode: "64759",
      dropoffAddress: "1200 Senior Way",
      dropoffCity: "Lamar",
      dropoffCounty: "barton",
      dropoffState: "MO",
      dropoffPostalCode: "64759",
      sequence: 1,
      status: "DRIVER_CONFIRMED",
      scheduledPickupAt: new Date("2026-06-03T15:25:00.000Z"),
      scheduledDropoffAt: new Date("2026-06-03T16:00:00.000Z"),
      estimatedMiles: "5.20",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const recurringReturn = await prisma.tripLeg.create({
    data: {
      organizationId: organization.id,
      rideRequestId: recurringRequest.id,
      originDestinationId: seniorCenter.id,
      dropoffDestinationId: escOffice.id,
      pickupAddress: "1200 Senior Way",
      pickupCity: "Lamar",
      pickupCounty: "barton",
      pickupState: "MO",
      pickupPostalCode: "64759",
      dropoffAddress: "48 Pine St",
      dropoffCity: "Lamar",
      dropoffCounty: "barton",
      dropoffState: "MO",
      dropoffPostalCode: "64759",
      sequence: 2,
      status: "ASSIGNED",
      scheduledPickupAt: new Date("2026-06-03T18:00:00.000Z"),
      scheduledDropoffAt: new Date("2026-06-03T18:35:00.000Z"),
      estimatedMiles: "5.20",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const canceledLeg = await prisma.tripLeg.create({
    data: {
      organizationId: organization.id,
      rideRequestId: canceledRequest.id,
      originDestinationId: escOffice.id,
      dropoffDestinationId: mercyClinic.id,
      pickupAddress: "48 Pine St",
      pickupCity: "Lamar",
      pickupCounty: "barton",
      pickupState: "MO",
      pickupPostalCode: "64759",
      dropoffAddress: "100 Mercy Way",
      dropoffCity: "Joplin",
      dropoffCounty: "jasper",
      dropoffState: "MO",
      dropoffPostalCode: "64804",
      sequence: 1,
      status: "CANCELED",
      scheduledPickupAt: new Date("2026-05-24T14:20:00.000Z"),
      scheduledDropoffAt: new Date("2026-05-24T15:00:00.000Z"),
      estimatedMiles: "48.40",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const noShowLeg = await prisma.tripLeg.create({
    data: {
      organizationId: organization.id,
      rideRequestId: noShowRequest.id,
      originDestinationId: escOffice.id,
      dropoffDestinationId: grocery.id,
      pickupAddress: "220 N Main St",
      pickupCity: "Neosho",
      pickupCounty: "newton",
      pickupState: "MO",
      pickupPostalCode: "64850",
      dropoffAddress: "1602 S Main St",
      dropoffCity: "Joplin",
      dropoffCounty: "jasper",
      dropoffState: "MO",
      dropoffPostalCode: "64804",
      sequence: 1,
      status: "NO_SHOW",
      scheduledPickupAt: new Date("2026-05-25T16:20:00.000Z"),
      scheduledDropoffAt: new Date("2026-05-25T17:00:00.000Z"),
      estimatedMiles: "20.10",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const socialCompletedLeg = await prisma.tripLeg.create({
    data: {
      organizationId: organization.id,
      rideRequestId: socialCompletedRequest.id,
      originDestinationId: escOffice.id,
      dropoffDestinationId: seniorCenter.id,
      pickupAddress: "48 Pine St",
      pickupCity: "Lamar",
      pickupCounty: "barton",
      pickupState: "MO",
      pickupPostalCode: "64759",
      dropoffAddress: "1200 Senior Way",
      dropoffCity: "Lamar",
      dropoffCounty: "barton",
      dropoffState: "MO",
      dropoffPostalCode: "64759",
      sequence: 1,
      status: "COMPLETED",
      scheduledPickupAt: new Date("2026-05-21T15:25:00.000Z"),
      scheduledDropoffAt: new Date("2026-05-21T16:00:00.000Z"),
      completedAt: new Date("2026-05-21T16:04:00.000Z"),
      estimatedMiles: "5.20",
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const medicalAssignment = await prisma.assignment.create({
    data: {
      organizationId: organization.id,
      tripLegId: medicalOutbound.id,
      driverId: driverDrew.id,
      status: "ACCEPTED",
      offeredAt: new Date("2026-05-29T18:15:00.000Z"),
      respondedAt: new Date("2026-05-29T18:22:00.000Z"),
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  await prisma.assignment.create({
    data: {
      organizationId: organization.id,
      tripLegId: driverPortalLeg.id,
      driverId: driverDrew.id,
      status: "OFFERED",
      offeredAt: new Date("2026-05-21T20:15:00.000Z"),
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const groceryAssignment = await prisma.assignment.create({
    data: {
      organizationId: organization.id,
      tripLegId: groceryLeg.id,
      driverId: driverNina.id,
      status: "COMPLETED",
      offeredAt: new Date("2026-05-21T15:30:00.000Z"),
      respondedAt: new Date("2026-05-21T15:42:00.000Z"),
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  const socialCompletedAssignment = await prisma.assignment.create({
    data: {
      organizationId: organization.id,
      tripLegId: socialCompletedLeg.id,
      driverId: driverOmar.id,
      status: "COMPLETED",
      offeredAt: new Date("2026-05-19T15:30:00.000Z"),
      respondedAt: new Date("2026-05-19T15:45:00.000Z"),
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  await prisma.assignment.createMany({
    data: [
      {
        organizationId: organization.id,
        tripLegId: recurringOutbound.id,
        driverId: driverOmar.id,
        status: "ACCEPTED",
        offeredAt: new Date("2026-05-30T15:30:00.000Z"),
        respondedAt: new Date("2026-05-30T15:45:00.000Z"),
        createdById: dispatcherUserId,
        updatedById: dispatcherUserId,
      },
      {
        organizationId: organization.id,
        tripLegId: recurringReturn.id,
        driverId: driverOmar.id,
        status: "OFFERED",
        offeredAt: new Date("2026-05-30T15:32:00.000Z"),
        createdById: dispatcherUserId,
        updatedById: dispatcherUserId,
      },
      {
        organizationId: organization.id,
        tripLegId: canceledLeg.id,
        driverId: driverOmar.id,
        status: "CANCELED",
        offeredAt: new Date("2026-05-20T15:00:00.000Z"),
        respondedAt: new Date("2026-05-20T15:25:00.000Z"),
        createdById: dispatcherUserId,
        updatedById: dispatcherUserId,
      },
      {
        organizationId: organization.id,
        tripLegId: noShowLeg.id,
        driverId: driverNina.id,
        status: "ACCEPTED",
        offeredAt: new Date("2026-05-23T15:00:00.000Z"),
        respondedAt: new Date("2026-05-23T15:10:00.000Z"),
        createdById: dispatcherUserId,
        updatedById: dispatcherUserId,
      },
    ],
  });

  const batch = await prisma.reimbursementBatch.create({
    data: {
      organizationId: organization.id,
      driverId: driverNina.id,
      batchNumber: "ESC-2026-05-A",
      status: "REVIEW",
      periodStart: new Date("2026-05-01T00:00:00.000Z"),
      periodEnd: new Date("2026-05-31T23:59:59.000Z"),
      tripCount: 1,
      rateCents: 67,
      totalMiles: "9.80",
      totalCents: 657,
      createdById: financeUserId,
      updatedById: financeUserId,
    },
  });

  const mileageRecord = await prisma.mileageRecord.create({
    data: {
      organizationId: organization.id,
      tripLegId: groceryLeg.id,
      assignmentId: groceryAssignment.id,
      driverId: driverNina.id,
      reimbursementBatchId: batch.id,
      status: "BATCHED",
      serviceDate: new Date("2026-05-22T00:00:00.000Z"),
      estimatedMiles: "4.90",
      submittedMiles: "9.80",
      miles: "9.80",
      rateCents: 67,
      amountCents: 657,
      submittedAt: new Date("2026-05-23T14:10:00.000Z"),
      approvedAt: new Date("2026-05-24T16:30:00.000Z"),
      createdById: financeUserId,
      updatedById: financeUserId,
    },
  });

  await prisma.mileageRecord.create({
    data: {
      organizationId: organization.id,
      tripLegId: socialCompletedLeg.id,
      assignmentId: socialCompletedAssignment.id,
      driverId: driverOmar.id,
      status: "APPROVED",
      serviceDate: new Date("2026-05-21T00:00:00.000Z"),
      estimatedMiles: "5.20",
      submittedMiles: "5.40",
      miles: "5.40",
      rateCents: 67,
      amountCents: 362,
      submittedAt: new Date("2026-05-21T20:00:00.000Z"),
      approvedAt: new Date("2026-05-22T15:00:00.000Z"),
      createdById: financeUserId,
      updatedById: financeUserId,
    },
  });

  const incident = await prisma.incident.create({
    data: {
      organizationId: organization.id,
      severity: "LOW",
      status: "REVIEWING",
      summary: "Rider reported delayed pickup notification",
      details: "Dispatcher reviewed communication timing and noted reminder call process.",
      occurredAt: new Date("2026-05-22T16:40:00.000Z"),
      riderId: riderJames.id,
      driverId: driverNina.id,
      rideRequestId: groceryRequest.id,
      tripLegId: groceryLeg.id,
      assignmentId: groceryAssignment.id,
      createdById: dispatcherUserId,
      updatedById: dispatcherUserId,
    },
  });

  await prisma.communicationLog.createMany({
    data: [
      {
        organizationId: organization.id,
        type: "PHONE",
        subject: "Appointment reminder",
        body: "Confirmed pickup window and mobility notes with rider.",
        occurredAt: new Date("2026-05-31T20:00:00.000Z"),
        riderId: riderMaria.id,
        rideRequestId: medicalRequest.id,
        tripLegId: medicalOutbound.id,
        assignmentId: medicalAssignment.id,
        createdById: dispatcherUserId,
        updatedById: dispatcherUserId,
      },
      {
        organizationId: organization.id,
        type: "NOTE",
        subject: "Incident follow-up",
        body: "Documented delayed pickup notification and follow-up steps.",
        occurredAt: new Date("2026-05-22T19:00:00.000Z"),
        riderId: riderJames.id,
        driverId: driverNina.id,
        rideRequestId: groceryRequest.id,
        tripLegId: groceryLeg.id,
        assignmentId: groceryAssignment.id,
        incidentId: incident.id,
        createdById: dispatcherUserId,
        updatedById: dispatcherUserId,
      },
    ],
  });

  await prisma.document.createMany({
    data: [
      {
        organizationId: organization.id,
        type: "RIDER_INTAKE",
        title: "Maria Thompson intake form",
        storageKey: "esc/riders/maria-thompson/intake.pdf",
        mimeType: "application/pdf",
        sizeBytes: 184320,
        riderId: riderMaria.id,
        createdById: dispatcherUserId,
        updatedById: dispatcherUserId,
      },
      {
        organizationId: organization.id,
        type: "INSURANCE",
        title: "Nina Patel insurance card",
        storageKey: "esc/drivers/nina-patel/insurance.pdf",
        mimeType: "application/pdf",
        sizeBytes: 91220,
        driverId: driverNina.id,
        createdById: adminUserId,
        updatedById: adminUserId,
      },
      {
        organizationId: organization.id,
        type: "REIMBURSEMENT_SUPPORT",
        title: "May mileage reimbursement support",
        storageKey: "esc/reimbursements/ESC-2026-05-A/support.pdf",
        mimeType: "application/pdf",
        sizeBytes: 142100,
        mileageRecordId: mileageRecord.id,
        reimbursementBatchId: batch.id,
        createdById: financeUserId,
        updatedById: financeUserId,
      },
    ],
  });

  await prisma.statusHistory.createMany({
    data: [
      {
        organizationId: organization.id,
        entityType: "RideRequest",
        entityId: medicalRequest.id,
        oldStatus: "REQUESTED",
        newStatus: "SCHEDULED",
        changedById: dispatcherUserId,
        rideRequestId: medicalRequest.id,
        changedAt: new Date("2026-05-29T18:12:00.000Z"),
      },
      {
        organizationId: organization.id,
        entityType: "TripLeg",
        entityId: groceryLeg.id,
        oldStatus: "IN_PROGRESS",
        newStatus: "COMPLETED",
        changedById: dispatcherUserId,
        tripLegId: groceryLeg.id,
        changedAt: new Date("2026-05-22T18:05:00.000Z"),
      },
      {
        organizationId: organization.id,
        entityType: "MileageRecord",
        entityId: mileageRecord.id,
        oldStatus: "APPROVED",
        newStatus: "BATCHED",
        changedById: financeUserId,
        mileageRecordId: mileageRecord.id,
        changedAt: new Date("2026-05-24T17:00:00.000Z"),
      },
      {
        organizationId: organization.id,
        entityType: "TripLeg",
        entityId: canceledLeg.id,
        oldStatus: "ASSIGNED",
        newStatus: "CANCELED",
        changedById: dispatcherUserId,
        tripLegId: canceledLeg.id,
        note: "Rider canceled after appointment changed.",
        changedAt: new Date("2026-05-23T14:00:00.000Z"),
      },
      {
        organizationId: organization.id,
        entityType: "TripLeg",
        entityId: noShowLeg.id,
        oldStatus: "DRIVER_CONFIRMED",
        newStatus: "NO_SHOW",
        changedById: dispatcherUserId,
        tripLegId: noShowLeg.id,
        note: "Driver waited 15 minutes and notified dispatch.",
        changedAt: new Date("2026-05-25T16:42:00.000Z"),
      },
      {
        organizationId: organization.id,
        entityType: "RideRequest",
        entityId: deniedRequest.id,
        oldStatus: "REQUESTED",
        newStatus: "DENIED",
        changedById: dispatcherUserId,
        rideRequestId: deniedRequest.id,
        note: "Same-day request could not be staffed.",
        changedAt: new Date("2026-05-26T15:10:00.000Z"),
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        organizationId: organization.id,
        actorUserId: dispatcherUserId,
        action: "ride_request.scheduled",
        entityType: "RideRequest",
        entityId: medicalRequest.id,
        rideRequestId: medicalRequest.id,
        metadata: { source: "seed" },
      },
      {
        organizationId: organization.id,
        actorUserId: financeUserId,
        action: "reimbursement_batch.created",
        entityType: "ReimbursementBatch",
        entityId: batch.id,
        reimbursementBatchId: batch.id,
        metadata: { source: "seed" },
      },
      {
        organizationId: organization.id,
        actorUserId: dispatcherUserId,
        action: "dispatch.status_changed",
        entityType: "TripLeg",
        entityId: canceledLeg.id,
        tripLegId: canceledLeg.id,
        metadata: { source: "seed", newStatus: "CANCELED" },
      },
      {
        organizationId: organization.id,
        actorUserId: dispatcherUserId,
        action: "dispatch.status_changed",
        entityType: "TripLeg",
        entityId: noShowLeg.id,
        tripLegId: noShowLeg.id,
        metadata: { source: "seed", newStatus: "NO_SHOW" },
      },
    ],
  });
}

async function resetOperationalData(organizationId: string) {
  await prisma.statusHistory.deleteMany({ where: { organizationId } });
  await prisma.auditLog.deleteMany({ where: { organizationId } });
  await prisma.document.deleteMany({ where: { organizationId } });
  await prisma.communicationLog.deleteMany({ where: { organizationId } });
  await prisma.incident.deleteMany({ where: { organizationId } });
  await prisma.mileageRecord.deleteMany({ where: { organizationId } });
  await prisma.reimbursementBatch.deleteMany({ where: { organizationId } });
  await prisma.assignment.deleteMany({ where: { organizationId } });
  await prisma.tripLeg.deleteMany({ where: { organizationId } });
  await prisma.rideRequest.deleteMany({ where: { organizationId } });
  await prisma.driverAvailability.deleteMany({ where: { organizationId } });
  await prisma.destination.deleteMany({ where: { organizationId } });
  await prisma.fundingSource.deleteMany({ where: { organizationId } });
  await prisma.programSetting.deleteMany({ where: { organizationId } });
  await prisma.rider.deleteMany({ where: { organizationId } });
  await prisma.driver.deleteMany({ where: { organizationId } });
}

function buildProgramSettings(organizationId: string, userId?: string) {
  return [
    {
      organizationId,
      category: "service_area",
      key: "countiesServed",
      label: "Counties served",
      description: "Counties where the organization provides transportation services.",
      value: [
        { code: "barton", label: "Barton County", active: true },
        { code: "jasper", label: "Jasper County", active: true },
        { code: "newton", label: "Newton County", active: true },
        { code: "mcdonald", label: "McDonald County", active: true },
      ],
      createdById: userId,
      updatedById: userId,
    },
    {
      organizationId,
      category: "ride_operations",
      key: "ridePurposes",
      label: "Ride purposes",
      description: "Valid ride purpose options shown on request forms.",
      value: [
        { code: "medical", label: "Medical", active: true },
        { code: "employment", label: "Employment", active: true },
        { code: "education", label: "Education", active: true },
        { code: "grocery", label: "Grocery", active: true },
        { code: "social_service", label: "Social service", active: true },
        { code: "community", label: "Community", active: true },
        { code: "other", label: "Other", active: true },
      ],
      createdById: userId,
      updatedById: userId,
    },
    {
      organizationId,
      category: "ride_operations",
      key: "cancellationReasons",
      label: "Cancellation reasons",
      description: "Reasons dispatchers can select when a ride is canceled.",
      value: [
        { code: "rider_canceled", label: "Rider canceled", active: true },
        { code: "driver_unavailable", label: "Driver unavailable", active: true },
        { code: "weather", label: "Weather", active: true },
        { code: "duplicate_request", label: "Duplicate request", active: true },
        { code: "other", label: "Other", active: true },
      ],
      createdById: userId,
      updatedById: userId,
    },
    {
      organizationId,
      category: "ride_operations",
      key: "noShowReasons",
      label: "No-show reasons",
      description: "Reasons used when a rider or driver does not appear for a scheduled leg.",
      value: [
        { code: "rider_not_present", label: "Rider not present", active: true },
        { code: "unable_to_contact_rider", label: "Unable to contact rider", active: true },
        { code: "driver_not_present", label: "Driver not present", active: true },
        { code: "wrong_pickup_location", label: "Wrong pickup location", active: true },
        { code: "other", label: "Other", active: true },
      ],
      createdById: userId,
      updatedById: userId,
    },
    {
      organizationId,
      category: "risk",
      key: "incidentTypes",
      label: "Incident types",
      description: "Incident classifications available during incident intake.",
      value: [
        { code: "safety", label: "Safety concern", active: true },
        { code: "service_delay", label: "Service delay", active: true },
        { code: "vehicle_issue", label: "Vehicle issue", active: true },
        { code: "behavioral", label: "Behavioral concern", active: true },
        { code: "injury", label: "Injury", active: true },
        { code: "other", label: "Other", active: true },
      ],
      createdById: userId,
      updatedById: userId,
    },
    {
      organizationId,
      category: "people",
      key: "driverStatuses",
      label: "Driver statuses",
      description: "Driver lifecycle statuses available to administrative workflows.",
      value: [
        { code: "active", label: "Active", active: true },
        { code: "inactive", label: "Inactive", active: true },
        { code: "pending_onboarding", label: "Pending onboarding", active: true },
        { code: "suspended", label: "Suspended", active: true },
        { code: "archived", label: "Archived", active: true },
      ],
      createdById: userId,
      updatedById: userId,
    },
    {
      organizationId,
      category: "people",
      key: "driverOnboardingStatuses",
      label: "Driver onboarding statuses",
      description: "Driver onboarding workflow statuses.",
      value: [
        { code: "not_started", label: "Not started", active: true },
        { code: "in_progress", label: "In progress", active: true },
        { code: "approved", label: "Approved", active: true },
        { code: "needs_review", label: "Needs review", active: true },
      ],
      createdById: userId,
      updatedById: userId,
    },
    {
      organizationId,
      category: "people",
      key: "backgroundCheckStatuses",
      label: "Background check statuses",
      description: "Background check states available for driver records.",
      value: [
        { code: "not_started", label: "Not started", active: true },
        { code: "pending", label: "Pending", active: true },
        { code: "cleared", label: "Cleared", active: true },
        { code: "flagged", label: "Flagged", active: true },
        { code: "expired", label: "Expired", active: true },
      ],
      createdById: userId,
      updatedById: userId,
    },
    {
      organizationId,
      category: "finance",
      key: "reimbursementPreferences",
      label: "Reimbursement preferences",
      description: "Driver reimbursement payment preferences.",
      value: [
        { code: "direct_deposit", label: "Direct deposit", active: true },
        { code: "paper_check", label: "Paper check", active: true },
        { code: "hold_for_review", label: "Hold for review", active: true },
      ],
      createdById: userId,
      updatedById: userId,
    },
    {
      organizationId,
      category: "people",
      key: "riderStatuses",
      label: "Rider statuses",
      description: "Rider lifecycle statuses available to intake and eligibility workflows.",
      value: [
        { code: "active", label: "Active", active: true },
        { code: "inactive", label: "Inactive", active: true },
        { code: "suspended", label: "Suspended", active: true },
        { code: "archived", label: "Archived", active: true },
      ],
      createdById: userId,
      updatedById: userId,
    },
    {
      organizationId,
      category: "scheduling",
      key: "serviceHours",
      label: "Service hours",
      description: "Default operating windows used by scheduling and dispatch forms.",
      value: {
        timezone: "America/Chicago",
        weekly: [
          { day: "monday", opensAt: "08:00", closesAt: "17:00", active: true },
          { day: "tuesday", opensAt: "08:00", closesAt: "17:00", active: true },
          { day: "wednesday", opensAt: "08:00", closesAt: "17:00", active: true },
          { day: "thursday", opensAt: "08:00", closesAt: "17:00", active: true },
          { day: "friday", opensAt: "08:00", closesAt: "17:00", active: true },
          { day: "saturday", opensAt: null, closesAt: null, active: false },
          { day: "sunday", opensAt: null, closesAt: null, active: false },
        ],
      },
      createdById: userId,
      updatedById: userId,
    },
    {
      organizationId,
      category: "scheduling",
      key: "minimumSchedulingNotice",
      label: "Minimum scheduling notice",
      description: "Minimum notice required before a ride can be scheduled.",
      value: { amount: 2, unit: "business_days" },
      createdById: userId,
      updatedById: userId,
    },
    {
      organizationId,
      category: "finance",
      key: "reimbursementRate",
      label: "Reimbursement rate",
      description: "Default mileage reimbursement rate used for new mileage records.",
      value: { rateCents: 67, unit: "mile", effectiveDate: "2026-01-01" },
      createdById: userId,
      updatedById: userId,
    },
    {
      organizationId,
      category: "communications",
      key: "reminderTemplates",
      label: "Reminder templates",
      description: "Reusable message templates for rider and driver reminders.",
      value: [
        {
          code: "rider_pickup_reminder",
          label: "Rider pickup reminder",
          channel: "sms",
          body: "Reminder: your CARS ride is scheduled for {{pickupTime}}. Please be ready at {{pickupLocation}}.",
          active: true,
        },
        {
          code: "driver_assignment_reminder",
          label: "Driver assignment reminder",
          channel: "sms",
          body: "Reminder: you accepted a CARS trip for {{riderName}} at {{pickupTime}}.",
          active: true,
        },
      ],
      createdById: userId,
      updatedById: userId,
    },
    {
      organizationId,
      category: "finance",
      key: "fundingSources",
      label: "Funding sources",
      description: "Funding source options available to ride request workflows.",
      value: [
        { code: "oaa_transport", label: "Older Americans Act Transportation", active: true },
        { code: "local_match", label: "Local Match", active: true },
        { code: "agency_partner", label: "Agency Partner", active: true },
      ],
      createdById: userId,
      updatedById: userId,
    },
    {
      organizationId,
      category: "destinations",
      key: "destinationTypes",
      label: "Destination types",
      description: "Destination categories available to address and trip-leg forms.",
      value: [
        { code: "home", label: "Home", active: true },
        { code: "medical_facility", label: "Medical facility", active: true },
        { code: "grocery", label: "Grocery", active: true },
        { code: "employer", label: "Employer", active: true },
        { code: "education", label: "Education", active: true },
        { code: "agency_office", label: "Agency office", active: true },
        { code: "other", label: "Other", active: true },
      ],
      createdById: userId,
      updatedById: userId,
    },
  ];
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
