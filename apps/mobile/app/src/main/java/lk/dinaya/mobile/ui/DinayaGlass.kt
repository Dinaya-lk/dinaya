package lk.dinaya.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.material3.ColorScheme
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.unit.dp

fun dinayaIsDark(scheme: ColorScheme): Boolean = scheme.background.luminance() < 0.5f

/**
 * Simulated Liquid Glass for navigation chrome only — translucent fill,
 * specular hairline, and a soft shadow. Do not use on content cards.
 */
fun Modifier.dinayaGlass(shape: Shape, dark: Boolean): Modifier = this
    .shadow(
        elevation = if (dark) 16.dp else 20.dp,
        shape = shape,
        clip = false,
        ambientColor = Color.Black.copy(alpha = if (dark) 0.50f else 0.10f),
        spotColor = Color.Black.copy(alpha = if (dark) 0.62f else 0.16f),
    )
    .clip(shape)
    .background(
        if (dark) Color(0xD12C2C2E) else Color.White.copy(alpha = 0.78f),
    )
    .border(
        width = 0.5.dp,
        brush = Brush.linearGradient(
            colors = if (dark) {
                listOf(
                    Color.White.copy(alpha = 0.42f),
                    Color.White.copy(alpha = 0.08f),
                )
            } else {
                listOf(
                    Color.White.copy(alpha = 0.95f),
                    Color.White.copy(alpha = 0.22f),
                )
            },
        ),
        shape = shape,
    )
