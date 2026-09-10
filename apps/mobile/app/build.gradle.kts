plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

val dinayaApiBaseUrl = providers.gradleProperty("dinayaApiBaseUrl")
    .orElse("https://dinaya-lk.vercel.app")
    .get()
    .replace("\\", "\\\\")
    .replace("\"", "\\\"")

android {
    namespace = "lk.dinaya.mobile"
    compileSdk = 36

    defaultConfig {
        applicationId = "lk.dinaya.mobile"
        minSdk = 26
        targetSdk = 36
        versionCode = 7
        versionName = "0.3.4"

        buildConfigField("String", "DINAYA_API_BASE_URL", "\"$dinayaApiBaseUrl\"")
        manifestPlaceholders["usesCleartextTraffic"] = "true"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildFeatures {
        buildConfig = true
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2026.05.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.10.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.10.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.10.0")

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
}
