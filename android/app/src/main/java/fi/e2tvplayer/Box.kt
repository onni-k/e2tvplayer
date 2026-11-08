// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 E2TVPlayer contributors
package fi.e2tvplayer

import android.content.Context
import android.content.SharedPreferences
import android.net.wifi.WifiManager
import android.os.Handler
import android.os.Looper
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.Inet4Address
import java.net.NetworkInterface
import java.net.URL
import java.net.URLEncoder
import java.util.Calendar
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/** The OpenWebif API and the app settings. */
object Box {
    private val pool = Executors.newFixedThreadPool(4)
    private val main = Handler(Looper.getMainLooper())
    lateinit var prefs: SharedPreferences
        private set

    fun init(ctx: Context) {
        if (!::prefs.isInitialized) prefs = ctx.applicationContext.getSharedPreferences("e2tvplayer", Context.MODE_PRIVATE)
        I18n.init(ctx.applicationContext)
    }

    var host: String
        get() = prefs.getString("host", "") ?: ""
        set(v) { prefs.edit().putString("host", v.trim()).apply() }

    fun base(): String = "http://$host"

    /** Start-up entry in the box log (http://box/e2tvplayer/logs). */
    fun hello(version: String) {
        if (host.isBlank()) return
        val loc = java.util.Locale.getDefault()
        val msg = "start platform=android app=$version model=${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}" +
            " | device=${android.os.Build.DEVICE} | android=${android.os.Build.VERSION.RELEASE} (sdk ${android.os.Build.VERSION.SDK_INT})" +
            " | lang=locale=${loc.toLanguageTag()} → ${I18n.sys()}, " + T("in use") + " " + I18n.name(I18n.cur()) +
            " | pref=${I18n.pref()}"
        pool.execute {
            try {
                val c = java.net.URL(base() + "/e2tvplayer/log?m=" + java.net.URLEncoder.encode(msg, "UTF-8")).openConnection() as java.net.HttpURLConnection
                c.connectTimeout = 5000
                c.readTimeout = 5000
                c.inputStream.use { it.readBytes() }
                c.disconnect()
            } catch (e: Exception) { }
        }
    }
    fun hostname(): String = host.substringBefore(':')

    fun enc(s: String): String = URLEncoder.encode(s, "UTF-8").replace("+", "%20")

    fun url(path: String, params: Map<String, String?> = emptyMap()): String {
        val q = params.filterValues { it != null }.map { "${enc(it.key)}=${enc(it.value!!)}" }
        return base() + path + if (q.isEmpty()) "" else "?" + q.joinToString("&")
    }

    fun fileUrl(path: String) = url("/file", mapOf("file" to path))
    fun streamUrl(sref: String) = "http://${hostname()}:8001/$sref"

    /** GET + JSON in a background thread, the answer on the main thread. */
    fun get(path: String, params: Map<String, String?> = emptyMap(), timeoutMs: Int = 15000,
            ok: (JSONObject) -> Unit, fail: (String) -> Unit) {
        val u = url(path, params)
        pool.execute {
            try {
                val js = JSONObject(unent(fetch(u, timeoutMs)))
                main.post { ok(js) }
            } catch (e: HttpError) {
                main.post { fail(if (e.code == 401) T("OpenWebif requires a login – turn it off in the box settings") else T("Connection error ") + e.code) }
            } catch (e: Exception) {
                main.post { fail(T("No connection to the box (") + host + ")") }
            }
        }
    }

    /** OpenWebif sends some EPG texts with HTML entities (Shorty&#x27;s): decode them before
     *  JSON parsing so that the result is still valid JSON. */
    fun unent(t: String): String = Regex("&(#[xX][0-9a-fA-F]+|#[0-9]+|amp|quot|lt|gt|apos);").replace(t) { m ->
        val e = m.groupValues[1]
        val c = when (e) {
            "amp" -> "&"
            "quot" -> "\""
            "lt" -> "<"
            "gt" -> ">"
            "apos" -> "'"
            else -> {
                val n = if (e[1] == 'x' || e[1] == 'X') e.substring(2).toIntOrNull(16) else e.substring(1).toIntOrNull()
                if (n == null || n < 32 || n > 0xFFFF) " " else n.toChar().toString()
            }
        }
        when (c) {
            "\"" -> "\\\""
            "\\" -> "\\\\"
            else -> c
        }
    }

    class HttpError(val code: Int) : Exception("HTTP $code")

    fun fetch(u: String, timeoutMs: Int): String {
        val c = URL(u).openConnection() as HttpURLConnection
        c.connectTimeout = minOf(timeoutMs, 5000)
        c.readTimeout = timeoutMs
        c.setRequestProperty("User-Agent", "E2TVPlayer")
        try {
            if (c.responseCode != 200) throw HttpError(c.responseCode)
            return c.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
        } finally {
            c.disconnect()
        }
    }

    /** Searches the local network for a box with the E2TVPlayer plugin installed. */
    fun discover(ctx: Context, done: (List<String>) -> Unit) {
        val prefix = localPrefix(ctx)
        if (prefix == null) { done(emptyList()); return }
        val found = java.util.Collections.synchronizedList(ArrayList<String>())
        val scan = Executors.newFixedThreadPool(48)
        val left = java.util.concurrent.atomic.AtomicInteger(254)
        val finished = AtomicBoolean(false)
        for (i in 1..254) {
            val ip = "$prefix.$i"
            scan.execute {
                try {
                    val js = JSONObject(fetch("http://$ip/e2tvplayer/info", 700))
                    if (js.optString("app") == "E2TVPlayer") found.add(ip)
                } catch (_: Exception) {
                }
                if (left.decrementAndGet() == 0 && finished.compareAndSet(false, true)) {
                    scan.shutdown()
                    val list = found.sortedBy { it.substringAfterLast('.').toIntOrNull() ?: 0 }
                    main.post { done(list) }
                }
            }
        }
    }

    private fun localPrefix(ctx: Context): String? {
        try {
            for (ni in NetworkInterface.getNetworkInterfaces()) {
                if (!ni.isUp || ni.isLoopback) continue
                for (a in ni.inetAddresses) {
                    if (a is Inet4Address && !a.isLoopbackAddress && a.isSiteLocalAddress) {
                        return a.hostAddress?.substringBeforeLast('.')
                    }
                }
            }
        } catch (_: Exception) {
        }
        try {
            @Suppress("DEPRECATION")
            val ip = (ctx.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager).connectionInfo.ipAddress
            if (ip != 0) return "${ip and 255}.${(ip shr 8) and 255}.${(ip shr 16) and 255}"
        } catch (_: Exception) {
        }
        return null
    }

    // --- toistokohdat ---
    fun getPos(key: String): Long = prefs.getLong("pos:$key", 0L)
    fun setPos(key: String, ms: Long) {
        val e = prefs.edit()
        if (ms > 0) e.putLong("pos:$key", ms) else e.remove("pos:$key")
        e.apply()
    }
}

object Fmt {
    private fun p2(n: Int) = if (n < 10) "0$n" else "$n"

    fun date(ts: Long, withYear: Boolean = false): String {
        if (ts <= 0) return ""
        val c = Calendar.getInstance().apply { timeInMillis = ts * 1000 }
        var s = T("Sun Mon Tue Wed Thu Fri Sat").split(" ")[c.get(Calendar.DAY_OF_WEEK) - 1] + " " + c.get(Calendar.DAY_OF_MONTH) + "." + (c.get(Calendar.MONTH) + 1) + "."
        if (withYear) s += c.get(Calendar.YEAR)
        return s + " " + p2(c.get(Calendar.HOUR_OF_DAY)) + ":" + p2(c.get(Calendar.MINUTE))
    }

    fun hm(ts: Long): String {
        val c = Calendar.getInstance().apply { timeInMillis = ts * 1000 }
        return p2(c.get(Calendar.HOUR_OF_DAY)) + ":" + p2(c.get(Calendar.MINUTE))
    }

    fun time(sec: Long): String {
        val s = maxOf(0L, sec)
        val h = s / 3600
        val m = (s % 3600) / 60
        val r = s % 60
        return if (h > 0) "$h:${p2(m.toInt())}:${p2(r.toInt())}" else "$m:${p2(r.toInt())}"
    }

    /** the OpenWebif "length" ("53:40" or "1:53:40") in seconds */
    fun parseLength(str: String?): Long {
        if (str.isNullOrBlank()) return 0
        var sec = 0L
        for (part in str.split(':')) {
            val n = part.trim().toLongOrNull() ?: return 0
            sec = sec * 60 + n
        }
        return sec
    }

    fun size(bytes: Long): String = when {
        bytes >= 1073741824L -> String.format(java.util.Locale.US, "%.1f ", bytes / 1073741824.0).let { if (I18n.decimalComma()) it.replace('.', ',') else it } + T("GB")
        bytes >= 1048576L -> "${bytes / 1048576} " + T("MB")
        else -> "${bytes / 1024} " + T("kB")
    }

    private val castLabels = mapOf(
        "actor" to N("Cast"), "actors" to N("Cast"), "director" to N("Director"), "producer" to N("Producer"),
        "writer" to N("Writer"), "scriptwriter" to N("Writer"), "presenter" to N("Presenter"), "guest" to N("Guests"),
        "commentator" to N("Commentator"), "narrator" to N("Narrator"), "composer" to N("Music")
    )

    /** Tidies a DVB description: "actor: X" fields glued to the end of the text go on their own lines. */
    fun desc(text: String?): String {
        val s = (text ?: "").replace('\u008a', '\n').replace("\r", "")
        val re = Regex("(actors?|director|producer|scriptwriter|writer|presenter|guest|commentator|narrator|composer):\\s*", RegexOption.IGNORE_CASE)
        val ms = re.findAll(s).toList()
        if (ms.isEmpty()) return s.trim()
        val main = s.substring(0, ms[0].range.first).trim()
        val cast = LinkedHashMap<String, MutableList<String>>()
        for ((i, m) in ms.withIndex()) {
            val end = if (i + 1 < ms.size) ms[i + 1].range.first else s.length
            val v = s.substring(m.range.last + 1, end).trim().trim(',', ';', '.', ' ')
            if (v.isEmpty()) continue
            val label = castLabels[m.groupValues[1].lowercase()] ?: continue
            val l = cast.getOrPut(label) { ArrayList() }
            if (!l.contains(v)) l.add(v)
        }
        val extra = cast.entries.joinToString("\n") { T(it.key) + ": " + it.value.joinToString(", ") }
        return if (main.isEmpty()) extra else if (extra.isEmpty()) main else "$main\n\n$extra"
    }

    private val langs = mapOf(
        "fin" to N("Finnish"), "swe" to N("Swedish"), "sve" to N("Swedish"), "eng" to N("English"), "dut" to N("Dutch"), "nld" to N("Dutch"),
        "ger" to N("German"), "deu" to N("German"), "fre" to N("French"), "fra" to N("French"), "spa" to N("Spanish"), "ita" to N("Italian"),
        "rus" to N("Russian"), "dan" to N("Danish"), "nor" to N("Norwegian"), "est" to N("Estonian"), "sme" to N("Sami"), "smi" to N("Sami"),
        "qaa" to N("original"), "mis" to N("other"), "und" to N("unknown"), "nar" to N("audio description"), "qad" to N("audio description"),
        "fi" to N("Finnish"), "sv" to N("Swedish"), "en" to N("English"), "de" to N("German"), "fr" to N("French"), "no" to N("Norwegian"), "da" to N("Danish")
    )

    fun lang(code: String?): String {
        if (code.isNullOrBlank()) return T("unknown")
        return langs[code.lowercase()]?.let { T(it) } ?: code
    }
}
