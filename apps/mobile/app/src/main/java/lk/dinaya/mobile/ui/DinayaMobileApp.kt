package lk.dinaya.mobile.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.expandHorizontally
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkHorizontally
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.BookOnline
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.ContentCut
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Extension
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.OpenInBrowser
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Sms
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.coroutines.delay
import lk.dinaya.mobile.BuildConfig
import lk.dinaya.mobile.R
import lk.dinaya.mobile.data.BookingSummary
import lk.dinaya.mobile.data.ModuleItem
import lk.dinaya.mobile.data.ModuleMetric
import lk.dinaya.mobile.data.StoredSession
import lk.dinaya.mobile.data.ThemePreference

private data class BottomTab(val routeKey: String, val label: String, val icon: ImageVector)

private val BottomPrimary = listOf(
    BottomTab("overview", "Home", Icons.Filled.Home),
    BottomTab("calendar", "Calendar", Icons.Filled.CalendarMonth),
    BottomTab("bookings", "Bookings", Icons.Filled.BookOnline),
    BottomTab("clients", "Clients", Icons.Filled.Groups),
)

internal fun sectionKeyForMore(key: String): Boolean =
    BottomPrimary.none { it.routeKey == key }

@Composable
fun DinayaMobileApp(viewModel: DinayaViewModel = viewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    DinayaTheme(themePreference = state.themePreference) {
        if (state.session == null) {
            Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                LoginScreen(state, viewModel)
            }
        } else {
            DashboardScaffold(state, viewModel)
        }
    }
}

// ——— Auth Screen ——————————————————————————————————————————————————————————
@Composable
fun Modifier.pressScale(
    interactionSource: MutableInteractionSource = remember { MutableInteractionSource() },
    scaleDown: Float = 0.96f,
): Modifier {
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) scaleDown else 1f,
        animationSpec = spring(
            dampingRatio = 0.7f,
            stiffness = Spring.StiffnessMediumLow,
        ),
        label = "pressScale",
    )
    return this.graphicsLayer {
        scaleX = scale
        scaleY = scale
    }
}

@Composable
fun Modifier.bounceClick(
    scaleDown: Float = 0.96f,
    onClick: () -> Unit,
): Modifier {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) scaleDown else 1f,
        animationSpec = spring(
            dampingRatio = 0.7f,
            stiffness = Spring.StiffnessMediumLow,
        ),
        label = "bounceClick",
    )
    return this
        .graphicsLayer {
            scaleX = scale
            scaleY = scale
        }
        .clickable(
            interactionSource = interactionSource,
            indication = null,
            onClick = onClick,
        )
}

// ——— Auth Screen ——————————————————————————————————————————————————————————
@Composable
internal fun LoginScreen(state: DinayaUiState, viewModel: DinayaViewModel) {
    val context = LocalContext.current
    var showAdvancedServer by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding()
            .navigationBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 24.dp),
    ) {
        BrandLockup()
        Spacer(modifier = Modifier.height(28.dp))
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = "Welcome back",
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Text(
                    text = "Sign in to your Dinaya dashboard",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            if (BuildConfig.DEBUG) {
                val dark = isSystemInDarkTheme()
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = if (dark) Color(0xFF1E293B) else Color(0xFFEFF6FF),
                    ),
                    border = BorderStroke(1.dp, if (dark) Color(0xFF334155) else Color(0xFFBFDBFE)),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .bounceClick {
                            viewModel.signIn(
                                overrideEmail = "audit-dark-1781671231095@dinaya.test",
                                overridePassword = "AuditPass123!",
                                overrideBaseUrl = "http://127.0.0.1:3002",
                            )
                        },
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = Icons.Filled.AutoAwesome,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp),
                            )
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Instant Demo Login",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onBackground,
                            )
                            Text(
                                text = "1-tap sign-in to Dinaya Luxury Salon with live bookings & stats",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Icon(
                            imageVector = Icons.Filled.ChevronRight,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    HorizontalDivider(modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
                    Text(
                        text = "or sign in with credentials",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    HorizontalDivider(modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                AuthField(
                    value = state.email,
                    onValueChange = viewModel::updateEmail,
                    label = "Email",
                    keyboardType = KeyboardType.Email,
                    shape = DinayaRadiusPill,
                )
                AuthField(
                    value = state.password,
                    onValueChange = viewModel::updatePassword,
                    label = "Password",
                    keyboardType = KeyboardType.Password,
                    isPassword = true,
                    shape = DinayaRadiusPill,
                    labelAccessory = {
                        Text(
                            text = "Forgot password?",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.clickable {
                                openWebFallback(context, null, "/forgot-password")
                            },
                        )
                    },
                )
                AuthField(
                    value = state.deviceName,
                    onValueChange = viewModel::updateDeviceName,
                    label = "Device name",
                    shape = DinayaRadiusPill,
                )

                if (BuildConfig.DEBUG) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { showAdvancedServer = !showAdvancedServer }
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Settings,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(14.dp),
                        )
                        Text(
                            text = if (showAdvancedServer) "Hide server options" else "Server options (advanced)",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }

                    AnimatedVisibility(visible = showAdvancedServer) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            AuthField(
                                value = state.baseUrl,
                                onValueChange = viewModel::updateBaseUrl,
                                label = "API URL",
                            )
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                OutlinedButton(
                                    onClick = { viewModel.updateBaseUrl("http://127.0.0.1:3002") },
                                    shape = DinayaRadiusButton,
                                    modifier = Modifier.weight(1f).heightIn(min = 48.dp),
                                ) {
                                    Text("127.0.0.1", style = MaterialTheme.typography.bodySmall)
                                }
                                OutlinedButton(
                                    onClick = { viewModel.updateBaseUrl("http://192.168.1.4:3002") },
                                    shape = DinayaRadiusButton,
                                    modifier = Modifier.weight(1f).heightIn(min = 48.dp),
                                ) {
                                    Text("Wi-Fi LAN", style = MaterialTheme.typography.bodySmall)
                                }
                                OutlinedButton(
                                    onClick = { viewModel.updateBaseUrl("https://dinaya-lk.vercel.app") },
                                    shape = DinayaRadiusButton,
                                    modifier = Modifier.weight(1f).heightIn(min = 48.dp),
                                ) {
                                    Text("Vercel", style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }
                }
            }

            ErrorBanner(state.errorMessage, onDismiss = viewModel::clearError)

            val buttonInteractionSource = remember { MutableInteractionSource() }
            Button(
                onClick = viewModel::signIn,
                enabled = !state.isLoading,
                shape = DinayaRadiusPill,
                interactionSource = buttonInteractionSource,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                    disabledContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.6f),
                    disabledContentColor = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f),
                ),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .pressScale(buttonInteractionSource),
            ) {
                if (state.isLoading) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp,
                        )
                        Text(
                            text = "Signing in…",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                } else {
                    Text(
                        text = "Sign in",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }

            Text(
                text = "Secure sign-in · Your data is encrypted",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "No account? ",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = "Create your booking page",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.clickable {
                        openWebFallback(context, null, "/register")
                    },
                )
            }
        }
    }
}

// ——— Dashboard Scaffold ———————————————————————————————————————————————————
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun DashboardScaffold(state: DinayaUiState, viewModel: DinayaViewModel) {
    val context = LocalContext.current
    val dark = when (state.themePreference) {
        ThemePreference.SYSTEM -> isSystemInDarkTheme()
        ThemePreference.LIGHT -> false
        ThemePreference.DARK -> true
    }
    var moreOpen by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var signOutDialogOpen by remember { mutableStateOf(false) }
    var pendingConfirmStatus by remember { mutableStateOf<Pair<String, String>?>(null) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val selectedSection = dashboardSectionByKey(state.selectedSectionKey)
    val moduleState = state.moduleContent[selectedSection.key]
    val moreActive = sectionKeyForMore(selectedSection.key)
    val activeTabKey = if (moreActive) "__more__" else selectedSection.key
    val businessName = state.bootstrap?.business?.name ?: state.session?.businessName.orEmpty()

    val handleRequestStatus: (String, String) -> Unit = { bookingId, targetStatus ->
        if (targetStatus.lowercase() == "cancelled" || targetStatus.lowercase() == "no_show") {
            pendingConfirmStatus = Pair(bookingId, targetStatus)
        } else {
            viewModel.updateBookingStatus(bookingId, targetStatus)
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        bottomBar = {
            DinayaBottomBar(
                activeKey = activeTabKey,
                moreActive = moreActive,
                onSelect = { key -> viewModel.selectSection(key) },
                onOpenMore = { moreOpen = true },
            )
        },
    ) { padding ->
        // Native pull-to-refresh equivalent for Overview / Bookings / Calendar.
        PullToRefreshBox(
            isRefreshing = state.isLoading,
            onRefresh = viewModel::refreshSelectedSection,
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.surfaceContainerLow),
        ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            DashboardTopChrome(
                businessName = businessName,
                userEmail = state.session?.userEmail.orEmpty(),
                searchQuery = searchQuery,
                themePreference = state.themePreference,
                onToggleTheme = viewModel::toggleTheme,
                onSearchChange = { searchQuery = it },
            )

            PlanBanner(
                plan = state.bootstrap?.business?.plan.orEmpty(),
                onOpenBilling = { openWebFallback(context, state.session, "/dashboard/billing") },
            )

            ErrorBanner(state.errorMessage, onDismiss = viewModel::clearError)
            ActionBanner(state.actionMessage, onDismiss = viewModel::clearActionMessage)

            AnimatedContent(
                targetState = selectedSection.key,
                transitionSpec = {
                    (fadeIn(animationSpec = spring(stiffness = Spring.StiffnessMediumLow)) +
                        slideInHorizontally(
                            animationSpec = spring(dampingRatio = 0.85f, stiffness = Spring.StiffnessMediumLow),
                            initialOffsetX = { fullWidth -> (fullWidth * 0.05f).toInt() }
                        )).togetherWith(
                        fadeOut(animationSpec = spring(stiffness = Spring.StiffnessMediumLow))
                    )
                },
                label = "sectionTransition",
            ) { sectionKey ->
                when (sectionKey) {
                    "overview" -> {
                        OverviewScreen(
                            state = state,
                            viewModel = viewModel,
                            businessName = businessName,
                            searchQuery = searchQuery,
                            dark = dark,
                            onRequestStatus = handleRequestStatus,
                        )
                    }
                    "bookings" -> {
                        BookingsScreen(
                            state = state,
                            viewModel = viewModel,
                            businessName = businessName,
                            searchQuery = searchQuery,
                            dark = dark,
                            onRequestStatus = handleRequestStatus,
                        )
                    }
                    "calendar" -> {
                        CalendarScreen(
                            state = state,
                            viewModel = viewModel,
                            businessName = businessName,
                            dark = dark,
                            onRequestStatus = handleRequestStatus,
                        )
                    }
                    "clients" -> {
                        CatalogClientsScreen(
                            state = state,
                            moduleState = moduleState,
                            searchQuery = searchQuery,
                            bookings = state.bookings,
                            onRefresh = viewModel::refreshSelectedSection,
                            onOpenWeb = { openWebFallback(context, state.session, "/dashboard/clients") },
                            viewModel = viewModel,
                        )
                    }
                    "services" -> {
                        ServicesScreen(
                            state = state,
                            moduleState = moduleState,
                            searchQuery = searchQuery,
                            onRefresh = viewModel::refreshSelectedSection,
                            onOpenWeb = { openWebFallback(context, state.session, "/dashboard/services") },
                            viewModel = viewModel,
                        )
                    }
                    "staff" -> {
                        StaffScreen(
                            state = state,
                            moduleState = moduleState,
                            searchQuery = searchQuery,
                            onRefresh = viewModel::refreshSelectedSection,
                            onOpenWeb = { openWebFallback(context, state.session, "/dashboard/staff") },
                            viewModel = viewModel,
                        )
                    }
                    "locations" -> {
                        LocationsScreen(
                            state = state,
                            moduleState = moduleState,
                            searchQuery = searchQuery,
                            onRefresh = viewModel::refreshSelectedSection,
                            onOpenWeb = { openWebFallback(context, state.session, "/dashboard/locations") },
                            viewModel = viewModel,
                        )
                    }
                    "availability" -> {
                        AvailabilityScreen(
                            state = state,
                            moduleState = moduleState,
                            onRefresh = viewModel::refreshSelectedSection,
                            onOpenWeb = { openWebFallback(context, state.session, "/dashboard/availability") },
                            viewModel = viewModel,
                        )
                    }
                    "reviews" -> {
                        ReviewsScreen(
                            state = state,
                            viewModel = viewModel,
                            searchQuery = searchQuery,
                            dark = dark,
                        )
                    }
                    "payments" -> {
                        PaymentsScreen(
                            state = state,
                            searchQuery = searchQuery,
                            dark = dark,
                            session = state.session,
                            onRefresh = viewModel::refreshSelectedSection,
                            onOpenWeb = { path ->
                                openWebFallback(context, state.session, path)
                            },
                        )
                    }
                    "marketing" -> {
                        MarketingScreen(
                            state = state,
                            viewModel = viewModel,
                            businessName = businessName,
                            businessSlug = state.bootstrap?.business?.slug.orEmpty(),
                        )
                    }
                    "deals" -> {
                        DealsScreen(
                            state = state,
                            viewModel = viewModel,
                            searchQuery = searchQuery,
                            dark = dark,
                        )
                    }
                    "broadcasts" -> {
                        BroadcastsScreen(
                            state = state,
                            viewModel = viewModel,
                            searchQuery = searchQuery,
                            dark = dark,
                        )
                    }
                    "aiHub" -> {
                        AiHubScreen(
                            state = state,
                            viewModel = viewModel,
                            searchQuery = searchQuery,
                            dark = dark,
                        )
                    }
                    "reports" -> {
                        ReportsScreen(
                            state = state,
                            viewModel = viewModel,
                            dark = dark,
                        )
                    }
                    "integrations" -> {
                        IntegrationsScreen(
                            state = state,
                            viewModel = viewModel,
                            searchQuery = searchQuery,
                            dark = dark,
                            onOpenWeb = { path ->
                                openWebFallback(context, state.session, path)
                            },
                        )
                    }
                    "automations" -> {
                        AutomationsScreen(
                            state = state,
                            viewModel = viewModel,
                            searchQuery = searchQuery,
                            dark = dark,
                        )
                    }
                    "billing" -> {
                        BillingScreen(
                            state = state,
                            viewModel = viewModel,
                            dark = dark,
                            onOpenWeb = { path ->
                                openWebFallback(context, state.session, path)
                            },
                        )
                    }
                    "settings" -> {
                        SettingsScreen(
                            state = state,
                            viewModel = viewModel,
                            dark = dark,
                            onSignOutRequest = { signOutDialogOpen = true },
                        )
                    }
                    else -> {
                        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                            WorkspaceHeader(
                                title = moduleState?.payload?.title ?: selectedSection.label,
                                summary = moduleState?.payload?.summary?.ifBlank { selectedSection.summary } ?: selectedSection.summary,
                                onRefresh = viewModel::refreshSelectedSection,
                                onOpenWeb = {
                                    openWebFallback(
                                        context = context,
                                        session = state.session,
                                        path = moduleState?.payload?.webPath ?: selectedSection.webPath,
                                    )
                                },
                                isLoading = moduleState?.isLoading == true,
                            )
                            ModuleWorkspace(
                                section = selectedSection,
                                moduleState = moduleState,
                                dark = dark,
                                searchQuery = searchQuery,
                                onRefresh = viewModel::refreshSelectedSection,
                                onOpenWeb = {
                                    openWebFallback(
                                        context = context,
                                        session = state.session,
                                        path = moduleState?.payload?.webPath ?: selectedSection.webPath,
                                    )
                                },
                            )
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
        }
    }

    if (moreOpen) {
        ModalBottomSheet(
            onDismissRequest = { moreOpen = false },
            sheetState = sheetState,
            shape = DinayaRadiusSheet,
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = MaterialTheme.colorScheme.onSurface,
        ) {
            MoreSheetContent(
                activeKey = selectedSection.key,
                userEmail = state.session?.userEmail.orEmpty(),
                plan = state.bootstrap?.business?.plan.orEmpty(),
                businessSlug = state.bootstrap?.business?.slug ?: "",
                themePreference = state.themePreference,
                onSelect = { key ->
                    moreOpen = false
                    viewModel.selectSection(key)
                },
                onSetTheme = viewModel::setThemePreference,
                onHelp = {
                    moreOpen = false
                    openWebFallback(context, state.session, "/docs")
                },
                onSignOutRequest = {
                    moreOpen = false
                    signOutDialogOpen = true
                },
            )
        }
    }

    state.selectedBooking?.let { booking ->
        BookingDetailSheet(
            booking = booking,
            businessName = businessName,
            dark = dark,
            onRequestStatus = handleRequestStatus,
            onDismiss = { viewModel.selectBooking(null) },
            onReschedule = viewModel::openRescheduleSheet,
        )
    }

    if (state.showNewBookingSheet) {
        NewBookingSheet(
            state = state,
            viewModel = viewModel,
            onDismiss = viewModel::closeNewBookingSheet,
        )
    }

    if (state.showRescheduleSheet) {
        RescheduleBookingSheet(
            state = state,
            viewModel = viewModel,
            onDismiss = viewModel::closeRescheduleSheet,
        )
    }

    if (signOutDialogOpen) {
        SignOutDialog(
            onConfirm = {
                signOutDialogOpen = false
                viewModel.signOut()
            },
            onDismiss = { signOutDialogOpen = false },
        )
    }

    pendingConfirmStatus?.let { (bookingId, targetStatus) ->
        BookingConfirmStatusDialog(
            status = targetStatus,
            cancelReason = state.cancelReason,
            onReasonChange = viewModel::setCancelReason,
            onConfirm = {
                if (targetStatus.lowercase() == "cancelled") {
                    viewModel.cancelBookingWithReason(bookingId, state.cancelReason)
                } else {
                    viewModel.updateBookingStatus(bookingId, targetStatus)
                }
                pendingConfirmStatus = null
            },
            onDismiss = {
                pendingConfirmStatus = null
            },
        )
    }
}

// ——— Top Chrome ———————————————————————————————————————————————————————————
@Composable
internal fun DashboardTopChrome(
    businessName: String,
    userEmail: String,
    searchQuery: String,
    themePreference: ThemePreference,
    onToggleTheme: () -> Unit,
    onSearchChange: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            BrandLockup(subtitle = businessName)
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(
                    onClick = onToggleTheme,
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                ) {
                    Icon(
                        imageVector = when (themePreference) {
                            ThemePreference.DARK -> Icons.Filled.LightMode
                            ThemePreference.LIGHT -> Icons.Filled.DarkMode
                            ThemePreference.SYSTEM -> Icons.Filled.AutoAwesome
                        },
                        contentDescription = "Toggle theme",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(19.dp),
                    )
                }

                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = userEmail.take(1).uppercase().ifBlank { "D" },
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchChange,
            placeholder = { Text("Search bookings, clients…") },
            leadingIcon = {
                Icon(
                    imageVector = Icons.Filled.Search,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                )
            },
            trailingIcon = {
                if (searchQuery.isNotBlank()) {
                    IconButton(onClick = { onSearchChange("") }) {
                        Icon(
                            imageVector = Icons.Filled.Close,
                            contentDescription = "Clear search",
                            modifier = Modifier.size(16.dp),
                        )
                    }
                }
            },
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                focusedContainerColor = MaterialTheme.colorScheme.surface,
                unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                cursorColor = MaterialTheme.colorScheme.primary,
            ),
            textStyle = MaterialTheme.typography.bodyMedium.copy(
                color = MaterialTheme.colorScheme.onBackground,
            ),
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
        )
    }
}

// ——— Plan Banner ——————————————————————————————————————————————————————————
@Composable
internal fun PlanBanner(plan: String, onOpenBilling: () -> Unit) {
    if (plan != "trial" && plan != "expired") return
    val isTrial = plan == "trial"
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(DinayaRadiusButton)
            .background(
                if (isTrial) MaterialTheme.colorScheme.primary.copy(alpha = 0.06f)
                else MaterialTheme.colorScheme.errorContainer,
            )
            .border(
                BorderStroke(
                    1.dp,
                    if (isTrial) MaterialTheme.colorScheme.primary.copy(alpha = 0.25f)
                    else MaterialTheme.colorScheme.error.copy(alpha = 0.3f),
                ),
                DinayaRadiusButton,
            )
            .clickable { onOpenBilling() }
            .padding(horizontal = 16.dp, vertical = 10.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = if (isTrial) {
                "Your free trial is active — subscribe to keep your booking page live →"
            } else {
                "Your free trial has ended — your booking page is offline. Reactivate →"
            },
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = if (isTrial) FontWeight.Normal else FontWeight.SemiBold,
            color = if (isTrial) MaterialTheme.colorScheme.primary
            else MaterialTheme.colorScheme.error,
            textAlign = TextAlign.Center,
        )
    }
}

// ——— Overview Screen ——————————————————————————————————————————————————————
@Composable
internal fun OverviewScreen(
    state: DinayaUiState,
    viewModel: DinayaViewModel,
    businessName: String,
    searchQuery: String,
    dark: Boolean,
    onRequestStatus: (String, String) -> Unit,
) {
    val overview = state.overviewData
    val firstName = (state.bootstrap?.business?.name ?: state.session?.businessName ?: "Dinaya")
        .split(" ").firstOrNull()?.ifBlank { null } ?: "Dinaya"

    val todayBookings = (overview?.todayRows?.takeIf { it.isNotEmpty() } ?: state.bookings).filter {
        searchQuery.isBlank() ||
            it.clientName.contains(searchQuery, ignoreCase = true) ||
            it.serviceName.contains(searchQuery, ignoreCase = true) ||
            it.staffName.contains(searchQuery, ignoreCase = true)
    }

    val liveContext = remember(overview, todayBookings.size) {
        val count = todayBookings.size
        val countText = if (count == 0) "No appointments today" else "$count appointment${if (count == 1) "" else "s"} today"
        val revStat = overview?.stats?.firstOrNull { it.label.contains("revenue", ignoreCase = true) || it.label.contains("lkr", ignoreCase = true) }
        if (revStat != null && revStat.value.isNotBlank()) "$countText · ${revStat.value}" else countText
    }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = (overview?.greetingDate ?: formatDateHeader(LocalDate.now().toString())).uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = "Good day, $firstName",
                style = MaterialTheme.typography.headlineMedium.copy(fontSize = 28.sp),
                color = MaterialTheme.colorScheme.onBackground,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = liveContext,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                onClick = viewModel::openNewBookingSheet,
                shape = DinayaRadiusButton,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                ),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp),
                modifier = Modifier
                    .weight(1f)
                    .height(44.dp),
            ) {
                Text("New booking", fontWeight = FontWeight.Medium)
            }
            OutlinedButton(
                onClick = viewModel::refreshSelectedSection,
                enabled = !state.isLoading,
                shape = DinayaRadiusButton,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.primary),
                modifier = Modifier
                    .weight(1f)
                    .height(44.dp),
            ) {
                Text("Refresh", fontWeight = FontWeight.SemiBold)
            }
        }

        // Today section
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(
                    text = "Today",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = "Tap an appointment to view or message.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            TextButton(onClick = { viewModel.selectSection("calendar") }) {
                Text("Calendar", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
            }
        }

        if (state.isLoading && todayBookings.isEmpty()) {
            LoadingPanel()
        } else if (todayBookings.isEmpty()) {
            SiteEmptyState(
                title = "No bookings today",
                body = if (searchQuery.isNotBlank()) "No bookings matched \"$searchQuery\"."
                else "When clients book online, today's appointments will appear here.",
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                todayBookings.forEach { booking ->
                    BookingCard(
                        booking = booking,
                        businessName = businessName,
                        dark = dark,
                        onClick = { viewModel.selectBooking(booking) },
                        onRequestStatus = onRequestStatus,
                    )
                }
            }
        }

        if (overview != null && overview.nextRows.isNotEmpty()) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Coming up",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                overview.nextRows.forEach { booking ->
                    BookingCard(
                        booking = booking,
                        businessName = businessName,
                        dark = dark,
                        onClick = { viewModel.selectBooking(booking) },
                        onRequestStatus = onRequestStatus,
                    )
                }
            }
        }

        // Compact stats metrics grid
        if (overview != null && overview.stats.isNotEmpty()) {
            OverviewStatsGrid(overview.stats)
        } else {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SiteStatCard(
                    label = "TODAY'S APPOINTMENTS",
                    value = state.bookings.size.toString(),
                    modifier = Modifier.weight(1f),
                )
                SiteStatCard(
                    label = "ACTIVE STAFF",
                    value = (state.bootstrap?.staff?.size ?: 0).toString(),
                    modifier = Modifier.weight(1f),
                )
            }
        }

        val slug = state.bootstrap?.business?.slug.orEmpty()
        val bookingUrl = overview?.bookingUrl?.ifBlank { null }
            ?: (if (slug.isNotBlank()) "https://dinaya.lk/book/$slug" else "https://dinaya.lk")
        val displayUrl = overview?.bookingDisplayUrl?.ifBlank { null }
            ?: (if (slug.isNotBlank()) "dinaya.lk/book/$slug" else "dinaya.lk")

        BookingShareCard(
            bookingUrl = bookingUrl,
            displayUrl = displayUrl,
            businessName = businessName,
        )

        // Recent Activity Card
        if (overview != null && overview.recentActivity.isNotEmpty()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = DinayaRadiusCard,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text(
                        text = "Recent activity",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    overview.recentActivity.forEachIndexed { index, act ->
                        if (index > 0) {
                            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(30.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.surfaceVariant),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.Bolt,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(16.dp),
                                )
                            }
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "${act.entity} ${act.action.replace("_", " ")}".replaceFirstChar { it.uppercase() },
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                Text(
                                    text = formatRelativeAge(act.createdAt),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
        }

        state.lastSyncedAt?.let {
            Text(
                text = "Synced ${it.take(16).replace("T", " ")}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

// ——— Bookings Screen ——————————————————————————————————————————————————————
@Composable
internal fun BookingsScreen(
    state: DinayaUiState,
    viewModel: DinayaViewModel,
    businessName: String,
    searchQuery: String,
    dark: Boolean,
    onRequestStatus: (String, String) -> Unit,
) {
    val tabs = listOf(
        "today" to "Today",
        "upcoming" to "Upcoming",
        "past" to "Past",
        "cancelled" to "Cancelled",
    )
    val statusFilters = listOf("all", "pending", "confirmed", "completed", "cancelled")
    val selectedStatus = state.bookingsStatus.ifBlank { "all" }

    // Debounced server search: the top-chrome query hits ?q= without spamming.
    LaunchedEffect(searchQuery) {
        delay(400)
        if (searchQuery != state.bookingsQuery &&
            (searchQuery.isBlank() || searchQuery.length >= 2)
        ) {
            viewModel.searchBookings(searchQuery)
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Button(
            onClick = viewModel::openNewBookingSheet,
            shape = DinayaRadiusButton,
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
            ),
            elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(44.dp),
        ) {
            Text("New booking", fontWeight = FontWeight.Medium)
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = "Bookings",
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = "Manage appointments and statuses",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            OutlinedButton(
                onClick = viewModel::refreshSelectedSection,
                shape = DinayaRadiusButton,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                modifier = Modifier.height(48.dp),
            ) {
                Text("Refresh", style = MaterialTheme.typography.labelMedium)
            }
        }

        // Tabs
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            tabs.forEach { (tabKey, tabLabel) ->
                val active = state.bookingsTab == tabKey
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(DinayaRadiusPill)
                        .background(
                            if (active) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.surface,
                        )
                        .border(
                            BorderStroke(
                                1.dp,
                                if (active) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.outline,
                            ),
                            DinayaRadiusPill,
                        )
                        .clickable { viewModel.selectBookingsTab(tabKey) }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = tabLabel,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
                        color = if (active) MaterialTheme.colorScheme.onPrimary
                        else MaterialTheme.colorScheme.onSurface,
                    )
                }
            }
        }

        // Status filter chips
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            statusFilters.forEach { statusKey ->
                val active = selectedStatus == statusKey
                Box(
                    modifier = Modifier
                        .clip(DinayaRadiusPill)
                        .background(
                            if (active) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                            else Color.Transparent,
                        )
                        .border(
                            BorderStroke(
                                1.dp,
                                if (active) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                            ),
                            DinayaRadiusPill,
                        )
                        .clickable { viewModel.filterByStatus(statusKey) }
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = statusKey.replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (active) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        val filtered = state.bookings.filter {
            (selectedStatus == "all" || it.status.equals(selectedStatus, ignoreCase = true)) &&
            (searchQuery.isBlank() ||
                it.clientName.contains(searchQuery, ignoreCase = true) ||
                it.serviceName.contains(searchQuery, ignoreCase = true) ||
                it.staffName.contains(searchQuery, ignoreCase = true) ||
                it.clientPhone.contains(searchQuery, ignoreCase = true))
        }

        Text(
            text = "${filtered.size} booking${if (filtered.size == 1) "" else "s"}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        if (state.isLoading && state.bookings.isEmpty()) {
            LoadingPanel()
        } else if (filtered.isEmpty()) {
            SiteEmptyState(
                title = "No bookings found",
                body = if (searchQuery.isNotBlank()) "No bookings matched \"$searchQuery\"."
                else "No bookings in this category right now.",
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                filtered.forEach { booking ->
                    BookingCard(
                        booking = booking,
                        businessName = businessName,
                        dark = dark,
                        onClick = { viewModel.selectBooking(booking) },
                        onRequestStatus = onRequestStatus,
                    )
                }
            }
        }
    }
}

@Composable
internal fun CalendarScreen(
    state: DinayaUiState,
    viewModel: DinayaViewModel,
    businessName: String,
    dark: Boolean,
    onRequestStatus: (String, String) -> Unit,
) {
    val cal = state.calendarData
    val currentDate = state.calendarDate ?: (cal?.date ?: LocalDate.now().toString())

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = "Calendar",
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = formatDateHeader(currentDate),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            CalendarViewToggle(
                view = state.calendarView,
                onChange = viewModel::changeCalendarView,
            )
        }

        // Week-aware date navigator (7-day jumps in week view) + Today shortcut.
        CalendarDateNavigator(
            currentDate = currentDate,
            view = state.calendarView,
            onSelectDate = viewModel::changeCalendarDate,
        )

        // 7-day strip from CalendarPayload.days (synthesized fallback in day view).
        CalendarWeekStrip(
            days = cal?.days.orEmpty(),
            currentDate = currentDate,
            onSelectDate = viewModel::changeCalendarDate,
        )

        // Scrollable single-select staff filter.
        CalendarStaffChips(
            staff = cal?.staff.orEmpty(),
            selectedStaffId = state.calendarStaffId,
            onSelect = viewModel::changeCalendarStaff,
        )

        val rows = cal?.rows.orEmpty()

        if (state.isLoading && rows.isEmpty()) {
            LoadingPanel()
        } else if (rows.isEmpty()) {
            SiteEmptyState(
                title = "No appointments for ${formatDateHeader(currentDate)}",
                body = "Tap Today or switch to Week view to browse other appointments.",
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                rows.forEach { booking ->
                    BookingCard(
                        booking = booking,
                        businessName = businessName,
                        dark = dark,
                        onClick = { viewModel.selectBooking(booking) },
                        onRequestStatus = onRequestStatus,
                    )
                }
            }
        }
    }
}

// ——— Clients CRM Screen ———————————————————————————————————————————————————
@Composable
internal fun ClientsScreen(
    state: DinayaUiState,
    moduleState: ModuleContentState?,
    searchQuery: String,
    dark: Boolean,
    onRefresh: () -> Unit,
    onOpenWeb: () -> Unit,
    onSelectClient: (ModuleItem) -> Unit,
) {
    val payload = moduleState?.payload

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = "Clients",
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = "CRM records and client activity",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            OutlinedButton(
                onClick = onRefresh,
                shape = DinayaRadiusButton,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                modifier = Modifier.height(48.dp),
            ) {
                Text("Refresh", style = MaterialTheme.typography.labelMedium)
            }
        }

        if (payload?.metrics?.isNotEmpty() == true) {
            ModuleMetricsGrid(payload.metrics)
        }

        val items = payload?.items.orEmpty().filter {
            searchQuery.isBlank() ||
                it.title.contains(searchQuery, ignoreCase = true) ||
                (it.subtitle?.contains(searchQuery, ignoreCase = true) == true)
        }

        if (moduleState?.isLoading == true && items.isEmpty()) {
            LoadingPanel()
        } else if (items.isEmpty()) {
            SiteEmptyState(
                title = "No clients found",
                body = if (searchQuery.isNotBlank()) "No clients match \"$searchQuery\"."
                else "When clients book your services, their CRM records will appear here.",
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items.forEach { item ->
                    ClientRowCard(
                        item = item,
                        dark = dark,
                        onClick = { onSelectClient(item) },
                    )
                }
            }
        }
    }
}

// ——— Booking Detail Sheet —————————————————————————————————————————————————
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun BookingDetailSheet(
    booking: BookingSummary,
    businessName: String,
    dark: Boolean,
    onRequestStatus: (String, String) -> Unit,
    onDismiss: () -> Unit,
    onReschedule: (BookingSummary) -> Unit,
) {
    val context = LocalContext.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = DinayaRadiusSheet,
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = MaterialTheme.colorScheme.onSurface,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                Box(
                    modifier = Modifier
                        .size(width = 40.dp, height = 4.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)),
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Booking details",
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                StatusPill(booking.status, dark)
            }

            // Client Profile Box
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)),
                shape = DinayaRadiusCard,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        ClientInitials(name = booking.clientName)
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = booking.clientName.ifBlank { "Walk-in Client" },
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                            if (booking.clientPhone.isNotBlank()) {
                                Text(
                                    text = booking.clientPhone,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.clickable { dialPhoneNumber(context, booking.clientPhone) },
                                )
                            }
                            if (booking.clientEmail.isNotBlank()) {
                                Text(
                                    text = booking.clientEmail,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.clickable { sendEmail(context, booking.clientEmail) },
                                )
                            }
                        }
                    }

                    // Direct Contact Action Buttons (native intents only)
                    if (booking.clientPhone.isNotBlank()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            OutlinedButton(
                                onClick = { dialPhoneNumber(context, booking.clientPhone) },
                                shape = DinayaRadiusButton,
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                                modifier = Modifier.weight(1f).height(48.dp),
                            ) {
                                Icon(imageVector = Icons.Filled.Phone, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Call", style = MaterialTheme.typography.bodySmall)
                            }

                            OutlinedButton(
                                onClick = { sendSmsMessage(context, booking.clientPhone) },
                                shape = DinayaRadiusButton,
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                                modifier = Modifier.weight(1f).height(48.dp),
                            ) {
                                Icon(imageVector = Icons.Filled.Sms, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("SMS", style = MaterialTheme.typography.bodySmall)
                            }

                            OutlinedButton(
                                onClick = {
                                    val reminder = buildBookingReminder(
                                        clientName = booking.clientName.ifBlank { "Client" },
                                        serviceName = booking.serviceName,
                                        startsAt = booking.startsAt,
                                        businessName = businessName,
                                    )
                                    openWhatsApp(context, booking.clientPhone, reminder)
                                },
                                shape = DinayaRadiusButton,
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                                modifier = Modifier.weight(1f).height(48.dp),
                            ) {
                                Icon(imageVector = Icons.AutoMirrored.Filled.Chat, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("WhatsApp", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }

                    if (booking.clientEmail.isNotBlank()) {
                        OutlinedButton(
                            onClick = { sendEmail(context, booking.clientEmail) },
                            shape = DinayaRadiusButton,
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                        ) {
                            Icon(imageVector = Icons.Filled.Email, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Email", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }

            // Appointment Info
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                DetailRow(label = "Service", value = booking.serviceName)
                DetailRow(label = "Staff", value = booking.staffName.ifBlank { "Assigned staff" })
                DetailRow(label = "Time", value = formatDateTime(booking.startsAt))
                if (booking.endsAt.isNotBlank()) {
                    DetailRow(label = "Ends at", value = formatDateTime(booking.endsAt))
                }
                if (booking.amountLkr != null && booking.amountLkr > 0) {
                    DetailRow(
                        label = "Amount",
                        value = formatLkr(booking.amountLkr),
                        extra = booking.paymentStatus?.let { { StatusPill(it, dark) } },
                    )
                }
                if (!booking.source.isNullOrBlank()) {
                    DetailRow(label = "Source", value = booking.source.replaceFirstChar { it.uppercase() })
                }
            }

            val canReschedule = when (booking.status.lowercase()) {
                "cancelled", "completed", "no_show" -> false
                else -> true
            }
            if (canReschedule) {
                OutlinedButton(
                    onClick = {
                        onDismiss()
                        onReschedule(booking)
                    },
                    shape = DinayaRadiusButton,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .semantics { contentDescription = "Reschedule this booking" },
                ) {
                    Text("Reschedule", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                }
            } else {
                Text(
                    text = "This booking can no longer be moved.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.6f))

            // Native status editor (destructive choices confirm upstream).
            Text(
                text = "UPDATE STATUS",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            BookingStatusChips(
                currentStatus = booking.status,
                dark = dark,
                onRequestStatus = { nextStatus ->
                    onDismiss()
                    onRequestStatus(booking.id, nextStatus)
                },
            )

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

// ——— Client Detail Sheet ——————————————————————————————————————————————————
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun ClientDetailSheet(
    client: ModuleItem,
    dark: Boolean,
    onDismiss: () -> Unit,
    onOpenWeb: () -> Unit,
) {
    val context = LocalContext.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = DinayaRadiusSheet,
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = MaterialTheme.colorScheme.onSurface,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                Box(
                    modifier = Modifier
                        .size(width = 40.dp, height = 4.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)),
                )
            }

            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                ClientInitials(name = client.title)
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = client.title,
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    client.subtitle?.let {
                        Text(
                            text = it,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                client.status?.let { StatusPill(it, dark) }
            }

            val phoneCandidate = client.subtitle?.split("·")?.firstOrNull()?.trim().orEmpty()
            if (phoneCandidate.contains(Regex("[0-9]"))) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    OutlinedButton(
                        onClick = { dialPhoneNumber(context, phoneCandidate) },
                        shape = DinayaRadiusButton,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                        modifier = Modifier.weight(1f).height(44.dp),
                    ) {
                        Icon(imageVector = Icons.Filled.Phone, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Call", style = MaterialTheme.typography.labelLarge)
                    }

                    OutlinedButton(
                        onClick = { openWhatsApp(context, phoneCandidate) },
                        shape = DinayaRadiusButton,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                        modifier = Modifier.weight(1f).height(44.dp),
                    ) {
                        Icon(imageVector = Icons.AutoMirrored.Filled.Chat, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("WhatsApp", style = MaterialTheme.typography.labelLarge)
                    }
                }
            }

            TextButton(
                onClick = onOpenWeb,
                colors = ButtonDefaults.textButtonColors(
                    contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .semantics { contentDescription = "Open client in browser" },
            ) {
                Text("Open in browser", style = MaterialTheme.typography.bodySmall)
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

// ——— Booking Card —————————————————————————————————————————————————————————
@Composable
internal fun BookingCard(
    booking: BookingSummary,
    businessName: String,
    dark: Boolean,
    onClick: () -> Unit,
    onRequestStatus: (String, String) -> Unit,
) {
    val context = LocalContext.current
    val leftStripeColor = statusLeftBorderColor(booking.status)

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = DinayaRadiusCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier
            .fillMaxWidth()
            .drawBehind {
                val strokeWidth = 3.5.dp.toPx()
                drawLine(
                    color = leftStripeColor,
                    start = androidx.compose.ui.geometry.Offset(strokeWidth / 2, 8.dp.toPx()),
                    end = androidx.compose.ui.geometry.Offset(strokeWidth / 2, size.height - 8.dp.toPx()),
                    strokeWidth = strokeWidth,
                    cap = androidx.compose.ui.graphics.StrokeCap.Round,
                )
            }
            .bounceClick(onClick = onClick),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    ClientInitials(name = booking.clientName)
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = booking.clientName.ifBlank { "Walk-in client" },
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            text = booking.serviceName,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
                StatusPill(booking.status, dark)
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "${formatDateTime(booking.startsAt)} · ${booking.staffName.ifBlank { "Staff" }}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                if (booking.amountLkr != null && booking.amountLkr > 0) {
                    Text(
                        text = formatLkr(booking.amountLkr),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (booking.clientPhone.isNotBlank()) {
                    OutlinedButton(
                        onClick = {
                            val reminder = buildBookingReminder(
                                clientName = booking.clientName.ifBlank { "Client" },
                                serviceName = booking.serviceName,
                                startsAt = booking.startsAt,
                                businessName = businessName,
                            )
                            openWhatsApp(context, booking.clientPhone, reminder)
                        },
                        shape = DinayaRadiusButton,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = MaterialTheme.colorScheme.primary,
                        ),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                        modifier = Modifier.height(48.dp),
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.Chat,
                            contentDescription = "WhatsApp reminder",
                            modifier = Modifier.size(14.dp),
                        )
                        Spacer(modifier = Modifier.width(3.dp))
                        Text(
                            text = "WhatsApp",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Medium,
                            maxLines = 1,
                            softWrap = false,
                        )
                    }
                }

                Box(modifier = Modifier.weight(1f)) {
                    BookingActions(
                        status = booking.status,
                        onStatus = { nextStatus -> onRequestStatus(booking.id, nextStatus) },
                        showAll = false,
                    )
                }
            }
        }
    }
}

// ——— Client Row Card ——————————————————————————————————————————————————————
@Composable
internal fun ClientRowCard(
    item: ModuleItem,
    dark: Boolean,
    onClick: () -> Unit,
) {
    val context = LocalContext.current
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = DinayaRadiusCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            ClientInitials(name = item.title)
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = item.title,
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    item.status?.let {
                        Spacer(modifier = Modifier.width(8.dp))
                        StatusPill(it, dark)
                    }
                }
                item.subtitle?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }

            val phoneCandidate = item.subtitle?.split("·")?.firstOrNull()?.trim().orEmpty()
            if (phoneCandidate.contains(Regex("[0-9]"))) {
                IconButton(
                    onClick = { dialPhoneNumber(context, phoneCandidate) },
                    modifier = Modifier.size(36.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.Phone,
                        contentDescription = "Call",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }
    }
}

// ——— Booking Share Card ———————————————————————————————————————————————————
@Composable
internal fun BookingShareCard(
    bookingUrl: String,
    displayUrl: String,
    businessName: String,
) {
    val context = LocalContext.current
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = DinayaRadiusCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    imageVector = Icons.Filled.Share,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(18.dp),
                )
                Text(
                    text = "Your public booking page",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(DinayaRadiusButton)
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                    .border(BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)), DinayaRadiusButton)
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            ) {
                Text(
                    text = displayUrl,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.primary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedButton(
                    onClick = { copyToClipboard(context, bookingUrl, "Dinaya Booking Link") },
                    shape = DinayaRadiusButton,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp),
                    modifier = Modifier.weight(1f).height(48.dp),
                ) {
                    Icon(imageVector = Icons.Filled.ContentCopy, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(3.dp))
                    Text("Copy", style = MaterialTheme.typography.labelSmall, maxLines = 1, softWrap = false)
                }

                OutlinedButton(
                    onClick = {
                        val shareMessage = "Book $businessName online — pick a time here: $bookingUrl"
                        openWhatsApp(context, "", shareMessage)
                    },
                    shape = DinayaRadiusButton,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp),
                    modifier = Modifier.weight(1f).height(48.dp),
                ) {
                    Icon(imageVector = Icons.AutoMirrored.Filled.Chat, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(3.dp))
                    Text("WhatsApp", style = MaterialTheme.typography.labelSmall, maxLines = 1, softWrap = false)
                }

                OutlinedButton(
                    onClick = {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(bookingUrl))
                        context.startActivity(intent)
                    },
                    shape = DinayaRadiusButton,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp),
                    modifier = Modifier.weight(1f).height(48.dp),
                ) {
                    Icon(imageVector = Icons.Filled.OpenInBrowser, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(3.dp))
                    Text("Preview", style = MaterialTheme.typography.labelSmall, maxLines = 1, softWrap = false)
                }
            }
        }
    }
}

// ——— Overview Stats Grid ——————————————————————————————————————————————————
@Composable
internal fun OverviewStatsGrid(stats: List<lk.dinaya.mobile.data.OverviewStat>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        stats.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { stat ->
                    SiteStatCard(
                        label = stat.label.uppercase(),
                        value = stat.value,
                        delta = stat.delta,
                        modifier = Modifier.weight(1f),
                    )
                }
                if (row.size == 1) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

// ——— More Sheet Content ———————————————————————————————————————————————————
@Composable
internal fun MoreSheetContent(
    activeKey: String,
    userEmail: String,
    plan: String,
    businessSlug: String,
    themePreference: ThemePreference,
    onSelect: (String) -> Unit,
    onSetTheme: (ThemePreference) -> Unit,
    onHelp: () -> Unit,
    onSignOutRequest: () -> Unit,
) {
    val context = LocalContext.current
    val haptic = LocalHapticFeedback.current
    val bookingUrl = if (businessSlug.isNotBlank()) "https://dinaya.lk/book/$businessSlug" else "https://dinaya.lk"

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Pull affordance — drag handle with a11y label.
        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Box(
                modifier = Modifier
                    .size(width = 40.dp, height = 4.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f))
                    .semantics { contentDescription = "Drag handle — swipe down to dismiss" },
            )
        }

        Text(
            text = "More",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.semantics { contentDescription = "More workspace sections" },
        )

        MobileDashboardGroup.entries.forEach { group ->
            val items = mobileDashboardSections.filter { it.group == group && sectionKeyForMore(it.key) }
            if (items.isEmpty()) return@forEach

            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = group.label.uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 4.dp),
                )
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)),
                    shape = DinayaRadiusCard,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
                    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                ) {
                    Column {
                        items.forEachIndexed { index, section ->
                            val active = section.key == activeKey
                            if (index > 0) {
                                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
                            }
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                        onSelect(section.key)
                                    }
                                    .padding(horizontal = 14.dp, vertical = 12.dp)
                                    .semantics { contentDescription = "Open ${section.label} workspace" },
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(DinayaRadiusButton)
                                        .background(
                                            if (active) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
                                            else MaterialTheme.colorScheme.surface,
                                        ),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(
                                        imageVector = sectionIcon(section.key),
                                        contentDescription = "${section.label} icon",
                                        tint = if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.size(20.dp),
                                    )
                                }
                                Text(
                                    text = section.label,
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                                    fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
                                    modifier = Modifier.weight(1f),
                                )
                                if (active) {
                                    Box(
                                        modifier = Modifier
                                            .size(6.dp)
                                            .clip(CircleShape)
                                            .background(MaterialTheme.colorScheme.primary),
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Appearance / Theme Section
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                text = "APPEARANCE",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 4.dp),
            )
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)),
                shape = DinayaRadiusCard,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    listOf(
                        ThemePreference.SYSTEM to "System",
                        ThemePreference.LIGHT to "Light",
                        ThemePreference.DARK to "Dark",
                    ).forEach { (theme, label) ->
                        val active = themePreference == theme
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(DinayaRadiusPill)
                                .background(
                                    if (active) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.surface,
                                )
                                .border(
                                    BorderStroke(
                                        1.dp,
                                        if (active) MaterialTheme.colorScheme.primary
                                        else MaterialTheme.colorScheme.outline,
                                    ),
                                    DinayaRadiusPill,
                                )
                                .clickable {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    onSetTheme(theme)
                                }
                                .padding(vertical = 8.dp)
                                .semantics { contentDescription = "Set $label theme" },
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = label,
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
                                color = if (active) MaterialTheme.colorScheme.onPrimary
                                else MaterialTheme.colorScheme.onSurface,
                            )
                        }
                    }
                }
            }
        }

        // Account Section
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                text = "ACCOUNT",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 4.dp),
            )
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)),
                shape = DinayaRadiusCard,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
            ) {
                Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp)) {
                    Text(
                        text = userEmail,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = "${plan.ifBlank { "Mobile" }.replaceFirstChar { it.uppercase() }} Plan",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            copyToClipboard(context, bookingUrl)
                        }
                        .padding(horizontal = 14.dp, vertical = 12.dp)
                        .semantics { contentDescription = "Copy booking page link" },
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(imageVector = Icons.Filled.ContentCopy, contentDescription = "Copy booking page link icon", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                    Text(text = "Copy booking page link", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            onHelp()
                        }
                        .padding(horizontal = 14.dp, vertical = 12.dp)
                        .semantics { contentDescription = "Open help and docs" },
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(imageVector = Icons.Filled.Assessment, contentDescription = "Help and docs icon", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                    Text(text = "Help & docs", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onSignOutRequest()
                        }
                        .padding(horizontal = 14.dp, vertical = 12.dp)
                        .semantics { contentDescription = "Sign out of Dinaya" },
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(imageVector = Icons.AutoMirrored.Filled.Logout, contentDescription = "Sign out icon", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(20.dp))
                    Text(text = "Sign out", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}

// ——— Sign Out Dialog ——————————————————————————————————————————————————————
@Composable
internal fun SignOutDialog(onConfirm: () -> Unit, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Sign out?", style = MaterialTheme.typography.titleLarge) },
        text = { Text("You'll need to sign in again to manage bookings on this device.", style = MaterialTheme.typography.bodyMedium) },
        confirmButton = {
            Button(
                onClick = onConfirm,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                shape = DinayaRadiusButton,
            ) {
                Text("Sign out", color = MaterialTheme.colorScheme.onError)
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss, shape = DinayaRadiusButton) {
                Text("Cancel")
            }
        },
    )
}

// ——— Detail Row ———————————————————————————————————————————————————————————
@Composable
internal fun DetailRow(
    label: String,
    value: String,
    extra: (@Composable () -> Unit)? = null,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text = label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(text = value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
            extra?.invoke()
        }
    }
}

// ——— Bottom Bar ———————————————————————————————————————————————————————————
@Composable
internal fun DinayaBottomBar(
    activeKey: String,
    moreActive: Boolean,
    onSelect: (String) -> Unit,
    onOpenMore: () -> Unit,
) {
    Surface(
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.8f)),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding(),
        ) {
            BottomPrimary.forEach { tab ->
                val active = tab.routeKey == activeKey
                BottomTabCell(
                    label = tab.label,
                    icon = tab.icon,
                    active = active,
                    onClick = { onSelect(tab.routeKey) },
                    modifier = Modifier.weight(1f),
                )
            }
            val moreSelected = activeKey == "__more__" || moreActive
            BottomTabCell(
                label = "More",
                icon = Icons.Filled.MoreHoriz,
                active = moreSelected,
                onClick = onOpenMore,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
internal fun BottomTabCell(
    label: String,
    icon: ImageVector,
    active: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val haptic = LocalHapticFeedback.current
    val content = if (active) MaterialTheme.colorScheme.primary
    else MaterialTheme.colorScheme.onSurfaceVariant
    val iconScale by animateFloatAsState(
        targetValue = if (active) 1.15f else 1.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMediumLow,
        ),
        label = "tabIconScale",
    )

    Column(
        modifier = modifier
            .heightIn(min = 48.dp)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
            ) {
                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                onClick()
            }
            .padding(vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Box(
            modifier = Modifier
                .width(32.dp)
                .height(2.dp)
                .clip(CircleShape)
                .background(if (active) MaterialTheme.colorScheme.primary else Color.Transparent),
        )
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = content,
            modifier = Modifier
                .size(22.dp)
                .graphicsLayer {
                    scaleX = iconScale
                    scaleY = iconScale
                },
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
            color = content,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

// ——— Generic Module Workspace —————————————————————————————————————————————
@Composable
internal fun ModuleWorkspace(
    section: MobileDashboardSection,
    moduleState: ModuleContentState?,
    dark: Boolean,
    searchQuery: String,
    onRefresh: () -> Unit,
    onOpenWeb: () -> Unit,
) {
    val payload = moduleState?.payload

    if (moduleState?.errorMessage != null) {
        ErrorText(moduleState.errorMessage)
    }

    if (moduleState?.isLoading == true && payload == null) {
        LoadingPanel()
        return
    }

    if (payload == null) {
        SiteEmptyState(
            title = "Open ${section.label}",
            body = "Tap refresh to load the ${section.label.lowercase()} workspace.",
        )
        return
    }

    if (payload.metrics.isNotEmpty()) {
        ModuleMetricsGrid(payload.metrics)
    }

    val items = payload.items.filter {
        searchQuery.isBlank() ||
            it.title.contains(searchQuery, ignoreCase = true) ||
            (it.subtitle?.contains(searchQuery, ignoreCase = true) == true)
    }
    if (items.isEmpty()) {
        SiteEmptyState(
            title = payload.emptyState,
            body = if (searchQuery.isNotBlank()) "No results for \"$searchQuery\"."
            else "Pull to refresh. PayHere, OAuth, and billing still open in the browser.",
        )
    } else {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items.forEach { item ->
                ModuleItemCard(item, dark)
            }
        }
    }

    if (payload.refreshedAt.isNotBlank()) {
        Text(
            text = "Refreshed ${payload.refreshedAt.take(16).replace("T", " ")}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
internal fun WorkspaceHeader(
    title: String,
    summary: String,
    onRefresh: () -> Unit,
    onOpenWeb: () -> Unit,
    isLoading: Boolean,
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = DinayaRadiusSection,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = summary,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = onRefresh,
                    enabled = !isLoading,
                    shape = DinayaRadiusButton,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = MaterialTheme.colorScheme.primary,
                    ),
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp),
                ) {
                    Text("Refresh", fontWeight = FontWeight.SemiBold, maxLines = 1)
                }
                OutlinedButton(
                    onClick = onOpenWeb,
                    shape = DinayaRadiusButton,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = MaterialTheme.colorScheme.onSurface,
                    ),
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp),
                ) {
                    Text("Open web", fontWeight = FontWeight.SemiBold, maxLines = 1)
                }
            }
        }
    }
}

@Composable
internal fun ModuleMetricsGrid(metrics: List<ModuleMetric>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        metrics.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { metric ->
                    SiteStatCard(
                        label = metric.label.uppercase(),
                        value = metric.value,
                        delta = metric.detail,
                        modifier = Modifier.weight(1f),
                    )
                }
                if (row.size == 1) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
internal fun ModuleItemCard(item: ModuleItem, dark: Boolean) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = DinayaRadiusCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.Top,
        ) {
            ClientInitials(name = item.title)
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(5.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top,
                ) {
                    Text(
                        text = item.title.ifBlank { "Untitled" },
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    item.status?.takeIf { it.isNotBlank() }?.let {
                        Spacer(modifier = Modifier.width(8.dp))
                        StatusPill(it, dark)
                    }
                }
                item.subtitle?.takeIf { it.isNotBlank() }?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                item.meta?.takeIf { it.isNotBlank() }?.let {
                    Text(
                        text = it.take(16).replace("T", " "),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}

@Composable
internal fun LoadingPanel() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(28.dp),
        contentAlignment = Alignment.Center,
    ) {
        CircularProgressIndicator(
            modifier = Modifier.size(30.dp),
            color = MaterialTheme.colorScheme.primary,
            strokeWidth = 3.dp,
        )
    }
}

// ——— StatCard —————————————————————————————————————————————————————————————
@Composable
internal fun SiteStatCard(
    label: String,
    value: String,
    delta: String? = null,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = DinayaRadiusCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            delta?.takeIf { it.isNotBlank() }?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

// ——— Helpers ——————————————————————————————————————————————————————————————
@Composable
internal fun ClientInitials(name: String) {
    val initials = name.trim()
        .split(" ")
        .filter { it.isNotBlank() }
        .take(2)
        .joinToString("") { it.first().uppercase() }
        .ifBlank { "D" }

    Box(
        modifier = Modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.primaryContainer),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = initials,
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onPrimaryContainer,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
internal fun BookingActions(
    status: String,
    onStatus: (String) -> Unit,
    showAll: Boolean = false,
) {
    val actions = when (status.lowercase()) {
        "pending" -> listOf("confirmed" to "Confirm", "cancelled" to "Cancel")
        "confirmed" -> if (showAll) {
            listOf("completed" to "Complete", "no_show" to "No-show", "cancelled" to "Cancel")
        } else {
            listOf("completed" to "Complete", "cancelled" to "Cancel")
        }
        else -> emptyList()
    }
    if (actions.isEmpty()) return

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        actions.forEach { (nextStatus, label) ->
            val isDestructive = nextStatus == "cancelled" || nextStatus == "no_show"
            val isPrimary = nextStatus == "confirmed" || nextStatus == "completed"
            OutlinedButton(
                onClick = { onStatus(nextStatus) },
                shape = DinayaRadiusButton,
                border = BorderStroke(
                    1.dp,
                    if (isDestructive) MaterialTheme.colorScheme.error.copy(alpha = 0.5f)
                    else if (isPrimary) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.outline,
                ),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = if (isDestructive) MaterialTheme.colorScheme.error
                    else if (isPrimary) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.onSurface,
                ),
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp),
            ) {
                if (isPrimary) {
                    Icon(imageVector = Icons.Filled.Check, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(3.dp))
                }
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    softWrap = false,
                )
            }
        }
    }
}

@Composable
internal fun StatusPill(status: String, dark: Boolean) {
    val style = statusStyle(status, dark)
    Box(
        modifier = Modifier
            .clip(DinayaRadiusPill)
            .background(style.background)
            .border(BorderStroke(1.dp, style.border), DinayaRadiusPill)
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(
            text = status.replace("_", " ").replaceFirstChar { it.uppercase() },
            style = MaterialTheme.typography.bodySmall,
            color = style.text,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
        )
    }
}

@Composable
internal fun SiteEmptyState(title: String, body: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .dashedBorder(
                color = MaterialTheme.colorScheme.outline,
                shapeRadius = 16.dp,
            )
            .background(MaterialTheme.colorScheme.surface, DinayaRadiusCard)
            .padding(horizontal = 24.dp, vertical = 36.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
            )
            Text(
                text = body,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
        }
    }
}

internal fun Modifier.dashedBorder(color: Color, shapeRadius: Dp): Modifier =
    this.drawBehind {
        val stroke = Stroke(
            width = 2.dp.toPx(),
            pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 8f), 0f),
        )
        drawRoundRect(
            color = color,
            style = stroke,
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(shapeRadius.toPx()),
        )
    }

@Composable
internal fun ErrorBanner(
    message: String?,
    onDismiss: (() -> Unit)? = null,
) {
    if (message.isNullOrBlank()) return
    Surface(
        color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.95f),
        shape = DinayaRadiusCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.4f)),
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Filled.Warning,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.error,
                modifier = Modifier.size(18.dp),
            )
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                text = message,
                color = MaterialTheme.colorScheme.onErrorContainer,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.weight(1f),
            )
            if (onDismiss != null) {
                Spacer(modifier = Modifier.width(6.dp))
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier.size(24.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.Close,
                        contentDescription = "Dismiss",
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
        }
    }
}

@Composable
internal fun ErrorText(message: String?) {
    ErrorBanner(message = message, onDismiss = null)
}

@Composable
internal fun ActionBanner(
    message: String?,
    onDismiss: (() -> Unit)? = null,
) {
    if (message.isNullOrBlank()) return
    Surface(
        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
        shape = DinayaRadiusCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.35f)),
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Filled.Check,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(18.dp),
            )
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                text = message,
                color = MaterialTheme.colorScheme.onSurface,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.weight(1f),
            )
            if (onDismiss != null) {
                Spacer(modifier = Modifier.width(6.dp))
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier.size(24.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.Close,
                        contentDescription = "Dismiss confirmation",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
        }
    }
}

@Composable
internal fun AuthField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    isPassword: Boolean = false,
    shape: RoundedCornerShape = RoundedCornerShape(12.dp),
    labelAccessory: (@Composable () -> Unit)? = null,
) {
    var passwordVisible by remember { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onBackground,
            )
            labelAccessory?.invoke()
        }
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = { Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)) },
            singleLine = true,
            visualTransformation = if (isPassword && !passwordVisible) PasswordVisualTransformation() else VisualTransformation.None,
            trailingIcon = if (isPassword) {
                {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            imageVector = if (passwordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                            contentDescription = if (passwordVisible) "Hide password" else "Show password",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                }
            } else null,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            shape = shape,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                focusedContainerColor = MaterialTheme.colorScheme.surface,
                unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                cursorColor = MaterialTheme.colorScheme.primary,
            ),
            textStyle = MaterialTheme.typography.bodyMedium.copy(
                color = MaterialTheme.colorScheme.onBackground,
            ),
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
        )
    }
}

@Composable
internal fun BrandLockup(
    modifier: Modifier = Modifier,
    subtitle: String? = null,
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                painter = painterResource(id = R.drawable.ic_dinaya_mark),
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.size(22.dp),
            )
            val brandText = buildAnnotatedString {
                withStyle(
                    SpanStyle(
                        color = MaterialTheme.colorScheme.onBackground,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = (-0.4).sp,
                    ),
                ) {
                    append("Dinaya")
                }
                withStyle(
                    SpanStyle(
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold,
                    ),
                ) {
                    append(".lk")
                }
            }
            Text(
                text = brandText,
                style = MaterialTheme.typography.titleLarge,
                maxLines = 1,
            )
        }
        subtitle?.takeIf { it.isNotBlank() }?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
internal fun BookingConfirmStatusDialog(
    status: String,
    cancelReason: String,
    onReasonChange: (String) -> Unit,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    val isCancel = status.lowercase() == "cancelled"
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = if (isCancel) "Cancel this booking?" else "Mark as no-show?",
                style = MaterialTheme.typography.titleLarge,
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = if (isCancel) {
                        "The client will no longer have this appointment. You can still view it under Cancelled."
                    } else {
                        "This records that the client did not attend. The booking stays in your history."
                    },
                    style = MaterialTheme.typography.bodyMedium,
                )
                if (isCancel) {
                    OutlinedTextField(
                        value = cancelReason,
                        onValueChange = onReasonChange,
                        placeholder = { Text("Reason (optional)") },
                        singleLine = true,
                        shape = DinayaRadiusButton,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = MaterialTheme.colorScheme.primary,
                            unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                            cursorColor = MaterialTheme.colorScheme.primary,
                        ),
                        textStyle = MaterialTheme.typography.bodyMedium.copy(
                            color = MaterialTheme.colorScheme.onSurface,
                        ),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isCancel) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
                ),
                shape = DinayaRadiusButton,
            ) {
                Text(
                    text = if (isCancel) "Cancel booking" else "Mark no-show",
                    color = if (isCancel) MaterialTheme.colorScheme.onError else MaterialTheme.colorScheme.onPrimary,
                )
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss, shape = DinayaRadiusButton) {
                Text("Keep booking")
            }
        },
    )
}

// ——— Android Intent Helpers ——————————————————————————————————————————————
internal fun openWebFallback(context: Context, session: StoredSession?, path: String) {
    val base = session?.baseUrl?.trim()?.trimEnd('/').orEmpty().ifBlank { "https://dinaya-lk.vercel.app" }
    val normalizedPath = if (path.startsWith("/")) path else "/$path"
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("$base$normalizedPath"))
    context.startActivity(intent)
}

internal fun dialPhoneNumber(context: Context, phone: String) {
    if (phone.isBlank()) return
    val cleaned = phone.replace(Regex("[^0-9+]"), "")
    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$cleaned"))
    context.startActivity(intent)
}

internal fun openWhatsApp(context: Context, phone: String, message: String? = null) {
    val cleaned = cleanPhoneForWhatsApp(phone)
    val uri = if (cleaned.isNotBlank()) {
        if (!message.isNullOrBlank()) {
            Uri.parse("https://wa.me/$cleaned?text=${Uri.encode(message)}")
        } else {
            Uri.parse("https://wa.me/$cleaned")
        }
    } else if (!message.isNullOrBlank()) {
        Uri.parse("https://api.whatsapp.com/send?text=${Uri.encode(message)}")
    } else {
        return
    }
    val intent = Intent(Intent.ACTION_VIEW, uri)
    context.startActivity(intent)
}

internal fun cleanPhoneForWhatsApp(raw: String): String {
    val digits = raw.replace(Regex("[^0-9]"), "")
    return when {
        digits.startsWith("0") && digits.length == 10 -> "94" + digits.substring(1)
        !digits.startsWith("94") && digits.length == 9 -> "94$digits"
        else -> digits
    }
}

internal fun sendEmail(context: Context, email: String) {
    if (email.isBlank()) return
    val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:$email"))
    context.startActivity(intent)
}

internal fun copyToClipboard(context: Context, text: String, label: String = "Dinaya") {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? android.content.ClipboardManager
    val clip = android.content.ClipData.newPlainText(label, text)
    clipboard?.setPrimaryClip(clip)
    Toast.makeText(context, "Copied link to clipboard", Toast.LENGTH_SHORT).show()
}

internal fun formatDateTime(iso: String): String {
    return runCatching {
        val zone = ZoneId.of("Asia/Colombo")
        val dt = Instant.parse(iso).atZone(zone)
        dt.format(DateTimeFormatter.ofPattern("EEE, MMM d · h:mm a"))
    }.getOrDefault(iso.take(16).replace("T", " "))
}

internal fun formatDateHeader(isoOrDate: String): String {
    return runCatching {
        if (isoOrDate.contains("T")) {
            val zone = ZoneId.of("Asia/Colombo")
            val dt = Instant.parse(isoOrDate).atZone(zone)
            dt.format(DateTimeFormatter.ofPattern("EEE, MMM d"))
        } else {
            val ld = LocalDate.parse(isoOrDate)
            ld.format(DateTimeFormatter.ofPattern("EEE, MMM d"))
        }
    }.getOrDefault(isoOrDate)
}

internal fun formatLkr(amount: Int?): String {
    if (amount == null) return ""
    return "Rs. " + String.format(Locale.US, "%,d", amount)
}

internal fun buildBookingReminder(
    clientName: String,
    serviceName: String,
    startsAt: String,
    businessName: String?,
): String {
    val bName = if (!businessName.isNullOrBlank()) " at $businessName" else ""
    val formattedTime = formatDateTime(startsAt)
    return "Hi $clientName, reminder: your $serviceName appointment$bName is on $formattedTime. Reply here if you need to reschedule."
}

internal fun formatRelativeAge(iso: String): String {
    return runCatching {
        val instant = Instant.parse(iso)
        val now = Instant.now()
        val minutes = java.time.Duration.between(instant, now).toMinutes()
        when {
            minutes < 1 -> "Just now"
            minutes < 60 -> "${minutes}m ago"
            minutes < 1440 -> "${minutes / 60}h ago"
            minutes < 10080 -> "${minutes / 1440}d ago"
            else -> "${minutes / 10080}w ago"
        }
    }.getOrDefault(iso.take(10))
}
