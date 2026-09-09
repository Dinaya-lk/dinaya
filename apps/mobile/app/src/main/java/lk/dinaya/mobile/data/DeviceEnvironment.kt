package lk.dinaya.mobile.data

import android.os.Build
import lk.dinaya.mobile.BuildConfig

internal fun isEmulatorDevice(): Boolean {
    val fingerprint = Build.FINGERPRINT.lowercase()
    val model = Build.MODEL.lowercase()
    val product = Build.PRODUCT.lowercase()
    val hardware = Build.HARDWARE.lowercase()
    val manufacturer = Build.MANUFACTURER.lowercase()
    val brand = Build.BRAND.lowercase()
    val device = Build.DEVICE.lowercase()
    return fingerprint.startsWith("generic") ||
        fingerprint.contains("unknown") ||
        model.contains("google_sdk") ||
        model.contains("emulator") ||
        model.contains("android sdk") ||
        manufacturer.contains("genymotion") ||
        hardware.contains("goldfish") ||
        hardware.contains("ranchu") ||
        product.contains("sdk") ||
        product.contains("emulator") ||
        product.contains("vbox") ||
        (brand.startsWith("generic") && device.startsWith("generic"))
}

internal fun defaultApiBaseUrl(): String {
    val production = BuildConfig.DINAYA_API_BASE_URL.ifBlank { "https://dinaya-lk.vercel.app" }
    return if (BuildConfig.DEBUG && isEmulatorDevice()) "http://127.0.0.1:3002" else production
}

internal fun isLoopbackBaseUrl(baseUrl: String): Boolean {
    val trimmed = baseUrl.trim().lowercase()
    if (trimmed.isBlank()) return false
    val host = runCatching { java.net.URL(if ("://" in trimmed) trimmed else "http://$trimmed").host }
        .getOrNull()
        ?.lowercase()
        ?: trimmed
    return host == "127.0.0.1" ||
        host == "localhost" ||
        host == "::1" ||
        host == "[::1]" ||
        host == "10.0.2.2" ||
        host == "0.0.0.0"
}

internal fun friendlyConnectionError(error: Throwable, baseUrl: String): String {
    if (isLoopbackBaseUrl(baseUrl)) {
        return "This phone can't reach a local computer at 127.0.0.1. Sign in with your dinaya.lk email and password."
    }
    val raw = generateSequence(error) { it.cause }
        .mapNotNull { it.message }
        .joinToString(" ")
        .lowercase()
    if (
        raw.contains("unexpected end of stream") ||
        raw.contains("failed to connect") ||
        raw.contains("connection refused") ||
        raw.contains("timeout") ||
        raw.contains("timed out") ||
        raw.contains("unable to resolve host") ||
        raw.contains("network is unreachable") ||
        raw.contains("cleartext")
    ) {
        return "Couldn't reach Dinaya. Check your internet and try again."
    }
    val message = error.message?.trim().orEmpty()
    if (message.isNotBlank() && !message.contains("okhttp", ignoreCase = true)) {
        return message
    }
    return "Couldn't reach Dinaya. Check your internet and try again."
}

internal fun showDeveloperSignInTools(): Boolean = BuildConfig.DEBUG && isEmulatorDevice()
