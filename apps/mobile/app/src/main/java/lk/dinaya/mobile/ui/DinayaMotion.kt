package lk.dinaya.mobile.ui

import android.provider.Settings
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
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
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp

val LocalReduceMotion = staticCompositionLocalOf { false }

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

fun dinayaNoBounceSpring() = spring<Float>(
    dampingRatio = Spring.DampingRatioNoBouncy,
    stiffness = Spring.StiffnessMedium,
)

@Composable
fun dinayaSectionEnter(): EnterTransition {
    if (LocalReduceMotion.current) return fadeIn(animationSpec = tween(0))
    return fadeIn(animationSpec = tween(180)) + slideInHorizontally(
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMedium,
        ),
        initialOffsetX = { fullWidth -> (fullWidth * 0.04f).toInt() },
    )
}

@Composable
fun dinayaSectionExit(): ExitTransition {
    if (LocalReduceMotion.current) return fadeOut(animationSpec = tween(0))
    return fadeOut(animationSpec = tween(150))
}

@Composable
fun Modifier.dinayaPressScale(
    interactionSource: MutableInteractionSource = remember { MutableInteractionSource() },
    scaleDown: Float = 0.96f,
): Modifier {
    val reduceMotion = LocalReduceMotion.current
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (!reduceMotion && isPressed) scaleDown else 1f,
        animationSpec = dinayaNoBounceSpring(),
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

@Composable
internal fun BookingListSkeleton() {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        repeat(3) { index ->
            val alpha = 0.08f + (index * 0.02f)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(96.dp)
                    .clip(DinayaRadiusCard)
                    .background(MaterialTheme.colorScheme.onSurface.copy(alpha = alpha)),
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth(0.4f)
                .height(12.dp)
                .clip(DinayaRadiusButton)
                .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f))
                .padding(bottom = 2.dp),
        )
    }
}
