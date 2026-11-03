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

/** OpenWebif-rajapinta ja sovelluksen asetukset. */
object Box {
    private val pool = Executors.newFixedThreadPool(4)
    private val main = Handler(Looper.getMainLooper())
    lateinit var prefs: SharedPreferences
        private set

    fun init(ctx: Context) {
        if (!::prefs.isInitialized) prefs = ctx.applicationContext.getSharedPreferences("e2tvplayer", Context.MODE_PRIVATE)
    }

    var host: String
        get() = prefs.getString("host", "") ?: ""
        set(v) { prefs.edit().putString("host", v.trim()).apply() }

    fun base(): String = "http://$host"
    fun hostname(): String = host.substringBefore(':')

    fun enc(s: String): String = URLEncoder.encode(s, "UTF-8").replace("+", "%20")

    fun url(path: String, params: Map<String, String?> = emptyMap()): String {
        val q = params.filterValues { it != null }.map { "${enc(it.key)}=${enc(it.value!!)}" }
        return base() + path + if (q.isEmpty()) "" else "?" + q.joinToString("&")
    }

    fun fileUrl(path: String) = url("/file", mapOf("file" to path))
    fun streamUrl(sref: String) = "http://${hostname()}:8001/$sref"

    /** GET + JSON taustasäikeessä, vastaus pääsäikeeseen. */
    fun get(path: String, params: Map<String, String?> = emptyMap(), timeoutMs: Int = 15000,
            ok: (JSONObject) -> Unit, fail: (String) -> Unit) {
        val u = url(path, params)
        pool.execute {
            try {
                val js = JSONObject(fetch(u, timeoutMs))
                main.post { ok(js) }
            } catch (e: HttpError) {
                main.post { fail(if (e.code == 401) "OpenWebif vaatii kirjautumisen – ota se pois boksin asetuksista" else "Yhteysvirhe ${e.code}") }
            } catch (e: Exception) {
                main.post { fail("Ei yhteyttä boksiin ($host)") }
            }
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

    /** Etsii lähiverkosta boksin, jossa E2TVPlayer-lisäosa on asennettu. */
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
    private val days = arrayOf("su", "ma", "ti", "ke", "to", "pe", "la")
    private fun p2(n: Int) = if (n < 10) "0$n" else "$n"

    fun date(ts: Long, withYear: Boolean = false): String {
        if (ts <= 0) return ""
        val c = Calendar.getInstance().apply { timeInMillis = ts * 1000 }
        var s = days[c.get(Calendar.DAY_OF_WEEK) - 1] + " " + c.get(Calendar.DAY_OF_MONTH) + "." + (c.get(Calendar.MONTH) + 1) + "."
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

    /** OpenWebifin "length" ("53:40" tai "1:53:40") sekunneiksi */
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
        bytes >= 1073741824L -> String.format("%.1f Gt", bytes / 1073741824.0).replace('.', ',')
        bytes >= 1048576L -> "${bytes / 1048576} Mt"
        else -> "${bytes / 1024} kt"
    }

    private val castLabels = mapOf(
        "actor" to "Näyttelijät", "actors" to "Näyttelijät", "director" to "Ohjaaja", "producer" to "Tuottaja",
        "writer" to "Käsikirjoitus", "scriptwriter" to "Käsikirjoitus", "presenter" to "Juontaja", "guest" to "Vieraat",
        "commentator" to "Selostaja", "narrator" to "Kertoja", "composer" to "Musiikki"
    )

    /** Siistii DVB-kuvauksen: tekstin perään liimautuneet "actor: X"-kentät omille riveilleen. */
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
        val extra = cast.entries.joinToString("\n") { it.key + ": " + it.value.joinToString(", ") }
        return if (main.isEmpty()) extra else if (extra.isEmpty()) main else "$main\n\n$extra"
    }

    private val langs = mapOf(
        "fin" to "suomi", "swe" to "ruotsi", "sve" to "ruotsi", "eng" to "englanti", "dut" to "hollanti", "nld" to "hollanti",
        "ger" to "saksa", "deu" to "saksa", "fre" to "ranska", "fra" to "ranska", "spa" to "espanja", "ita" to "italia",
        "rus" to "venäjä", "dan" to "tanska", "nor" to "norja", "est" to "viro", "sme" to "saame", "smi" to "saame",
        "qaa" to "alkuperäinen", "mis" to "muu", "und" to "tuntematon", "nar" to "kuvailutulkkaus", "qad" to "kuvailutulkkaus",
        "fi" to "suomi", "sv" to "ruotsi", "en" to "englanti", "de" to "saksa", "fr" to "ranska", "no" to "norja", "da" to "tanska"
    )

    fun lang(code: String?): String {
        if (code.isNullOrBlank()) return "tuntematon"
        return langs[code.lowercase()] ?: code
    }
}
