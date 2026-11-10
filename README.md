# E2TVPlayer

Watch the recordings and live TV of an Enigma2 box (OpenViX etc.), with subtitles, on your television through OpenWebif.

| Part | Directory | What |
|---|---|---|
| Box plugin | `enigma2/` | OpenWebif extension (Python 3). Serves the TV apps, extracts DVB subtitles for Samsung TVs and relays live TV. |
| Samsung Smart TV 2011–2014 (Orsay) | `enigma2/src/E2TVPlayer/widget/` | HTML/JS app that the box serves to the *User App Sync* of the TV's developer mode. |
| Samsung Tizen (2015–) | `enigma2/src/E2TVPlayer/tizen/` | The same HTML/JS app on the Tizen player (AVPlay). The box builds the package `/e2tvplayer/E2TVPlayer.wgt` on the fly, with its address included. |
| Google TV / Android TV | `android/` | Kotlin + Media3 ExoPlayer. Plays TS recordings and live channels; DVB subtitles and audio tracks straight from the stream. |

GitHub Actions builds the APK and the box `.ipk` package (with the APK included) on every push. A `v*` tag makes a release.

## Languages

The source language is English. Translations are in the `po/` folder (`fi.po` Finnish, `sv.po` Swedish).

- TV apps: the language is chosen in the TOOLS menu (Google TV: long OK or Settings). The default is *automatic*,
  which follows the TV language; a language without a translation falls back to English.
- Box pages and the plugin screen follow the Enigma2 system language.

To add a language:

```
python3 tools/i18n.py new de Deutsch     # creates po/de.po
# translate po/de.po (e.g. with Poedit)
python3 tools/i18n.py update             # regenerates the app data
```

`update` also adds new texts from the code to every .po file. CI fails if the generated data is out of date.
In the code, translatable texts are written as `T("...")` (or `N("...")` to mark a text that is translated later).

## Installing on the box

```
opkg install /tmp/enigma2-plugin-extensions-e2tvplayer_<version>_all.ipk
```
Restart the GUI. The package replaces the old `enigma2-plugin-extensions-e2samsungtv` package.
**Plugins → E2TVPlayer** shows the same instructions as the browser page `http://<box>/e2tvplayer/`, the box IP and
warnings if OpenWebif is not on port 80 or login is turned on.

## Google TV / Android TV

1. Install **Downloader** (AFTVnews) from Google Play and allow it to install unknown apps
   (Settings → System → About → press *Android TV OS build* 7 times → Settings → Apps →
   Security & restrictions → Unknown sources → Downloader).
2. Enter `<box IP>/e2tvplayer` in Downloader and choose **Download E2TVPlayer.apk**.
3. The app finds the box on the local network by itself; the address can also be entered in Settings.

| Key | List | Recording | Live |
|---|---|---|---|
| OK | play | pause + programme info | programme info |
| long OK | menu (delete, from start, sort) | audio, subtitles, language, screenshot | audio, subtitles, language, screenshot |
| ◀ ▶ | – | −/+ 15 s | – |
| ▲ ▼ | move, tabs at the top | +/− 5 min | channel |
| BACK | parent folder / quit dialog | stop (position is saved) | stop |

The chosen subtitle and audio languages are remembered. Colour keys, MENU and INFO work on TVs that have them.

## Samsung Tizen (2015–)

1. TV: Apps → press **1 2 3 4 5** on the remote → Developer mode **On**, Host PC IP = your computer's IP → restart the TV.
2. Download `http://<box>/e2tvplayer/E2TVPlayer.wgt`.
3. Install it with the [Samsung Jellyfin Installer](https://github.com/Jellyfin2Samsung/Samsung-Jellyfin-Installer)
   (custom .wgt). It logs in to a Samsung account and signs the package for the TV.

Keys and functions as on the old Samsung (TOOLS = audio, subtitles, language and screenshot; INFO = programme info).
Subtitles are extracted on the box as for the old Samsung, because the Tizen player does not show DVB subtitles.
The app code is loaded from the box, so updating the box plugin updates the app (restart the app).

## Samsung Smart TV (2011–2014)

1. TV: Menu → Smart Hub → Samsung Account → Log in, user `develop` (password empty or `000000`).
2. Smart Hub → hold OK on any app → **IP Setting** → the box IP.
3. Hold OK again → **Start User App Sync**, then restart the TV.

| Key during playback | Function |
|---|---|
| OK / ▶❚❚ | pause / resume |
| ◀ ▶ / ▲ ▼ / ◀◀ ▶▶ | 15 s / 5 min / 1 min |
| INFO | programme info |
| TOOLS | audio / subtitles / timing / language / screenshot |
| RETURN / EXIT | back to the list; in the list, quit dialog |

The Samsung player does not show DVB subtitles, so the box renders them into images (`subs.py` for recordings,
`live.py` for the live relay `/e2tvplayer/live`) and the app draws them over the video.

## Data on the box

| Path | |
|---|---|
| `/media/hdd/e2tvplayer/screenshots` | screenshots taken from the TOOLS menu |
| `/media/hdd/e2tvplayer/subtitles` | extracted subtitles of recordings (removed when the recording is deleted) |
| `/media/hdd/e2tvplayer/e2tvplayer.log` | log of the TV apps: start-up (device, version, language) and updates (Samsung sync, package downloads) |

Without `/media/hdd` the folders are under `/tmp`. Folders from older versions are renamed or removed automatically.

## Box HTTP addresses

| Address | |
|---|---|
| `/e2tvplayer/` | instructions |
| `/widgetlist.xml`, `/e2tvplayer/E2Tallenteet.zip` | Samsung Orsay app |
| `/e2tvplayer/E2TVPlayer.wgt` | Samsung Tizen app |
| `/e2tvplayer/E2TVPlayer.apk` | Google TV app |
| `/e2tvplayer/info` | discovery (box search of the apps) |
| `/e2tvplayer/web/…` | app code for Tizen |
| `/e2tvplayer/subs`, `/subimg` | subtitles of recordings (Samsung) |
| `/e2tvplayer/live`, `/livesubs`, `/liveimg` | live relay and its subtitles (Samsung) |
| `/e2tvplayer/screenshot` (POST), `/shots`, `/shot/<name>` | screenshots |
| `/e2tvplayer/log` (`?m=`), `/logs` | start-up log entries of the apps, log view |
| `/e2tvplayer/E2LangTestA.zip`, `E2LangTestB.zip`, `/langtest?on=0\|1` | Orsay language test apps (off by default; `?on=1` installs them with User App Sync) and `?tv=0\|1` for the TV plugin language |

The old path `/e2samsungtv/` still works so that an old installed Samsung app keeps working.

## Building

- Box package: `sh enigma2/build_ipk.sh` (the APK is included if `E2TVPLAYER_APK` points to it).
- APK: `cd android && ./gradlew assembleRelease` (JDK 17 + Android SDK 34). The signing key
  `android/e2tvplayer.keystore` is in the repository so that updates install over the old version.
- Tests: `cd tests/web && npm install && npm test` (Samsung apps in jsdom); `tests/tv_test.sh` runs the
  Google TV app in an emulator against `tests/fake_box.py`.

## License

E2TVPlayer is free software: you can redistribute it and/or modify it under the terms of the
GNU General Public License as published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version. See [LICENSE](LICENSE) and
<https://www.gnu.org/licenses/gpl-3.0.html>.

`SPDX-License-Identifier: GPL-3.0-or-later`

Third-party components and their licenses (all compatible with GPL v3):

| Component | Use | License |
|---|---|---|
| [html2canvas](https://html2canvas.hertzen.com) 1.4.1 | Tizen screenshots (`enigma2/src/E2TVPlayer/widget/lib/`) | MIT |
| [AndroidX Media3 / ExoPlayer](https://github.com/androidx/media) | Google TV player | Apache-2.0 |
| [Jellyfin media3-ffmpeg-decoder](https://github.com/jellyfin/jellyfin-androidx-media) | Google TV audio decoding (FFmpeg) | Apache-2.0 / FFmpeg LGPL-2.1+ |
| AndroidX RecyclerView, Annotation | Google TV user interface | Apache-2.0 |
