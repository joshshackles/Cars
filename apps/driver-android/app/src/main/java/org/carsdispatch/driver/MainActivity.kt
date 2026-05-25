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
                            runCatching {
                                val nextSession = CarsApi { null }.login(email, accessCode, "Android")
                                val nextApi = CarsApi { nextSession.token }
                                val nextManifest = if (nextSession.driver != null) {
                                    nextApi.manifest(LocalDate.now().toString())
                                } else {
                                    null
                                }
                                val nextDriverTools = if (nextSession.driver != null) {
                                    nextApi.driverTools()
                                } else {
                                    null
                                }
                                sessionStore.save(nextSession)
                                session = nextSession
                                profile = nextApi.profile()
                                manifest = nextManifest
                                driverTools = nextDriverTools
                                screen = MobileScreen.Home
                            }.onFailure {
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
    onLogout: () -> Unit,
    onSaveProfile: (ProfileUpdatePayload) -> Unit,
    onRequestRide: (RideRequestPayload) -> Unit,
    driverTools: DriverToolsResponse?,
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
                busy = busy,
                error = error,
                onRefresh = onRefreshDriverTools,
                onSaveDriverInfo = onSaveDriverInfo,
                onAddAvailability = onAddAvailability,
                onBack = { onNavigate(MobileScreen.Home) }
            )
            else -> MobileHomeScreen(session = session, profile = profile, onNavigate = onNavigate)
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
fun MobileHomeScreen(session: MobileSession, profile: MobileProfile?, onNavigate: (MobileScreen) -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 72.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("How can we help today?", color = CarsColors.Navy, fontSize = 25.sp, fontWeight = FontWeight.Black)
                    Text("Request a ride, keep your contact details current, or open your driver dashboard.", color = CarsColors.Muted, lineHeight = 21.sp)
                }
            }
        }
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
        if (session.driver != null) {
            item {
                HomeActionCard(
                    icon = Icons.Default.Edit,
                    title = "Driver profile",
                    description = "Vehicle, insurance, availability, rides, and reimbursements.",
                    onClick = { onNavigate(MobileScreen.DriverTools) }
                )
            }
            item {
                HomeActionCard(
                    icon = Icons.Default.DirectionsCar,
                    title = "Driver dashboard",
                    description = "Open assigned rides, route tools, GPS mileage, and trip status.",
                    onClick = { onNavigate(MobileScreen.DriverDashboard) }
                )
            }
        }
        item {
            Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Need immediate help?", color = CarsColors.Red, fontWeight = FontWeight.Black, fontSize = 21.sp)
                    Text("Call CARS at 417-438-2925.", color = CarsColors.Navy, fontWeight = FontWeight.Black)
                    Text("Role: ${session.role.prettyRoleLabel()}", color = CarsColors.Muted)
                }
            }
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

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 72.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { BackTitle("My information", "Keep contact and pickup details current.", onBack) }
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
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(state, { state = it }, label = { Text("State") }, modifier = Modifier.weight(1f))
                        OutlinedTextField(postalCode, { postalCode = it }, label = { Text("ZIP") }, modifier = Modifier.weight(1f))
                    }
                    OutlinedTextField(preference, { preference = it }, label = { Text("Communication preference") }, modifier = Modifier.fillMaxWidth())
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

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 72.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { BackTitle("Request a ride", "Dispatch will review and schedule your trip.", onBack) }
        item {
            Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Pickup", color = CarsColors.Navy, fontWeight = FontWeight.Black, fontSize = 20.sp)
                    OutlinedTextField(pickupAddress, { pickupAddress = it }, label = { Text("Pickup address") }, modifier = Modifier.fillMaxWidth())
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(pickupCity, { pickupCity = it }, label = { Text("City") }, modifier = Modifier.weight(1f))
                        OutlinedTextField(pickupCounty, { pickupCounty = it }, label = { Text("County") }, modifier = Modifier.weight(1f))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(pickupState, { pickupState = it }, label = { Text("State") }, modifier = Modifier.weight(1f))
                        OutlinedTextField(pickupZip, { pickupZip = it }, label = { Text("ZIP") }, modifier = Modifier.weight(1f))
                    }
                    Text("Dropoff", color = CarsColors.Navy, fontWeight = FontWeight.Black, fontSize = 20.sp)
                    OutlinedTextField(dropoffAddress, { dropoffAddress = it }, label = { Text("Dropoff address") }, modifier = Modifier.fillMaxWidth())
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(dropoffCity, { dropoffCity = it }, label = { Text("City") }, modifier = Modifier.weight(1f))
                        OutlinedTextField(dropoffCounty, { dropoffCounty = it }, label = { Text("County") }, modifier = Modifier.weight(1f))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(dropoffState, { dropoffState = it }, label = { Text("State") }, modifier = Modifier.weight(1f))
                        OutlinedTextField(dropoffZip, { dropoffZip = it }, label = { Text("ZIP") }, modifier = Modifier.weight(1f))
                    }
                    Text("Appointment", color = CarsColors.Navy, fontWeight = FontWeight.Black, fontSize = 20.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(date, { date = it }, label = { Text("Date YYYY-MM-DD") }, modifier = Modifier.weight(1f))
                        OutlinedTextField(time, { time = it }, label = { Text("Time HH:MM") }, modifier = Modifier.weight(1f))
                    }
                    OutlinedTextField(purpose, { purpose = it }, label = { Text("Purpose code") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(instructions, { instructions = it }, label = { Text("Special instructions") }, modifier = Modifier.fillMaxWidth())
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
    var email by remember { mutableStateOf("driver@esc.example") }
    var accessCode by remember { mutableStateOf("") }

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
                Text(
                    "Driver trip tools appear for linked driver profiles. Staff accounts can sign in here and use the web workspace for operations.",
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
    var maxDistance by remember { mutableStateOf("") }
    var counties by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 72.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { BackTitle("Driver profile", "Vehicle, availability, rides, and reimbursements.", onBack) }
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
        item {
            Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Add availability", color = CarsColors.Navy, fontSize = 21.sp, fontWeight = FontWeight.Black)
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(availabilityType, { availabilityType = it }, label = { Text("Type") }, modifier = Modifier.weight(1f))
                        OutlinedTextField(availabilityStatus, { availabilityStatus = it }, label = { Text("Status") }, modifier = Modifier.weight(1f))
                    }
                    OutlinedTextField(availabilityStart, { availabilityStart = it }, label = { Text("Starts YYYY-MM-DDTHH:MM") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(availabilityEnd, { availabilityEnd = it }, label = { Text("Ends YYYY-MM-DDTHH:MM") }, modifier = Modifier.fillMaxWidth())
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
                Metric("Active", (manifest?.assignments.orEmpty().count { !it.isFinalized() }).toString(), Modifier.weight(1f))
                Metric("Done", (manifest?.assignments.orEmpty().count { it.isFinalized() }).toString(), Modifier.weight(1f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Metric("Total", (manifest?.assignments?.size ?: 0).toString(), Modifier.weight(1f))
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
fun TripListItem(assignment: ManifestAssignment, onOpen: () -> Unit) {
    val trip = assignment.tripLeg
    val rider = trip.rideRequest.rider

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
            Button(onClick = onOpen, colors = ButtonDefaults.buttonColors(containerColor = CarsColors.Navy), modifier = Modifier.fillMaxWidth()) {
                Text("Open trip tools", fontWeight = FontWeight.Black)
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
