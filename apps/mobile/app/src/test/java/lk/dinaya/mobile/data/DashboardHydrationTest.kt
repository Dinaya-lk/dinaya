package lk.dinaya.mobile.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DashboardHydrationTest {
    private val sampleBooking = BookingSummary(
        id = "b_1",
        clientName = "Kasun",
        serviceName = "Haircut",
        startsAt = "2026-09-10T10:00:00Z",
        status = "confirmed",
    )

    @Test
    fun shouldUseOverviewTodayRowsWhenOverviewHasAppointments() {
        val overview = OverviewPayload(
            businessName = "Salon",
            ownerName = "Nimal",
            greetingDate = "Thursday, September 10",
            stats = emptyList(),
            showStats = true,
            showShareCard = true,
            bookingUrl = "https://dinaya.lk/book/salon",
            bookingDisplayUrl = "dinaya.lk/book/salon",
            whatsappShare = "",
            todayRows = listOf(sampleBooking),
            nextRows = emptyList(),
            recentActivity = emptyList(),
        )
        assertTrue(shouldUseOverviewTodayRows(overview))
        assertFalse(shouldUseOverviewTodayRows(null))
        assertFalse(shouldUseOverviewTodayRows(overview.copy(todayRows = emptyList())))
    }

    @Test
    fun bookingsResultFromOverviewReusesTodayRowsAndServerTime() {
        val overview = OverviewPayload(
            businessName = "Salon",
            ownerName = "Nimal",
            greetingDate = "Thursday, September 10",
            stats = emptyList(),
            showStats = true,
            showShareCard = true,
            bookingUrl = "",
            bookingDisplayUrl = "",
            whatsappShare = "",
            todayRows = listOf(sampleBooking),
            nextRows = emptyList(),
            recentActivity = emptyList(),
            isStale = true,
        )
        val result = bookingsResultFromOverview(overview, "2026-09-10T04:00:00Z")
        assertEquals("today", result.tab)
        assertEquals(listOf(sampleBooking), result.rows)
        assertEquals("2026-09-10T04:00:00Z", result.serverTime)
        assertTrue(result.isStale)
    }
}
