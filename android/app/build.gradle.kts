plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Versio luetaan boksin lisäosasta, jotta molemmat pysyvät samassa numerossa
val e2Version: String = run {
    val f = rootProject.file("../enigma2/src/E2TVPlayer/web.py")
    val m = if (f.exists()) Regex("^VERSION = \"([0-9.]+)\"", RegexOption.MULTILINE).find(f.readText()) else null
    m?.groupValues?.get(1) ?: "0.0.0"
}
val e2VersionCode: Int = e2Version.split(".").map { it.toIntOrNull() ?: 0 }
    .let { (it.getOrElse(0) { 0 } * 1000000) + (it.getOrElse(1) { 0 } * 1000) + it.getOrElse(2) { 0 } }

android {
    namespace = "fi.e2tvplayer"
    compileSdk = 34

    defaultConfig {
        applicationId = "fi.e2tvplayer"
        minSdk = 21
        targetSdk = 34
        versionCode = e2VersionCode
        versionName = e2Version
    }

    signingConfigs {
        // Sama avain joka rakennuksessa, jotta päivitys asentuu vanhan päälle
        create("e2") {
            storeFile = rootProject.file("e2tvplayer.keystore")
            storePassword = "e2tvplayer"
            keyAlias = "e2tvplayer"
            keyPassword = "e2tvplayer"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("e2")
        }
        debug {
            signingConfig = signingConfigs.getByName("e2")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    lint {
        abortOnError = false
        checkReleaseBuilds = false
    }
}

dependencies {
    val media3 = "1.3.1"
    implementation("androidx.media3:media3-exoplayer:$media3")
    implementation("androidx.media3:media3-ui:$media3")
    implementation("androidx.recyclerview:recyclerview:1.3.2")
    implementation("androidx.annotation:annotation:1.8.0")
}

// APK:n nimeksi E2TVPlayer.apk
android.applicationVariants.all {
    outputs.all {
        (this as com.android.build.gradle.internal.api.BaseVariantOutputImpl).outputFileName = "E2TVPlayer.apk"
    }
}
