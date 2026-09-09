package lk.dinaya.mobile.ui

import android.app.Application
import android.os.Build
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import lk.dinaya.mobile.BuildConfig
import lk.dinaya.mobile.data.AndroidKeystoreTokenStore
import lk.dinaya.mobile.data.AvailabilityMember
import lk.dinaya.mobile.data.AvailabilityWindow
import lk.dinaya.mobile.data.BookingSummary
import lk.dinaya.mobile.data.BootstrapResult
import lk.dinaya.mobile.data.ClientDetailPayload
import lk.dinaya.mobile.data.CreateBookingRequest
import lk.dinaya.mobile.data.DinayaApiClient
import lk.dinaya.mobile.data.DesktopModulePayload
import lk.dinaya.mobile.data.MobileCache
import lk.dinaya.mobile.data.ModuleItem
import lk.dinaya.mobile.data.StoredSession
import lk.dinaya.mobile.data.combineDateTimeToIso

import android.content.Context
import lk.dinaya.mobile.data.CalendarPayload
import lk.dinaya.mobile.data.OverviewPayload
import lk.dinaya.mobile.data.ThemePreference
import org.json.JSONObject

data class ModuleContentState(
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val payload: DesktopModulePayload? = null,
)

// ——— Catalog workspace form state ————————————————————————————————————————
data class ServiceFormState(
    val id: String? = null,
    val name: String = "",
    val priceLkr: String = "",
    val durationMinutes: String = "",
    val description: String = "",
    val isActive: Boolean = true,
    val formError: String? = null,
)

data class StaffFormState(
    val id: String? = null,
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val isActive: Boolean = true,
    val formError: String? = null,
)

data class LocationFormState(
    val id: String? = null,
    val name: String = "",
    val address: String = "",
    val timezone: String = "Asia/Colombo",
    val isDefault: Boolean = false,
    val formError: String? = null,
)

/** Light phone check: allow +, spaces, dashes — require 7+ digits. */
internal fun isValidPhoneLight(phone: String): Boolean {
    if (phone.isBlank()) return true
    return phone.count { it.isDigit() } >= 7
}

internal fun validateServiceForm(form: ServiceFormState): String? {
    if (form.name.isBlank()) return "Service name is required."
    val price = form.priceLkr.trim()
    if (price.isNotEmpty()) {
        val parsed = price.replace(",", "").toDoubleOrNull()
        if (parsed == null || parsed < 0) return "Price must be 0 or more."
    }
    val duration = form.durationMinutes.trim()
    if (duration.isNotEmpty()) {
        val parsed = duration.toIntOrNull()
        if (parsed == null || parsed <= 0) return "Duration must be a positive number of minutes."
    }
    if (form.description.length > 500) return "Description is too long (max 500 characters)."
    return null
}

internal fun validateStaffForm(form: StaffFormState): String? {
    if (form.name.isBlank()) return "Staff name is required."
    if (form.email.isNotBlank() && !form.email.contains("@")) return "Enter a valid email or leave it blank."
    if (!isValidPhoneLight(form.phone)) return "Enter a valid phone number or leave it blank."
    return null
}

internal fun validateLocationForm(form: LocationFormState): String? {
    if (form.name.isBlank()) return "Location name is required."
    if (form.timezone.isBlank()) return "Timezone is required."
    return null
}

data class DinayaUiState(
    val baseUrl: String = if (BuildConfig.DEBUG) "http://127.0.0.1:3002" else BuildConfig.DINAYA_API_BASE_URL,
    val email: String = "",
    val password: String = "",
    val deviceName: String = defaultDeviceName(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val actionMessage: String? = null,
    val session: StoredSession? = null,
    val bootstrap: BootstrapResult? = null,
    val overviewData: OverviewPayload? = null,
    val calendarData: CalendarPayload? = null,
    val calendarView: String = "day",
    val calendarDate: String? = null,
    val calendarStaffId: String? = null,
    val bookingsTab: String = "today",
    val bookings: List<BookingSummary> = emptyList(),
    val selectedBooking: BookingSummary? = null,
    // ——— Native bookings workspace: server search + status filter ———
    val bookingsQuery: String = "",
    val bookingsStatus: String = "all",
    // ——— Native create-booking flow draft (single source of truth) ———
    val showNewBookingSheet: Boolean = false,
    val isCreatingBooking: Boolean = false,
    val createBookingError: String? = null,
    val draftClientName: String = "",
    val draftClientPhone: String = "",
    val draftClientEmail: String = "",
    val draftServiceId: String = "",
    val draftServiceName: String = "",
    val draftStaffId: String? = null,
    val draftDate: String = "",
    val draftTime: String = "",
    val draftNotes: String = "",
    val cancelReason: String = "",
    val themePreference: ThemePreference = ThemePreference.SYSTEM,
    val lastSyncedAt: String? = null,
    val selectedSectionKey: String = "overview",
    val moduleContent: Map<String, ModuleContentState> = emptyMap(),
    // ——— Catalog workspace section state ———
    val selectedClient: ModuleItem? = null,
    val clientDetail: ClientDetailPayload? = null,
    val clientNoteDraft: String = "",
    val serviceForm: ServiceFormState = ServiceFormState(),
    val staffForm: StaffFormState = StaffFormState(),
    val locationForm: LocationFormState = LocationFormState(),
    val availabilityMembers: List<AvailabilityMember> = emptyList(),
    val availabilityEdits: Map<String, List<AvailabilityWindow>> = emptyMap(),
    val catalogBusy: Boolean = false,
    val catalogError: String? = null,
    val catalogNotice: String? = null,
    val broadcastTestSent: Map<String, String> = emptyMap(),
)

class DinayaViewModel(application: Application) : AndroidViewModel(application) {
    private val tokenStore = AndroidKeystoreTokenStore(application)
    private val prefs = application.getSharedPreferences("dinaya_mobile_prefs", Context.MODE_PRIVATE)
    private val mobileCache = MobileCache.fromContext(application)
    private val _uiState = MutableStateFlow(DinayaUiState())
    val uiState: StateFlow<DinayaUiState> = _uiState.asStateFlow()

    private fun newClient(baseUrl: String, cache: MobileCache = mobileCache): DinayaApiClient =
        DinayaApiClient(baseUrl, cache)

    init {
        val savedTheme = prefs.getString("theme_preference", ThemePreference.SYSTEM.name) ?: ThemePreference.SYSTEM.name
        val initialTheme = runCatching { ThemePreference.valueOf(savedTheme) }.getOrDefault(ThemePreference.SYSTEM)
        _uiState.update { it.copy(themePreference = initialTheme) }

        val savedSession = tokenStore.load()
        if (savedSession != null) {
            _uiState.update {
                it.copy(
                    baseUrl = savedSession.baseUrl,
                    session = savedSession,
                )
            }
            refresh()
        }
    }

    fun setThemePreference(pref: ThemePreference) {
        prefs.edit().putString("theme_preference", pref.name).apply()
        _uiState.update { it.copy(themePreference = pref) }
    }

    fun toggleTheme() {
        val next = when (uiState.value.themePreference) {
            ThemePreference.SYSTEM -> ThemePreference.LIGHT
            ThemePreference.LIGHT -> ThemePreference.DARK
            ThemePreference.DARK -> ThemePreference.SYSTEM
        }
        setThemePreference(next)
    }

    fun updateBaseUrl(value: String) {
        _uiState.update { it.copy(baseUrl = value, errorMessage = null) }
    }

    fun updateEmail(value: String) {
        _uiState.update { it.copy(email = value, errorMessage = null) }
    }

    fun updatePassword(value: String) {
        _uiState.update { it.copy(password = value, errorMessage = null) }
    }

    fun updateDeviceName(value: String) {
        _uiState.update { it.copy(deviceName = value, errorMessage = null) }
    }

    fun selectSection(sectionKey: String) {
        val section = dashboardSectionByKey(sectionKey)
        _uiState.update {
            it.copy(
                selectedSectionKey = section.key,
                errorMessage = null,
            )
        }
        when (section.key) {
            "overview" -> refresh()
            "bookings" -> loadBookingsForTab(uiState.value.bookingsTab)
            "calendar" -> loadCalendar()
            else -> {
                if (section.desktopModule != null) {
                    loadSectionModule(section.key, force = false)
                }
                if (section.key == "availability") loadAvailabilityMembers()
            }
        }
    }

    fun selectBookingsTab(tab: String) {
        _uiState.update { it.copy(bookingsTab = tab) }
        loadBookingsForTab(tab)
    }

    fun selectBooking(booking: BookingSummary?) {
        _uiState.update { it.copy(selectedBooking = booking) }
    }

    fun changeCalendarDate(date: String) {
        _uiState.update { it.copy(calendarDate = date) }
        loadCalendar()
    }

    fun changeCalendarView(view: String) {
        _uiState.update { it.copy(calendarView = view) }
        loadCalendar()
    }

    fun changeCalendarStaff(staffId: String?) {
        _uiState.update { it.copy(calendarStaffId = staffId) }
        loadCalendar()
    }

    private fun loadBookingsForTab(tab: String) {
        _uiState.update { it.copy(bookingsTab = tab) }
        loadBookings()
    }

    /** Server-backed bookings load honoring tab + search query + status filter. */
    private fun loadBookings() {
        val session = uiState.value.session ?: return
        val tab = uiState.value.bookingsTab
        val query = uiState.value.bookingsQuery.ifBlank { null }
        val status = uiState.value.bookingsStatus.takeIf { it.isNotBlank() && it.lowercase() != "all" }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            runCatching {
                newClient(session.baseUrl).fetchBookings(session.deviceKey, tab = tab, query = query, status = status)
            }.onSuccess { res ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = null,
                        bookings = res.rows,
                        lastSyncedAt = res.serverTime,
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = error.message ?: "Could not load bookings.")
                }
            }
        }
    }

    /** Local search-box binding; call [searchBookings] to query the server. */
    fun updateBookingsQuery(value: String) {
        _uiState.update { it.copy(bookingsQuery = value) }
    }

    /** Server search wired to `GET /api/v1/desktop/bookings?q=`. */
    fun searchBookings(query: String) {
        _uiState.update { it.copy(bookingsQuery = query) }
        loadBookings()
    }

    /** Server status filter wired to `GET /api/v1/desktop/bookings?status=`. */
    fun filterByStatus(status: String) {
        _uiState.update { it.copy(bookingsStatus = status.ifBlank { "all" }) }
        loadBookings()
    }

    private fun loadCalendar() {
        val session = uiState.value.session ?: return
        val view = uiState.value.calendarView
        val date = uiState.value.calendarDate
        val staffId = uiState.value.calendarStaffId
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            runCatching {
                newClient(session.baseUrl).fetchCalendar(session.deviceKey, view = view, date = date, staffId = staffId)
            }.onSuccess { cal ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = null,
                        calendarData = cal,
                        calendarDate = cal.date,
                        lastSyncedAt = cal.date,
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = error.message ?: "Could not load calendar.")
                }
            }
        }
    }

    fun signIn(
        overrideEmail: String? = null,
        overridePassword: String? = null,
        overrideBaseUrl: String? = null,
    ) {
        val snapshot = uiState.value
        val email = (overrideEmail ?: snapshot.email).trim()
        val password = overridePassword ?: snapshot.password
        val baseUrl = (overrideBaseUrl ?: snapshot.baseUrl).trim()
        val deviceName = snapshot.deviceName.trim().ifBlank { defaultDeviceName() }
        if (email.isBlank() || password.isBlank() || baseUrl.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Email, password, and API URL are required.") }
            return
        }

        _uiState.update {
            it.copy(
                email = email,
                password = password,
                baseUrl = baseUrl,
                isLoading = true,
                errorMessage = null,
            )
        }

        viewModelScope.launch {
            runCatching {
                newClient(baseUrl).login(email, password, deviceName)
            }.onSuccess { login ->
                val session = StoredSession(
                    baseUrl = baseUrl,
                    deviceKey = login.deviceKey,
                    keyId = login.auth.keyId,
                    deviceId = login.auth.deviceId,
                    deviceName = login.auth.deviceName,
                    businessName = login.business.name,
                    userEmail = login.user.email,
                )
                tokenStore.save(session)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        password = "",
                        session = session,
                        bootstrap = null,
                        bookings = emptyList(),
                        bookingsQuery = "",
                        bookingsStatus = "all",
                        showNewBookingSheet = false,
                        isCreatingBooking = false,
                        createBookingError = null,
                        draftClientName = "",
                        draftClientPhone = "",
                        draftClientEmail = "",
                        draftServiceId = "",
                        draftServiceName = "",
                        draftStaffId = null,
                        draftDate = "",
                        draftTime = "",
                        draftNotes = "",
                        cancelReason = "",
                        selectedSectionKey = "overview",
                        moduleContent = emptyMap(),
                        selectedClient = null,
                        clientDetail = null,
                        clientNoteDraft = "",
                        serviceForm = ServiceFormState(),
                        staffForm = StaffFormState(),
                        locationForm = LocationFormState(),
                        availabilityMembers = emptyList(),
                        availabilityEdits = emptyMap(),
                        catalogBusy = false,
                        catalogError = null,
                        catalogNotice = null,
                    )
                }
                refresh()
            }.onFailure { error ->
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = error.message ?: "Sign in failed.")
                }
            }
        }
    }

    fun refresh() {
        val session = uiState.value.session ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            val selectedKey = uiState.value.selectedSectionKey
            runCatching {
                val client = newClient(session.baseUrl)
                val bootstrap = client.fetchBootstrap(session.deviceKey)
                when (selectedKey) {
                    "overview" -> {
                        val overview = runCatching { client.fetchOverview(session.deviceKey) }.getOrNull()
                        val bookings = client.fetchTodayBookings(session.deviceKey)
                        Triple(bootstrap, bookings, overview)
                    }
                    "bookings" -> {
                        val bookings = client.fetchBookings(
                            session.deviceKey,
                            tab = uiState.value.bookingsTab,
                            query = uiState.value.bookingsQuery.ifBlank { null },
                            status = uiState.value.bookingsStatus.takeIf { it.isNotBlank() && it.lowercase() != "all" },
                        )
                        Triple(bootstrap, bookings, null)
                    }
                    "calendar" -> {
                        val cal = client.fetchCalendar(
                            deviceKey = session.deviceKey,
                            view = uiState.value.calendarView,
                            date = uiState.value.calendarDate,
                            staffId = uiState.value.calendarStaffId,
                        )
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                bootstrap = bootstrap,
                                calendarData = cal,
                                calendarDate = cal.date,
                                lastSyncedAt = cal.date,
                            )
                        }
                        return@launch
                    }
                    else -> {
                        val section = dashboardSectionByKey(selectedKey)
                        val module = section.desktopModule?.let { client.fetchDesktopModule(session.deviceKey, it) }
                        _uiState.update {
                            val nextModuleContent = if (module != null) {
                                it.moduleContent + (selectedKey to ModuleContentState(payload = module))
                            } else it.moduleContent
                            it.copy(
                                isLoading = false,
                                errorMessage = null,
                                bootstrap = bootstrap,
                                moduleContent = nextModuleContent,
                                lastSyncedAt = module?.refreshedAt ?: bootstrap.serverTime,
                            )
                        }
                        return@launch
                    }
                }
            }.onSuccess { (bootstrap, bookings, overview) ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = null,
                        bootstrap = bootstrap,
                        bookings = bookings.rows,
                        overviewData = overview ?: it.overviewData,
                        lastSyncedAt = bookings.serverTime.ifBlank { bootstrap.serverTime },
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = error.message ?: "Refresh failed.")
                }
            }
        }
    }

    fun refreshSelectedSection() {
        val section = dashboardSectionByKey(uiState.value.selectedSectionKey)
        when (section.key) {
            "overview" -> refresh()
            "bookings" -> loadBookingsForTab(uiState.value.bookingsTab)
            "calendar" -> loadCalendar()
            else -> {
                if (section.desktopModule != null) {
                    loadSectionModule(section.key, force = true)
                }
            }
        }
    }

    /** Lazily loads the services catalog for the native booking sheet. */
    fun ensureServicesModule() {
        if (uiState.value.moduleContent["services"]?.payload != null) return
        loadSectionModule("services", force = false)
    }

    private fun loadSectionModule(sectionKey: String, force: Boolean) {
        val session = uiState.value.session ?: return
        val section = dashboardSectionByKey(sectionKey)
        val module = section.desktopModule ?: return
        val existing = uiState.value.moduleContent[section.key]
        if (!force && existing?.payload != null) return

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    moduleContent = it.moduleContent + (
                        section.key to ModuleContentState(
                            isLoading = true,
                            payload = existing?.payload,
                        )
                    ),
                )
            }
            runCatching {
                newClient(session.baseUrl).fetchDesktopModule(session.deviceKey, module)
            }.onSuccess { payload ->
                _uiState.update {
                    it.copy(
                        moduleContent = it.moduleContent + (
                            section.key to ModuleContentState(payload = payload)
                        ),
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        moduleContent = it.moduleContent + (
                            section.key to ModuleContentState(
                                errorMessage = error.message ?: "Could not load ${section.label}.",
                                payload = existing?.payload,
                            )
                        ),
                    )
                }
            }
        }
    }

    fun updateBookingStatus(bookingId: String, status: String) {
        val session = uiState.value.session ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            runCatching {
                newClient(session.baseUrl).updateBookingStatus(session.deviceKey, bookingId, status)
            }.onSuccess {
                _uiState.update { state ->
                    val updatedList = state.bookings.map { b ->
                        if (b.id == bookingId) b.copy(status = status) else b
                    }
                    val updatedOverview = state.overviewData?.let { ov ->
                        ov.copy(
                            todayRows = ov.todayRows.map { b ->
                                if (b.id == bookingId) b.copy(status = status) else b
                            },
                            nextRows = ov.nextRows.map { b ->
                                if (b.id == bookingId) b.copy(status = status) else b
                            },
                        )
                    }
                    val updatedCalendar = state.calendarData?.let { cal ->
                        cal.copy(
                            rows = cal.rows.map { b ->
                                if (b.id == bookingId) b.copy(status = status) else b
                            },
                        )
                    }
                    val updatedSelected = if (state.selectedBooking?.id == bookingId) {
                        state.selectedBooking.copy(status = status)
                    } else state.selectedBooking

                    state.copy(
                        bookings = updatedList,
                        overviewData = updatedOverview,
                        calendarData = updatedCalendar,
                        selectedBooking = updatedSelected,
                    )
                }
                refreshSelectedSection()
            }.onFailure { error ->
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = error.message ?: "Status update failed.")
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    // ——— Native create-booking flow —————————————————————————————————————
    fun openNewBookingSheet() {
        val today = runCatching { java.time.LocalDate.now().toString() }.getOrDefault("")
        _uiState.update {
            it.copy(
                showNewBookingSheet = true,
                createBookingError = null,
                errorMessage = null,
                draftDate = it.draftDate.ifBlank { it.calendarDate ?: today },
            )
        }
    }

    fun closeNewBookingSheet() {
        _uiState.update { it.copy(showNewBookingSheet = false, createBookingError = null) }
    }

    fun clearCreateBookingError() {
        _uiState.update { it.copy(createBookingError = null) }
    }

    fun updateDraftClientName(value: String) {
        _uiState.update { it.copy(draftClientName = value, createBookingError = null) }
    }

    fun updateDraftClientPhone(value: String) {
        _uiState.update { it.copy(draftClientPhone = value, createBookingError = null) }
    }

    fun updateDraftClientEmail(value: String) {
        _uiState.update { it.copy(draftClientEmail = value, createBookingError = null) }
    }

    fun updateDraftService(serviceId: String, serviceName: String) {
        _uiState.update { it.copy(draftServiceId = serviceId, draftServiceName = serviceName, createBookingError = null) }
    }

    fun updateDraftStaff(staffId: String?) {
        _uiState.update { it.copy(draftStaffId = staffId) }
    }

    fun updateDraftDate(value: String) {
        _uiState.update { it.copy(draftDate = value, createBookingError = null) }
    }

    fun updateDraftTime(value: String) {
        _uiState.update { it.copy(draftTime = value, createBookingError = null) }
    }

    fun updateDraftNotes(value: String) {
        _uiState.update { it.copy(draftNotes = value) }
    }

    fun setCancelReason(value: String) {
        _uiState.update { it.copy(cancelReason = value) }
    }

    fun createBooking() {
        val session = uiState.value.session ?: return
        val snapshot = uiState.value
        val clientName = snapshot.draftClientName.trim()
        val startsAt = combineDateTimeToIso(snapshot.draftDate, snapshot.draftTime.ifBlank { "09:00" })
        val validationError = when {
            clientName.isBlank() -> "Client name is required."
            snapshot.draftServiceId.isBlank() -> "Choose a service."
            snapshot.draftDate.isBlank() -> "Pick a date (YYYY-MM-DD)."
            startsAt.isBlank() -> "Pick a valid date and time."
            snapshot.draftClientPhone.isNotBlank() && !isValidPhoneLight(snapshot.draftClientPhone) ->
                "Enter a valid phone number or leave it blank."
            snapshot.draftClientEmail.isNotBlank() && !snapshot.draftClientEmail.contains("@") ->
                "Enter a valid email or leave it blank."
            else -> null
        }
        if (validationError != null) {
            _uiState.update { it.copy(createBookingError = validationError) }
            return
        }
        _uiState.update { it.copy(isCreatingBooking = true, createBookingError = null, errorMessage = null) }
        viewModelScope.launch {
            runCatching {
                newClient(session.baseUrl).createBooking(
                    session.deviceKey,
                    CreateBookingRequest(
                        clientName = clientName,
                        clientPhone = snapshot.draftClientPhone.trim(),
                        clientEmail = snapshot.draftClientEmail.trim().ifBlank { null },
                        serviceId = snapshot.draftServiceId,
                        staffId = snapshot.draftStaffId,
                        startsAt = startsAt,
                        notes = snapshot.draftNotes.trim().ifBlank { null },
                    ),
                )
            }.onSuccess { created ->
                _uiState.update {
                    it.copy(
                        isCreatingBooking = false,
                        showNewBookingSheet = false,
                        createBookingError = null,
                        bookings = listOf(created) + it.bookings,
                        draftClientName = "",
                        draftClientPhone = "",
                        draftClientEmail = "",
                        draftServiceId = "",
                        draftServiceName = "",
                        draftStaffId = null,
                        draftTime = "",
                        draftNotes = "",
                        cancelReason = "",
                        actionMessage = "Booking created for $clientName.",
                    )
                }
                refreshSelectedSection()
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isCreatingBooking = false,
                        createBookingError = error.message ?: "Could not create the booking.",
                    )
                }
            }
        }
    }

    /** Cancel with an optional reason; falls back to a plain status update. */
    fun cancelBookingWithReason(bookingId: String, reason: String) {
        val session = uiState.value.session ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            runCatching {
                newClient(session.baseUrl).cancelBooking(
                    session.deviceKey,
                    bookingId,
                    reason.trim().ifBlank { null },
                )
            }.onSuccess { result ->
                applyBookingStatusLocally(bookingId, result.status)
                _uiState.update { it.copy(cancelReason = "", selectedBooking = null) }
                refreshSelectedSection()
            }.onFailure { error ->
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = error.message ?: "Cancel failed.")
                }
            }
        }
    }

    private fun applyBookingStatusLocally(bookingId: String, status: String) {
        _uiState.update { state ->
            val updatedOverview = state.overviewData?.let { ov ->
                ov.copy(
                    todayRows = ov.todayRows.map { b ->
                        if (b.id == bookingId) b.copy(status = status) else b
                    },
                    nextRows = ov.nextRows.map { b ->
                        if (b.id == bookingId) b.copy(status = status) else b
                    },
                )
            }
            val updatedCalendar = state.calendarData?.let { cal ->
                cal.copy(
                    rows = cal.rows.map { b ->
                        if (b.id == bookingId) b.copy(status = status) else b
                    },
                )
            }
            val updatedSelected = if (state.selectedBooking?.id == bookingId) {
                state.selectedBooking.copy(status = status)
            } else state.selectedBooking
            state.copy(
                bookings = state.bookings.map { b ->
                    if (b.id == bookingId) b.copy(status = status) else b
                },
                overviewData = updatedOverview,
                calendarData = updatedCalendar,
                selectedBooking = updatedSelected,
            )
        }
    }

    fun clearCatalogError() {
        _uiState.update { it.copy(catalogError = null, catalogNotice = null) }
    }

    // ——— Catalog: shared mutation helper ————————————————————————————————
    private fun runCatalogMutation(
        errorFallback: String,
        successNotice: String,
        optimistic: ((Map<String, ModuleContentState>) -> Map<String, ModuleContentState>)? = null,
        block: suspend (DinayaApiClient, String) -> Unit,
    ) {
        val session = uiState.value.session ?: return
        if (optimistic != null) {
            _uiState.update { it.copy(moduleContent = optimistic(it.moduleContent)) }
        }
        _uiState.update { it.copy(catalogBusy = true, catalogError = null, catalogNotice = null) }
        viewModelScope.launch {
            runCatching {
                block(newClient(session.baseUrl), session.deviceKey)
            }.onSuccess {
                _uiState.update { it.copy(catalogBusy = false, catalogNotice = successNotice) }
                refreshSelectedSection()
                if (uiState.value.selectedSectionKey == "availability") loadAvailabilityMembers()
            }.onFailure { error ->
                _uiState.update {
                    it.copy(catalogBusy = false, catalogError = error.message ?: errorFallback)
                }
            }
        }
    }

    // ——— Catalog: clients ———————————————————————————————————————————————
    fun selectCatalogClient(item: ModuleItem?) {
        _uiState.update { it.copy(selectedClient = item, clientDetail = null, clientNoteDraft = "") }
        if (item != null) loadClientDetail(item.id)
    }

    fun setClientNoteDraft(value: String) {
        _uiState.update { it.copy(clientNoteDraft = value) }
    }

    private fun loadClientDetail(clientId: String) {
        val session = uiState.value.session ?: return
        viewModelScope.launch {
            runCatching {
                newClient(session.baseUrl).fetchClientDetail(session.deviceKey, clientId)
            }.onSuccess { detail ->
                _uiState.update { it.copy(clientDetail = detail) }
            }.onFailure {
                // Detail is progressive enhancement — list row already has basics.
            }
        }
    }

    fun saveClientNote() {
        val client = uiState.value.selectedClient ?: return
        val body = uiState.value.clientNoteDraft.trim()
        if (body.isEmpty()) {
            _uiState.update { it.copy(catalogError = "Write a note before saving.") }
            return
        }
        runCatalogMutation(
            errorFallback = "Could not save the note.",
            successNotice = "Note saved.",
        ) { clientApi, deviceKey ->
            clientApi.addClientNote(deviceKey, client.id, body)
            _uiState.update { it.copy(clientNoteDraft = "") }
            loadClientDetail(client.id)
        }
    }

    fun updateClientStage(clientId: String, stage: String) {
        runCatalogMutation(
            errorFallback = "Could not update the client.",
            successNotice = "Client updated.",
            optimistic = { content ->
                content.mapValues { (_, state) ->
                    val payload = state.payload ?: return@mapValues state
                    if (payload.module != "clients") return@mapValues state
                    state.copy(
                        payload = payload.copy(
                            items = payload.items.map { item ->
                                if (item.id == clientId) item.copy(status = stage) else item
                            },
                        ),
                    )
                }
            },
        ) { clientApi, deviceKey ->
            clientApi.updateClient(deviceKey, clientId, JSONObject().put("stage", stage))
        }
    }

    // ——— Catalog: services ——————————————————————————————————————————————
    fun startServiceCreate() {
        _uiState.update { it.copy(serviceForm = ServiceFormState()) }
    }

    fun startServiceEdit(item: ModuleItem) {
        _uiState.update {
            it.copy(
                serviceForm = ServiceFormState(
                    id = item.id,
                    name = item.title,
                    priceLkr = parsePriceFromSubtitle(item.subtitle),
                    durationMinutes = parseDurationFromSubtitle(item.subtitle),
                    description = item.subtitle.orEmpty(),
                    isActive = item.status?.lowercase() != "inactive",
                ),
            )
        }
    }

    fun updateServiceForm(form: ServiceFormState) {
        _uiState.update { it.copy(serviceForm = form.copy(formError = null)) }
    }

    fun clearServiceForm() {
        _uiState.update { it.copy(serviceForm = ServiceFormState()) }
    }

    fun toggleServiceActive(item: ModuleItem) {
        val nextActive = item.status?.lowercase() == "inactive"
        runCatalogMutation(
            errorFallback = "Could not update the service.",
            successNotice = if (nextActive) "Service activated." else "Service deactivated.",
            optimistic = { content ->
                content.mapValues { (_, state) ->
                    val payload = state.payload ?: return@mapValues state
                    if (payload.module != "services") return@mapValues state
                    state.copy(
                        payload = payload.copy(
                            items = payload.items.map { row ->
                                if (row.id == item.id) {
                                    row.copy(status = if (nextActive) "active" else "inactive")
                                } else row
                            },
                        ),
                    )
                }
            },
        ) { api, deviceKey ->
            api.updateService(deviceKey, item.id, JSONObject().put("isActive", nextActive))
        }
    }

    fun saveService() {
        val form = uiState.value.serviceForm
        validateServiceForm(form)?.let { message ->
            _uiState.update { it.copy(serviceForm = form.copy(formError = message)) }
            return
        }
        val id = form.id
        if (id == null) {
            // No dedicated create endpoint on desktop API yet — create via web
            // dashboard; surface inline so the user knows where to finish.
            _uiState.update {
                it.copy(
                    serviceForm = form.copy(
                        formError = "New services are created in the web dashboard — open web to finish setup.",
                    ),
                )
            }
            return
        }
        val body = JSONObject()
            .put("name", form.name.trim())
            .put("isActive", form.isActive)
        form.priceLkr.trim().replace(",", "").toDoubleOrNull()?.let { body.put("priceLkr", it.toInt()) }
        form.durationMinutes.trim().toIntOrNull()?.let { body.put("durationMinutes", it) }
        if (form.description.isNotBlank()) body.put("description", form.description.trim())
        runCatalogMutation(
            errorFallback = "Could not save the service.",
            successNotice = "Service saved.",
        ) { api, deviceKey ->
            api.updateService(deviceKey, id, body)
            _uiState.update { it.copy(serviceForm = ServiceFormState()) }
        }
    }

    // ——— Catalog: staff —————————————————————————————————————————————————
    fun startStaffCreate() {
        _uiState.update { it.copy(staffForm = StaffFormState()) }
    }

    fun startStaffEdit(item: ModuleItem) {
        val subtitle = item.subtitle.orEmpty()
        val email = subtitle.split("·", ",", "—").firstOrNull { it.contains("@") }?.trim().orEmpty()
        _uiState.update {
            it.copy(
                staffForm = StaffFormState(
                    id = item.id,
                    name = item.title,
                    email = email,
                    phone = "",
                    isActive = item.status?.lowercase() != "inactive",
                ),
            )
        }
    }

    fun updateStaffForm(form: StaffFormState) {
        _uiState.update { it.copy(staffForm = form.copy(formError = null)) }
    }

    fun clearStaffForm() {
        _uiState.update { it.copy(staffForm = StaffFormState()) }
    }

    fun toggleStaffActive(item: ModuleItem) {
        val nextActive = item.status?.lowercase() == "inactive"
        runCatalogMutation(
            errorFallback = "Could not update the staff member.",
            successNotice = if (nextActive) "Staff member activated." else "Staff member deactivated.",
            optimistic = { content ->
                content.mapValues { (_, state) ->
                    val payload = state.payload ?: return@mapValues state
                    if (payload.module != "staff") return@mapValues state
                    state.copy(
                        payload = payload.copy(
                            items = payload.items.map { row ->
                                if (row.id == item.id) {
                                    row.copy(status = if (nextActive) "active" else "inactive")
                                } else row
                            },
                        ),
                    )
                }
            },
        ) { api, deviceKey ->
            api.updateStaff(deviceKey, item.id, JSONObject().put("isActive", nextActive))
        }
    }

    fun saveStaff() {
        val form = uiState.value.staffForm
        validateStaffForm(form)?.let { message ->
            _uiState.update { it.copy(staffForm = form.copy(formError = message)) }
            return
        }
        val id = form.id
        if (id == null) {
            _uiState.update {
                it.copy(
                    staffForm = form.copy(
                        formError = "New staff members are invited in the web dashboard — open web to finish setup.",
                    ),
                )
            }
            return
        }
        val body = JSONObject()
            .put("name", form.name.trim())
            .put("isActive", form.isActive)
        if (form.email.isNotBlank()) body.put("email", form.email.trim())
        if (form.phone.isNotBlank()) body.put("phone", form.phone.trim())
        runCatalogMutation(
            errorFallback = "Could not save the staff member.",
            successNotice = "Staff member saved.",
        ) { api, deviceKey ->
            api.updateStaff(deviceKey, id, body)
            _uiState.update { it.copy(staffForm = StaffFormState()) }
        }
    }

    // ——— Catalog: locations —————————————————————————————————————————————
    fun startLocationEdit(item: ModuleItem) {
        _uiState.update {
            it.copy(
                locationForm = LocationFormState(
                    id = item.id,
                    name = item.title,
                    address = item.subtitle.orEmpty(),
                    timezone = extractTimezone(item.subtitle) ?: "Asia/Colombo",
                    isDefault = item.status?.lowercase() == "default",
                ),
            )
        }
    }

    fun updateLocationForm(form: LocationFormState) {
        _uiState.update { it.copy(locationForm = form.copy(formError = null)) }
    }

    fun clearLocationForm() {
        _uiState.update { it.copy(locationForm = LocationFormState()) }
    }

    fun saveLocation() {
        val form = uiState.value.locationForm
        validateLocationForm(form)?.let { message ->
            _uiState.update { it.copy(locationForm = form.copy(formError = message)) }
            return
        }
        val id = form.id ?: return
        val body = JSONObject()
            .put("name", form.name.trim())
            .put("timezone", form.timezone.trim())
        if (form.address.isNotBlank()) body.put("address", form.address.trim())
        if (form.isDefault) body.put("isDefault", true)
        runCatalogMutation(
            errorFallback = "Could not save the location.",
            successNotice = "Location saved.",
        ) { api, deviceKey ->
            api.updateLocation(deviceKey, id, body)
            _uiState.update { it.copy(locationForm = LocationFormState()) }
        }
    }

    // ——— Catalog: availability ——————————————————————————————————————————
    fun loadAvailabilityMembers() {
        val session = uiState.value.session ?: return
        viewModelScope.launch {
            runCatching {
                newClient(session.baseUrl).fetchAvailabilityOverview(session.deviceKey)
            }.onSuccess { members ->
                _uiState.update { it.copy(availabilityMembers = members) }
            }.onFailure {
                // Generic module payload still renders; typed members enhance it.
            }
        }
    }

    fun setAvailabilityEdits(staffId: String, windows: List<AvailabilityWindow>) {
        _uiState.update { it.copy(availabilityEdits = it.availabilityEdits + (staffId to windows)) }
    }

    fun saveAvailabilityWindows(staffId: String) {
        val rows = uiState.value.availabilityEdits[staffId]
            ?: uiState.value.availabilityMembers.firstOrNull { it.staffId == staffId }?.windows
            ?: emptyList()
        if (rows.any { it.startTime >= it.endTime }) {
            _uiState.update { it.copy(catalogError = "Each window needs a start time before its end time.") }
            return
        }
        runCatalogMutation(
            errorFallback = "Could not save availability.",
            successNotice = "Availability saved.",
        ) { api, deviceKey ->
            api.updateAvailabilityWindows(deviceKey, staffId, rows)
            _uiState.update { it.copy(availabilityEdits = it.availabilityEdits - staffId) }
        }
    }

    fun saveAvailabilityOverride(
        staffId: String,
        date: String,
        startTime: String?,
        endTime: String?,
        isBlocked: Boolean,
        reason: String?,
    ) {
        if (date.isBlank()) {
            _uiState.update { it.copy(catalogError = "Pick a date for the override.") }
            return
        }
        runCatalogMutation(
            errorFallback = "Could not save the override.",
            successNotice = "Override saved.",
        ) { api, deviceKey ->
            api.upsertAvailabilityOverride(deviceKey, staffId, date, startTime, endTime, isBlocked, reason)
        }
    }

    fun deleteAvailabilityOverride(id: String, staffId: String) {
        runCatalogMutation(
            errorFallback = "Could not remove the override.",
            successNotice = "Override removed.",
        ) { api, deviceKey ->
            api.deleteAvailabilityOverride(deviceKey, id, staffId)
        }
    }

    fun clearActionMessage() {
        _uiState.update { it.copy(actionMessage = null) }
    }

    // ——— Growth + Configure native actions ————————————————————————————

    fun replyToReview(reviewId: String, reply: String) {
        val session = uiState.value.session ?: return
        val trimmed = reply.trim()
        if (trimmed.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Reply cannot be empty.") }
            return
        }
        viewModelScope.launch {
            runCatching {
                newClient(session.baseUrl).patchReviewReply(session.deviceKey, reviewId, trimmed)
            }.onSuccess {
                _uiState.update { it.copy(actionMessage = "Reply published.") }
                loadSectionModule("reviews", force = true)
            }.onFailure { error ->
                _uiState.update {
                    it.copy(errorMessage = error.message ?: "Could not publish reply.")
                }
            }
        }
    }

    fun toggleAutomation(ruleId: String, isActive: Boolean) {
        val session = uiState.value.session ?: return
        // Optimistic update first for instant toggle feedback.
        updateLocalModuleItemStatus("automations", ruleId, if (isActive) "active" else "paused")
        viewModelScope.launch {
            runCatching {
                newClient(session.baseUrl).patchAutomationActive(session.deviceKey, ruleId, isActive)
            }.onSuccess {
                _uiState.update { it.copy(actionMessage = if (isActive) "Automation enabled." else "Automation paused.") }
                loadSectionModule("automations", force = true)
            }.onFailure { error ->
                _uiState.update {
                    it.copy(errorMessage = error.message ?: "Could not update automation.")
                }
                loadSectionModule("automations", force = true)
            }
        }
    }

    fun toggleDeal(dealId: String, isActive: Boolean) {
        // Desktop deals API is read-only; keep toggle local-first and refresh
        // on next sync so the list never blocks on a missing PATCH endpoint.
        updateLocalModuleItemStatus("deals", dealId, if (isActive) "active" else "paused")
        _uiState.update {
            it.copy(actionMessage = if (isActive) "Deal activated on this device." else "Deal paused on this device.")
        }
    }

    fun upsertLocalDeal(id: String, title: String, subtitle: String?, status: String) {
        val existing = uiState.value.moduleContent["deals"]
        val current = existing?.payload ?: return
        val next = if (current.items.any { it.id == id }) {
            current.items.map { item ->
                if (item.id == id) item.copy(title = title, subtitle = subtitle, status = status) else item
            }
        } else {
            listOf(
                lk.dinaya.mobile.data.ModuleItem(
                    id = id,
                    title = title,
                    subtitle = subtitle,
                    meta = null,
                    status = status,
                ),
            ) + current.items
        }
        _uiState.update {
            it.copy(
                moduleContent = it.moduleContent + (
                    "deals" to ModuleContentState(payload = current.copy(items = next))
                ),
                actionMessage = "Deal saved on this device.",
            )
        }
    }

    fun addLocalBroadcast(id: String, title: String, subtitle: String?, status: String) {
        val existing = uiState.value.moduleContent["broadcasts"]
        val current = existing?.payload ?: return
        val next = listOf(
            lk.dinaya.mobile.data.ModuleItem(
                id = id,
                title = title,
                subtitle = subtitle,
                meta = null,
                status = status,
            ),
        ) + current.items
        _uiState.update {
            it.copy(
                moduleContent = it.moduleContent + (
                    "broadcasts" to ModuleContentState(payload = current.copy(items = next))
                ),
                actionMessage = "Broadcast drafted on this device.",
            )
        }
    }

    fun sendTestBroadcast(broadcastId: String, phone: String) {
        val trimmed = phone.trim()
        if (trimmed.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Enter a phone number for the test send.") }
            return
        }
        _uiState.update {
            it.copy(
                broadcastTestSent = it.broadcastTestSent + (broadcastId to trimmed),
                actionMessage = "Test send queued to $trimmed.",
            )
        }
    }

    fun triggerAiWorkflow(clientId: String? = null) {
        val session = uiState.value.session ?: return
        viewModelScope.launch {
            runCatching {
                newClient(session.baseUrl).triggerAiReactivation(session.deviceKey, clientId)
            }.onSuccess {
                _uiState.update { it.copy(actionMessage = "AI workflow triggered.") }
                loadSectionModule("aiHub", force = true)
            }.onFailure { error ->
                _uiState.update {
                    it.copy(errorMessage = error.message ?: "Could not trigger AI workflow.")
                }
            }
        }
    }

    fun updateBusinessProfile(name: String, phone: String, address: String) {
        val session = uiState.value.session ?: return
        val trimmedName = name.trim()
        if (trimmedName.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Business name is required.") }
            return
        }
        viewModelScope.launch {
            runCatching {
                newClient(session.baseUrl).patchBusinessProfile(
                    deviceKey = session.deviceKey,
                    name = trimmedName,
                    phone = phone.trim().ifBlank { null },
                    address = address.trim().ifBlank { null },
                )
            }.onSuccess {
                _uiState.update { it.copy(actionMessage = "Business profile saved.") }
                runCatching {
                    newClient(session.baseUrl).fetchBootstrap(session.deviceKey)
                }.onSuccess { bootstrap ->
                    _uiState.update { state ->
                        state.copy(
                            bootstrap = bootstrap,
                            session = state.session?.copy(businessName = bootstrap.business.name),
                        )
                    }
                }
                loadSectionModule("settings", force = true)
            }.onFailure { error ->
                _uiState.update {
                    it.copy(errorMessage = error.message ?: "Could not save business profile.")
                }
            }
        }
    }

    fun setDirectoryListed(listed: Boolean) {
        val session = uiState.value.session ?: return
        viewModelScope.launch {
            runCatching {
                newClient(session.baseUrl).patchBusinessProfile(
                    deviceKey = session.deviceKey,
                    directoryListed = listed,
                )
            }.onSuccess {
                _uiState.update {
                    it.copy(actionMessage = if (listed) "Directory listing enabled." else "Directory listing hidden.")
                }
                loadSectionModule("marketing", force = true)
            }.onFailure { error ->
                _uiState.update {
                    it.copy(errorMessage = error.message ?: "Could not update directory listing.")
                }
            }
        }
    }

    private fun updateLocalModuleItemStatus(sectionKey: String, itemId: String, status: String) {
        val existing = uiState.value.moduleContent[sectionKey]?.payload ?: return
        val next = existing.items.map { item ->
            if (item.id == itemId) item.copy(status = status) else item
        }
        _uiState.update {
            it.copy(
                moduleContent = it.moduleContent + (sectionKey to ModuleContentState(payload = existing.copy(items = next))),
            )
        }
    }

    fun signOut() {
        val session = uiState.value.session
        tokenStore.clear()
        _uiState.update {
            DinayaUiState(baseUrl = it.baseUrl, deviceName = it.deviceName)
        }

        if (session != null) {
            viewModelScope.launch {
                runCatching {
                    newClient(session.baseUrl).logout(session.deviceKey)
                }
            }
        }
    }
}

private fun defaultDeviceName(): String {
    val model = listOfNotNull(Build.MANUFACTURER, Build.MODEL)
        .joinToString(" ")
        .trim()
        .ifBlank { "Android" }
    return "Dinaya Android - $model"
}

internal fun parsePriceFromSubtitle(subtitle: String?): String {
    if (subtitle.isNullOrBlank()) return ""
    val match = Regex("""([\d,]+)""").find(subtitle.replace("Rs.?", "")) ?: return ""
    return match.value.replace(",", "")
}

internal fun parseDurationFromSubtitle(subtitle: String?): String {
    if (subtitle.isNullOrBlank()) return ""
    return Regex("""(\d+)\s*min""", RegexOption.IGNORE_CASE).find(subtitle)?.groupValues?.getOrNull(1).orEmpty()
}

internal fun extractTimezone(subtitle: String?): String? {
    if (subtitle.isNullOrBlank()) return null
    return Regex("""[A-Za-z]+/[A-Za-z_]+""").find(subtitle)?.value
}
