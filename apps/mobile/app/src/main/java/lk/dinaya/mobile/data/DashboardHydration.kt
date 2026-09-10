package lk.dinaya.mobile.data

internal fun shouldUseOverviewTodayRows(overview: OverviewPayload?): Boolean =
    overview != null && overview.todayRows.isNotEmpty()

internal fun bookingsResultFromOverview(overview: OverviewPayload, serverTime: String): BookingsResult =
    BookingsResult(
        tab = "today",
        rows = overview.todayRows,
        serverTime = serverTime.ifBlank { overview.todayRows.firstOrNull()?.startsAt.orEmpty() },
        isStale = overview.isStale,
    )
