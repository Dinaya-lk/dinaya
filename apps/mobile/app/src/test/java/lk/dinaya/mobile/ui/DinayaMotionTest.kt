package lk.dinaya.mobile.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DinayaMotionTest {
    @Test
    fun sectionNavIndexFollowsPrimaryTabOrder() {
        assertEquals(0, dinayaSectionNavIndex("overview"))
        assertEquals(1, dinayaSectionNavIndex("calendar"))
        assertEquals(2, dinayaSectionNavIndex("bookings"))
        assertEquals(3, dinayaSectionNavIndex("clients"))
        assertTrue(dinayaSectionNavIndex("services") > dinayaSectionNavIndex("clients"))
        assertTrue(dinayaSectionNavIndex("settings") > dinayaSectionNavIndex("services"))
    }

    @Test
    fun unknownSectionSortsAfterKnownKeys() {
        assertTrue(dinayaSectionNavIndex("not-a-section") > dinayaSectionNavIndex("settings"))
    }

    @Test
    fun staggerDelayCapsAndHonorsReducedMotion() {
        assertEquals(0L, dinayaStaggerDelayMs(0, reduceMotion = false))
        assertEquals(45L, dinayaStaggerDelayMs(1, reduceMotion = false))
        assertEquals(270L, dinayaStaggerDelayMs(6, reduceMotion = false))
        assertEquals(270L, dinayaStaggerDelayMs(99, reduceMotion = false))
        assertEquals(0L, dinayaStaggerDelayMs(4, reduceMotion = true))
    }

    @Test
    fun pressScaleIsSubtleAndSkipsWhenReduced() {
        assertEquals(0.96f, dinayaPressScaleTarget(pressed = true, reduceMotion = false), 0.001f)
        assertEquals(1f, dinayaPressScaleTarget(pressed = false, reduceMotion = false), 0.001f)
        assertEquals(1f, dinayaPressScaleTarget(pressed = true, reduceMotion = true), 0.001f)
        assertEquals(0.95f, dinayaPressScaleTarget(pressed = true, reduceMotion = false, scaleDown = 0.9f), 0.001f)
    }
}
