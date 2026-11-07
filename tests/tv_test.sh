#!/bin/sh
# Emulaattoritesti: asentaa APK:n, antaa sovelluksen löytää simuloidun boksin (10.0.2.2),
# toistaa tallenteen ja live-kanavan ja ottaa kuvakaappaukset.
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
shot 01_haku 2
shot 02_lista 14                     # boksin haku lähiverkosta
key KEYCODE_DPAD_DOWN                # Sarjat -> Testitallenne
shot 03_tiedot
key KEYCODE_DPAD_CENTER              # toista
shot 04_toisto 6
longok                               # pitkä OK: ääni ja tekstitys
shot 05_valikko
key KEYCODE_DPAD_DOWN                # Tekstitys-rivi
key KEYCODE_DPAD_RIGHT               # pois -> suomi
shot 06_valikko_suomi
key KEYCODE_DPAD_DOWN                # Äänen purku -rivi + ääniraitojen diagnostiikka
shot 06b_aanen_purku
key KEYCODE_DPAD_UP
key KEYCODE_DPAD_UP                  # Ääni-rivi
key KEYCODE_DPAD_RIGHT               # vaihda ääniraita (fin E-AC-3 -> swe AAC)
shot 06c_aaniraita
key KEYCODE_BACK
shot 07_tekstitys 2
key KEYCODE_BACK                     # listaan ja uudelleen alusta: tallennettu kieli kytkee tekstityksen
key KEYCODE_DPAD_CENTER
shot 07b_tekstitys_alusta 5
shot 07c_tekstitys_10s 4
longok                               # kuvakaappaus: valikko -> 4. rivi -> OK, 10 s viive
key KEYCODE_DPAD_UP                  # ylös kiertää viimeiselle riville (Kuvakaappaus)
shot 07d_kuvakaappaus_valikko 0
key KEYCODE_DPAD_CENTER
sleep 13
ls -la "$OUT"/kuvakaappaus_* 2>/dev/null
key KEYCODE_DPAD_RIGHT               # +15 s
shot 08_kelaus 1
key KEYCODE_DPAD_CENTER              # tauko + tiedot
shot 09_tauko 2
longok                               # kuvakaappaus käyntiin tauolla...
key KEYCODE_DPAD_UP
key KEYCODE_DPAD_CENTER
key KEYCODE_BACK                     # ...ja heti takaisin listaan: kuva otetaan listasta
shot 10_paluu 2
sleep 11
ls -la "$OUT"/kuvakaappaus_* 2>/dev/null
key KEYCODE_DPAD_UP
key KEYCODE_DPAD_UP                  # välilehdet (aktiivinen: Tallenteet)
shot 10b_valilehdet 0
key KEYCODE_DPAD_RIGHT               # Kanavat
key KEYCODE_DPAD_CENTER
shot 11_kanavat 3
key KEYCODE_DPAD_CENTER              # live
shot 12_live 10
key KEYCODE_DPAD_CENTER              # ohjelmatiedot
shot 13_live_info 2
key KEYCODE_DPAD_CENTER
longok
shot 14_live_valikko
key KEYCODE_BACK
key KEYCODE_DPAD_DOWN                # kanava +1
shot 15_zap 6
key KEYCODE_BACK
shot 16_kanavalista 2
key KEYCODE_BACK                     # nippuja vain yksi -> tallenteet
key KEYCODE_BACK                     # lopetuskysely
shot 17_lopetus 2
adb logcat -d > "$OUT/logcat.txt"
grep -E "FATAL|ExoPlayerImpl|E2TVPlayer|PlaybackException|Ffmpeg|ffmpeg|AudioTrack: |DefaultAudioSink" "$OUT/logcat.txt" | head -80 > "$OUT/logcat_tarkeat.txt"
exit 0
