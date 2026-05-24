# CARS Dispatch MVP QA Checklist

Run this checklist against a freshly migrated and seeded database.

## Setup

- [ ] `DATABASE_URL` and `DIRECT_URL` point to the test PostgreSQL database.
- [ ] `npm run db:migrate` completes.
- [ ] `npm run db:seed` completes.
- [ ] `/api/health` returns `{ "ok": true, "database": "ok" }`.

## Role And Tenant Safety

- [ ] Organization admin can access dashboard, settings, admin, dispatch, reports, riders, drivers, mileage, and reimbursements.
- [ ] Dispatcher cannot access admin role/member management.
- [ ] Finance user can approve mileage and manage reimbursements.
- [ ] Driver role can access `/driver-portal` and cannot access staff dashboard pages.
- [ ] Driver portal only shows assignments for the driver matching the signed-in user's email.
- [ ] Editing URL IDs from another organization returns not found or an action error.

## Core Workflow

- [ ] Create rider with valid county, status, emergency contact, eligibility, notes, and pickup instructions.
- [ ] Create driver with valid counties, preferred ride types, verification dates, onboarding status, reimbursement preference, and active status.
- [ ] Add driver availability with preferred counties and max distance.
- [ ] Create ride request for an existing rider.
- [ ] Create ride request while creating a new rider during intake.
- [ ] Confirm one-way request generates one trip leg.
- [ ] Confirm round trip generates outbound and return trip legs.
- [ ] Confirm multiple stops generate additional ordered trip legs.
- [ ] Verify intake warnings for short notice, out-of-county, missing contact info, and incomplete destination.
- [ ] Assign driver and verify availability, county, document, and conflict warnings.
- [ ] Reassign driver and confirm status history/audit log entries.
- [ ] Driver accepts assignment in `/driver-portal`.
- [ ] Driver marks en route, arrived, and completed.
- [ ] Completing a trip creates a starter mileage record with estimated miles and rate.
- [ ] Driver submits mileage and reimbursement amount is calculated.
- [ ] Finance approves submitted mileage.
- [ ] Finance rejects submitted mileage with required reason.
- [ ] Finance adjusts mileage with required reason and audit metadata.
- [ ] Finance creates reimbursement batch for approved unbatched mileage.
- [ ] Finance marks reimbursement batch paid.
- [ ] Reports dashboard updates metrics and charts from operational data.
- [ ] Reports CSV export downloads filtered data.

## Exception Workflow

- [ ] Canceling a trip requires a reason.
- [ ] Marking no-show requires a reason.
- [ ] Driver declining assignment requires a reason, notifies dispatch, and moves trip to attention queue.
- [ ] Driver reporting issue creates an incident/communication record and moves trip to attention queue.
- [ ] Sensitive rider notes are hidden from unauthorized staff and never shown in driver portal.

## UI Quality

- [ ] Empty states render for no records in riders, drivers, dispatch, mileage, reimbursements, reports, and settings.
- [ ] Loading states render for dashboard, reports, and driver portal.
- [ ] Error boundaries provide recovery buttons.
- [ ] Mobile navigation is usable at 375px width.
- [ ] Driver portal tap targets are large and readable on a phone.
- [ ] Form controls have labels or accessible names.
- [ ] Tables remain horizontally scrollable on narrow screens.
