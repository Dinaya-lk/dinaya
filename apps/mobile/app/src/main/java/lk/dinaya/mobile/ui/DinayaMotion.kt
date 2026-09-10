package lk.dinaya.mobile.ui

import android.provider.Settings
import androidx.compose.animation.ContentTransform
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

val LocalReduceMotion = staticCompositionLocalOf { false }

/** Tab / page spring — critically damped, GPU transform only. */
fun dinayaNoBounceSpring() = spring<Float>(
    dampingRatio = Spring.DampingRatioNoBouncy,
    stiffness = Spring.StiffnessMedium,
)

/** Press / toggle spring — snappier than page motion, still no bounce. */
fun dinayaSnappySpring() = spring<Float>(
    dampingRatio = Spring.DampingRatioNoBouncy,
    stiffness = Spring.StiffnessMediumLow,
)

private val SectionNavOrder = listOf(
    "overview",
    "calendar",
    "bookings",
    "clients",
    "services",
    "staff",
    "locations",
    "availability",
    "reviews",
    "payments",
    "marketing",
    "deals",
    "broadcasts",
    "aiHub",
    "reports",
    "integrations",
    "automations",
    "billing",
    "settings",
)

fun dinayaSectionNavIndex(key: String): Int {
    val index = SectionNavOrder.indexOf(key)
    return if (index >= 0) index else SectionNavOrder.size
}

fun dinayaStaggerDelayMs(index: Int, reduceMotion: Boolean): Long {
    if (reduceMotion) return 0L
    return index.coerceIn(0, 6) * 45L
}

fun dinayaPressScaleTarget(
    pressed: Boolean,
    reduceMotion: Boolean,
    scaleDown: Float = 0.96f,
): Float {
    if (reduceMotion || !pressed) return 1f
    return scaleDown.coerceAtLeast(0.95f)
}

@Composable
fun rememberReduceMotion(): Boolean {
    val context = LocalContext.current
    return remember(context) {
        val resolver = context.contentResolver
        runCatching {
            Settings.Global.getFloat(resolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f ||
                Settings.Global.getFloat(resolver, Settings.Global.TRANSITION_ANIMATION_SCALE, 1f) == 0f
        }.getOrDefault(false)
    }
}

fun dinayaSectionEnter(reduceMotion: Boolean = false): EnterTransition {
    if (reduceMotion) return fadeIn(animationSpec = tween(0))
    return fadeIn(animationSpec = tween(180)) + slideInHorizontally(
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMediumLow,
        ),
        initialOffsetX = { fullWidth -> (fullWidth * 0.04f).toInt() },
    )
}

fun dinayaSectionExit(reduceMotion: Boolean = false): ExitTransition {
    if (reduceMotion) return fadeOut(animationSpec = tween(0))
    return fadeOut(animationSpec = tween(140)) + slideOutHorizontally(
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMediumLow,
        ),
        targetOffsetX = { fullWidth -> -(fullWidth * 0.03f).toInt() },
    )
}

fun dinayaSectionTransition(
    initialKey: String,
    targetKey: String,
    reduceMotion: Boolean,
): ContentTransform {
    if (reduceMotion) {
        return fadeIn(animationSpec = tween(0)) togetherWith fadeOut(animationSpec = tween(0))
    }
    val forward = dinayaSectionNavIndex(targetKey) >= dinayaSectionNavIndex(initialKey)
    val enterSign = if (forward) 1 else -1
    val exitSign = if (forward) -1 else 1
    return (
        fadeIn(animationSpec = tween(200, easing = FastOutSlowInEasing)) +
            slideInHorizontally(
                animationSpec = spring(
                    dampingRatio = Spring.DampingRatioNoBouncy,
                    stiffness = Spring.StiffnessMediumLow,
                ),
                initialOffsetX = { fullWidth -> (fullWidth * 0.055f * enterSign).toInt() },
            )
        ) togetherWith (
            fadeOut(animationSpec = tween(140)) +
                slideOutHorizontally(
                    animationSpec = spring(
                        dampingRatio = Spring.DampingRatioNoBouncy,
                        stiffness = Spring.StiffnessMediumLow,
                    ),
                    targetOffsetX = { fullWidth -> (fullWidth * 0.04f * exitSign).toInt() },
                )
            )
}

fun dinayaIconSwapTransition(reduceMotion: Boolean): ContentTransform {
    if (reduceMotion) {
        return fadeIn(animationSpec = tween(0)) togetherWith fadeOut(animationSpec = tween(0))
    }
    return (
        fadeIn(animationSpec = tween(180)) +
            scaleIn(
                animationSpec = spring(
                    dampingRatio = Spring.DampingRatioNoBouncy,
                    stiffness = Spring.StiffnessMedium,
                ),
                initialScale = 0.25f,
            )
        ) togetherWith (
            fadeOut(animationSpec = tween(140)) +
                scaleOut(
                    animationSpec = tween(140),
                    targetScale = 0.25f,
                )
            )
}

fun dinayaExpandEnter(reduceMotion: Boolean): EnterTransition {
    if (reduceMotion) return fadeIn(animationSpec = tween(0))
    return fadeIn(animationSpec = tween(160)) + slideInVertically(
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMediumLow,
        ),
        initialOffsetY = { -12 },
    )
}

fun dinayaExpandExit(reduceMotion: Boolean): ExitTransition {
    if (reduceMotion) return fadeOut(animationSpec = tween(0))
    return fadeOut(animationSpec = tween(120)) + slideOutVertically(
        animationSpec = tween(120),
        targetOffsetY = { -12 },
    )
}

@Composable
fun Modifier.dinayaPressScale(
    interactionSource: MutableInteractionSource = remember { MutableInteractionSource() },
    scaleDown: Float = 0.96f,
): Modifier {
    val reduceMotion = LocalReduceMotion.current
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = dinayaPressScaleTarget(isPressed, reduceMotion, scaleDown),
        animationSpec = dinayaSnappySpring(),
        label = "dinayaPressScale",
    )
    return this.graphicsLayer {
        scaleX = scale
        scaleY = scale
    }
}

@Composable
fun Modifier.dinayaBounceClick(
    scaleDown: Float = 0.96f,
    haptic: HapticFeedbackType? = HapticFeedbackType.TextHandleMove,
    onClick: () -> Unit,
): Modifier {
    val interactionSource = remember { MutableInteractionSource() }
    val hapticFeedback = LocalHapticFeedback.current
    return this
        .dinayaPressScale(interactionSource, scaleDown)
        .clickable(
            interactionSource = interactionSource,
            indication = null,
            onClick = {
                if (haptic != null) hapticFeedback.performHapticFeedback(haptic)
                onClick()
            },
        )
}

/**
 * Staggered enter for list rows. Opacity + translateY only (compositor-friendly).
 * Caps delay so long lists stay responsive.
 */
@Composable
fun Modifier.dinayaStaggerEnter(index: Int): Modifier {
    val reduceMotion = LocalReduceMotion.current
    var visible by remember { mutableStateOf(reduceMotion) }
    LaunchedEffect(index, reduceMotion) {
        if (reduceMotion) {
            visible = true
            return@LaunchedEffect
        }
        visible = false
        delay(dinayaStaggerDelayMs(index, reduceMotion = false))
        visible = true
    }
    val progress by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = if (reduceMotion) tween(0) else dinayaNoBounceSpring(),
        label = "dinayaStaggerEnter",
    )
    return this.graphicsLayer {
        alpha = progress
        translationY = (1f - progress) * 10f
    }
}

@Composable
fun dinayaShimmerAlpha(): Float {
    val reduceMotion = LocalReduceMotion.current
    if (reduceMotion) return 0.10f
    val infinite = rememberInfiniteTransition(label = "dinayaShimmer")
    val alpha by infinite.animateFloat(
        initialValue = 0.07f,
        targetValue = 0.16f,
        animationSpec = infiniteRepeatable(
            animation = tween(900, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "dinayaShimmerAlpha",
    )
    return alpha
}

@Composable
internal fun BookingListSkeleton() {
    val shimmer = dinayaShimmerAlpha()
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        repeat(3) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(96.dp)
                    .clip(DinayaRadiusCard)
                    .background(MaterialTheme.colorScheme.onSurface.copy(alpha = shimmer)),
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth(0.4f)
                .height(12.dp)
                .clip(DinayaRadiusButton)
                .background(MaterialTheme.colorScheme.onSurface.copy(alpha = shimmer * 0.7f))
                .padding(bottom = 2.dp),
        )
    }
}
