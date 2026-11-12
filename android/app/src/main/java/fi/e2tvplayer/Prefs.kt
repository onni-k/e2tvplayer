// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 E2TVPlayer contributors
package fi.e2tvplayer

/**
 * Audio and subtitle preferences, the same as Prefs in the Samsung app (widget/js/util.js).
 * Mode "auto" picks the 1st choice, else the 2nd; "last" keeps the language chosen by hand last time.
 * Stored under "p_" keys: "audioMode" was already taken by the audio decoding mode.
 */
object Prefs {
    private val AUDIO = listOf("orig", "fi", "sv", "en", "de", "fr")
    private val SUBS = listOf("fi", "fi-hoh", "sv", "sv-hoh", "en", "en-hoh")
    private val ORIG = setOf("qaa", "mis", "mul", "org", "und")
    private val AD = setOf("nar", "qad")
    private val ISO3 = mapOf("fin" to "fi", "swe" to "sv", "sve" to "sv", "eng" to "en", "ger" to "de", "deu" to "de",
        "fre" to "fr", "fra" to "fr", "nor" to "no", "dan" to "da", "dut" to "nl", "nld" to "nl")
    private val NAMES = mapOf("fi" to N("Finnish"), "sv" to N("Swedish"), "en" to N("English"), "de" to N("German"), "fr" to N("French"))

    /** the keys in the order of the settings rows; the choices are hidden when the mode is "last" */
    fun rows(): List<String> {
        val r = ArrayList<String>()
        r.add("audioMode"); if (get("audioMode") == "auto") { r.add("audio1"); r.add("audio2") }
        r.add("subMode"); if (get("subMode") == "auto") { r.add("sub1"); r.add("sub2") }
        return r
    }

    fun label(k: String): String = when (k) {
        "audioMode" -> T("Audio")
        "subMode" -> T("Subtitles")
        "audio1", "sub1" -> "      " + T("  1st choice").trim()
        else -> "      " + T("  2nd choice").trim()
    }

    /** defaults follow the app language: Finnish -> audio original, then Finnish; subtitles Finnish */
    private fun def(k: String): String {
        val l = I18n.cur()
        return when (k) {
            "audioMode", "subMode" -> "auto"
            "audio1" -> "orig"
            "audio2" -> l
            "sub1" -> if (l == "en") "off" else l
            else -> "none"
        }
    }

    fun get(k: String): String = Box.prefs.getString("p_$k", "")?.takeIf { it.isNotEmpty() } ?: def(k)

    private fun choices(k: String): List<String> = when (k) {
        "audioMode", "subMode" -> listOf("auto", "last")
        "audio1" -> AUDIO
        "audio2" -> AUDIO + "none"
        "sub1" -> SUBS + "off"
        else -> SUBS + "none"
    }

    fun cycle(k: String, d: Int) {
        val c = choices(k)
        val i = c.indexOf(get(k)).coerceAtLeast(0)
        Box.prefs.edit().putString("p_$k", c[(i + (if (d < 0) -1 else 1) + c.size) % c.size]).apply()
    }

    fun name(code: String): String = when (code) {
        "auto" -> T("automatic")
        "last" -> T("as last time")
        "orig" -> T("original")
        "off" -> T("off")
        "none" -> T("no selection")
        else -> {
            val c = code.substringBefore('-')
            (NAMES[c]?.let { T(it) } ?: c) + (if (code.endsWith("-hoh")) T(" (hard of hearing)") else "")
        }
    }

    fun iso2(code: String?): String {
        val l = (code ?: "").lowercase()
        ISO3[l.take(3)]?.let { return it }
        return if (Regex("^[a-z]{2}([-_].*)?$").matches(l)) l.take(2) else l
    }

    class Track(val code: String?, val ad: Boolean = false, val hoh: Boolean = false)

    private fun matchAudio(p: String, t: Track): Boolean {
        val c = (t.code ?: "").lowercase().take(3)
        if (t.ad || c in AD) return false
        return if (p == "orig") c in ORIG else iso2(t.code) == p
    }

    /** index of the preferred audio track, -1 = leave the default */
    fun pickAudio(tracks: List<Track>): Int {
        for (p in listOf(get("audio1"), get("audio2"))) {
            if (p == "none") continue
            val j = tracks.indexOfFirst { matchAudio(p, it) }
            if (j >= 0) return j
        }
        return -1
    }

    /** index of the preferred subtitle track, -1 = subtitles off */
    fun pickSub(tracks: List<Track>): Int {
        for (p in listOf(get("sub1"), get("sub2"))) {
            if (p == "off") return -1
            if (p == "none") continue
            val want = p.substringBefore('-')
            val hoh = p.endsWith("-hoh")
            val j = tracks.indexOfFirst { iso2(it.code) == want && it.hoh == hoh }
            if (j >= 0) return j
        }
        return -1
    }
}
