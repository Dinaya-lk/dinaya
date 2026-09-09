package lk.dinaya.mobile.ui

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.BookOnline
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.ContentCut
import androidx.compose.material.icons.filled.Extension
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.ui.graphics.vector.ImageVector

enum class MobileDashboardGroup(val label: String) {
    Workspace("Workspace"),
    Catalog("Catalog"),
    Growth("Growth"),
    Configure("Configure"),
}

data class MobileDashboardSection(
    val key: String,
    val label: String,
    val group: MobileDashboardGroup,
    val desktopModule: String?,
    val webPath: String,
    val summary: String,
)

val mobileDashboardSections = listOf(
    MobileDashboardSection(
        key = "overview",
        label = "Overview",
        group = MobileDashboardGroup.Workspace,
        desktopModule = "overview",
        webPath = "/dashboard",
        summary = "Business health, today stats, activity, and quick actions.",
    ),
    MobileDashboardSection(
        key = "calendar",
        label = "Calendar",
        group = MobileDashboardGroup.Workspace,
        desktopModule = "calendar",
        webPath = "/dashboard/calendar",
        summary = "Today calendar with staff and booking status.",
    ),
    MobileDashboardSection(
        key = "bookings",
        label = "Bookings",
        group = MobileDashboardGroup.Workspace,
        desktopModule = null,
        webPath = "/dashboard/bookings",
        summary = "Today bookings, status actions, and appointment details.",
    ),
    MobileDashboardSection(
        key = "clients",
        label = "Clients",
        group = MobileDashboardGroup.Workspace,
        desktopModule = "clients",
        webPath = "/dashboard/clients",
        summary = "Client CRM records, stages, and recent activity.",
    ),
    MobileDashboardSection(
        key = "services",
        label = "Services",
        group = MobileDashboardGroup.Catalog,
        desktopModule = "services",
        webPath = "/dashboard/services",
        summary = "Service catalog, pricing, duration, and availability.",
    ),
    MobileDashboardSection(
        key = "staff",
        label = "Staff",
        group = MobileDashboardGroup.Catalog,
        desktopModule = "staff",
        webPath = "/dashboard/staff",
        summary = "Team members, active state, and appointment load.",
    ),
    MobileDashboardSection(
        key = "locations",
        label = "Locations",
        group = MobileDashboardGroup.Catalog,
        desktopModule = "locations",
        webPath = "/dashboard/locations",
        summary = "Branches, default location, timezone, and coverage.",
    ),
    MobileDashboardSection(
        key = "availability",
        label = "Availability",
        group = MobileDashboardGroup.Catalog,
        desktopModule = "availability",
        webPath = "/dashboard/availability",
        summary = "Weekly windows and staff coverage.",
    ),
    MobileDashboardSection(
        key = "reviews",
        label = "Reviews",
        group = MobileDashboardGroup.Growth,
        desktopModule = "reviews",
        webPath = "/dashboard/reviews",
        summary = "Published reviews, ratings, and replies.",
    ),
    MobileDashboardSection(
        key = "payments",
        label = "Payments",
        group = MobileDashboardGroup.Growth,
        desktopModule = "payments",
        webPath = "/dashboard/payments",
        summary = "PayHere payment status and revenue records.",
    ),
    MobileDashboardSection(
        key = "marketing",
        label = "Marketing",
        group = MobileDashboardGroup.Growth,
        desktopModule = "marketing",
        webPath = "/dashboard/marketing",
        summary = "Share tools, directory listing, and content calendar.",
    ),
    MobileDashboardSection(
        key = "deals",
        label = "Deals",
        group = MobileDashboardGroup.Growth,
        desktopModule = "deals",
        webPath = "/dashboard/deals",
        summary = "Deal status, redemptions, and performance.",
    ),
    MobileDashboardSection(
        key = "broadcasts",
        label = "Broadcasts",
        group = MobileDashboardGroup.Growth,
        desktopModule = "broadcasts",
        webPath = "/dashboard/broadcasts",
        summary = "Campaign broadcasts and delivery summaries.",
    ),
    MobileDashboardSection(
        key = "aiHub",
        label = "AI Hub",
        group = MobileDashboardGroup.Growth,
        desktopModule = "ai",
        webPath = "/dashboard/ai",
        summary = "AI workflow activity and growth tools.",
    ),
    MobileDashboardSection(
        key = "reports",
        label = "Reports",
        group = MobileDashboardGroup.Growth,
        desktopModule = "reports",
        webPath = "/dashboard/reports",
        summary = "Operating metrics and revenue snapshots.",
    ),
    MobileDashboardSection(
        key = "integrations",
        label = "Integrations",
        group = MobileDashboardGroup.Configure,
        desktopModule = "integrations",
        webPath = "/dashboard/settings/integrations",
        summary = "Connected providers, payments, social, and voice state.",
    ),
    MobileDashboardSection(
        key = "automations",
        label = "Automations",
        group = MobileDashboardGroup.Configure,
        desktopModule = "automations",
        webPath = "/dashboard/automations",
        summary = "Automation rules and enablement state.",
    ),
    MobileDashboardSection(
        key = "billing",
        label = "Plan & billing",
        group = MobileDashboardGroup.Configure,
        desktopModule = "billing",
        webPath = "/dashboard/billing",
        summary = "Current plan and subscription state.",
    ),
    MobileDashboardSection(
        key = "settings",
        label = "Settings",
        group = MobileDashboardGroup.Configure,
        desktopModule = "settings",
        webPath = "/dashboard/settings",
        summary = "Business profile and device access.",
    ),
)

fun dashboardSectionByKey(key: String): MobileDashboardSection =
    mobileDashboardSections.firstOrNull { it.key == key } ?: mobileDashboardSections.first()

fun sectionIcon(key: String): ImageVector = when (key) {
    "overview" -> Icons.Filled.Home
    "calendar" -> Icons.Filled.CalendarMonth
    "bookings" -> Icons.Filled.BookOnline
    "clients" -> Icons.Filled.Groups
    "services" -> Icons.Filled.ContentCut
    "staff" -> Icons.Filled.Person
    "locations" -> Icons.Filled.Place
    "availability" -> Icons.Filled.Schedule
    "reviews" -> Icons.Filled.Star
    "payments" -> Icons.Filled.Payments
    "marketing" -> Icons.Filled.Share
    "deals" -> Icons.Filled.LocalOffer
    "broadcasts" -> Icons.Filled.Campaign
    "aiHub" -> Icons.Filled.AutoAwesome
    "reports" -> Icons.Filled.Assessment
    "integrations" -> Icons.Filled.Extension
    "automations" -> Icons.Filled.Bolt
    "billing" -> Icons.Filled.AccountBalanceWallet
    "settings" -> Icons.Filled.Settings
    else -> Icons.Filled.Home
}
