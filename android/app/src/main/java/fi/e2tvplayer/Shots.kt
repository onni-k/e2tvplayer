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
 * Kuvakaappaus 10 s viiveellä boksiin. Laskuri on sovelluksen yhteinen, joten se jatkuu, vaikka
 * käyttäjä palaisi toistosta listaan: kuva otetaan siitä näkymästä, joka on laskurin lopussa auki.
 */
object Shots {
    private val ui = Handler(Looper.getMainLooper())
    private var toast: Toast? = null
    var current: Activity? = null
    var busy = false
        private set

    fun resumed(a: Activity) { current = a }
    fun destroyed(a: Activity) { if (current === a) current = null }

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
            // listanäkymä: ei videota, piirretään ikkunan sisältö
            val root = a.window.decorView
            if (root.width <= 0 || root.height <= 0) { busy = false; return }
            val bmp = Bitmap.createBitmap(root.width, root.height, Bitmap.Config.ARGB_8888)
            root.draw(Canvas(bmp))
            upload(bmp, linkedMapOf("platform" to "googletv", "novideo" to "1", "title" to "lista"))
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
                if (code == 200) T("Kuva tallennettu boksiin: ") + JSONObject(body).optString("name") else T("Kuvan tallennus epäonnistui (") + code + ")"
            } catch (e: Exception) {
                T("Kuvan tallennus epäonnistui: ") + e.message
            }
            android.util.Log.i("E2TVPlayer", "screenshot: $msg")
            ui.post { busy = false; notify(msg) }
        }.start()
    }
}
