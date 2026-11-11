// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 E2TVPlayer contributors
package fi.e2tvplayer

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Html
import android.text.InputType
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONObject
import java.util.Calendar

/** A row in the list: recording, folder, bouquet or channel. */
class Row(
    val type: String,             // up, dir, movie, bouquet, service
    val title: String,
    val sub: String = "",
    val right: String = "",
    val right2: String = "",
    val icon: String = "",
    val progress: Float = 0f,
    val meta: String = "",
    val desc: String = "",
    val path: String = "",
    val ref: String = "",
    val length: Long = 0,
    val movie: JSONObject? = null
)

class MainActivity : Activity() {

    private lateinit var list: RecyclerView
    private lateinit var adapter: RowAdapter
    private lateinit var tabRec: TextView
    private lateinit var tabCh: TextView
    private lateinit var tabEpg: TextView
    private lateinit var epg: EpgGridView
    private lateinit var content: View
    private lateinit var tabSort: TextView
    private lateinit var tabSet: TextView
    private lateinit var crumb: TextView
    private lateinit var nowbar: TextView
    private lateinit var clock: TextView
    private lateinit var empty: TextView
    private lateinit var busy: ProgressBar
    private lateinit var dTitle: TextView
    private lateinit var dMeta: TextView
    private lateinit var dDesc: TextView
    private lateinit var footer: TextView
    private val ui = Handler(Looper.getMainLooper())

    private var mode = "movies"                 // movies, channels, epg
    private var epgBouquet: JSONObject? = null
    private var epgServices: List<JSONObject> = emptyList()
    private val epgQueue = ArrayList<String>()
    private var epgActive = 0
    /** timers on the box: service reference (10 fields), begin, end, event id */
    private data class Timer(val ref: String, val begin: Long, val end: Long, val eit: Long)
    private var timers: List<Timer> = emptyList()
    private var root: String? = null
    private var dir: String? = null
    private var movieData: JSONObject? = null
    private val remember = HashMap<String, Int>()
    private var bouquets: List<JSONObject> = emptyList()
    private var bouquet: JSONObject? = null
    private var services: List<JSONObject> = emptyList()
    private var now = HashMap<String, JSONObject>()
    private var bouquetIndex = 0
    private var loadGen = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Box.init(this)
        setContentView(R.layout.activity_main)
        list = findViewById(R.id.list)
        tabRec = findViewById(R.id.tabRec)
        tabCh = findViewById(R.id.tabCh)
        tabEpg = findViewById(R.id.tabEpg)
        epg = findViewById(R.id.epg)
        content = findViewById(R.id.content)
        tabSort = findViewById(R.id.tabSort)
        tabSet = findViewById(R.id.tabSet)
        crumb = findViewById(R.id.crumb)
        nowbar = findViewById(R.id.nowbar)
        clock = findViewById(R.id.clock)
        empty = findViewById(R.id.empty)
        busy = findViewById(R.id.busy)
        dTitle = findViewById(R.id.dTitle)
        dMeta = findViewById(R.id.dMeta)
        dDesc = findViewById(R.id.dDesc)
        footer = findViewById(R.id.footer)
        tabRec.text = T("Recordings")
        tabCh.text = T("Channels")
        tabEpg.text = T("Guide")
        tabSet.text = T("Settings")
        langCur = I18n.cur()
        Box.hello(BuildConfigCompat.version(this))
        findViewById<TextView>(R.id.title).text =
            Html.fromHtml("E2<font color='#4FA3FF'>TV</font>Player")

        adapter = RowAdapter()
        list.layoutManager = LinearLayoutManager(this)
        list.adapter = adapter
        list.itemAnimator = null

        tabRec.setOnClickListener { showMovies() }
        tabCh.setOnClickListener { showChannels() }
        tabEpg.setOnClickListener { showEpg() }
        epg.needEvents = { ref -> queueEpg(ref) }
        epg.onWatch = { row -> watchFromEpg(row) }
        epg.onInfo = { row, ev -> epgInfo(row, ev) }
        epg.hasTimer = { ref, ev -> timerOf(ref, ev) != null }
        tabSort.setOnClickListener { toggleSort() }
        tabSet.setOnClickListener { settings() }
        updateTabs()
        tick()

        if (Box.host.isEmpty()) {
            findBox(first = true)
        } else {
            showMovies()
        }
    }

    private val ticker = object : Runnable {
        override fun run() { tick(); ui.postDelayed(this, 30000) }
    }

    private var langCur = ""

    override fun onResume() {
        super.onResume()
        if (I18n.cur() != langCur) { recreate(); return }
        Shots.resumed(this)
        ui.removeCallbacks(ticker)
        ui.postDelayed(ticker, 30000)
        if (Box.host.isNotEmpty()) refreshStatus()
        // after playback, refresh the progress bars
        if (mode == "movies" && movieData != null) renderMovies(currentIndex())
        if (mode == "epg") epg.invalidate()
    }

    override fun onDestroy() {
        super.onDestroy()
        Shots.destroyed(this)
    }

    override fun onPause() {
        super.onPause()
        ui.removeCallbacks(ticker)
    }

    private fun tick() {
        val c = Calendar.getInstance()
        clock.text = String.format("%02d:%02d", c.get(Calendar.HOUR_OF_DAY), c.get(Calendar.MINUTE))
        if (Box.host.isNotEmpty()) refreshStatus()
    }

    private fun refreshStatus() {
        Box.get("/api/statusinfo", timeoutMs = 8000, ok = { s ->
            val parts = ArrayList<String>()
            val standby = s.optString("inStandby") == "true" || s.optBoolean("inStandby", false)
            if (standby) parts.add(T("in standby")) else {
                s.optString("currservice_station").takeIf { it.isNotEmpty() }?.let { parts.add(it) }
                s.optString("currservice_name").takeIf { it.isNotEmpty() }?.let { parts.add(it) }
            }
            val rec = s.optString("isRecording") == "true" || s.optBoolean("isRecording", false)
            val html = (if (rec) T("<font color='#FF5A5A'><b>● RECORDING</b></font> &nbsp; ") else "") +
                T("Box ") + Html.escapeHtml(Box.host) + (if (parts.isEmpty()) "" else " · " + Html.escapeHtml(parts.joinToString(" — ")))
            nowbar.text = Html.fromHtml(html)
        }, fail = { err -> nowbar.text = Html.fromHtml(T("<font color='#FF5A5A'>No connection to the box</font> · ") + Html.escapeHtml(err)) })
    }

    private fun updateTabs() {
        tabRec.isSelected = mode == "movies"
        tabCh.isSelected = mode == "channels"
        tabEpg.isSelected = mode == "epg"
        epg.visibility = if (mode == "epg") View.VISIBLE else View.GONE
        content.visibility = if (mode == "epg") View.GONE else View.VISIBLE
        tabSort.visibility = if (mode == "movies") View.VISIBLE else View.GONE
        tabSort.text = if (sortByName()) T("A–Z") else T("Newest first")
        footer.text = when (mode) {
            "movies" -> T("OK play   ·   long OK: menu (delete, from start)   ·   ▲ up to tabs   ·   BACK parent folder")
            "epg" -> T("OK watch / info   ·   red: timer   ·   ◀▶ programme   ·   ▲▼ channel   ·   ◀◀▶▶ ±2 h   ·   BACK channels")
            else -> T("OK watch   ·   ▲ up to tabs   ·   BACK back")
        }
    }

    private fun setBusy(on: Boolean) { busy.visibility = if (on) View.VISIBLE else View.GONE }

    private fun setRows(rows: List<Row>, index: Int, emptyText: String, focus: Boolean = true) {
        adapter.rows = rows
        adapter.notifyDataSetChanged()
        empty.text = emptyText
        empty.visibility = if (rows.isEmpty()) View.VISIBLE else View.GONE
        val i = index.coerceIn(0, maxOf(0, rows.size - 1))
        (list.layoutManager as LinearLayoutManager).scrollToPositionWithOffset(i, list.height / 3)
        details(rows.getOrNull(i))
        if (focus && rows.isNotEmpty()) {
            list.post {
                list.findViewHolderForAdapterPosition(i)?.itemView?.requestFocus()
                    ?: list.post { list.findViewHolderForAdapterPosition(i)?.itemView?.requestFocus() }
            }
        } else if (rows.isEmpty()) {
            (if (mode == "movies") tabRec else tabCh).requestFocus()
        }
    }

    private fun currentIndex(): Int {
        val f = list.focusedChild ?: return 0
        val p = list.getChildAdapterPosition(f)
        return if (p == RecyclerView.NO_POSITION) 0 else p
    }

    private fun details(r: Row?) {
        dTitle.text = r?.title ?: ""
        dMeta.text = if (r?.meta.isNullOrEmpty()) "" else Html.fromHtml(r!!.meta)
        dDesc.text = r?.desc ?: ""
    }

    // ---------------------------------------------------------------- recordings

    private fun sortByName() = Box.prefs.getString("sort", "date") == "name"

    private fun toggleSort() {
        Box.prefs.edit().putString("sort", if (sortByName()) "date" else "name").apply()
        updateTabs()
        if (mode == "movies") renderMovies(0, focus = false)
    }

    private fun showMovies() {
        mode = "movies"
        updateTabs()
        if (movieData == null) loadMovies(null) else renderMovies(remember[dir ?: ""] ?: 0)
    }

    private fun loadMovies(path: String?, selectPath: String? = null) {
        val gen = ++loadGen
        setBusy(true)
        Box.get("/api/movielist", mapOf("dirname" to path), timeoutMs = 30000, ok = { data ->
            if (gen != loadGen) return@get
            setBusy(false)
            var d = data.optString("directory").ifEmpty { path ?: "/media/hdd/movie/" }
            if (!d.endsWith("/")) d += "/"
            if (root == null) root = d
            dir = d
            movieData = data
            if (mode == "movies") renderMovies(null, selectPath)
        }, fail = { err ->
            if (gen != loadGen) return@get
            setBusy(false)
            movieData = null
            crumb.text = ""
            setRows(emptyList(), 0, "$err\n\n" + T("Check the box address: Settings"))
        })
    }

    private fun movieRow(m: JSONObject): Row {
        val len = Fmt.parseLength(m.optString("length"))
        val key = m.optString("filename")
        val posMs = Box.getPos(key)
        val title = m.optString("eventname").ifEmpty { m.optString("filename_stripped").ifEmpty { key.substringAfterLast('/') } }
        val rt = m.optLong("recordingtime")
        val station = m.optString("servicename")
        val size = m.optString("filesize_readable").ifEmpty { Fmt.size(m.optLong("filesize")) }
        val meta = StringBuilder()
        if (station.isNotEmpty()) meta.append(Html.escapeHtml(station)).append("<br/>")
        if (rt > 0) meta.append(Fmt.date(rt, true)).append("<br/>")
        meta.append(T("Duration ")).append(if (len > 0) Fmt.time(len) else "?").append(" &nbsp; ").append(Html.escapeHtml(size))
        if (posMs > 0) meta.append(T("<br/><font color='#4FA3FF'>Watched up to ")).append(Fmt.time(posMs / 1000)).append(T("</font>"))
        var desc = m.optString("description")
        val ext = m.optString("descriptionExtended")
        if (ext.isNotEmpty() && ext != desc) desc = if (desc.isEmpty()) ext else "$desc\n\n$ext"
        return Row(
            type = "movie", title = title, icon = if (posMs > 0) "◐" else "●",
            sub = (if (station.isNotEmpty()) "$station · " else "") + Fmt.date(rt),
            right = if (len > 0) Fmt.time(len) else "", right2 = size,
            progress = if (len > 0 && posMs > 0) (posMs / 1000f / len).coerceIn(0f, 1f) else 0f,
            meta = meta.toString(), desc = Fmt.desc(desc), path = key, ref = m.optString("serviceref"),
            length = len, movie = m
        )
    }

    private fun renderMovies(index: Int?, selectPath: String? = null, focus: Boolean = true) {
        val data = movieData ?: return
        val d = dir ?: return
        val rows = ArrayList<Row>()
        if (d != root) rows.add(Row("up", "..", T("Parent folder"), icon = "↰"))
        val bms = data.optJSONArray("bookmarks")
        val dirs = ArrayList<String>()
        if (bms != null) for (i in 0 until bms.length()) dirs.add(bms.optString(i).trimEnd('/'))
        dirs.sortBy { it.lowercase() }
        for (name in dirs) {
            if (name.isEmpty() || name.startsWith(".") || name == "trashcan") continue
            rows.add(Row("dir", name, T("Folder"), icon = "▸", path = "$d$name/"))
        }
        val ms = ArrayList<JSONObject>()
        val arr = data.optJSONArray("movies")
        if (arr != null) for (i in 0 until arr.length()) arr.optJSONObject(i)?.let { ms.add(it) }
        if (sortByName()) ms.sortWith(compareBy<JSONObject> { it.optString("eventname").lowercase() }.thenByDescending { it.optLong("recordingtime") })
        else ms.sortByDescending { it.optLong("recordingtime") }
        for (m in ms) rows.add(movieRow(m))
        var idx = index ?: (remember[d] ?: 0)
        if (selectPath != null) rows.indexOfFirst { it.path == selectPath }.takeIf { it >= 0 }?.let { idx = it }
        val rel = if (root != null && d.startsWith(root!!)) d.substring(root!!.length).trimEnd('/') else d
        crumb.text = T("Recordings") + (if (rel.isNotEmpty()) " › " + rel.replace("/", " › ") else "") + "  (${ms.size})"
        setRows(rows, idx, T("No recordings in this folder"), focus)
    }

    private fun openDir(path: String, selectPath: String? = null) {
        remember[dir ?: ""] = currentIndex()
        loadMovies(path, selectPath)
    }

    private fun upDir() {
        val d = dir ?: return
        val parent = d.trimEnd('/').substringBeforeLast('/') + "/"
        openDir(parent, d)
    }

    private fun playMovie(r: Row, fromStart: Boolean = false) {
        val m = r.movie ?: return
        val start = {
            val pos = if (fromStart) 0L else maxOf(0L, Box.getPos(r.path) - 5000)
            startActivity(Intent(this, PlayerActivity::class.java).apply {
                putExtra("url", Box.fileUrl(r.path))
                putExtra("title", r.title)
                putExtra("sub", (m.optString("servicename").let { if (it.isEmpty()) "" else "$it · " }) + Fmt.date(m.optLong("recordingtime"), true))
                putExtra("desc", r.desc)
                putExtra("key", r.path)
                putExtra("length", r.length)
                putExtra("start", pos)
            })
        }
        val pos = Box.getPos(r.path)
        if (!fromStart && pos > 30000) {
            AlertDialog.Builder(this, R.style.E2Dialog)
                .setTitle(r.title)
                .setItems(arrayOf(T("Resume from ") + Fmt.time(pos / 1000), T("From the start"))) { _, w ->
                    if (w == 1) playMovie(r, fromStart = true) else start()
                }.show()
        } else start()
    }

    private fun movieMenu(r: Row) {
        AlertDialog.Builder(this, R.style.E2Dialog)
            .setTitle(r.title)
            .setItems(arrayOf(T("Play from the start"), T("Delete recording"), if (sortByName()) T("Sort: newest first") else T("Sort: A–Z"))) { _, w ->
                when (w) {
                    0 -> playMovie(r, fromStart = true)
                    1 -> confirmDelete(r)
                    2 -> toggleSort()
                }
            }.show()
    }

    private fun confirmDelete(r: Row) {
        AlertDialog.Builder(this, R.style.E2Dialog)
            .setTitle(T("Delete the recording?"))
            .setMessage(r.title + "\n" + r.sub)
            .setNegativeButton(T("Cancel"), null)
            .setPositiveButton(T("Delete")) { _, _ ->
                setBusy(true)
                Box.get("/api/moviedelete", mapOf("sRef" to r.ref), ok = { res ->
                    setBusy(false)
                    if (res.optBoolean("result", false) || res.optString("result") == "True") {
                        Box.setPos(r.path, 0)
                        val arr = movieData?.optJSONArray("movies")
                        if (arr != null) for (i in 0 until arr.length()) {
                            if (arr.optJSONObject(i)?.optString("filename") == r.path) { arr.remove(i); break }
                        }
                        renderMovies(maxOf(0, currentIndex() - 0))
                        toast(T("Recording deleted"))
                    } else toast(T("Delete failed: ") + res.optString("message"))
                }, fail = { setBusy(false); toast(T("Delete failed: ") + it) })
            }.show()
    }

    // ---------------------------------------------------------------- channels

    private fun showChannels() {
        mode = "channels"
        updateTabs()
        if (bouquet != null && services.isNotEmpty()) renderServices(remember["ch"] ?: 0)
        else if (bouquets.isNotEmpty()) renderBouquets()
        else loadBouquets()
    }

    private fun loadBouquets() {
        val gen = ++loadGen
        setBusy(true)
        Box.get("/api/getservices", ok = { data ->
            if (gen != loadGen) return@get
            setBusy(false)
            val arr = data.optJSONArray("services")
            val l = ArrayList<JSONObject>()
            if (arr != null) for (i in 0 until arr.length()) arr.optJSONObject(i)?.let { l.add(it) }
            bouquets = l
            if (l.size == 1) openBouquet(l[0]) else renderBouquets()
        }, fail = { err -> if (gen == loadGen) { setBusy(false); crumb.text = T("Channels"); setRows(emptyList(), 0, err) } })
    }

    private fun renderBouquets() {
        bouquet = null
        val rows = bouquets.map { Row("bouquet", it.optString("servicename"), T("Bouquet"), icon = "▸", ref = it.optString("servicereference")) }
        crumb.text = T("Channels")
        setRows(rows, bouquetIndex, T("No bouquets"))
    }

    private fun openBouquet(b: JSONObject) {
        if (bouquets.size > 1) bouquetIndex = currentIndex()
        val gen = ++loadGen
        setBusy(true)
        Box.get("/api/getservices", mapOf("sRef" to b.optString("servicereference")), ok = { data ->
            if (gen != loadGen) return@get
            setBusy(false)
            val arr = data.optJSONArray("services")
            val l = ArrayList<JSONObject>()
            if (arr != null) for (i in 0 until arr.length()) {
                val s = arr.optJSONObject(i) ?: continue
                val ref = s.optString("servicereference")
                if (ref.isEmpty() || ref.startsWith("1:64:") || ref.startsWith("1:320:")) continue   // markers
                l.add(s)
            }
            bouquet = b
            services = l
            now = HashMap()
            renderServices(0)
            loadEpg()
        }, fail = { err -> if (gen == loadGen) { setBusy(false); toast(err) } })
    }

    private fun loadEpg() {
        val b = bouquet ?: return
        Box.get("/api/epgnow", mapOf("bRef" to b.optString("servicereference")), timeoutMs = 20000, ok = { data ->
            val ev = data.optJSONArray("events") ?: return@get
            val m = HashMap<String, JSONObject>()
            for (i in 0 until ev.length()) ev.optJSONObject(i)?.let { m[it.optString("sref")] = it }
            now = m
            if (mode == "channels" && bouquet === b) renderServices(currentIndex(), focus = list.hasFocus())
        }, fail = { })
    }

    private fun renderServices(index: Int, focus: Boolean = true) {
        val t = System.currentTimeMillis() / 1000
        val rows = services.mapIndexed { i, s ->
            val ref = s.optString("servicereference")
            val ev = now[ref]
            var right = ""
            var prog = 0f
            var meta = ""
            var desc = ""
            var sub = ""
            if (ev != null && ev.optString("title").isNotEmpty()) {
                val b = ev.optLong("begin_timestamp")
                val d = ev.optLong("duration_sec")
                sub = ev.optString("title")
                if (b > 0 && d > 0) {
                    right = Fmt.hm(b) + "–" + Fmt.hm(b + d)
                    prog = ((t - b).toFloat() / d).coerceIn(0f, 1f)
                }
                meta = Html.escapeHtml(sub) + if (right.isNotEmpty()) "<br/>$right" else ""
                desc = Fmt.desc(ev.optString("shortdesc").ifEmpty { ev.optString("longdesc") })
            }
            Row("service", s.optString("servicename"), sub, right, icon = "${i + 1}", progress = prog, meta = meta, desc = desc, ref = ref)
        }
        crumb.text = T("Channels › ") + (bouquet?.optString("servicename") ?: "")
        setRows(rows, index, T("No channels in this bouquet"), focus)
    }

    private fun playChannel(index: Int) {
        remember["ch"] = index
        val b = bouquet ?: return
        startActivity(Intent(this, PlayerActivity::class.java).apply {
            putExtra("live", true)
            putExtra("bouquet", b.optString("servicereference"))
            putExtra("refs", services.map { it.optString("servicereference") }.toTypedArray())
            putExtra("names", services.map { it.optString("servicename") }.toTypedArray())
            putExtra("index", index)
        })
    }

    // ---------------------------------------------------------------- programme guide

    /** the bouquet open in the channel list, otherwise the one used last, otherwise the first */
    private fun showEpg() {
        mode = "epg"
        updateTabs()
        val b = bouquet
        if (b != null && services.isNotEmpty()) {
            if (epgBouquet?.optString("servicereference") != b.optString("servicereference")) setEpg(b, services, 0)
            else setEpg(b, epgServices, epg.row)
            return
        }
        if (epgBouquet != null) { setEpg(epgBouquet!!, epgServices, epg.row); return }
        val gen = ++loadGen
        setBusy(true)
        Box.get("/api/getservices", ok = { data ->
            if (gen != loadGen) return@get
            val arr = data.optJSONArray("services")
            val want = Box.prefs.getString("epgBouquet", "")
            var pick: JSONObject? = null
            if (arr != null) for (i in 0 until arr.length()) {
                val o = arr.optJSONObject(i) ?: continue
                if (pick == null || o.optString("servicereference") == want) pick = o
            }
            val p = pick
            if (p == null) { setBusy(false); return@get }
            Box.get("/api/getservices", mapOf("sRef" to p.optString("servicereference")), ok = { sd ->
                if (gen != loadGen) return@get
                setBusy(false)
                val sa = sd.optJSONArray("services")
                val l = ArrayList<JSONObject>()
                if (sa != null) for (i in 0 until sa.length()) {
                    val s = sa.optJSONObject(i) ?: continue
                    val ref = s.optString("servicereference")
                    if (ref.isEmpty() || ref.startsWith("1:64:") || ref.startsWith("1:320:")) continue
                    l.add(s)
                }
                if (mode == "epg") setEpg(p, l, 0)
            }, fail = { err -> if (gen == loadGen) { setBusy(false); toast(err) } })
        }, fail = { err -> if (gen == loadGen) { setBusy(false); toast(err) } })
    }

    // ---------------------------------------------------------------- timers

    private fun refKey(r: String) = r.split(":").take(10).joinToString(":").uppercase()

    private fun loadTimers() {
        Box.get("/api/timerlist", ok = { data ->
            val arr = data.optJSONArray("timers")
            val l = ArrayList<Timer>()
            if (arr != null) for (i in 0 until arr.length()) {
                val o = arr.optJSONObject(i) ?: continue
                l.add(Timer(refKey(o.optString("serviceref")), o.optLong("begin"), o.optLong("end"), o.optLong("eit", -1)))
            }
            timers = l
            epg.invalidate()
        }, fail = { })
    }

    /** the timer that records this programme: the same event id, or a timer covering most of it */
    private fun timerOf(ref: String, ev: EpgEvent): Timer? {
        val key = refKey(ref)
        return timers.firstOrNull { t ->
            t.ref == key && ((ev.id >= 0 && t.eit == ev.id) || minOf(t.end, ev.end) - maxOf(t.begin, ev.begin) > (ev.end - ev.begin) / 2)
        }
    }

    private fun toggleTimer(row: Int, ev: EpgEvent) {
        val ref = epg.refAt(row) ?: return
        val t = timerOf(ref, ev)
        val done = { data: JSONObject ->
            if (data.has("result") && !data.optBoolean("result")) toast(T("Timer") + ": " + data.optString("message"))
            else toast(if (t != null) T("Timer deleted") else T("Timer added") + ": " + ev.title)
            loadTimers()
        }
        val fail = { err: String -> toast(T("Timer") + ": " + err) }
        when {
            t != null -> Box.get("/api/timerdelete", mapOf("sRef" to ref, "begin" to t.begin.toString(), "end" to t.end.toString()), ok = done, fail = fail)
            ev.end <= System.currentTimeMillis() / 1000 -> return
            ev.id < 0 -> toast(T("This programme cannot be recorded (no event id)."))
            else -> Box.get("/api/timeraddbyeventid", mapOf("sRef" to ref, "eventid" to ev.id.toString(), "justplay" to "0"), ok = done, fail = fail)
        }
    }

    private fun setEpg(b: JSONObject, l: List<JSONObject>, row: Int) {
        epgBouquet = b
        epgServices = l
        Box.prefs.edit().putString("epgBouquet", b.optString("servicereference")).apply()
        crumb.text = T("Programme guide") + " › " + b.optString("servicename")
        dTitle.text = ""
        epg.setServices(l.map { it.optString("servicereference") }, l.map { it.optString("servicename") }, row)
        epg.requestFocus()
        loadTimers()
    }

    /** at most two requests at a time */
    private fun queueEpg(ref: String) {
        if (!epgQueue.contains(ref)) epgQueue.add(ref)
        pumpEpg()
    }

    private fun pumpEpg() {
        while (epgActive < 2 && epgQueue.isNotEmpty()) {
            val ref = epgQueue.removeAt(0)
            epgActive++
            Box.get("/api/epgservice", mapOf("sRef" to ref), timeoutMs = 20000, ok = { data ->
                val ev = data.optJSONArray("events")
                val l = ArrayList<EpgEvent>()
                if (ev != null) for (i in 0 until ev.length()) {
                    val o = ev.optJSONObject(i) ?: continue
                    val b = o.optLong("begin_timestamp")
                    val d = o.optLong("duration_sec")
                    val t = o.optString("title")
                    if (b > 0 && d > 0 && t.isNotEmpty()) l.add(EpgEvent(b, b + d, t, o.optString("shortdesc"), o.optString("longdesc"), o.optLong("id", -1)))
                }
                epgActive--
                epg.setEvents(ref, l)
                pumpEpg()
            }, fail = {
                epgActive--
                epg.setEvents(ref, emptyList())
                pumpEpg()
            })
        }
    }

    private fun watchFromEpg(row: Int) {
        val b = epgBouquet ?: return
        // the channel list follows the guide, so channel up/down works during playback
        bouquet = b
        services = epgServices
        playChannel(row)
    }

    private fun epgInfo(row: Int, ev: EpgEvent) {
        val name = epgServices.getOrNull(row)?.optString("servicename") ?: ""
        val rec = epg.refAt(row)?.let { timerOf(it, ev) } != null
        AlertDialog.Builder(this, R.style.E2Dialog)
            .setTitle(ev.title)
            .setMessage("${Fmt.hm(ev.begin)}–${Fmt.hm(ev.end)} · $name" + (if (rec) "   ● " + T("Timer set") else "") + "\n\n${ev.text()}")
            .setPositiveButton(T("Watch channel")) { _, _ -> watchFromEpg(row) }
            .setNeutralButton(if (rec) T("Delete timer") else T("Record")) { _, _ -> toggleTimer(row, ev) }
            .setNegativeButton(T("Close"), null)
            .show()
    }

    // ---------------------------------------------------------------- settings

    private fun settings() {
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(48, 24, 48, 0) }
        val info = TextView(this).apply {
            text = T("IP address of the Enigma2 box (e.g. 192.168.1.10). OpenWebif must be enabled on port 80.")
            setTextColor(0xFFC9D1D9.toInt())
        }
        val edit = EditText(this).apply {
            setText(Box.host)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            setSingleLine()
            setSelection(text.length)
        }
        box.addView(info)
        box.addView(edit)
        val langAtOpen = I18n.pref()
        val lang = TextView(this).apply {
            text = T("App language") + ":  ◀ " + I18n.label() + " ▶"
            setTextColor(0xFFC9D1D9.toInt())
            setPadding(0, 24, 0, 8)
            isFocusable = true
            isClickable = true
            setBackgroundResource(android.R.drawable.list_selector_background)
        }
        val relabel = { lang.text = T("App language") + ":  ◀ " + I18n.label() + " ▶" }
        lang.setOnClickListener { I18n.cycle(1); relabel() }
        lang.setOnKeyListener { _, k, e ->
            if (e.action == KeyEvent.ACTION_DOWN && (k == KeyEvent.KEYCODE_DPAD_LEFT || k == KeyEvent.KEYCODE_DPAD_RIGHT)) {
                I18n.cycle(if (k == KeyEvent.KEYCODE_DPAD_LEFT) -1 else 1); relabel(); true
            } else false
        }
        box.addView(lang)
        AlertDialog.Builder(this, R.style.E2Dialog)
            .setTitle(T("Settings – E2TVPlayer ") + BuildConfigCompat.version(this))
            .setView(box)
            .setPositiveButton(T("Save")) { _, _ -> setHost(edit.text.toString()) }
            .setNeutralButton(T("Find box")) { _, _ -> findBox(first = false) }
            .setNegativeButton(T("Cancel"), null)
            .setOnDismissListener { if (I18n.pref() != langAtOpen && I18n.cur() != langCur) recreate() }
            .show()
    }

    private fun setHost(h: String) {
        val v = h.trim().removePrefix("http://").trimEnd('/')
        if (v.isEmpty()) return
        Box.host = v
        root = null; dir = null; movieData = null; remember.clear()
        bouquets = emptyList(); bouquet = null; services = emptyList()
        refreshStatus()
        if (mode == "movies") showMovies() else showChannels()
    }

    private fun findBox(first: Boolean) {
        setBusy(true)
        crumb.text = T("Searching for the box on the network…")
        Box.discover(this) { found ->
            setBusy(false)
            when {
                found.size == 1 -> { toast(T("Box found: ") + found[0]); setHost(found[0]) }
                found.size > 1 -> AlertDialog.Builder(this, R.style.E2Dialog)
                    .setTitle(T("Choose a box"))
                    .setItems(found.toTypedArray()) { _, w -> setHost(found[w]) }
                    .show()
                else -> {
                    crumb.text = ""
                    AlertDialog.Builder(this, R.style.E2Dialog)
                        .setTitle(T("Box not found"))
                        .setMessage(T("No box with the E2TVPlayer plugin was found on the network. Enter the address manually."))
                        .setPositiveButton(T("Enter address")) { _, _ -> settings() }
                        .setNegativeButton(if (first) T("Close") else T("Cancel"), null)
                        .show()
                }
            }
        }
    }

    private fun toast(msg: String) = android.widget.Toast.makeText(this, msg, android.widget.Toast.LENGTH_LONG).show()

    // ---------------------------------------------------------------- keys

    private fun activate(pos: Int) {
        val r = adapter.rows.getOrNull(pos) ?: return
        when (r.type) {
            "up" -> upDir()
            "dir" -> openDir(r.path)
            "movie" -> { remember[dir ?: ""] = pos; playMovie(r) }
            "bouquet" -> bouquets.firstOrNull { it.optString("servicereference") == r.ref }?.let { openBouquet(it) }
            "service" -> playChannel(pos)
        }
    }

    private fun longPress(pos: Int) {
        val r = adapter.rows.getOrNull(pos) ?: return
        if (r.type == "movie") movieMenu(r)
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_BACK) {
            if (event.action == KeyEvent.ACTION_UP) back()
            return true
        }
        // ▲ from the top row of the list: always to the active tab (not the nearest)
        if (event.keyCode == KeyEvent.KEYCODE_DPAD_UP && event.action == KeyEvent.ACTION_DOWN &&
            list.hasFocus() && currentIndex() == 0) {
            (if (mode == "movies") tabRec else tabCh).requestFocus()
            return true
        }
        // colour keys and the menu key of the TV remote on devices that have them
        if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) {
            val pos = currentIndex()
            when (event.keyCode) {
                KeyEvent.KEYCODE_PROG_RED, KeyEvent.KEYCODE_MEDIA_RECORD -> {
                    if (mode == "epg") { epg.selected?.let { toggleTimer(epg.row, it) }; return true }
                    adapter.rows.getOrNull(pos)?.takeIf { it.type == "movie" }?.let { confirmDelete(it) }
                    return true
                }
                KeyEvent.KEYCODE_PROG_GREEN -> { toggleSort(); return true }
                KeyEvent.KEYCODE_PROG_YELLOW -> {
                    when (mode) { "movies" -> showChannels(); "channels" -> showEpg(); else -> showMovies() }
                    return true
                }
                KeyEvent.KEYCODE_PROG_BLUE, KeyEvent.KEYCODE_SETTINGS -> { settings(); return true }
                KeyEvent.KEYCODE_MENU -> { if (list.hasFocus()) { longPress(pos); return true } }
                KeyEvent.KEYCODE_MEDIA_PLAY, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> { if (list.hasFocus()) { activate(pos); return true } }
            }
        }
        return super.dispatchKeyEvent(event)
    }

    private fun back() {
        val focusInList = list.hasFocus()
        when {
            mode == "movies" && dir != null && dir != root -> upDir()
            mode == "channels" && bouquet != null && bouquets.size > 1 -> renderBouquets()
            mode == "channels" -> showMovies()
            mode == "epg" -> showChannels()
            !focusInList && adapter.rows.isNotEmpty() -> setRows(adapter.rows, 0, "")
            else -> confirmExit()
        }
    }

    private fun confirmExit() {
        AlertDialog.Builder(this, R.style.E2Dialog)
            .setTitle(T("Quit E2TVPlayer?"))
            .setPositiveButton(T("Yes")) { _, _ -> finish() }
            .setNegativeButton(T("No"), null)
            .show()
    }

    // ---------------------------------------------------------------- list

    inner class RowAdapter : RecyclerView.Adapter<RowAdapter.VH>() {
        var rows: List<Row> = emptyList()

        inner class VH(v: View) : RecyclerView.ViewHolder(v) {
            val ic: TextView = v.findViewById(R.id.ic)
            val t: TextView = v.findViewById(R.id.t)
            val s: TextView = v.findViewById(R.id.s)
            val r: TextView = v.findViewById(R.id.right)
            val r2: TextView = v.findViewById(R.id.right2)
            val bar: View = v.findViewById(R.id.bar)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val v = LayoutInflater.from(parent.context).inflate(R.layout.item_row, parent, false)
            val vh = VH(v)
            v.setOnClickListener { activate(vh.bindingAdapterPosition) }
            v.setOnLongClickListener { longPress(vh.bindingAdapterPosition); true }
            v.setOnFocusChangeListener { _, has ->
                if (has) details(rows.getOrNull(vh.bindingAdapterPosition))
                vh.t.setTextColor(if (has) 0xFFFFFFFF.toInt() else if (rows.getOrNull(vh.bindingAdapterPosition)?.type in setOf("dir", "up", "bouquet")) 0xFFFFD479.toInt() else 0xFFE6E6E6.toInt())
            }
            return vh
        }

        override fun onBindViewHolder(h: VH, pos: Int) {
            val r = rows[pos]
            h.ic.text = r.icon
            h.t.text = r.title
            h.s.text = r.sub
            h.s.visibility = if (r.sub.isEmpty()) View.GONE else View.VISIBLE
            h.r.text = r.right
            h.r2.text = r.right2
            val isDir = r.type == "dir" || r.type == "up" || r.type == "bouquet"
            h.t.setTextColor(if (h.itemView.hasFocus()) 0xFFFFFFFF.toInt() else if (isDir) 0xFFFFD479.toInt() else 0xFFE6E6E6.toInt())
            val lp = h.bar.layoutParams
            val full = (h.itemView.width.takeIf { it > 0 } ?: list.width) - (h.bar.left.takeIf { it > 0 } ?: 80) - 120
            lp.width = if (r.progress > 0) maxOf(4, (full * r.progress).toInt()) else 0
            h.bar.layoutParams = lp
            h.bar.visibility = if (r.progress > 0) View.VISIBLE else View.GONE
        }

        override fun getItemCount() = rows.size
    }
}

object BuildConfigCompat {
    fun version(a: Activity): String = try {
        a.packageManager.getPackageInfo(a.packageName, 0).versionName ?: ""
    } catch (_: Exception) { "" }
}
