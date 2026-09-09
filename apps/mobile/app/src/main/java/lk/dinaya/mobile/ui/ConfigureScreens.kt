package lk.dinaya.mobile.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.OpenInBrowser
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import lk.dinaya.mobile.data.ModuleItem

// ——— Integrations: provider rows + connect state + OAuth via browser ——————

@Composable
internal fun IntegrationsScreen(
    state: DinayaUiState,
    viewModel: DinayaViewModel,
    searchQuery: String,
    dark: Boolean,
    onOpenWeb: (String) -> Unit,
) {
    val moduleState = state.moduleContent["integrations"]
    val payload = moduleState?.payload
    val haptic = LocalHapticFeedback.current
    var statusFilter by remember { mutableStateOf("all") }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        GrowthHeader(
            title = payload?.title?.ifBlank { null } ?: "Integrations",
            summary = payload?.summary?.ifBlank { null } ?: "Connected providers, payments, social, and voice state.",
            isLoading = moduleState?.isLoading == true,
            onRefresh = viewModel::refreshSelectedSection,
        )
        if (moduleState?.errorMessage != null) ErrorText(moduleState.errorMessage)
        if (payload?.metrics?.isNotEmpty() == true) ModuleMetricsGrid(payload.metrics)

        GrowthFilterChips(
            options = listOf("all" to "All", "active" to "Connected", "inactive" to "Off", "paused" to "Paused"),
            selected = statusFilter,
            onSelect = { statusFilter = it },
            contentLabel = "Integrations status",
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
                title = payload?.emptyState?.ifBlank { null } ?: "No integrations yet",
                body = if (searchQuery.isNotBlank()) "No providers matched \"$searchQuery\"."
                else "Connect PayHere, social accounts, or voice AI from the web dashboard.",
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items.forEach { item ->
                    IntegrationRowCard(
                        item = item,
                        dark = dark,
                        // OAuth / provider connect stays in the browser intentionally.
                        onConnect = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onOpenWeb("/dashboard/settings/integrations")
                        },
                    )
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
private fun IntegrationRowCard(item: ModuleItem, dark: Boolean, onConnect: () -> Unit) {
    val isConnected = item.status.equals("active", ignoreCase = true)
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = DinayaRadiusCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier
            .fillMaxWidth()
            .semantics { contentDescription = "Integration ${item.title} ${item.status.orEmpty()}" },
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            ClientInitials(name = item.title)
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        item.title.ifBlank { "Provider" },
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.weight(1f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    item.status?.takeIf { it.isNotBlank() }?.let {
                        Spacer(modifier = Modifier.width(8.dp))
                        StatusPill(it, dark)
                    }
                }
                item.subtitle?.takeIf { it.isNotBlank() }?.let {
                    Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                item.meta?.takeIf { it.isNotBlank() }?.let {
                    Text(it.take(16).replace("T", " "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        if (!isConnected) {
            OutlinedButton(
                onClick = onConnect,
                shape = DinayaRadiusButton,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 0.dp)
                    .padding(bottom = 12.dp)
                    .height(38.dp)
                    .semantics { contentDescription = "Connect ${item.title} via browser" },
            ) {
                Icon(imageVector = Icons.Filled.OpenInBrowser, contentDescription = null, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Connect", style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

// ——— Automations: rule list + enable toggle ———————————————————————————————

@Composable
internal fun AutomationsScreen(
    state: DinayaUiState,
    viewModel: DinayaViewModel,
    searchQuery: String,
    dark: Boolean,
) {
    val moduleState = state.moduleContent["automations"]
    val payload = moduleState?.payload
    val haptic = LocalHapticFeedback.current
    var statusFilter by remember { mutableStateOf("all") }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        GrowthHeader(
            title = payload?.title?.ifBlank { null } ?: "Automations",
            summary = payload?.summary?.ifBlank { null } ?: "Automation rules and enablement state.",
            isLoading = moduleState?.isLoading == true,
            onRefresh = viewModel::refreshSelectedSection,
        )
        if (moduleState?.errorMessage != null) ErrorText(moduleState.errorMessage)
        if (payload?.metrics?.isNotEmpty() == true) ModuleMetricsGrid(payload.metrics)

        GrowthFilterChips(
            options = listOf("all" to "All", "active" to "Active", "paused" to "Paused"),
            selected = statusFilter,
            onSelect = { statusFilter = it },
            contentLabel = "Automations status",
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
                title = payload?.emptyState?.ifBlank { null } ?: "No automations yet",
                body = if (searchQuery.isNotBlank()) "No rules matched \"$searchQuery\"."
                else "Reminders and follow-ups will appear here once configured on the web dashboard.",
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items.forEach { item ->
                    AutomationRowCard(
                        item = item,
                        dark = dark,
                        onToggle = { enabled ->
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            viewModel.toggleAutomation(item.id, enabled)
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun AutomationRowCard(item: ModuleItem, dark: Boolean, onToggle: (Boolean) -> Unit) {
    val isActive = item.status.equals("active", ignoreCase = true)
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = DinayaRadiusCard,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier
            .fillMaxWidth()
            .semantics { contentDescription = "Automation ${item.title} ${item.status.orEmpty()}" },
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(item.title.ifBlank { "Automation" }, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                item.subtitle?.takeIf { it.isNotBlank() }?.let {
                    Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    item.status?.takeIf { it.isNotBlank() }?.let { StatusPill(it, dark) }
                }
            }
            Switch(
                checked = isActive,
                onCheckedChange = onToggle,
                modifier = Modifier.semantics { contentDescription = "Toggle automation ${item.title}" },
            )
        }
    }
}

// ——— Billing: plan card + upgrade via web ONLY ————————————————————————————

@Composable
internal fun BillingScreen(
    state: DinayaUiState,
    viewModel: DinayaViewModel,
    dark: Boolean,
    onOpenWeb: (String) -> Unit,
) {
    val moduleState = state.moduleContent["billing"]
    val payload = moduleState?.payload
    val haptic = LocalHapticFeedback.current
    val plan = state.bootstrap?.business?.plan.orEmpty().ifBlank {
        payload?.metrics?.firstOrNull { it.label.equals("Plan", ignoreCase = true) }?.value.orEmpty()
    }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        GrowthHeader(
            title = payload?.title?.ifBlank { null } ?: "Plan & billing",
            summary = payload?.summary?.ifBlank { null } ?: "Current plan and subscription state.",
            isLoading = moduleState?.isLoading == true,
            onRefresh = viewModel::refreshSelectedSection,
        )
        if (moduleState?.errorMessage != null) ErrorText(moduleState.errorMessage)
        if (payload?.metrics?.isNotEmpty() == true) ModuleMetricsGrid(payload.metrics)

        // Native plan card (read-only state); checkout changes stay on web intentionally.
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = DinayaRadiusSection,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
            modifier = Modifier
                .fillMaxWidth()
                .semantics { contentDescription = "Current plan $plan" },
        ) {
            Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Current plan", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        plan.ifBlank { "Trial" }.replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    plan.takeIf { it.isNotBlank() }?.let { StatusPill(it, dark) }
                }
                Text(
                    "Upgrades, downgrades, and card changes open securely in your browser.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onOpenWeb("/dashboard/billing")
                    },
                    shape = DinayaRadiusButton,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .semantics { contentDescription = "Manage billing on web" },
                ) {
                    Icon(imageVector = Icons.Filled.OpenInBrowser, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Manage billing on web", fontWeight = FontWeight.SemiBold)
                }
            }
        }

        val items = payload?.items.orEmpty()
        if (moduleState?.isLoading == true && payload == null) {
            LoadingPanel()
        } else if (items.isEmpty()) {
            SiteEmptyState(
                title = payload?.emptyState?.ifBlank { null } ?: "No billing history",
                body = "Invoices and subscription renewals will appear here.",
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
                            .semantics { contentDescription = "Subscription ${item.title} ${item.status.orEmpty()}" },
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(item.title.ifBlank { "Subscription" }, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                                item.subtitle?.takeIf { it.isNotBlank() }?.let {
                                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                item.meta?.takeIf { it.isNotBlank() }?.let {
                                    Text("Renews ${it.take(10)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            item.status?.takeIf { it.isNotBlank() }?.let {
                                Spacer(modifier = Modifier.width(8.dp))
                                StatusPill(it, dark)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ——— Settings: business profile edit + device list + sign-out —————————————

@Composable
internal fun SettingsScreen(
    state: DinayaUiState,
    viewModel: DinayaViewModel,
    dark: Boolean,
    onSignOutRequest: () -> Unit,
) {
    val moduleState = state.moduleContent["settings"]
    val payload = moduleState?.payload
    val haptic = LocalHapticFeedback.current
    @Suppress("UNUSED_VARIABLE")
    val unusedDark = dark

    var name by remember(state.bootstrap?.business?.name) { mutableStateOf(state.bootstrap?.business?.name.orEmpty()) }
    var phone by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        GrowthHeader(
            title = payload?.title?.ifBlank { null } ?: "Settings",
            summary = payload?.summary?.ifBlank { null } ?: "Business profile and device access.",
            isLoading = moduleState?.isLoading == true,
            onRefresh = viewModel::refreshSelectedSection,
        )
        if (moduleState?.errorMessage != null) ErrorText(moduleState.errorMessage)
        if (payload?.metrics?.isNotEmpty() == true) ModuleMetricsGrid(payload.metrics)

        // Business profile (native edit)
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = DinayaRadiusCard,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
            modifier = Modifier
                .fillMaxWidth()
                .semantics { contentDescription = "Business profile editor" },
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Business profile", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Business name") },
                    singleLine = true,
                    shape = DinayaRadiusButton,
                    modifier = Modifier.fillMaxWidth().semantics { contentDescription = "Business name input" },
                )
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("Phone") },
                    singleLine = true,
                    shape = DinayaRadiusButton,
                    modifier = Modifier.fillMaxWidth().semantics { contentDescription = "Business phone input" },
                )
                OutlinedTextField(
                    value = address,
                    onValueChange = { address = it },
                    label = { Text("Address") },
                    shape = DinayaRadiusButton,
                    modifier = Modifier.fillMaxWidth().semantics { contentDescription = "Business address input" },
                )
                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        viewModel.updateBusinessProfile(name, phone, address)
                    },
                    enabled = name.isNotBlank() && moduleState?.isLoading != true,
                    shape = DinayaRadiusButton,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .semantics { contentDescription = "Save business profile" },
                ) {
                    Text("Save profile", fontWeight = FontWeight.SemiBold)
                }
            }
        }

        // Device list (native, read-only)
        Text("Devices", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
        val devices = payload?.items.orEmpty()
        if (moduleState?.isLoading == true && payload == null) {
            LoadingPanel()
        } else if (devices.isEmpty()) {
            SiteEmptyState(
                title = payload?.emptyState?.ifBlank { null } ?: "No devices found",
                body = "Desktop and mobile sessions for this business will appear here.",
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                devices.forEach { device ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        shape = DinayaRadiusCard,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)),
                        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .semantics { contentDescription = "Device ${device.title} ${device.status.orEmpty()}" },
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(device.title.ifBlank { "Device" }, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                device.subtitle?.takeIf { it.isNotBlank() }?.let {
                                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                device.meta?.takeIf { it.isNotBlank() }?.let {
                                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                }
                            }
                            device.status?.takeIf { it.isNotBlank() }?.let {
                                Spacer(modifier = Modifier.width(8.dp))
                                StatusPill(it, dark = false)
                            }
                        }
                    }
                }
            }
        }

        // Sign-out (native)
        OutlinedButton(
            onClick = {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                onSignOutRequest()
            },
            shape = DinayaRadiusButton,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.5f)),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .semantics { contentDescription = "Sign out of Dinaya" },
        ) {
            Icon(imageVector = Icons.AutoMirrored.Filled.Logout, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text("Sign out", fontWeight = FontWeight.SemiBold)
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { /* account row kept for parity; sign-out above is primary */ }
                .padding(vertical = 2.dp),
            horizontalArrangement = Arrangement.Center,
        ) {
            Text(
                (state.session?.userEmail.orEmpty()),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}
