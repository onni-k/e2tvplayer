#!/bin/sh
# Rakentaa enigma2-plugin-extensions-e2tvplayer_<versio>_all.ipk
# Jos ../android/app/build/outputs/apk/release/E2TVPlayer.apk (tai E2TVPLAYER_APK) on olemassa,
# se liitetään pakettiin, jolloin boksi jakaa Google TV -sovelluksen osoitteessa /e2tvplayer/E2TVPlayer.apk
set -e
cd "$(dirname "$0")"
VERSION=$(sed -n 's/^VERSION = "\(.*\)"/\1/p' src/E2TVPlayer/web.py)
PKG=enigma2-plugin-extensions-e2tvplayer
OUT="${OUT:-$PWD/dist}"
WORK=$(mktemp -d)
PLUG=usr/lib/enigma2/python/Plugins/Extensions

mkdir -p "$WORK/data/$PLUG/E2TVPlayer" "$WORK/data/$PLUG/WebInterface/WebChilds/External" "$WORK/control" "$OUT"
cp -r src/E2TVPlayer/. "$WORK/data/$PLUG/E2TVPlayer/"
cp src/External/e2tvplayer.py "$WORK/data/$PLUG/WebInterface/WebChilds/External/"
APK="${E2TVPLAYER_APK:-../android/app/build/outputs/apk/release/E2TVPlayer.apk}"
if [ -f "$APK" ]; then
	mkdir -p "$WORK/data/$PLUG/E2TVPlayer/android"
	cp "$APK" "$WORK/data/$PLUG/E2TVPlayer/android/E2TVPlayer.apk"
	echo "$VERSION" > "$WORK/data/$PLUG/E2TVPlayer/android/version.txt"
	echo "APK mukana: $APK"
fi
find "$WORK/data" -name '__pycache__' -prune -exec rm -rf {} + -o -name '*.py[co]' -exec rm -f {} +

cat > "$WORK/control/control" <<EOC
Package: $PKG
Version: $VERSION
Architecture: all
Section: extra
Priority: optional
Maintainer: okumpune <okumpune@gmail.com>
Depends: enigma2-plugin-extensions-openwebif
License: GPL-3.0-or-later
Replaces: enigma2-plugin-extensions-e2samsungtv
Conflicts: enigma2-plugin-extensions-e2samsungtv
Description: E2TVPlayer - recordings and live TV with subtitles on Samsung Smart TV (Orsay) and Google TV via OpenWebif.
 Serves /widgetlist.xml for the Samsung developer-mode app sync and the Android TV APK.
EOC

cat > "$WORK/control/preinst" <<'EOC'
#!/bin/sh
# vanha nimi (E2SamsungTV) pois, jos se on asennettu ilman paketinhallintaa
rm -rf /usr/lib/enigma2/python/Plugins/Extensions/E2SamsungTV
rm -f /usr/lib/enigma2/python/Plugins/Extensions/WebInterface/WebChilds/External/e2samsungtv.py*
exit 0
EOC
cat > "$WORK/control/postinst" <<'EOC'
#!/bin/sh
echo "E2TVPlayer asennettu. Käynnistä GUI uudelleen, jotta OpenWebif ottaa sen käyttöön."
exit 0
EOC
cat > "$WORK/control/postrm" <<'EOC'
#!/bin/sh
rm -f /usr/lib/enigma2/python/Plugins/Extensions/WebInterface/WebChilds/External/e2tvplayer.py[co]
rm -rf /usr/lib/enigma2/python/Plugins/Extensions/E2TVPlayer
exit 0
EOC
chmod 755 "$WORK/control/preinst" "$WORK/control/postinst" "$WORK/control/postrm"

echo "2.0" > "$WORK/debian-binary"
( cd "$WORK/control" && tar --owner=0 --group=0 -czf ../control.tar.gz ./ )
( cd "$WORK/data" && tar --owner=0 --group=0 -czf ../data.tar.gz ./ )
rm -f "$OUT/${PKG}_${VERSION}_all.ipk"
( cd "$WORK" && ar -crf "$OUT/${PKG}_${VERSION}_all.ipk" debian-binary control.tar.gz data.tar.gz )
rm -rf "$WORK"
echo "$OUT/${PKG}_${VERSION}_all.ipk"
