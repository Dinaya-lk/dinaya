package lk.dinaya.mobile.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import lk.dinaya.mobile.data.AvailabilityMember
import lk.dinaya.mobile.data.AvailabilityWindow
import lk.dinaya.mobile.data.BookingSummary
import lk.dinaya.mobile.data.ModuleItem
import lk.dinaya.mobile.data.ModuleMetric

// ——— Catalog workspace: dedicated native screens —————————————————————————
// Clients, Services, Staff, Locations, Availability graduate from the generic
// ModuleWorkspace to typed screens below. Card/shape tokens reuse
// DinayaRadiusCard + MaterialTheme colors so light/dark stay site-consistent.

// ═══ Shared atoms ═══════════════════════════════════════════════════════════

@Composable
internal fun CatalogErrorBanner(message: String?, onDismiss: (() -> Unit)? = null) {
    if (message.isNullOrBlank()) return
    Surface(
        color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.95f),
        shape = DinayaRadiusCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.4f)),
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Filled.Warning,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.error,
                modifier = Modifier.size(18.dp),
            )
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                text = message,
                color = MaterialTheme.colorScheme.onErrorContainer,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.weight(1f),
            )
            if (onDismiss != null) {
                Spacer(modifier = Modifier.width(6.dp))
                IconButton(onClick = onDismiss, modifier = Modifier.size(44.dp)) {
                    Icon(
                        imageVector = Icons.Filled.Close,
                        contentDescription = "Dismiss",
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
        }
    }
}

@Composable
internal fun CatalogNoticeBanner(message: String?) {
    if (message.isNullOrBlank()) return
    Surface(
        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
        shape = DinayaRadiusCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)),
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Filled.Check,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(18.dp),
            )
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                text = message,
                color = MaterialTheme.colorScheme.onSurface,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium,
            )
        }
    }
}

@Composable
internal fun CatalogHeader(
    title: String,
    subtitle: String,
    isLoading: Boolean,
    onRefresh: () -> Unit,
    onOpenWeb: () -> Unit,
    action: (@Composable () -> Unit)? = null,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(2.dp),
                modifier = Modifier.weight(1f),
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            OutlinedButton(
                onClick = onRefresh,
                enabled = !isLoading,
                shape = DinayaRadiusButton,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                modifier = Modifier.height(48.dp),
            ) {
                Text("Refresh", style = MaterialTheme.typography.labelMedium)
            }
        }
        action?.invoke()
        Text(
            text = "Open in browser",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.72f),
            textDecoration = TextDecoration.Underline,
            modifier = Modifier
                .heightIn(min = 44.dp)
                .clickable(onClick = onOpenWeb)
                .semantics { contentDescription = "Open catalog in browser" }
                .padding(vertical = 8.dp),
        )
    }
}

@Composable
internal fun CatalogMetricsGrid(metrics: List<ModuleMetric>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        metrics.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { metric ->
                    Card(
                        modifier = Modifier.weight(1f),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        shape = DinayaRadiusCard,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
                        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                    ) {
                        Column(
                            modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(2.dp),
                        ) {
                            Text(
                                text = metric.label.uppercase(),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(
                                text = metric.value,
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            metric.detail?.takeIf { it.isNotBlank() }?.let {
                                Text(
                                    text = it,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                        }
                    }
                }
                if (row.size == 1) Spacer(modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
internal fun CatalogChips(options: List<Pair<String, String>>, selected: String, onSelect: (String) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        options.forEach { (key, label) ->
            val active = selected == key
            Box(
                modifier = Modifier
                    .clip(DinayaRadiusPill)
                    .background(
                        if (active) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.surface,
                    )
                    .border(
                        BorderStroke(
                            1.dp,
                            if (active) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.outline,
                        ),
                        DinayaRadiusPill,
                    )
                    .clickable { onSelect(key) }
                    .padding(horizontal = 12.dp, vertical = 7.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
                    color = if (active) MaterialTheme.colorScheme.onPrimary
                    else MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                )
            }
        }
    }
}

@Composable
internal fun CatalogStatusPill(status: String) {
    val style = statusStyle(status, false)
    // statusStyle(dark=false) is fine for shape; resolve actual dark tones via scheme:
    Box(
        modifier = Modifier
            .clip(DinayaRadiusPill)
            .background(style.background.copy(alpha = 0.9f))
            .border(BorderStroke(1.dp, style.border), DinayaRadiusPill)
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(
            text = status.replace("_", " ").replaceFirstChar { it.uppercase() },
            style = MaterialTheme.typography.bodySmall,
            color = style.text,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
        )
    }
}

@Composable
internal fun CatalogInitials(name: String) {
    val initials = name.trim().split(" ").filter { it.isNotBlank() }.take(2)
        .joinToString("") { it.first().uppercase() }.ifBlank { "D" }
    Box(
        modifier = Modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.primaryContainer),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = initials,
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onPrimaryContainer,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
internal fun CatalogEmptyState(
    title: String,
    body: String,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = DinayaRadiusCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = body,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (actionLabel != null && onAction != null) {
                Button(
                    onClick = onAction,
                    shape = DinayaRadiusButton,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .semantics { contentDescription = actionLabel },
                ) {
                    Icon(imageVector = Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(actionLabel, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
internal fun CatalogLoading() {
    Box(
        modifier = Modifier.fillMaxWidth().padding(28.dp),
        contentAlignment = Alignment.Center,
    ) {
        CircularProgressIndicator(
            modifier = Modifier.size(30.dp),
            color = MaterialTheme.colorScheme.primary,
            strokeWidth = 3.dp,
        )
    }
}

@Composable
internal fun CatalogField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    keyboardType: KeyboardType = KeyboardType.Text,
    singleLine: Boolean = true,
    supportingError: String? = null,
    placeholder: String = label,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurface,
        )
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = {
                Text(
                    placeholder,
                    style = DinayaFieldTextStyle,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                )
            },
            singleLine = singleLine,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            shape = DinayaRadiusField,
            isError = supportingError != null,
            supportingText = supportingError?.let { { Text(it, color = MaterialTheme.colorScheme.error) } },
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                focusedContainerColor = MaterialTheme.colorScheme.surface,
                unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                cursorColor = MaterialTheme.colorScheme.primary,
            ),
            textStyle = DinayaFieldTextStyle.copy(color = MaterialTheme.colorScheme.onSurface),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

// ═══ Clients (upgraded) ═════════════════════════════════════════════════════

private val ClientStages = listOf(
    "all" to "All",
    "lead" to "Leads",
    "prospect" to "Prospects",
    "active" to "Active",
    "churned" to "Churned",
)

@Composable
internal fun CatalogClientsScreen(
    state: DinayaUiState,
    moduleState: ModuleContentState?,
    searchQuery: String,
    bookings: List<BookingSummary>,
    onRefresh: () -> Unit,
    onOpenWeb: () -> Unit,
    viewModel: DinayaViewModel,
) {
    val payload = moduleState?.payload
    var stage by remember { mutableStateOf("all") }
    var sheetOpen by remember { mutableStateOf(false) }
    val form = state.clientForm

    LaunchedEffect(form.id, form.name, form.phone, form.email, form.stage) {
        if (sheetOpen && form.id == null && form.name.isBlank() && form.phone.isBlank() &&
            form.email.isBlank() && form.formError == null
        ) {
            sheetOpen = false
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        CatalogHeader(
            title = "Clients",
            subtitle = "CRM records, stages, and recent activity",
            isLoading = moduleState?.isLoading == true || state.catalogBusy,
            onRefresh = onRefresh,
            onOpenWeb = onOpenWeb,
            action = {
                OutlinedButton(
                    onClick = { viewModel.startClientCreate(); sheetOpen = true },
                    shape = DinayaRadiusButton,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.primary),
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                ) {
                    Icon(imageVector = Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Add client", style = MaterialTheme.typography.labelLarge)
                }
            },
        )
        CatalogErrorBanner(state.catalogError, onDismiss = viewModel::clearCatalogError)
        CatalogNoticeBanner(state.catalogNotice)

        if (payload?.metrics?.isNotEmpty() == true) CatalogMetricsGrid(payload.metrics)

        CatalogChips(ClientStages, stage) { stage = it }

        val items = payload?.items.orEmpty().filter { item ->
            (stage == "all" || item.status.equals(stage, ignoreCase = true)) &&
                (searchQuery.isBlank() ||
                    item.title.contains(searchQuery, ignoreCase = true) ||
                    (item.subtitle?.contains(searchQuery, ignoreCase = true) == true))
        }

        if (moduleState?.isLoading == true && items.isEmpty()) {
            CatalogLoading()
        } else if (items.isEmpty()) {
            CatalogEmptyState(
                title = if (searchQuery.isNotBlank()) "No clients found" else "No clients yet",
                body = if (searchQuery.isNotBlank()) "No clients match \"$searchQuery\"."
                else "Add a client to keep their bookings and notes in one place.",
                actionLabel = if (searchQuery.isBlank()) "Add client" else null,
                onAction = if (searchQuery.isBlank()) {
                    { viewModel.startClientCreate(); sheetOpen = true }
                } else {
                    null
                },
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items.forEach { item ->
                    CatalogClientRow(
                        item = item,
                        onClick = { viewModel.selectCatalogClient(item) },
                    )
                }
            }
        }
    }

    state.selectedClient?.let { client ->
        CatalogClientDetailSheet(
            client = client,
            detailName = state.clientDetail?.name?.ifBlank { null } ?: client.title,
            detailPhone = state.clientDetail?.phone.orEmpty().ifBlank {
                client.subtitle?.split("·", ",", "—")?.firstOrNull()?.trim().orEmpty()
            },
            detailEmail = state.clientDetail?.email.orEmpty(),
            stage = state.clientDetail?.stage ?: client.status,
            source = state.clientDetail?.source,
            internalNotes = state.clientDetail?.internalNotes,
            notes = state.clientDetail?.notes?.map { it.body to it.createdAt }.orEmpty(),
            history = bookings.filter { b ->
                (b.clientId != null && b.clientId == client.id) ||
                    (b.clientName.isNotBlank() && b.clientName.equals(client.title, ignoreCase = true))
            }.take(10),
            noteDraft = state.clientNoteDraft,
            busy = state.catalogBusy,
            saveError = state.catalogError,
            onNoteChange = viewModel::setClientNoteDraft,
            onSaveNote = viewModel::saveClientNote,
            onStageChange = { next -> viewModel.updateClientStage(client.id, next) },
            onDismiss = { viewModel.selectCatalogClient(null) },
        )
    }

    if (sheetOpen) {
        CatalogClientSheet(
            form = form,
            busy = state.catalogBusy,
            isCreate = form.id == null,
            onForm = viewModel::updateClientForm,
            onSave = viewModel::saveClient,
            onDismiss = { sheetOpen = false; viewModel.clearClientForm() },
        )
    }
}

@Composable
private fun CatalogClientRow(item: ModuleItem, onClick: () -> Unit) {
    val context = LocalContext.current
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = DinayaRadiusCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CatalogInitials(item.title)
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = item.title,
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    item.status?.let {
                        Spacer(modifier = Modifier.width(8.dp))
                        CatalogStatusPill(it)
                    }
                }
                item.subtitle?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                item.meta?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            val phone = item.subtitle?.split("·", ",", "—")?.firstOrNull()?.trim().orEmpty()
            if (phone.any { it.isDigit() }) {
                IconButton(onClick = { catalogDial(context, phone) }, modifier = Modifier.size(44.dp)) {
                    Icon(
                        imageVector = Icons.Filled.Phone,
                        contentDescription = "Call",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CatalogClientDetailSheet(
    client: ModuleItem,
    detailName: String,
    detailPhone: String,
    detailEmail: String,
    stage: String?,
    source: String?,
    internalNotes: String?,
    notes: List<Pair<String, String>>,
    history: List<BookingSummary>,
    noteDraft: String,
    busy: Boolean,
    saveError: String?,
    onNoteChange: (String) -> Unit,
    onSaveNote: () -> Unit,
    onStageChange: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    val context = LocalContext.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = DinayaRadiusSheet,
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = MaterialTheme.colorScheme.onSurface,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                Box(
                    modifier = Modifier
                        .size(width = 40.dp, height = 4.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)),
                )
            }
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                CatalogInitials(detailName)
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = detailName, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
                    if (detailPhone.isNotBlank()) {
                        Text(
                            text = detailPhone,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.clickable { catalogDial(context, detailPhone) },
                        )
                    }
                    if (detailEmail.isNotBlank()) {
                        Text(
                            text = detailEmail,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.clickable { catalogEmail(context, detailEmail) },
                        )
                    }
                }
                stage?.let { CatalogStatusPill(it) }
            }

            if (detailPhone.any { it.isDigit() }) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = { catalogDial(context, detailPhone) },
                        shape = DinayaRadiusButton,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                        modifier = Modifier.weight(1f).height(48.dp),
                    ) {
                        Icon(imageVector = Icons.Filled.Phone, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Call", style = MaterialTheme.typography.labelLarge)
                    }
                    OutlinedButton(
                        onClick = { catalogWhatsApp(context, detailPhone, "Hi $detailName! Just following up from your recent visit.") },
                        shape = DinayaRadiusButton,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                        modifier = Modifier.weight(1f).height(48.dp),
                    ) {
                        Icon(imageVector = Icons.AutoMirrored.Filled.Chat, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Message", style = MaterialTheme.typography.labelLarge)
                    }
                    if (detailEmail.isNotBlank()) {
                        OutlinedButton(
                            onClick = { catalogEmail(context, detailEmail) },
                            shape = DinayaRadiusButton,
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                            modifier = Modifier.weight(1f).height(48.dp),
                        ) {
                            Icon(imageVector = Icons.Filled.Email, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Email", style = MaterialTheme.typography.labelLarge)
                        }
                    }
                }
            }

            // Stage editor
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("STAGE", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                CatalogChips(ClientStages.drop(1), stage?.lowercase() ?: "active") { onStageChange(it) }
            }

            if (!source.isNullOrBlank() || !internalNotes.isNullOrBlank()) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)),
                    shape = DinayaRadiusCard,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
                    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        source?.let { Text("Source: $it", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface) }
                        internalNotes?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    }
                }
            }

            // Booking history
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "BOOKING HISTORY (${history.size})",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (history.isEmpty()) {
                    Text(
                        "No bookings linked to this client yet.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    history.forEach { booking ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = booking.serviceName.ifBlank { "Booking" },
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                Text(
                                    text = booking.startsAt.take(16).replace("T", " "),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            CatalogStatusPill(booking.status.ifBlank { "booked" })
                        }
                        HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
                    }
                }
            }

            // Notes
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("NOTES (${notes.size})", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                notes.forEach { (body, createdAt) ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)),
                        shape = DinayaRadiusCard,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
                        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(text = body, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                            if (createdAt.isNotBlank()) {
                                Text(
                                    text = createdAt.take(16).replace("T", " "),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
                OutlinedTextField(
                    value = noteDraft,
                    onValueChange = onNoteChange,
                    placeholder = {
                        Text(
                            "Add a note about ${detailName.split(" ").firstOrNull().orEmpty()}…",
                            style = DinayaFieldTextStyle,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                        )
                    },
                    shape = DinayaRadiusField,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                        focusedContainerColor = MaterialTheme.colorScheme.surface,
                        unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                    ),
                    textStyle = DinayaFieldTextStyle.copy(color = MaterialTheme.colorScheme.onSurface),
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                )
                CatalogErrorBanner(saveError)
                Button(
                    onClick = onSaveNote,
                    enabled = !busy && noteDraft.isNotBlank(),
                    shape = DinayaRadiusButton,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp),
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                ) {
                    if (busy) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                    } else {
                        Text("Save note", fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CatalogClientSheet(
    form: ClientFormState,
    busy: Boolean,
    isCreate: Boolean,
    onForm: (ClientFormState) -> Unit,
    onSave: () -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = DinayaRadiusSheet,
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = MaterialTheme.colorScheme.onSurface,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                text = if (isCreate) "New client" else "Edit client",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface,
            )
            CatalogErrorBanner(form.formError)
            CatalogField(
                label = "Name",
                value = form.name,
                onValueChange = { onForm(form.copy(name = it)) },
                supportingError = if (form.name.isBlank() && form.formError != null) "Name is required." else null,
            )
            CatalogField(
                label = "Phone",
                value = form.phone,
                onValueChange = { onForm(form.copy(phone = it)) },
                keyboardType = KeyboardType.Phone,
                supportingError = form.formError?.takeIf { it.contains("phone", ignoreCase = true) },
            )
            CatalogField(
                label = "Email",
                value = form.email,
                onValueChange = { onForm(form.copy(email = it)) },
                keyboardType = KeyboardType.Email,
                supportingError = form.formError?.takeIf { it.contains("email", ignoreCase = true) },
            )
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("STAGE", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                CatalogChips(ClientStages.drop(1), form.stage.lowercase().ifBlank { "lead" }) { onForm(form.copy(stage = it)) }
            }
            Button(
                onClick = onSave,
                enabled = !busy,
                shape = DinayaRadiusButton,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = MaterialTheme.colorScheme.onPrimary),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp),
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) {
                if (busy) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                } else {
                    Text(if (isCreate) "Add client" else "Save client", fontWeight = FontWeight.SemiBold)
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

// ═══ Services ═══════════════════════════════════════════════════════════════

@Composable
internal fun ServicesScreen(
    state: DinayaUiState,
    moduleState: ModuleContentState?,
    searchQuery: String,
    onRefresh: () -> Unit,
    onOpenWeb: () -> Unit,
    viewModel: DinayaViewModel,
) {
    val payload = moduleState?.payload
    var filter by remember { mutableStateOf("all") }
    var sheetOpen by remember { mutableStateOf(false) }
    val form = state.serviceForm

    LaunchedEffect(form.id, form.name, form.priceLkr, form.durationMinutes, form.description) {
        // Close the sheet once an edit round-trips (form reset by ViewModel).
        if (sheetOpen && form.id == null && form.name.isBlank() && form.priceLkr.isBlank() &&
            form.durationMinutes.isBlank() && form.description.isBlank() && form.formError == null
        ) {
            sheetOpen = false
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        CatalogHeader(
            title = "Services",
            subtitle = "Pricing, duration, and availability",
            isLoading = moduleState?.isLoading == true || state.catalogBusy,
            onRefresh = onRefresh,
            onOpenWeb = onOpenWeb,
            action = {
                OutlinedButton(
                    onClick = { viewModel.startServiceCreate(); sheetOpen = true },
                    shape = DinayaRadiusButton,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.primary),
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                ) {
                    Icon(imageVector = Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Add service", style = MaterialTheme.typography.labelLarge)
                }
            },
        )
        CatalogErrorBanner(state.catalogError, onDismiss = viewModel::clearCatalogError)
        CatalogNoticeBanner(state.catalogNotice)
        if (payload?.metrics?.isNotEmpty() == true) CatalogMetricsGrid(payload.metrics)
        CatalogChips(listOf("all" to "All", "active" to "Active", "inactive" to "Inactive"), filter) { filter = it }

        val items = payload?.items.orEmpty().filter { item ->
            (filter == "all" || item.status.equals(filter, ignoreCase = true) ||
                (filter == "active" && item.status.isNullOrBlank())) &&
                (searchQuery.isBlank() ||
                    item.title.contains(searchQuery, ignoreCase = true) ||
                    (item.subtitle?.contains(searchQuery, ignoreCase = true) == true))
        }
        if (moduleState?.isLoading == true && items.isEmpty()) {
            CatalogLoading()
        } else if (items.isEmpty()) {
            CatalogEmptyState(
                title = "No services yet",
                body = if (searchQuery.isNotBlank()) "No services match \"$searchQuery\"."
                else "Add your first service — name, price, and duration.",
                actionLabel = if (searchQuery.isBlank()) "Add service" else null,
                onAction = if (searchQuery.isBlank()) {
                    { viewModel.startServiceCreate(); sheetOpen = true }
                } else {
                    null
                },
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items.forEach { item ->
                    CatalogServiceRow(
                        item = item,
                        busy = state.catalogBusy,
                        onEdit = { viewModel.startServiceEdit(item); sheetOpen = true },
                        onToggle = { viewModel.toggleServiceActive(item) },
                    )
                }
            }
        }
    }

    if (sheetOpen) {
        CatalogServiceSheet(
            form = form,
            busy = state.catalogBusy,
            isCreate = form.id == null,
            onForm = viewModel::updateServiceForm,
            onSave = viewModel::saveService,
            onDismiss = { sheetOpen = false; viewModel.clearServiceForm() },
        )
    }
}

@Composable
private fun CatalogServiceRow(item: ModuleItem, busy: Boolean, onEdit: () -> Unit, onToggle: () -> Unit) {
    val active = item.status?.lowercase() != "inactive"
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = DinayaRadiusCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.fillMaxWidth().clickable { onEdit() },
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CatalogInitials(item.title)
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = item.title.ifBlank { "Untitled service" },
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    catalogPriceDuration(item.subtitle)?.let {
                        Text(text = it, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
                    }
                    CatalogStatusPill(if (active) "active" else "inactive")
                }
                item.subtitle?.let {
                    Text(text = it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Switch(checked = active, enabled = !busy, onCheckedChange = { onToggle() })
                IconButton(onClick = onEdit, modifier = Modifier.size(44.dp)) {
                    Icon(imageVector = Icons.Filled.Edit, contentDescription = "Edit", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CatalogServiceSheet(
    form: ServiceFormState,
    busy: Boolean,
    isCreate: Boolean,
    onForm: (ServiceFormState) -> Unit,
    onSave: () -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = DinayaRadiusSheet,
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = MaterialTheme.colorScheme.onSurface,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                text = if (isCreate) "New service" else "Edit service",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface,
            )
            CatalogErrorBanner(form.formError)
            CatalogField(
                label = "Name",
                value = form.name,
                onValueChange = { onForm(form.copy(name = it)) },
                supportingError = if (form.name.isBlank() && form.formError != null) "Name is required." else null,
            )
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(modifier = Modifier.weight(1f)) {
                    CatalogField(
                        label = "Price (LKR)",
                        value = form.priceLkr,
                        onValueChange = { onForm(form.copy(priceLkr = it.filter { c -> c.isDigit() })) },
                        keyboardType = KeyboardType.Number,
                        supportingError = form.formError?.takeIf { it.contains("Price") },
                    )
                }
                Box(modifier = Modifier.weight(1f)) {
                    CatalogField(
                        label = "Duration (min)",
                        value = form.durationMinutes,
                        onValueChange = { onForm(form.copy(durationMinutes = it.filter { c -> c.isDigit() }.take(4))) },
                        keyboardType = KeyboardType.Number,
                        supportingError = form.formError?.takeIf { it.contains("Duration") },
                    )
                }
            }
            CatalogField(
                label = "Description",
                value = form.description,
                onValueChange = { onForm(form.copy(description = it)) },
                singleLine = false,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Active", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                Switch(checked = form.isActive, onCheckedChange = { onForm(form.copy(isActive = it)) })
            }
            Button(
                onClick = onSave,
                enabled = !busy,
                shape = DinayaRadiusButton,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = MaterialTheme.colorScheme.onPrimary),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp),
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) {
                if (busy) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                } else {
                    Text(if (isCreate) "Add service" else "Save service", fontWeight = FontWeight.SemiBold)
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

// ═══ Staff ══════════════════════════════════════════════════════════════════

@Composable
internal fun StaffScreen(
    state: DinayaUiState,
    moduleState: ModuleContentState?,
    searchQuery: String,
    onRefresh: () -> Unit,
    onOpenWeb: () -> Unit,
    viewModel: DinayaViewModel,
) {
    val payload = moduleState?.payload
    var filter by remember { mutableStateOf("all") }
    var sheetOpen by remember { mutableStateOf(false) }
    val form = state.staffForm

    LaunchedEffect(form.id, form.name, form.email, form.phone) {
        if (sheetOpen && form.id == null && form.name.isBlank() && form.email.isBlank() && form.phone.isBlank() && form.formError == null) {
            sheetOpen = false
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        CatalogHeader(
            title = "Staff",
            subtitle = "Team members and appointment load",
            isLoading = moduleState?.isLoading == true || state.catalogBusy,
            onRefresh = onRefresh,
            onOpenWeb = onOpenWeb,
            action = {
                OutlinedButton(
                    onClick = { viewModel.startStaffCreate(); sheetOpen = true },
                    shape = DinayaRadiusButton,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.primary),
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                ) {
                    Icon(imageVector = Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Add staff member", style = MaterialTheme.typography.labelLarge)
                }
            },
        )
        CatalogErrorBanner(state.catalogError, onDismiss = viewModel::clearCatalogError)
        CatalogNoticeBanner(state.catalogNotice)
        if (payload?.metrics?.isNotEmpty() == true) CatalogMetricsGrid(payload.metrics)
        CatalogChips(listOf("all" to "All", "active" to "Active", "inactive" to "Inactive"), filter) { filter = it }

        val items = payload?.items.orEmpty().filter { item ->
            (filter == "all" || item.status.equals(filter, ignoreCase = true) ||
                (filter == "active" && item.status.isNullOrBlank())) &&
                (searchQuery.isBlank() ||
                    item.title.contains(searchQuery, ignoreCase = true) ||
                    (item.subtitle?.contains(searchQuery, ignoreCase = true) == true))
        }
        if (moduleState?.isLoading == true && items.isEmpty()) {
            CatalogLoading()
        } else if (items.isEmpty()) {
            CatalogEmptyState(
                title = "No staff yet",
                body = if (searchQuery.isNotBlank()) "No staff match \"$searchQuery\"."
                else "Add a team member to take bookings.",
                actionLabel = if (searchQuery.isBlank()) "Add staff member" else null,
                onAction = if (searchQuery.isBlank()) {
                    { viewModel.startStaffCreate(); sheetOpen = true }
                } else {
                    null
                },
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items.forEach { item ->
                    CatalogStaffRow(
                        item = item,
                        busy = state.catalogBusy,
                        onEdit = { viewModel.startStaffEdit(item); sheetOpen = true },
                        onToggle = { viewModel.toggleStaffActive(item) },
                    )
                }
            }
        }
    }

    if (sheetOpen) {
        CatalogStaffSheet(
            form = form,
            busy = state.catalogBusy,
            isCreate = form.id == null,
            onForm = viewModel::updateStaffForm,
            onSave = viewModel::saveStaff,
            onDismiss = { sheetOpen = false; viewModel.clearStaffForm() },
        )
    }
}

@Composable
private fun CatalogStaffRow(item: ModuleItem, busy: Boolean, onEdit: () -> Unit, onToggle: () -> Unit) {
    val active = item.status?.lowercase() != "inactive"
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = DinayaRadiusCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.fillMaxWidth().clickable { onEdit() },
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(contentAlignment = Alignment.BottomEnd) {
                CatalogInitials(item.title)
                Box(
                    modifier = Modifier
                        .size(12.dp)
                        .clip(CircleShape)
                        .background(if (active) androidx.compose.ui.graphics.Color(0xFF10B981) else androidx.compose.ui.graphics.Color(0xFF9CA3AF))
                        .border(2.dp, MaterialTheme.colorScheme.surface, CircleShape),
                )
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(text = item.title.ifBlank { "Staff member" }, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                item.subtitle?.let {
                    Text(text = it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                item.meta?.let {
                    Text(text = it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Switch(checked = active, enabled = !busy, onCheckedChange = { onToggle() })
                IconButton(onClick = onEdit, modifier = Modifier.size(44.dp)) {
                    Icon(imageVector = Icons.Filled.Edit, contentDescription = "Edit", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CatalogStaffSheet(
    form: StaffFormState,
    busy: Boolean,
    isCreate: Boolean,
    onForm: (StaffFormState) -> Unit,
    onSave: () -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = DinayaRadiusSheet,
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = MaterialTheme.colorScheme.onSurface,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(if (isCreate) "New staff member" else "Edit staff member", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
            CatalogErrorBanner(form.formError)
            CatalogField(
                label = "Name",
                value = form.name,
                onValueChange = { onForm(form.copy(name = it)) },
                supportingError = if (form.name.isBlank() && form.formError != null) "Name is required." else null,
            )
            CatalogField(
                label = "Email",
                value = form.email,
                onValueChange = { onForm(form.copy(email = it)) },
                keyboardType = KeyboardType.Email,
                supportingError = form.formError?.takeIf { it.contains("email", ignoreCase = true) },
            )
            CatalogField(
                label = "Phone",
                value = form.phone,
                onValueChange = { onForm(form.copy(phone = it)) },
                keyboardType = KeyboardType.Phone,
                supportingError = form.formError?.takeIf { it.contains("phone", ignoreCase = true) },
            )
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Active", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                Switch(checked = form.isActive, onCheckedChange = { onForm(form.copy(isActive = it)) })
            }
            Text(
                "Assign this person to services from Staff on the web.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Button(
                onClick = onSave,
                enabled = !busy,
                shape = DinayaRadiusButton,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = MaterialTheme.colorScheme.onPrimary),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp),
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) {
                if (busy) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                } else {
                    Text(if (isCreate) "Add staff member" else "Save staff member", fontWeight = FontWeight.SemiBold)
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

// ═══ Locations ══════════════════════════════════════════════════════════════

@Composable
internal fun LocationsScreen(
    state: DinayaUiState,
    moduleState: ModuleContentState?,
    searchQuery: String,
    onRefresh: () -> Unit,
    onOpenWeb: () -> Unit,
    viewModel: DinayaViewModel,
) {
    val payload = moduleState?.payload
    var sheetOpen by remember { mutableStateOf(false) }
    val form = state.locationForm

    LaunchedEffect(form.id, form.name, form.address, form.timezone) {
        if (sheetOpen && form.id == null && form.name.isBlank() && form.address.isBlank() && form.formError == null) {
            sheetOpen = false
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        CatalogHeader(
            title = "Locations",
            subtitle = "Branches, default location, and coverage",
            isLoading = moduleState?.isLoading == true || state.catalogBusy,
            onRefresh = onRefresh,
            onOpenWeb = onOpenWeb,
            action = {
                OutlinedButton(
                    onClick = {
                        viewModel.startLocationCreate()
                        sheetOpen = true
                    },
                    shape = DinayaRadiusButton,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.primary),
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                ) {
                    Icon(imageVector = Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Add location", style = MaterialTheme.typography.labelLarge)
                }
            },
        )
        CatalogErrorBanner(state.catalogError, onDismiss = viewModel::clearCatalogError)
        CatalogNoticeBanner(state.catalogNotice)
        if (payload?.metrics?.isNotEmpty() == true) CatalogMetricsGrid(payload.metrics)

        val items = payload?.items.orEmpty().filter {
            searchQuery.isBlank() ||
                it.title.contains(searchQuery, ignoreCase = true) ||
                (it.subtitle?.contains(searchQuery, ignoreCase = true) == true)
        }
        if (moduleState?.isLoading == true && items.isEmpty()) {
            CatalogLoading()
        } else if (items.isEmpty()) {
            CatalogEmptyState(
                title = "No locations yet",
                body = if (searchQuery.isNotBlank()) "No locations match \"$searchQuery\"."
                else "Add your first branch.",
                actionLabel = if (searchQuery.isBlank()) "Add location" else null,
                onAction = if (searchQuery.isBlank()) {
                    { viewModel.startLocationCreate(); sheetOpen = true }
                } else {
                    null
                },
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items.forEach { item ->
                    CatalogLocationRow(item = item, onEdit = { viewModel.startLocationEdit(item); sheetOpen = true })
                }
            }
        }
    }

    if (sheetOpen) {
        CatalogLocationSheet(
            form = form,
            busy = state.catalogBusy,
            isCreate = form.id == null,
            onForm = viewModel::updateLocationForm,
            onSave = viewModel::saveLocation,
            onDismiss = { sheetOpen = false; viewModel.clearLocationForm() },
        )
    }
}

@Composable
private fun CatalogLocationRow(item: ModuleItem, onEdit: () -> Unit) {
    val isDefault = item.status.equals("default", ignoreCase = true)
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = DinayaRadiusCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.fillMaxWidth().clickable { onEdit() },
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(imageVector = Icons.Filled.Place, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = item.title.ifBlank { "Location" },
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                    if (isDefault) CatalogStatusPill("default")
                    item.status?.takeIf { !it.equals("default", ignoreCase = true) }?.let { CatalogStatusPill(it) }
                }
                item.subtitle?.let {
                    Text(text = it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
                item.meta?.let {
                    Text(text = it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
            IconButton(onClick = onEdit, modifier = Modifier.size(44.dp)) {
                Icon(imageVector = Icons.Filled.Edit, contentDescription = "Edit", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CatalogLocationSheet(
    form: LocationFormState,
    busy: Boolean,
    isCreate: Boolean,
    onForm: (LocationFormState) -> Unit,
    onSave: () -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = DinayaRadiusSheet,
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = MaterialTheme.colorScheme.onSurface,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                if (isCreate) "New location" else "Edit location",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface,
            )
            CatalogErrorBanner(form.formError)
            CatalogField(
                label = "Name",
                value = form.name,
                onValueChange = { onForm(form.copy(name = it)) },
                supportingError = if (form.name.isBlank() && form.formError != null) "Name is required." else null,
            )
            CatalogField(label = "Address", value = form.address, onValueChange = { onForm(form.copy(address = it)) }, singleLine = false)
            CatalogField(
                label = "Timezone",
                value = form.timezone,
                onValueChange = { onForm(form.copy(timezone = it)) },
                supportingError = form.formError?.takeIf { it.contains("Timezone") },
            )
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("Default location", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                    Text("New bookings use this branch first.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Switch(checked = form.isDefault, onCheckedChange = { onForm(form.copy(isDefault = it)) })
            }
            Button(
                onClick = onSave,
                enabled = !busy,
                shape = DinayaRadiusButton,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = MaterialTheme.colorScheme.onPrimary),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp),
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) {
                if (busy) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                } else {
                    Text(if (isCreate) "Add location" else "Save location", fontWeight = FontWeight.SemiBold)
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

// ═══ Availability ═══════════════════════════════════════════════════════════

private val DayLabels = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
// Backend dayOfWeek: 0=Sunday..6=Saturday; display Mon-first.
private fun displayDayLabel(dayOfWeek: Int): String = when (dayOfWeek) {
    0 -> "Sun"; 1 -> "Mon"; 2 -> "Tue"; 3 -> "Wed"; 4 -> "Thu"; 5 -> "Fri"; 6 -> "Sat"
    else -> "Day $dayOfWeek"
}

@Composable
internal fun AvailabilityScreen(
    state: DinayaUiState,
    moduleState: ModuleContentState?,
    onRefresh: () -> Unit,
    onOpenWeb: () -> Unit,
    viewModel: DinayaViewModel,
) {
    val members: List<AvailabilityMember> = state.availabilityMembers
    val fallbackItems = moduleState?.payload?.items.orEmpty()
    var selectedStaffId by remember { mutableStateOf<String?>(null) }
    var editingWindows by remember { mutableStateOf(false) }
    var overrideFormOpen by remember { mutableStateOf(false) }

    val effectiveMembers: List<AvailabilityMember> = remember(members, fallbackItems) {
        if (members.isNotEmpty()) return@remember members
        fallbackItems.map { item ->
            AvailabilityMember(staffId = item.id, staffName = item.title, isActive = item.status?.lowercase() != "inactive")
        }
    }
    LaunchedEffect(effectiveMembers) {
        if (selectedStaffId == null) selectedStaffId = effectiveMembers.firstOrNull()?.staffId
        if (selectedStaffId != null && effectiveMembers.none { it.staffId == selectedStaffId }) {
            selectedStaffId = effectiveMembers.firstOrNull()?.staffId
        }
    }
    val selected: AvailabilityMember? = effectiveMembers.firstOrNull { it.staffId == selectedStaffId }
        ?: effectiveMembers.firstOrNull()
    val editedWindows: List<AvailabilityWindow>? = selected?.let { state.availabilityEdits[it.staffId] }
    val visibleWindows: List<AvailabilityWindow> = editedWindows
        ?: selected?.windows.orEmpty()

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        CatalogHeader(
            title = "Availability",
            subtitle = "Weekly working windows by staff member",
            isLoading = moduleState?.isLoading == true || state.catalogBusy,
            onRefresh = {
                onRefresh()
                viewModel.loadAvailabilityMembers()
            },
            onOpenWeb = onOpenWeb,
        )
        CatalogErrorBanner(state.catalogError, onDismiss = viewModel::clearCatalogError)
        CatalogNoticeBanner(state.catalogNotice)
        if (moduleState?.payload?.metrics?.isNotEmpty() == true) {
            CatalogMetricsGrid(moduleState.payload.metrics)
        }

        if (effectiveMembers.isEmpty()) {
            if (moduleState?.isLoading == true) CatalogLoading()
            else CatalogEmptyState("No availability yet", "Add a team member first, then set weekly hours here.")
            return@Column
        }

        // Staff selector
        CatalogChips(
            effectiveMembers.map { it.staffId to it.staffName },
            selected?.staffId.orEmpty(),
        ) { selectedStaffId = it; editingWindows = false }

        selected?.let { member ->
            // Weekly windows card
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = DinayaRadiusCard,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(imageVector = Icons.Filled.Schedule, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                            Text("Weekly windows", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                        }
                        OutlinedButton(
                            onClick = {
                                if (!editingWindows) {
                                    viewModel.setAvailabilityEdits(member.staffId, member.windows)
                                }
                                editingWindows = !editingWindows
                            },
                            shape = DinayaRadiusButton,
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                            modifier = Modifier.height(48.dp),
                        ) {
                            Text(if (editingWindows) "Done" else "Edit", style = MaterialTheme.typography.labelMedium)
                        }
                    }

                    if (visibleWindows.isEmpty()) {
                        Text(
                            "${member.staffName} has no weekly windows yet — tap Edit to add hours.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    } else {
                        (0..6).forEach { day ->
                            val dayWindows = visibleWindows.filter { it.dayOfWeek == day }.sortedBy { it.startTime }
                            if (dayWindows.isNotEmpty() || editingWindows) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        displayDayLabel(day),
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Medium,
                                        color = MaterialTheme.colorScheme.onSurface,
                                        modifier = Modifier.width(44.dp),
                                    )
                                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        if (dayWindows.isEmpty()) {
                                            Text("Closed", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        } else {
                                            dayWindows.forEach { window ->
                                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                    Text(
                                                        "${window.startTime} – ${window.endTime}",
                                                        style = MaterialTheme.typography.bodyMedium,
                                                        color = MaterialTheme.colorScheme.onSurface,
                                                        modifier = Modifier.weight(1f),
                                                    )
                                                    if (editingWindows) {
                                                        IconButton(
                                                            onClick = {
                                                                val next = (state.availabilityEdits[member.staffId] ?: member.windows)
                                                                    .filterNot { it.id == window.id }
                                                                viewModel.setAvailabilityEdits(member.staffId, next)
                                                            },
                                                            modifier = Modifier.size(44.dp),
                                                        ) {
                                                            Icon(imageVector = Icons.Filled.Delete, contentDescription = "Remove", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(16.dp))
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                if (day != 6) HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.4f))
                            }
                        }
                    }

                    if (editingWindows) {
                        AvailabilityWindowAdder(
                            onAdd = { day, start, end ->
                                val next = (state.availabilityEdits[member.staffId] ?: member.windows) +
                                    AvailabilityWindow(dayOfWeek = day, startTime = start, endTime = end)
                                viewModel.setAvailabilityEdits(member.staffId, next)
                            },
                        )
                        Button(
                            onClick = { viewModel.saveAvailabilityWindows(member.staffId); editingWindows = false },
                            enabled = !state.catalogBusy,
                            shape = DinayaRadiusButton,
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = MaterialTheme.colorScheme.onPrimary),
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp),
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                        ) {
                            Text("Save hours", fontWeight = FontWeight.SemiBold)
                        }
                    }

                    if (member.locations.isNotEmpty()) {
                        Text(
                            "Locations: ${member.locations.joinToString(", ")}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            // Overrides card
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = DinayaRadiusCard,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("Overrides (${member.overrides.size})", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                        OutlinedButton(
                            onClick = { overrideFormOpen = !overrideFormOpen },
                            shape = DinayaRadiusButton,
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                            modifier = Modifier.height(48.dp),
                        ) {
                            Icon(imageVector = Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Add", style = MaterialTheme.typography.labelMedium)
                        }
                    }
                    if (overrideFormOpen) {
                        AvailabilityOverrideForm(
                            busy = state.catalogBusy,
                            onSave = { date, start, end, blocked, reason ->
                                viewModel.saveAvailabilityOverride(member.staffId, date, start, end, blocked, reason)
                                overrideFormOpen = false
                            },
                        )
                    }
                    if (member.overrides.isEmpty()) {
                        Text("No upcoming overrides — block leave days or add special hours.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else {
                        member.overrides.forEach { override ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        override.date,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Medium,
                                        color = MaterialTheme.colorScheme.onSurface,
                                    )
                                    Text(
                                        if (override.isBlocked) {
                                            "Blocked" + (override.reason?.let { " · $it" }.orEmpty())
                                        } else {
                                            listOfNotNull(override.startTime, override.endTime).joinToString(" – ").ifBlank { "Open" } +
                                                (override.reason?.let { " · $it" }.orEmpty())
                                        },
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                if (override.id.isNotBlank()) {
                                    IconButton(
                                        onClick = { viewModel.deleteAvailabilityOverride(override.id, member.staffId) },
                                        modifier = Modifier.size(44.dp),
                                    ) {
                                        Icon(imageVector = Icons.Filled.Delete, contentDescription = "Remove override", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
                                    }
                                }
                            }
                            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.4f))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AvailabilityWindowAdder(onAdd: (day: Int, start: String, end: String) -> Unit) {
    var day by remember { mutableStateOf(1) }
    var start by remember { mutableStateOf("09:00") }
    var end by remember { mutableStateOf("17:00") }
    var error by remember { mutableStateOf<String?>(null) }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("ADD HOURS", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf(1 to "M", 2 to "T", 3 to "W", 4 to "T", 5 to "F", 6 to "S", 0 to "S").forEach { (value, label) ->
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(if (day == value) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
                        .border(BorderStroke(1.dp, if (day == value) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline), CircleShape)
                        .clickable { day = value },
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        label,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.SemiBold,
                        color = if (day == value) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                    )
                }
            }
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(modifier = Modifier.weight(1f)) {
                CatalogField(label = "Start", value = start, onValueChange = { start = it; error = null }, placeholder = "09:00")
            }
            Box(modifier = Modifier.weight(1f)) {
                CatalogField(label = "End", value = end, onValueChange = { end = it; error = null }, placeholder = "17:00")
            }
            OutlinedButton(
                onClick = {
                    if (start.isBlank() || end.isBlank() || start >= end) {
                        error = "Start must be before end (HH:MM)."
                    } else {
                        onAdd(day, start.trim(), end.trim())
                        error = null
                    }
                },
                shape = DinayaRadiusButton,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.primary),
                modifier = Modifier.height(56.dp),
            ) {
                Text("Add")
            }
        }
        error?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error) }
        Text(DayLabels.joinToString("  "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun AvailabilityOverrideForm(
    busy: Boolean,
    onSave: (date: String, start: String?, end: String?, blocked: Boolean, reason: String?) -> Unit,
) {
    var date by remember { mutableStateOf("") }
    var start by remember { mutableStateOf("") }
    var end by remember { mutableStateOf("") }
    var blocked by remember { mutableStateOf(true) }
    var reason by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        CatalogField(label = "Date (YYYY-MM-DD)", value = date, onValueChange = { date = it; error = null }, placeholder = "2026-09-15")
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(modifier = Modifier.weight(1f)) {
                CatalogField(label = "Start (optional)", value = start, onValueChange = { start = it }, placeholder = "10:00")
            }
            Box(modifier = Modifier.weight(1f)) {
                CatalogField(label = "End (optional)", value = end, onValueChange = { end = it }, placeholder = "14:00")
            }
        }
        CatalogField(label = "Reason (optional)", value = reason, onValueChange = { reason = it }, placeholder = "Public holiday")
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Blocked day off", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
            Switch(checked = blocked, onCheckedChange = { blocked = it })
        }
        error?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error) }
        Button(
            onClick = {
                if (date.isBlank()) {
                    error = "Date is required."
                } else {
                    onSave(date.trim(), start.trim().ifBlank { null }, end.trim().ifBlank { null }, blocked, reason.trim().ifBlank { null })
                }
            },
            enabled = !busy,
            shape = DinayaRadiusButton,
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = MaterialTheme.colorScheme.onPrimary),
            elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp),
            modifier = Modifier.fillMaxWidth().height(48.dp),
        ) {
            Text("Save override", fontWeight = FontWeight.SemiBold)
        }
    }
}

// ═══ Helpers ════════════════════════════════════════════════════════════════

private fun catalogPriceDuration(subtitle: String?): String? {
    if (subtitle.isNullOrBlank()) return null
    val price = Regex("""(Rs\.?\s?[\d,]+)""", RegexOption.IGNORE_CASE).find(subtitle)?.value
    val duration = Regex("""(\d+\s?min)""", RegexOption.IGNORE_CASE).find(subtitle)?.value
    return listOfNotNull(price, duration).joinToString(" · ").takeIf { it.isNotBlank() }
}

private fun catalogDial(context: Context, phone: String) {
    if (phone.isBlank()) return
    val cleaned = phone.replace(Regex("[^0-9+]"), "")
    context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$cleaned")))
}

private fun catalogWhatsApp(context: Context, phone: String, message: String? = null) {
    val digits = phone.replace(Regex("[^0-9]"), "")
    val cleaned = when {
        digits.startsWith("0") && digits.length == 10 -> "94" + digits.substring(1)
        !digits.startsWith("94") && digits.length == 9 -> "94$digits"
        else -> digits
    }
    val uri = if (cleaned.isNotBlank() && !message.isNullOrBlank()) {
        Uri.parse("https://wa.me/$cleaned?text=${Uri.encode(message)}")
    } else if (cleaned.isNotBlank()) {
        Uri.parse("https://wa.me/$cleaned")
    } else if (!message.isNullOrBlank()) {
        Uri.parse("https://api.whatsapp.com/send?text=${Uri.encode(message)}")
    } else return
    context.startActivity(Intent(Intent.ACTION_VIEW, uri))
}

private fun catalogEmail(context: Context, email: String) {
    if (email.isBlank()) return
    context.startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:$email")))
}
