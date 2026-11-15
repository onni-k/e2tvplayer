// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 E2TVPlayer contributors
package fi.e2tvplayer

import android.app.Activity
import android.app.AlertDialog
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageInstaller
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.widget.Toast
import java.net.HttpURLConnection
import java.net.URL

/**
 * Update from the box: the box plugin carries the APK (/e2tvplayer/E2TVPlayer.apk) and tells its
 * version in /e2tvplayer/info. The APK is signed with the same key, so it installs over this one.
 */
object Update {
    const val ACTION = "fi.e2tvplayer.INSTALL_STATUS"

    /** version of the APK on the box when it is newer than this app, else "" */
    var available = ""
        private set

    private val ui = Handler(Looper.getMainLooper())

    fun newer(a: String, b: String): Boolean {
        val re = Regex("^\\d+(\\.\\d+)*$")
        if (!re.matches(a) || !re.matches(b)) return false
        val x = a.split('.').map { it.toInt() }
        val y = b.split('.').map { it.toInt() }
        for (i in 0 until maxOf(x.size, y.size)) {
            val p = x.getOrElse(i) { 0 }
            val q = y.getOrElse(i) { 0 }
            if (p != q) return p > q
        }
        return false
    }

    /** asks the box; offers the update unless "Later" was chosen for this version */
    fun check(a: Activity) {
        if (Box.host.isEmpty()) return
        Box.get("/e2tvplayer/info", timeoutMs = 8000, ok = { r ->
            val v = r.optString("apkVersion").ifEmpty { r.optString("version") }
            available = if (r.optBoolean("apk", false) && newer(v, BuildConfigCompat.version(a))) v else ""
            if (available.isNotEmpty() && Box.prefs.getString("updateLater", "") != available && !a.isFinishing) offer(a)
        }, fail = { })
    }

    fun offer(a: Activity) {
        val v = available
        AlertDialog.Builder(a)
            .setTitle(T("Update available"))
            .setMessage(T("Version {v} of E2TVPlayer is on the box (installed: {i}).")
                .replace("{v}", v).replace("{i}", BuildConfigCompat.version(a)))
            .setPositiveButton(T("Update")) { _, _ -> install(a) }
            .setNegativeButton(T("Later")) { _, _ -> Box.prefs.edit().putString("updateLater", v).apply() }
            .show().also { Shots.dialog = it }
    }

    private fun toast(a: Activity, msg: String) = ui.post { Toast.makeText(a, msg, Toast.LENGTH_LONG).show() }

    fun install(a: Activity) {
        if (Build.VERSION.SDK_INT >= 26 && !a.packageManager.canRequestPackageInstalls()) {
            AlertDialog.Builder(a)
                .setTitle(T("Update"))
                .setMessage(T("Allow E2TVPlayer to install apps (Settings → Apps → Security & restrictions → Unknown sources), then choose Update again."))
                .setPositiveButton(T("Open settings")) { _, _ ->
                    try {
                        a.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + a.packageName)))
                    } catch (e: Exception) {
                        try { a.startActivity(Intent(Settings.ACTION_SECURITY_SETTINGS)) } catch (e2: Exception) { }
                    }
                }
                .setNegativeButton(T("Cancel"), null)
                .show().also { Shots.dialog = it }
            return
        }
        toast(a, T("Downloading the update…"))
        Thread {
            try {
                val c = URL(Box.url("/e2tvplayer/E2TVPlayer.apk")).openConnection() as HttpURLConnection
                c.connectTimeout = 10000
                c.readTimeout = 30000
                if (c.responseCode != 200) throw Exception("HTTP " + c.responseCode)
                val pi = a.packageManager.packageInstaller
                val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
                val id = pi.createSession(params)
                pi.openSession(id).use { s ->
                    s.openWrite("E2TVPlayer.apk", 0, c.contentLength.toLong().takeIf { it > 0 } ?: -1L).use { out ->
                        c.inputStream.use { it.copyTo(out, 65536) }
                        s.fsync(out)
                    }
                    val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
                    val back = Intent(a, MainActivity::class.java).setAction(ACTION)
                    s.commit(PendingIntent.getActivity(a, 0, back, flags).intentSender)
                }
            } catch (e: Exception) {
                toast(a, T("Update failed: ") + (e.message ?: e.toString()))
            }
        }.start()
    }

    /** the installer reports back to MainActivity: confirmation needed, done or failed */
    fun onStatus(a: Activity, i: Intent): Boolean {
        if (i.action != ACTION) return false
        when (i.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                @Suppress("DEPRECATION")
                val confirm = i.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)
                if (confirm != null) try { a.startActivity(confirm) } catch (e: Exception) { toast(a, T("Update failed: ") + e) }
            }
            PackageInstaller.STATUS_SUCCESS -> { }
            else -> toast(a, T("Update failed: ") + (i.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: "?"))
        }
        return true
    }
}
