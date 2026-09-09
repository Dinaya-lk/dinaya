package lk.dinaya.mobile.data

data class BusinessSummary(
    val id: String,
    val name: String,
    val slug: String,
    val timezone: String,
    val plan: String,
    val customDomain: String?,
)

data class UserSummary(
    val id: String,
    val name: String,
    val email: String,
    val role: String,
)

data class AuthSummary(
    val keyId: String,
    val keyType: String,
    val deviceId: String,
    val deviceName: String,
)

data class LoginResult(
    val deviceKey: String,
    val auth: AuthSummary,
    val business: BusinessSummary,
    val user: UserSummary,
)

data class StaffSummary(
    val id: String,
    val name: String,
    val isActive: Boolean,
)

data class BootstrapResult(
    val business: BusinessSummary,
    val auth: AuthSummary,
    val staff: List<StaffSummary>,
    val serverTime: String,
    val isStale: Boolean = false,
)

data class BookingSummary(
    val id: String,
    val clientId: String? = null,
    val clientName: String,
    val clientPhone: String = "",
    val clientEmail: String = "",
    val serviceName: String,
    val staffId: String? = null,
    val staffName: String = "",
    val startsAt: String,
    val endsAt: String = "",
    val status: String,
    val amountLkr: Int? = null,
    val paymentStatus: String? = null,
    val source: String? = null,
    val webUrl: String = "",
)

data class BookingsResult(
    val tab: String,
    val rows: List<BookingSummary>,
    val serverTime: String,
    val isStale: Boolean = false,
)

data class OverviewStat(
    val label: String,
    val value: String,
    val tone: String? = null,
    val delta: String? = null,
)

data class OverviewActivityItem(
    val action: String,
    val createdAt: String,
    val entity: String,
)

data class OverviewPayload(
    val businessName: String,
    val ownerName: String?,
    val greetingDate: String,
    val stats: List<OverviewStat>,
    val showStats: Boolean,
    val showShareCard: Boolean,
    val bookingUrl: String,
    val bookingDisplayUrl: String,
    val whatsappShare: String,
    val todayRows: List<BookingSummary>,
    val nextRows: List<BookingSummary>,
    val recentActivity: List<OverviewActivityItem>,
    val isStale: Boolean = false,
)

data class CalendarDay(
    val date: String,
    val label: String,
)

data class CalendarPayload(
    val date: String,
    val days: List<CalendarDay>,
    val rows: List<BookingSummary>,
    val staff: List<StaffSummary>,
    val timezone: String,
    val view: String,
    val isStale: Boolean = false,
)

enum class ThemePreference {
    SYSTEM,
    LIGHT,
    DARK,
}

data class StatusUpdateResult(
    val id: String,
    val status: String,
    val revisionTs: String,
)

data class ModuleMetric(
    val label: String,
    val value: String,
    val detail: String?,
    val tone: String?,
)

data class ModuleItem(
    val id: String,
    val title: String,
    val subtitle: String?,
    val meta: String?,
    val status: String?,
)

data class DesktopModulePayload(
    val emptyState: String,
    val items: List<ModuleItem>,
    val metrics: List<ModuleMetric>,
    val module: String,
    val refreshedAt: String,
    val summary: String,
    val title: String,
    val webPath: String,
)

data class StoredSession(
    val baseUrl: String,
    val deviceKey: String,
    val keyId: String,
    val deviceId: String,
    val deviceName: String,
    val businessName: String,
    val userEmail: String,
)

// ——— Catalog workspace typed models —————————————————————————————————————
// Parsed from the typed desktop endpoints (clients/services/staff/locations/
// availability). The generic DesktopModulePayload (ModuleItem list) stays the
// list source; these carry the detail fields the dedicated screens need
// (booking history, notes, windows, overrides) without rewriting the client.

data class AvailabilityWindow(
    val id: String = "",
    val dayOfWeek: Int = 0,
    val startTime: String = "",
    val endTime: String = "",
)

data class AvailabilityOverride(
    val id: String = "",
    val staffId: String = "",
    val date: String = "",
    val startTime: String? = null,
    val endTime: String? = null,
    val isBlocked: Boolean = true,
    val reason: String? = null,
)

data class AvailabilityMember(
    val staffId: String,
    val staffName: String,
    val isActive: Boolean = true,
    val windows: List<AvailabilityWindow> = emptyList(),
    val overrides: List<AvailabilityOverride> = emptyList(),
    val locations: List<String> = emptyList(),
)

data class ClientNoteItem(
    val id: String = "",
    val body: String = "",
    val createdAt: String = "",
)

data class ClientDetailPayload(
    val id: String,
    val name: String,
    val phone: String = "",
    val email: String = "",
    val stage: String? = null,
    val source: String? = null,
    val internalNotes: String? = null,
    val notes: List<ClientNoteItem> = emptyList(),
)

data class CreateBookingRequest(
    val clientName: String,
    val clientPhone: String,
    val clientEmail: String? = null,
    val serviceId: String,
    val staffId: String? = null,
    val startsAt: String,
    val notes: String? = null,
)

data class UpdateBookingRequest(
    val clientName: String? = null,
    val clientPhone: String? = null,
    val clientEmail: String? = null,
    val serviceId: String? = null,
    val staffId: String? = null,
    val startsAt: String? = null,
    val notes: String? = null,
    val status: String? = null,
)

data class ClientDetail(
    val id: String,
    val name: String,
    val phone: String = "",
    val email: String = "",
    val stage: String? = null,
    val source: String? = null,
    val loyaltyTier: String? = null,
    val totalBookings: Int = 0,
    val lastBookingAt: String? = null,
)

data class ClientUpsertRequest(
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val stage: String? = null,
    val source: String? = null,
    val notes: String? = null,
)

data class ServiceDetail(
    val id: String,
    val name: String,
    val description: String = "",
    val priceLkr: Int? = null,
    val durationMinutes: Int? = null,
    val isActive: Boolean = true,
    val isPublished: Boolean = true,
)

data class ServiceUpsertRequest(
    val name: String,
    val description: String? = null,
    val priceLkr: Int? = null,
    val durationMinutes: Int? = null,
    val isActive: Boolean? = null,
    val isPublished: Boolean? = null,
)

data class StaffDetail(
    val id: String,
    val name: String,
    val email: String = "",
    val phone: String = "",
    val isActive: Boolean = true,
    val primaryLocationName: String? = null,
)

data class StaffUpsertRequest(
    val name: String,
    val email: String? = null,
    val phone: String? = null,
    val isActive: Boolean? = null,
)

data class LocationDetail(
    val id: String,
    val name: String,
    val address: String = "",
    val timezone: String = "Asia/Colombo",
    val phone: String = "",
    val isActive: Boolean = true,
)

data class LocationUpsertRequest(
    val name: String,
    val address: String? = null,
    val timezone: String? = null,
    val phone: String? = null,
    val isActive: Boolean? = null,
    val isDefault: Boolean? = null,
)

data class ReviewDetail(
    val id: String,
    val clientName: String,
    val rating: Int? = null,
    val comment: String = "",
    val serviceName: String = "",
    val ownerReply: String? = null,
    val isPublished: Boolean = true,
    val createdAt: String = "",
)

data class PaymentDetail(
    val id: String,
    val orderId: String = "",
    val clientName: String = "",
    val serviceName: String = "",
    val staffName: String = "",
    val amountLkr: Int? = null,
    val status: String = "",
    val createdAt: String = "",
)

data class BroadcastResult(
    val id: String,
    val status: String,
    val recipientCount: Int = 0,
    val channel: String = "",
)

data class AutomationToggleResult(
    val id: String,
    val isActive: Boolean,
)

data class ReportMetric(
    val label: String,
    val value: String,
)

data class ReportPayload(
    val range: String,
    val metrics: List<ReportMetric>,
    val serverTime: String = "",
    val webPath: String = "/dashboard/reports",
)
