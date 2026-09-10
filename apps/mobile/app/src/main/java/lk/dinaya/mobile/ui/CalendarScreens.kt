package lk.dinaya.mobile.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import java.time.LocalDate
import lk.dinaya.mobile.data.CalendarDay
import lk.dinaya.mobile.data.StaffSummary

// ——— Day / Week view toggle (primary blue, theme-driven surfaces) —————————
@Composable
internal fun CalendarViewToggle(view: String, onChange: (String) -> Unit) {
    val reduceMotion = LocalReduceMotion.current
    Row(
        modifier = Modifier
            .clip(DinayaRadiusPill)
            .dinayaGlass(DinayaRadiusPill, dinayaIsDark(MaterialTheme.colorScheme), reduceMotion)
            .padding(3.dp),
    ) {
        listOf("day" to "Day", "week" to "Week").forEach { (vKey, vLabel) ->
            val active = view == vKey
            val highlight by animateFloatAsState(
                targetValue = if (active) 1f else 0f,
                animationSpec = if (reduceMotion) tween(0) else dinayaNoBounceSpring(),
                label = "calendarToggleHighlight",
            )
            Box(
                modifier = Modifier
                    .heightIn(min = 36.dp)
                    .clip(DinayaRadiusPill)
                    .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.22f + (0.78f * highlight)))
                    .dinayaBounceClick(scaleDown = 0.96f, onClick = { onChange(vKey) })
                    .padding(horizontal = 14.dp, vertical = 8.dp),
            ) {
                Text(
                    text = vLabel,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
                    color = if (active) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.graphicsLayer { alpha = 0.72f + (0.28f * highlight) },
                )
            }
        }
    }
}

// ——— Date navigator: week-aware prev/next + Today shortcut ————————————————
// In week view the chevrons jump 7 days; in day view they step 1 day.
@Composable
internal fun CalendarDateNavigator(
    currentDate: String,
    view: String,
    onSelectDate: (String) -> Unit,
) {
    val step = if (view == "week") 7L else 1L
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = DinayaRadiusCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(
                onClick = {
                    val prev = runCatching {
                        LocalDate.parse(currentDate).minusDays(step).toString()
                    }.getOrDefault(currentDate)
                    onSelectDate(prev)
                },
            ) {
                Icon(
                    imageVector = Icons.Filled.ChevronLeft,
                    contentDescription = if (view == "week") "Previous week" else "Previous day",
                )
            }

            TextButton(
                onClick = { onSelectDate(LocalDate.now().toString()) },
            ) {
                Text(
                    text = "Today · ${formatDateHeader(currentDate)}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.primary,
                )
            }

            IconButton(
                onClick = {
                    val next = runCatching {
                        LocalDate.parse(currentDate).plusDays(step).toString()
                    }.getOrDefault(currentDate)
                    onSelectDate(next)
                },
            ) {
                Icon(
                    imageVector = Icons.Filled.ChevronRight,
                    contentDescription = if (view == "week") "Next week" else "Next day",
                )
            }
        }
    }
}

// ——— 7-day week strip from CalendarPayload.days ———————————————————————————
// Falls back to a locally computed week around currentDate when the payload
// has no day list (e.g. day view returns a single day).
@Composable
internal fun CalendarWeekStrip(
    days: List<CalendarDay>,
    currentDate: String,
    onSelectDate: (String) -> Unit,
) {
    val stripDays = rememberStripDays(days, currentDate)
    if (stripDays.isEmpty()) return
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        stripDays.forEach { day ->
            val isSelected = day.date == currentDate
            val isToday = day.date == LocalDate.now().toString()
            Box(
                modifier = Modifier
                    .clip(DinayaRadiusPill)
                    .background(
                        if (isSelected) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.surface,
                    )
                    .border(
                        BorderStroke(
                            1.dp,
                            when {
                                isSelected -> MaterialTheme.colorScheme.primary
                                isToday -> MaterialTheme.colorScheme.primary.copy(alpha = 0.6f)
                                else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                            },
                        ),
                        DinayaRadiusPill,
                    )
                    .clickable { onSelectDate(day.date) }
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = day.label,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Medium,
                        color = if (isSelected) MaterialTheme.colorScheme.onPrimary
                        else MaterialTheme.colorScheme.onSurface,
                    )
                    if (isToday && !isSelected) {
                        Text(
                            text = "Today",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun rememberStripDays(
    days: List<CalendarDay>,
    currentDate: String,
): List<CalendarDay> {
    if (days.size > 1) return days
    // Day view (or empty payload): synthesize the surrounding Mon–Sun week so
    // the strip still enables week navigation without a server round-trip.
    return runCatching {
        val anchor = LocalDate.parse(currentDate)
        val monday = anchor.minusDays((anchor.dayOfWeek.value - 1).toLong())
        (0L..6L).map { offset ->
            val date = monday.plusDays(offset)
            val existing = days.firstOrNull { it.date == date.toString() }
            existing ?: CalendarDay(
                date = date.toString(),
                label = formatDateHeader(date.toString()),
            )
        }
    }.getOrDefault(days)
}

// ——— Staff filter chips (scrollable, single-select + All) —————————————————
@Composable
internal fun CalendarStaffChips(
    staff: List<StaffSummary>,
    selectedStaffId: String?,
    onSelect: (String?) -> Unit,
) {
    if (staff.isEmpty()) return
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        CalendarStaffChip(
            label = "All staff",
            active = selectedStaffId == null,
            onClick = { onSelect(null) },
        )
        staff.forEach { member ->
            CalendarStaffChip(
                label = member.name,
                active = selectedStaffId == member.id,
                onClick = { onSelect(member.id) },
            )
        }
    }
}

@Composable
private fun CalendarStaffChip(label: String, active: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(DinayaRadiusPill)
            .background(
                if (active) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                else Color.Transparent,
            )
            .border(
                BorderStroke(
                    1.dp,
                    if (active) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                ),
                DinayaRadiusPill,
            )
            .clickable { onClick() }
            .padding(horizontal = 10.dp, vertical = 5.dp),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
            color = if (active) MaterialTheme.colorScheme.primary
            else MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
