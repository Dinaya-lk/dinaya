package lk.dinaya.mobile.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import java.time.LocalDate

// ——— SMS helper (ACTION_SENDTO smsto:) ————————————————————————————————————
internal fun sendSmsMessage(context: Context, phone: String, message: String? = null) {
    if (phone.isBlank()) return
    val cleaned = phone.replace(Regex("[^0-9+]"), "")
    val uri = if (!message.isNullOrBlank()) {
        Uri.parse("smsto:$cleaned?body=${Uri.encode(message)}")
    } else {
        Uri.parse("smsto:$cleaned")
    }
    context.startActivity(Intent(Intent.ACTION_SENDTO, uri))
}

// ——— Full status chips (edit flow; destructive routes via onRequestStatus) ———
// Destructive targets (cancelled / no_show) are confirmed upstream by
// BookingConfirmStatusDialog, so chips stay dumb and theme-driven.
@Composable
internal fun BookingStatusChips(
    currentStatus: String,
    dark: Boolean,
    onRequestStatus: (String) -> Unit,
) {
    val rows = listOf(
        listOf("pending", "confirmed", "completed"),
        listOf("cancelled", "no_show"),
    )
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        rows.forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                row.forEach { status ->
                    val selected = currentStatus.equals(status, ignoreCase = true)
                    val style = statusStyle(status, dark)
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(DinayaRadiusPill)
                            .background(if (selected) style.background else MaterialTheme.colorScheme.surface)
                            .border(
                                BorderStroke(
                                    1.dp,
                                    if (selected) style.border else MaterialTheme.colorScheme.outline.copy(alpha = 0.6f),
                                ),
                                DinayaRadiusPill,
                            )
                            .clickable { onRequestStatus(status) }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = status.replace("_", " ").replaceFirstChar { it.uppercase() },
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                            color = if (selected) style.text else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

// ——— Native create-booking bottom sheet ———————————————————————————————————
// Service options come from the services module payload (real ids for the
// typed create API); staff options come from bootstrap + calendar payloads.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun NewBookingSheet(
    state: DinayaUiState,
    viewModel: DinayaViewModel,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    LaunchedEffect(Unit) {
        viewModel.ensureServicesModule()
    }

    val serviceItems = state.moduleContent["services"]?.payload?.items.orEmpty()
    val staffOptions = remember(state.bootstrap, state.calendarData) {
        (state.bootstrap?.staff.orEmpty() + state.calendarData?.staff.orEmpty())
            .distinctBy { it.id }
            .filter { it.id.isNotBlank() }
    }
    val today = remember { runCatching { LocalDate.now() }.getOrNull() }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = DinayaRadiusSheet,
        containerColor = dinayaSheetContainerColor(dinayaIsDark(MaterialTheme.colorScheme)),
        contentColor = MaterialTheme.colorScheme.onSurface,
        scrimColor = dinayaSheetScrimColor(dinayaIsDark(MaterialTheme.colorScheme)),
        tonalElevation = 0.dp,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                Box(
                    modifier = Modifier
                        .size(width = 40.dp, height = 4.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)),
                )
            }

            Text(
                text = "New booking",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = "Creates instantly — no web dashboard needed.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            if (state.createBookingError != null) {
                ErrorBanner(state.createBookingError, onDismiss = viewModel::clearCreateBookingError)
            }

            AuthField(
                value = state.draftClientName,
                onValueChange = viewModel::updateDraftClientName,
                label = "Client name *",
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(modifier = Modifier.weight(1f)) {
                    AuthField(
                        value = state.draftClientPhone,
                        onValueChange = viewModel::updateDraftClientPhone,
                        label = "Phone",
                        keyboardType = KeyboardType.Phone,
                    )
                }
                Box(modifier = Modifier.weight(1f)) {
                    AuthField(
                        value = state.draftTime,
                        onValueChange = viewModel::updateDraftTime,
                        label = "Time (HH:mm)",
                        keyboardType = KeyboardType.Number,
                    )
                }
            }
            AuthField(
                value = state.draftClientEmail,
                onValueChange = viewModel::updateDraftClientEmail,
                label = "Email (optional)",
                keyboardType = KeyboardType.Email,
            )

            // Service picker (real ids from services module payload)
            Text(
                text = "SERVICE *",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (serviceItems.isEmpty()) {
                SiteEmptyState(
                    title = "Loading services…",
                    body = "Fetching your service catalog for the picker.",
                )
            } else {
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                    ),
                    shape = DinayaRadiusCard,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
                    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                ) {
                    Column(
                        modifier = Modifier
                            .height(148.dp)
                            .verticalScroll(rememberScrollState())
                            .padding(8.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        serviceItems.forEach { item ->
                            val selected = state.draftServiceId == item.id
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(DinayaRadiusButton)
                                    .background(
                                        if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                                        else MaterialTheme.colorScheme.surface,
                                    )
                                    .border(
                                        BorderStroke(
                                            1.dp,
                                            if (selected) MaterialTheme.colorScheme.primary
                                            else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                                        ),
                                        DinayaRadiusButton,
                                    )
                                    .clickable { viewModel.updateDraftService(item.id, item.title) }
                                    .padding(horizontal = 12.dp, vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    text = item.title.ifBlank { "Untitled service" },
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                                    color = if (selected) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.onSurface,
                                    modifier = Modifier.weight(1f),
                                )
                                item.subtitle?.takeIf { it.isNotBlank() }?.let {
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = it.take(24),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Staff picker chips
            if (staffOptions.isNotEmpty()) {
                Text(
                    text = "STAFF",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    FilterChip(
                        label = "Any staff",
                        active = state.draftStaffId == null,
                        onClick = { viewModel.updateDraftStaff(null) },
                    )
                    staffOptions.forEach { staff ->
                        FilterChip(
                            label = staff.name,
                            active = state.draftStaffId == staff.id,
                            onClick = { viewModel.updateDraftStaff(staff.id) },
                        )
                    }
                }
            }

            // Date quick chips + manual field
            Text(
                text = "DATE *",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (today != null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    listOf(0L to "Today", 1L to "Tomorrow").forEach { (offset, label) ->
                        val date = today.plusDays(offset).toString()
                        val active = state.draftDate == date
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(DinayaRadiusPill)
                                .background(
                                    if (active) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.surface,
                                )
                                .border(
                                    BorderStroke(
                                        1.dp,
                                        if (active) MaterialTheme.colorScheme.primary
                                        else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                                    ),
                                    DinayaRadiusPill,
                                )
                                .clickable { viewModel.updateDraftDate(date) }
                                .padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = label,
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
                                color = if (active) MaterialTheme.colorScheme.onPrimary
                                else MaterialTheme.colorScheme.onSurface,
                            )
                        }
                    }
                }
            }
            AuthField(
                value = state.draftDate,
                onValueChange = viewModel::updateDraftDate,
                label = "Date (YYYY-MM-DD)",
            )
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("09:00", "12:00", "15:00", "18:00").forEach { slot ->
                    val active = state.draftTime == slot
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(DinayaRadiusPill)
                            .background(
                                if (active) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                                else MaterialTheme.colorScheme.surface,
                            )
                            .border(
                                BorderStroke(
                                    1.dp,
                                    if (active) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                                ),
                                DinayaRadiusPill,
                            )
                            .clickable { viewModel.updateDraftTime(slot) }
                            .padding(vertical = 6.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = slot,
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
                            color = if (active) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            AuthField(
                value = state.draftNotes,
                onValueChange = viewModel::updateDraftNotes,
                label = "Notes (optional)",
            )

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(
                    onClick = onDismiss,
                    enabled = !state.isCreatingBooking,
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                ) {
                    Text("Cancel")
                }
                Button(
                    onClick = viewModel::createBooking,
                    enabled = !state.isCreatingBooking,
                    shape = DinayaRadiusButton,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp),
                    modifier = Modifier
                        .weight(2f)
                        .height(48.dp),
                ) {
                    if (state.isCreatingBooking) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp,
                        )
                    } else {
                        Text("Create booking", fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

// ——— Native reschedule bottom sheet ——————————————————————————————————————
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun RescheduleBookingSheet(
    state: DinayaUiState,
    viewModel: DinayaViewModel,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val today = remember { runCatching { LocalDate.now() }.getOrNull() }
    val booking = remember(
        state.rescheduleBookingId,
        state.bookings,
        state.overviewData,
        state.calendarData,
    ) {
        val id = state.rescheduleBookingId
        state.bookings.firstOrNull { it.id == id }
            ?: state.overviewData?.todayRows?.firstOrNull { it.id == id }
            ?: state.overviewData?.nextRows?.firstOrNull { it.id == id }
            ?: state.calendarData?.rows?.firstOrNull { it.id == id }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = DinayaRadiusSheet,
        containerColor = dinayaSheetContainerColor(dinayaIsDark(MaterialTheme.colorScheme)),
        contentColor = MaterialTheme.colorScheme.onSurface,
        scrimColor = dinayaSheetScrimColor(dinayaIsDark(MaterialTheme.colorScheme)),
        tonalElevation = 0.dp,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                Box(
                    modifier = Modifier
                        .size(width = 40.dp, height = 4.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)),
                )
            }

            Text(
                text = "Reschedule",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = booking?.let {
                    "${it.clientName.ifBlank { "Client" }} · ${it.serviceName}"
                } ?: "Pick a new date and time.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            if (state.rescheduleError != null) {
                ErrorBanner(state.rescheduleError)
            }

            Text(
                text = "DATE *",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (today != null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    listOf(0L to "Today", 1L to "Tomorrow").forEach { (offset, label) ->
                        val date = today.plusDays(offset).toString()
                        val active = state.rescheduleDate == date
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(DinayaRadiusPill)
                                .background(
                                    if (active) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.surface,
                                )
                                .border(
                                    BorderStroke(
                                        1.dp,
                                        if (active) MaterialTheme.colorScheme.primary
                                        else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                                    ),
                                    DinayaRadiusPill,
                                )
                                .clickable { viewModel.updateRescheduleDate(date) }
                                .padding(vertical = 8.dp)
                                .semantics { contentDescription = "Set reschedule date to $label" },
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = label,
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
                                color = if (active) MaterialTheme.colorScheme.onPrimary
                                else MaterialTheme.colorScheme.onSurface,
                            )
                        }
                    }
                }
            }
            AuthField(
                value = state.rescheduleDate,
                onValueChange = viewModel::updateRescheduleDate,
                label = "Date (YYYY-MM-DD)",
            )

            Text(
                text = "TIME *",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("09:00", "12:00", "15:00", "18:00").forEach { slot ->
                    val active = state.rescheduleTime == slot
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(DinayaRadiusPill)
                            .background(
                                if (active) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                                else MaterialTheme.colorScheme.surface,
                            )
                            .border(
                                BorderStroke(
                                    1.dp,
                                    if (active) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                                ),
                                DinayaRadiusPill,
                            )
                            .clickable { viewModel.updateRescheduleTime(slot) }
                            .padding(vertical = 6.dp)
                            .semantics { contentDescription = "Set reschedule time to $slot" },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = slot,
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
                            color = if (active) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            AuthField(
                value = state.rescheduleTime,
                onValueChange = viewModel::updateRescheduleTime,
                label = "Time (HH:mm)",
                keyboardType = KeyboardType.Number,
            )

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(
                    onClick = onDismiss,
                    enabled = !state.isRescheduling,
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp)
                        .semantics { contentDescription = "Cancel reschedule" },
                ) {
                    Text("Cancel")
                }
                Button(
                    onClick = viewModel::rescheduleBooking,
                    enabled = !state.isRescheduling,
                    shape = DinayaRadiusButton,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp),
                    modifier = Modifier
                        .weight(2f)
                        .height(48.dp)
                        .semantics { contentDescription = "Save new booking time" },
                ) {
                    if (state.isRescheduling) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp,
                        )
                    } else {
                        Text("Save", fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

// ——— Small filter chip shared by the booking sheets ———————————————————————
@Composable
private fun FilterChip(label: String, active: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(DinayaRadiusPill)
            .background(
                if (active) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                else MaterialTheme.colorScheme.surface,
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
            .padding(horizontal = 12.dp, vertical = 6.dp),
        contentAlignment = Alignment.Center,
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
