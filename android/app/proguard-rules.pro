# BrainFerry ProGuard Rules

# Keep WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep the LauncherActivity
-keep class com.brainferry.app.LauncherActivity { *; }

# AndroidX Browser
-keep class androidx.browser.** { *; }
