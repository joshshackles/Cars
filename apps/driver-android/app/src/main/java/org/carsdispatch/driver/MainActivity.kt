package org.carsdispatch.driver

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.ReportProblem
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import org.carsdispatch.driver.data.CarsApi
import org.carsdispatch.driver.data.ManifestAssignment
import org.carsdispatch.driver.data.ManifestResponse
import org.carsdispatch.driver.data.MobileSession
import org.carsdispatch.driver.data.SessionStore
import org.carsdispatch.driver.location.DriverLocationClient
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { CarsDriverApp() }
    }
}

@Composable
fun CarsDriverApp() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sessionStore = remember { SessionStore(context) }
    var session by remember { mutableStateOf<MobileSession?>(null) }
    var manifest by remember { mutableStateOf<ManifestResponse?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var activeTracking by remember { mutableStateOf<TrackingState?>(null) }
    var trackingJob by remember { mutableStateOf<Job?>(null) }
    val api = remember(session?.token) { CarsApi { session?.token } }

    fun locationClient(): DriverLocationClient {
        return DriverLocationClient(context.applicationContext)
    }

    fun isInvalidSession(error: Throwable): Boolean {
        return error.message?.contains("401") == true || error.message?.contains("expired", ignoreCase = true) == true
    }

    fun refreshManifest() {
        if (session == null) return
        scope.launch {
            busy = true
            error = null
            runCatching { api.manifest(LocalDate.now().toString()) }
                .onSuccess { manifest = it }
                .onFailure { error = it.message }
            busy = false
        }
    }

    LaunchedEffect(Unit) {
        val stored = sessionStore.load()
        session = stored
        if (stored != null) {
            busy = true
            runCatching { CarsApi { stored.token }.manifest(LocalDate.now().toString()) }
                .onSuccess { manifest = it }
                .onFailure {
                    if (isInvalidSession(it)) {
                        sessionStore.clear()
                        session = null
                        manifest = null
                        error = "Please sign in again for this CARS Dispatch deployment."
                    } else {
                        error = it.message
                    }
                }
            busy = false
        }
    }

    CarsTheme {
        Surface(color = CarsColors.Soft, modifier = Modifier.fillMaxSize()) {
            if (session == null) {
                LoginScreen(
                    busy = busy,
                    error = error,
                    onLogin = { email, accessCode ->
                        scope.launch {
                            busy = true
                            error = null
                            runCatching {
                                val nextSession = CarsApi { null }.login(email, accessCode, "Android")
                                val nextManifest = CarsApi { nextSession.token }.manifest(LocalDate.now().toString())
                                sessionStore.save(nextSession)
                                session = nextSession
                                manifest = nextManifest
                            }.onFailure {
                                error = it.message
                            }
                            busy = false
                        }
                    }
                )
            } else {
                DriverDashboard(
                    session = session!!,
                    manifest = manifest,
                    busy = busy,
                    error = error,
                    activeTracking = activeTracking,
                    onRefresh = ::refreshManifest,
                    onLogout = {
                        scope.launch {
                            runCatching { api.logout() }
                            trackingJob?.cancel()
                            sessionStore.clear()
                            session = null
                            manifest = null
                            activeTracking = null
                        }
                    },
                    onAction = { _, action ->
                        scope.launch {
                            busy = true
                            error = null
                            runCatching { action(api) }
                                .onFailure { error = it.message }
                            runCatching { api.manifest(LocalDate.now().toString()) }
                                .onSuccess { manifest = it }
                            busy = false
                        }
                    },
                    onStartTracking = { assignment ->
                        scope.launch {
                            busy = true
                            error = null
                            runCatching {
                                val first = locationClient().currentLocation()
                                api.startAssignment(assignment.id, first, assignment.routeUrl())
                                trackingJob?.cancel()
                                activeTracking = TrackingState(assignment.id, 1)
                                trackingJob = launch {
                                    locationClient().tripLocationFlow().collect { point ->
                                        val current = activeTracking
                                        activeTracking = current?.copy(points = current.points + 1)
                                        runCatching { api.sendLocation(assignment.id, point) }
                                    }
                                }
                            }.onFailure { error = it.message }
                            runCatching { api.manifest(LocalDate.now().toString()) }
                                .onSuccess { manifest = it }
                            busy = false
                        }
                    },
                    onCompleteTracking = { assignment ->
                        scope.launch {
                            busy = true
                            error = null
                            runCatching {
                                val last = locationClient().currentLocation()
                                api.completeAssignment(assignment.id, last, assignment.routeUrl())
                                trackingJob?.cancel()
                                trackingJob = null
                                activeTracking = null
                            }.onFailure { error = it.message }
                            runCatching { api.manifest(LocalDate.now().toString()) }
                                .onSuccess { manifest = it }
                            busy = false
                        }
                    }
                )
            }
        }
    }
}

data class TrackingState(val assignmentId: String, val points: Int)

fun hasLocationPermission(context: Context): Boolean {
    return ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
}

@Composable
fun LoginScreen(busy: Boolean, error: String?, onLogin: (String, String) -> Unit) {
    var email by remember { mutableStateOf("driver@esc.example") }
    var accessCode by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CarsColors.Navy)
            .safeDrawingPadding()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Icon(Icons.Default.DirectionsCar, contentDescription = null, tint = Color.White, modifier = Modifier.size(58.dp))
        Spacer(Modifier.height(16.dp))
        Text("CARS Driver", color = Color.White, fontSize = 36.sp, fontWeight = FontWeight.Black)
        Text("Native Android trip manifest, route, GPS mileage, and dispatch issue reporting.", color = CarsColors.PaleBlue)
        Spacer(Modifier.height(22.dp))
        Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(email, { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(
                    accessCode,
                    { accessCode = it },
                    label = { Text("Access code") },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth()
                )
                PrimaryButton("Sign in", busy) { onLogin(email, accessCode) }
                if (error != null) ErrorText(error)
                Text("Connected to ${BuildConfig.CARS_API_BASE_URL}", color = CarsColors.Muted, fontSize = 12.sp)
            }
        }
    }
}

@Composable
fun DriverDashboard(
    session: MobileSession,
    manifest: ManifestResponse?,
    busy: Boolean,
    error: String?,
    activeTracking: TrackingState?,
    onRefresh: () -> Unit,
    onLogout: () -> Unit,
    onAction: (String, suspend (CarsApi) -> Unit) -> Unit,
    onStartTracking: (ManifestAssignment) -> Unit,
    onCompleteTracking: (ManifestAssignment) -> Unit
) {
    val context = LocalContext.current
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) {}

    LaunchedEffect(Unit) {
        if (!hasLocationPermission(context)) {
            permissionLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
        }
    }

    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier
                .fillMaxWidth()
                .background(CarsColors.Navy)
                .safeDrawingPadding()
                .padding(18.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f)) {
                Text("CARS Driver", color = CarsColors.PaleBlue, fontWeight = FontWeight.Bold)
                Text(session.driver.name, color = Color.White, fontSize = 26.sp, fontWeight = FontWeight.Black)
                Text(session.organization.name, color = CarsColors.PaleBlue)
            }
            TextButton(onClick = onLogout) {
                Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, tint = Color.White)
                Spacer(Modifier.width(6.dp))
                Text("Sign out", color = Color.White)
            }
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 36.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item {
                SummaryCard(manifest, activeTracking, busy, error, onRefresh)
            }
            if (manifest?.assignments.isNullOrEmpty()) {
                item { EmptyManifestCard() }
            } else {
                items(manifest!!.assignments, key = { it.id }) { assignment ->
                    TripCard(
                        assignment = assignment,
                        activeTracking = activeTracking,
                        onOpenRoute = {
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(assignment.routeUrl())))
                        },
                        onCallRider = {
                            assignment.tripLeg.rideRequest.rider.phone?.let {
                                context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$it")))
                            }
                        },
                        onAccept = { onAction("accept") { it.acceptAssignment(assignment.id) } },
                        onDecline = { reason -> onAction("decline") { it.declineAssignment(assignment.id, reason) } },
                        onStart = { onStartTracking(assignment) },
                        onArrived = {
                            onAction("arrived") {
                                it.arrived(assignment.id, DriverLocationClient(context.applicationContext).currentLocation())
                            }
                        },
                        onComplete = { onCompleteTracking(assignment) },
                        onReportIssue = { summary, details ->
                            onAction("issue") { it.reportIssue(assignment.id, summary, details) }
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun SummaryCard(
    manifest: ManifestResponse?,
    activeTracking: TrackingState?,
    busy: Boolean,
    error: String?,
    onRefresh: () -> Unit
) {
    Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Driver dashboard", fontSize = 22.sp, fontWeight = FontWeight.Black, color = CarsColors.Navy)
                    Text("Today's manifest and GPS mileage capture", color = CarsColors.Muted)
                }
                OutlinedButton(onClick = onRefresh, enabled = !busy) {
                    if (busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp) else Text("Refresh")
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Metric("Assigned", (manifest?.assignments?.size ?: 0).toString(), Modifier.weight(1f))
                Metric("GPS points", (activeTracking?.points ?: 0).toString(), Modifier.weight(1f))
            }
            if (error != null) ErrorText(error)
        }
    }
}

@Composable
fun Metric(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier
            .background(CarsColors.Soft, RoundedCornerShape(8.dp))
            .padding(12.dp)
    ) {
        Text(value, color = CarsColors.Navy, fontSize = 28.sp, fontWeight = FontWeight.Black)
        Text(label, color = CarsColors.Muted, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun TripCard(
    assignment: ManifestAssignment,
    activeTracking: TrackingState?,
    onOpenRoute: () -> Unit,
    onCallRider: () -> Unit,
    onAccept: () -> Unit,
    onDecline: (String) -> Unit,
    onStart: () -> Unit,
    onArrived: () -> Unit,
    onComplete: () -> Unit,
    onReportIssue: (String, String) -> Unit
) {
    var declineReason by remember { mutableStateOf("") }
    var issueSummary by remember { mutableStateOf("") }
    var issueDetails by remember { mutableStateOf("") }
    val trip = assignment.tripLeg
    val rider = trip.rideRequest.rider
    val isFinalized = assignment.mileageRecord != null ||
        assignment.status in listOf("COMPLETED", "DECLINED", "CANCELED") ||
        trip.status in listOf("COMPLETED", "CANCELED", "NO_SHOW")

    Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("${rider.firstName} ${rider.lastName}", fontSize = 23.sp, fontWeight = FontWeight.Black, color = CarsColors.Ink)
                    Text("${formatTime(trip.scheduledPickupAt)} • ${trip.rideRequest.purpose.prettyLabel()}", color = CarsColors.Muted)
                }
                StatusPill(trip.status)
            }

            LocationPanel("Pickup", trip.pickupAddress.fullAddress(trip.pickupCity, trip.pickupState, trip.pickupPostalCode), trip.pickupCounty)
            LocationPanel("Dropoff", trip.dropoffAddress.fullAddress(trip.dropoffCity, trip.dropoffState, trip.dropoffPostalCode), trip.dropoffCounty)

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(onClick = onOpenRoute, colors = ButtonDefaults.buttonColors(containerColor = CarsColors.Navy), modifier = Modifier.weight(1f)) {
                    Icon(Icons.Default.Navigation, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text("Best route")
                }
                if (!rider.phone.isNullOrBlank()) {
                    OutlinedButton(onClick = onCallRider, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Default.Call, contentDescription = null)
                        Spacer(Modifier.width(6.dp))
                        Text("Call")
                    }
                }
            }

            val notes = listOfNotNull(
                rider.mobilityNotes?.let { "Mobility: $it" },
                rider.pickupInstructions?.let { "Pickup: $it" },
                trip.rideRequest.specialInstructions?.let { "Ride: $it" },
                rider.riderNotes?.let { "Approved notes: $it" }
            )
            if (notes.isNotEmpty()) {
                Column(Modifier.background(Color(0xFFFFF7ED), RoundedCornerShape(8.dp)).padding(12.dp)) {
                    Text("Approved rider notes", color = CarsColors.Ink, fontWeight = FontWeight.Black)
                    notes.forEach { Text(it, color = CarsColors.Ink) }
                }
            }

            if (activeTracking?.assignmentId == assignment.id) {
                Text("${activeTracking.points} GPS points captured for this trip.", color = CarsColors.Success, fontWeight = FontWeight.Bold)
            }

            assignment.mileageRecord?.let {
                Text("Mileage submitted: ${it.miles ?: "0.00"} miles from ${it.gpsPointCount} GPS points.", color = CarsColors.Success, fontWeight = FontWeight.Bold)
            }

            TripActions(assignment, onAccept, onStart, onArrived, onComplete)

            if (!isFinalized) {
                OutlinedTextField(declineReason, { declineReason = it }, label = { Text("Decline reason") }, modifier = Modifier.fillMaxWidth())
                OutlinedButton(
                    onClick = {
                        if (declineReason.isNotBlank()) {
                            onDecline(declineReason)
                            declineReason = ""
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Decline and alert dispatch")
                }
            }

            OutlinedTextField(issueSummary, { issueSummary = it }, label = { Text("Issue summary") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(issueDetails, { issueDetails = it }, label = { Text("Issue details") }, modifier = Modifier.fillMaxWidth())
            OutlinedButton(
                onClick = {
                    if (issueSummary.isNotBlank()) {
                        onReportIssue(issueSummary, issueDetails)
                        issueSummary = ""
                        issueDetails = ""
                    }
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.ReportProblem, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("Report issue")
            }
        }
    }
}

@Composable
fun TripActions(
    assignment: ManifestAssignment,
    onAccept: () -> Unit,
    onStart: () -> Unit,
    onArrived: () -> Unit,
    onComplete: () -> Unit
) {
    val tripStatus = assignment.tripLeg.status
    when {
        assignment.status == "OFFERED" -> PrimaryButton("Accept assignment", false, onAccept)
        assignment.status == "ACCEPTED" && tripStatus in listOf("DRIVER_CONFIRMED", "ASSIGNED") -> PrimaryButton("Start GPS mileage", false, onStart)
        assignment.status == "ACCEPTED" && tripStatus in listOf("EN_ROUTE", "IN_PROGRESS") -> PrimaryButton("Mark arrived", false, onArrived)
        assignment.status == "ACCEPTED" && tripStatus == "ARRIVED" -> PrimaryButton("Complete trip", false, onComplete)
    }
}

@Composable
fun LocationPanel(label: String, address: String, county: String?) {
    Column(Modifier.background(CarsColors.Soft, RoundedCornerShape(8.dp)).padding(12.dp)) {
        Text(label.uppercase(), color = CarsColors.Muted, fontSize = 12.sp, fontWeight = FontWeight.Black)
        Text(address.ifBlank { "Address pending" }, color = CarsColors.Ink, fontWeight = FontWeight.Bold)
        if (!county.isNullOrBlank()) Text(county, color = CarsColors.Muted)
    }
}

@Composable
fun StatusPill(status: String) {
    Text(
        status.prettyLabel(),
        color = if (status == "NEEDS_ATTENTION") CarsColors.Red else CarsColors.Navy,
        fontWeight = FontWeight.Black,
        modifier = Modifier
            .background(if (status == "NEEDS_ATTENTION") Color(0xFFFEE2E2) else Color(0xFFEAF1F9), RoundedCornerShape(999.dp))
            .padding(horizontal = 10.dp, vertical = 6.dp)
    )
}

@Composable
fun PrimaryButton(label: String, busy: Boolean, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = !busy,
        colors = ButtonDefaults.buttonColors(containerColor = CarsColors.Red),
        modifier = Modifier
            .fillMaxWidth()
            .height(54.dp)
    ) {
        if (busy) {
            CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
        } else {
            Icon(Icons.Default.CheckCircle, contentDescription = null)
        }
        Spacer(Modifier.width(8.dp))
        Text(label, fontWeight = FontWeight.Black)
    }
}

@Composable
fun EmptyManifestCard() {
    Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(Modifier.fillMaxWidth().padding(26.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.LocationOn, contentDescription = null, tint = CarsColors.Navy, modifier = Modifier.size(42.dp))
            Text("No assigned rides today", fontSize = 21.sp, fontWeight = FontWeight.Black, color = CarsColors.Ink)
            Text("Your manifest will appear here when dispatch assigns a trip.", color = CarsColors.Muted)
        }
    }
}

@Composable
fun ErrorText(message: String) {
    Text(message, color = CarsColors.Red, fontWeight = FontWeight.Bold)
}

@Composable
fun CarsTheme(content: @Composable () -> Unit) {
    MaterialTheme(content = content)
}

object CarsColors {
    val Navy = Color(0xFF003A78)
    val Red = Color(0xFFE30613)
    val Soft = Color(0xFFF3F7FB)
    val Ink = Color(0xFF0B1224)
    val Muted = Color(0xFF526179)
    val PaleBlue = Color(0xFFDCEBFF)
    val Success = Color(0xFF047857)
}

fun ManifestAssignment.routeUrl(): String {
    val trip = tripLeg
    val origin = trip.pickupAddress.fullAddress(trip.pickupCity, trip.pickupState, trip.pickupPostalCode).urlEncode()
    val destination = trip.dropoffAddress.fullAddress(trip.dropoffCity, trip.dropoffState, trip.dropoffPostalCode).urlEncode()
    return "https://www.google.com/maps/dir/?api=1&origin=$origin&destination=$destination&travelmode=driving"
}

fun String?.fullAddress(city: String?, state: String?, postalCode: String?): String {
    return listOfNotNull(this, city, state, postalCode).filter { it.isNotBlank() }.joinToString(", ")
}

fun String.urlEncode(): String = URLEncoder.encode(this, StandardCharsets.UTF_8.toString())

fun String.prettyLabel(): String = split("_").joinToString(" ") { part ->
    part.lowercase().replaceFirstChar { it.uppercase() }
}

fun formatTime(value: String): String {
    return runCatching {
        OffsetDateTime.parse(value).format(DateTimeFormatter.ofPattern("h:mm a"))
    }.getOrDefault(value)
}
