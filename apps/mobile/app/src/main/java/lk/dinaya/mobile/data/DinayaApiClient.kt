package lk.dinaya.mobile.data

import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import kotlin.coroutines.coroutineContext

class DinayaApiException(message: String, val statusCode: Int? = null) : Exception(message)

class DinayaApiClient(
    private val baseUrl: String,
    private val cache: MobileCache? = null,
) {
    suspend fun login(email: String, password: String, deviceName: String): LoginResult = withContext(Dispatchers.IO) {
        val body = JSONObject()
            .put("email", email)
            .put("password", password)
            .put("deviceName", deviceName)
        request("POST", mobilePath("auth/login"), body = body).toLoginResult()
    }

    suspend fun fetchBootstrap(deviceKey: String): BootstrapResult = withContext(Dispatchers.IO) {
        try {
            val raw = request("GET", mobilePath("bootstrap"), deviceKey = deviceKey)
            cache?.saveBootstrap(raw)
            raw.toBootstrapResult()
        } catch (e: DinayaApiException) {
            throw e
        } catch (e: Exception) {
            coroutineContext.ensureActive()
            cache?.loadBootstrap()?.toBootstrapResult()?.copy(isStale = true) ?: throw e
        }
    }

    suspend fun fetchTodayBookings(deviceKey: String): BookingsResult = fetchBookings(deviceKey, tab = "today")

    suspend fun fetchBookings(
        deviceKey: String,
        tab: String = "today",
        query: String? = null,
        status: String? = null,
    ): BookingsResult = withContext(Dispatchers.IO) {
        val cacheTab = listOf(tab, query.orEmpty(), status.orEmpty()).joinToString("|")
        try {
            val raw = request("GET", mobileBookingsPath(tab = tab, query = query, status = status), deviceKey = deviceKey)
            cache?.saveBookings(cacheTab, raw)
            raw.toBookingsResult()
        } catch (e: DinayaApiException) {
            throw e
        } catch (e: Exception) {
            coroutineContext.ensureActive()
            cache?.loadBookings(cacheTab)?.toBookingsResult()?.copy(isStale = true) ?: throw e
        }
    }

    suspend fun fetchOverview(deviceKey: String): OverviewPayload = withContext(Dispatchers.IO) {
        try {
            val raw = request("GET", mobilePath("overview"), deviceKey = deviceKey)
            cache?.saveOverview(raw)
            raw.toOverviewPayload()
        } catch (e: DinayaApiException) {
            throw e
        } catch (e: Exception) {
            coroutineContext.ensureActive()
            cache?.loadOverview()?.toOverviewPayload()?.copy(isStale = true) ?: throw e
        }
    }

    suspend fun fetchCalendar(
        deviceKey: String,
        view: String = "day",
        date: String? = null,
        staffId: String? = null,
    ): CalendarPayload = withContext(Dispatchers.IO) {
        try {
            val raw = request(
                "GET",
                mobileCalendarPath(view = view, date = date, staffId = staffId),
                deviceKey = deviceKey,
            )
            cache?.saveCalendar(view, date, staffId, raw)
            raw.toCalendarPayload()
        } catch (e: DinayaApiException) {
            throw e
        } catch (e: Exception) {
            coroutineContext.ensureActive()
            cache?.loadCalendar(view, date, staffId)
                ?.toCalendarPayload()?.copy(isStale = true) ?: throw e
        }
    }

    suspend fun fetchDesktopModule(deviceKey: String, module: String): DesktopModulePayload = withContext(Dispatchers.IO) {
        request("GET", mobileModulePath(module), deviceKey = deviceKey).toDesktopModulePayload(module)
    }

    suspend fun updateBookingStatus(deviceKey: String, bookingId: String, status: String): StatusUpdateResult =
        withContext(Dispatchers.IO) {
            val body = JSONObject().put("status", status)
            request(
                method = "PATCH",
                path = mobilePath("bookings/$bookingId/status"),
                deviceKey = deviceKey,
                body = body,
            ).toStatusUpdateResult()
        }

    // ——— Catalog workspace: generic mutation + typed reads ————————————————
    // Uses the same HttpURLConnection request() pattern above (auth headers,
    // localhost fallbacks, error parsing). Data-layer swarm: prefer these
    // typed helpers; fall back to mutateModule() for anything new.

    suspend fun mutateModule(
        deviceKey: String,
        method: String,
        path: String,
        body: JSONObject? = null,
    ): JSONObject = withContext(Dispatchers.IO) {
        request(method = method, path = path, deviceKey = deviceKey, body = body)
    }

    suspend fun fetchRaw(deviceKey: String, path: String): JSONObject = withContext(Dispatchers.IO) {
        request("GET", path, deviceKey = deviceKey)
    }

    suspend fun fetchAvailabilityOverview(deviceKey: String): List<AvailabilityMember> =
        withContext(Dispatchers.IO) {
            val json = request("GET", mobilePath("availability"), deviceKey = deviceKey)
            json.optJSONArray("members").toAvailabilityMembers()
        }

    suspend fun updateAvailabilityWindows(
        deviceKey: String,
        staffId: String,
        rows: List<AvailabilityWindow>,
    ): JSONObject = withContext(Dispatchers.IO) {
        val arr = JSONArray()
        rows.forEach { w ->
            arr.put(
                JSONObject()
                    .put("dayOfWeek", w.dayOfWeek)
                    .put("startTime", w.startTime)
                    .put("endTime", w.endTime),
            )
        }
        request(
            "PATCH", mobilePath("availability"), deviceKey,
            JSONObject().put("staffId", staffId).put("rows", arr),
        )
    }

    suspend fun upsertAvailabilityOverride(
        deviceKey: String,
        staffId: String,
        date: String,
        startTime: String?,
        endTime: String?,
        isBlocked: Boolean,
        reason: String?,
    ): JSONObject = withContext(Dispatchers.IO) {
        val body = JSONObject()
            .put("staffId", staffId)
            .put("date", date)
            .put("isBlocked", isBlocked)
        if (!startTime.isNullOrBlank()) body.put("startTime", startTime) else body.put("startTime", JSONObject.NULL)
        if (!endTime.isNullOrBlank()) body.put("endTime", endTime) else body.put("endTime", JSONObject.NULL)
        if (!reason.isNullOrBlank()) body.put("reason", reason) else body.put("reason", JSONObject.NULL)
        request("POST", mobilePath("availability/overrides"), deviceKey, body)
    }

    suspend fun deleteAvailabilityOverride(deviceKey: String, id: String, staffId: String): JSONObject =
        withContext(Dispatchers.IO) {
            request(
                "DELETE",
                mobilePath("availability/overrides?id=$id&staffId=$staffId"),
                deviceKey = deviceKey,
            )
        }

    suspend fun fetchClientDetail(deviceKey: String, id: String): ClientDetailPayload =
        withContext(Dispatchers.IO) {
            request("GET", mobilePath("clients/$id"), deviceKey = deviceKey).toClientDetail(id)
        }

    suspend fun updateClient(deviceKey: String, id: String, body: JSONObject): JSONObject =
        withContext(Dispatchers.IO) {
            request("PATCH", mobilePath("clients/$id"), deviceKey, body)
        }

    suspend fun addClientNote(deviceKey: String, id: String, noteBody: String): JSONObject =
        withContext(Dispatchers.IO) {
            request(
                "POST", mobilePath("clients/$id/notes"), deviceKey,
                JSONObject().put("body", noteBody),
            )
        }

    suspend fun fetchServiceDetail(deviceKey: String, id: String): JSONObject =
        withContext(Dispatchers.IO) {
            request("GET", mobilePath("services/$id"), deviceKey = deviceKey)
        }

    suspend fun updateService(deviceKey: String, id: String, body: JSONObject): JSONObject =
        withContext(Dispatchers.IO) {
            request("PATCH", mobilePath("services/$id"), deviceKey, body)
        }

    suspend fun fetchStaffDetail(deviceKey: String, id: String): JSONObject =
        withContext(Dispatchers.IO) {
            request("GET", mobilePath("staff/$id"), deviceKey = deviceKey)
        }

    suspend fun updateStaff(deviceKey: String, id: String, body: JSONObject): JSONObject =
        withContext(Dispatchers.IO) {
            request("PATCH", mobilePath("staff/$id"), deviceKey, body)
        }

    suspend fun fetchLocationDetail(deviceKey: String, id: String): JSONObject =
        withContext(Dispatchers.IO) {
            request("GET", mobilePath("locations/$id"), deviceKey = deviceKey)
        }

    suspend fun updateLocation(deviceKey: String, id: String, body: JSONObject): JSONObject =
        withContext(Dispatchers.IO) {
            request("PATCH", mobilePath("locations/$id"), deviceKey, body)
        }

    suspend fun createLocation(deviceKey: String, body: LocationUpsertRequest): LocationDetail =
        withContext(Dispatchers.IO) {
            request(
                method = "POST",
                path = mobilePath("locations"),
                deviceKey = deviceKey,
                body = body.toJson(),
            ).toLocationDetail()
        }

    suspend fun updateLocation(
        deviceKey: String,
        id: String,
        body: LocationUpsertRequest,
    ): LocationDetail = withContext(Dispatchers.IO) {
        request(
            method = "PATCH",
            path = mobilePath("locations/$id"),
            deviceKey = deviceKey,
            body = body.toJson(),
        ).toLocationDetail()
    }

    suspend fun logout(deviceKey: String) = withContext(Dispatchers.IO) {
        request("POST", mobilePath("auth/logout"), deviceKey = deviceKey, body = JSONObject())
        Unit
    }

    suspend fun patchReviewReply(deviceKey: String, reviewId: String, reply: String): JSONObject =
        withContext(Dispatchers.IO) {
            val body = JSONObject().put("ownerReply", reply)
            request(
                method = "PATCH",
                path = mobilePath("reviews/$reviewId"),
                deviceKey = deviceKey,
                body = body,
            )
        }

    suspend fun patchAutomationActive(deviceKey: String, ruleId: String, isActive: Boolean): JSONObject =
        withContext(Dispatchers.IO) {
            val body = JSONObject().put("isActive", isActive)
            request(
                method = "PATCH",
                path = mobilePath("automations/$ruleId"),
                deviceKey = deviceKey,
                body = body,
            )
        }

    suspend fun patchDealActive(deviceKey: String, dealId: String, isActive: Boolean): JSONObject =
        withContext(Dispatchers.IO) {
            request(
                method = "PATCH",
                path = mobilePath("deals/$dealId"),
                deviceKey = deviceKey,
                body = JSONObject().put("isActive", isActive),
            )
        }

    suspend fun createDeal(deviceKey: String, body: CreateDealRequest): DealDetail =
        withContext(Dispatchers.IO) {
            request(
                method = "POST",
                path = mobilePath("deals"),
                deviceKey = deviceKey,
                body = body.toJson(),
            ).toDealDetail()
        }

    suspend fun patchBusinessProfile(
        deviceKey: String,
        name: String? = null,
        phone: String? = null,
        address: String? = null,
        directoryListed: Boolean? = null,
    ): JSONObject = withContext(Dispatchers.IO) {
        val business = JSONObject()
        if (name != null) business.put("name", name)
        if (phone != null) business.put("phone", phone)
        if (address != null) business.put("address", address)
        if (directoryListed != null) business.put("directoryListed", directoryListed)
        val body = JSONObject().put("business", business)
        request(
            method = "PATCH",
            path = mobilePath("settings"),
            deviceKey = deviceKey,
            body = body,
        )
    }

    suspend fun triggerAiReactivation(deviceKey: String, clientId: String? = null): JSONObject =
        withContext(Dispatchers.IO) {
            val body = JSONObject()
            if (!clientId.isNullOrBlank()) body.put("clientId", clientId)
            request(
                method = "POST",
                path = mobilePath("ai/reactivate"),
                deviceKey = deviceKey,
                body = body,
            )
        }

    // ——— Typed CRUD (mobile-first paths; request() falls back to desktop) ————

    suspend fun createBooking(deviceKey: String, body: CreateBookingRequest): BookingSummary =
        withContext(Dispatchers.IO) {
            request(
                method = "POST",
                path = mobilePath("bookings"),
                deviceKey = deviceKey,
                body = body.toJson(),
            ).toBookingSummary()
        }

    suspend fun updateBooking(
        deviceKey: String,
        bookingId: String,
        body: UpdateBookingRequest,
    ): BookingSummary = withContext(Dispatchers.IO) {
        request(
            method = "PATCH",
            path = mobilePath("bookings/$bookingId"),
            deviceKey = deviceKey,
            body = body.toJson(),
        ).toBookingSummary()
    }

    suspend fun cancelBooking(
        deviceKey: String,
        bookingId: String,
        reason: String? = null,
    ): StatusUpdateResult = withContext(Dispatchers.IO) {
        val body = JSONObject()
        if (!reason.isNullOrBlank()) body.put("reason", reason)
        val cancelled = runCatching {
            request(
                method = "POST",
                path = mobilePath("bookings/$bookingId/cancel"),
                deviceKey = deviceKey,
                body = body,
            )
        }.getOrNull()
        if (cancelled != null) return@withContext cancelled.toStatusUpdateResult()
        // Graceful fallback when the dedicated cancel endpoint is unavailable.
        updateBookingStatus(deviceKey, bookingId, "cancelled")
    }

    suspend fun createClient(deviceKey: String, body: ClientUpsertRequest): ClientDetail =
        withContext(Dispatchers.IO) {
            request(
                method = "POST",
                path = mobilePath("clients"),
                deviceKey = deviceKey,
                body = body.toJson(),
            ).toClientDetail()
        }

    suspend fun updateClient(deviceKey: String, clientId: String, body: ClientUpsertRequest): ClientDetail =
        withContext(Dispatchers.IO) {
            request(
                method = "PATCH",
                path = mobilePath("clients/$clientId"),
                deviceKey = deviceKey,
                body = body.toJson(),
            ).toClientDetail()
        }

    suspend fun createService(deviceKey: String, body: ServiceUpsertRequest): ServiceDetail =
        withContext(Dispatchers.IO) {
            request(
                method = "POST",
                path = mobilePath("services"),
                deviceKey = deviceKey,
                body = body.toJson(),
            ).toServiceDetail()
        }

    suspend fun updateService(
        deviceKey: String,
        serviceId: String,
        body: ServiceUpsertRequest,
    ): ServiceDetail = withContext(Dispatchers.IO) {
        request(
            method = "PATCH",
            path = mobilePath("services/$serviceId"),
            deviceKey = deviceKey,
            body = body.toJson(),
        ).toServiceDetail()
    }

    suspend fun toggleService(
        deviceKey: String,
        serviceId: String,
        isActive: Boolean,
    ): ServiceDetail = withContext(Dispatchers.IO) {
        request(
            method = "PATCH",
            path = mobilePath("services/$serviceId"),
            deviceKey = deviceKey,
            body = JSONObject().put("isActive", isActive),
        ).toServiceDetail()
    }

    suspend fun createStaff(deviceKey: String, body: StaffUpsertRequest): StaffDetail =
        withContext(Dispatchers.IO) {
            request(
                method = "POST",
                path = mobilePath("staff"),
                deviceKey = deviceKey,
                body = body.toJson(),
            ).toStaffDetail()
        }

    suspend fun updateStaff(
        deviceKey: String,
        staffId: String,
        body: StaffUpsertRequest,
    ): StaffDetail = withContext(Dispatchers.IO) {
        request(
            method = "PATCH",
            path = mobilePath("staff/$staffId"),
            deviceKey = deviceKey,
            body = body.toJson(),
        ).toStaffDetail()
    }

    suspend fun replyToReview(deviceKey: String, reviewId: String, reply: String): ReviewDetail =
        withContext(Dispatchers.IO) {
            request(
                method = "PATCH",
                path = mobilePath("reviews/$reviewId"),
                deviceKey = deviceKey,
                body = JSONObject().put("ownerReply", reply),
            ).toReviewDetail()
        }

    suspend fun fetchPaymentsDetail(deviceKey: String, paymentId: String): PaymentDetail =
        withContext(Dispatchers.IO) {
            request(
                "GET",
                mobilePath("payments/$paymentId"),
                deviceKey = deviceKey,
            ).toPaymentDetail()
        }

    suspend fun createBroadcast(deviceKey: String, body: CreateBroadcastRequest): BroadcastCreateResult =
        withContext(Dispatchers.IO) {
            request(
                method = "POST",
                path = mobilePath("broadcasts"),
                deviceKey = deviceKey,
                body = body.toJson(),
            ).toBroadcastCreateResult()
        }

    suspend fun triggerBroadcast(deviceKey: String, broadcastId: String): BroadcastResult =
        withContext(Dispatchers.IO) {
            request(
                method = "POST",
                path = mobilePath("broadcasts/$broadcastId/trigger"),
                deviceKey = deviceKey,
                body = JSONObject(),
            ).toBroadcastResult()
        }

    suspend fun sendTestBroadcast(
        deviceKey: String,
        broadcastId: String,
        recipient: String? = null,
    ): BroadcastResult = withContext(Dispatchers.IO) {
        val body = JSONObject()
        if (!recipient.isNullOrBlank()) body.put("recipient", recipient)
        request(
            method = "POST",
            path = mobilePath("broadcasts/$broadcastId/send-test"),
            deviceKey = deviceKey,
            body = body,
        ).toBroadcastResult()
    }

    suspend fun toggleAutomation(
        deviceKey: String,
        automationId: String,
        enabled: Boolean,
    ): AutomationToggleResult = withContext(Dispatchers.IO) {
        request(
            method = "PATCH",
            path = mobilePath("automations/$automationId"),
            deviceKey = deviceKey,
            body = JSONObject().put("isActive", enabled),
        ).toAutomationToggleResult()
    }

    suspend fun fetchReports(
        deviceKey: String,
        range: String? = null,
        from: String? = null,
        to: String? = null,
    ): ReportPayload = withContext(Dispatchers.IO) {
        request(
            "GET",
            mobileReportsPath(range = range, from = from, to = to),
            deviceKey = deviceKey,
        ).toReportPayload()
    }

    private fun request(
        method: String,
        path: String,
        deviceKey: String? = null,
        body: JSONObject? = null,
    ): JSONObject {
        if (isLoopbackBaseUrl(baseUrl) && !isEmulatorDevice()) {
            throw DinayaApiException(friendlyConnectionError(Exception("loopback"), baseUrl))
        }

        val targets = if (isLoopbackBaseUrl(baseUrl) && isEmulatorDevice()) {
            listOf(baseUrl, "http://127.0.0.1:3002", "http://10.0.2.2:3002").distinct()
        } else {
            listOf(baseUrl)
        }

        var lastException: Exception? = null
        for (target in targets) {
            try {
                return executeWithMobileFallback(target, method, path, deviceKey, body)
            } catch (e: DinayaApiException) {
                throw e
            } catch (e: Exception) {
                lastException = e
            }
        }
        throw lastException?.let { DinayaApiException(friendlyConnectionError(it, baseUrl)) }
            ?: DinayaApiException("Couldn't reach Dinaya. Check your internet and try again.")
    }

    /**
     * Tries the mobile API first and falls back to desktop when the server
     * answers 404. Other API errors propagate.
     *
     * - `/api/v1/mobile/...` is tried as-is, then the desktop equivalent
     * - `/api/v1/desktop/...` tries the mobile equivalent first, then desktop
     */
    private fun executeWithMobileFallback(
        targetUrl: String,
        method: String,
        path: String,
        deviceKey: String? = null,
        body: JSONObject? = null,
    ): JSONObject {
        val mobile = if (path.startsWith("/api/v1/mobile/")) path else mobileFallbackFor(path)
        val desktop = if (path.startsWith("/api/v1/desktop/")) path else desktopFallbackFor(path)

        if (mobile != null && mobile != desktop) {
            try {
                return executeSingleRequest(targetUrl, method, mobile, deviceKey, body)
            } catch (e: DinayaApiException) {
                if (e.statusCode != 404) throw e
            }
        }
        return executeSingleRequest(targetUrl, method, desktop ?: path, deviceKey, body)
    }

    private fun executeSingleRequest(
        targetUrl: String,
        method: String,
        path: String,
        deviceKey: String? = null,
        body: JSONObject? = null,
    ): JSONObject {
        var lastError: Exception? = null
        repeat(2) { attempt ->
            try {
                return executeSingleRequestOnce(targetUrl, method, path, deviceKey, body)
            } catch (e: DinayaApiException) {
                throw e
            } catch (e: Exception) {
                lastError = e
                val retryable = e.message.orEmpty().contains("unexpected end of stream", ignoreCase = true)
                if (attempt == 0 && retryable) return@repeat
                throw DinayaApiException(friendlyConnectionError(e, targetUrl))
            }
        }
        throw DinayaApiException(friendlyConnectionError(lastError ?: Exception("connection failed"), targetUrl))
    }

    private fun executeSingleRequestOnce(
        targetUrl: String,
        method: String,
        path: String,
        deviceKey: String? = null,
        body: JSONObject? = null,
    ): JSONObject {
        val connection = resolveDinayaUrl(targetUrl, path).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = 12_000
            connection.readTimeout = 25_000
            connection.instanceFollowRedirects = true
            connection.useCaches = false
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Connection", "close")
            connection.setRequestProperty("X-Dinaya-Mobile", "1")
            if (path.startsWith("/api/v1/desktop/")) {
                connection.setRequestProperty("X-Dinaya-Desktop", "1")
            }
            if (deviceKey != null) {
                connection.setRequestProperty("Authorization", "Bearer $deviceKey")
            }
            if (body != null) {
                val payload = body.toString().toByteArray(StandardCharsets.UTF_8)
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                connection.setFixedLengthStreamingMode(payload.size)
                connection.outputStream.use { stream ->
                    stream.write(payload)
                }
            }

            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader(StandardCharsets.UTF_8)?.use { it.readText() }.orEmpty()
            if (status !in 200..299) {
                throw DinayaApiException(parseErrorMessage(text), status)
            }
            return if (text.isBlank()) JSONObject() else JSONObject(text)
        } finally {
            connection.disconnect()
        }
    }

    private fun parseErrorMessage(text: String): String {
        if (text.isBlank()) return "Dinaya request failed."
        return runCatching {
            JSONObject(text).optString("error").takeIf { it.isNotBlank() }
        }.getOrNull() ?: "Dinaya request failed."
    }
}

internal fun resolveDinayaUrl(baseUrl: String, path: String): URL {
    var normalizedBase = baseUrl.trim().trimEnd('/')
    if (normalizedBase.startsWith("http://localhost:")) {
        normalizedBase = normalizedBase.replace("http://localhost:", "http://127.0.0.1:")
    }
    val normalizedPath = if (path.startsWith("/")) path else "/$path"
    if (normalizedBase.isBlank()) {
        throw DinayaApiException("API base URL is required.")
    }
    return URL("$normalizedBase$normalizedPath")
}

internal fun desktopModulePath(module: String): String = "/api/v1/desktop/$module?limit=40"

internal fun mobileModulePath(module: String): String = "/api/v1/mobile/$module?limit=40"

internal fun mobilePath(suffix: String): String = "/api/v1/mobile/${suffix.trimStart('/')}"

internal fun desktopPath(suffix: String): String = "/api/v1/desktop/${suffix.trimStart('/')}"

/**
 * Mobile-first equivalent of a desktop API path, or null when the path is not
 * a desktop path (nothing to prefer over it).
 */
internal fun mobileFallbackFor(path: String): String? {
    val prefix = "/api/v1/desktop/"
    return if (path.startsWith(prefix)) "/api/v1/mobile/" + path.removePrefix(prefix) else null
}

/**
 * Desktop equivalent of a mobile API path, or null when the path is not a
 * mobile path (nothing to fall back to).
 */
internal fun desktopFallbackFor(path: String): String? {
    val prefix = "/api/v1/mobile/"
    return if (path.startsWith(prefix)) "/api/v1/desktop/" + path.removePrefix(prefix) else null
}

internal fun bookingsPath(
    tab: String = "today",
    query: String? = null,
    status: String? = null,
    limit: Int = 60,
): String = buildBookingsPath("/api/v1/desktop", tab, query, status, limit)

internal fun mobileBookingsPath(
    tab: String = "today",
    query: String? = null,
    status: String? = null,
    limit: Int = 60,
): String = buildBookingsPath("/api/v1/mobile", tab, query, status, limit)

private fun buildBookingsPath(
    prefix: String,
    tab: String,
    query: String?,
    status: String?,
    limit: Int,
): String {
    val qParam = if (!query.isNullOrBlank()) "&q=" + java.net.URLEncoder.encode(query, "UTF-8") else ""
    val statusParam = if (!status.isNullOrBlank() && status.lowercase() != "all") "&status=$status" else ""
    return "$prefix/bookings?tab=$tab&limit=$limit$qParam$statusParam"
}

internal fun calendarPath(
    view: String = "day",
    date: String? = null,
    staffId: String? = null,
): String = buildCalendarPath("/api/v1/desktop", view, date, staffId)

internal fun mobileCalendarPath(
    view: String = "day",
    date: String? = null,
    staffId: String? = null,
): String = buildCalendarPath("/api/v1/mobile", view, date, staffId)

private fun buildCalendarPath(prefix: String, view: String, date: String?, staffId: String?): String {
    val dateParam = if (!date.isNullOrBlank()) "&date=$date" else ""
    val staffParam = if (!staffId.isNullOrBlank()) "&staffId=$staffId" else ""
    return "$prefix/calendar?view=$view$dateParam$staffParam"
}

internal fun reportsPath(
    range: String? = null,
    from: String? = null,
    to: String? = null,
): String = buildReportsPath("/api/v1/desktop", range, from, to)

internal fun mobileReportsPath(
    range: String? = null,
    from: String? = null,
    to: String? = null,
): String = buildReportsPath("/api/v1/mobile", range, from, to)

private fun buildReportsPath(prefix: String, range: String?, from: String?, to: String?): String {
    val params = mutableListOf<String>()
    if (!range.isNullOrBlank()) params += "range=$range"
    if (!from.isNullOrBlank()) params += "from=$from"
    if (!to.isNullOrBlank()) params += "to=$to"
    return if (params.isEmpty()) "$prefix/reports" else "$prefix/reports?" + params.joinToString("&")
}

internal fun combineDateTimeToIso(date: String, time: String): String {
    val d = date.trim()
    val t = time.trim().ifBlank { "09:00" }
    if (d.isBlank()) return ""
    // Server accepts ISO datetimes; send local Colombo wall-time as ISO without offset
    // and let the API parse it. Fall back to raw concat when format is unexpected.
    return runCatching {
        val normalizedTime = if (t.length == 5 && t[2] == ':') "$t:00" else t
        "${d}T$normalizedTime"
    }.getOrDefault("")
}

/** Prefer `YYYY-MM-DDTHH:mm:ss` (optional trailing Z) for deal/broadcast windows. */
internal fun normalizeIsoDateTime(value: String): String {
    val trimmed = value.trim()
    if (trimmed.isBlank()) return trimmed
    val hasZ = trimmed.endsWith("Z", ignoreCase = true)
    val core = if (hasZ) trimmed.dropLast(1) else trimmed
    val withSeconds = when {
        Regex("""^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$""").matches(core) -> "$core:00"
        Regex("""^\d{4}-\d{2}-\d{2}$""").matches(core) -> "${core}T09:00:00"
        else -> core
    }
    return if (hasZ) "${withSeconds}Z" else withSeconds
}

internal fun JSONObject.toLoginResult() = LoginResult(
    deviceKey = optString("mobileKey").ifBlank { optString("desktopKey") }.ifBlank { optString("deviceKey") },
    auth = getJSONObject("auth").toAuthSummary(),
    business = getJSONObject("business").toBusinessSummary(),
    user = getJSONObject("user").toUserSummary(),
)

private fun JSONObject.toBootstrapResult() = BootstrapResult(
    business = getJSONObject("business").toBusinessSummary(),
    auth = getJSONObject("auth").toAuthSummary(),
    staff = optJSONArray("staff").toList { it.toStaffSummary() },
    serverTime = optString("serverTime"),
)

private fun JSONObject.toBookingsResult() = BookingsResult(
    tab = optString("tab", "today"),
    rows = optJSONArray("rows").toList { it.toBookingSummary() },
    serverTime = optString("serverTime"),
)

private fun JSONObject.toStatusUpdateResult() = StatusUpdateResult(
    id = optString("id").ifBlank { optString("bookingId") },
    status = optString("status").ifBlank { "cancelled" },
    revisionTs = optString("revisionTs"),
)

internal fun CreateBookingRequest.toJson(): JSONObject {
    val json = JSONObject()
        .put("clientName", clientName)
        .put("clientPhone", clientPhone)
        .put("serviceId", serviceId)
        .put("startsAt", startsAt)
    if (!clientEmail.isNullOrBlank()) json.put("clientEmail", clientEmail)
    if (!staffId.isNullOrBlank()) json.put("staffId", staffId)
    if (!notes.isNullOrBlank()) json.put("notes", notes)
    return json
}

internal fun UpdateBookingRequest.toJson(): JSONObject {
    val json = JSONObject()
    if (!clientName.isNullOrBlank()) json.put("clientName", clientName)
    if (!clientPhone.isNullOrBlank()) json.put("clientPhone", clientPhone)
    if (!clientEmail.isNullOrBlank()) json.put("clientEmail", clientEmail)
    if (!serviceId.isNullOrBlank()) json.put("serviceId", serviceId)
    if (!staffId.isNullOrBlank()) json.put("staffId", staffId)
    if (!startsAt.isNullOrBlank()) json.put("startsAt", startsAt)
    if (!notes.isNullOrBlank()) json.put("notes", notes)
    if (!status.isNullOrBlank()) json.put("status", status)
    return json
}

internal fun ClientUpsertRequest.toJson(): JSONObject {
    val json = JSONObject().put("name", name)
    if (!phone.isNullOrBlank()) json.put("phone", phone)
    if (!email.isNullOrBlank()) json.put("email", email)
    if (!stage.isNullOrBlank()) json.put("stage", stage)
    if (!source.isNullOrBlank()) json.put("source", source)
    if (!notes.isNullOrBlank()) json.put("notes", notes)
    return json
}

internal fun ServiceUpsertRequest.toJson(): JSONObject {
    val json = JSONObject().put("name", name)
    if (!description.isNullOrBlank()) json.put("description", description)
    if (priceLkr != null) json.put("priceLkr", priceLkr)
    if (durationMinutes != null) json.put("durationMinutes", durationMinutes)
    if (isActive != null) json.put("isActive", isActive)
    if (isPublished != null) json.put("isPublished", isPublished)
    return json
}

internal fun StaffUpsertRequest.toJson(): JSONObject {
    val json = JSONObject().put("name", name)
    if (!email.isNullOrBlank()) json.put("email", email)
    if (!phone.isNullOrBlank()) json.put("phone", phone)
    if (isActive != null) json.put("isActive", isActive)
    return json
}

internal fun LocationUpsertRequest.toJson(): JSONObject {
    val json = JSONObject().put("name", name)
    if (!address.isNullOrBlank()) json.put("address", address)
    if (!timezone.isNullOrBlank()) json.put("timezone", timezone)
    if (!phone.isNullOrBlank()) json.put("phone", phone)
    if (isActive != null) json.put("isActive", isActive)
    if (isDefault != null) json.put("isDefault", isDefault)
    return json
}

internal fun CreateDealRequest.toJson(): JSONObject {
    val json = JSONObject()
        .put("serviceId", serviceId)
        .put("locationId", locationId)
        .put("discountPercent", discountPercent)
        .put("slotsTotal", slotsTotal)
        .put("dealWindowStart", normalizeIsoDateTime(dealWindowStart))
        .put("dealWindowEnd", normalizeIsoDateTime(dealWindowEnd))
        .put("apptWindowStart", normalizeIsoDateTime(apptWindowStart))
        .put("apptWindowEnd", normalizeIsoDateTime(apptWindowEnd))
        .put("notifyClients", notifyClients)
    if (!staffId.isNullOrBlank()) json.put("staffId", staffId)
    return json
}

internal fun CreateBroadcastRequest.toJson(): JSONObject {
    val json = JSONObject()
        .put("name", name)
        .put("channel", channel.trim().lowercase())
        .put("body", body)
        .put("audienceType", audienceType.trim().lowercase().ifBlank { "all" })
        .put("sendNow", sendNow)
    if (!subject.isNullOrBlank()) json.put("subject", subject)
    val type = audienceType.trim().lowercase()
    if (type == "stage" && !audienceStage.isNullOrBlank()) {
        json.put("audienceFilter", JSONObject().put("stage", audienceStage.trim()))
    } else if (type == "tags") {
        val tags = audienceTags.orEmpty().map { it.trim() }.filter { it.isNotEmpty() }
        if (tags.isNotEmpty()) {
            val arr = JSONArray()
            tags.forEach { arr.put(it) }
            json.put("audienceFilter", JSONObject().put("tags", arr))
        }
    }
    return json
}

internal fun JSONObject.toClientDetail(): ClientDetail {
    val client = optJSONObject("client") ?: this
    return ClientDetail(
        id = client.optString("id").ifBlank { optString("id") },
        name = client.optString("name").ifBlank { optString("name") },
        phone = client.optString("phone"),
        email = client.optString("email"),
        stage = client.optString("stage").takeIf { it.isNotBlank() },
        source = client.optString("source").takeIf { it.isNotBlank() },
        loyaltyTier = client.optString("loyaltyTier").takeIf { it.isNotBlank() },
        totalBookings = client.optInt("totalBookings"),
        lastBookingAt = client.optString("lastBookingAt").takeIf { it.isNotBlank() },
    )
}

internal fun JSONObject.toServiceDetail(): ServiceDetail {
    val service = optJSONObject("service") ?: this
    return ServiceDetail(
        id = service.optString("id").ifBlank { optString("id") },
        name = service.optString("name").ifBlank { optString("name") },
        description = service.optString("description"),
        priceLkr = if (service.has("priceLkr") && !service.isNull("priceLkr")) service.optInt("priceLkr") else null,
        durationMinutes = if (service.has("durationMinutes") && !service.isNull("durationMinutes")) {
            service.optInt("durationMinutes")
        } else {
            null
        },
        isActive = service.optBoolean("isActive", true),
        isPublished = service.optBoolean("isPublished", true),
    )
}

internal fun JSONObject.toStaffDetail(): StaffDetail {
    val staff = optJSONObject("staff") ?: this
    return StaffDetail(
        id = staff.optString("id").ifBlank { optString("id") },
        name = staff.optString("name").ifBlank { optString("name") },
        email = staff.optString("email"),
        phone = staff.optString("phone"),
        isActive = staff.optBoolean("isActive", true),
        primaryLocationName = staff.optString("primaryLocationName").takeIf { it.isNotBlank() },
    )
}

internal fun JSONObject.toLocationDetail(): LocationDetail {
    val location = optJSONObject("location") ?: this
    return LocationDetail(
        id = location.optString("id").ifBlank { optString("id") },
        name = location.optString("name").ifBlank { optString("name") },
        address = location.optString("address"),
        timezone = location.optString("timezone", "Asia/Colombo"),
        phone = location.optString("phone"),
        isActive = location.optBoolean("isActive", true),
    )
}

internal fun JSONObject.toReviewDetail(): ReviewDetail {
    val review = optJSONObject("review") ?: this
    return ReviewDetail(
        id = review.optString("id").ifBlank { optString("id") },
        clientName = review.optString("clientName").ifBlank { optString("clientName") },
        rating = if (review.has("rating") && !review.isNull("rating")) review.optInt("rating") else null,
        comment = review.optString("comment"),
        serviceName = review.optString("serviceName"),
        ownerReply = review.optString("ownerReply").takeIf { it.isNotBlank() },
        isPublished = review.optBoolean("isPublished", true),
        createdAt = review.optString("createdAt"),
    )
}

internal fun JSONObject.toPaymentDetail(): PaymentDetail {
    val payment = optJSONObject("payment") ?: this
    return PaymentDetail(
        id = payment.optString("id").ifBlank { optString("id") },
        orderId = payment.optString("orderId"),
        clientName = payment.optString("clientName"),
        serviceName = payment.optString("serviceName"),
        staffName = payment.optString("staffName"),
        amountLkr = if (payment.has("amountLkr") && !payment.isNull("amountLkr")) payment.optInt("amountLkr") else null,
        status = payment.optString("status"),
        createdAt = payment.optString("createdAt"),
    )
}

internal fun JSONObject.toBroadcastResult(): BroadcastResult {
    val broadcast = optJSONObject("broadcast") ?: this
    return BroadcastResult(
        id = broadcast.optString("id").ifBlank { optString("id") },
        status = broadcast.optString("status").ifBlank { "queued" },
        recipientCount = broadcast.optInt("recipientCount"),
        channel = broadcast.optString("channel"),
    )
}

internal fun JSONObject.toBroadcastCreateResult(): BroadcastCreateResult {
    val broadcast = optJSONObject("broadcast") ?: this
    return BroadcastCreateResult(
        id = broadcast.optString("id").ifBlank { optString("id") },
        status = broadcast.optString("status").ifBlank { "draft" },
        name = broadcast.optString("name"),
    )
}

internal fun JSONObject.toDealDetail(): DealDetail {
    val deal = optJSONObject("deal") ?: this
    val service = optJSONObject("service")
    val location = optJSONObject("location")
    val staff = optJSONObject("staff")
    val notifiedValue = when {
        has("notified") && !isNull("notified") -> optInt("notified")
        deal.has("notified") && !deal.isNull("notified") -> deal.optInt("notified")
        else -> null
    }
    return DealDetail(
        id = deal.optString("id").ifBlank { optString("id") },
        serviceId = deal.optString("serviceId").ifBlank { service?.optString("id").orEmpty() },
        locationId = deal.optString("locationId").ifBlank { location?.optString("id").orEmpty() },
        staffId = deal.optString("staffId").ifBlank { staff?.optString("id").orEmpty() }.takeIf { it.isNotBlank() },
        discountPercent = deal.optInt("discountPercent"),
        slotsTotal = deal.optInt("slotsTotal"),
        slotsRedeemed = deal.optInt("slotsRedeemed"),
        dealWindowStart = deal.optString("dealWindowStart"),
        dealWindowEnd = deal.optString("dealWindowEnd"),
        apptWindowStart = deal.optString("apptWindowStart"),
        apptWindowEnd = deal.optString("apptWindowEnd"),
        status = deal.optString("status").ifBlank { "active" },
        serviceName = deal.optString("serviceName").ifBlank { service?.optString("name").orEmpty() },
        locationName = deal.optString("locationName").ifBlank { location?.optString("name").orEmpty() },
        notified = notifiedValue,
    )
}

internal fun JSONObject.toAutomationToggleResult(): AutomationToggleResult {
    val automation = optJSONObject("automation") ?: this
    return AutomationToggleResult(
        id = automation.optString("id").ifBlank { optString("id") },
        isActive = automation.optBoolean("isActive", true),
    )
}

internal fun JSONObject.toReportPayload(): ReportPayload {
    val reports = optJSONObject("reports") ?: this
    val metricsArr = reports.optJSONArray("metrics") ?: optJSONArray("metrics")
    val metricsObj = if (metricsArr == null) {
        reports.optJSONObject("metrics") ?: optJSONObject("metrics")
    } else {
        null
    }
    val metrics = if (metricsArr != null) {
        metricsArr.toList { obj ->
            ReportMetric(
                label = obj.optString("label"),
                value = obj.opt("value")?.toString().orEmpty(),
            )
        }
    } else {
        metricsObj?.toMetricList().orEmpty().map { metric ->
            ReportMetric(label = metric.label, value = metric.value)
        }
    }
    return ReportPayload(
        range = reports.reportsRangeText(),
        metrics = metrics,
        serverTime = optString("serverTime"),
        webPath = optString("webPath").ifBlank { optString("webUrl").ifBlank { "/dashboard/reports" } },
    )
}

private fun JSONObject.reportsRangeText(): String {
    val preset = optString("preset").ifBlank { optString("rangePreset") }
    if (preset.isNotBlank() && this.opt("range") !is JSONObject) {
        return preset
    }
    val rangeValue = opt("range")
    if (rangeValue is JSONObject) {
        val from = rangeValue.optString("from")
        val to = rangeValue.optString("to")
        return listOf(from, to).filter { it.isNotBlank() }.joinToString(" to ").ifBlank { "30d" }
    }
    val asString = optString("range")
    return asString.ifBlank { "30d" }
}

private data class DesktopModuleLabels(
    val emptyState: String,
    val summary: String,
    val title: String,
    val webPath: String,
)

private val desktopModuleLabels = mapOf(
    "ai" to DesktopModuleLabels(
        emptyState = "No AI workflow activity yet.",
        summary = "Generated replies, growth workflows, and AI activity.",
        title = "AI Hub",
        webPath = "/dashboard/ai",
    ),
    "automations" to DesktopModuleLabels(
        emptyState = "No automations configured yet.",
        summary = "Automation rules and enablement state.",
        title = "Automations",
        webPath = "/dashboard/automations",
    ),
    "availability" to DesktopModuleLabels(
        emptyState = "No availability windows configured yet.",
        summary = "Weekly working windows by active staff member.",
        title = "Availability",
        webPath = "/dashboard/availability",
    ),
    "billing" to DesktopModuleLabels(
        emptyState = "No subscription records found.",
        summary = "Current plan and billing subscription state.",
        title = "Plan & billing",
        webPath = "/dashboard/billing",
    ),
    "broadcasts" to DesktopModuleLabels(
        emptyState = "No broadcasts created yet.",
        summary = "Campaign broadcasts and delivery summaries.",
        title = "Broadcasts",
        webPath = "/dashboard/broadcasts",
    ),
    "calendar" to DesktopModuleLabels(
        emptyState = "No bookings scheduled for today.",
        summary = "Today calendar with staff and booking status.",
        title = "Calendar",
        webPath = "/dashboard/calendar",
    ),
    "clients" to DesktopModuleLabels(
        emptyState = "No clients found yet.",
        summary = "Client CRM records and stages.",
        title = "Clients",
        webPath = "/dashboard/clients",
    ),
    "deals" to DesktopModuleLabels(
        emptyState = "No deals created yet.",
        summary = "Deal status, slot usage, and impressions.",
        title = "Deals",
        webPath = "/dashboard/deals",
    ),
    "integrations" to DesktopModuleLabels(
        emptyState = "No integrations connected yet.",
        summary = "Connected provider and voice integration status.",
        title = "Integrations",
        webPath = "/dashboard/settings/integrations",
    ),
    "locations" to DesktopModuleLabels(
        emptyState = "No locations configured yet.",
        summary = "Branch coverage and active location status.",
        title = "Locations",
        webPath = "/dashboard/locations",
    ),
    "marketing" to DesktopModuleLabels(
        emptyState = "No marketing assets configured yet.",
        summary = "Directory listing, social channels, and content calendar.",
        title = "Marketing",
        webPath = "/dashboard/marketing",
    ),
    "overview" to DesktopModuleLabels(
        emptyState = "No activity yet.",
        summary = "Business health and current day activity.",
        title = "Overview",
        webPath = "/dashboard",
    ),
    "payments" to DesktopModuleLabels(
        emptyState = "No payments found yet.",
        summary = "Recent payments and payment status.",
        title = "Payments",
        webPath = "/dashboard/payments",
    ),
    "reports" to DesktopModuleLabels(
        emptyState = "No report metrics recorded yet.",
        summary = "Recent operating metrics and revenue snapshots.",
        title = "Reports",
        webPath = "/dashboard/reports",
    ),
    "reviews" to DesktopModuleLabels(
        emptyState = "No reviews collected yet.",
        summary = "Published reviews, ratings, and replies.",
        title = "Reviews",
        webPath = "/dashboard/reviews",
    ),
    "services" to DesktopModuleLabels(
        emptyState = "No services configured yet.",
        summary = "Service catalog, pricing, duration, and public availability.",
        title = "Services",
        webPath = "/dashboard/services",
    ),
    "settings" to DesktopModuleLabels(
        emptyState = "No desktop devices found.",
        summary = "Business profile and desktop device access.",
        title = "Settings",
        webPath = "/dashboard/settings",
    ),
    "staff" to DesktopModuleLabels(
        emptyState = "No staff members configured yet.",
        summary = "Active staff and appointment load.",
        title = "Staff",
        webPath = "/dashboard/staff",
    ),
)

private fun labelsFor(module: String) = desktopModuleLabels[module]
    ?: DesktopModuleLabels(
        emptyState = "Nothing to show yet.",
        summary = "Dinaya dashboard workspace.",
        title = labelFromKey(module),
        webPath = "/dashboard",
    )

internal fun JSONObject.toDesktopModulePayload(moduleKey: String): DesktopModulePayload {
    val labels = labelsFor(moduleKey)
    val genericMetrics = optJSONArray("metrics")
    val genericItems = optJSONArray("items")
    if (genericMetrics != null || genericItems != null || optString("title").isNotBlank()) {
        return DesktopModulePayload(
            emptyState = optString("emptyState", labels.emptyState),
            items = genericItems.toList { it.toModuleItem() },
            metrics = genericMetrics.toList { it.toModuleMetric() },
            module = optString("module", moduleKey),
            refreshedAt = optString("refreshedAt").ifBlank { optString("serverTime") },
            summary = optString("summary", labels.summary),
            title = optString("title", labels.title),
            webPath = optString("webPath").ifBlank { labels.webPath },
        )
    }

    return DesktopModulePayload(
        emptyState = labels.emptyState,
        items = toTypedModuleItems(moduleKey),
        metrics = toTypedModuleMetrics(moduleKey),
        module = moduleKey,
        refreshedAt = optString("serverTime"),
        summary = labels.summary,
        title = labels.title,
        webPath = optString("webUrl").ifBlank { labels.webPath },
    )
}

private fun JSONObject.toModuleMetric() = ModuleMetric(
    label = optString("label"),
    value = opt("value")?.toString().orEmpty(),
    detail = nullableString("detail"),
    tone = nullableString("tone"),
)

private fun JSONObject.toModuleItem() = ModuleItem(
    id = optString("id"),
    title = optString("title"),
    subtitle = nullableString("subtitle"),
    meta = nullableString("meta"),
    status = nullableString("status"),
)

private fun JSONObject.toTypedModuleMetrics(moduleKey: String): List<ModuleMetric> {
    optJSONObject("summary")?.toMetricList()?.takeIf { it.isNotEmpty() }?.let { return it }
    optJSONObject("metrics")?.toMetricList()?.takeIf { it.isNotEmpty() }?.let { return it }

    return when (moduleKey) {
        "availability" -> {
            val members = optJSONArray("members")
            val windowCount = members.sumArrayLengths("windows")
            val overrideCount = members.sumArrayLengths("overrides")
            listOf(
                ModuleMetric("Staff", members.lengthText(), null, "cobalt"),
                ModuleMetric("Windows", windowCount.toString(), null, "emerald"),
                ModuleMetric("Overrides", overrideCount.toString(), null, "amber"),
            )
        }
        "billing" -> listOf(
            ModuleMetric("Plan", optJSONObject("business")?.optString("plan").orEmpty().ifBlank { "Unknown" }, null, "cobalt"),
            ModuleMetric("Subscriptions", optJSONArray("subscriptions").lengthText(), null, "slate"),
            ModuleMetric("Usage items", optJSONArray("usage").lengthText(), null, "emerald"),
        )
        "calendar" -> listOf(
            ModuleMetric("Bookings", optJSONArray("rows").lengthText(), null, "cobalt"),
            ModuleMetric("Staff", optJSONArray("staff").lengthText(), null, "emerald"),
        )
        "settings" -> optJSONObject("summary")?.toMetricList().orEmpty().ifEmpty {
            listOf(ModuleMetric("Devices", optJSONArray("devices").lengthText(), null, "cobalt"))
        }
        else -> emptyList()
    }
}

private fun JSONObject.toTypedModuleItems(moduleKey: String): List<ModuleItem> {
    return when (moduleKey) {
        "availability" -> optJSONArray("members").toList { it.toAvailabilityMemberItem() }
        "billing" -> {
            val subscriptions = optJSONArray("subscriptions").toList { it.toGenericModuleItem(moduleKey) }
            if (subscriptions.isNotEmpty()) subscriptions else optJSONArray("usage").toList { it.toGenericModuleItem(moduleKey) }
        }
        "settings" -> optJSONArray("devices").toList { it.toGenericModuleItem(moduleKey) }
        else -> optJSONArray("rows").toList { it.toGenericModuleItem(moduleKey) }
    }
}

private fun JSONObject.toAvailabilityMemberItem(): ModuleItem {
    val staff = optJSONObject("staff")
    val windows = optJSONArray("windows")
    val locations = optJSONArray("assignedLocations")
    val overrides = optJSONArray("overrides")
    val overrideCount = overrides?.length() ?: 0
    val title = staff?.firstText("name").orEmpty().ifBlank { "Staff member" }
    val subtitle = listOf(
        "${windows.lengthText()} weekly windows",
        "${locations.lengthText()} locations",
    ).joinToString(" - ")
    val status = if (staff?.optBoolean("isActive", true) == false) "inactive" else "active"

    return ModuleItem(
        id = staff?.optString("id").orEmpty().ifBlank { title },
        title = title,
        subtitle = subtitle,
        meta = if (overrideCount > 0) "$overrideCount upcoming overrides" else null,
        status = status,
    )
}

private fun JSONObject.toGenericModuleItem(moduleKey: String): ModuleItem {
    val title = when (moduleKey) {
        "calendar" -> firstText("clientName", "title", "serviceName")
        "payments" -> firstText("clientName", "orderId", "id")
        "reviews" -> firstText("clientName", "comment", "id")
        "deals" -> firstText("title", "serviceName", "name", "id")
        "broadcasts" -> firstText("name", "subject", "title", "id")
        "integrations" -> firstText("name", "provider", "label", "id")
        "ai" -> firstText("subject", "workflowKey", "feature", "id")
        "automations" -> firstText("name", "eventType", "id")
        "billing" -> firstText("label", "plan", "status", "id")
        "settings" -> firstText("deviceName", "name", "keyType", "id")
        else -> firstText("name", "title", "clientName", "serviceName", "staffName", "locationName", "subject", "id")
    }.ifBlank { "Untitled" }

    val subtitle = when (moduleKey) {
        "calendar" -> firstText("serviceName", "staffName", "locationName")
        "clients" -> firstText("phone", "email", "source", "loyaltyTier")
        "services" -> firstText("description", "priceLkr", "durationMinutes")
        "staff" -> firstText("email", "phone", "primaryLocationName")
        "locations" -> firstText("address", "timezone", "phone")
        "reviews" -> firstText("comment", "serviceName", "rating")
        "payments" -> firstText("serviceName", "amountLkr", "staffName")
        "marketing" -> firstText("description", "channel", "type")
        "deals" -> firstText("discountPercent", "locationName", "staffName")
        "broadcasts" -> firstText("channel", "audienceType", "recipientCount")
        "ai" -> firstText("feature", "provider", "channel")
        "integrations" -> firstText("description", "accountName", "provider")
        "automations" -> firstText("channel", "delayMinutes", "template")
        "billing" -> firstText("billingInterval", "amountLkr", "remaining")
        "settings" -> firstText("lastUsedAt", "createdAt", "expiresAt")
        else -> firstText("description", "email", "phone", "channel", "type")
    }.takeIf { it.isNotBlank() }

    return ModuleItem(
        id = firstText("id", "key", "slug").ifBlank { title },
        title = title,
        subtitle = subtitle,
        meta = firstText("startsAt", "createdAt", "updatedAt", "lastBookingAt", "currentPeriodEnd").takeIf { it.isNotBlank() },
        status = statusText(moduleKey),
    )
}

private fun JSONObject.toMetricList(): List<ModuleMetric> {
    val result = mutableListOf<ModuleMetric>()
    val iterator = keys()
    val tones = listOf("cobalt", "emerald", "amber", "slate")
    while (iterator.hasNext() && result.size < 6) {
        val key = iterator.next()
        if (key == "filters") continue
        val value = metricValueText(opt(key)) ?: continue
        result += ModuleMetric(
            label = labelFromKey(key),
            value = value,
            detail = null,
            tone = tones[result.size % tones.size],
        )
    }
    return result
}

private fun JSONObject.firstText(vararg keys: String): String {
    for (key in keys) {
        val text = valueText(opt(key))
        if (!text.isNullOrBlank()) return text
    }
    return ""
}

private fun JSONObject.statusText(moduleKey: String): String? {
    firstText("status", "displayStatus", "stage", "channel").takeIf { it.isNotBlank() }?.let { return it }
    return when {
        has("isActive") -> if (optBoolean("isActive")) "active" else "inactive"
        has("isPublished") -> if (optBoolean("isPublished")) "published" else "hidden"
        has("isDefault") -> if (optBoolean("isDefault")) "default" else null
        has("revokedAt") && !isNull("revokedAt") -> "revoked"
        moduleKey == "settings" -> "active"
        else -> null
    }
}

private fun JSONArray?.lengthText(): String = (this?.length() ?: 0).toString()

private fun JSONArray?.sumArrayLengths(key: String): Int {
    if (this == null) return 0
    var total = 0
    for (index in 0 until length()) {
        total += optJSONObject(index)?.optJSONArray(key)?.length() ?: 0
    }
    return total
}

private fun metricValueText(value: Any?): String? = when (value) {
    null, JSONObject.NULL -> null
    is Boolean -> if (value) "Yes" else "No"
    is Number -> value.toString()
    is String -> value.ifBlank { null }
    is JSONArray -> value.length().toString()
    is JSONObject -> valueText(value.opt("value"))
        ?: valueText(value.opt("used"))?.let { used ->
            val limit = valueText(value.opt("limit")).orEmpty().ifBlank { "Unlimited" }
            "$used / $limit"
        }
        ?: valueText(value.opt("plan"))
        ?: valueText(value.opt("status"))
    else -> value.toString().takeIf { it.isNotBlank() }
}

private fun valueText(value: Any?): String? = when (value) {
    null, JSONObject.NULL -> null
    is Boolean -> if (value) "Yes" else "No"
    is Number -> value.toString()
    is String -> value.ifBlank { null }
    is JSONArray -> value.length().toString()
    is JSONObject -> valueText(value.opt("name"))
        ?: valueText(value.opt("title"))
        ?: valueText(value.opt("label"))
        ?: valueText(value.opt("status"))
    else -> value.toString().takeIf { it.isNotBlank() }
}

private fun labelFromKey(key: String): String {
    val words = key
        .replace(Regex("([a-z])([A-Z])"), "$1 $2")
        .replace("_", " ")
        .replace("-", " ")
        .split(" ")
        .filter { it.isNotBlank() }

    return words.joinToString(" ") { word ->
        when (word.uppercase()) {
            "AI", "API", "ID", "LKR", "URL" -> word.uppercase()
            else -> word.lowercase().replaceFirstChar { it.uppercase() }
        }
    }
}

private fun JSONObject.toBusinessSummary() = BusinessSummary(
    id = getString("id"),
    name = getString("name"),
    slug = getString("slug"),
    timezone = optString("timezone", "Asia/Colombo"),
    plan = optString("plan", "trial"),
    customDomain = nullableString("customDomain"),
)

private fun JSONObject.toUserSummary() = UserSummary(
    id = getString("id"),
    name = optString("name"),
    email = optString("email"),
    role = optString("role"),
)

private fun JSONObject.toAuthSummary() = AuthSummary(
    keyId = getString("keyId"),
    keyType = optString("keyType"),
    deviceId = optString("deviceId"),
    deviceName = optString("deviceName"),
)

private fun JSONObject.toStaffSummary() = StaffSummary(
    id = getString("id"),
    name = optString("name"),
    isActive = optBoolean("isActive", true),
)

internal fun JSONObject.toBookingSummary() = BookingSummary(
    id = optString("id"),
    clientId = nullableString("clientId"),
    clientName = optString("clientName"),
    clientPhone = optString("clientPhone"),
    clientEmail = optString("clientEmail"),
    serviceName = optString("serviceName"),
    staffId = nullableString("staffId"),
    staffName = optString("staffName"),
    startsAt = optString("startsAt"),
    endsAt = optString("endsAt"),
    status = optString("status"),
    amountLkr = if (has("amountLkr") && !isNull("amountLkr")) optInt("amountLkr") else null,
    paymentStatus = nullableString("paymentStatus"),
    source = nullableString("source"),
    webUrl = optString("webUrl"),
)

internal fun JSONObject.toOverviewPayload(): OverviewPayload {
    val overview = optJSONObject("overview") ?: this
    val statsArr = overview.optJSONArray("stats")
    val todayArr = overview.optJSONArray("todayRows")
    val nextArr = overview.optJSONArray("nextRows")
    val activityArr = overview.optJSONArray("recentActivity")

    return OverviewPayload(
        businessName = overview.optString("businessName"),
        ownerName = overview.nullableString("ownerName"),
        greetingDate = overview.optString("greetingDate"),
        stats = statsArr.toList { obj ->
            OverviewStat(
                label = obj.optString("label"),
                value = obj.opt("value")?.toString().orEmpty(),
                tone = obj.nullableString("tone"),
                delta = obj.nullableString("delta"),
            )
        },
        showStats = overview.optBoolean("showStats", true),
        showShareCard = overview.optBoolean("showShareCard", true),
        bookingUrl = overview.optString("bookingUrl"),
        bookingDisplayUrl = overview.optString("bookingDisplayUrl"),
        whatsappShare = overview.optString("whatsappShare"),
        todayRows = todayArr.toList { it.toBookingSummary() },
        nextRows = nextArr.toList { it.toBookingSummary() },
        recentActivity = activityArr.toList { obj ->
            OverviewActivityItem(
                action = obj.optString("action"),
                createdAt = obj.optString("createdAt"),
                entity = obj.optString("entity"),
            )
        },
    )
}

internal fun JSONObject.toCalendarPayload(): CalendarPayload {
    val daysArr = optJSONArray("days")
    val rowsArr = optJSONArray("rows")
    val staffArr = optJSONArray("staff")

    return CalendarPayload(
        date = optString("date"),
        days = daysArr.toList { obj ->
            CalendarDay(
                date = obj.optString("date"),
                label = obj.optString("label"),
            )
        },
        rows = rowsArr.toList { it.toBookingSummary() },
        staff = staffArr.toList { it.toStaffSummary() },
        timezone = optString("timezone", "Asia/Colombo"),
        view = optString("view", "day"),
    )
}

private fun JSONObject.nullableString(name: String): String? {
    return if (isNull(name)) null else optString(name)
}

internal fun JSONArray?.toAvailabilityMembers(): List<AvailabilityMember> {
    if (this == null) return emptyList()
    return (0 until length()).mapNotNull { index ->
        optJSONObject(index)?.let { member ->
            val staff = member.optJSONObject("staff")
            val staffId = staff?.optString("id").orEmpty()
                .ifBlank { member.optString("staffId").ifBlank { member.optString("id") } }
            val staffName = staff?.optString("name").orEmpty()
                .ifBlank { member.optString("staffName").ifBlank { member.optString("name") } }
            if (staffId.isBlank() && staffName.isBlank()) return@let null
            val windows = member.optJSONArray("windows").toAvailabilityWindows(staffId)
            val overrides = member.optJSONArray("overrides").toAvailabilityOverrides(staffId)
            val locations = member.optJSONArray("assignedLocations").toLocationNames()
            AvailabilityMember(
                staffId = staffId.ifBlank { staffName },
                staffName = staffName.ifBlank { "Staff member" },
                isActive = staff?.optBoolean("isActive", true) ?: member.optBoolean("isActive", true),
                windows = windows,
                overrides = overrides,
                locations = locations,
            )
        }
    }
}

internal fun JSONArray?.toAvailabilityWindows(staffId: String): List<AvailabilityWindow> {
    if (this == null) return emptyList()
    return (0 until length()).mapNotNull { index ->
        optJSONObject(index)?.let { w ->
            val day = w.optInt("dayOfWeek", -1)
            val start = w.optString("startTime").ifBlank { w.optString("start") }
            val end = w.optString("endTime").ifBlank { w.optString("end") }
            if (day !in 0..6 || start.isBlank() || end.isBlank()) return@let null
            AvailabilityWindow(
                id = w.optString("id").ifBlank { "$staffId-$day-$start" },
                dayOfWeek = day,
                startTime = start,
                endTime = end,
            )
        }
    }
}

internal fun JSONArray?.toAvailabilityOverrides(staffId: String): List<AvailabilityOverride> {
    if (this == null) return emptyList()
    return (0 until length()).mapNotNull { index ->
        optJSONObject(index)?.let { o ->
            val date = o.optString("date")
            if (date.isBlank()) return@let null
            AvailabilityOverride(
                id = o.optString("id"),
                staffId = o.optString("staffId").ifBlank { staffId },
                date = date,
                startTime = o.optString("startTime").takeIf { it.isNotBlank() },
                endTime = o.optString("endTime").takeIf { it.isNotBlank() },
                isBlocked = o.optBoolean("isBlocked", true),
                reason = o.optString("reason").takeIf { it.isNotBlank() },
            )
        }
    }
}

internal fun JSONArray?.toLocationNames(): List<String> {
    if (this == null) return emptyList()
    return (0 until length()).mapNotNull { index ->
        optJSONObject(index)?.let { loc ->
            loc.optString("name").takeIf { it.isNotBlank() }
        }
    }
}

internal fun JSONObject.toClientDetail(fallbackId: String): ClientDetailPayload {
    val client = optJSONObject("client") ?: this
    val notesArr = optJSONArray("notes") ?: client.optJSONArray("notes")
    return ClientDetailPayload(
        id = client.optString("id").ifBlank { optString("id").ifBlank { fallbackId } },
        name = client.optString("name").ifBlank { optString("name") },
        phone = client.optString("phone"),
        email = client.optString("email"),
        stage = client.optString("stage").takeIf { it.isNotBlank() },
        source = client.optString("source").takeIf { it.isNotBlank() },
        internalNotes = client.optString("internalNotes").takeIf { it.isNotBlank() },
        notes = notesArr.toClientNotes(),
    )
}

internal fun JSONArray?.toClientNotes(): List<ClientNoteItem> {
    if (this == null) return emptyList()
    return (0 until length()).mapNotNull { index ->
        optJSONObject(index)?.let { n ->
            val body = n.optString("body").ifBlank { n.optString("note") }
            if (body.isBlank()) return@let null
            ClientNoteItem(
                id = n.optString("id"),
                body = body,
                createdAt = n.optString("createdAt"),
            )
        }
    }
}

private inline fun <T> JSONArray?.toList(transform: (JSONObject) -> T): List<T> {
    if (this == null) return emptyList()
    return (0 until length()).mapNotNull { index ->
        optJSONObject(index)?.let(transform)
    }
}
