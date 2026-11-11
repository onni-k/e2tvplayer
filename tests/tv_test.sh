#!/bin/sh
# Emulator test: installs the APK, lets the app find the simulated box (10.0.2.2),
# plays a recording and a live channel and takes screenshots.
set -x
OUT=${OUT:-shots}
mkdir -p "$OUT"
APK=$(ls apk/*.apk | head -1)
shot() { sleep "${2:-1}"; adb exec-out screencap -p > "$OUT/$1.png"; }
key() { adb shell input keyevent "$@"; sleep 0.8; }
longok() { adb shell input keyevent --longpress KEYCODE_DPAD_CENTER; sleep 1.2; }

adb logcat -c
adb install -r "$APK" || exit 1
adb shell am start -W -n fi.e2tvplayer/.MainActivity
shot 01_search 2
shot 02_list 14                      # box discovery on the local network
key KEYCODE_DPAD_DOWN                # Series -> Test recording
shot 03_details
key KEYCODE_DPAD_CENTER              # play
shot 04_playback 6
key KEYCODE_MEDIA_PAUSE              # the test recording is only 30 s: pause while in the menu
longok                               # long OK: audio and subtitles
shot 05_menu
key KEYCODE_DPAD_DOWN                # subtitles row
key KEYCODE_DPAD_RIGHT               # off -> Finnish
shot 06_menu_finnish
key KEYCODE_DPAD_DOWN                # audio decoding row + audio track diagnostics
shot 06b_audio_decoding
key KEYCODE_DPAD_UP
key KEYCODE_DPAD_UP                  # audio row
key KEYCODE_DPAD_RIGHT               # change the audio track (fin E-AC-3 -> swe AAC)
shot 06c_audio_track
key KEYCODE_DPAD_DOWN
key KEYCODE_DPAD_DOWN
key KEYCODE_DPAD_DOWN                # language row
shot 06d_language_row
key KEYCODE_BACK
key KEYCODE_MEDIA_PLAY
shot 07_subtitles 2
key KEYCODE_BACK                     # back to the list and again from the start: the stored language turns subtitles on
key KEYCODE_DPAD_CENTER
shot 07b_subtitles_start 5
shot 07c_subtitles_10s 4
longok                               # screenshot: menu -> last row -> OK, 10 s delay
key KEYCODE_DPAD_UP                  # up wraps to the last row (Screenshot)
shot 07d_screenshot_menu 0
key KEYCODE_DPAD_CENTER
sleep 13
ls -la "$OUT"/screenshot_* 2>/dev/null
key KEYCODE_DPAD_RIGHT               # +15 s
shot 08_seek 1
key KEYCODE_DPAD_CENTER              # pause + info
shot 09_pause 2
longok                               # start a screenshot while paused...
key KEYCODE_DPAD_UP
key KEYCODE_DPAD_CENTER
key KEYCODE_BACK                     # ...and go straight back to the list: the list is captured
shot 10_back 2
sleep 11
ls -la "$OUT"/screenshot_* 2>/dev/null
key KEYCODE_DPAD_UP
key KEYCODE_DPAD_UP                  # tabs (active: Recordings)
shot 10b_tabs 0
key KEYCODE_DPAD_RIGHT               # Channels
key KEYCODE_DPAD_CENTER
shot 11_channels 3
key KEYCODE_DPAD_CENTER              # live
shot 12_live 10
key KEYCODE_DPAD_CENTER              # programme info
shot 13_live_info 2
key KEYCODE_DPAD_CENTER
longok
shot 14_live_menu
key KEYCODE_BACK
key KEYCODE_DPAD_DOWN                # channel +1
shot 15_zap 6
key KEYCODE_BACK
shot 16_channel_list 2
key KEYCODE_PROG_YELLOW              # yellow: channels -> programme guide
shot 16b_guide 4
key KEYCODE_DPAD_RIGHT               # next programme
key KEYCODE_DPAD_DOWN                # next channel
shot 16c_guide_move 2
key KEYCODE_DPAD_RIGHT
key KEYCODE_PROG_RED                 # red: timer for the selected programme
shot 16c2_guide_timer 2
key KEYCODE_DPAD_CENTER              # coming programme: info dialog (Delete timer)
shot 16d_guide_info 1
key KEYCODE_BACK
key KEYCODE_BACK                     # guide -> channels
key KEYCODE_BACK                     # only one bouquet -> recordings
key KEYCODE_BACK                     # quit dialog
shot 17_quit 2
adb logcat -d > "$OUT/logcat.txt"
grep -E "FATAL|ExoPlayerImpl|E2TVPlayer|PlaybackException|Ffmpeg|ffmpeg|AudioTrack: |DefaultAudioSink" "$OUT/logcat.txt" | head -80 > "$OUT/logcat_important.txt"
exit 0
