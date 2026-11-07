// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 E2TVPlayer contributors
package fi.e2tvplayer

import java.util.Locale

/** Sovelluksen kieli: "auto" (laitteen kieli), "fi" tai "en". Lähdekielenä suomi. */
object I18n {
    fun pref(): String = try { Box.prefs.getString("lang", "auto") ?: "auto" } catch (e: Exception) { "auto" }

    fun sys(): String = if (Locale.getDefault().language.lowercase().startsWith("fi")) "fi" else "en"

    fun en(): Boolean = (pref().let { if (it == "auto") sys() else it }) == "en"

    fun label(v: String = pref()): String = when (v) {
        "fi" -> "suomi"
        "en" -> "English"
        else -> T("automaattinen") + " (" + (if (sys() == "en") "English" else "suomi") + ")"
    }

    fun cycle(d: Int) {
        val o = listOf("auto", "fi", "en")
        val i = (o.indexOf(pref()).coerceAtLeast(0) + (if (d < 0) -1 else 1) + o.size) % o.size
        Box.prefs.edit().putString("lang", o[i]).apply()
    }

    val EN: Map<String, String> = mapOf(
        "OpenWebif vaatii kirjautumisen – ota se pois boksin asetuksista" to "OpenWebif requires a login – turn it off in the box settings",
        "Yhteysvirhe " to "Connection error ",
        "Ei yhteyttä boksiin (" to "No connection to the box (",
        "Näyttelijät" to "Cast",
        "Ohjaaja" to "Director",
        "Tuottaja" to "Producer",
        "Käsikirjoitus" to "Writer",
        "Juontaja" to "Presenter",
        "Vieraat" to "Guests",
        "Selostaja" to "Commentator",
        "Kertoja" to "Narrator",
        "Musiikki" to "Music",
        "suomi" to "Finnish",
        "ruotsi" to "Swedish",
        "englanti" to "English",
        "hollanti" to "Dutch",
        "saksa" to "German",
        "ranska" to "French",
        "espanja" to "Spanish",
        "italia" to "Italian",
        "venäjä" to "Russian",
        "tanska" to "Danish",
        "norja" to "Norwegian",
        "viro" to "Estonian",
        "saame" to "Sami",
        "alkuperäinen" to "original",
        "muu" to "other",
        "tuntematon" to "unknown",
        "kuvailutulkkaus" to "audio description",
        "valmiustilassa" to "in standby",
        "<font color='#FF5A5A'><b>● TALLENTAA</b></font> &nbsp; " to "<font color='#FF5A5A'><b>● RECORDING</b></font> &nbsp; ",
        "Boksi " to "Box ",
        "<font color='#FF5A5A'>Ei yhteyttä boksiin</font> · " to "<font color='#FF5A5A'>No connection to the box</font> · ",
        "A–Ö" to "A–Z",
        "Uusin ensin" to "Newest first",
        "OK toista   ·   pitkä OK: valikko (poista, alusta)   ·   ▲ ylös välilehtiin   ·   BACK ylempi kansio" to "OK play   ·   long OK: menu (delete, from start)   ·   ▲ up to tabs   ·   BACK parent folder",
        "OK katso   ·   ▲ ylös välilehtiin   ·   BACK takaisin" to "OK watch   ·   ▲ up to tabs   ·   BACK back",
        "Tarkista boksin osoite: Asetukset" to "Check the box address: Settings",
        "Kesto " to "Duration ",
        "<br/><font color='#4FA3FF'>Katsottu " to "<br/><font color='#4FA3FF'>Watched up to ",
        " asti</font>" to "</font>",
        "Ylempi kansio" to "Parent folder",
        "Kansio" to "Folder",
        "Tallenteet" to "Recordings",
        "Kansiossa ei ole tallenteita" to "No recordings in this folder",
        "Jatka kohdasta " to "Resume from ",
        "Alusta" to "From the start",
        "Toista alusta" to "Play from the start",
        "Poista tallenne" to "Delete recording",
        "Järjestä: uusin ensin" to "Sort: newest first",
        "Järjestä: A–Ö" to "Sort: A–Z",
        "Poistetaanko tallenne?" to "Delete the recording?",
        "Peruuta" to "Cancel",
        "Poista" to "Delete",
        "Tallenne poistettu" to "Recording deleted",
        "Poisto epäonnistui: " to "Delete failed: ",
        "Ei kanavanippuja" to "No bouquets",
        "Kanavat › " to "Channels › ",
        "Kanavat" to "Channels",
        "Nipussa ei ole kanavia" to "No channels in this bouquet",
        "Enigma2-boksin IP-osoite (esim. 192.168.1.10). OpenWebifin pitää olla käytössä portissa 80." to "IP address of the Enigma2 box (e.g. 192.168.1.10). OpenWebif must be enabled on port 80.",
        "Asetukset – E2TVPlayer " to "Settings – E2TVPlayer ",
        "Asetukset" to "Settings",
        "Tallenna" to "Save",
        "Etsi boksi" to "Find box",
        "Etsitään boksia lähiverkosta…" to "Searching for the box on the network…",
        "Boksi löytyi: " to "Box found: ",
        "Valitse boksi" to "Choose a box",
        "Boksia ei löytynyt" to "Box not found",
        "Lähiverkosta ei löytynyt boksia, jossa on E2TVPlayer-lisäosa. Anna osoite käsin." to "No box with the E2TVPlayer plugin was found on the network. Enter the address manually.",
        "Anna osoite" to "Enter address",
        "Sulje" to "Close",
        "Lopetetaanko E2TVPlayer?" to "Quit E2TVPlayer?",
        "Kyllä" to "Yes",
        "Ei" to "No",
        "Tarkista, että boksin striimaus (portti 8001) on käytössä ja viritin vapaana." to "Check that streaming (port 8001) is enabled on the box and a tuner is free.",
        "Yhteys katkesi tai tallenteen muotoa ei tueta." to "The connection was lost or the recording's format is not supported.",
        "Toistovirhe" to "Playback error",
        "▲▼ kanava   ·   OK ohjelmatiedot   ·   pitkä OK: ääni ja tekstitys   ·   BACK lopeta" to "▲▼ channel   ·   OK programme info   ·   long OK: audio and subtitles   ·   BACK stop",
        "◀▶ 15 s   ·   ▲▼ 5 min   ·   OK tauko ja tiedot   ·   pitkä OK: ääni ja tekstitys   ·   BACK lopeta" to "◀▶ 15 s   ·   ▲▼ 5 min   ·   OK pause and info   ·   long OK: audio and subtitles   ·   BACK stop",
        "Puskuroidaan…" to "Buffering…",
        "❚❚ Tauko" to "❚❚ Paused",
        " · jäljellä " to " · remaining ",
        "Ei ohjelmatietoja" to "No programme information",
        "Seuraavaksi " to "Next ",
        " · kesto " to " · duration ",
        " (kuulovammaiset)" to " (hard of hearing)",
        " (kuvailutulkkaus)" to " (audio description)",
        " (ei tuettu)" to " (not supported)",
        "   ·   purkaja: " to "   ·   decoder: ",
        "Ei ääniraitoja" to "No audio tracks",
        "Ääni" to "Audio",
        "Tekstitys" to "Subtitles",
        "pois" to "off",
        "oletus" to "default",
        "ei tarjolla" to "not available",
        "Äänen purku" to "Audio decoding",
        "sovellus (PCM)" to "app (PCM)",
        "TV / Dolby-läpivienti" to "TV / Dolby passthrough",
        "Kuvakaappaus" to "Screenshot",
        "odota…" to "wait…",
        "OK: ota kuva 10 s päästä" to "OK: take a picture in 10 s",
        "Ääni puretaan sovelluksessa" to "Audio is decoded in the app",
        "Ääni TV:n / laitteen purettavaksi" to "Audio is decoded by the TV / device",
        "Kuva tallennettu boksiin: " to "Picture saved on the box: ",
        "Kuvan tallennus epäonnistui (" to "Saving the picture failed (",
        "Kuvan tallennus epäonnistui: " to "Saving the picture failed: ",
        "Ääni ja tekstitys" to "Audio and subtitles",
        "▲▼ rivi   ◀▶ vaihda   OK/BACK sulje" to "▲▼ row   ◀▶ change   OK/BACK close",
        "Kieli" to "Language",
        "automaattinen" to "automatic",
        "  (uusi kieli käyttöön listassa)" to "  (applies to the list on return)",
        "Sovelluksen kieli" to "App language"
    )
}

fun T(s: String): String = if (I18n.en()) I18n.EN[s] ?: s else s
