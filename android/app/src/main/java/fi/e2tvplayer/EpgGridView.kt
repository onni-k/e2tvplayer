// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 E2TVPlayer contributors
package fi.e2tvplayer

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.text.TextUtils
import android.util.AttributeSet
import android.view.KeyEvent
import android.view.View

/** One programme of the guide. Times are unix seconds. */
data class EpgEvent(val begin: Long, val end: Long, val title: String, val sub: String, val desc: String) {
    fun text(): String = if (sub.isNotEmpty() && desc.isNotEmpty() && !desc.contains(sub)) "$sub – $desc" else desc.ifEmpty { sub }
}

/**
 * Programme guide: channels as rows, time from left to right (2.5 h at a time), drawn on a
 * canvas so that the D-pad moves between programmes instead of between views. The details
 * of the selected programme are drawn under the grid. The activity loads the events of
 * a channel when [needEvents] asks for them and hands them in with [setEvents].
 */
class EpgGridView @JvmOverloads constructor(ctx: Context, attrs: AttributeSet? = null) : View(ctx, attrs) {

    var needEvents: (String) -> Unit = {}
    var onWatch: (Int) -> Unit = {}
    var onInfo: (Int, EpgEvent) -> Unit = { _, _ -> }

    private var refs: List<String> = emptyList()
    private var names: List<String> = emptyList()
    private val events = HashMap<String, List<EpgEvent>>()
    private val loadedAt = HashMap<String, Long>()
    private val asked = HashSet<String>()

    var row = 0
        private set
    private var top = 0
    private var t0 = 0L
    private var selTime = 0L
    var selected: EpgEvent? = null
        private set

    private val span = 9000L
    private val dp = resources.displayMetrics.density
    private val chanW = 170 * dp
    private val headH = 24 * dp
    private val rowH = 40 * dp
    private val gap = 3 * dp
    private val infoH = 104 * dp

    private val pBg = Paint().apply { color = 0xFF161D27.toInt() }
    private val pEv = Paint().apply { color = 0xFF1B2532.toInt() }
    private val pNowEv = Paint().apply { color = 0xFF213047.toInt() }
    private val pSel = Paint().apply { color = 0xFF2A5C99.toInt() }
    private val pChSel = Paint().apply { color = 0xFF22344D.toInt() }
    private val pLine = Paint().apply { color = 0xFF3A4656.toInt(); strokeWidth = dp }
    private val pNow = Paint().apply { color = 0xFFFF5A5A.toInt(); strokeWidth = 2 * dp }
    private val tText = TextPaint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFCFD8E3.toInt(); textSize = 15 * dp }
    private val tDim = TextPaint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFF8B98A8.toInt(); textSize = 13 * dp }
    private val tTitle = TextPaint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFFFFFF.toInt(); textSize = 20 * dp; typeface = Typeface.DEFAULT_BOLD }
    private val tMeta = TextPaint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFF9FB3C8.toInt(); textSize = 13 * dp }
    private val tDesc = TextPaint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFC9D1D9.toInt(); textSize = 14 * dp }

    init {
        isFocusable = true
        isFocusableInTouchMode = true
    }

    private fun now() = System.currentTimeMillis() / 1000
    private fun floor30(t: Long) = t - t % 1800

    fun setServices(refs: List<String>, names: List<String>, startRow: Int = 0) {
        this.refs = refs
        this.names = names
        row = startRow.coerceIn(0, maxOf(0, refs.size - 1))
        top = 0
        if (t0 == 0L || t0 + span < now()) { t0 = floor30(now()); selTime = now() }
        invalidate()
    }

    fun setEvents(ref: String, list: List<EpgEvent>) {
        events[ref] = list.sortedBy { it.begin }
        loadedAt[ref] = now()
        asked.remove(ref)
        invalidate()
    }

    private fun eventsOf(ref: String): List<EpgEvent>? {
        val l = events[ref]
        val stale = l == null || now() - (loadedAt[ref] ?: 0) > 1800
        if (stale && asked.add(ref)) post { needEvents(ref) }
        return l
    }

    private fun eventAt(list: List<EpgEvent>?, t: Long): Int = list?.indexOfFirst { it.end > t } ?: -1

    private fun rows(): Int = maxOf(1, ((height - headH - infoH) / rowH).toInt())

    private fun ppx(): Float = (width - chanW) / span.toFloat()

    override fun onDraw(c: Canvas) {
        val w = width.toFloat()
        val now = now()
        if (t0 == 0L) { t0 = floor30(now); selTime = now }
        val ppx = ppx()
        val t1 = t0 + span
        // time line
        var t = t0
        while (t < t1) {
            val x = chanW + (t - t0) * ppx
            c.drawLine(x, 4 * dp, x, headH - 2 * dp, pLine)
            c.drawText(Fmt.hm(t), x + 4 * dp, headH - 7 * dp, tDim)
            t += 1800
        }
        if (floor30(t0) != floor30(now)) c.drawText(Fmt.date(t0).substringBefore(' '), 0f, headH - 7 * dp, tDim)
        val n = rows()
        var sel: EpgEvent? = null
        if (refs.isEmpty()) {
            c.drawText(T("No channels in this bouquet"), chanW, headH + rowH, tDim)
        }
        for (r in 0 until n) {
            val idx = top + r
            if (idx >= refs.size) break
            val y = headH + r * rowH
            val rect = RectF(0f, y, chanW - gap, y + rowH - gap)
            c.drawRoundRect(rect, 3 * dp, 3 * dp, if (idx == row) pChSel else pBg)
            drawText(c, "${idx + 1}  ${names[idx]}", rect, if (idx == row) tTitleSmall() else tText)
            val list = eventsOf(refs[idx])
            val cur = if (idx == row) eventAt(list, selTime) else -2
            if (list == null || list.none { it.end > t0 && it.begin < t1 }) {
                val r2 = RectF(chanW, y, w - gap, y + rowH - gap)
                c.drawRoundRect(r2, 3 * dp, 3 * dp, if (idx == row && list != null) pSel else pBg)
                drawText(c, if (list == null) "…" else T("No programme information"), r2, tDim)
                continue
            }
            list.forEachIndexed { i, ev ->
                if (ev.end <= t0 || ev.begin >= t1) return@forEachIndexed
                val x = chanW + (maxOf(ev.begin, t0) - t0) * ppx
                val x2 = chanW + (minOf(ev.end, t1) - t0) * ppx - gap
                val r2 = RectF(x, y, maxOf(x + 2 * dp, x2), y + rowH - gap)
                val isSel = i == cur
                if (isSel) sel = ev
                c.drawRoundRect(r2, 3 * dp, 3 * dp, if (isSel) pSel else if (ev.begin <= now && now < ev.end) pNowEv else pEv)
                if (r2.width() > 20 * dp) drawText(c, ev.title, r2, if (isSel) tTitleSmall() else tText)
            }
            if (cur >= 0 && sel == null) sel = list[cur]
        }
        if (now in t0 until t1) {
            val x = chanW + (now - t0) * ppx
            c.drawLine(x, headH, x, headH + minOf(n, refs.size - top) * rowH, pNow)
        }
        selected = sel
        // details of the selected programme
        val iy = headH + n * rowH + 6 * dp
        val s = sel
        val name = names.getOrNull(row) ?: ""
        if (s != null) {
            c.drawText(TextUtils.ellipsize(s.title, tTitle, w, TextUtils.TruncateAt.END).toString(), 0f, iy + 20 * dp, tTitle)
            c.drawText("$name · ${Fmt.date(s.begin).substringBefore(' ')} ${Fmt.hm(s.begin)}–${Fmt.hm(s.end)} · ${(s.end - s.begin) / 60} min",
                0f, iy + 40 * dp, tMeta)
            val text = s.text()
            if (text.isNotEmpty()) {
                @Suppress("DEPRECATION")
                val lay = StaticLayout(text, tDesc, w.toInt(), Layout.Alignment.ALIGN_NORMAL, 1.1f, 0f, false)
                c.save()
                c.translate(0f, iy + 48 * dp)
                c.clipRect(0f, 0f, w, infoH - 54 * dp)
                lay.draw(c)
                c.restore()
            }
        } else if (name.isNotEmpty()) {
            c.drawText(name, 0f, iy + 20 * dp, tTitle)
        }
    }

    private val tSel = TextPaint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFFFFFF.toInt(); textSize = 15 * dp }
    private fun tTitleSmall() = tSel

    private fun drawText(c: Canvas, s: String, r: RectF, p: TextPaint) {
        val pad = 6 * dp
        val avail = r.width() - 2 * pad
        if (avail <= 0) return
        val txt = TextUtils.ellipsize(s, p, avail, TextUtils.TruncateAt.END).toString()
        c.drawText(txt, r.left + pad, r.centerY() - (p.descent() + p.ascent()) / 2, p)
    }

    // ---------------------------------------------------------------- keys

    private fun setRow(r: Int) {
        if (refs.isEmpty()) return
        row = r.coerceIn(0, refs.size - 1)
        val n = rows()
        if (row < top) top = row
        if (row >= top + n) top = row - n + 1
        invalidate()
    }

    private fun follow() {
        val min = floor30(now())
        if (selTime < t0) t0 = maxOf(min, floor30(selTime))
        if (selTime >= t0 + span - 900) t0 = floor30(selTime) - 1800
        if (t0 < min) t0 = min
    }

    private fun step(d: Int) {
        val list = events[refs.getOrNull(row) ?: return]
        val i = eventAt(list, selTime)
        if (list == null || i < 0) {
            selTime = maxOf(now(), selTime + d * 1800)
        } else if (d > 0) {
            if (i + 1 < list.size) selTime = list[i + 1].begin else return
        } else {
            var j = i
            if (list[j].begin > selTime && j > 0) j--
            if (j > 0 && list[j].begin <= selTime) selTime = maxOf(now(), list[j - 1].begin) else return
        }
        follow()
        invalidate()
    }

    private fun shift(sec: Long) {
        val t = maxOf(floor30(now()), t0 + sec)
        selTime = maxOf(now(), selTime + (t - t0))
        t0 = t
        invalidate()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_DPAD_UP -> { if (row == 0) return false; setRow(row - 1) }
            KeyEvent.KEYCODE_DPAD_DOWN -> setRow(row + 1)
            KeyEvent.KEYCODE_CHANNEL_UP, KeyEvent.KEYCODE_PAGE_UP -> setRow(row - rows())
            KeyEvent.KEYCODE_CHANNEL_DOWN, KeyEvent.KEYCODE_PAGE_DOWN -> setRow(row + rows())
            KeyEvent.KEYCODE_DPAD_LEFT -> step(-1)
            KeyEvent.KEYCODE_DPAD_RIGHT -> step(1)
            KeyEvent.KEYCODE_MEDIA_REWIND -> shift(-7200)
            KeyEvent.KEYCODE_MEDIA_FAST_FORWARD -> shift(7200)
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_MEDIA_PLAY, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> {
                val s = selected
                val now = now()
                if (s == null || (s.begin <= now && now < s.end)) onWatch(row) else onInfo(row, s)
            }
            KeyEvent.KEYCODE_INFO, KeyEvent.KEYCODE_MENU -> { val s = selected; if (s != null) onInfo(row, s) else onWatch(row) }
            else -> return super.onKeyDown(keyCode, event)
        }
        return true
    }
}
