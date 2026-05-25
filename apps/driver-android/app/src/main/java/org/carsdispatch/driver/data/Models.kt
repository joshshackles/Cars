package org.carsdispatch.driver.data

import kotlinx.serialization.Serializable

@Serializable
data class MobileSession(
    val token: String,
    val expiresAt: String,
    val user: UserSummary,
    val organization: OrganizationSummary,
    val role: String? = null,
    val permissions: List<String> = emptyList(),
    val driver: DriverSummary? = null
)

@Serializable
data class UserSummary(val id: String, val name: String, val email: String)

@Serializable
data class OrganizationSummary(val id: String, val name: String, val slug: String)

@Serializable
data class DriverSummary(val id: String, val name: String, val status: String)

@Serializable
data class MobileProfile(
    val user: UserSummary,
    val organization: OrganizationSummary,
    val role: String? = null,
    val permissions: List<String> = emptyList(),
    val driver: DriverSummary? = null,
    val rider: MobileRiderProfile? = null
)

@Serializable
data class MobileRiderProfile(
    val id: String,
    val displayName: String,
    val firstName: String,
    val lastName: String,
    val phone: String? = null,
    val email: String? = null,
    val addressLine1: String? = null,
    val city: String? = null,
    val county: String? = null,
    val state: String? = null,
    val postalCode: String? = null,
    val communicationPreference: String? = null,
    val pickupInstructions: String? = null
)

@Serializable
data class ProfileUpdatePayload(
    val name: String,
    val phone: String,
    val addressLine1: String,
    val city: String,
    val county: String,
    val state: String,
    val postalCode: String,
    val communicationPreference: String,
    val pickupInstructions: String
)

@Serializable
data class RideRequestPayload(
    val pickupAddress: String,
    val pickupCity: String,
    val pickupCounty: String,
    val pickupState: String,
    val pickupPostalCode: String,
    val dropoffAddress: String,
    val dropoffCity: String,
    val dropoffCounty: String,
    val dropoffState: String,
    val dropoffPostalCode: String,
    val appointmentAt: String,
    val ridePurpose: String,
    val specialInstructions: String
)

@Serializable
data class MobileRideRequestResult(
    val id: String,
    val status: String,
    val tripLegCount: Int
)

@Serializable
data class ManifestResponse(
    val date: String,
    val assignments: List<ManifestAssignment> = emptyList()
)

@Serializable
data class ManifestAssignment(
    val id: String,
    val status: String,
    val mileageRecord: MileageRecord? = null,
    val tripLeg: TripLeg
)

@Serializable
data class MileageRecord(
    val miles: String? = null,
    val status: String,
    val mileageSource: String? = null,
    val gpsDistanceMiles: String? = null,
    val gpsPointCount: Int = 0
)

@Serializable
data class TripLeg(
    val id: String,
    val status: String,
    val scheduledPickupAt: String,
    val scheduledDropoffAt: String? = null,
    val pickupAddress: String? = null,
    val pickupCity: String? = null,
    val pickupState: String? = null,
    val pickupPostalCode: String? = null,
    val pickupCounty: String? = null,
    val dropoffAddress: String? = null,
    val dropoffCity: String? = null,
    val dropoffState: String? = null,
    val dropoffPostalCode: String? = null,
    val dropoffCounty: String? = null,
    val rideRequest: RideRequestSummary
)

@Serializable
data class RideRequestSummary(
    val id: String,
    val purpose: String,
    val specialInstructions: String? = null,
    val rider: RiderSummary
)

@Serializable
data class RiderSummary(
    val id: String,
    val firstName: String,
    val lastName: String,
    val phone: String? = null,
    val communicationPreference: String? = null,
    val mobilityNotes: String? = null,
    val riderNotes: String? = null,
    val pickupInstructions: String? = null
)

@Serializable
data class LocationPayload(
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Double? = null,
    val speedMetersPerSecond: Double? = null,
    val headingDegrees: Double? = null,
    val capturedAt: String
)

@Serializable
data class DriverToolsResponse(
    val driver: DriverToolsProfile,
    val upcomingRides: List<DriverRideSummary> = emptyList(),
    val pastRides: List<DriverRideSummary> = emptyList(),
    val reimbursement: DriverReimbursementSummary
)

@Serializable
data class DriverToolsProfile(
    val id: String,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val status: String,
    val vehicleMake: String? = null,
    val vehicleModel: String? = null,
    val vehicleYear: Int? = null,
    val vehicleLabel: String? = null,
    val insuranceVerificationDate: String? = null,
    val reimbursementPreference: String? = null,
    val availabilities: List<DriverAvailabilitySummary> = emptyList()
)

@Serializable
data class DriverAvailabilitySummary(
    val id: String,
    val status: String,
    val availabilityType: String,
    val startsAt: String,
    val endsAt: String,
    val preferredCounties: List<String> = emptyList(),
    val maxDistanceMiles: Int? = null,
    val notes: String? = null
)

@Serializable
data class DriverRideSummary(
    val id: String,
    val status: String,
    val tripStatus: String,
    val scheduledPickupAt: String,
    val riderName: String,
    val purpose: String,
    val pickupAddress: String? = null,
    val pickupCity: String? = null,
    val pickupCounty: String? = null,
    val dropoffAddress: String? = null,
    val dropoffCity: String? = null,
    val dropoffCounty: String? = null,
    val mileage: DriverRideMileage? = null
)

@Serializable
data class DriverRideMileage(
    val miles: String,
    val amountCents: Int,
    val status: String
)

@Serializable
data class DriverReimbursementSummary(
    val pendingCents: Int,
    val paidCents: Int,
    val mileageRecords: List<DriverMileageSummary> = emptyList(),
    val batches: List<DriverReimbursementBatchSummary> = emptyList()
)

@Serializable
data class DriverMileageSummary(
    val id: String,
    val serviceDate: String,
    val miles: String,
    val amountCents: Int,
    val status: String,
    val riderName: String,
    val batchNumber: String? = null,
    val batchStatus: String? = null
)

@Serializable
data class DriverReimbursementBatchSummary(
    val id: String,
    val batchNumber: String,
    val status: String,
    val periodStart: String,
    val periodEnd: String,
    val tripCount: Int,
    val totalMiles: String,
    val totalCents: Int,
    val paymentStatus: String,
    val paidAt: String? = null
)

@Serializable
data class DriverInfoUpdatePayload(
    val vehicleYear: Int? = null,
    val vehicleMake: String? = null,
    val vehicleModel: String? = null,
    val insuranceVerificationDate: String? = null,
    val reimbursementPreference: String? = null
)

@Serializable
data class DriverAvailabilityPayload(
    val availabilityType: String,
    val status: String,
    val startsAt: String,
    val endsAt: String,
    val recurrenceRule: String? = null,
    val preferredCounties: List<String> = emptyList(),
    val maxDistanceMiles: Int? = null,
    val notes: String? = null
)
