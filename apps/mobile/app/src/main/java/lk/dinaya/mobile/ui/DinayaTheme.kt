package lk.dinaya.mobile.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import lk.dinaya.mobile.R
import lk.dinaya.mobile.data.ThemePreference

/**
 * Exact site parity tokens — mirrored from `src/app/globals.css` + `tailwind.config.ts`
 * + `src/lib/dashboard-ui.ts` + `src/lib/dashboard-status.ts`
 * + `src/components/auth/auth-form-styles.ts`.
 *
 * Light `:root`:
 *   background #FFFFFF, foreground slate-950 #020617, card #FFFFFF,
 *   secondary/muted/accent slate-100 #F1F5F9, muted-fg slate-500 #64748B,
 *   border/input slate-200 #E2E8F0, primary blue-600 #2563EB,
 *   primary-fg slate-50 #F8FAFC, ring blue-400 #60A5FA, radius 8dp.
 *   dashboard-canvas hsl(240 6% 94%) ≈ #EDEDEF, dashboard-main hsl(240 8% 96%) ≈ #F4F4F7,
 *   dashboard-chrome/sidebar #FFFFFF.
 *
 * Dark `.dark` (true neutral, Apple systemGray-style):
 *   background hsl(240 6% 7%) ≈ #101014, foreground #F2F2F2, card hsl(240 5% 11%) ≈ #1B1B20,
 *   popover hsl(240 5% 14%) ≈ #222227, secondary/muted/accent hsl(240 4% 16%) ≈ #28282E,
 *   muted-fg hsl(240 5% 65%) ≈ #A2A2B0, border hsl(240 4% 20%) ≈ #333338,
 *   input hsl(240 4% 16%), dashboard-main hsl(240 5% 9%) ≈ #16161B.
 */

// ——— Brand ————————————————————————————————————————————————————————————————
val DinayaPrimary = Color(0xFF2563EB) // hsl(220 82% 53%) — site --primary
val DinayaPrimary700 = Color(0xFF1D4ED8) // hover / active depth
val DinayaRing = Color(0xFF60A5FA) // hsl(220 84% 67%) — site --ring
val DinayaIconBlue = Color(0xFF1A6EE8) // app-icon tile bg (src/app/icon.tsx)

// ——— Light site surfaces ——————————————————————————————————————————————————
val SiteLightBackground = Color(0xFFFFFFFF)
val SiteLightForeground = Color(0xFF020617) // slate-950 — site --foreground
val SiteLightCard = Color(0xFFFFFFFF)
val SiteLightSecondary = Color(0xFFF1F5F9) // slate-100 — site --secondary/muted
val SiteLightMutedFg = Color(0xFF64748B) // slate-500 — site --muted-foreground
val SiteLightSecondaryFg = Color(0xFF0F172A) // slate-900
val SiteLightBorder = Color(0xFFE2E8F0) // slate-200 — site --border/--input
val SiteLightPrimaryFg = Color(0xFFF8FAFC) // slate-50
val SiteLightDestructive = Color(0xFFEF4444) // hsl(0 84.2% 60.2%) ≈ red-500
val DashboardCanvasLight = Color(0xFFEDEDEF) // hsl(240 6% 94%)
val DashboardMainLight = Color(0xFFF4F4F7) // hsl(240 8% 96%)
val DashboardChromeLight = Color(0xFFFFFFFF)

// ——— Dark site surfaces ———————————————————————————————————————————————————
val SiteDarkBackground = Color(0xFF101014) // hsl(240 6% 7%)
val SiteDarkForeground = Color(0xFFF2F2F2) // 0 0% 95%
val SiteDarkCard = Color(0xFF1B1B20) // hsl(240 5% 11%)
val SiteDarkPopover = Color(0xFF222227) // hsl(240 5% 14%)
val SiteDarkSecondary = Color(0xFF28282E) // hsl(240 4% 16%)
val SiteDarkMutedFg = Color(0xFFA2A2B0) // hsl(240 5% 65%)
val SiteDarkBorder = Color(0xFF333338) // hsl(240 4% 20%)
val DashboardMainDark = Color(0xFF16161B) // hsl(240 5% 9%)

val DinayaLightColors = lightColorScheme(
    primary = DinayaPrimary,
    onPrimary = SiteLightPrimaryFg,
    primaryContainer = Color(0xFFDBEAFE), // blue-100 — selected pills
    onPrimaryContainer = DinayaPrimary700,
    secondary = SiteLightSecondary,
    onSecondary = SiteLightSecondaryFg,
    background = SiteLightBackground,
    onBackground = SiteLightForeground,
    surface = SiteLightCard,
    onSurface = SiteLightForeground,
    surfaceVariant = SiteLightSecondary,
    onSurfaceVariant = SiteLightMutedFg,
    surfaceContainerLowest = DashboardChromeLight,
    surfaceContainerLow = DashboardMainLight,
    surfaceContainer = DashboardCanvasLight,
    outline = SiteLightBorder,
    outlineVariant = SiteLightBorder,
    error = Color(0xFFB91C1C), // red-700 — site inline form errors
    onError = Color(0xFFFFFFFF),
    errorContainer = Color(0xFFFEF2F2), // red-50
    onErrorContainer = Color(0xFFB91C1C),
)

val DinayaDarkColors = darkColorScheme(
    primary = DinayaPrimary,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF1E3A8A), // blue-900 — selected pills on dark
    onPrimaryContainer = Color(0xFFBFDBFE), // blue-200
    secondary = SiteDarkSecondary,
    onSecondary = SiteDarkForeground,
    background = SiteDarkBackground,
    onBackground = SiteDarkForeground,
    surface = SiteDarkCard,
    onSurface = SiteDarkForeground,
    surfaceVariant = SiteDarkSecondary,
    onSurfaceVariant = SiteDarkMutedFg,
    surfaceContainerLowest = SiteDarkCard,
    surfaceContainerLow = DashboardMainDark,
    surfaceContainer = SiteDarkBackground,
    outline = SiteDarkBorder,
    outlineVariant = SiteDarkBorder,
    error = Color(0xFFF87171), // red-400 — site dark errors
    onError = Color(0xFF101014),
    errorContainer = Color(0xFF450A0A), // red-950/40 approx
    onErrorContainer = Color(0xFFFCA5A5), // red-300
)

// ——— Shape ————————————————————————————————————————————————————————————————
// Site radius: --radius 0.5rem (8dp). Buttons rounded-lg, cards rounded-2xl (16dp),
// sections rounded-3xl (24dp), auth inputs/buttons rounded-full (pill),
// bottom-sheet rounded-t-[1.25rem] (20dp).
val DinayaRadiusButton = RoundedCornerShape(8.dp)
val DinayaRadiusCard = RoundedCornerShape(16.dp)
val DinayaRadiusSection = RoundedCornerShape(24.dp)
val DinayaRadiusPill = RoundedCornerShape(999.dp)
val DinayaRadiusSheet = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)

// ——— Type —————————————————————————————————————————————————————————————————
// Same pairing as dinaya.lk: Cal Sans (`font-cal`) for display / headings /
// wordmark / chrome, Inter (`font-sans`) for body copy and form fields.
// Cal Sans only ships SemiBold; map every Cal weight to that file so Android
// does not faux-bold it.
val DinayaCalSans = FontFamily(
    Font(R.font.cal_sans_semibold, FontWeight.Normal),
    Font(R.font.cal_sans_semibold, FontWeight.Medium),
    Font(R.font.cal_sans_semibold, FontWeight.SemiBold),
    Font(R.font.cal_sans_semibold, FontWeight.Bold),
)

val DinayaInter = FontFamily(
    Font(R.font.inter_regular, FontWeight.Normal),
    Font(R.font.inter_medium, FontWeight.Medium),
    Font(R.font.inter_semibold, FontWeight.SemiBold),
    Font(R.font.inter_bold, FontWeight.Bold),
)

private fun calStyle(
    size: TextUnit,
    lineHeight: TextUnit,
    letterSpacing: TextUnit = (-0.3).sp,
    weight: FontWeight = FontWeight.SemiBold,
) = TextStyle(
    fontFamily = DinayaCalSans,
    fontWeight = weight,
    fontSize = size,
    lineHeight = lineHeight,
    letterSpacing = letterSpacing,
)

private fun interStyle(
    size: TextUnit,
    lineHeight: TextUnit,
    letterSpacing: TextUnit = 0.sp,
    weight: FontWeight = FontWeight.Normal,
) = TextStyle(
    fontFamily = DinayaInter,
    fontWeight = weight,
    fontSize = size,
    lineHeight = lineHeight,
    letterSpacing = letterSpacing,
)

/** Inter 16sp for typed input — web `font-sans` fields, ≥16px on mobile. */
val DinayaFieldTextStyle = interStyle(16.sp, 24.sp)

val DinayaTypography = Typography(
    displayLarge = calStyle(57.sp, 64.sp, (-0.8).sp),
    displayMedium = calStyle(45.sp, 52.sp, (-0.6).sp),
    displaySmall = calStyle(36.sp, 44.sp, (-0.5).sp),
    headlineLarge = calStyle(32.sp, 40.sp, (-0.5).sp),
    headlineMedium = calStyle(30.sp, 36.sp, (-0.5).sp, FontWeight.Bold),
    headlineSmall = calStyle(24.sp, 32.sp, (-0.4).sp),
    titleLarge = calStyle(20.sp, 28.sp, (-0.3).sp),
    titleMedium = calStyle(16.sp, 24.sp, (-0.1).sp),
    titleSmall = calStyle(14.sp, 20.sp, (-0.1).sp),
    bodyLarge = calStyle(16.sp, 24.sp, 0.sp, FontWeight.SemiBold),
    bodyMedium = interStyle(14.sp, 20.sp),
    bodySmall = interStyle(12.sp, 16.sp),
    labelLarge = calStyle(14.sp, 20.sp, 0.sp),
    labelMedium = calStyle(12.sp, 16.sp, 0.sp, FontWeight.Medium),
    labelSmall = calStyle(11.sp, 16.sp, 0.9.sp, FontWeight.Medium),
)

// ——— Status ———————————————————————————————————————————————————————————————
// Exact mirror of `src/lib/dashboard-status.ts` statusStyles (light + dark).
data class StatusStyle(val background: Color, val border: Color, val text: Color)

fun statusStyle(status: String, dark: Boolean): StatusStyle = when (status.lowercase()) {
    "completed", "confirmed", "success", "active", "paid", "published" -> if (!dark) {
        StatusStyle(Color(0xFFECFDF5), Color(0xFFA7F3D0), Color(0xFF065F46))
    } else {
        StatusStyle(Color(0xFF052E22), Color(0xFF065F46), Color(0xFFA7F3D0))
    }
    "pending", "no_show", "lead", "unpaid" -> if (!dark) {
        StatusStyle(Color(0xFFFFFBEB), Color(0xFFFCD34D), Color(0xFF92400E))
    } else {
        StatusStyle(Color(0xFF451A03), Color(0xFF92400E), Color(0xFFFCD34D))
    }
    "failed", "churned", "inactive" -> if (!dark) {
        StatusStyle(Color(0xFFFEF2F2), Color(0xFFFECACA), Color(0xFFB91C1C))
    } else {
        StatusStyle(Color(0xFF450A0A), Color(0xFF7F1D1D), Color(0xFFFCA5A5))
    }
    "refunded", "prospect" -> if (!dark) {
        StatusStyle(Color(0xFFF5F3FF), Color(0xFFDDD6FE), Color(0xFF6D28D9))
    } else {
        StatusStyle(Color(0xFF2E1065), Color(0xFF6D28D9), Color(0xFFDDD6FE))
    }
    "cancelled" -> if (!dark) {
        // Site: slate — NOT red (previous mobile build used red here).
        StatusStyle(Color(0xFFF1F5F9), Color(0xFFCBD5E1), Color(0xFF334155))
    } else {
        StatusStyle(Color(0xFF27272A), Color(0xFF52525B), Color(0xFFE4E4E7))
    }
    else -> if (!dark) {
        StatusStyle(Color(0xFFF1F5F9), Color(0xFFE2E8F0), Color(0xFF64748B))
    } else {
        StatusStyle(Color(0xFF28282E), Color(0xFF333338), Color(0xFFA2A2B0))
    }
}

/**
 * 3px left-edge accent stripe color for appointment list cards,
 * mirroring `statusBorderStyles` from `src/lib/dashboard-status.ts`.
 */
fun statusLeftBorderColor(status: String): Color = when (status.lowercase()) {
    "completed", "confirmed", "success", "active", "paid", "published" -> Color(0xFF10B981) // emerald-500
    "pending", "no_show", "lead", "unpaid" -> Color(0xFFF59E0B) // amber-500
    "failed", "churned", "inactive" -> Color(0xFFEF4444) // red-500
    "refunded", "prospect" -> Color(0xFF8B5CF6) // violet-500
    "cancelled" -> Color(0xFF94A3B8) // slate-400
    else -> Color(0xFFCBD5E1) // slate-300
}

@Composable
fun DinayaTheme(
    themePreference: ThemePreference = ThemePreference.SYSTEM,
    content: @Composable () -> Unit,
) {
    val isSystemDark = isSystemInDarkTheme()
    val isDark = when (themePreference) {
        ThemePreference.SYSTEM -> isSystemDark
        ThemePreference.LIGHT -> false
        ThemePreference.DARK -> true
    }
    MaterialTheme(
        colorScheme = if (isDark) DinayaDarkColors else DinayaLightColors,
        typography = DinayaTypography,
        content = content,
    )
}
