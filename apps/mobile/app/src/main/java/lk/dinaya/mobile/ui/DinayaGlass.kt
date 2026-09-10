package lk.dinaya.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.material3.ColorScheme
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.unit.dp

fun dinayaIsDark(scheme: ColorScheme): Boolean = scheme.background.luminance() < 0.5f

fun dinayaGlassFill(dark: Boolean): Color =
    if (dark) Color(0xCC2C2C2E) else Color.White.copy(alpha = 0.72f)

fun dinayaSheetContainerColor(dark: Boolean): Color =
    if (dark) Color(0xE61C1C1E) else Color.White.copy(alpha = 0.88f)

fun dinayaSheetScrimColor(dark: Boolean): Color =
    Color.Black.copy(alpha = if (dark) 0.52f else 0.36f)

fun dinayaGlassHighlight(dark: Boolean): Color =
    Color.White.copy(alpha = if (dark) 0.22f else 0.55f)

/**
 * Liquid Glass for navigation chrome only — translucent fill so content
 * can show through, specular hairline, inner highlight. GPU-cheap (no
 * backdrop RenderEffect). Do not use on content cards.
 *
 * When [reduceMotion] is true, skip the highlight pass and use a denser fill.
 */
fun Modifier.dinayaGlass(
    shape: Shape,
    dark: Boolean,
    reduceMotion: Boolean = false,
): Modifier {
    val fillTop = if (dark) {
        if (reduceMotion) Color(0xF03A3A3C) else Color(0xD63A3A3C)
    } else {
        Color.White.copy(alpha = if (reduceMotion) 0.94f else 0.82f)
    }
    val fillBottom = if (dark) {
        if (reduceMotion) Color(0xF028282A) else Color(0xC428282A)
    } else {
        Color.White.copy(alpha = if (reduceMotion) 0.90f else 0.58f)
    }
    return this
        .shadow(
            elevation = if (reduceMotion) 8.dp else if (dark) 18.dp else 22.dp,
            shape = shape,
            clip = false,
            ambientColor = Color.Black.copy(alpha = if (dark) 0.48f else 0.10f),
            spotColor = Color.Black.copy(alpha = if (dark) 0.58f else 0.14f),
        )
        .clip(shape)
        .background(
            brush = Brush.verticalGradient(colors = listOf(fillTop, fillBottom)),
        )
        .then(
            if (reduceMotion) {
                Modifier
            } else {
                Modifier.drawBehind {
                    drawRect(
                        brush = Brush.verticalGradient(
                            0f to dinayaGlassHighlight(dark),
                            0.28f to Color.Transparent,
                        ),
                    )
                }
            },
        )
        .border(
            width = 0.5.dp,
            brush = Brush.linearGradient(
                colors = if (dark) {
                    listOf(
                        Color.White.copy(alpha = 0.50f),
                        Color.White.copy(alpha = 0.08f),
                    )
                } else {
                    listOf(
                        Color.White.copy(alpha = 0.98f),
                        Color.White.copy(alpha = 0.28f),
                    )
                },
            ),
            shape = shape,
        )
}
