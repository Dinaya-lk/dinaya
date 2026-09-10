package lk.dinaya.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import lk.dinaya.mobile.ui.DinayaMobileApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Site themeColor: light #ffffff / dark #0a0a0a — draw behind system bars
        // so Compose surfaces (DinayaTheme) tint edge-to-edge exactly like the site.
        enableEdgeToEdge()
        setContent {
            DinayaMobileApp()
        }
    }
}
