package lk.dinaya.mobile.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class GrowthValidationTest {
    @Test
    fun dealCreateRequiresServiceLocationWindowsAndBounds() {
        assertEquals(
            "Choose a service.",
            validateDealCreate("", "loc_1", 20, 5, "2026-09-04T09:00:00", "2026-09-05T18:00:00", "2026-09-06T09:00:00", "2026-09-07T17:00:00"),
        )
        assertEquals(
            "Choose a location.",
            validateDealCreate("svc_1", "", 20, 5, "2026-09-04T09:00:00", "2026-09-05T18:00:00", "2026-09-06T09:00:00", "2026-09-07T17:00:00"),
        )
        assertEquals(
            "Discount must be between 10% and 50%.",
            validateDealCreate("svc_1", "loc_1", 9, 5, "2026-09-04T09:00:00", "2026-09-05T18:00:00", "2026-09-06T09:00:00", "2026-09-07T17:00:00"),
        )
        assertEquals(
            "Discount must be between 10% and 50%.",
            validateDealCreate("svc_1", "loc_1", 51, 5, "2026-09-04T09:00:00", "2026-09-05T18:00:00", "2026-09-06T09:00:00", "2026-09-07T17:00:00"),
        )
        assertEquals(
            "Slots must be between 1 and 20.",
            validateDealCreate("svc_1", "loc_1", 20, 0, "2026-09-04T09:00:00", "2026-09-05T18:00:00", "2026-09-06T09:00:00", "2026-09-07T17:00:00"),
        )
        assertEquals(
            "Slots must be between 1 and 20.",
            validateDealCreate("svc_1", "loc_1", 20, 21, "2026-09-04T09:00:00", "2026-09-05T18:00:00", "2026-09-06T09:00:00", "2026-09-07T17:00:00"),
        )
        assertEquals(
            "Set the deal window.",
            validateDealCreate("svc_1", "loc_1", 20, 5, "", "2026-09-05T18:00:00", "2026-09-06T09:00:00", "2026-09-07T17:00:00"),
        )
        assertEquals(
            "Set the appointment window.",
            validateDealCreate("svc_1", "loc_1", 20, 5, "2026-09-04T09:00:00", "2026-09-05T18:00:00", "2026-09-06T09:00:00", ""),
        )
        assertNull(
            validateDealCreate("svc_1", "loc_1", 10, 1, "2026-09-04T09:00:00", "2026-09-05T18:00:00", "2026-09-06T09:00:00", "2026-09-07T17:00:00"),
        )
        assertNull(
            validateDealCreate("svc_1", "loc_1", 50, 20, "2026-09-04T09:00:00", "2026-09-05T18:00:00", "2026-09-06T09:00:00", "2026-09-07T17:00:00"),
        )
    }

    @Test
    fun broadcastCreateRequiresNameBodyChannelAndStageFilter() {
        assertEquals("Broadcast name is required.", validateBroadcastCreate("", "whatsapp", "Hello", "all", null))
        assertEquals(
            "Choose WhatsApp, SMS, or email.",
            validateBroadcastCreate("Offer", "push", "Hello", "all", null),
        )
        assertEquals("Message body is required.", validateBroadcastCreate("Offer", "sms", "  ", "all", null))
        assertEquals(
            "Choose a client stage for this broadcast.",
            validateBroadcastCreate("Offer", "email", "Hello", "stage", null),
        )
        assertNull(validateBroadcastCreate("Offer", "WhatsApp", "Hello", "all", null))
        assertNull(validateBroadcastCreate("Offer", "sms", "Hello", "stage", "active"))
    }

    @Test
    fun parseBookingDateAndTimeFromIsoAndBareClock() {
        assertEquals("2026-09-04", parseBookingDate("2026-09-04T10:30:00Z"))
        assertEquals("10:30", parseBookingTime("2026-09-04T10:30:00Z"))
        assertEquals("2026-09-04", parseBookingDate("2026-09-04 14:00"))
        assertEquals("14:00", parseBookingTime("2026-09-04 14:00"))
        assertEquals("", parseBookingDate("11:00"))
        assertEquals("11:00", parseBookingTime("11:00"))
        assertEquals("", parseBookingDate(""))
        assertEquals("", parseBookingTime(""))
    }
}
