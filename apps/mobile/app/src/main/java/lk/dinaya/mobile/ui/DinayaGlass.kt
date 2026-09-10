package lk.dinaya.mobile.ui

import androidx.compose.material3.ColorScheme
import androidx.compose.ui.graphics.luminance

fun dinayaIsDark(scheme: ColorScheme): Boolean = scheme.background.luminance() < 0.5f
