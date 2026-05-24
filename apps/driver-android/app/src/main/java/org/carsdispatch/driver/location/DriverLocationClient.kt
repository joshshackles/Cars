package org.carsdispatch.driver.location

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull
import org.carsdispatch.driver.data.LocationPayload
import java.time.Instant

class DriverLocationClient(private val context: Context) {
    private val fusedClient = LocationServices.getFusedLocationProviderClient(context)

    fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    }

    @SuppressLint("MissingPermission")
    suspend fun currentLocation(): LocationPayload {
        require(hasLocationPermission()) { "Location permission is required to track trip mileage." }
        val location = withTimeoutOrNull(8_000L) {
            fusedClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null).await()
        } ?: withTimeoutOrNull(3_000L) {
            fusedClient.lastLocation.await()
        } ?: throw IllegalStateException("Unable to get current GPS location. Check location services and try again.")

        return location.toPayload()
    }

    @SuppressLint("MissingPermission")
    fun tripLocationFlow(): Flow<LocationPayload> = callbackFlow {
        require(hasLocationPermission()) { "Location permission is required to track trip mileage." }

        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 20_000L)
            .setMinUpdateDistanceMeters(45f)
            .setWaitForAccurateLocation(false)
            .build()

        val callback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.locations.forEach { trySend(it.toPayload()) }
            }
        }

        fusedClient.requestLocationUpdates(request, callback, context.mainLooper)
        awaitClose { fusedClient.removeLocationUpdates(callback) }
    }
}

private fun android.location.Location.toPayload(): LocationPayload {
    return LocationPayload(
        latitude = latitude,
        longitude = longitude,
        accuracyMeters = if (hasAccuracy()) accuracy.toDouble() else null,
        speedMetersPerSecond = if (hasSpeed()) speed.toDouble() else null,
        headingDegrees = if (hasBearing()) bearing.toDouble() else null,
        capturedAt = Instant.ofEpochMilli(time).toString()
    )
}
