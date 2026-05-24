package org.carsdispatch.driver.data

import kotlinx.serialization.Serializable

@Serializable
data class MobileSession(
    val token: String,
    val expiresAt: String,
    val user: UserSummary,
    val organization: OrganizationSummary,
    val driver: DriverSummary
)

@Serializable
data class UserSummary(val id: String, val name: String, val email: String)

@Serializable
data class OrganizationSummary(val id: String, val name: String, val slug: String)

@Serializable
data class DriverSummary(val id: String, val name: String, val status: String)

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
