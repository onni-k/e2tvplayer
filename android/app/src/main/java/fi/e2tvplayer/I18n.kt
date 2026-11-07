// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 E2TVPlayer contributors
package fi.e2tvplayer

import android.content.Context
import org.json.JSONObject
import java.util.Locale

/**
 * Sovelluksen kieli: "auto" (laitteen kieli) tai kielikoodi. Lähdekieli on suomi;
 * käännökset tulevat repon po/*.po-tiedostoista (tools/i18n.py -> assets/i18n.json).
 */
object I18n {
    private val names = linkedMapOf("fi" to "suomi")
    private val tables = HashMap<String, Map<String, String>>()

    fun init(ctx: Context) {
        if (tables.isNotEmpty()) return
        try {
            val js = JSONObject(ctx.assets.open("i18n.json").bufferedReader(Charsets.UTF_8).use { it.readText() })
            for (code in js.keys()) {
                val o = js.getJSONObject(code)
                names[code] = o.optString("name", code)
                val t = o.getJSONObject("t")
                val m = HashMap<String, String>()
                for (k in t.keys()) m[k] = t.getString(k)
                tables[code] = m
            }
        } catch (e: Exception) { }
    }

    fun langs(): List<String> = names.keys.toList()

    fun name(c: String): String = names[c] ?: c

    fun pref(): String {
        val v = try { Box.prefs.getString("lang", "auto") ?: "auto" } catch (e: Exception) { "auto" }
        return if (v != "auto" && names.containsKey(v)) v else "auto"
    }

    fun sys(): String {
        val l = Locale.getDefault().language.lowercase().let { if (it == "sv" || it == "swe") "sv" else it.take(2) }
        return when {
            names.containsKey(l) -> l
            names.containsKey("en") -> "en"
            else -> "fi"
        }
    }

    fun cur(): String = pref().let { if (it == "auto") sys() else it }

    /** muu kuin suomi: desimaalipiste */
    fun en(): Boolean = cur() != "fi"

    fun label(v: String = pref()): String =
        if (v == "auto") T("automaattinen") + " (" + name(sys()) + ")" else name(v)

    fun cycle(d: Int) {
        val o = listOf("auto") + langs()
        val i = (o.indexOf(pref()).coerceAtLeast(0) + (if (d < 0) -1 else 1) + o.size) % o.size
        Box.prefs.edit().putString("lang", o[i]).apply()
    }

    fun tr(s: String): String {
        val c = cur()
        return if (c == "fi") s else tables[c]?.get(s) ?: s
    }
}

fun T(s: String): String = I18n.tr(s)

/** Merkitsee tekstin käännettäväksi kääntämättä sitä vielä. */
fun N(s: String): String = s
