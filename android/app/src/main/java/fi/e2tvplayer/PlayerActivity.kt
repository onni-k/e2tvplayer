// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 E2TVPlayer contributors
package fi.e2tvplayer

import android.app.Activity
import android.app.AlertDialog
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.annotation.OptIn
import androidx.media3.common.C
import androidx.media3.common.Format
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.analytics.AnalyticsListener
import androidx.media3.exoplayer.audio.AudioCapabilities
import androidx.media3.exoplayer.audio.AudioSink
import androidx.media3.exoplayer.audio.DefaultAudioSink
import android.content.Context
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.extractor.DefaultExtractorsFactory
import androidx.media3.extractor.ts.DefaultTsPayloadReaderFactory
import androidx.media3.extractor.ts.TsExtractor
import androidx.media3.ui.PlayerView
import org.json.JSONObject

@OptIn(UnstableApi::class)
class PlayerActivity : Activity() {

    private lateinit var player: ExoPlayer
    private lateinit var video: PlayerView
    private lateinit var buffering: ProgressBar
    private lateinit var osd: View
    private lateinit var oTitle: TextView
    private lateinit var oSub: TextView
    private lateinit var oTime: TextView
    private lateinit var oState: TextView
    private lateinit var oKeys: TextView
    private lateinit var oBar: ProgressBar
    private lateinit var info: View
    private lateinit var iTitle: TextView
    private lateinit var iMeta: TextView
    private lateinit var iDesc: TextView
    private lateinit var iNext: TextView
    private lateinit var tracks: View
    private lateinit var trRows: LinearLayout
    private lateinit var toastView: TextView
    private val ui = Handler(Looper.getMainLooper())

    private var live = false
    private var key = ""
    private var title = ""
    private var sub = ""
    private var desc = ""
    private var lengthSec = 0L
    private var refs: Array<String> = emptyArray()
    private var names: Array<String> = emptyArray()
    private var index = 0
    private var epgNow: JSONObject? = null
    private var epgNext: JSONObject? = null
    private var trackRow = 0
    private var ended = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Box.init(this)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setContentView(R.layout.activity_player)
        video = findViewById(R.id.video)
        buffering = findViewById(R.id.buffering)
        osd = findViewById(R.id.osd)
        oTitle = findViewById(R.id.oTitle)
        oSub = findViewById(R.id.oSub)
        oTime = findViewById(R.id.oTime)
        oState = findViewById(R.id.oState)
        oKeys = findViewById(R.id.oKeys)
        oBar = findViewById(R.id.oBar)
        info = findViewById(R.id.info)
        iTitle = findViewById(R.id.iTitle)
        iMeta = findViewById(R.id.iMeta)
        iDesc = findViewById(R.id.iDesc)
        iNext = findViewById(R.id.iNext)
        tracks = findViewById(R.id.tracks)
        trRows = findViewById(R.id.trRows)
        findViewById<TextView>(R.id.trHead).text = T("Audio and subtitles")
        findViewById<TextView>(R.id.trKeys).text = T("▲▼ row   ◀▶ change   OK/BACK close")
        toastView = findViewById(R.id.toast)

        val i = intent
        live = i.getBooleanExtra("live", false)
        if (live) {
            refs = i.getStringArrayExtra("refs") ?: emptyArray()
            names = i.getStringArrayExtra("names") ?: emptyArray()
            index = i.getIntExtra("index", 0).coerceIn(0, maxOf(0, refs.size - 1))
        } else {
            key = i.getStringExtra("key") ?: ""
            title = i.getStringExtra("title") ?: ""
            sub = i.getStringExtra("sub") ?: ""
            desc = i.getStringExtra("desc") ?: ""
            lengthSec = i.getLongExtra("length", 0L)
        }

        buildPlayer()
        if (live) {
            playChannel(index)
        } else {
            currentUrl = i.getStringExtra("url") ?: ""
            player.setMediaItem(MediaItem.fromUri(currentUrl), i.getLongExtra("start", 0L))
            player.prepare()
            player.playWhenReady = true
            showOsd()
        }
    }

    private var currentUrl = ""
    private var audioDecoder = ""

    /** "pcm": the app decodes audio (FFmpeg) and outputs PCM; "tv": Dolby passthrough to the TV / the device decoders */
    private fun audioMode(): String = Box.prefs.getString("audioMode", "pcm") ?: "pcm"

    private fun buildPlayer() {
        val http = DefaultHttpDataSource.Factory()
            .setUserAgent("E2TVPlayer")
            .setConnectTimeoutMs(8000)
            .setReadTimeoutMs(20000)
            .setAllowCrossProtocolRedirects(true)
        val extractors = DefaultExtractorsFactory()
            .setTsExtractorFlags(DefaultTsPayloadReaderFactory.FLAG_ALLOW_NON_IDR_KEYFRAMES)
            .setTsExtractorTimestampSearchBytes(1500 * TsExtractor.TS_PACKET_SIZE)
        val sources = DefaultMediaSourceFactory(DefaultDataSource.Factory(this, http), extractors)
        val pcm = audioMode() == "pcm"
        val renderers = object : DefaultRenderersFactory(this) {
            override fun buildAudioSink(context: Context, enableFloatOutput: Boolean, enableAudioTrackPlaybackParams: Boolean): AudioSink {
                val b = DefaultAudioSink.Builder(context)
                    .setEnableFloatOutput(enableFloatOutput)
                    .setEnableAudioTrackPlaybackParams(enableAudioTrackPlaybackParams)
                // in PCM mode never passthrough: all audio is decoded to PCM
                if (pcm) {
                    @Suppress("DEPRECATION")
                    b.setAudioCapabilities(AudioCapabilities.DEFAULT_AUDIO_CAPABILITIES)
                }
                return b.build()
            }

            // video always with the device's own (hardware) decoder, FFmpeg only for audio
            override fun buildVideoRenderers(context: Context, extensionRendererMode: Int,
                                             mediaCodecSelector: androidx.media3.exoplayer.mediacodec.MediaCodecSelector,
                                             enableDecoderFallback: Boolean, eventHandler: android.os.Handler,
                                             eventListener: androidx.media3.exoplayer.video.VideoRendererEventListener,
                                             allowedVideoJoiningTimeMs: Long, out: java.util.ArrayList<androidx.media3.exoplayer.Renderer>) {
                super.buildVideoRenderers(context, DefaultRenderersFactory.EXTENSION_RENDERER_MODE_OFF, mediaCodecSelector,
                    enableDecoderFallback, eventHandler, eventListener, allowedVideoJoiningTimeMs, out)
            }
        }
            .setEnableDecoderFallback(true)
            .setExtensionRendererMode(
                if (pcm) DefaultRenderersFactory.EXTENSION_RENDERER_MODE_PREFER
                else DefaultRenderersFactory.EXTENSION_RENDERER_MODE_ON
            )
        player = ExoPlayer.Builder(this, renderers).setMediaSourceFactory(sources).build()
        video.player = player
        player.addListener(listener)
        player.addAnalyticsListener(object : AnalyticsListener {
            override fun onAudioInputFormatChanged(eventTime: AnalyticsListener.EventTime, format: Format,
                                                   decoderReuseEvaluation: androidx.media3.exoplayer.DecoderReuseEvaluation?) {
                android.util.Log.i("E2TVPlayer", "audio format: ${format.sampleMimeType} ${format.language} ${format.channelCount}ch")
            }

            override fun onAudioSinkError(eventTime: AnalyticsListener.EventTime, audioSinkError: Exception) {
                android.util.Log.e("E2TVPlayer", "audio sink error", audioSinkError)
            }

            override fun onAudioDecoderInitialized(eventTime: AnalyticsListener.EventTime, decoderName: String,
                                                   initializedTimestampMs: Long, initializationDurationMs: Long) {
                audioDecoder = decoderName
                android.util.Log.i("E2TVPlayer", "audio decoder: $decoderName (mode ${audioMode()})")
                if (tracks.visibility == View.VISIBLE) renderTracks()
            }
        })
        applyPreferences()
    }

    /** change of the audio decoding mode: a new player from the same position */
    private fun rebuildPlayer() {
        val pos = player.currentPosition
        val playing = player.playWhenReady
        player.removeListener(listener)
        player.release()
        audioDecoder = ""
        buildPlayer()
        if (live) {
            playChannel(index)
        } else {
            player.setMediaItem(MediaItem.fromUri(currentUrl), pos)
            player.prepare()
            player.playWhenReady = playing
        }
    }

    // ---------------------------------------------------------------- playback

    private fun applyPreferences() {
        val subLang = Box.prefs.getString("subLang", "") ?: ""
        val audioLang = Box.prefs.getString("audioLang", "fin") ?: "fin"
        player.trackSelectionParameters = player.trackSelectionParameters.buildUpon()
            .clearOverrides()
            .setPreferredAudioLanguage(audioLang)
            .setPreferredTextLanguage(if (subLang.isEmpty()) null else subLang)
            .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, subLang.isEmpty())
            .build()
    }

    private fun playChannel(i: Int) {
        if (refs.isEmpty()) { finish(); return }
        index = (i + refs.size) % refs.size
        title = names.getOrElse(index) { "" }
        sub = ""
        desc = ""
        epgNow = null
        epgNext = null
        applyPreferences()
        player.setMediaItem(MediaItem.fromUri(Box.streamUrl(refs[index])))
        player.prepare()
        player.playWhenReady = true
        showOsd()
        loadEpg(refs[index])
    }

    private fun loadEpg(ref: String) {
        Box.get("/api/epgservicenow", mapOf("sRef" to ref), timeoutMs = 10000, ok = { js ->
            if (!live || refs.getOrNull(index) != ref) return@get
            epgNow = js.optJSONArray("events")?.optJSONObject(0)
            sub = epgNow?.optString("title") ?: ""
            updateOsd()
            if (info.visibility == View.VISIBLE) renderInfo()
        }, fail = { })
        Box.get("/api/epgservicenext", mapOf("sRef" to ref), timeoutMs = 10000, ok = { js ->
            if (!live || refs.getOrNull(index) != ref) return@get
            epgNext = js.optJSONArray("events")?.optJSONObject(0)
            if (info.visibility == View.VISIBLE) renderInfo()
        }, fail = { })
    }

    private val listener = object : Player.Listener {
        override fun onPlaybackStateChanged(state: Int) {
            buffering.visibility = if (state == Player.STATE_BUFFERING) View.VISIBLE else View.GONE
            if (state == Player.STATE_ENDED && !live && !ended) {
                ended = true
                Box.setPos(key, 0)
                finish()
            }
            updateOsd()
        }

        override fun onIsPlayingChanged(isPlaying: Boolean) = updateOsd()

        override fun onTracksChanged(t: Tracks) {
            if (tracks.visibility == View.VISIBLE) renderTracks()
        }

        override fun onPlayerError(error: PlaybackException) {
            buffering.visibility = View.GONE
            val hint = if (live) T("Check that streaming (port 8001) is enabled on the box and a tuner is free.")
            else T("The connection was lost or the recording's format is not supported.")
            AlertDialog.Builder(this@PlayerActivity, R.style.E2Dialog)
                .setTitle(T("Playback error"))
                .setMessage("${error.errorCodeName}\n\n$hint")
                .setPositiveButton("OK") { _, _ -> finish() }
                .setOnCancelListener { finish() }
                .show()
        }
    }

    private fun durationMs(): Long {
        val d = player.duration
        return if (d != C.TIME_UNSET && d > 0) d else lengthSec * 1000
    }

    private fun seekBy(ms: Long) {
        if (live) return
        val dur = durationMs()
        var target = player.currentPosition + ms
        if (dur > 0) target = minOf(target, dur - 5000)
        target = maxOf(0L, target)
        player.seekTo(target)
        oState.text = if (ms > 0) "▶▶ +" + Fmt.time(ms / 1000) else "◀◀ −" + Fmt.time(-ms / 1000)
        showOsd()
        stateUntil = System.currentTimeMillis() + 1500
        ui.removeCallbacks(clearState)
        ui.postDelayed(clearState, 1600)
    }

    private var stateUntil = 0L
    private val clearState = Runnable { updateOsd() }

    private fun togglePause() {
        if (live) return
        player.playWhenReady = !player.playWhenReady
        if (!player.playWhenReady) {
            savePos()
            renderInfo()
            info.visibility = View.VISIBLE
            showOsd(sticky = true)
        } else {
            info.visibility = View.GONE
            showOsd()
        }
    }

    private fun savePos() {
        if (live || key.isEmpty() || ended) return
        val pos = player.currentPosition
        val dur = durationMs()
        Box.setPos(key, if (pos < 30000 || (dur > 0 && pos > dur - 90000)) 0 else pos)
    }

    // ---------------------------------------------------------------- OSD and info

    private val hideOsd = Runnable {
        if (player.playWhenReady && info.visibility != View.VISIBLE) osd.visibility = View.GONE
    }

    private val osdTicker = object : Runnable {
        override fun run() {
            if (osd.visibility == View.VISIBLE) { updateOsd(); ui.postDelayed(this, 500) }
        }
    }

    private fun showOsd(sticky: Boolean = false) {
        updateOsd()
        osd.visibility = View.VISIBLE
        ui.removeCallbacks(osdTicker)
        ui.post(osdTicker)
        ui.removeCallbacks(hideOsd)
        if (!sticky) ui.postDelayed(hideOsd, 5000)
    }

    private fun updateOsd() {
        if (live) {
            oTitle.text = "${index + 1}  $title"
            oSub.text = sub
            val ev = epgNow
            val b = ev?.optLong("begin_timestamp") ?: 0
            val d = ev?.optLong("duration_sec") ?: 0
            if (b > 0 && d > 0) {
                val now = System.currentTimeMillis() / 1000
                oTime.text = "LIVE " + Fmt.hm(b) + "–" + Fmt.hm(b + d)
                oBar.progress = (1000 * (now - b) / d).toInt().coerceIn(0, 1000)
            } else {
                oTime.text = "LIVE"
                oBar.progress = 1000
            }
            oKeys.text = T("▲▼ channel   ·   OK programme info   ·   long OK: audio and subtitles   ·   BACK stop")
        } else {
            oTitle.text = title
            oSub.text = sub
            val pos = player.currentPosition
            val dur = durationMs()
            oTime.text = Fmt.time(pos / 1000) + if (dur > 0) " / " + Fmt.time(dur / 1000) else ""
            oBar.progress = if (dur > 0) (1000 * pos / dur).toInt().coerceIn(0, 1000) else 0
            oKeys.text = T("◀▶ 15 s   ·   ▲▼ 5 min   ·   OK pause and info   ·   long OK: audio and subtitles   ·   BACK stop")
        }
        if (System.currentTimeMillis() >= stateUntil) {
            oState.text = when {
                player.playbackState == Player.STATE_BUFFERING -> T("Buffering…")
                !live && !player.playWhenReady -> T("❚❚ Paused")
                else -> ""
            }
        }
    }

    private fun renderInfo() {
        if (live) {
            val ev = epgNow
            iTitle.text = ev?.optString("title")?.ifEmpty { null } ?: title
            var meta = "${index + 1}  $title"
            val b = ev?.optLong("begin_timestamp") ?: 0
            val d = ev?.optLong("duration_sec") ?: 0
            if (b > 0 && d > 0) {
                val left = maxOf(0L, (b + d - System.currentTimeMillis() / 1000) / 60)
                meta += " · " + Fmt.hm(b) + "–" + Fmt.hm(b + d) + T(" · remaining ") + left + " min"
            }
            iMeta.text = meta
            val sd = ev?.optString("shortdesc") ?: ""
            val ld = ev?.optString("longdesc") ?: ""
            iDesc.text = Fmt.desc(if (sd.isNotEmpty() && ld.isNotEmpty() && !ld.contains(sd)) "$sd\n$ld" else ld.ifEmpty { sd })
                .ifEmpty { T("No programme information") }
            val nx = epgNext
            iNext.text = if (nx != null && nx.optString("title").isNotEmpty())
                T("Next ") + Fmt.hm(nx.optLong("begin_timestamp")) + " " + nx.optString("title") else ""
        } else {
            iTitle.text = title
            val dur = durationMs()
            iMeta.text = sub + if (dur > 0) T(" · duration ") + Fmt.time(dur / 1000) else ""
            iDesc.text = desc.ifEmpty { T("No programme information") }
            iNext.text = ""
        }
    }

    private fun toggleInfo() {
        if (info.visibility == View.VISIBLE) {
            info.visibility = View.GONE
            showOsd()
        } else {
            renderInfo()
            info.visibility = View.VISIBLE
            showOsd(sticky = true)
        }
    }

    private fun toast(msg: String) {
        toastView.text = msg
        toastView.visibility = View.VISIBLE
        ui.removeCallbacks(hideToast)
        ui.postDelayed(hideToast, 2500)
    }

    private val hideToast = Runnable { toastView.visibility = View.GONE }

    // ---------------------------------------------------------------- audio and subtitles

    private class Opt(val label: String, val group: Tracks.Group?, val track: Int, val lang: String)

    private fun codec(f: Format): String = when (f.sampleMimeType) {
        MimeTypes.AUDIO_AC3 -> "Dolby Digital"
        MimeTypes.AUDIO_E_AC3, MimeTypes.AUDIO_E_AC3_JOC -> "Dolby Digital+"
        MimeTypes.AUDIO_AAC -> "AAC"
        MimeTypes.AUDIO_MPEG_L2, MimeTypes.AUDIO_MPEG -> "MPEG"
        else -> ""
    }

    private fun label(f: Format, type: Int): String {
        var s = f.label?.takeIf { it.isNotEmpty() } ?: Fmt.lang(f.language)
        if (type == C.TRACK_TYPE_TEXT && (f.roleFlags and C.ROLE_FLAG_DESCRIBES_MUSIC_AND_SOUND) != 0) s += T(" (hard of hearing)")
        if (type == C.TRACK_TYPE_AUDIO) {
            if ((f.roleFlags and C.ROLE_FLAG_DESCRIBES_VIDEO) != 0) s += T(" (audio description)")
            val c = codec(f)
            if (c.isNotEmpty()) s += "  ·  $c"
        }
        return s
    }

    /** all audio tracks and their support - shown at the bottom of the menu for troubleshooting */
    private fun audioDiag(): String {
        val parts = ArrayList<String>()
        for (g in player.currentTracks.groups) {
            if (g.type != C.TRACK_TYPE_AUDIO) continue
            for (t in 0 until g.length) {
                val f = g.getTrackFormat(t)
                val c = codec(f).ifEmpty { f.sampleMimeType ?: "?" }
                parts.add(Fmt.lang(f.language) + " " + c + (if (g.isTrackSupported(t)) "" else T(" (not supported)")) +
                    (if (g.isTrackSelected(t)) " ✓" else ""))
            }
        }
        val dec = if (audioDecoder.isEmpty()) "" else T("   ·   decoder: ") + audioDecoder
        return (if (parts.isEmpty()) T("No audio tracks") else parts.joinToString(", ")) + dec
    }

    private fun options(type: Int): List<Opt> {
        val out = ArrayList<Opt>()
        if (type == C.TRACK_TYPE_TEXT) out.add(Opt(T("off"), null, -1, ""))
        for (g in player.currentTracks.groups) {
            if (g.type != type) continue
            for (t in 0 until g.length) {
                if (!g.isTrackSupported(t)) continue
                val f = g.getTrackFormat(t)
                out.add(Opt(label(f, type), g, t, f.language ?: ""))
            }
        }
        return out
    }

    private fun current(opts: List<Opt>, type: Int): Int {
        if (type == C.TRACK_TYPE_TEXT && player.trackSelectionParameters.disabledTrackTypes.contains(C.TRACK_TYPE_TEXT)) return 0
        val i = opts.indexOfFirst { it.group != null && it.group.isTrackSelected(it.track) }
        return if (i >= 0) i else 0
    }

    private fun showTracks() {
        trackRow = 0
        renderTracks()
        tracks.visibility = View.VISIBLE
    }

    private fun renderTracks() {
        trRows.removeAllViews()
        val rows = listOf(T("Audio") to C.TRACK_TYPE_AUDIO, T("Subtitles") to C.TRACK_TYPE_TEXT)
        for ((n, pair) in rows.withIndex()) {
            val opts = options(pair.second)
            val cur = current(opts, pair.second)
            val value = when {
                pair.second == C.TRACK_TYPE_TEXT && opts.size <= 1 -> T("not available")
                opts.isEmpty() -> T("default")
                else -> opts[cur].label + if (opts.size > 1) "  (${cur + 1}/${opts.size})" else ""
            }
            val arrows = opts.size > 1
            val tv = TextView(this)
            tv.text = pair.first.padEnd(17) + (if (arrows) "◀ " else "") + value + (if (arrows) " ▶" else "")
            tv.textSize = 17f
            tv.setPadding(24, 14, 24, 14)
            tv.setTextColor(0xFFFFFFFF.toInt())
            tv.setBackgroundColor(if (n == trackRow) 0xFF2A5C99.toInt() else 0xFF1E2836.toInt())
            val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            lp.bottomMargin = 6
            trRows.addView(tv, lp)
        }
        val mode = TextView(this)
        mode.text = T("Audio decoding").padEnd(17) + "◀ " + (if (audioMode() == "pcm") T("app (PCM)") else T("TV / Dolby passthrough")) + " ▶"
        mode.textSize = 17f
        mode.setPadding(24, 14, 24, 14)
        mode.setTextColor(0xFFFFFFFF.toInt())
        mode.setBackgroundColor(if (trackRow == 2) 0xFF2A5C99.toInt() else 0xFF1E2836.toInt())
        trRows.addView(mode, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
        val lng = TextView(this)
        lng.text = T("Language").padEnd(17) + "◀ " + I18n.label() + " ▶"
        lng.textSize = 17f
        lng.setPadding(24, 14, 24, 14)
        lng.setTextColor(0xFFFFFFFF.toInt())
        lng.setBackgroundColor(if (trackRow == 3) 0xFF2A5C99.toInt() else 0xFF1E2836.toInt())
        val llp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        llp.topMargin = 6
        trRows.addView(lng, llp)
        val shot = TextView(this)
        shot.text = T("Screenshot").padEnd(17) + if (Shots.busy) T("wait…") else T("OK: take a picture in 10 s")
        shot.textSize = 17f
        shot.setPadding(24, 14, 24, 14)
        shot.setTextColor(0xFFFFFFFF.toInt())
        shot.setBackgroundColor(if (trackRow == 4) 0xFF2A5C99.toInt() else 0xFF1E2836.toInt())
        val slp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        slp.topMargin = 6
        trRows.addView(shot, slp)
        val diag = TextView(this)
        diag.text = audioDiag()
        diag.textSize = 12f
        diag.setPadding(4, 10, 4, 0)
        diag.setTextColor(0xFF8B98A8.toInt())
        trRows.addView(diag)
    }

    // ---------------------------------------------------------------- screenshot

    private fun startShot() = Shots.start()

    /** the video frame with PixelCopy (SurfaceView), with the app views on top: subtitles, bars, menus */
    fun captureShot(done: (android.graphics.Bitmap, Map<String, String?>) -> Unit) {
        val root = findViewById<View>(android.R.id.content)
        val w = root.width
        val h = root.height
        val params = LinkedHashMap<String, String?>()
        params["platform"] = "googletv"
        params["novideo"] = "1"
        params["pos"] = String.format(java.util.Locale.US, "%.2f", player.currentPosition / 1000.0)
        params["title"] = title
        if (!live) params["file"] = key else params["sref"] = refs.getOrNull(index)
        val full = android.graphics.Bitmap.createBitmap(maxOf(1, w), maxOf(1, h), android.graphics.Bitmap.Config.ARGB_8888)
        val canvas = android.graphics.Canvas(full)
        canvas.drawColor(0xFF000000.toInt())
        val overlays = {
            for (v in listOf<View?>(video.subtitleView, info, tracks, osd)) {
                if (v == null || v.visibility != View.VISIBLE || v.width == 0) continue
                val loc = IntArray(2)
                v.getLocationInWindow(loc)
                canvas.save()
                canvas.translate(loc[0].toFloat(), loc[1].toFloat())
                v.draw(canvas)
                canvas.restore()
            }
            done(full, params)
        }
        val sv = video.videoSurfaceView as? android.view.SurfaceView
        if (sv != null && sv.width > 0 && android.os.Build.VERSION.SDK_INT >= 24) {
            val vb = android.graphics.Bitmap.createBitmap(sv.width, sv.height, android.graphics.Bitmap.Config.ARGB_8888)
            try {
                android.view.PixelCopy.request(sv, vb, { result ->
                    if (result == android.view.PixelCopy.SUCCESS) {
                        val loc = IntArray(2)
                        sv.getLocationInWindow(loc)
                        canvas.drawBitmap(vb, loc[0].toFloat(), loc[1].toFloat(), null)
                    }
                    overlays()
                }, ui)
            } catch (e: Exception) {
                overlays()
            }
        } else {
            overlays()
        }
    }

    fun showToast(msg: String) = toast(msg)

    private fun changeTrack(d: Int) {
        if (trackRow == 4) return
        if (trackRow == 3) {
            I18n.cycle(d)
            findViewById<TextView>(R.id.trHead).text = T("Audio and subtitles")
            findViewById<TextView>(R.id.trKeys).text = T("▲▼ row   ◀▶ change   OK/BACK close")
            renderTracks()
            return
        }
        if (trackRow == 2) {
            Box.prefs.edit().putString("audioMode", if (audioMode() == "pcm") "tv" else "pcm").apply()
            rebuildPlayer()
            renderTracks()
            toast(if (audioMode() == "pcm") T("Audio is decoded in the app") else T("Audio is decoded by the TV / device"))
            return
        }
        val type = if (trackRow == 0) C.TRACK_TYPE_AUDIO else C.TRACK_TYPE_TEXT
        val opts = options(type)
        if (opts.size < 2) return
        val next = opts[(current(opts, type) + d + opts.size) % opts.size]
        val b = player.trackSelectionParameters.buildUpon()
        if (next.group == null) {
            b.clearOverridesOfType(C.TRACK_TYPE_TEXT).setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
            Box.prefs.edit().putString("subLang", "").apply()
        } else {
            b.setTrackTypeDisabled(type, false)
                .setOverrideForType(TrackSelectionOverride(next.group.mediaTrackGroup, next.track))
            Box.prefs.edit().putString(if (type == C.TRACK_TYPE_TEXT) "subLang" else "audioLang", next.lang).apply()
            if (type == C.TRACK_TYPE_TEXT) b.setPreferredTextLanguage(next.lang) else b.setPreferredAudioLanguage(next.lang)
        }
        player.trackSelectionParameters = b.build()
        ui.postDelayed({ renderTracks() }, 150)
    }

    // ---------------------------------------------------------------- keys

    private var okDown = false
    private var longFired = false
    private val longPress = Runnable {
        longFired = true
        info.visibility = View.GONE
        showTracks()
    }

    override fun dispatchKeyEvent(e: KeyEvent): Boolean {
        val k = e.keyCode
        val down = e.action == KeyEvent.ACTION_DOWN
        val first = down && e.repeatCount == 0

        // menu open: only the menu keys
        if (tracks.visibility == View.VISIBLE) {
            if (first) when (k) {
                KeyEvent.KEYCODE_DPAD_UP -> { trackRow = (trackRow + 4) % 5; renderTracks() }
                KeyEvent.KEYCODE_DPAD_DOWN -> { trackRow = (trackRow + 1) % 5; renderTracks() }
                KeyEvent.KEYCODE_DPAD_LEFT -> changeTrack(-1)
                KeyEvent.KEYCODE_DPAD_RIGHT -> changeTrack(1)
                KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_MENU, KeyEvent.KEYCODE_CAPTIONS ->
                    if (!okDown) {
                        tracks.visibility = View.GONE
                        if (trackRow == 4 && k != KeyEvent.KEYCODE_MENU && k != KeyEvent.KEYCODE_CAPTIONS) startShot()
                    }
            }
            if (!down && k == KeyEvent.KEYCODE_BACK) tracks.visibility = View.GONE
            if (!down && (k == KeyEvent.KEYCODE_DPAD_CENTER || k == KeyEvent.KEYCODE_ENTER)) okDown = false
            val volume = k == KeyEvent.KEYCODE_VOLUME_UP || k == KeyEvent.KEYCODE_VOLUME_DOWN || k == KeyEvent.KEYCODE_VOLUME_MUTE
            return if (volume) super.dispatchKeyEvent(e) else true
        }

        when (k) {
            KeyEvent.KEYCODE_BACK -> {
                if (!down) {
                    if (info.visibility == View.VISIBLE && player.playWhenReady) toggleInfo() else finish()
                }
                return true
            }
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                if (first) {
                    okDown = true
                    longFired = false
                    ui.postDelayed(longPress, android.view.ViewConfiguration.getLongPressTimeout().toLong() + 100)
                } else if (down) {
                    // held down: the remote sends repeats (and the long-press flag)
                    if (okDown && !longFired && (e.isLongPress || e.repeatCount > 0)) { ui.removeCallbacks(longPress); longPress.run() }
                } else {
                    ui.removeCallbacks(longPress)
                    if (okDown && !longFired) { if (live) toggleInfo() else togglePause() }
                    okDown = false
                }
                return true
            }
            KeyEvent.KEYCODE_MENU, KeyEvent.KEYCODE_CAPTIONS, KeyEvent.KEYCODE_PROG_YELLOW -> { if (first) showTracks(); return true }
            KeyEvent.KEYCODE_INFO, KeyEvent.KEYCODE_GUIDE, KeyEvent.KEYCODE_PROG_BLUE -> { if (first) toggleInfo(); return true }
            KeyEvent.KEYCODE_MEDIA_STOP -> { if (first) finish(); return true }
        }

        if (!down) return super.dispatchKeyEvent(e)
        if (live) {
            when (k) {
                KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_CHANNEL_UP -> { if (first) playChannel(index - 1); return true }
                KeyEvent.KEYCODE_DPAD_DOWN, KeyEvent.KEYCODE_CHANNEL_DOWN -> { if (first) playChannel(index + 1); return true }
                KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT -> { showOsd(); return true }
            }
        } else {
            when (k) {
                KeyEvent.KEYCODE_DPAD_LEFT -> { seekBy(-15000); return true }
                KeyEvent.KEYCODE_DPAD_RIGHT -> { seekBy(15000); return true }
                KeyEvent.KEYCODE_DPAD_UP -> { seekBy(300000); return true }
                KeyEvent.KEYCODE_DPAD_DOWN -> { seekBy(-300000); return true }
                KeyEvent.KEYCODE_MEDIA_FAST_FORWARD -> { seekBy(60000); return true }
                KeyEvent.KEYCODE_MEDIA_REWIND -> { seekBy(-60000); return true }
                KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> { if (first) togglePause(); return true }
                KeyEvent.KEYCODE_MEDIA_PLAY -> { if (first && !player.playWhenReady) togglePause(); return true }
                KeyEvent.KEYCODE_MEDIA_PAUSE -> { if (first && player.playWhenReady) togglePause(); return true }
            }
        }
        return super.dispatchKeyEvent(e)
    }

    // ---------------------------------------------------------------- lifecycle

    override fun onResume() {
        super.onResume()
        Shots.resumed(this)
    }

    override fun onPause() {
        super.onPause()
        savePos()
        player.playWhenReady = false
    }

    override fun onStop() {
        super.onStop()
        // when coming back from Home this is not resumed: return to the list
        if (!isFinishing) finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        Shots.destroyed(this)
        ui.removeCallbacksAndMessages(null)
        player.removeListener(listener)
        player.release()
    }
}
