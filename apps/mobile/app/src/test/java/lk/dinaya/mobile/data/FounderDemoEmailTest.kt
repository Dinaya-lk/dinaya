package lk.dinaya.mobile.data

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FounderDemoEmailTest {
    @Test
    fun matchesFounderGmailIgnoringCaseAndSpace() {
        assertTrue(isFounderDemoEmail("suvenseoras@gmail.com"))
        assertTrue(isFounderDemoEmail("  SuvenSeoras@Gmail.com  "))
        assertFalse(isFounderDemoEmail("owner@example.com"))
        assertFalse(isFounderDemoEmail(""))
    }
}
