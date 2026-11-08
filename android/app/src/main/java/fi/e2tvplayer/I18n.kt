// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 E2TVPlayer contributors
package fi.e2tvplayer

import android.content.Context
import org.json.JSONObject
import java.util.Locale

/**
 * App language: "auto" (the device language) or a language code. The source language is English;
 * translations come from the .po files in the repository po folder (tools/i18n.py -> assets/i18n.json).
 */
object I18n {
    const val SOURCE = "en"
    private val names = linkedMapOf(SOURCE to "English")
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

    /** the device language; one without a translation falls back to English */
    fun sys(): String {
        val l = Locale.getDefault().language.lowercase().let { if (it == "swe") "sv" else it.take(2) }
        return if (names.containsKey(l)) l else SOURCE
    }

    fun cur(): String = pref().let { if (it == "auto") sys() else it }

    /** decimal comma (Finnish, Swedish) or point */
    fun decimalComma(): Boolean = cur() == "fi" || cur() == "sv"

    fun label(v: String = pref()): String =
        if (v == "auto") T("automatic") + " (" + name(sys()) + ")" else name(v)

    fun cycle(d: Int) {
        val o = listOf("auto") + langs()
        val i = (o.indexOf(pref()).coerceAtLeast(0) + (if (d < 0) -1 else 1) + o.size) % o.size
        Box.prefs.edit().putString("lang", o[i]).apply()
    }

    fun tr(s: String): String {
        val c = cur()
        return if (c == SOURCE) s else tables[c]?.get(s) ?: s
    }
}

fun T(s: String): String = I18n.tr(s)

/** Marks a text for translation without translating it yet. */
fun N(s: String): String = s
