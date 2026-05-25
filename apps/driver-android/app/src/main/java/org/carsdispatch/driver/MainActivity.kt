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
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.ReportProblem
import androidx.compose.material.icons.filled.Settings
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import org.carsdispatch.driver.data.CarsApi
import org.carsdispatch.driver.data.DriverAvailabilityPayload
import org.carsdispatch.driver.data.DriverInfoUpdatePayload
import org.carsdispatch.driver.data.DriverRideSummary
import org.carsdispatch.driver.data.DriverToolsResponse
import org.carsdispatch.driver.data.ManifestAssignment
import org.carsdispatch.driver.data.ManifestResponse
import org.carsdispatch.driver.data.MobileProfile
import org.carsdispatch.driver.data.ProfileUpdatePayload
import org.carsdispatch.driver.data.RideRequestPayload
import org.carsdispatch.driver.data.MobileSession
import org.carsdispatch.driver.data.SessionStore
import org.carsdispatch.driver.location.DriverLocationClient
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.DayOfWeek
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
    var profile by remember { mutableStateOf<MobileProfile?>(null) }
    var manifest by remember { mutableStateOf<ManifestResponse?>(null) }
    var driverTools by remember { mutableStateOf<DriverToolsResponse?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var screen by remember { mutableStateOf(MobileScreen.PublicHome) }
    var driverCabinetSection by remember { mutableStateOf<String?>(null) }
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
        if (session?.driver == null) return
        scope.launch {
            busy = true
            error = null
            runCatching { api.manifest(LocalDate.now().toString()) }
                .onSuccess { manifest = it }
                .onFailure { error = it.message }
            busy = false
        }
    }

    fun refreshDriverTools() {
        if (session?.driver == null) return
        scope.launch {
            busy = true
            error = null
            runCatching { api.driverTools() }
                .onSuccess { driverTools = it }
                .onFailure { error = it.message }
            busy = false
        }
    }

    LaunchedEffect(Unit) {
        val stored = sessionStore.load()
        session = stored
        if (stored != null) {
            screen = MobileScreen.Home
            busy = true
            runCatching { CarsApi { stored.token }.manifest(LocalDate.now().toString()) }
                .onSuccess { manifest = it }
                .onFailure {
                    if (isInvalidSession(it)) {
                        sessionStore.clear()
                        session = null
                        profile = null
                        manifest = null
                        screen = MobileScreen.Login
                        error = "Please sign in again for this CARS Dispatch deployment."
                    } else {
                        error = it.message
                    }
                }
            runCatching { CarsApi { stored.token }.profile() }
                .onSuccess { profile = it }
            if (stored.driver != null) {
                runCatching { CarsApi { stored.token }.driverTools() }
                    .onSuccess { driverTools = it }
            }
            busy = false
        }
    }

    CarsTheme {
        Surface(color = CarsColors.Soft, modifier = Modifier.fillMaxSize()) {
            val currentSession = session
            if (currentSession == null && screen == MobileScreen.PublicHome) {
                PublicHomeScreen(onLogin = { screen = MobileScreen.Login })
            } else if (currentSession == null) {
                LoginScreen(
                    busy = busy,
                    error = error,
                    onLogin = { email, accessCode ->
                        scope.launch {
                            busy = true
                            error = null
                            runCatching { CarsApi { null }.login(email, accessCode, "Android") }
                                .onSuccess { nextSession ->
                                val nextApi = CarsApi { nextSession.token }
                                sessionStore.save(nextSession)
                                session = nextSession
                                screen = MobileScreen.Home

                                runCatching { nextApi.profile() }
                                    .onSuccess { profile = it }

                                if (nextSession.driver != null) {
                                    runCatching { nextApi.manifest(LocalDate.now().toString()) }
                                        .onSuccess { manifest = it }

                                    runCatching { nextApi.driverTools() }
                                        .onSuccess { driverTools = it }
                                }
                            }
                                .onFailure {
                                    error = it.message
                                }
                            busy = false
                        }
                    }
                )
            } else if (screen == MobileScreen.DriverDashboard && currentSession.driver != null) {
                DriverDashboard(
                    session = currentSession,
                    manifest = manifest,
                    busy = busy,
                    error = error,
                    activeTracking = activeTracking,
                    onRefresh = ::refreshManifest,
                    onBackHome = { screen = MobileScreen.Home },
                    onOpenSettings = {
                        driverCabinetSection = DriverCabinetSections.DriverInfo
                        screen = MobileScreen.DriverTools
                    },
                    onRequestRide = { screen = MobileScreen.RideRequest },
                    onProfile = { screen = MobileScreen.Profile },
                    onLogout = {
                        scope.launch {
                            runCatching { api.logout() }
                            trackingJob?.cancel()
                            sessionStore.clear()
                            session = null
                            profile = null
                            manifest = null
                            driverTools = null
                            activeTracking = null
                            screen = MobileScreen.PublicHome
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
            } else {
                MobileHomeScaffold(
                    session = currentSession,
                    profile = profile,
                    screen = screen,
                    busy = busy,
                    error = error,
                    onNavigate = { screen = it },
                    onOpenDriverCabinet = { section ->
                        driverCabinetSection = section
                        screen = MobileScreen.DriverTools
                    },
                    onLogout = {
                        scope.launch {
                            runCatching { api.logout() }
                            trackingJob?.cancel()
                            sessionStore.clear()
                            session = null
                            profile = null
                            manifest = null
                            driverTools = null
                            activeTracking = null
                            screen = MobileScreen.PublicHome
                        }
                    },
                    onSaveProfile = { payload ->
                        scope.launch {
                            busy = true
                            error = null
                            runCatching { profile = api.updateProfile(payload) }
                                .onFailure { error = it.message }
                            busy = false
                        }
                    },
                    onRequestRide = { payload ->
                        scope.launch {
                            busy = true
                            error = null
                            runCatching {
                                api.requestRide(payload)
                                screen = MobileScreen.Home
                            }.onFailure { error = it.message }
                            busy = false
                        }
                    },
                    driverTools = driverTools,
                    driverCabinetSection = driverCabinetSection,
                    onRefreshDriverTools = ::refreshDriverTools,
                    onSaveDriverInfo = { payload ->
                        scope.launch {
                            busy = true
                            error = null
                            runCatching { driverTools = api.updateDriverInfo(payload) }
                                .onFailure { error = it.message }
                            busy = false
                        }
                    },
                    onAddAvailability = { payload ->
                        scope.launch {
                            busy = true
                            error = null
                            runCatching { driverTools = api.addAvailability(payload) }
                                .onFailure { error = it.message }
                            busy = false
                        }
                    }
                )
            }
        }
    }
}

data class TrackingState(val assignmentId: String, val points: Int)

enum class MobileScreen {
    PublicHome,
    Login,
    Home,
    Profile,
    RideRequest,
    DriverTools,
    DriverDashboard
}

object DriverCabinetSections {
    const val DriverInfo = "driver_info"
    const val Availability = "availability"
    const val Mileage = "mileage"
    const val Reimbursements = "reimbursements"
}

fun hasLocationPermission(context: Context): Boolean {
    return ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
}

@Composable
fun PublicHomeScreen(onLogin: () -> Unit) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(CarsColors.Navy)
            .safeDrawingPadding(),
        contentPadding = PaddingValues(24.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        item {
            Image(
                painter = painterResource(R.drawable.cars_logo),
                contentDescription = "CARS",
                modifier = Modifier.size(132.dp)
            )
        }
        item {
            Text("CARS Mobile", color = Color.White, fontSize = 36.sp, fontWeight = FontWeight.Black, textAlign = TextAlign.Center)
            Text("Community Action Ride System", color = CarsColors.PaleBlue, fontSize = 18.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
        }
        item {
            Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Ride help, driver tools, and trip updates", color = CarsColors.Navy, fontSize = 23.sp, fontWeight = FontWeight.Black)
                    Text(
                        "Sign in to update your contact information, request a ride, or open driver trip tools.",
                        color = CarsColors.Muted,
                        lineHeight = 22.sp
                    )
                    PrimaryButton("Sign in", false, onLogin)
                }
            }
        }
        item {
            Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Need a ride now?", color = CarsColors.Red, fontSize = 22.sp, fontWeight = FontWeight.Black)
                    Text("Call CARS: 417-438-2925", color = CarsColors.Navy, fontSize = 20.sp, fontWeight = FontWeight.Black)
                    Text("Serving Barton, Jasper, Newton, and McDonald Counties.", color = CarsColors.Muted)
                }
            }
        }
    }
}

@Composable
fun MobileHomeScaffold(
    session: MobileSession,
    profile: MobileProfile?,
    screen: MobileScreen,
    busy: Boolean,
    error: String?,
    onNavigate: (MobileScreen) -> Unit,
    onOpenDriverCabinet: (String) -> Unit,
    onLogout: () -> Unit,
    onSaveProfile: (ProfileUpdatePayload) -> Unit,
    onRequestRide: (RideRequestPayload) -> Unit,
    driverTools: DriverToolsResponse?,
    driverCabinetSection: String?,
    onRefreshDriverTools: () -> Unit,
    onSaveDriverInfo: (DriverInfoUpdatePayload) -> Unit,
    onAddAvailability: (DriverAvailabilityPayload) -> Unit
) {
    Column(Modifier.fillMaxSize()) {
        MobileHeader(session = session, profile = profile, onLogout = onLogout)
        when (screen) {
            MobileScreen.Profile -> ProfileForm(profile = profile, session = session, busy = busy, error = error, onSave = onSaveProfile, onBack = { onNavigate(MobileScreen.Home) })
            MobileScreen.RideRequest -> RideRequestForm(profile = profile, busy = busy, error = error, onSubmit = onRequestRide, onBack = { onNavigate(MobileScreen.Home) })
            MobileScreen.DriverTools -> DriverToolsScreen(
                tools = driverTools,
                initialSection = driverCabinetSection,
                busy = busy,
                error = error,
                onRefresh = onRefreshDriverTools,
                onSaveDriverInfo = onSaveDriverInfo,
                onAddAvailability = onAddAvailability,
                onBack = { onNavigate(MobileScreen.Home) }
            )
            else -> MobileHomeScreen(
                session = session,
                profile = profile,
                onNavigate = onNavigate,
                onOpenDriverCabinet = onOpenDriverCabinet
            )
        }
    }
}

@Composable
fun MobileHeader(session: MobileSession, profile: MobileProfile?, onLogout: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(CarsColors.Navy)
            .safeDrawingPadding()
            .padding(18.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Image(
            painter = painterResource(R.drawable.cars_logo),
            contentDescription = "CARS",
            modifier = Modifier.size(54.dp)
        )
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text("CARS Mobile", color = CarsColors.PaleBlue, fontWeight = FontWeight.Bold)
            Text(profile?.user?.name ?: session.user.name, color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(session.organization.name, color = CarsColors.PaleBlue, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
        TextButton(onClick = onLogout) {
            Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, tint = Color.White)
            Spacer(Modifier.width(6.dp))
            Text("Sign out", color = Color.White)
        }
    }
}

@Composable
fun MobileHomeScreen(
    session: MobileSession,
    profile: MobileProfile?,
    onNavigate: (MobileScreen) -> Unit,
    onOpenDriverCabinet: (String) -> Unit
) {
    val context = LocalContext.current
    val rider = profile?.rider
    val missingProfileItems = listOfNotNull(
        "phone".takeIf { rider?.phone.isNullOrBlank() },
        "pickup address".takeIf { rider?.addressLine1.isNullOrBlank() },
        "county".takeIf { rider?.county.isNullOrBlank() }
    )

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 72.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        if (session.driver != null) "Ready for today's rides?" else "How can we help today?",
                        color = CarsColors.Navy,
                        fontSize = 25.sp,
                        fontWeight = FontWeight.Black
                    )
                    Text(
                        if (session.driver != null) "Start with your manifest, then use the cabinet for vehicle info, availability, mileage, and reimbursements."
                        else "Request a ride, keep your contact details current, or call CARS when a request needs extra attention.",
                        color = CarsColors.Muted,
                        lineHeight = 21.sp
                    )
                }
            }
        }
        if (session.driver == null && missingProfileItems.isNotEmpty()) {
            item {
                Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = CarsColors.Warm)) {
                    Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Finish your rider profile", color = CarsColors.Navy, fontSize = 21.sp, fontWeight = FontWeight.Black)
                        Text("Missing ${missingProfileItems.joinToString(", ")}. Dispatch can schedule faster when these details are ready.", color = CarsColors.Muted)
                        OutlinedButton(onClick = { onNavigate(MobileScreen.Profile) }, modifier = Modifier.fillMaxWidth()) {
                            Text("Update profile", color = CarsColors.Navy, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
        if (session.driver != null) {
            item {
                HomeActionCard(
                    icon = Icons.Default.DirectionsCar,
                    title = "Today's driver dashboard",
                    description = "Assigned rides, route tools, GPS mileage, and trip status.",
                    onClick = { onNavigate(MobileScreen.DriverDashboard) }
                )
            }
            item {
                DriverHomeFeatureGrid(
                    onManifest = { onNavigate(MobileScreen.DriverDashboard) },
                    onAvailability = { onOpenDriverCabinet(DriverCabinetSections.Availability) },
                    onDriverInfo = { onOpenDriverCabinet(DriverCabinetSections.DriverInfo) },
                    onMileage = { onOpenDriverCabinet(DriverCabinetSections.Mileage) },
                    onReimbursements = { onOpenDriverCabinet(DriverCabinetSections.Reimbursements) },
                    onProfile = { onNavigate(MobileScreen.Profile) },
                    onRideRequest = { onNavigate(MobileScreen.RideRequest) },
                    onCallCars = { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:4174382925"))) }
                )
            }
            item {
                HomeActionCard(
                    icon = Icons.Default.Edit,
                    title = "Driver settings",
                    description = "Availability, mileage, reimbursements, and driver info.",
                    onClick = { onOpenDriverCabinet(DriverCabinetSections.DriverInfo) }
                )
            }
        }
        if (session.driver == null) {
            item {
                HomeActionCard(
                    icon = Icons.Default.Event,
                    title = "Request a ride",
                    description = "Send a transportation request to the CARS dispatch team.",
                    onClick = { onNavigate(MobileScreen.RideRequest) }
                )
            }
            item {
                HomeActionCard(
                    icon = Icons.Default.Person,
                    title = "Update my information",
                    description = profile?.rider?.phone ?: "Add phone, address, pickup notes, and preferences.",
                    onClick = { onNavigate(MobileScreen.Profile) }
                )
            }
        }
        item {
            Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Need immediate help?", color = CarsColors.Red, fontWeight = FontWeight.Black, fontSize = 21.sp)
                    Text("Call CARS at 417-438-2925.", color = CarsColors.Navy, fontWeight = FontWeight.Black)
                    Text("Role: ${session.role.prettyRoleLabel()}", color = CarsColors.Muted)
                    OutlinedButton(
                        onClick = { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:4174382925"))) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Call, contentDescription = null, tint = CarsColors.Navy)
                        Spacer(Modifier.width(8.dp))
                        Text("Call CARS", color = CarsColors.Navy, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun DriverHomeFeatureGrid(
    onManifest: () -> Unit,
    onAvailability: () -> Unit,
    onDriverInfo: () -> Unit,
    onMileage: () -> Unit,
    onReimbursements: () -> Unit,
    onProfile: () -> Unit,
    onRideRequest: () -> Unit,
    onCallCars: () -> Unit
) {
    Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Driver menu", color = CarsColors.Navy, fontSize = 22.sp, fontWeight = FontWeight.Black)
            Text("Everything you need for trips, records, scheduling, and help.", color = CarsColors.Muted, lineHeight = 20.sp)
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                DriverMenuButton("Manifest", "Trips", Icons.Default.Event, Modifier.weight(1f), onManifest)
                DriverMenuButton("Availability", "Schedule", Icons.Default.Edit, Modifier.weight(1f), onAvailability)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                DriverMenuButton("Vehicle", "Insurance", Icons.Default.DirectionsCar, Modifier.weight(1f), onDriverInfo)
                DriverMenuButton("Rides", "Upcoming/past", Icons.Default.Navigation, Modifier.weight(1f), onMileage)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                DriverMenuButton("Mileage", "History", Icons.Default.LocationOn, Modifier.weight(1f), onMileage)
                DriverMenuButton("Pay", "Reimbursements", Icons.Default.CheckCircle, Modifier.weight(1f), onReimbursements)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                DriverMenuButton("Ride", "Request help", Icons.Default.Call, Modifier.weight(1f), onRideRequest)
                DriverMenuButton("Settings", "Driver cabinet", Icons.Default.Settings, Modifier.weight(1f), onDriverInfo)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                DriverMenuButton("Profile", "Contact info", Icons.Default.Person, Modifier.weight(1f), onProfile)
                DriverMenuButton("Support", "Call CARS", Icons.Default.Call, Modifier.weight(1f), onCallCars)
            }
            OutlinedButton(onClick = onCallCars, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                Icon(Icons.Default.Call, contentDescription = null, tint = CarsColors.Red)
                Spacer(Modifier.width(8.dp))
                Text("Call CARS dispatch", color = CarsColors.Red, fontWeight = FontWeight.Black)
            }
        }
    }
}

@Composable
fun DriverMenuButton(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.height(76.dp),
        shape = RoundedCornerShape(8.dp),
        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 8.dp)
    ) {
        Column(horizontalAlignment = Alignment.Start, modifier = Modifier.fillMaxWidth()) {
            Icon(icon, contentDescription = null, tint = CarsColors.Navy, modifier = Modifier.size(22.dp))
            Spacer(Modifier.height(4.dp))
            Text(title, color = CarsColors.Navy, fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(subtitle, color = CarsColors.Muted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
fun HomeActionCard(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, description: String, onClick: () -> Unit) {
    Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Row(Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = CarsColors.Navy, modifier = Modifier.size(34.dp))
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(title, color = CarsColors.Ink, fontSize = 21.sp, fontWeight = FontWeight.Black)
                Text(description, color = CarsColors.Muted, lineHeight = 20.sp)
            }
            Button(onClick = onClick, colors = ButtonDefaults.buttonColors(containerColor = CarsColors.Navy)) {
                Text("Open")
            }
        }
    }
}

@Composable
fun ProfileForm(
    profile: MobileProfile?,
    session: MobileSession,
    busy: Boolean,
    error: String?,
    onSave: (ProfileUpdatePayload) -> Unit,
    onBack: () -> Unit
) {
    val rider = profile?.rider
    var name by remember(profile?.user?.name) { mutableStateOf(profile?.user?.name ?: session.user.name) }
    var phone by remember(rider?.phone) { mutableStateOf(rider?.phone.orEmpty()) }
    var address by remember(rider?.addressLine1) { mutableStateOf(rider?.addressLine1.orEmpty()) }
    var city by remember(rider?.city) { mutableStateOf(rider?.city.orEmpty()) }
    var county by remember(rider?.county) { mutableStateOf(rider?.county.orEmpty()) }
    var state by remember(rider?.state) { mutableStateOf(rider?.state ?: "MO") }
    var postalCode by remember(rider?.postalCode) { mutableStateOf(rider?.postalCode.orEmpty()) }
    var preference by remember(rider?.communicationPreference) { mutableStateOf(rider?.communicationPreference.orEmpty()) }
    var pickupNotes by remember(rider?.pickupInstructions) { mutableStateOf(rider?.pickupInstructions.orEmpty()) }
    val completionItems = listOf(
        "Phone" to phone.isNotBlank(),
        "Address" to address.isNotBlank(),
        "County" to county.isNotBlank(),
        "Pickup notes" to pickupNotes.isNotBlank()
    )
    val completionCount = completionItems.count { it.second }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 72.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { BackTitle("My information", "Keep contact and pickup details current.", onBack) }
        item {
            Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Profile readiness", color = CarsColors.Navy, fontSize = 20.sp, fontWeight = FontWeight.Black)
                    Text("$completionCount of ${completionItems.size} key details ready", color = CarsColors.Muted)
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        completionItems.chunked(2).forEach { rowItems ->
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                rowItems.forEach { (label, ready) ->
                                    ReadinessPill(label, ready, Modifier.weight(1f))
                                }
                                if (rowItems.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                    }
                }
            }
        }
        item {
            Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(name, { name = it }, label = { Text("Name") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(phone, { phone = it }, label = { Text("Phone") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(address, { address = it }, label = { Text("Address") }, modifier = Modifier.fillMaxWidth())
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(city, { city = it }, label = { Text("City") }, modifier = Modifier.weight(1f))
                        OutlinedTextField(county, { county = it }, label = { Text("County") }, modifier = Modifier.weight(1f))
                    }
                    Text("Served counties", color = CarsColors.Muted, fontWeight = FontWeight.Bold)
                    CarsServedCounties.chunked(2).forEach { rowCounties ->
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            rowCounties.forEach { countyOption ->
                                PresetButton(countyOption, Modifier.weight(1f)) { county = countyOption }
                            }
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(state, { state = it }, label = { Text("State") }, modifier = Modifier.weight(1f))
                        OutlinedTextField(postalCode, { postalCode = it }, label = { Text("ZIP") }, modifier = Modifier.weight(1f))
                    }
                    OutlinedTextField(preference, { preference = it }, label = { Text("Communication preference") }, modifier = Modifier.fillMaxWidth())
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        PresetButton("Call", Modifier.weight(1f)) { preference = "phone" }
                        PresetButton("Text", Modifier.weight(1f)) { preference = "text" }
                        PresetButton("Email", Modifier.weight(1f)) { preference = "email" }
                    }
                    OutlinedTextField(pickupNotes, { pickupNotes = it }, label = { Text("Pickup instructions") }, modifier = Modifier.fillMaxWidth())
                    PrimaryButton("Save information", busy) {
                        onSave(ProfileUpdatePayload(name, phone, address, city, county, state, postalCode, preference, pickupNotes))
                    }
                    if (error != null) ErrorText(error)
                }
            }
        }
    }
}

@Composable
fun RideRequestForm(
    profile: MobileProfile?,
    busy: Boolean,
    error: String?,
    onSubmit: (RideRequestPayload) -> Unit,
    onBack: () -> Unit
) {
    val rider = profile?.rider
    var pickupAddress by remember(rider?.addressLine1) { mutableStateOf(rider?.addressLine1.orEmpty()) }
    var pickupCity by remember(rider?.city) { mutableStateOf(rider?.city.orEmpty()) }
    var pickupCounty by remember(rider?.county) { mutableStateOf(rider?.county.orEmpty()) }
    var pickupState by remember(rider?.state) { mutableStateOf(rider?.state ?: "MO") }
    var pickupZip by remember(rider?.postalCode) { mutableStateOf(rider?.postalCode.orEmpty()) }
    var dropoffAddress by remember { mutableStateOf("") }
    var dropoffCity by remember { mutableStateOf("") }
    var dropoffCounty by remember { mutableStateOf("") }
    var dropoffState by remember { mutableStateOf("MO") }
    var dropoffZip by remember { mutableStateOf("") }
    var date by remember { mutableStateOf(LocalDate.now().plusDays(2).toString()) }
    var time by remember { mutableStateOf("09:00") }
    var purpose by remember { mutableStateOf("medical") }
    var instructions by remember { mutableStateOf("") }
    val missingProfileItems = listOfNotNull(
        "phone".takeIf { rider?.phone.isNullOrBlank() },
        "pickup address".takeIf { rider?.addressLine1.isNullOrBlank() },
        "county".takeIf { rider?.county.isNullOrBlank() }
    )

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 72.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { BackTitle("Request a ride", "Dispatch will review and schedule your trip.", onBack) }
        if (missingProfileItems.isNotEmpty()) {
            item {
                Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = CarsColors.Warm)) {
                    Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Profile details missing", color = CarsColors.Red, fontSize = 19.sp, fontWeight = FontWeight.Black)
                        Text("Missing ${missingProfileItems.joinToString(", ")}. You can still request a ride, but dispatch may need to call for details.", color = CarsColors.Muted)
                    }
                }
            }
        }
        item {
            Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    FormSectionTitle("1", "Pickup")
                    OutlinedTextField(pickupAddress, { pickupAddress = it }, label = { Text("Pickup address") }, modifier = Modifier.fillMaxWidth())
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(pickupCity, { pickupCity = it }, label = { Text("City") }, modifier = Modifier.weight(1f))
                        OutlinedTextField(pickupCounty, { pickupCounty = it }, label = { Text("County") }, modifier = Modifier.weight(1f))
                    }
                    CarsServedCounties.chunked(2).forEach { rowCounties ->
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            rowCounties.forEach { countyOption ->
                                PresetButton(countyOption, Modifier.weight(1f)) { pickupCounty = countyOption }
                            }
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(pickupState, { pickupState = it }, label = { Text("State") }, modifier = Modifier.weight(1f))
                        OutlinedTextField(pickupZip, { pickupZip = it }, label = { Text("ZIP") }, modifier = Modifier.weight(1f))
                    }
                    FormSectionTitle("2", "Destination")
                    OutlinedTextField(dropoffAddress, { dropoffAddress = it }, label = { Text("Dropoff address") }, modifier = Modifier.fillMaxWidth())
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(dropoffCity, { dropoffCity = it }, label = { Text("City") }, modifier = Modifier.weight(1f))
                        OutlinedTextField(dropoffCounty, { dropoffCounty = it }, label = { Text("County") }, modifier = Modifier.weight(1f))
                    }
                    CarsServedCounties.chunked(2).forEach { rowCounties ->
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            rowCounties.forEach { countyOption ->
                                PresetButton(countyOption, Modifier.weight(1f)) { dropoffCounty = countyOption }
                            }
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(dropoffState, { dropoffState = it }, label = { Text("State") }, modifier = Modifier.weight(1f))
                        OutlinedTextField(dropoffZip, { dropoffZip = it }, label = { Text("ZIP") }, modifier = Modifier.weight(1f))
                    }
                    FormSectionTitle("3", "Appointment")
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(date, { date = it }, label = { Text("Date YYYY-MM-DD") }, modifier = Modifier.weight(1f))
                        OutlinedTextField(time, { time = it }, label = { Text("Time HH:MM") }, modifier = Modifier.weight(1f))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        PresetButton("Tomorrow", Modifier.weight(1f)) { date = LocalDate.now().plusDays(1).toString() }
                        PresetButton("+2 days", Modifier.weight(1f)) { date = LocalDate.now().plusDays(2).toString() }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        PresetButton("Morning", Modifier.weight(1f)) { time = "09:00" }
                        PresetButton("Midday", Modifier.weight(1f)) { time = "12:00" }
                        PresetButton("Afternoon", Modifier.weight(1f)) { time = "15:00" }
                    }
                    FormSectionTitle("4", "Purpose and notes")
                    OutlinedTextField(purpose, { purpose = it }, label = { Text("Purpose") }, modifier = Modifier.fillMaxWidth())
                    RidePurposePresets { purpose = it }
                    OutlinedTextField(instructions, { instructions = it }, label = { Text("Special instructions") }, modifier = Modifier.fillMaxWidth())
                    Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = CarsColors.Warm)) {
                        Text(
                            "For return trips, multiple stops, same-day rides, or urgent changes, call CARS after submitting.",
                            color = CarsColors.Muted,
                            modifier = Modifier.padding(12.dp),
                            lineHeight = 20.sp
                        )
                    }
                    PrimaryButton("Send ride request", busy) {
                        val appointment = runCatching { LocalDateTime.parse("${date}T$time").toString() + ":00.000Z" }
                            .getOrDefault("${date}T${time}:00.000Z")
                        onSubmit(
                            RideRequestPayload(
                                pickupAddress,
                                pickupCity,
                                pickupCounty,
                                pickupState,
                                pickupZip,
                                dropoffAddress,
                                dropoffCity,
                                dropoffCounty,
                                dropoffState,
                                dropoffZip,
                                appointment,
                                purpose,
                                instructions
                            )
                        )
                    }
                    if (error != null) ErrorText(error)
                }
            }
        }
    }
}

@Composable
fun BackTitle(title: String, subtitle: String, onBack: () -> Unit) {
    Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(title, color = CarsColors.Navy, fontSize = 24.sp, fontWeight = FontWeight.Black)
                Text(subtitle, color = CarsColors.Muted)
            }
            OutlinedButton(onClick = onBack) {
                Text("Back")
            }
        }
    }
}

@Composable
fun StaffMobileHome(session: MobileSession, onLogout: () -> Unit) {
    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier
                .fillMaxWidth()
                .background(CarsColors.Navy)
                .safeDrawingPadding()
                .padding(18.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Image(
                painter = painterResource(R.drawable.cars_logo),
                contentDescription = "CARS Driver",
                modifier = Modifier.size(56.dp)
            )
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("CARS Mobile", color = CarsColors.PaleBlue, fontWeight = FontWeight.Bold)
                Text(session.user.name, color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(session.organization.name, color = CarsColors.PaleBlue, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            TextButton(onClick = onLogout) {
                Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, tint = Color.White)
                Spacer(Modifier.width(6.dp))
                Text("Sign out", color = Color.White)
            }
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Signed in", color = CarsColors.Navy, fontSize = 24.sp, fontWeight = FontWeight.Black)
                    Text(
                        "This mobile app is currently optimized for driver trip manifests, GPS mileage, and ride updates.",
                        color = CarsColors.Muted,
                        lineHeight = 21.sp
                    )
                    Text("Role: ${session.role.prettyRoleLabel()}", color = CarsColors.Ink, fontWeight = FontWeight.Bold)
                }
            }
            Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Use the web workspace", color = CarsColors.Navy, fontSize = 20.sp, fontWeight = FontWeight.Black)
                    Text(
                        "Staff, admin, finance, dispatch, and reporting tools are available in CARS Dispatch on the web.",
                        color = CarsColors.Muted,
                        lineHeight = 21.sp
                    )
                }
            }
        }
    }
}

@Composable
fun LoginScreen(busy: Boolean, error: String?, onLogin: (String, String) -> Unit) {
    val context = LocalContext.current
    var email by remember { mutableStateOf("driver@esc.example") }
    var accessCode by remember { mutableStateOf("") }
    val webLoginUrl = "${BuildConfig.CARS_API_BASE_URL}/login?source=android"
    val googleLoginUrl = "${BuildConfig.CARS_API_BASE_URL}/api/auth/google/start?source=android"

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CarsColors.Navy)
            .safeDrawingPadding()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Image(
            painter = painterResource(R.drawable.cars_logo),
            contentDescription = "CARS Driver",
            modifier = Modifier.size(128.dp)
        )
        Spacer(Modifier.height(14.dp))
        Text("CARS Driver", color = Color.White, fontSize = 36.sp, fontWeight = FontWeight.Black, textAlign = TextAlign.Center)
        Text("Volunteer Operations", color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
        Text(
            "Routes, trip status, and GPS mileage for active CARS drivers.",
            color = CarsColors.PaleBlue,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(22.dp))
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(8.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(email, { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(
                    accessCode,
                    { accessCode = it },
                    label = { Text("Access code (optional)") },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth()
                )
                PrimaryButton("Sign in", busy) { onLogin(email, accessCode) }
                if (error != null) ErrorText(error)
                OutlinedButton(
                    onClick = {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(googleLoginUrl)))
                    },
                    enabled = !busy,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                ) {
                    Text("Continue with Google", fontWeight = FontWeight.Black, color = CarsColors.Navy)
                }
                OutlinedButton(
                    onClick = {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(webLoginUrl)))
                    },
                    enabled = !busy,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                ) {
                    Text("Create or validate account", fontWeight = FontWeight.Black, color = CarsColors.Navy)
                }
                TextButton(
                    onClick = {
                        context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:4174382925")))
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Need help? Call CARS", fontWeight = FontWeight.Bold, color = CarsColors.Red)
                }
                Text(
                    "Google sign-in opens the secure CARS web workspace for account creation or validation. Return here after your account is linked.",
                    color = CarsColors.Muted,
                    fontSize = 12.sp,
                    lineHeight = 17.sp
                )
            }
        }
    }
}

@Composable
fun DriverToolsScreen(
    tools: DriverToolsResponse?,
    initialSection: String?,
    busy: Boolean,
    error: String?,
    onRefresh: () -> Unit,
    onSaveDriverInfo: (DriverInfoUpdatePayload) -> Unit,
    onAddAvailability: (DriverAvailabilityPayload) -> Unit,
    onBack: () -> Unit
) {
    val driver = tools?.driver
    var vehicleYear by remember(driver?.vehicleYear) { mutableStateOf(driver?.vehicleYear?.toString().orEmpty()) }
    var vehicleMake by remember(driver?.vehicleMake) { mutableStateOf(driver?.vehicleMake.orEmpty()) }
    var vehicleModel by remember(driver?.vehicleModel) { mutableStateOf(driver?.vehicleModel.orEmpty()) }
    var insuranceDate by remember(driver?.insuranceVerificationDate) { mutableStateOf(driver?.insuranceVerificationDate?.take(10).orEmpty()) }
    var reimbursementPreference by remember(driver?.reimbursementPreference) { mutableStateOf(driver?.reimbursementPreference.orEmpty()) }
    var availabilityStart by remember { mutableStateOf("${LocalDate.now().plusDays(1)}T09:00") }
    var availabilityEnd by remember { mutableStateOf("${LocalDate.now().plusDays(1)}T17:00") }
    var availabilityStatus by remember { mutableStateOf("AVAILABLE") }
    var availabilityType by remember { mutableStateOf("one_time") }
    var recurrenceRule by remember { mutableStateOf("") }
    var maxDistance by remember { mutableStateOf("") }
    var counties by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var driverInfoOpen by remember { mutableStateOf(true) }
    var availabilityOpen by remember { mutableStateOf(false) }
    var mileageOpen by remember { mutableStateOf(false) }
    var reimbursementsOpen by remember { mutableStateOf(false) }

    LaunchedEffect(initialSection) {
        when (initialSection) {
            DriverCabinetSections.DriverInfo -> {
                driverInfoOpen = true
                availabilityOpen = false
                mileageOpen = false
                reimbursementsOpen = false
            }
            DriverCabinetSections.Availability -> {
                driverInfoOpen = false
                availabilityOpen = true
                mileageOpen = false
                reimbursementsOpen = false
            }
            DriverCabinetSections.Mileage -> {
                driverInfoOpen = false
                availabilityOpen = false
                mileageOpen = true
                reimbursementsOpen = false
            }
            DriverCabinetSections.Reimbursements -> {
                driverInfoOpen = false
                availabilityOpen = false
                mileageOpen = false
                reimbursementsOpen = true
            }
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 72.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { BackTitle("Driver cabinet", "Availability, mileage, reimbursements, and driver info.", onBack) }
        item {
            CabinetHeader(
                title = "Driver info",
                subtitle = driver?.vehicleLabel ?: "Vehicle, insurance, and reimbursement preference",
                countLabel = driver?.status?.prettyLabel() ?: "Not loaded",
                expanded = driverInfoOpen,
                onToggle = { driverInfoOpen = !driverInfoOpen }
            )
        }
        if (driverInfoOpen) {
        item {
            Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Vehicle and insurance", color = CarsColors.Navy, fontSize = 21.sp, fontWeight = FontWeight.Black)
                            Text(driver?.vehicleLabel ?: "Add vehicle details", color = CarsColors.Muted)
                        }
                        OutlinedButton(onClick = onRefresh, enabled = !busy) { Text("Refresh") }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(vehicleYear, { vehicleYear = it }, label = { Text("Year") }, modifier = Modifier.weight(1f))
                        OutlinedTextField(vehicleMake, { vehicleMake = it }, label = { Text("Make") }, modifier = Modifier.weight(1f))
                    }
                    OutlinedTextField(vehicleModel, { vehicleModel = it }, label = { Text("Model") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(insuranceDate, { insuranceDate = it }, label = { Text("Insurance date YYYY-MM-DD") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(reimbursementPreference, { reimbursementPreference = it }, label = { Text("Reimbursement preference") }, modifier = Modifier.fillMaxWidth())
                    PrimaryButton("Save driver info", busy) {
                        onSaveDriverInfo(
                            DriverInfoUpdatePayload(
                                vehicleYear = vehicleYear.toIntOrNull(),
                                vehicleMake = vehicleMake.ifBlank { null },
                                vehicleModel = vehicleModel.ifBlank { null },
                                insuranceVerificationDate = insuranceDate.ifBlank { null },
                                reimbursementPreference = reimbursementPreference.ifBlank { null }
                            )
                        )
                    }
                    if (error != null) ErrorText(error)
                }
            }
        }
        }
        item {
            CabinetHeader(
                title = "Availability",
                subtitle = "Add availability, recurring time, or blackout dates",
                countLabel = "${driver?.availabilities?.size ?: 0} active",
                expanded = availabilityOpen,
                onToggle = { availabilityOpen = !availabilityOpen }
            )
        }
        if (availabilityOpen) {
        item {
            Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Schedule availability", color = CarsColors.Navy, fontSize = 21.sp, fontWeight = FontWeight.Black)
                    Text("Use a quick preset, then adjust date, time, counties, or notes.", color = CarsColors.Muted, lineHeight = 20.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PresetButton("Tomorrow", Modifier.weight(1f)) {
                            val day = LocalDate.now().plusDays(1)
                            availabilityType = "one_time"
                            availabilityStatus = "AVAILABLE"
                            availabilityStart = "${day}T09:00"
                            availabilityEnd = "${day}T17:00"
                            recurrenceRule = ""
                            notes = "Available for regular rides."
                        }
                        PresetButton("Saturday", Modifier.weight(1f)) {
                            val day = nextSaturday()
                            availabilityType = "one_time"
                            availabilityStatus = "AVAILABLE"
                            availabilityStart = "${day}T09:00"
                            availabilityEnd = "${day}T15:00"
                            recurrenceRule = ""
                            notes = "Saturday availability."
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PresetButton("Weekly", Modifier.weight(1f)) {
                            val day = LocalDate.now().plusDays(1)
                            availabilityType = "recurring"
                            availabilityStatus = "AVAILABLE"
                            availabilityStart = "${day}T09:00"
                            availabilityEnd = "${day}T17:00"
                            recurrenceRule = "FREQ=WEEKLY"
                            notes = "Recurring weekly availability."
                        }
                        PresetButton("Blackout", Modifier.weight(1f)) {
                            val day = LocalDate.now().plusDays(1)
                            availabilityType = "blackout"
                            availabilityStatus = "UNAVAILABLE"
                            availabilityStart = "${day}T00:00"
                            availabilityEnd = "${day}T23:59"
                            recurrenceRule = ""
                            notes = "Unavailable."
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(availabilityType, { availabilityType = it }, label = { Text("Type") }, modifier = Modifier.weight(1f))
                        OutlinedTextField(availabilityStatus, { availabilityStatus = it }, label = { Text("Status") }, modifier = Modifier.weight(1f))
                    }
                    OutlinedTextField(availabilityStart, { availabilityStart = it }, label = { Text("Starts YYYY-MM-DDTHH:MM") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(availabilityEnd, { availabilityEnd = it }, label = { Text("Ends YYYY-MM-DDTHH:MM") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(recurrenceRule, { recurrenceRule = it }, label = { Text("Recurring rule (optional)") }, modifier = Modifier.fillMaxWidth())
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(counties, { counties = it }, label = { Text("Counties") }, modifier = Modifier.weight(1f))
                        OutlinedTextField(maxDistance, { maxDistance = it }, label = { Text("Max mi") }, modifier = Modifier.weight(1f))
                    }
                    OutlinedTextField(notes, { notes = it }, label = { Text("Notes") }, modifier = Modifier.fillMaxWidth())
                    PrimaryButton("Add availability", busy) {
                        onAddAvailability(
                            DriverAvailabilityPayload(
                                availabilityType = availabilityType.ifBlank { "one_time" },
                                status = availabilityStatus.ifBlank { "AVAILABLE" },
                                startsAt = availabilityStart,
                                endsAt = availabilityEnd,
                                recurrenceRule = recurrenceRule.ifBlank { null },
                                preferredCounties = counties.split(",").map { it.trim() }.filter { it.isNotBlank() },
                                maxDistanceMiles = maxDistance.toIntOrNull(),
                                notes = notes.ifBlank { null }
                            )
                        )
                    }
                }
            }
        }
        item { SectionHeader("Availability", driver?.availabilities?.size ?: 0) }
        if (driver?.availabilities.isNullOrEmpty()) {
            item { SectionEmpty("No availability has been added yet.") }
        } else {
            items(driver!!.availabilities, key = { it.id }) { item ->
                Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("${item.status.prettyLabel()} · ${item.availabilityType.prettyLabel()}", color = CarsColors.Ink, fontWeight = FontWeight.Black)
                        Text("${item.startsAt.prettyDateTime()} to ${item.endsAt.prettyDateTime()}", color = CarsColors.Muted)
                        Text(item.preferredCounties.joinToString(", ").ifBlank { "All counties" }, color = CarsColors.Muted)
                    }
                }
            }
        }
        }
        item {
            CabinetHeader(
                title = "Mileage",
                subtitle = "Upcoming, past rides, and captured mileage",
                countLabel = "${(tools?.upcomingRides?.size ?: 0) + (tools?.pastRides?.size ?: 0)} rides",
                expanded = mileageOpen,
                onToggle = { mileageOpen = !mileageOpen }
            )
        }
        if (mileageOpen) {
        item { SectionHeader("Upcoming accepted rides", tools?.upcomingRides?.size ?: 0) }
        if (tools?.upcomingRides.isNullOrEmpty()) {
            item { SectionEmpty("Accepted future rides will appear here.") }
        } else {
            items(tools!!.upcomingRides, key = { it.id }) { RideSummaryCard(it) }
        }
        item { SectionHeader("Past rides", tools?.pastRides?.size ?: 0) }
        if (tools?.pastRides.isNullOrEmpty()) {
            item { SectionEmpty("Completed rides will appear here.") }
        } else {
            items(tools!!.pastRides, key = { it.id }) { RideSummaryCard(it) }
        }
        }
        item {
            CabinetHeader(
                title = "Reimbursements",
                subtitle = "Pending mileage, paid totals, and payment batches",
                countLabel = (tools?.reimbursement?.pendingCents ?: 0).formatCents(),
                expanded = reimbursementsOpen,
                onToggle = { reimbursementsOpen = !reimbursementsOpen }
            )
        }
        if (reimbursementsOpen) {
        item {
            Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Reimbursement", color = CarsColors.Navy, fontSize = 21.sp, fontWeight = FontWeight.Black)
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Metric("Pending", (tools?.reimbursement?.pendingCents ?: 0).formatCents(), Modifier.weight(1f))
                        Metric("Paid", (tools?.reimbursement?.paidCents ?: 0).formatCents(), Modifier.weight(1f))
                    }
                    tools?.reimbursement?.mileageRecords?.take(5)?.forEach {
                        Text("${it.serviceDate.prettyDate()} · ${it.riderName} · ${it.miles} mi · ${it.amountCents.formatCents()} · ${it.status.prettyLabel()}", color = CarsColors.Ink)
                    }
                    if (tools?.reimbursement?.mileageRecords.isNullOrEmpty()) {
                        Text("Submitted mileage will appear here after completed rides.", color = CarsColors.Muted)
                    }
                }
            }
        }
        }
    }
}

@Composable
fun CabinetHeader(
    title: String,
    subtitle: String,
    countLabel: String,
    expanded: Boolean,
    onToggle: () -> Unit
) {
    Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f)) {
                Text(title, color = CarsColors.Navy, fontSize = 22.sp, fontWeight = FontWeight.Black)
                Text(subtitle, color = CarsColors.Muted, lineHeight = 20.sp)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(countLabel, color = CarsColors.Navy, fontWeight = FontWeight.Black)
                TextButton(onClick = onToggle) {
                    Text(if (expanded) "Close" else "Open", color = CarsColors.Red, fontWeight = FontWeight.Black)
                }
            }
        }
    }
}

@Composable
fun ReadinessPill(label: String, ready: Boolean, modifier: Modifier = Modifier) {
    Row(
        modifier
            .background(if (ready) Color(0xFFE7F8EF) else Color(0xFFFFF3D8), RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            Icons.Default.CheckCircle,
            contentDescription = null,
            tint = if (ready) CarsColors.Success else CarsColors.Muted,
            modifier = Modifier.size(18.dp)
        )
        Spacer(Modifier.width(8.dp))
        Text(
            "$label ${if (ready) "ready" else "missing"}",
            color = CarsColors.Ink,
            fontWeight = FontWeight.Bold,
            fontSize = 13.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
fun FormSectionTitle(number: String, title: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(
            number,
            color = Color.White,
            fontWeight = FontWeight.Black,
            modifier = Modifier
                .background(CarsColors.Navy, RoundedCornerShape(999.dp))
                .padding(horizontal = 10.dp, vertical = 5.dp)
        )
        Spacer(Modifier.width(10.dp))
        Text(title, color = CarsColors.Navy, fontWeight = FontWeight.Black, fontSize = 20.sp)
    }
}

@Composable
fun RidePurposePresets(onSelect: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PresetButton("Medical", Modifier.weight(1f)) { onSelect("medical") }
            PresetButton("Grocery", Modifier.weight(1f)) { onSelect("grocery") }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PresetButton("Employment", Modifier.weight(1f)) { onSelect("employment") }
            PresetButton("Social", Modifier.weight(1f)) { onSelect("social_services") }
        }
    }
}

val CarsServedCounties = listOf("Barton", "Jasper", "Newton", "McDonald")

@Composable
fun PresetButton(label: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    OutlinedButton(onClick = onClick, modifier = modifier.height(48.dp)) {
        Text(label, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun RideSummaryCard(ride: DriverRideSummary) {
    Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(ride.riderName, color = CarsColors.Ink, fontWeight = FontWeight.Black, fontSize = 20.sp)
                    Text("${ride.scheduledPickupAt.prettyDateTime()} · ${ride.purpose.prettyLabel()}", color = CarsColors.Muted)
                }
                StatusPill(ride.tripStatus)
            }
            Text("${ride.pickupCounty ?: "Pickup"} to ${ride.dropoffCounty ?: "Dropoff"}", color = CarsColors.Muted)
            ride.mileage?.let {
                Text("${it.miles} miles · ${it.amountCents.formatCents()} · ${it.status.prettyLabel()}", color = CarsColors.Success, fontWeight = FontWeight.Bold)
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
    onBackHome: () -> Unit,
    onOpenSettings: () -> Unit,
    onRequestRide: () -> Unit,
    onProfile: () -> Unit,
    onLogout: () -> Unit,
    onAction: (String, suspend (CarsApi) -> Unit) -> Unit,
    onStartTracking: (ManifestAssignment) -> Unit,
    onCompleteTracking: (ManifestAssignment) -> Unit
) {
    val context = LocalContext.current
    var selectedAssignmentId by remember { mutableStateOf<String?>(null) }
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) {}
    val selectedAssignment = manifest?.assignments?.firstOrNull { it.id == selectedAssignmentId }

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
            Image(
                painter = painterResource(R.drawable.cars_logo),
                contentDescription = "CARS Driver",
                modifier = Modifier.size(52.dp)
            )
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("CARS Driver", color = CarsColors.PaleBlue, fontWeight = FontWeight.Bold)
                Text(session.driver?.name.orEmpty(), color = Color.White, fontSize = 26.sp, fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(session.organization.name, color = CarsColors.PaleBlue, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            TextButton(onClick = onBackHome) {
                Icon(Icons.Default.Home, contentDescription = null, tint = Color.White)
                Spacer(Modifier.width(6.dp))
                Text("Home", color = Color.White)
            }
            TextButton(onClick = onLogout) {
                Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, tint = Color.White)
                Spacer(Modifier.width(6.dp))
                Text("Sign out", color = Color.White)
            }
        }

        if (selectedAssignment != null) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 72.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                item {
                    OutlinedButton(onClick = { selectedAssignmentId = null }, modifier = Modifier.fillMaxWidth()) {
                        Text("Back to manifest")
                    }
                }
                item {
                    TripCard(
                        assignment = selectedAssignment,
                        activeTracking = activeTracking,
                        onOpenRoute = {
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(selectedAssignment.routeUrl())))
                        },
                        onCallRider = {
                            selectedAssignment.tripLeg.rideRequest.rider.phone?.let {
                                context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$it")))
                            }
                        },
                        onAccept = { onAction("accept") { it.acceptAssignment(selectedAssignment.id) } },
                        onDecline = { reason -> onAction("decline") { it.declineAssignment(selectedAssignment.id, reason) } },
                        onStart = { onStartTracking(selectedAssignment) },
                        onArrived = {
                            onAction("arrived") {
                                it.arrived(selectedAssignment.id, DriverLocationClient(context.applicationContext).currentLocation())
                            }
                        },
                        onComplete = { onCompleteTracking(selectedAssignment) },
                        onReportIssue = { summary, details ->
                            onAction("issue") { it.reportIssue(selectedAssignment.id, summary, details) }
                        }
                    )
                }
            }
        } else {
            ManifestList(
                manifest = manifest,
                activeTracking = activeTracking,
                busy = busy,
                error = error,
                onRefresh = onRefresh,
                onOpenDashboard = { },
                onOpenSettings = onOpenSettings,
                onRequestRide = onRequestRide,
                onProfile = onProfile,
                onCallCars = { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:4174382925"))) },
                onSelectAssignment = { selectedAssignmentId = it.id }
            )
        }
    }
}

@Composable
fun ManifestList(
    manifest: ManifestResponse?,
    activeTracking: TrackingState?,
    busy: Boolean,
    error: String?,
    onRefresh: () -> Unit,
    onOpenDashboard: () -> Unit,
    onOpenSettings: () -> Unit,
    onRequestRide: () -> Unit,
    onProfile: () -> Unit,
    onCallCars: () -> Unit,
    onSelectAssignment: (ManifestAssignment) -> Unit
) {
    val assignments = manifest?.assignments.orEmpty()
    val activeAssignments = assignments.filterNot { it.isFinalized() }
    val completedAssignments = assignments.filter { it.isFinalized() }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 72.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item { DashboardGreetingCard() }
        item { SummaryCard(manifest, activeTracking, busy, error, onRefresh) }
        if (assignments.isEmpty()) {
            item { EmptyManifestCard() }
        } else {
            item { SectionHeader("Active trips", activeAssignments.size) }
            if (activeAssignments.isEmpty()) {
                item { SectionEmpty("No active trips left on today's manifest.") }
            } else {
                items(activeAssignments, key = { it.id }) { assignment ->
                    TripListItem(assignment = assignment, onOpen = { onSelectAssignment(assignment) })
                }
            }

            item { SectionHeader("Completed trips", completedAssignments.size) }
            if (completedAssignments.isEmpty()) {
                item { SectionEmpty("Completed rides will appear here as the day moves along.") }
            } else {
                items(completedAssignments, key = { it.id }) { assignment ->
                    TripListItem(assignment = assignment, onOpen = { onSelectAssignment(assignment) })
                }
            }
        }
        item {
            DriverDashboardQuickActions(
                onOpenDashboard = onOpenDashboard,
                onRequestRide = onRequestRide,
                onProfile = onProfile,
                onOpenSettings = onOpenSettings
            )
        }
        item { DriverHelpCard(onCallCars = onCallCars) }
    }
}

@Composable
fun DashboardGreetingCard() {
    Card(shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(18.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Hi",
                fontSize = 34.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .background(CarsColors.PaleBlue, RoundedCornerShape(999.dp))
                    .padding(horizontal = 18.dp, vertical = 16.dp)
            )
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text("Ready for today's rides?", color = CarsColors.Navy, fontSize = 24.sp, fontWeight = FontWeight.Black)
                Text(
                    "Start with your manifest, then use settings for vehicle info, availability, mileage, and reimbursements.",
                    color = CarsColors.Muted,
                    lineHeight = 20.sp
                )
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
    Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Driver dashboard", fontSize = 22.sp, fontWeight = FontWeight.Black, color = CarsColors.Navy)
                }
                TextButton(onClick = onRefresh, enabled = !busy) {
                    if (busy) {
                        CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.Default.Refresh, contentDescription = null, tint = CarsColors.Navy)
                        Spacer(Modifier.width(6.dp))
                        Text("Refresh", color = CarsColors.Navy, fontWeight = FontWeight.Bold)
                    }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MiniMetric(Icons.Default.DirectionsCar, "Active", (manifest?.assignments.orEmpty().count { !it.isFinalized() }).toString(), Modifier.weight(1f))
                MiniMetric(Icons.Default.CheckCircle, "Done", (manifest?.assignments.orEmpty().count { it.isFinalized() }).toString(), Modifier.weight(1f))
                MiniMetric(Icons.Default.Event, "Total", (manifest?.assignments?.size ?: 0).toString(), Modifier.weight(1f))
                MiniMetric(Icons.Default.LocationOn, "GPS", (activeTracking?.points ?: 0).toString(), Modifier.weight(1f))
            }
            if (error != null) ErrorText(error)
        }
    }
}

@Composable
fun MiniMetric(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier
            .background(CarsColors.Soft, RoundedCornerShape(10.dp))
            .padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(icon, contentDescription = null, tint = CarsColors.Navy, modifier = Modifier.size(22.dp))
        Text(value, color = CarsColors.Navy, fontSize = 24.sp, fontWeight = FontWeight.Black)
        Text(label, color = CarsColors.Muted, fontWeight = FontWeight.Bold, fontSize = 12.sp, maxLines = 1)
    }
}

@Composable
fun DriverDashboardQuickActions(
    onOpenDashboard: () -> Unit,
    onRequestRide: () -> Unit,
    onProfile: () -> Unit,
    onOpenSettings: () -> Unit
) {
    Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Quick actions", color = CarsColors.Navy, fontSize = 21.sp, fontWeight = FontWeight.Black)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                DashboardActionButton("Today", "dashboard", Icons.Default.DirectionsCar, Modifier.weight(1f), onOpenDashboard)
                DashboardActionButton("Request", "a ride", Icons.Default.Event, Modifier.weight(1f), onRequestRide)
                DashboardActionButton("Update", "my info", Icons.Default.Person, Modifier.weight(1f), onProfile)
                DashboardActionButton("Settings", "driver", Icons.Default.Settings, Modifier.weight(1f), onOpenSettings)
            }
        }
    }
}

@Composable
fun DashboardActionButton(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.height(86.dp),
        shape = RoundedCornerShape(10.dp),
        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 8.dp)
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
            Icon(icon, contentDescription = null, tint = CarsColors.Navy, modifier = Modifier.size(28.dp))
            Spacer(Modifier.height(4.dp))
            Text(title, color = CarsColors.Navy, fontWeight = FontWeight.Black, fontSize = 13.sp, maxLines = 1)
            Text(subtitle, color = CarsColors.Muted, fontSize = 12.sp, maxLines = 1)
        }
    }
}

@Composable
fun DriverHelpCard(onCallCars: () -> Unit) {
    Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF0F0))) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Default.Call,
                contentDescription = null,
                tint = CarsColors.Red,
                modifier = Modifier
                    .background(Color(0xFFFFD8D8), RoundedCornerShape(999.dp))
                    .padding(14.dp)
                    .size(28.dp)
            )
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text("Need immediate help?", color = CarsColors.Red, fontWeight = FontWeight.Black, fontSize = 18.sp)
                Text("Call CARS at 417-438-2925.", color = CarsColors.Navy, fontWeight = FontWeight.Bold)
                Text("Role: Driver", color = CarsColors.Muted)
            }
            Button(onClick = onCallCars, colors = ButtonDefaults.buttonColors(containerColor = CarsColors.Red)) {
                Icon(Icons.Default.Call, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("Call", fontWeight = FontWeight.Black)
            }
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
fun TripListItem(assignment: ManifestAssignment, onOpen: () -> Unit) {
    val trip = assignment.tripLeg
    val rider = trip.rideRequest.rider
    val nextStep = assignment.driverNextStep()

    Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("${rider.firstName} ${rider.lastName}", fontSize = 22.sp, fontWeight = FontWeight.Black, color = CarsColors.Ink)
                    Text("${formatTime(trip.scheduledPickupAt)} • ${trip.rideRequest.purpose.prettyLabel()}", color = CarsColors.Muted)
                }
                StatusPill(trip.status)
            }
            Text(
                trip.pickupAddress.fullAddress(trip.pickupCity, trip.pickupState, trip.pickupPostalCode),
                color = CarsColors.Ink,
                fontWeight = FontWeight.Bold
            )
            Text(
                trip.dropoffAddress.fullAddress(trip.dropoffCity, trip.dropoffState, trip.dropoffPostalCode),
                color = CarsColors.Muted
            )
            Text(nextStep, color = CarsColors.Navy, fontWeight = FontWeight.Bold)
            Button(onClick = onOpen, colors = ButtonDefaults.buttonColors(containerColor = CarsColors.Navy), modifier = Modifier.fillMaxWidth()) {
                Text("Open tools", fontWeight = FontWeight.Black)
            }
        }
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

            QuickIssueButtons(onReportIssue)

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
fun QuickIssueButtons(onReportIssue: (String, String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Quick alerts", color = CarsColors.Ink, fontWeight = FontWeight.Black)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(
                onClick = { onReportIssue("Running late", "Driver reported they are running late from the mobile app.") },
                modifier = Modifier.weight(1f)
            ) {
                Text("Late")
            }
            OutlinedButton(
                onClick = { onReportIssue("Rider no-show", "Driver reported the rider was not present.") },
                modifier = Modifier.weight(1f)
            ) {
                Text("No-show")
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(
                onClick = { onReportIssue("Rider canceled at pickup", "Driver reported rider canceled at pickup.") },
                modifier = Modifier.weight(1f)
            ) {
                Text("Canceled")
            }
            OutlinedButton(
                onClick = { onReportIssue("Safety concern", "Driver reported a safety concern.") },
                modifier = Modifier.weight(1f)
            ) {
                Text("Safety")
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
fun SectionHeader(title: String, count: Int) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(title, color = CarsColors.Navy, fontSize = 20.sp, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
        Text(count.toString(), color = CarsColors.Muted, fontWeight = FontWeight.Black)
    }
}

@Composable
fun SectionEmpty(message: String) {
    Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Text(message, color = CarsColors.Muted, modifier = Modifier.fillMaxWidth().padding(16.dp))
    }
}

@Composable
fun LocationPanel(label: String, address: String, county: String?) {
    Column(Modifier.background(CarsColors.Soft, RoundedCornerShape(8.dp)).padding(12.dp)) {
        Text(label.uppercase(), color = CarsColors.Muted, fontSize = 12.sp, fontWeight = FontWeight.Black)
        Text(address.ifBlank { "Address pending" }, color = CarsColors.Ink, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
        if (!county.isNullOrBlank()) Text(county, color = CarsColors.Muted, maxLines = 1, overflow = TextOverflow.Ellipsis)
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
    val Warm = Color(0xFFFFF7ED)
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

fun ManifestAssignment.isFinalized(): Boolean {
    return mileageRecord != null ||
        status in listOf("COMPLETED", "DECLINED", "CANCELED") ||
        tripLeg.status in listOf("COMPLETED", "CANCELED", "NO_SHOW")
}

fun ManifestAssignment.driverNextStep(): String {
    return when {
        isFinalized() -> "Finished: mileage and trip history are available."
        status == "OFFERED" -> "Next: accept or decline this assignment."
        status == "ACCEPTED" && tripLeg.status in listOf("DRIVER_CONFIRMED", "ASSIGNED") ->
            "Next: open the route, then start GPS mileage."
        status == "ACCEPTED" && tripLeg.status in listOf("EN_ROUTE", "IN_PROGRESS") ->
            "Next: mark arrived when you reach pickup."
        status == "ACCEPTED" && tripLeg.status == "ARRIVED" ->
            "Next: complete the trip after dropoff."
        else -> "Next: open tools for route, notes, and trip actions."
    }
}

fun String?.fullAddress(city: String?, state: String?, postalCode: String?): String {
    return listOfNotNull(this, city, state, postalCode).filter { it.isNotBlank() }.joinToString(", ")
}

fun String.urlEncode(): String = URLEncoder.encode(this, StandardCharsets.UTF_8.toString())

fun String.prettyLabel(): String = split("_").joinToString(" ") { part ->
    part.lowercase().replaceFirstChar { it.uppercase() }
}

fun String?.prettyRoleLabel(): String {
    return when (this) {
        "system_admin" -> "System Admin"
        "organization_admin" -> "Organization Admin"
        "program_manager" -> "Program Manager"
        "dispatcher" -> "Dispatcher"
        "finance_user" -> "Finance"
        "driver" -> "Driver"
        "reporting_viewer" -> "Reporting"
        "agency_partner" -> "Agency Partner"
        else -> "Workspace User"
    }
}

fun formatTime(value: String): String {
    return runCatching {
        OffsetDateTime.parse(value).format(DateTimeFormatter.ofPattern("h:mm a"))
    }.getOrDefault(value)
}

fun nextSaturday(): LocalDate {
    var day = LocalDate.now().plusDays(1)
    while (day.dayOfWeek != DayOfWeek.SATURDAY) {
        day = day.plusDays(1)
    }
    return day
}

fun String.prettyDateTime(): String {
    return runCatching {
        OffsetDateTime.parse(this).format(DateTimeFormatter.ofPattern("MMM d, h:mm a"))
    }.recoverCatching {
        LocalDateTime.parse(this).format(DateTimeFormatter.ofPattern("MMM d, h:mm a"))
    }.getOrDefault(this)
}

fun String.prettyDate(): String {
    return runCatching {
        OffsetDateTime.parse(this).format(DateTimeFormatter.ofPattern("MMM d, yyyy"))
    }.recoverCatching {
        LocalDateTime.parse(this).format(DateTimeFormatter.ofPattern("MMM d, yyyy"))
    }.getOrDefault(take(10))
}

fun Int.formatCents(): String = "$" + "%.2f".format(this / 100.0)
