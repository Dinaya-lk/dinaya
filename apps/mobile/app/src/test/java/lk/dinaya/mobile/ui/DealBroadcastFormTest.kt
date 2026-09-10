package lk.dinaya.mobile.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DealBroadcastFormTest {
    @Test
    fun parseIsoDateAcceptsCalendarDatesOnly() {
        assertEquals("2026-05-28", parseIsoDate("2026-05-28")?.toString())
        assertEquals("2026-05-28", parseIsoDate(" 2026-05-28 ")?.toString())
        assertNull(parseIsoDate(""))
        assertNull(parseIsoDate("28-05-2026"))
        assertNull(parseIsoDate("2026-13-01"))
        assertNull(parseIsoDate("2026-05-28T00:00:00"))
    }

    @Test
    fun dealEndMustBeOnOrAfterStart() {
        assertTrue(isIsoDateOnOrAfter("2026-05-28", "2026-05-28"))
        assertTrue(isIsoDateOnOrAfter("2026-05-28", "2026-05-30"))
        assertFalse(isIsoDateOnOrAfter("2026-05-30", "2026-05-28"))
        assertFalse(isIsoDateOnOrAfter("not-a-date", "2026-05-28"))
    }

    @Test
    fun dealFormRequiresServiceLocationDiscountSlotsAndWindows() {
        assertFalse(
            isDealCreateFormValid(
                serviceId = "",
                locationId = "loc-1",
                discountPercent = 20,
                slotsTotal = 5,
                dealWindowStart = "2026-05-28",
                dealWindowEnd = "2026-06-04",
                apptWindowStart = "2026-05-28",
                apptWindowEnd = "2026-06-11",
            ),
        )
        assertFalse(
            isDealCreateFormValid(
                serviceId = "svc-1",
                locationId = "",
                discountPercent = 20,
                slotsTotal = 5,
                dealWindowStart = "2026-05-28",
                dealWindowEnd = "2026-06-04",
                apptWindowStart = "2026-05-28",
                apptWindowEnd = "2026-06-11",
            ),
        )
        assertFalse(
            isDealCreateFormValid(
                serviceId = "svc-1",
                locationId = "loc-1",
                discountPercent = 9,
                slotsTotal = 5,
                dealWindowStart = "2026-05-28",
                dealWindowEnd = "2026-06-04",
                apptWindowStart = "2026-05-28",
                apptWindowEnd = "2026-06-11",
            ),
        )
        assertFalse(
            isDealCreateFormValid(
                serviceId = "svc-1",
                locationId = "loc-1",
                discountPercent = 51,
                slotsTotal = 5,
                dealWindowStart = "2026-05-28",
                dealWindowEnd = "2026-06-04",
                apptWindowStart = "2026-05-28",
                apptWindowEnd = "2026-06-11",
            ),
        )
        assertFalse(
            isDealCreateFormValid(
                serviceId = "svc-1",
                locationId = "loc-1",
                discountPercent = 20,
                slotsTotal = 0,
                dealWindowStart = "2026-05-28",
                dealWindowEnd = "2026-06-04",
                apptWindowStart = "2026-05-28",
                apptWindowEnd = "2026-06-11",
            ),
        )
        assertFalse(
            isDealCreateFormValid(
                serviceId = "svc-1",
                locationId = "loc-1",
                discountPercent = 20,
                slotsTotal = 21,
                dealWindowStart = "2026-05-28",
                dealWindowEnd = "2026-06-04",
                apptWindowStart = "2026-05-28",
                apptWindowEnd = "2026-06-11",
            ),
        )
        assertFalse(
            isDealCreateFormValid(
                serviceId = "svc-1",
                locationId = "loc-1",
                discountPercent = 20,
                slotsTotal = 5,
                dealWindowStart = "2026-06-04",
                dealWindowEnd = "2026-05-28",
                apptWindowStart = "2026-05-28",
                apptWindowEnd = "2026-06-11",
            ),
        )
        assertTrue(
            isDealCreateFormValid(
                serviceId = "svc-1",
                locationId = "loc-1",
                discountPercent = 10,
                slotsTotal = 1,
                dealWindowStart = "2026-05-28",
                dealWindowEnd = "2026-05-28",
                apptWindowStart = "2026-05-28",
                apptWindowEnd = "2026-05-28",
            ),
        )
        assertTrue(
            isDealCreateFormValid(
                serviceId = "svc-1",
                locationId = "loc-1",
                discountPercent = 50,
                slotsTotal = 20,
                dealWindowStart = "2026-05-28",
                dealWindowEnd = "2026-06-04",
                apptWindowStart = "2026-05-28",
                apptWindowEnd = "2026-06-11",
            ),
        )
    }

    @Test
    fun broadcastFormRequiresNameBodyChannelAndStageWhenNeeded() {
        assertFalse(
            isBroadcastCreateFormValid(
                name = " ",
                channel = "whatsapp",
                body = "Quiet Tuesday 20% off.",
                audienceType = "all",
                audienceStage = null,
            ),
        )
        assertFalse(
            isBroadcastCreateFormValid(
                name = "Quiet Tuesday",
                channel = "whatsapp",
                body = "  ",
                audienceType = "all",
                audienceStage = null,
            ),
        )
        assertFalse(
            isBroadcastCreateFormValid(
                name = "Quiet Tuesday",
                channel = "carrier-pigeon",
                body = "Quiet Tuesday 20% off.",
                audienceType = "all",
                audienceStage = null,
            ),
        )
        assertFalse(
            isBroadcastCreateFormValid(
                name = "Quiet Tuesday",
                channel = "email",
                body = "Quiet Tuesday 20% off.",
                audienceType = "stage",
                audienceStage = null,
            ),
        )
        assertFalse(
            isBroadcastCreateFormValid(
                name = "Quiet Tuesday",
                channel = "sms",
                body = "Quiet Tuesday 20% off.",
                audienceType = "stage",
                audienceStage = "vip",
            ),
        )
        assertTrue(
            isBroadcastCreateFormValid(
                name = "Quiet Tuesday",
                channel = "whatsapp",
                body = "Quiet Tuesday 20% off.",
                audienceType = "all",
                audienceStage = null,
            ),
        )
        assertTrue(
            isBroadcastCreateFormValid(
                name = "Quiet Tuesday",
                channel = "email",
                body = "Quiet Tuesday 20% off.",
                audienceType = "stage",
                audienceStage = "lead",
            ),
        )
    }
}
