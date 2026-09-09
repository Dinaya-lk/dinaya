package lk.dinaya.mobile.data

import org.junit.Assert.assertEquals
import org.junit.Test

class DinayaApiClientTest {
    @Test
    fun resolveDinayaUrlNormalizesBaseAndPath() {
        val url = resolveDinayaUrl("https://dinaya.lk/", "/api/v1/desktop/bootstrap")

        assertEquals("https://dinaya.lk/api/v1/desktop/bootstrap", url.toString())
    }

    @Test
    fun resolveDinayaUrlAcceptsPathWithoutSlash() {
        val url = resolveDinayaUrl("https://dinaya.lk", "api/v1/desktop/bookings")

        assertEquals("https://dinaya.lk/api/v1/desktop/bookings", url.toString())
    }

    @Test
    fun resolveDinayaUrlNormalizesLocalhostToIPv4() {
        val url = resolveDinayaUrl("http://localhost:3002", "/api/v1/desktop/overview")

        assertEquals("http://127.0.0.1:3002/api/v1/desktop/overview", url.toString())
    }

    @Test
    fun desktopModulePathUsesDesktopApiWithCompactLimit() {
        assertEquals("/api/v1/desktop/services?limit=40", desktopModulePath("services"))
    }

    @Test
    fun toBookingSummaryParsesFullFields() {
        val json = org.json.JSONObject("""
            {
                "id": "b_123",
                "clientId": "c_456",
                "clientName": "Kasun Perera",
                "clientPhone": "+94771234567",
                "clientEmail": "kasun@example.com",
                "serviceName": "Haircut & Styling",
                "staffId": "s_789",
                "staffName": "Amal Silva",
                "startsAt": "2026-09-04T10:00:00Z",
                "endsAt": "2026-09-04T10:45:00Z",
                "status": "confirmed",
                "amountLkr": 3500,
                "paymentStatus": "paid",
                "source": "online",
                "webUrl": "https://dinaya.lk/dashboard/bookings?id=b_123"
            }
        """.trimIndent())

        val booking = json.toBookingSummary()
        assertEquals("b_123", booking.id)
        assertEquals("c_456", booking.clientId)
        assertEquals("Kasun Perera", booking.clientName)
        assertEquals("+94771234567", booking.clientPhone)
        assertEquals("kasun@example.com", booking.clientEmail)
        assertEquals("Haircut & Styling", booking.serviceName)
        assertEquals("s_789", booking.staffId)
        assertEquals("Amal Silva", booking.staffName)
        assertEquals("2026-09-04T10:00:00Z", booking.startsAt)
        assertEquals("2026-09-04T10:45:00Z", booking.endsAt)
        assertEquals("confirmed", booking.status)
        assertEquals(3500, booking.amountLkr)
        assertEquals("paid", booking.paymentStatus)
        assertEquals("online", booking.source)
    }

    @Test
    fun toOverviewPayloadParsesStatsAndShareDetails() {
        val json = org.json.JSONObject("""
            {
                "overview": {
                    "businessName": "Salon Dinaya",
                    "ownerName": "Nimal",
                    "greetingDate": "Friday, September 4",
                    "stats": [
                        { "label": "Today Bookings", "value": "12", "tone": "emerald", "delta": "+3 vs yesterday" },
                        { "label": "Today Revenue", "value": "Rs. 24,500", "tone": "emerald", "delta": null }
                    ],
                    "showStats": true,
                    "showShareCard": true,
                    "bookingUrl": "https://dinaya.lk/book/salon-dinaya",
                    "bookingDisplayUrl": "dinaya.lk/book/salon-dinaya",
                    "whatsappShare": "Book online at https://dinaya.lk/book/salon-dinaya",
                    "todayRows": [
                        { "id": "b_1", "clientName": "Sunil", "serviceName": "Massage", "startsAt": "11:00", "status": "confirmed" }
                    ],
                    "nextRows": [],
                    "recentActivity": [
                        { "action": "created", "createdAt": "2026-09-04T09:00:00Z", "entity": "Booking b_1" }
                    ]
                }
            }
        """.trimIndent())

        val overview = json.toOverviewPayload()
        assertEquals("Salon Dinaya", overview.businessName)
        assertEquals("Nimal", overview.ownerName)
        assertEquals("Friday, September 4", overview.greetingDate)
        assertEquals(2, overview.stats.size)
        assertEquals("Today Bookings", overview.stats[0].label)
        assertEquals("12", overview.stats[0].value)
        assertEquals("emerald", overview.stats[0].tone)
        assertEquals("+3 vs yesterday", overview.stats[0].delta)
        assertEquals(true, overview.showShareCard)
        assertEquals("dinaya.lk/book/salon-dinaya", overview.bookingDisplayUrl)
        assertEquals(1, overview.todayRows.size)
        assertEquals("Sunil", overview.todayRows[0].clientName)
        assertEquals(1, overview.recentActivity.size)
        assertEquals("created", overview.recentActivity[0].action)
    }

    @Test
    fun toCalendarPayloadParsesDaysStaffAndRows() {
        val json = org.json.JSONObject("""
            {
                "date": "2026-09-04",
                "days": [
                    { "date": "2026-09-04", "label": "Fri 04" },
                    { "date": "2026-09-05", "label": "Sat 05" }
                ],
                "staff": [
                    { "id": "s_1", "name": "Kamal", "isActive": true }
                ],
                "rows": [
                    { "id": "b_1", "clientName": "Rohan", "serviceName": "Consultation", "startsAt": "14:00", "status": "pending" }
                ],
                "timezone": "Asia/Colombo",
                "view": "week"
            }
        """.trimIndent())

        val calendar = json.toCalendarPayload()
        assertEquals("2026-09-04", calendar.date)
        assertEquals(2, calendar.days.size)
        assertEquals("Fri 04", calendar.days[0].label)
        assertEquals(1, calendar.staff.size)
        assertEquals("Kamal", calendar.staff[0].name)
        assertEquals(1, calendar.rows.size)
        assertEquals("pending", calendar.rows[0].status)
        assertEquals("Asia/Colombo", calendar.timezone)
        assertEquals("week", calendar.view)
    }

    @Test
    fun themePreferenceEnumValuesMatchExpectedStorageKeys() {
        assertEquals("SYSTEM", ThemePreference.SYSTEM.name)
        assertEquals("LIGHT", ThemePreference.LIGHT.name)
        assertEquals("DARK", ThemePreference.DARK.name)
        assertEquals(ThemePreference.SYSTEM, ThemePreference.valueOf("SYSTEM"))
    }

    @Test
    fun bookingsPathOmitsStatusAll() {
        val path = bookingsPath(tab = "today", status = "all")
        assertEquals("/api/v1/desktop/bookings?tab=today&limit=60", path)
    }

    @Test
    fun bookingsPathIncludesSpecificStatus() {
        val path = bookingsPath(tab = "upcoming", status = "confirmed")
        assertEquals("/api/v1/desktop/bookings?tab=upcoming&limit=60&status=confirmed", path)
    }

    @Test
    fun bookingsPathEncodesQueryParameter() {
        val path = bookingsPath(tab = "today", query = "Kasun Perera", status = "pending")
        assertEquals("/api/v1/desktop/bookings?tab=today&limit=60&q=Kasun+Perera&status=pending", path)
    }

    @Test
    fun mobileFallbackForMapsDesktopToMobile() {
        assertEquals(
            "/api/v1/mobile/bookings?tab=today&limit=60",
            mobileFallbackFor("/api/v1/desktop/bookings?tab=today&limit=60"),
        )
        assertEquals("/api/v1/mobile/overview", mobileFallbackFor("/api/v1/desktop/overview"))
    }

    @Test
    fun mobileFallbackForReturnsNullForNonDesktopPaths() {
        assertEquals(null, mobileFallbackFor("/api/v1/mobile/overview"))
        assertEquals(null, mobileFallbackFor("/api/book/salon"))
    }

    @Test
    fun mobilePathAndDesktopPathBuildPrefixedRoutes() {
        assertEquals("/api/v1/mobile/bootstrap", mobilePath("bootstrap"))
        assertEquals("/api/v1/mobile/bookings/b_1", mobilePath("/bookings/b_1"))
        assertEquals("/api/v1/mobile/auth/login", mobilePath("auth/login"))
        assertEquals("/api/v1/desktop/bootstrap", desktopPath("bootstrap"))
    }

    @Test
    fun desktopFallbackForMapsMobileToDesktop() {
        assertEquals(
            "/api/v1/desktop/bookings?tab=today&limit=60",
            desktopFallbackFor("/api/v1/mobile/bookings?tab=today&limit=60"),
        )
        assertEquals("/api/v1/desktop/overview", desktopFallbackFor("/api/v1/mobile/overview"))
        assertEquals(
            "/api/v1/desktop/auth/login",
            desktopFallbackFor("/api/v1/mobile/auth/login"),
        )
    }

    @Test
    fun desktopFallbackForReturnsNullForNonMobilePaths() {
        assertEquals(null, desktopFallbackFor("/api/v1/desktop/overview"))
        assertEquals(null, desktopFallbackFor("/api/book/salon"))
    }

    @Test
    fun toLoginResultPrefersMobileKey() {
        val json = org.json.JSONObject(
            """
            {
                "mobileKey": "mk_preferred",
                "desktopKey": "dk_ignored",
                "deviceKey": "vk_ignored",
                "auth": { "keyId": "k_1", "keyType": "mobile", "deviceId": "d_1", "deviceName": "Pixel" },
                "business": { "id": "b_1", "name": "Salon", "slug": "salon", "timezone": "Asia/Colombo", "plan": "pro" },
                "user": { "id": "u_1", "name": "Nimal", "email": "nimal@example.com", "role": "owner" }
            }
            """.trimIndent(),
        )

        assertEquals("mk_preferred", json.toLoginResult().deviceKey)
    }

    @Test
    fun toLoginResultWithOnlyMobileKey() {
        val json = org.json.JSONObject(
            """
            {
                "mobileKey": "mk_only",
                "auth": { "keyId": "k_1", "keyType": "mobile", "deviceId": "d_1", "deviceName": "Pixel" },
                "business": { "id": "b_1", "name": "Salon", "slug": "salon" },
                "user": { "id": "u_1", "name": "Nimal", "email": "nimal@example.com", "role": "owner" }
            }
            """.trimIndent(),
        )

        val result = json.toLoginResult()
        assertEquals("mk_only", result.deviceKey)
        assertEquals("k_1", result.auth.keyId)
        assertEquals("Salon", result.business.name)
        assertEquals("nimal@example.com", result.user.email)
    }

    @Test
    fun toLoginResultFallsBackToDesktopKeyThenDeviceKey() {
        val desktopOnly = org.json.JSONObject(
            """
            {
                "desktopKey": "dk_fallback",
                "deviceKey": "vk_ignored",
                "auth": { "keyId": "k_1", "keyType": "desktop", "deviceId": "d_1", "deviceName": "Mac" },
                "business": { "id": "b_1", "name": "Salon", "slug": "salon" },
                "user": { "id": "u_1", "name": "Nimal", "email": "nimal@example.com", "role": "owner" }
            }
            """.trimIndent(),
        )
        assertEquals("dk_fallback", desktopOnly.toLoginResult().deviceKey)

        val deviceOnly = org.json.JSONObject(
            """
            {
                "deviceKey": "vk_last",
                "auth": { "keyId": "k_1", "keyType": "mobile", "deviceId": "d_1", "deviceName": "Pixel" },
                "business": { "id": "b_1", "name": "Salon", "slug": "salon" },
                "user": { "id": "u_1", "name": "Nimal", "email": "nimal@example.com", "role": "owner" }
            }
            """.trimIndent(),
        )
        assertEquals("vk_last", deviceOnly.toLoginResult().deviceKey)
    }

    @Test
    fun mobileBookingsPathMirrorsDesktopShape() {
        assertEquals("/api/v1/mobile/bookings?tab=today&limit=60", mobileBookingsPath())
        assertEquals(
            "/api/v1/mobile/bookings?tab=upcoming&limit=60&status=confirmed",
            mobileBookingsPath(tab = "upcoming", status = "confirmed"),
        )
    }

    @Test
    fun mobileModulePathUsesMobileApiWithCompactLimit() {
        assertEquals("/api/v1/mobile/services?limit=40", mobileModulePath("services"))
    }

    @Test
    fun calendarPathBuildsDesktopQuery() {
        assertEquals(
            "/api/v1/desktop/calendar?view=week&date=2026-09-04&staffId=s_1",
            calendarPath(view = "week", date = "2026-09-04", staffId = "s_1"),
        )
        assertEquals("/api/v1/desktop/calendar?view=day", calendarPath())
    }

    @Test
    fun mobileCalendarPathBuildsMobileQuery() {
        assertEquals(
            "/api/v1/mobile/calendar?view=day&date=2026-09-04",
            mobileCalendarPath(date = "2026-09-04"),
        )
    }

    @Test
    fun reportsPathBuildsRangeQuery() {
        assertEquals("/api/v1/desktop/reports", reportsPath())
        assertEquals("/api/v1/desktop/reports?range=30d", reportsPath(range = "30d"))
        assertEquals(
            "/api/v1/mobile/reports?from=2026-08-01&to=2026-08-31",
            mobileReportsPath(from = "2026-08-01", to = "2026-08-31"),
        )
    }

    @Test
    fun createBookingRequestSerializesRequiredFields() {
        val body = CreateBookingRequest(
            clientName = "Kasun Perera",
            clientPhone = "+94771234567",
            serviceId = "svc_1",
            startsAt = "2026-09-04T10:00:00Z",
        ).toJson()

        assertEquals("Kasun Perera", body.getString("clientName"))
        assertEquals("+94771234567", body.getString("clientPhone"))
        assertEquals("svc_1", body.getString("serviceId"))
        assertEquals("2026-09-04T10:00:00Z", body.getString("startsAt"))
        assertEquals(false, body.has("clientEmail"))
        assertEquals(false, body.has("staffId"))
        assertEquals(false, body.has("notes"))
    }

    @Test
    fun createBookingRequestSerializesOptionalFields() {
        val body = CreateBookingRequest(
            clientName = "Kasun",
            clientPhone = "+94770000000",
            clientEmail = "kasun@example.com",
            serviceId = "svc_1",
            staffId = "s_1",
            startsAt = "2026-09-04T10:00:00Z",
            notes = "Prefers mornings",
        ).toJson()

        assertEquals("kasun@example.com", body.getString("clientEmail"))
        assertEquals("s_1", body.getString("staffId"))
        assertEquals("Prefers mornings", body.getString("notes"))
    }

    @Test
    fun updateBookingRequestOmitsBlankFields() {
        val body = UpdateBookingRequest(status = "confirmed", notes = "Called back").toJson()

        assertEquals("confirmed", body.getString("status"))
        assertEquals("Called back", body.getString("notes"))
        assertEquals(false, body.has("clientName"))
        assertEquals(false, body.has("startsAt"))
    }

    @Test
    fun locationUpsertRequestSerializesRequiredAndOptionalFields() {
        val body = LocationUpsertRequest(
            name = "Colombo Branch",
            address = "Galle Road",
            timezone = "Asia/Colombo",
            phone = "+94112345678",
            isActive = true,
            isDefault = true,
        ).toJson()

        assertEquals("Colombo Branch", body.getString("name"))
        assertEquals("Galle Road", body.getString("address"))
        assertEquals("Asia/Colombo", body.getString("timezone"))
        assertEquals("+94112345678", body.getString("phone"))
        assertEquals(true, body.getBoolean("isActive"))
        assertEquals(true, body.getBoolean("isDefault"))
    }

    @Test
    fun locationUpsertRequestOmitsBlankOptionals() {
        val body = LocationUpsertRequest(name = "Kandy").toJson()

        assertEquals("Kandy", body.getString("name"))
        assertEquals(false, body.has("address"))
        assertEquals(false, body.has("timezone"))
        assertEquals(false, body.has("phone"))
        assertEquals(false, body.has("isActive"))
        assertEquals(false, body.has("isDefault"))
    }

    @Test
    fun toReviewDetailParsesReply() {
        val json = org.json.JSONObject("""
            {
                "id": "r_1",
                "clientName": "Nimal",
                "rating": 5,
                "comment": "Great cut!",
                "serviceName": "Haircut",
                "ownerReply": "Thank you!",
                "isPublished": true,
                "createdAt": "2026-09-04T09:00:00Z"
            }
        """.trimIndent())

        val review = json.toReviewDetail()
        assertEquals("r_1", review.id)
        assertEquals("Nimal", review.clientName)
        assertEquals(5, review.rating)
        assertEquals("Thank you!", review.ownerReply)
        assertEquals(true, review.isPublished)
    }

    @Test
    fun toReviewDetailUnwrapsNestedReview() {
        val json = org.json.JSONObject("""
            { "review": { "id": "r_2", "clientName": "Sunil", "rating": 4, "comment": "Good" } }
        """.trimIndent())

        val review = json.toReviewDetail()
        assertEquals("r_2", review.id)
        assertEquals(4, review.rating)
        assertEquals(null, review.ownerReply)
    }

    @Test
    fun toClientDetailParsesCrmFields() {
        val json = org.json.JSONObject("""
            {
                "id": "c_1",
                "name": "Kasun",
                "phone": "+94771234567",
                "stage": "regular",
                "loyaltyTier": "gold",
                "totalBookings": 12
            }
        """.trimIndent())

        val client = json.toClientDetail()
        assertEquals("c_1", client.id)
        assertEquals("regular", client.stage)
        assertEquals("gold", client.loyaltyTier)
        assertEquals(12, client.totalBookings)
    }

    @Test
    fun toServiceDetailParsesCatalogFields() {
        val json = org.json.JSONObject("""
            {
                "id": "svc_1",
                "name": "Haircut",
                "priceLkr": 3500,
                "durationMinutes": 45,
                "isActive": false
            }
        """.trimIndent())

        val service = json.toServiceDetail()
        assertEquals("svc_1", service.id)
        assertEquals(3500, service.priceLkr)
        assertEquals(45, service.durationMinutes)
        assertEquals(false, service.isActive)
        assertEquals(true, service.isPublished)
    }

    @Test
    fun toPaymentDetailParsesAmounts() {
        val json = org.json.JSONObject("""
            {
                "id": "p_1",
                "orderId": "ord_9",
                "clientName": "Kasun",
                "amountLkr": 5000,
                "status": "paid"
            }
        """.trimIndent())

        val payment = json.toPaymentDetail()
        assertEquals("p_1", payment.id)
        assertEquals("ord_9", payment.orderId)
        assertEquals(5000, payment.amountLkr)
        assertEquals("paid", payment.status)
    }

    @Test
    fun toBroadcastResultDefaultsStatus() {
        val json = org.json.JSONObject("""{ "id": "b_1", "recipientCount": 40, "channel": "sms" }""")

        val broadcast = json.toBroadcastResult()
        assertEquals("b_1", broadcast.id)
        assertEquals("queued", broadcast.status)
        assertEquals(40, broadcast.recipientCount)
    }

    @Test
    fun toAutomationToggleResultParsesFlag() {
        val json = org.json.JSONObject("""{ "id": "a_1", "isActive": false }""")

        val result = json.toAutomationToggleResult()
        assertEquals("a_1", result.id)
        assertEquals(false, result.isActive)
    }

    @Test
    fun toReportPayloadParsesMetrics() {
        val json = org.json.JSONObject("""
            {
                "range": "30d",
                "metrics": [{ "label": "Revenue", "value": "Rs. 120,000" }],
                "serverTime": "2026-09-04T00:00:00Z"
            }
        """.trimIndent())

        val reports = json.toReportPayload()
        assertEquals("30d", reports.range)
        assertEquals(1, reports.metrics.size)
        assertEquals("Revenue", reports.metrics[0].label)
        assertEquals("/dashboard/reports", reports.webPath)
    }

    @Test
    fun toReportPayloadFlattensTypedDesktopMetricsObject() {
        val json = org.json.JSONObject("""
            {
                "range": { "from": "2026-09-03", "to": "2026-09-09" },
                "metrics": {
                    "totalRevenueLabel": "LKR 12,500",
                    "totalBookings": 9,
                    "newClients": 3
                },
                "webUrl": "/dashboard/reports"
            }
        """.trimIndent())

        val reports = json.toReportPayload()
        assertEquals("2026-09-03 to 2026-09-09", reports.range)
        assertEquals(3, reports.metrics.size)
        assertEquals("LKR 12,500", reports.metrics.first { it.label == "Total Revenue Label" }.value)
    }

    @Test
    fun mobileCacheRoundTripsBookings() {
        val cache = MobileCache(InMemoryCacheStore())
        val raw = org.json.JSONObject("""{ "tab": "today", "rows": [], "serverTime": "t" }""")
        cache.saveBookings("today||", raw)

        val loaded = cache.loadBookings("today||")
        assertEquals("today", loaded?.optString("tab"))
        assertEquals(null, cache.loadBookings("upcoming||"))
    }

    @Test
    fun mobileCacheCalendarKeysAreScoped() {
        assertEquals(
            "cache_calendar_day_2026-09-04_s_1",
            MobileCache.calendarKey("day", "2026-09-04", "s_1"),
        )
    }

    @Test
    fun combineDateTimeToIsoAppendsSeconds() {
        assertEquals("2026-09-04T10:30:00", combineDateTimeToIso("2026-09-04", "10:30"))
        assertEquals("2026-09-04T09:00:00", combineDateTimeToIso("2026-09-04", ""))
        assertEquals("", combineDateTimeToIso("", "10:30"))
    }

    @Test
    fun normalizeIsoDateTimeAppendsSecondsAndPreservesZ() {
        assertEquals("2026-09-04T10:30:00", normalizeIsoDateTime("2026-09-04T10:30"))
        assertEquals("2026-09-04T10:30:00Z", normalizeIsoDateTime("2026-09-04T10:30Z"))
        assertEquals("2026-09-04T09:00:00", normalizeIsoDateTime("2026-09-04"))
        assertEquals("2026-09-04T10:30:00.000Z", normalizeIsoDateTime("2026-09-04T10:30:00.000Z"))
    }

    @Test
    fun createDealRequestSerializesRequiredFields() {
        val body = CreateDealRequest(
            serviceId = "svc_1",
            locationId = "loc_1",
            discountPercent = 20,
            slotsTotal = 5,
            dealWindowStart = "2026-09-04T09:00",
            dealWindowEnd = "2026-09-05T18:00",
            apptWindowStart = "2026-09-06T09:00",
            apptWindowEnd = "2026-09-07T17:00",
        ).toJson()

        assertEquals("svc_1", body.getString("serviceId"))
        assertEquals("loc_1", body.getString("locationId"))
        assertEquals(20, body.getInt("discountPercent"))
        assertEquals(5, body.getInt("slotsTotal"))
        assertEquals("2026-09-04T09:00:00", body.getString("dealWindowStart"))
        assertEquals("2026-09-05T18:00:00", body.getString("dealWindowEnd"))
        assertEquals("2026-09-06T09:00:00", body.getString("apptWindowStart"))
        assertEquals("2026-09-07T17:00:00", body.getString("apptWindowEnd"))
        assertEquals(false, body.getBoolean("notifyClients"))
        assertEquals(false, body.has("staffId"))
    }

    @Test
    fun createDealRequestSerializesOptionalStaffAndNotify() {
        val body = CreateDealRequest(
            serviceId = "svc_1",
            locationId = "loc_1",
            staffId = "st_1",
            discountPercent = 15,
            slotsTotal = 3,
            dealWindowStart = "2026-09-04T09:00:00Z",
            dealWindowEnd = "2026-09-05T18:00:00Z",
            apptWindowStart = "2026-09-06T09:00:00Z",
            apptWindowEnd = "2026-09-07T17:00:00Z",
            notifyClients = true,
        ).toJson()

        assertEquals("st_1", body.getString("staffId"))
        assertEquals(true, body.getBoolean("notifyClients"))
        assertEquals("2026-09-04T09:00:00Z", body.getString("dealWindowStart"))
    }

    @Test
    fun createBroadcastRequestSerializesRequiredFields() {
        val body = CreateBroadcastRequest(
            name = "September offer",
            channel = "WhatsApp",
            body = "Book this week and save.",
        ).toJson()

        assertEquals("September offer", body.getString("name"))
        assertEquals("whatsapp", body.getString("channel"))
        assertEquals("Book this week and save.", body.getString("body"))
        assertEquals("all", body.getString("audienceType"))
        assertEquals(false, body.getBoolean("sendNow"))
        assertEquals(false, body.has("subject"))
        assertEquals(false, body.has("audienceFilter"))
    }

    @Test
    fun createBroadcastRequestSerializesStageAudienceFilter() {
        val body = CreateBroadcastRequest(
            name = "VIP",
            channel = "sms",
            body = "Hello",
            subject = "This week",
            audienceType = "stage",
            audienceStage = "active",
            sendNow = true,
        ).toJson()

        assertEquals("This week", body.getString("subject"))
        assertEquals("stage", body.getString("audienceType"))
        assertEquals(true, body.getBoolean("sendNow"))
        assertEquals("active", body.getJSONObject("audienceFilter").getString("stage"))
    }

    @Test
    fun createBroadcastRequestSerializesTagsAudienceFilter() {
        val body = CreateBroadcastRequest(
            name = "VIP",
            channel = "email",
            body = "Hello",
            audienceType = "tags",
            audienceTags = listOf("vip", "regular"),
        ).toJson()

        val tags = body.getJSONObject("audienceFilter").getJSONArray("tags")
        assertEquals(2, tags.length())
        assertEquals("vip", tags.getString(0))
        assertEquals("regular", tags.getString(1))
    }

    @Test
    fun toDealDetailParsesFlatCreateResponse() {
        val json = org.json.JSONObject("""{ "id": "deal_1", "notified": 4 }""")
        val deal = json.toDealDetail()
        assertEquals("deal_1", deal.id)
        assertEquals(4, deal.notified)
        assertEquals("active", deal.status)
    }

    @Test
    fun toDealDetailUnwrapsNestedDeal() {
        val json = org.json.JSONObject(
            """
            {
                "deal": {
                    "id": "deal_2",
                    "serviceId": "svc_1",
                    "locationId": "loc_1",
                    "staffId": "st_1",
                    "discountPercent": 20,
                    "slotsTotal": 5,
                    "slotsRedeemed": 1,
                    "status": "upcoming",
                    "serviceName": "Haircut",
                    "locationName": "Kandy"
                }
            }
            """.trimIndent(),
        )
        val deal = json.toDealDetail()
        assertEquals("deal_2", deal.id)
        assertEquals("svc_1", deal.serviceId)
        assertEquals("st_1", deal.staffId)
        assertEquals(20, deal.discountPercent)
        assertEquals(5, deal.slotsTotal)
        assertEquals("upcoming", deal.status)
        assertEquals("Haircut", deal.serviceName)
    }

    @Test
    fun toBroadcastCreateResultParsesNestedBroadcast() {
        val json = org.json.JSONObject(
            """{ "broadcast": { "id": "bc_1", "name": "September offer", "status": "draft" } }""",
        )
        val result = json.toBroadcastCreateResult()
        assertEquals("bc_1", result.id)
        assertEquals("draft", result.status)
        assertEquals("September offer", result.name)
    }

    @Test
    fun toBroadcastCreateResultParsesTopLevelId() {
        val json = org.json.JSONObject("""{ "id": "bc_2", "status": "sending" }""")
        val result = json.toBroadcastCreateResult()
        assertEquals("bc_2", result.id)
        assertEquals("sending", result.status)
    }

    @Test
    fun updateBookingRequestSerializesStartsAt() {
        val body = UpdateBookingRequest(startsAt = "2026-09-04T11:00:00").toJson()
        assertEquals("2026-09-04T11:00:00", body.getString("startsAt"))
        assertEquals(false, body.has("status"))
        assertEquals(false, body.has("clientName"))
    }
}
