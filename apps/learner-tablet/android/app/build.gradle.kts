import java.io.FileInputStream
import java.util.Base64
import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    FileInputStream(keystorePropertiesFile).use { keystoreProperties.load(it) }
}

fun signingValue(propertyKey: String, envKey: String): String? {
    val propertyValue = keystoreProperties.getProperty(propertyKey)?.trim()
    if (!propertyValue.isNullOrEmpty()) return propertyValue
    val envValue = System.getenv(envKey)?.trim()
    if (!envValue.isNullOrEmpty()) return envValue
    return null
}

fun decodeDartDefines(): Map<String, String> {
    val rawDefines = (project.findProperty("dart-defines") as String?)
        ?.takeIf { it.isNotBlank() }
        ?: System.getenv("DART_DEFINES")?.takeIf { it.isNotBlank() }
        ?: return emptyMap()

    return rawDefines
        .split(',')
        .mapNotNull { encoded ->
            runCatching {
                String(Base64.getDecoder().decode(encoded), Charsets.UTF_8)
            }.getOrNull()
        }
        .mapNotNull { decoded ->
            val separatorIndex = decoded.indexOf('=')
            if (separatorIndex <= 0) {
                null
            } else {
                decoded.substring(0, separatorIndex) to decoded.substring(separatorIndex + 1)
            }
        }
        .toMap()
}

fun normalizeReleaseDefine(value: String?): String? {
    val trimmed = value?.trim()
    return if (trimmed.isNullOrEmpty()) null else trimmed
}

fun booleanReleaseDefine(value: String?): Boolean {
    return value?.trim()?.equals("true", ignoreCase = true) == true
}

fun releaseApiBaseUrlIssue(rawBaseUrl: String?, hasExplicitConfig: Boolean): String? {
    val trimmed = rawBaseUrl?.trim()
    if (trimmed.isNullOrEmpty()) {
        return "Learner-tablet release build is missing LUMO_API_BASE_URL. Pass the real production learner API host with --dart-define=LUMO_API_BASE_URL=... before shipping a release artifact."
    }
    if (!hasExplicitConfig) {
        return "Learner-tablet release build must set LUMO_API_BASE_URL explicitly instead of relying on the baked-in default backend target."
    }

    val normalizedSource = if (trimmed.contains("://")) trimmed else "https://$trimmed"
    val normalized = normalizedSource.removeSuffix("/")
    val uri = runCatching { java.net.URI(normalized) }.getOrNull()
        ?: return "Learner-tablet release build has an invalid LUMO_API_BASE_URL value: $trimmed"
    val host = uri.host?.lowercase()
        ?: return "Learner-tablet release build has an invalid LUMO_API_BASE_URL host: $trimmed"
    val scheme = uri.scheme?.lowercase().orEmpty()

    val looksPlaceholder = host == "example.com" || host.endsWith(".example.com")
    val looksLocal = host == "localhost" ||
        host == "127.0.0.1" ||
        host == "0.0.0.0" ||
        host.endsWith(".local")

    return when {
        looksLocal -> "Learner-tablet release build points LUMO_API_BASE_URL at $host, which release tablets cannot reach."
        scheme != "https" -> "Learner-tablet release build must use an https LUMO_API_BASE_URL. Current value: $normalized"
        looksPlaceholder -> "Learner-tablet release build still points LUMO_API_BASE_URL at placeholder host $host."
        else -> null
    }
}

val dartDefines = decodeDartDefines()
val releaseApiBaseUrl = normalizeReleaseDefine(dartDefines["LUMO_API_BASE_URL"])
val releaseDeviceIdentifier = normalizeReleaseDefine(dartDefines["LUMO_DEVICE_IDENTIFIER"])
val releaseUsesSeedDemoContent = booleanReleaseDefine(dartDefines["LUMO_ENABLE_SEED_DEMO_CONTENT"])
val hasExplicitReleaseApiBaseUrl = dartDefines.containsKey("LUMO_API_BASE_URL") && releaseApiBaseUrl != null
val releaseBuildConfigIssues = buildList {
    if (!releaseUsesSeedDemoContent && releaseDeviceIdentifier == null) {
        add(
            "Learner-tablet release build is missing LUMO_DEVICE_IDENTIFIER. Provision the exact LMS device identifier with --dart-define=LUMO_DEVICE_IDENTIFIER=... before shipping tablets.",
        )
    }
    releaseApiBaseUrlIssue(
        rawBaseUrl = releaseApiBaseUrl,
        hasExplicitConfig = hasExplicitReleaseApiBaseUrl,
    )?.let(::add)
}

val releaseStoreFile = signingValue("storeFile", "LUMO_ANDROID_STORE_FILE")
val releaseStorePassword = signingValue("storePassword", "LUMO_ANDROID_STORE_PASSWORD")
val releaseKeyAlias = signingValue("keyAlias", "LUMO_ANDROID_KEY_ALIAS")
val releaseKeyPassword = signingValue("keyPassword", "LUMO_ANDROID_KEY_PASSWORD")
val hasReleaseSigningConfig = listOf(
    releaseStoreFile,
    releaseStorePassword,
    releaseKeyAlias,
    releaseKeyPassword,
).all { !it.isNullOrBlank() }
val isReleaseBuildRequested = gradle.startParameter.taskNames.any { taskName ->
    taskName.contains("release", ignoreCase = true)
}

android {
    namespace = "com.lumo.learnertablet"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    signingConfigs {
        if (hasReleaseSigningConfig) {
            create("release") {
                storeFile = file(releaseStoreFile!!)
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    defaultConfig {
        applicationId = "com.lumo.learnertablet"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (hasReleaseSigningConfig) {
                signingConfig = signingConfigs.getByName("release")
            } else if (isReleaseBuildRequested) {
                throw GradleException(
                    "Learner-tablet release signing is not configured. Set android/key.properties (storeFile, storePassword, keyAlias, keyPassword) or the matching LUMO_ANDROID_* environment variables before building a release artifact.",
                )
            }
            if (isReleaseBuildRequested && releaseBuildConfigIssues.isNotEmpty()) {
                throw GradleException(
                    releaseBuildConfigIssues.joinToString(
                        separator = "\n- ",
                        prefix = "Learner-tablet release config is not shippable:\n- ",
                    ),
                )
            }
        }
    }
}

flutter {
    source = "../.."
}
