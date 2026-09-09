package lk.dinaya.mobile.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.OpenInBrowser
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import java.time.LocalDate
import lk.dinaya.mobile.data.ModuleItem
import lk.dinaya.mobile.data.StoredSession
import lk.dinaya.mobile.data.combineDateTimeToIso

// ——— Shared growth header (native-only: refresh, no forced web fallback) ———

@Composable
internal fun GrowthHeader(
    title: String,
    summary: String,
    isLoading: Boolean,
    onRefresh: () -> Unit,
) {
    val haptic = LocalHapticFeedback.current
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = summary,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Spacer(modifier = Modifier.width(8.dp))
        OutlinedButton(
            onClick = {
                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                onRefresh()
            },
            enabled = !isLoading,
            shape = DinayaRadiusButton,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            modifier = Modifier
                .height(48.dp)
                .semantics { contentDescription = "Refresh $title" },
        ) {
            Text("Refresh", style = MaterialTheme.typography.labelMedium)
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun GrowthFilterChips(
    options: List<Pair<String, String>>,
    selected: String,
    onSelect: (String) -> Unit,
    contentLabel: String,
) {
    val haptic = LocalHapticFeedback.current
    FlowRow(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        options.forEach { (key, label) ->
            val active = selected == key
            Box(
                modifier = Modifier
                    .heightIn(min = 40.dp)
                    .clip(DinayaRadiusPill)
                    .background(
                        if (active) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                        else MaterialTheme.colorScheme.surface,
                    )
                    .clickable {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        onSelect(key)
                    }
                    .padding(horizontal = 12.dp, vertical = 10.dp)
                    .semantics { contentDescription = "$contentLabel filter $label" },
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
    }
}

// ——— Reviews: list + reply sheet + rating filter —————————————————————————

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun ReviewsScreen(
    state: DinayaUiState,
    viewModel: DinayaViewModel,
    searchQuery: String,
    dark: Boolean,
) {
    val moduleState = state.moduleContent["reviews"]
    val payload = moduleState?.payload
    val haptic = LocalHapticFeedback.current
    var ratingFilter by remember { mutableStateOf("all") }
    var replyTarget by remember { mutableStateOf<ModuleItem?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        GrowthHeader(
            title = payload?.title?.ifBlank { null } ?: "Reviews",
            summary = payload?.summary?.ifBlank { null } ?: "Published reviews, ratings, and replies.",
            isLoading = moduleState?.isLoading == true,
            onRefresh = viewModel::refreshSelectedSection,
        )
        if (moduleState?.errorMessage != null) ErrorText(moduleState.errorMessage)
        if (payload?.metrics?.isNotEmpty() == true) ModuleMetricsGrid(payload.metrics)

        GrowthFilterChips(
            options = listOf(
                "all" to "All",
                "5" to "5★",
                "4" to "4★",
                "3" to "3★",
                "2" to "2★",
                "1" to "1★",
            ),
            selected = ratingFilter,
            onSelect = { ratingFilter = it },
            contentLabel = "Reviews rating",
        )

        val items = payload?.items.orEmpty().filter { item ->
            val rating = parseReviewRating(item.status)
            val matchesRating = ratingFilter == "all" || rating.toString() == ratingFilter
            val matchesQuery = searchQuery.isBlank() ||
                item.title.contains(searchQuery, ignoreCase = true) ||
                (item.subtitle?.contains(searchQuery, ignoreCase = true) == true)
            matchesRating && matchesQuery
        }

        if (moduleState?.isLoading == true && payload == null) {
            LoadingPanel()
        } else if (items.isEmpty()) {
            SiteEmptyState(
                title = payload?.emptyState?.ifBlank { null } ?: "No reviews yet",
                body = if (searchQuery.isNotBlank()) "No reviews matched \"$searchQuery\"."
                else "When clients leave reviews, ratings and replies will appear here.",
            )
        } else {
            Text(
                text = "${items.size} review${if (items.size == 1) "" else "s"}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items.forEach { item ->
                    ReviewRowCard(
                        item = item,
                        dark = dark,
                        onReply = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            replyTarget = item
                        },
                    )
                }
            }
        }
    }

    replyTarget?.let { target ->
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        var replyText by remember(target.id) { mutableStateOf("") }
        ModalBottomSheet(
            onDismissRequest = { replyTarget = null },
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
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Box(
                        modifier = Modifier
                            .size(width = 40.dp, height = 4.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f))
                            .semantics { contentDescription = "Drag handle" },
                    )
                }
                Text(
                    text = "Reply to ${target.title}",
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                target.subtitle?.takeIf { it.isNotBlank() }?.let {
                    Text(
                        text = "\"$it\"",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                OutlinedTextField(
                    value = replyText,
                    onValueChange = { replyText = it },
                    label = { Text("Your reply") },
                    placeholder = {
                        Text(
                            "Thank you for visiting us…",
                            style = DinayaFieldTextStyle,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                        )
                    },
                    minLines = 3,
                    maxLines = 6,
                    shape = DinayaRadiusCard,
                    textStyle = DinayaFieldTextStyle.copy(color = MaterialTheme.colorScheme.onSurface),
                    modifier = Modifier
                        .fillMaxWidth()
                        .semantics { contentDescription = "Review reply input" },
                )
                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        viewModel.replyToReview(target.id, replyText)
                        replyTarget = null
                    },
                    enabled = replyText.isNotBlank(),
                    shape = DinayaRadiusButton,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .semantics { contentDescription = "Publish review reply" },
                ) {
                    Icon(imageVector = Icons.Filled.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Publish reply", fontWeight = FontWeight.SemiBold)
                }
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

private fun parseReviewRating(status: String?): Int? {
    if (status.isNullOrBlank()) return null
    return runCatching {
        status.trim().split("/").first().trim().toInt().takeIf { it in 1..5 }
    }.getOrNull()
}

@Composable
private fun ReviewRowCard(item: ModuleItem, dark: Boolean, onReply: () -> Unit) {
    val haptic = LocalHapticFeedback.current
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = DinayaRadiusCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier
            .fillMaxWidth()
            .semantics { contentDescription = "Review by ${item.title}" },
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f),
                ) {
                    ClientInitials(name = item.title)
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = item.title.ifBlank { "Client" },
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        item.meta?.takeIf { it.isNotBlank() }?.let {
                            Text(
                                text = it.take(10),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
                item.status?.takeIf { it.isNotBlank() }?.let { StatusPill(it, dark) }
            }
            item.subtitle?.takeIf { it.isNotBlank() }?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            OutlinedButton(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onReply()
                },
                shape = DinayaRadiusButton,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.primary),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .semantics { contentDescription = "Reply to review by ${item.title}" },
            ) {
                Text("Reply", style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

// ——— Payments: list + status chips + detail + PayHere checkout deep link ———

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun PaymentsScreen(
    state: DinayaUiState,
    searchQuery: String,
    dark: Boolean,
    session: StoredSession?,
    onRefresh: () -> Unit,
    onOpenWeb: (String) -> Unit,
) {
    val context = LocalContext.current
    val moduleState = state.moduleContent["payments"]
    val payload = moduleState?.payload
    val haptic = LocalHapticFeedback.current
    var statusFilter by remember { mutableStateOf("all") }
    var selected by remember { mutableStateOf<ModuleItem?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        GrowthHeader(
            title = payload?.title?.ifBlank { null } ?: "Payments",
            summary = payload?.summary?.ifBlank { null } ?: "PayHere payment status and revenue records.",
            isLoading = moduleState?.isLoading == true,
            onRefresh = onRefresh,
        )
        if (moduleState?.errorMessage != null) ErrorText(moduleState.errorMessage)
        if (payload?.metrics?.isNotEmpty() == true) ModuleMetricsGrid(payload.metrics)

        GrowthFilterChips(
            options = listOf(
                "all" to "All",
                "pending" to "Pending",
                "success" to "Success",
                "failed" to "Failed",
            ),
            selected = statusFilter,
            onSelect = { statusFilter = it },
            contentLabel = "Payments status",
        )

        val items = payload?.items.orEmpty().filter { item ->
            val matchesStatus = statusFilter == "all" ||
                item.status.equals(statusFilter, ignoreCase = true) ||
                (statusFilter == "success" && item.status.equals("paid", ignoreCase = true))
            val matchesQuery = searchQuery.isBlank() ||
                item.title.contains(searchQuery, ignoreCase = true) ||
                (item.subtitle?.contains(searchQuery, ignoreCase = true) == true)
            matchesStatus && matchesQuery
        }

        if (moduleState?.isLoading == true && payload == null) {
            LoadingPanel()
        } else if (items.isEmpty()) {
            SiteEmptyState(
                title = payload?.emptyState?.ifBlank { null } ?: "No payments yet",
                body = if (searchQuery.isNotBlank()) "No payments matched \"$searchQuery\"."
                else "Successful PayHere payments will appear here with revenue totals.",
            )
        } else {
            Text(
                text = "${items.size} payment${if (items.size == 1) "" else "s"}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items.forEach { item ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        shape = DinayaRadiusCard,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
                        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                selected = item
                            }
                            .semantics { contentDescription = "Payment ${item.title} ${item.status.orEmpty()}" },
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(
                                    text = item.title.ifBlank { "Payment" },
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.onSurface,
                                )
                                item.subtitle?.takeIf { it.isNotBlank() }?.let {
                                    Text(
                                        text = it,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                                item.meta?.takeIf { it.isNotBlank() }?.let {
                                    Text(
                                        text = it.take(16).replace("T", " "),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                            item.status?.takeIf { it.isNotBlank() }?.let { StatusPill(it, dark) }
                        }
                    }
                }
            }
        }
        @Suppress("UNUSED_VARIABLE")
        val unusedContext = context
    }

    selected?.let { payment ->
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        val isPending = payment.status.equals("pending", ignoreCase = true) ||
            payment.status.equals("unpaid", ignoreCase = true)
        ModalBottomSheet(
            onDismissRequest = { selected = null },
            sheetState = sheetState,
            shape = DinayaRadiusSheet,
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = MaterialTheme.colorScheme.onSurface,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
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
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Payment details", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
                    payment.status?.let { StatusPill(it, dark) }
                }
                DetailRow(label = "Amount", value = payment.title.ifBlank { "—" })
                payment.subtitle?.takeIf { it.isNotBlank() }?.let { DetailRow(label = "Reference", value = it) }
                payment.meta?.takeIf { it.isNotBlank() }?.let {
                    DetailRow(label = "Date", value = it.take(16).replace("T", " "))
                }
                // Web fallback ONLY for actual PayHere checkout (pending payments).
                if (isPending) {
                    Button(
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onOpenWeb("/dashboard/payments/${payment.id}")
                        },
                        shape = DinayaRadiusButton,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary,
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .semantics { contentDescription = "Complete payment via PayHere" },
                    ) {
                        Icon(imageVector = Icons.Filled.OpenInBrowser, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Pay via PayHere", fontWeight = FontWeight.SemiBold)
                    }
                }
                @Suppress("UNUSED_VARIABLE")
                val unusedSession = session
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

// ——— Marketing: share card, directory status, copy-link ———————————————————

@Composable
internal fun MarketingScreen(
    state: DinayaUiState,
    viewModel: DinayaViewModel,
    businessName: String,
    businessSlug: String,
) {
    val context = LocalContext.current
    val haptic = LocalHapticFeedback.current
    val moduleState = state.moduleContent["marketing"]
    val payload = moduleState?.payload

    val bookingUrl = if (businessSlug.isNotBlank()) "https://dinaya.lk/book/$businessSlug" else "https://dinaya.lk"
    val displayUrl = if (businessSlug.isNotBlank()) "dinaya.lk/book/$businessSlug" else "dinaya.lk"
    val directoryMetric = payload?.metrics?.firstOrNull { it.label.equals("Directory", ignoreCase = true) }
    val isListed = directoryMetric?.value.equals("Listed", ignoreCase = true)
    var directoryChecked by remember(directoryMetric?.value) { mutableStateOf(isListed) }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        GrowthHeader(
            title = payload?.title?.ifBlank { null } ?: "Marketing",
            summary = payload?.summary?.ifBlank { null } ?: "Share tools, directory listing, and content calendar.",
            isLoading = moduleState?.isLoading == true,
            onRefresh = viewModel::refreshSelectedSection,
        )
        if (moduleState?.errorMessage != null) ErrorText(moduleState.errorMessage)
        if (payload?.metrics?.isNotEmpty() == true) ModuleMetricsGrid(payload.metrics)

        // Native share card
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = DinayaRadiusCard,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
            modifier = Modifier
                .fillMaxWidth()
                .semantics { contentDescription = "Booking page share card" },
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(imageVector = Icons.Filled.Share, contentDescription = "Share booking page", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                    Text("Your public booking page", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                }
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(DinayaRadiusButton)
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                ) {
                    Text(displayUrl, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.primary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            copyToClipboard(context, bookingUrl, "Dinaya Booking Link")
                        },
                        shape = DinayaRadiusButton,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
                            .semantics { contentDescription = "Copy booking page link" },
                    ) {
                        Icon(imageVector = Icons.Filled.ContentCopy, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(3.dp))
                        Text("Copy", style = MaterialTheme.typography.labelSmall, maxLines = 1)
                    }
                    OutlinedButton(
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            openWhatsApp(context, "", "Book $businessName online — pick a time here: $bookingUrl")
                        },
                        shape = DinayaRadiusButton,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
                            .semantics { contentDescription = "Share booking page on WhatsApp" },
                    ) {
                        Icon(imageVector = Icons.AutoMirrored.Filled.Chat, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(3.dp))
                        Text("WhatsApp", style = MaterialTheme.typography.labelSmall, maxLines = 1)
                    }
                    OutlinedButton(
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(bookingUrl)))
                        },
                        shape = DinayaRadiusButton,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
                            .semantics { contentDescription = "Preview public booking page" },
                    ) {
                        Icon(imageVector = Icons.Filled.OpenInBrowser, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(3.dp))
                        Text("Preview", style = MaterialTheme.typography.labelSmall, maxLines = 1)
                    }
                }
            }
        }

        // Directory status (native toggle)
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = DinayaRadiusCard,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
            modifier = Modifier
                .fillMaxWidth()
                .semantics { contentDescription = "Directory listing status" },
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text("Directory listing", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                    Text(
                        if (directoryChecked) "Your business is discoverable on Dinaya." else "Hidden from public discovery.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Switch(
                    checked = directoryChecked,
                    onCheckedChange = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        directoryChecked = it
                        viewModel.setDirectoryListed(it)
                    },
                    modifier = Modifier.semantics { contentDescription = "Toggle directory listing" },
                )
            }
        }

        val tools = payload?.items.orEmpty().filter { it.status.equals("tool", ignoreCase = true) }
        val calendarItems = payload?.items.orEmpty().filter { !it.status.equals("tool", ignoreCase = true) }
        if (moduleState?.isLoading == true && payload == null) {
            LoadingPanel()
        } else {
            if (tools.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    tools.forEach { tool ->
                        MarketingToolRow(
                            tool = tool,
                            bookingUrl = bookingUrl,
                            businessName = businessName,
                        )
                    }
                }
            }
            if (calendarItems.isNotEmpty()) {
                Text("Content calendar", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    calendarItems.forEach { item ->
                        ModuleItemCard(item = item, dark = false)
                    }
                }
            }
            if (tools.isEmpty() && calendarItems.isEmpty() && payload != null) {
                SiteEmptyState(
                    title = payload.emptyState.ifBlank { "No marketing assets yet" },
                    body = "Share your booking link to get your first online bookings.",
                )
            }
        }
    }
}

@Composable
private fun MarketingToolRow(tool: ModuleItem, bookingUrl: String, businessName: String) {
    val context = LocalContext.current
    val haptic = LocalHapticFeedback.current
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = DinayaRadiusCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier
            .fillMaxWidth()
            .semantics { contentDescription = "Marketing tool ${tool.title}" },
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(tool.title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                tool.subtitle?.takeIf { it.isNotBlank() }?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            OutlinedButton(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    when (tool.id) {
                        "tool-whatsapp-share" -> openWhatsApp(context, "", "Book $businessName online: $bookingUrl")
                        "tool-website-embed" -> copyToClipboard(
                            context,
                            "<iframe src=\"$bookingUrl\" width=\"100%\" height=\"640\" frameborder=\"0\"></iframe>",
                            "Dinaya Embed",
                        )
                        else -> copyToClipboard(context, bookingUrl, "Dinaya Booking Link")
                    }
                },
                shape = DinayaRadiusButton,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                modifier = Modifier.height(48.dp),
            ) {
                Text(
                    when (tool.id) {
                        "tool-whatsapp-share" -> "Share"
                        "tool-website-embed" -> "Copy code"
                        else -> "Copy link"
                    },
                    style = MaterialTheme.typography.labelMedium,
                )
            }
        }
    }
}

// ——— Deals: list + active toggle + native create sheet ————————————————————

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun DealsScreen(
    state: DinayaUiState,
    viewModel: DinayaViewModel,
    searchQuery: String,
    dark: Boolean,
) {
    val moduleState = state.moduleContent["deals"]
    val payload = moduleState?.payload
    val haptic = LocalHapticFeedback.current
    var statusFilter by remember { mutableStateOf("all") }
    var createOpen by remember { mutableStateOf(false) }
    var detailTarget by remember { mutableStateOf<ModuleItem?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        GrowthHeader(
            title = payload?.title?.ifBlank { null } ?: "Deals",
            summary = payload?.summary?.ifBlank { null } ?: "Deal status, redemptions, and performance.",
            isLoading = moduleState?.isLoading == true,
            onRefresh = viewModel::refreshSelectedSection,
        )
        if (moduleState?.errorMessage != null) ErrorText(moduleState.errorMessage)
        CatalogErrorBanner(state.catalogError, onDismiss = viewModel::clearCatalogError)
        if (payload?.metrics?.isNotEmpty() == true) ModuleMetricsGrid(payload.metrics)

        GrowthFilterChips(
            options = listOf("all" to "All", "active" to "Active", "paused" to "Paused"),
            selected = statusFilter,
            onSelect = { statusFilter = it },
            contentLabel = "Deals status",
        )

        Button(
            onClick = {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                createOpen = true
            },
            shape = DinayaRadiusButton,
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
            ),
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .semantics { contentDescription = "Create new deal" },
        ) {
            Text("New deal", fontWeight = FontWeight.SemiBold)
        }

        val items = payload?.items.orEmpty().filter { item ->
            val matchesStatus = statusFilter == "all" || item.status.equals(statusFilter, ignoreCase = true)
            val matchesQuery = searchQuery.isBlank() ||
                item.title.contains(searchQuery, ignoreCase = true) ||
                (item.subtitle?.contains(searchQuery, ignoreCase = true) == true)
            matchesStatus && matchesQuery
        }

        if (moduleState?.isLoading == true && payload == null) {
            LoadingPanel()
        } else if (items.isEmpty()) {
            SiteEmptyState(
                title = payload?.emptyState?.ifBlank { null } ?: "No deals yet",
                body = if (searchQuery.isNotBlank()) "No deals matched \"$searchQuery\"."
                else "Create a deal with a service, discount, and dates.",
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items.forEach { item ->
                    DealRowCard(
                        item = item,
                        dark = dark,
                        onToggle = { enabled ->
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            viewModel.toggleDeal(item.id, enabled)
                        },
                        onOpen = {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            detailTarget = item
                        },
                    )
                }
            }
        }
    }

    if (createOpen) {
        DealCreateSheet(
            state = state,
            viewModel = viewModel,
            onDismiss = { createOpen = false },
        )
    }
    detailTarget?.let { target ->
        DealDetailSheet(
            item = target,
            dark = dark,
            onToggle = { enabled -> viewModel.toggleDeal(target.id, enabled) },
            onDismiss = { detailTarget = null },
        )
    }
}

@Composable
private fun DealRowCard(item: ModuleItem, dark: Boolean, onToggle: (Boolean) -> Unit, onOpen: () -> Unit) {
    val isActive = item.status.equals("active", ignoreCase = true)
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = DinayaRadiusCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onOpen() }
            .semantics { contentDescription = "Deal ${item.title} ${item.status.orEmpty()}" },
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(item.title.ifBlank { "Deal" }, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                item.subtitle?.takeIf { it.isNotBlank() }?.let {
                    Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    item.status?.takeIf { it.isNotBlank() }?.let { StatusPill(it, dark) }
                    item.meta?.takeIf { it.isNotBlank() }?.let {
                        Text("Ends ${it.take(10)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            Switch(
                checked = isActive,
                onCheckedChange = onToggle,
                modifier = Modifier.semantics { contentDescription = "Toggle deal ${item.title} active" },
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DealDetailSheet(
    item: ModuleItem,
    dark: Boolean,
    onToggle: (Boolean) -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val isActive = item.status.equals("active", ignoreCase = true)
    var checked by remember(item.id, item.status) { mutableStateOf(isActive) }
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
                .padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            GrowthSheetHandle()
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    item.title.ifBlank { "Deal" },
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f),
                )
                StatusPill(if (checked) "active" else "paused", dark)
            }
            item.subtitle?.takeIf { it.isNotBlank() }?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            item.meta?.takeIf { it.isNotBlank() }?.let {
                DetailRow(label = "Ends", value = it.take(10))
            }
            GrowthSwitchRow(
                title = "Active",
                subtitle = if (checked) "Clients can claim this deal." else "Paused — hidden from booking.",
                checked = checked,
                onCheckedChange = {
                    checked = it
                    onToggle(it)
                },
                contentDescription = "Toggle deal ${item.title} active",
            )
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun DealCreateSheet(
    state: DinayaUiState,
    viewModel: DinayaViewModel,
    onDismiss: () -> Unit,
) {
    val haptic = LocalHapticFeedback.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val today = remember { runCatching { LocalDate.now() }.getOrNull() }

    LaunchedEffect(Unit) {
        viewModel.ensureServicesModule()
        viewModel.ensureLocationsModule()
    }

    val serviceState = state.moduleContent["services"]
    val locationState = state.moduleContent["locations"]
    val serviceItems = serviceState?.payload?.items.orEmpty().filter { it.id.isNotBlank() }
    val locationItems = locationState?.payload?.items.orEmpty().filter { it.id.isNotBlank() }
    val staffOptions = state.bootstrap?.staff.orEmpty().filter { it.id.isNotBlank() }

    var serviceId by remember { mutableStateOf("") }
    var locationId by remember { mutableStateOf("") }
    var staffId by remember { mutableStateOf<String?>(null) }
    var discountPercent by remember { mutableIntStateOf(20) }
    var slotsText by remember { mutableStateOf("5") }
    var dealStart by remember { mutableStateOf(today?.toString().orEmpty()) }
    var dealEnd by remember { mutableStateOf(today?.plusDays(7)?.toString().orEmpty()) }
    var apptStart by remember { mutableStateOf(today?.toString().orEmpty()) }
    var apptEnd by remember { mutableStateOf(today?.plusDays(14)?.toString().orEmpty()) }
    var notifyClients by remember { mutableStateOf(false) }

    val slotsTotal = slotsText.trim().toIntOrNull() ?: -1
    val canSave = isDealCreateFormValid(
        serviceId = serviceId,
        locationId = locationId,
        discountPercent = discountPercent,
        slotsTotal = slotsTotal,
        dealWindowStart = dealStart,
        dealWindowEnd = dealEnd,
        apptWindowStart = apptStart,
        apptWindowEnd = apptEnd,
    )

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
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            GrowthSheetHandle()
            Text("New deal", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
            Text(
                "Pick a service, discount, and the dates this offer runs.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            CatalogErrorBanner(state.catalogError, onDismiss = viewModel::clearCatalogError)

            ModuleItemPicker(
                label = "SERVICE *",
                items = serviceItems,
                selectedId = serviceId,
                onSelect = { serviceId = it },
                emptyTitle = if (serviceState?.isLoading == true) "Loading services…" else "No services yet",
                emptyBody = if (serviceState?.isLoading == true) "Fetching your catalog for the picker."
                else "Add a service first, then come back to create a deal.",
                contentDescriptionPrefix = "Select service",
            )
            ModuleItemPicker(
                label = "LOCATION *",
                items = locationItems,
                selectedId = locationId,
                onSelect = { locationId = it },
                emptyTitle = if (locationState?.isLoading == true) "Loading locations…" else "No locations yet",
                emptyBody = if (locationState?.isLoading == true) "Fetching locations for the picker."
                else "Add a location first, then come back to create a deal.",
                contentDescriptionPrefix = "Select location",
            )

            if (staffOptions.isNotEmpty()) {
                Text("STAFF (OPTIONAL)", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    GrowthChoiceChip(
                        label = "Any staff",
                        selected = staffId == null,
                        onClick = { staffId = null },
                        contentDescription = "No specific staff",
                    )
                    staffOptions.forEach { staff ->
                        GrowthChoiceChip(
                            label = staff.name.ifBlank { "Staff" },
                            selected = staffId == staff.id,
                            onClick = { staffId = staff.id },
                            contentDescription = "Staff ${staff.name}",
                        )
                    }
                }
            }

            Text("DISCOUNT *", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                listOf(10, 20, 30, 40, 50).forEach { pct ->
                    val active = discountPercent == pct
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
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
                            .clickable {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                discountPercent = pct
                            }
                            .semantics { contentDescription = "Discount $pct percent" },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = "$pct%",
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
                            color = if (active) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            CatalogField(
                label = "Slots (1–20)",
                value = slotsText,
                onValueChange = { incoming ->
                    if (incoming.length <= 2 && incoming.all { it.isDigit() }) slotsText = incoming
                },
                keyboardType = KeyboardType.Number,
                placeholder = "5",
            )

            CatalogField(
                label = "Deal starts (YYYY-MM-DD)",
                value = dealStart,
                onValueChange = { dealStart = it },
                placeholder = "YYYY-MM-DD",
            )
            CatalogField(
                label = "Deal ends (YYYY-MM-DD)",
                value = dealEnd,
                onValueChange = { dealEnd = it },
                placeholder = "YYYY-MM-DD",
            )
            CatalogField(
                label = "Appointments from (YYYY-MM-DD)",
                value = apptStart,
                onValueChange = { apptStart = it },
                placeholder = "YYYY-MM-DD",
            )
            CatalogField(
                label = "Appointments until (YYYY-MM-DD)",
                value = apptEnd,
                onValueChange = { apptEnd = it },
                placeholder = "YYYY-MM-DD",
            )

            GrowthSwitchRow(
                title = "Notify clients",
                subtitle = "Send a message when this deal goes live.",
                checked = notifyClients,
                onCheckedChange = { notifyClients = it },
                contentDescription = "Notify clients about this deal",
            )

            Button(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    viewModel.createDeal(
                        serviceId = serviceId,
                        locationId = locationId,
                        staffId = staffId,
                        discountPercent = discountPercent,
                        slotsTotal = slotsTotal,
                        dealWindowStart = combineDateTimeToIso(dealStart, "00:00"),
                        dealWindowEnd = combineDateTimeToIso(dealEnd, "23:59"),
                        apptWindowStart = combineDateTimeToIso(apptStart, "00:00"),
                        apptWindowEnd = combineDateTimeToIso(apptEnd, "23:59"),
                        notifyClients = notifyClients,
                    )
                    onDismiss()
                },
                enabled = canSave && !state.catalogBusy,
                shape = DinayaRadiusButton,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .semantics { contentDescription = "Save new deal" },
            ) {
                Text("Save", fontWeight = FontWeight.SemiBold)
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

// ——— Broadcasts: list + create/test-send —————————————————————————————————

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun BroadcastsScreen(
    state: DinayaUiState,
    viewModel: DinayaViewModel,
    searchQuery: String,
    dark: Boolean,
) {
    val moduleState = state.moduleContent["broadcasts"]
    val payload = moduleState?.payload
    val haptic = LocalHapticFeedback.current
    var statusFilter by remember { mutableStateOf("all") }
    var createOpen by remember { mutableStateOf(false) }
    var detailTarget by remember { mutableStateOf<ModuleItem?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        GrowthHeader(
            title = payload?.title?.ifBlank { null } ?: "Broadcasts",
            summary = payload?.summary?.ifBlank { null } ?: "Campaign broadcasts and delivery summaries.",
            isLoading = moduleState?.isLoading == true,
            onRefresh = viewModel::refreshSelectedSection,
        )
        if (moduleState?.errorMessage != null) ErrorText(moduleState.errorMessage)
        CatalogErrorBanner(state.catalogError, onDismiss = viewModel::clearCatalogError)
        if (payload?.metrics?.isNotEmpty() == true) ModuleMetricsGrid(payload.metrics)

        GrowthFilterChips(
            options = listOf("all" to "All", "draft" to "Draft", "sending" to "Sending", "sent" to "Sent", "failed" to "Failed"),
            selected = statusFilter,
            onSelect = { statusFilter = it },
            contentLabel = "Broadcasts status",
        )

        Button(
            onClick = {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                createOpen = true
            },
            shape = DinayaRadiusButton,
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
            ),
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .semantics { contentDescription = "Create new broadcast" },
        ) {
            Text("New broadcast", fontWeight = FontWeight.SemiBold)
        }

        val items = payload?.items.orEmpty().filter { item ->
            val matchesStatus = statusFilter == "all" || item.status.equals(statusFilter, ignoreCase = true)
            val matchesQuery = searchQuery.isBlank() ||
                item.title.contains(searchQuery, ignoreCase = true) ||
                (item.subtitle?.contains(searchQuery, ignoreCase = true) == true)
            matchesStatus && matchesQuery
        }

        if (moduleState?.isLoading == true && payload == null) {
            LoadingPanel()
        } else if (items.isEmpty()) {
            SiteEmptyState(
                title = payload?.emptyState?.ifBlank { null } ?: "No broadcasts yet",
                body = if (searchQuery.isNotBlank()) "No broadcasts matched \"$searchQuery\"."
                else "Create a broadcast to re-engage past clients with offers.",
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items.forEach { item ->
                    val testSentTo = state.broadcastTestSent[item.id]
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        shape = DinayaRadiusCard,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
                        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                detailTarget = item
                            }
                            .semantics { contentDescription = "Broadcast ${item.title} ${item.status.orEmpty()}" },
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(item.title.ifBlank { "Broadcast" }, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                                item.status?.takeIf { it.isNotBlank() }?.let {
                                    Spacer(modifier = Modifier.width(8.dp))
                                    StatusPill(it, dark)
                                }
                            }
                            item.subtitle?.takeIf { it.isNotBlank() }?.let {
                                Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            if (testSentTo != null) {
                                Text(
                                    "Test sent to $testSentTo",
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Medium,
                                    color = MaterialTheme.colorScheme.primary,
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (createOpen) {
        BroadcastCreateSheet(
            state = state,
            viewModel = viewModel,
            onDismiss = { createOpen = false },
        )
    }

    detailTarget?.let { target ->
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        var phone by remember(target.id) { mutableStateOf("") }
        ModalBottomSheet(
            onDismissRequest = { detailTarget = null },
            sheetState = sheetState,
            shape = DinayaRadiusSheet,
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = MaterialTheme.colorScheme.onSurface,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
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
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(target.title.ifBlank { "Broadcast" }, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                    target.status?.let { StatusPill(it, dark) }
                }
                target.subtitle?.takeIf { it.isNotBlank() }?.let {
                    Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("Test phone (e.g. 0771234567)") },
                    singleLine = true,
                    shape = DinayaRadiusButton,
                    textStyle = DinayaFieldTextStyle.copy(color = MaterialTheme.colorScheme.onSurface),
                    modifier = Modifier.fillMaxWidth().semantics { contentDescription = "Test send phone input" },
                )
                OutlinedButton(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        viewModel.sendTestBroadcast(target.id, phone)
                        detailTarget = null
                    },
                    enabled = phone.isNotBlank(),
                    shape = DinayaRadiusButton,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .semantics { contentDescription = "Send test broadcast" },
                ) {
                    Text("Send test", fontWeight = FontWeight.SemiBold)
                }
                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        viewModel.triggerBroadcast(target.id)
                        detailTarget = null
                    },
                    shape = DinayaRadiusButton,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .semantics { contentDescription = "Send broadcast now" },
                ) {
                    Text("Send now", fontWeight = FontWeight.SemiBold)
                }
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BroadcastCreateSheet(
    state: DinayaUiState,
    viewModel: DinayaViewModel,
    onDismiss: () -> Unit,
) {
    val haptic = LocalHapticFeedback.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var name by remember { mutableStateOf("") }
    var channel by remember { mutableStateOf("whatsapp") }
    var body by remember { mutableStateOf("") }
    var subject by remember { mutableStateOf("") }
    var audienceType by remember { mutableStateOf("all") }
    var audienceStage by remember { mutableStateOf("active") }
    var sendNow by remember { mutableStateOf(false) }

    val canCreate = isBroadcastCreateFormValid(
        name = name,
        channel = channel,
        body = body,
        audienceType = audienceType,
        audienceStage = audienceStage,
    )

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
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            GrowthSheetHandle()
            Text("New broadcast", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
            Text(
                "Draft a message, pick a channel, and choose who should receive it.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            CatalogErrorBanner(state.catalogError, onDismiss = viewModel::clearCatalogError)

            CatalogField(
                label = "Name",
                value = name,
                onValueChange = { name = it },
                placeholder = "Broadcast name",
            )

            Text("CHANNEL", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            GrowthFilterChips(
                options = listOf("whatsapp" to "WhatsApp", "sms" to "SMS", "email" to "Email"),
                selected = channel,
                onSelect = { channel = it },
                contentLabel = "Broadcast channel",
            )

            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    "Message",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                OutlinedTextField(
                    value = body,
                    onValueChange = { body = it },
                    placeholder = {
                        Text(
                            "Write the message clients will receive…",
                            style = DinayaFieldTextStyle,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                        )
                    },
                    minLines = 4,
                    maxLines = 8,
                    shape = DinayaRadiusCard,
                    textStyle = DinayaFieldTextStyle.copy(color = MaterialTheme.colorScheme.onSurface),
                    modifier = Modifier
                        .fillMaxWidth()
                        .semantics { contentDescription = "Broadcast message body" },
                )
            }

            if (channel == "email") {
                CatalogField(
                    label = "Subject (optional)",
                    value = subject,
                    onValueChange = { subject = it },
                    placeholder = "Email subject",
                )
            }

            Text("AUDIENCE", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            GrowthFilterChips(
                options = listOf("all" to "All clients", "stage" to "By stage"),
                selected = audienceType,
                onSelect = { audienceType = it },
                contentLabel = "Broadcast audience",
            )
            if (audienceType == "stage") {
                GrowthFilterChips(
                    options = listOf(
                        "lead" to "Lead",
                        "prospect" to "Prospect",
                        "active" to "Active",
                        "churned" to "Churned",
                    ),
                    selected = audienceStage,
                    onSelect = { audienceStage = it },
                    contentLabel = "Broadcast audience stage",
                )
            }

            GrowthSwitchRow(
                title = "Send immediately",
                subtitle = "Off keeps this as a draft you can send later.",
                checked = sendNow,
                onCheckedChange = { sendNow = it },
                contentDescription = "Send broadcast immediately",
            )

            Button(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    viewModel.createBroadcast(
                        name = name.trim(),
                        channel = channel,
                        body = body.trim(),
                        subject = if (channel == "email") subject.trim().ifBlank { null } else null,
                        audienceType = audienceType,
                        audienceStage = if (audienceType == "stage") audienceStage else null,
                        sendNow = sendNow,
                    )
                    onDismiss()
                },
                enabled = canCreate && !state.catalogBusy,
                shape = DinayaRadiusButton,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .semantics { contentDescription = "Create broadcast" },
            ) {
                Text("Create", fontWeight = FontWeight.SemiBold)
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

// ——— AI Hub: workflow list + run/trigger ——————————————————————————————————

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun AiHubScreen(
    state: DinayaUiState,
    viewModel: DinayaViewModel,
    searchQuery: String,
    dark: Boolean,
) {
    val moduleState = state.moduleContent["aiHub"]
    val payload = moduleState?.payload
    val haptic = LocalHapticFeedback.current
    var statusFilter by remember { mutableStateOf("all") }
    var detailTarget by remember { mutableStateOf<ModuleItem?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        GrowthHeader(
            title = payload?.title?.ifBlank { null } ?: "AI Hub",
            summary = payload?.summary?.ifBlank { null } ?: "AI workflow activity and growth tools.",
            isLoading = moduleState?.isLoading == true,
            onRefresh = viewModel::refreshSelectedSection,
        )
        if (moduleState?.errorMessage != null) ErrorText(moduleState.errorMessage)
        if (payload?.metrics?.isNotEmpty() == true) ModuleMetricsGrid(payload.metrics)

        Button(
            onClick = {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                viewModel.triggerAiWorkflow()
            },
            shape = DinayaRadiusButton,
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
            ),
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .semantics { contentDescription = "Run AI reactivation workflow" },
        ) {
            Icon(imageVector = Icons.Filled.PlayArrow, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text("Run reactivation", fontWeight = FontWeight.SemiBold)
        }

        GrowthFilterChips(
            options = listOf("all" to "All", "queued" to "Queued", "completed" to "Done", "failed" to "Failed"),
            selected = statusFilter,
            onSelect = { statusFilter = it },
            contentLabel = "AI workflow status",
        )

        val items = payload?.items.orEmpty().filter { item ->
            val matchesStatus = statusFilter == "all" || item.status.equals(statusFilter, ignoreCase = true)
            val matchesQuery = searchQuery.isBlank() ||
                item.title.contains(searchQuery, ignoreCase = true) ||
                (item.subtitle?.contains(searchQuery, ignoreCase = true) == true)
            matchesStatus && matchesQuery
        }

        if (moduleState?.isLoading == true && payload == null) {
            LoadingPanel()
        } else if (items.isEmpty()) {
            SiteEmptyState(
                title = payload?.emptyState?.ifBlank { null } ?: "No AI activity yet",
                body = if (searchQuery.isNotBlank()) "No AI runs matched \"$searchQuery\"."
                else "Run reactivation to win back quiet clients with AI-drafted outreach.",
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items.forEach { item ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        shape = DinayaRadiusCard,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
                        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                detailTarget = item
                            }
                            .semantics { contentDescription = "AI workflow ${item.title} ${item.status.orEmpty()}" },
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(item.title.ifBlank { "AI workflow" }, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                item.subtitle?.takeIf { it.isNotBlank() }?.let {
                                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                }
                                item.meta?.takeIf { it.isNotBlank() }?.let {
                                    Text(it.take(16).replace("T", " "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            item.status?.takeIf { it.isNotBlank() }?.let { StatusPill(it, dark) }
                        }
                    }
                }
            }
        }
    }

    detailTarget?.let { target ->
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { detailTarget = null },
            sheetState = sheetState,
            shape = DinayaRadiusSheet,
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = MaterialTheme.colorScheme.onSurface,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
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
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(target.title.ifBlank { "AI workflow" }, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                    target.status?.let { StatusPill(it, dark) }
                }
                target.subtitle?.takeIf { it.isNotBlank() }?.let {
                    DetailRow(label = "Workflow", value = it)
                }
                target.meta?.takeIf { it.isNotBlank() }?.let {
                    DetailRow(label = "Ran at", value = it.take(16).replace("T", " "))
                }
                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        viewModel.triggerAiWorkflow()
                        detailTarget = null
                    },
                    shape = DinayaRadiusButton,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .semantics { contentDescription = "Trigger AI workflow again" },
                ) {
                    Icon(imageVector = Icons.Filled.PlayArrow, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Trigger again", fontWeight = FontWeight.SemiBold)
                }
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

// ——— Reports: stats grid + range selector 7d/30d/90d ——————————————————————

@Composable
internal fun ReportsScreen(
    state: DinayaUiState,
    viewModel: DinayaViewModel,
    dark: Boolean,
) {
    val moduleState = state.moduleContent["reports"]
    val payload = moduleState?.payload
    var range by remember { mutableStateOf("30d") }
    @Suppress("UNUSED_VARIABLE")
    val unusedDark = dark

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        GrowthHeader(
            title = payload?.title?.ifBlank { null } ?: "Reports",
            summary = payload?.summary?.ifBlank { null } ?: "Operating metrics and revenue snapshots.",
            isLoading = moduleState?.isLoading == true,
            onRefresh = viewModel::refreshSelectedSection,
        )
        if (moduleState?.errorMessage != null) ErrorText(moduleState.errorMessage)
        if (payload?.metrics?.isNotEmpty() == true) ModuleMetricsGrid(payload.metrics)

        GrowthFilterChips(
            options = listOf("7d" to "Last 7 days", "30d" to "Last 30 days", "90d" to "Last 90 days"),
            selected = range,
            onSelect = {
                range = it
                viewModel.selectReportsRange(it)
            },
            contentLabel = "Reports range",
        )

        val days = when (range) {
            "7d" -> 7L
            "90d" -> 90L
            else -> 30L
        }
        val cutoff = LocalDate.now().minusDays(days)
        val items = payload?.items.orEmpty().filter { item ->
            val date = runCatching {
                LocalDate.parse(item.meta?.take(10).orEmpty())
            }.getOrNull() ?: runCatching {
                LocalDate.parse(item.id.take(10))
            }.getOrNull()
            date == null || !date.isBefore(cutoff)
        }

        if (moduleState?.isLoading == true && payload == null) {
            LoadingPanel()
        } else if (items.isEmpty()) {
            SiteEmptyState(
                title = payload?.emptyState?.ifBlank { null } ?: "No metrics in range",
                body = "Try a wider range — daily revenue and booking metrics will appear here.",
            )
        } else {
            Text(
                text = "${items.size} metric${if (items.size == 1) "" else "s"} · $range",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items.forEach { item ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        shape = DinayaRadiusCard,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
                        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .semantics { contentDescription = "Report metric ${item.title}" },
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.title.ifBlank { "Metric" }, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                                item.meta?.takeIf { it.isNotBlank() }?.let {
                                    Text(it.take(10), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            Text(
                                item.subtitle.orEmpty().ifBlank { "—" },
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                        }
                    }
                }
            }
        }
        if (payload?.refreshedAt?.isNotBlank() == true) {
            Text(
                text = "Refreshed ${payload.refreshedAt.take(16).replace("T", " ")}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun GrowthSheetHandle() {
    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        Box(
            modifier = Modifier
                .size(width = 40.dp, height = 4.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f))
                .semantics { contentDescription = "Drag handle" },
        )
    }
}

@Composable
private fun GrowthSwitchRow(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    contentDescription: String,
) {
    val haptic = LocalHapticFeedback.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(
            modifier = Modifier.weight(1f).padding(end = 12.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(
            checked = checked,
            onCheckedChange = {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                onCheckedChange(it)
            },
            modifier = Modifier.semantics { this.contentDescription = contentDescription },
        )
    }
}

@Composable
private fun GrowthChoiceChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    contentDescription: String,
) {
    val haptic = LocalHapticFeedback.current
    Box(
        modifier = Modifier
            .heightIn(min = 48.dp)
            .clip(DinayaRadiusPill)
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
                DinayaRadiusPill,
            )
            .clickable {
                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                onClick()
            }
            .padding(horizontal = 14.dp, vertical = 10.dp)
            .semantics { this.contentDescription = contentDescription },
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
            color = if (selected) MaterialTheme.colorScheme.primary
            else MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun ModuleItemPicker(
    label: String,
    items: List<ModuleItem>,
    selectedId: String,
    onSelect: (String) -> Unit,
    emptyTitle: String,
    emptyBody: String,
    contentDescriptionPrefix: String,
) {
    val haptic = LocalHapticFeedback.current
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (items.isEmpty()) {
            SiteEmptyState(title = emptyTitle, body = emptyBody)
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
                        .heightIn(max = 148.dp)
                        .verticalScroll(rememberScrollState())
                        .padding(8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    items.forEach { item ->
                        val selected = selectedId == item.id
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(min = 48.dp)
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
                                .clickable {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    onSelect(item.id)
                                }
                                .padding(horizontal = 12.dp, vertical = 10.dp)
                                .semantics { contentDescription = "$contentDescriptionPrefix ${item.title}" },
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = item.title.ifBlank { "Untitled" },
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                                color = if (selected) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.weight(1f),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            item.subtitle?.takeIf { it.isNotBlank() }?.let {
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = it.take(24),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

private val IsoDatePattern = Regex("""^\d{4}-\d{2}-\d{2}$""")
private val BroadcastChannels = setOf("whatsapp", "sms", "email")
private val AudienceStages = setOf("lead", "prospect", "active", "churned")

internal fun parseIsoDate(value: String): LocalDate? {
    val trimmed = value.trim()
    if (!IsoDatePattern.matches(trimmed)) return null
    return runCatching { LocalDate.parse(trimmed) }.getOrNull()
}

internal fun isIsoDateOnOrAfter(start: String, end: String): Boolean {
    val startDate = parseIsoDate(start) ?: return false
    val endDate = parseIsoDate(end) ?: return false
    return !endDate.isBefore(startDate)
}

internal fun isDealCreateFormValid(
    serviceId: String,
    locationId: String,
    discountPercent: Int,
    slotsTotal: Int,
    dealWindowStart: String,
    dealWindowEnd: String,
    apptWindowStart: String,
    apptWindowEnd: String,
): Boolean {
    if (serviceId.isBlank() || locationId.isBlank()) return false
    if (discountPercent !in 10..50) return false
    if (slotsTotal !in 1..20) return false
    if (!isIsoDateOnOrAfter(dealWindowStart, dealWindowEnd)) return false
    if (!isIsoDateOnOrAfter(apptWindowStart, apptWindowEnd)) return false
    return true
}

internal fun isBroadcastCreateFormValid(
    name: String,
    channel: String,
    body: String,
    audienceType: String,
    audienceStage: String?,
): Boolean {
    if (name.isBlank() || body.isBlank()) return false
    if (channel !in BroadcastChannels) return false
    return when (audienceType) {
        "all" -> true
        "stage" -> audienceStage in AudienceStages
        else -> false
    }
}
