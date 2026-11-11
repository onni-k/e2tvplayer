# E2TVPlayer agent notes

Recordings and live TV of an Enigma2 box (OpenWebif) on TVs. One repository, four parts that ship
together: the box plugin serves the Samsung apps and carries the Google TV APK. Trunk is `main`;
CI pushes build results to the `builds` branch (never commit to it by hand).

Versions are not repeated here; read them where they are set:

- App version: `VERSION` in `enigma2/src/E2TVPlayer/web.py` and `<ver>` in
  `enigma2/src/E2TVPlayer/widget/config.xml` (bump both, same number). The APK reads its version
  from `web.py` (`android/app/build.gradle.kts`); Tizen turns `0.1.021` into `0.1.21`.
- Android: AGP, Kotlin, Media3 and SDK levels in `android/app/build.gradle.kts` and
  `android/build.gradle.kts`; Gradle in `android/gradle/wrapper/gradle-wrapper.properties`.
- JDK and other CI tools: `.github/workflows/build.yml`.

## Where things are

- `enigma2/src/E2TVPlayer/` — box plugin (Python 3, Twisted resources under OpenWebif).
  `web.py` (all HTTP routes, Samsung zip/widgetlist, Tizen .wgt, logs), `subs.py` (DVB subtitles of
  recordings → PNG), `live.py` (live relay + subtitles), `shots.py` (screenshots, data folders),
  `info.py` (instructions page = plugin screen, .po reader), `langtest.py` (Orsay language test
  apps), `plugin.py` (Enigma2 entry). `enigma2/src/External/` is the OpenWebif hook.
- `enigma2/src/E2TVPlayer/widget/` — the Samsung web app, shared by Orsay (2011–2014) and Tizen.
  `js/util.js` (I18n + translation data, helpers, Store), `api.js`, `listview.js`, `player.js`,
  `subs.js`, `views.js` (recordings, channels, programme guide, settings), `main.js` (start-up, keys).
- `enigma2/src/E2TVPlayer/tizen/` — Tizen package: `tizen-shim.js` (Orsay APIs on AVPlay),
  `loader.js` (loads the app code from the box, falls back to the packaged copy), `config.xml`.
- `android/app/src/main/java/fi/e2tvplayer/` — Google TV app (Kotlin, Media3 ExoPlayer, FFmpeg
  audio). `MainActivity` (lists, guide tab), `EpgGridView` (guide grid), `PlayerActivity`, `Box`
  (OpenWebif HTTP, formatting), `I18n`, `Shots`.
- `po/` — translations; `tools/i18n.py` generates the app data (see **Translations**).
- `tests/web/` — jsdom tests of the Samsung apps; `tests/fake_box.py` + `tests/tv_test.sh` —
  emulator test of the Google TV app against a simulated box.
- `docs/` — design notes. Read the one for the area you touch:
  [`samsung-orsay.md`](docs/samsung-orsay.md) (platform traps learned the hard way),
  [`programme-guide.md`](docs/programme-guide.md).

## Code rules

- **Samsung web app is ES5** (Orsay Maple 2012 WebKit, oldest Tizen): no `let`/`const`, arrow
  functions, template strings, classes. `tests/web/es5check.js` enforces it.
- **New web code goes into the existing files.** Tizen apps installed before 0.1.012 load a fixed
  list (`util, api, listview, player, subs, views, main`); a new file would never load there.
  The Tizen `index.html` comes from the installed package, so new DOM is created in JS.
- **Orsay plugins:** only `PLAYER`, `TVMW` and `NNAVI` may be written out in the widget files; an
  update that mentioned the TV or SEF plugin was silently dropped by User App Sync (the test fails
  otherwise). Details in `docs/samsung-orsay.md`.
- **Translatable text** is English and wrapped: `T("...")` (JS, Kotlin, Python) or `N("...")` for
  text translated later (table values). Never build a sentence from translated pieces when one
  string will do. Box texts use `info.T()`.
- Python must import on the box without OpenWebif/Enigma2 extras: import Enigma2 modules inside
  functions and wrap them in `try`.
- Comments explain what the code cannot (a platform quirk, a measured value), not the change.
- New source files get the SPDX header: `SPDX-License-Identifier: GPL-3.0-or-later`.

## Translations

The source language is English; `po/fi.po` and `po/sv.po` hold Finnish and Swedish.

```
python3 tools/i18n.py update            # after changing texts: updates .pot/.po and the app data
python3 tools/i18n.py new de Deutsch    # new language
python3 tools/i18n.py check             # CI: fails if the generated data is out of date
```

`update` writes the `I18N-DATA` block of `widget/js/util.js` and
`android/app/src/main/assets/i18n.json` — do not edit them by hand. Every new string needs a
Finnish and a Swedish translation in the same change.

## Tests

| What you changed | Test |
| --- | --- |
| Samsung web app (Orsay/Tizen) | `cd tests/web && npm install && npm test` (also builds a .wgt and runs the loader) |
| Box Python | the web tests import it; run the affected code with stub `Components` modules as the tests do |
| Google TV app | CI `tv-test` job (emulator + `tests/fake_box.py`); add a step and a screenshot to `tests/tv_test.sh` |

`tests/test.ts` is only 30 s long: in `tests/tv_test.sh`, pause playback around long sequences of
menu steps, or the player finishes and the rest of the run happens outside the app.

Tests that drive keys check the visible result (text, classes, requests made), not internal state
only. There is no local Android SDK in cloud sessions: Kotlin is proven by the CI build and the
emulator job; say so when you report.

## Build and CI

GitHub Actions (`.github/workflows/build.yml`) on every push to `main`:

1. `build` — APK, box `.ipk` (APK included) and `.wgt`.
2. `web-test` — translations check + jsdom tests.
3. `tv-test` — emulator run with screenshots.
4. Results (`dist/`, `shots/`) are force-pushed to the `builds` branch:
   `git fetch -f origin builds:refs/remotes/origin/builds`.

A `v*` tag makes a release. GitHub downloads sometimes fail with 5xx; re-run the failed jobs.

Local builds: `sh enigma2/build_ipk.sh` (box package), `cd android && ./gradlew assembleRelease`.
The Android signing key `android/e2tvplayer.keystore` is in the repository on purpose, so that
updates install over the old APK.

## Before you push

1. Bump the version (both places, see the top) for anything that reaches a device.
2. `python3 tools/i18n.py update` and translate new strings (fi, sv).
3. `npm test` in `tests/web`.
4. Add a line to `CHANGELOG.md` for user-visible changes (`NEW:`, `UPD:`, `FIX:`).
5. Commit messages: a one-line header, then terse bullets of what changed and why. Do not claim
   a check passed that did not run.

## Devices it has been verified on

Samsung UE40H6275 (Orsay, T-INFOLINK2014), Samsung UE50AU7175 (Tizen 6.0), Chromecast with
Google TV (Android 14), OpenViX box. The box start-up log (`/e2tvplayer/logs`) shows what each
TV reported; ask the user for it rather than guessing platform behaviour.
