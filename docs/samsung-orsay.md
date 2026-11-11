# Samsung Orsay (2011–2014) — platform notes

What the old Samsung Smart TV platform does that is not documented, measured on a UE40H6275
(firmware T-INFOLINK2014-1042, Maple 2012 WebKit). Keep this file up to date when a device teaches
us something new; the box log (`/e2tvplayer/logs`) is the source.

## Installing: User App Sync

- The TV fetches `http://<box>/widgetlist.xml` (port 80 only) and then every zip listed in it.
  The box logs both (`update samsung-sync ...`).
- The TV must be logged in as `develop`, have the box IP set, and usually needs a restart before a
  new version shows. On the UE40H6275 the login and the IP have to be given again before each sync.
- An app the installer rejects simply disappears from the list; nothing is reported anywhere.
- Apps that are no longer listed in `widgetlist.xml` are removed at the next sync.

## Plugins

- 0.1.016 (TV and SEF plugin objects in `index.html`) and 0.1.017 (the same class ids as strings in
  `util.js`) were both dropped at sync, although a separate new app (`E2LangTestB`) using the same
  plugins installed fine. The exact rule is unknown (a file scan, or an update not being allowed to
  add plugins). So the widget files only write out `PLAYER`, `TVMW` and `NNAVI`
  (`tests/web/es5check.js` checks it), and the TV plugin is created at run time
  (`I18n.tvPlugin()` in `util.js`), with a box switch to turn it off (`/e2tvplayer/langtest?tv=0`).
- Hidden plugin objects use `width:0; height:0`, never `display:none` (Maple may not initialise them).

## TV menu language

Measured with the language test apps (`langtest.py`; `/e2tvplayer/langtest?on=1` installs them):

| Source | Finnish | Swedish | English |
| --- | --- | --- | --- |
| TV plugin `GetLanguage()` (also SEF `TV` module) | 10 | 25 | 17 |
| TVMW `GetLanguage()` | 17 | 17 | 17 (does not follow the menu; region?) |
| TVMW `GetCountry()` / TV `GetCountry()` | 25 / 26 | same | same |
| NNavi, `pluginAPI`, `Common.API.*`, `curWidget` | no `GetLanguage` | | |
| `navigator.language` | `c` | `c` | `c` |

Other numbers of the TV plugin are unknown; an unknown value falls back to the stored value of the
previous start, then to TVMW (Finnish), then to English. The raw values are in the start-up log
line (`lang=tv=10 ...`) and in the TOOLS menu, so a new language can be added from one log line.

## Video and subtitles

- The Player plugin uses 960×540 coordinates; the app runs at 1280×720 and some TVs scale it down.
- The player does not show DVB subtitles of a TS stream played over HTTP: the box renders them into
  PNG images (`subs.py`, `live.py`) and the app draws them over the video.
- The Player may report time from the stream PTS; `Player.onTime` detects and removes the offset.
