package lk.dinaya.mobile.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CatalogValidationTest {
    @Test
    fun phoneCheckAllowsBlankAndInternationalFormats() {
        assertEquals(true, isValidPhoneLight(""))
        assertEquals(true, isValidPhoneLight("+94 77 123 4567"))
        assertEquals(true, isValidPhoneLight("077-1234567"))
        assertEquals(false, isValidPhoneLight("123"))
        assertEquals(false, isValidPhoneLight("abc"))
    }

    @Test
    fun serviceFormRequiresNameAndNonNegativePrice() {
        assertEquals(
            "Service name is required.",
            validateServiceForm(ServiceFormState(name = "  ")),
        )
        assertEquals(
            "Price must be 0 or more.",
            validateServiceForm(ServiceFormState(name = "Cut", priceLkr = "-5")),
        )
        assertEquals(
            "Duration must be a positive number of minutes.",
            validateServiceForm(ServiceFormState(name = "Cut", durationMinutes = "0")),
        )
        assertNull(
            validateServiceForm(ServiceFormState(name = "Cut", priceLkr = "2500", durationMinutes = "45")),
        )
    }

    @Test
    fun staffFormRequiresNameAndValidContact() {
        assertEquals("Staff name is required.", validateStaffForm(StaffFormState(name = "")))
        assertEquals(
            "Enter a valid email or leave it blank.",
            validateStaffForm(StaffFormState(name = "Amal", email = "not-an-email")),
        )
        assertEquals(
            "Enter a valid phone number or leave it blank.",
            validateStaffForm(StaffFormState(name = "Amal", phone = "12")),
        )
        assertNull(validateStaffForm(StaffFormState(name = "Amal", phone = "+94771234567")))
    }

    @Test
    fun locationFormRequiresNameAndTimezone() {
        assertEquals("Location name is required.", validateLocationForm(LocationFormState(name = "")))
        assertEquals(
            "Timezone is required.",
            validateLocationForm(LocationFormState(name = "Colombo", timezone = "")),
        )
        assertNull(validateLocationForm(LocationFormState(name = "Colombo", timezone = "Asia/Colombo")))
    }

    @Test
    fun subtitleParsersExtractPriceDurationAndTimezone() {
        assertEquals("3500", parsePriceFromSubtitle("Rs. 3,500 · 45 min"))
        assertEquals("45", parseDurationFromSubtitle("Rs. 3,500 · 45 min"))
        assertEquals("", parsePriceFromSubtitle(null))
        assertEquals("", parseDurationFromSubtitle(null))
        assertEquals("Asia/Colombo", extractTimezone("No 12, Galle Rd · Asia/Colombo"))
        assertNull(extractTimezone(null))
    }
}
