# CARS Mobile Driver Dashboard Tools

This file documents the driver dashboard tools in the native Android app and the data/service each one uses.

## Manifest

Opens the driver dashboard manifest for today. Uses `CarsApi.manifest(date)` and `ManifestResponse.assignments`.

Trips are grouped into active and completed sections, with each trip opening detail tools for route navigation, calling the rider, status actions, GPS mileage capture, completion, and issue reporting.

## Availability

Opens the driver schedule manager. Uses `CarsApi.driverTools()` and `DriverToolsResponse.driver.availabilities`, with writes through `CarsApi.addAvailability(payload)`.

Drivers can see today's availability state, upcoming blocks, mark available/unavailable, and add a date/time availability block.

## Vehicle

Opens vehicle and insurance information. Uses `DriverToolsResponse.driver` and saves supported fields through `CarsApi.updateDriverInfo(payload)`.

Currently supported by the mobile API: year, make, model, insurance verification date, and reimbursement preference. License plate, inspection, registration, odometer, and vehicle notes are intentionally shown as future API-backed fields.

## Rides

Opens upcoming and past ride history. Uses today's `ManifestResponse.assignments` plus `DriverToolsResponse.upcomingRides` and `DriverToolsResponse.pastRides`.

Filters include today, upcoming, completed, canceled/no-show, and all. Ride cards show rider, pickup/destination, status, mileage if available, and API placeholder text for status history/notes.

## Mileage

Opens the mileage center. Uses active tracking state, manifest mileage records, and `DriverReimbursementSummary.mileageRecords`.

Shows today's GPS point summary, completed mileage records, and a manual fallback instruction for GPS failures.

## Pay & Reimbursements

Opens reimbursement tracking. Uses `DriverToolsResponse.reimbursement`.

Shows pending and paid totals, mileage records, and reimbursement batches. This is reimbursement tracking, not payroll.

## Request Help

Opens a dispatch help form. Uses `DriverSupportService`.

If an active assignment exists, the request is sent through the existing trip issue endpoint with `CarsApi.reportIssue`. If no assignment exists, the typed placeholder returns a local success message until a general driver support endpoint is added.

## Settings

Opens app and driver settings. Uses local app/device state plus session role.

Shows GPS permission status, notification/GPS/privacy notes, default navigation info, app version, full driver cabinet access, support, and sign out.

## Profile

Opens the existing mobile profile editor. Uses `CarsApi.profile()` and `CarsApi.updateProfile(payload)`.

Drivers can update contact-style profile fields currently exposed through the shared mobile profile endpoint.

## Support

Opens support/contact. Uses centralized `CarsProgramConfig.DispatchPhoneDisplay` and `CarsProgramConfig.DispatchPhoneUri`.

Includes Call CARS, emergency guidance, help topics, non-emergency support request access, and role display.

## Call CARS Dispatch

Uses the centralized dispatch phone config in `CarsProgramConfig`.

Do not hardcode the dispatch phone number elsewhere in the app; route phone actions through `CarsProgramConfig.DispatchPhoneUri`.
