// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 E2TVPlayer contributors
package fi.e2tvplayer

import android.app.Activity
import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import org.json.JSONObject

/**
 * Screenshot to the box after 10 s. The countdown is app-wide, so it continues even if the user
 * returns from playback to the list: the picture is taken of the view open when the countdown ends.
 */
object Shots {
    private val ui = Handler(Looper.getMainLooper())
    private var toast: Toast? = null
    var current: Activity? = null
    var busy = false
        private set
    /** the dialog last opened in the list view: a separate window, so it is drawn on the picture by hand */
    var dialog: android.app.Dialog? = null

    fun resumed(a: Activity) { current = a }
    fun destroyed(a: Activity) { if (current === a) { current = null; dialog = null } }

    fun start() {
        if (busy) return
        busy = true
        var left = 10
        val tick = object : Runnable {
            override fun run() {
                if (left > 0) {
                    notify("📷 $left")
                    left--
                    ui.postDelayed(this, 1000)
                } else {
                    toast?.cancel()
                    ui.postDelayed({ capture() }, 250)
                }
            }
        }
        tick.run()
    }

    fun notify(msg: String) {
        val a = current ?: return
        if (a is PlayerActivity) {
            a.showToast(msg)
        } else {
            toast?.cancel()
            toast = Toast.makeText(a, msg, Toast.LENGTH_SHORT).also { it.show() }
        }
    }

    private fun capture() {
        val a = current
        if (a == null || a.isFinishing) { busy = false; return }
        if (a is PlayerActivity) {
            a.captureShot { bmp, params -> upload(bmp, params) }
        } else {
            // list view: no video, draw the window content
            val root = a.window.decorView
            if (root.width <= 0 || root.height <= 0) { busy = false; return }
            val bmp = Bitmap.createBitmap(root.width, root.height, Bitmap.Config.ARGB_8888)
            val c = Canvas(bmp)
            root.draw(c)
            dialog?.takeIf { it.isShowing && it.ownerActivity.let { o -> o == null || o === a } }?.window?.decorView?.let { d ->
                val at = IntArray(2)
                val base = IntArray(2)
                d.getLocationOnScreen(at)
                root.getLocationOnScreen(base)
                c.drawColor(0x99000000.toInt())
                c.translate((at[0] - base[0]).toFloat(), (at[1] - base[1]).toFloat())
                d.draw(c)
            }
            upload(bmp, linkedMapOf("platform" to "googletv", "novideo" to "1", "title" to "list"))
        }
    }

    private fun upload(bmp: Bitmap, params: Map<String, String?>) {
        val url = Box.url("/e2tvplayer/screenshot", params)
        Thread {
            val msg = try {
                val out = java.io.ByteArrayOutputStream()
                bmp.compress(Bitmap.CompressFormat.PNG, 100, out)
                val c = java.net.URL(url).openConnection() as java.net.HttpURLConnection
                c.requestMethod = "POST"
                c.doOutput = true
                c.connectTimeout = 5000
                c.readTimeout = 20000
                c.setRequestProperty("Content-Type", "image/png")
                c.outputStream.use { it.write(out.toByteArray()) }
                val code = c.responseCode
                val body = (if (code == 200) c.inputStream else c.errorStream)?.bufferedReader()?.use { it.readText() } ?: ""
                c.disconnect()
                if (code == 200) T("Picture saved on the box: ") + JSONObject(body).optString("name") else T("Saving the picture failed (") + code + ")"
            } catch (e: Exception) {
                T("Saving the picture failed: ") + e.message
            }
            android.util.Log.i("E2TVPlayer", "screenshot: $msg")
            ui.post { busy = false; notify(msg) }
        }.start()
    }
}
