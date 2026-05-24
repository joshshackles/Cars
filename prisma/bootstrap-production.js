const { PrismaClient } = require("@prisma/client");

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
];

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
};

const roleLabels = {
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
    update: { name: "Economic Security Corporation" },
    create: {
      name: "Economic Security Corporation",
      slug: "economic-security-corporation",
    },
  });

  const permissionIds = new Map();
  for (const [key, name] of permissions) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: { name },
      create: { key, name },
    });
    permissionIds.set(key, permission.id);
  }

  const roleIds = new Map();
  for (const [key, rolePermissions] of Object.entries(roleDefinitions)) {
    const role = await prisma.role.upsert({
      where: { organizationId_key: { organizationId: organization.id, key } },
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
    roleIds.set(key, role.id);

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: rolePermissions.map((permissionKey) => ({
        roleId: role.id,
        permissionId: permissionIds.get(permissionKey),
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
  ];

  let adminUserId;
  for (const [email, name, roleKey] of users) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, organizationId: organization.id },
      create: { email, name, organizationId: organization.id },
    });
    if (email === "admin@esc.example") adminUserId = user.id;

    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
      update: { roleId: roleIds.get(roleKey), deletedAt: null, deletedById: null },
      create: { userId: user.id, organizationId: organization.id, roleId: roleIds.get(roleKey) },
    });
  }

  const fundingSource = await prisma.fundingSource.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: "OAA-TRANSPORT",
      },
    },
    update: {
      name: "Older Americans Act Transportation",
      active: true,
      updatedById: adminUserId,
    },
    create: {
      organizationId: organization.id,
      name: "Older Americans Act Transportation",
      code: "OAA-TRANSPORT",
      description: "Transportation funding for eligible rider services.",
      createdById: adminUserId,
      updatedById: adminUserId,
    },
  });

  const driverProfile = await prisma.driver.findFirst({
    where: {
      organizationId: organization.id,
      email: "driver@esc.example",
      deletedAt: null,
    },
  });

  const driverData = {
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
    backgroundCheckStatus: "cleared",
    onboardingStatus: "approved",
    reimbursementPreference: "direct_deposit",
    status: "active",
    vehicleLabel: "2021 Toyota Sienna",
    driverNotes: "Baseline driver profile linked to the demo driver login.",
    updatedById: adminUserId,
  };

  if (driverProfile) {
    await prisma.driver.update({
      where: { id: driverProfile.id },
      data: driverData,
    });
  } else {
    await prisma.driver.create({
      data: {
        organizationId: organization.id,
        ...driverData,
        createdById: adminUserId,
      },
    });
  }

  await seedOperationalDemoData(organization.id, adminUserId, fundingSource.id);

  for (const setting of buildProgramSettings(organization.id, adminUserId)) {
    await prisma.programSetting.upsert({
      where: { organizationId_key: { organizationId: organization.id, key: setting.key } },
      update: {
        category: setting.category,
        label: setting.label,
        description: setting.description,
        value: setting.value,
        updatedById: adminUserId,
        deletedAt: null,
        deletedById: null,
      },
      create: setting,
    });
  }

  console.log("Production bootstrap complete.");
}

async function seedOperationalDemoData(organizationId, userId, fundingSourceId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const rider = await upsertFirst(
    () => prisma.rider.findFirst({ where: { organizationId, email: "casey.rider@example.org", deletedAt: null } }),
    (existing) =>
      existing
        ? prisma.rider.update({
            where: { id: existing.id },
            data: {
              displayName: "Casey Rider",
              firstName: "Casey",
              lastName: "Rider",
              phone: "417-555-0115",
              status: "active",
              county: "jasper",
              updatedById: userId,
            },
          })
        : prisma.rider.create({
            data: {
              organizationId,
              displayName: "Casey Rider",
              firstName: "Casey",
              lastName: "Rider",
              phone: "417-555-0115",
              email: "casey.rider@example.org",
              addressLine1: "302 Main St",
              city: "Joplin",
              county: "jasper",
              state: "MO",
              postalCode: "64801",
              communicationPreference: "phone",
              status: "active",
              eligibilityConfirmed: true,
              intakeDate: today,
              pickupInstructions: "Use front entrance on Main Street.",
              riderNotes: "Demo rider for operational dashboard and dispatch workflows.",
              createdById: userId,
              updatedById: userId,
            },
          })
  );

  const driver = await prisma.driver.findFirst({
    where: { organizationId, email: "driver@esc.example", deletedAt: null },
  });

  if (!driver) return;

  await upsertFirst(
    () => prisma.driverAvailability.findFirst({ where: { organizationId, driverId: driver.id, notes: "bootstrap-demo-availability", deletedAt: null } }),
    (existing) =>
      existing
        ? prisma.driverAvailability.update({
            where: { id: existing.id },
            data: {
              startsAt: new Date(today.getTime() + 8 * 60 * 60 * 1000),
              endsAt: new Date(today.getTime() + 17 * 60 * 60 * 1000),
              updatedById: userId,
            },
          })
        : prisma.driverAvailability.create({
            data: {
              organizationId,
              driverId: driver.id,
              status: "AVAILABLE",
              availabilityType: "one_time",
              preferredCounties: ["jasper", "newton"],
              maxDistanceMiles: 45,
              startsAt: new Date(today.getTime() + 8 * 60 * 60 * 1000),
              endsAt: new Date(today.getTime() + 17 * 60 * 60 * 1000),
              notes: "bootstrap-demo-availability",
              createdById: userId,
              updatedById: userId,
            },
          })
  );

  const destination = await upsertFirst(
    () => prisma.destination.findFirst({ where: { organizationId, name: "Joplin Community Clinic", deletedAt: null } }),
    (existing) =>
      existing
        ? prisma.destination.update({ where: { id: existing.id }, data: { updatedById: userId } })
        : prisma.destination.create({
            data: {
              organizationId,
              name: "Joplin Community Clinic",
              destinationType: "medical_facility",
              addressLine1: "221 Clinic Way",
              city: "Joplin",
              state: "MO",
              postalCode: "64801",
              notes: "Demo medical destination.",
              createdById: userId,
              updatedById: userId,
            },
          })
  );

  const request = await upsertFirst(
    () => prisma.rideRequest.findFirst({ where: { organizationId, notes: "bootstrap-demo-today-request", deletedAt: null } }),
    (existing) =>
      existing
        ? prisma.rideRequest.update({
            where: { id: existing.id },
            data: {
              riderId: rider.id,
              fundingSourceId,
              status: "SCHEDULED",
              neededAt: new Date(today.getTime() + 10 * 60 * 60 * 1000),
              updatedById: userId,
            },
          })
        : prisma.rideRequest.create({
            data: {
              organizationId,
              riderId: rider.id,
              fundingSourceId,
              status: "SCHEDULED",
              purpose: "medical",
              requestSource: "phone",
              neededAt: new Date(today.getTime() + 10 * 60 * 60 * 1000),
              pickupWindowStart: new Date(today.getTime() + 9 * 60 * 60 * 1000 + 30 * 60 * 1000),
              pickupWindowEnd: new Date(today.getTime() + 10 * 60 * 60 * 1000),
              specialInstructions: "Demo scheduled ride for today.",
              notes: "bootstrap-demo-today-request",
              createdById: userId,
              updatedById: userId,
            },
          })
  );

  const trip = await upsertFirst(
    () => prisma.tripLeg.findFirst({ where: { organizationId, rideRequestId: request.id, notes: "bootstrap-demo-today-trip", deletedAt: null } }),
    (existing) =>
      existing
        ? prisma.tripLeg.update({
            where: { id: existing.id },
            data: {
              scheduledPickupAt: new Date(today.getTime() + 9 * 60 * 60 * 1000 + 45 * 60 * 1000),
              scheduledDropoffAt: new Date(today.getTime() + 10 * 60 * 60 * 1000 + 15 * 60 * 1000),
              status: "ASSIGNED",
              updatedById: userId,
            },
          })
        : prisma.tripLeg.create({
            data: {
              organizationId,
              rideRequestId: request.id,
              dropoffDestinationId: destination.id,
              sequence: 1,
              status: "ASSIGNED",
              pickupAddress: "302 Main St",
              pickupCity: "Joplin",
              pickupCounty: "jasper",
              pickupState: "MO",
              pickupPostalCode: "64801",
              dropoffAddress: "221 Clinic Way",
              dropoffCity: "Joplin",
              dropoffCounty: "jasper",
              dropoffState: "MO",
              dropoffPostalCode: "64801",
              scheduledPickupAt: new Date(today.getTime() + 9 * 60 * 60 * 1000 + 45 * 60 * 1000),
              scheduledDropoffAt: new Date(today.getTime() + 10 * 60 * 60 * 1000 + 15 * 60 * 1000),
              estimatedMiles: 8.4,
              notes: "bootstrap-demo-today-trip",
              createdById: userId,
              updatedById: userId,
            },
          })
  );

  const assignment = await prisma.assignment.upsert({
    where: { tripLegId: trip.id },
    update: {
      driverId: driver.id,
      status: "ACCEPTED",
      updatedById: userId,
      deletedAt: null,
      deletedById: null,
    },
    create: {
      organizationId,
      tripLegId: trip.id,
      driverId: driver.id,
      status: "ACCEPTED",
      respondedAt: new Date(today.getTime() + 8 * 60 * 60 * 1000),
      notes: "Demo accepted assignment.",
      createdById: userId,
      updatedById: userId,
    },
  });

  const completedRequest = await upsertFirst(
    () => prisma.rideRequest.findFirst({ where: { organizationId, notes: "bootstrap-demo-completed-request", deletedAt: null } }),
    (existing) =>
      existing
        ? prisma.rideRequest.update({ where: { id: existing.id }, data: { riderId: rider.id, status: "COMPLETED", neededAt: yesterday, updatedById: userId } })
        : prisma.rideRequest.create({
            data: {
              organizationId,
              riderId: rider.id,
              fundingSourceId,
              status: "COMPLETED",
              purpose: "grocery",
              requestSource: "phone",
              neededAt: new Date(yesterday.getTime() + 11 * 60 * 60 * 1000),
              notes: "bootstrap-demo-completed-request",
              createdById: userId,
              updatedById: userId,
            },
          })
  );

  const completedTrip = await upsertFirst(
    () => prisma.tripLeg.findFirst({ where: { organizationId, rideRequestId: completedRequest.id, notes: "bootstrap-demo-completed-trip", deletedAt: null } }),
    (existing) =>
      existing
        ? prisma.tripLeg.update({ where: { id: existing.id }, data: { status: "COMPLETED", completedAt: new Date(yesterday.getTime() + 12 * 60 * 60 * 1000), updatedById: userId } })
        : prisma.tripLeg.create({
            data: {
              organizationId,
              rideRequestId: completedRequest.id,
              sequence: 1,
              status: "COMPLETED",
              pickupAddress: "302 Main St",
              pickupCity: "Joplin",
              pickupCounty: "jasper",
              pickupState: "MO",
              dropoffAddress: "Food Market",
              dropoffCity: "Joplin",
              dropoffCounty: "jasper",
              dropoffState: "MO",
              scheduledPickupAt: new Date(yesterday.getTime() + 11 * 60 * 60 * 1000),
              scheduledDropoffAt: new Date(yesterday.getTime() + 12 * 60 * 60 * 1000),
              completedAt: new Date(yesterday.getTime() + 12 * 60 * 60 * 1000),
              estimatedMiles: 6.2,
              notes: "bootstrap-demo-completed-trip",
              createdById: userId,
              updatedById: userId,
            },
          })
  );

  const completedAssignment = await prisma.assignment.upsert({
    where: { tripLegId: completedTrip.id },
    update: { driverId: driver.id, status: "COMPLETED", updatedById: userId, deletedAt: null, deletedById: null },
    create: {
      organizationId,
      tripLegId: completedTrip.id,
      driverId: driver.id,
      status: "COMPLETED",
      respondedAt: new Date(yesterday.getTime() + 10 * 60 * 60 * 1000),
      notes: "Demo completed assignment.",
      createdById: userId,
      updatedById: userId,
    },
  });

  await prisma.mileageRecord.upsert({
    where: { tripLegId: completedTrip.id },
    update: {
      assignmentId: completedAssignment.id,
      driverId: driver.id,
      status: "APPROVED",
      serviceDate: yesterday,
      estimatedMiles: 6.2,
      submittedMiles: 6.5,
      miles: 6.5,
      rateCents: 67,
      amountCents: 436,
      approvedAt: new Date(yesterday.getTime() + 13 * 60 * 60 * 1000),
      updatedById: userId,
      deletedAt: null,
      deletedById: null,
    },
    create: {
      organizationId,
      tripLegId: completedTrip.id,
      assignmentId: completedAssignment.id,
      driverId: driver.id,
      status: "APPROVED",
      serviceDate: yesterday,
      estimatedMiles: 6.2,
      submittedMiles: 6.5,
      miles: 6.5,
      rateCents: 67,
      amountCents: 436,
      submittedAt: new Date(yesterday.getTime() + 12 * 60 * 60 * 1000),
      approvedAt: new Date(yesterday.getTime() + 13 * 60 * 60 * 1000),
      createdById: userId,
      updatedById: userId,
    },
  });

  await upsertFirst(
    () => prisma.incident.findFirst({ where: { organizationId, summary: "Demo dispatch attention item", deletedAt: null } }),
    (existing) =>
      existing
        ? prisma.incident.update({ where: { id: existing.id }, data: { status: "REVIEWING", updatedById: userId } })
        : prisma.incident.create({
            data: {
              organizationId,
              severity: "MEDIUM",
              status: "REVIEWING",
              summary: "Demo dispatch attention item",
              details: "Seeded incident used to exercise the incident queue and notification pathway.",
              riderId: rider.id,
              driverId: driver.id,
              rideRequestId: request.id,
              tripLegId: trip.id,
              assignmentId: assignment.id,
              createdById: userId,
              updatedById: userId,
            },
          })
  );
}

async function upsertFirst(findExisting, write) {
  const existing = await findExisting();
  return write(existing);
}

function buildProgramSettings(organizationId, userId) {
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
