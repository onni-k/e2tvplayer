# E2TVPlayer

Enigma2-boksin (OpenViX ym.) tallenteet ja live-TV tekstityksineen televisioon OpenWebifin kautta.

| Osa | Hakemisto | Mitä |
|---|---|---|
| Boksin lisäosa | `enigma2/` | OpenWebif-laajennus (Python 3). Jakaa TV-sovellukset, purkaa DVB-tekstitykset Samsungille ja välittää live-kuvan. |
| Samsung Smart TV 2011–2014 (Orsay) | `enigma2/src/E2TVPlayer/widget/` | HTML/JS-sovellus, jonka boksi jakaa TV:n developer-tilan *User App Sync* -toiminnolle. |
| Samsung Tizen (2015–) | `enigma2/src/E2TVPlayer/tizen/` | Sama HTML/JS-sovellus Tizenin soittimella (AVPlay). Boksi rakentaa paketin `/e2tvplayer/E2TVPlayer.wgt` lennossa, osoite valmiina. |
| Google TV / Android TV | `android/` | Kotlin + Media3 ExoPlayer. Toistaa TS-tallenteet ja live-kanavat; DVB-tekstitykset ja ääniraidat suoraan virrasta. |

GitHub Actions rakentaa jokaisesta pushista APK:n ja boksin `.ipk`-paketin (APK mukana). Tagi `v*` tekee julkaisun.

## Kieli / Language

TV-sovellukset ovat suomeksi ja englanniksi. Kieli valitaan TOOLS-valikosta (Google TV: pitkä OK tai Asetukset); oletuksena seurataan TV:n kieltä. Boksin sivut ja lisäosan ruutu seuraavat Enigma2:n järjestelmäkieltä.

The TV apps are available in Finnish and English. Choose the language in the TOOLS menu (Google TV: long OK or Settings); by default the TV's language is used. The box pages and the plugin screen follow the Enigma2 system language.

## Asennus boksiin

```
opkg install /tmp/enigma2-plugin-extensions-e2tvplayer_<versio>_all.ipk
```
Käynnistä GUI uudelleen. Paketti korvaa vanhan `enigma2-plugin-extensions-e2samsungtv`-paketin.
**Lisäosat → E2TVPlayer** näyttää boksin IP:n ja varoittaa, jos OpenWebif ei ole portissa 80 tai
kirjautuminen on päällä. Selaimella `http://<boksi>/e2tvplayer/` näkyvät asennusohjeet.

## Google TV / Android TV

1. Asenna televisioon Google Playsta **Downloader** (AFTVnews) ja salli sille tuntemattomien sovellusten asennus
   (Asetukset → Järjestelmä → Tietoja → paina *Android TV OS -koontiversio* 7 kertaa → Asetukset → Sovellukset →
   Suojaus ja rajoitukset → Tuntemattomat lähteet → Downloader).
2. Kirjoita Downloaderiin `<boksin IP>/e2tvplayer` ja valitse **Lataa E2TVPlayer.apk**.
3. Sovellus etsii boksin lähiverkosta itse; tarvittaessa osoitteen voi antaa Asetuksista.

| Näppäin | Lista | Tallenne | Live |
|---|---|---|---|
| OK | toista | tauko + ohjelmatiedot | ohjelmatiedot |
| pitkä OK | valikko (poista, alusta, järjestys) | ääni ja tekstitys | ääni ja tekstitys |
| ◀ ▶ | – | −/+ 15 s | – |
| ▲ ▼ | liiku, ylhäällä välilehdet | +/− 5 min | kanava |
| BACK | ylempi kansio / lopetuskysely | lopeta (kohta tallentuu) | lopeta |

Valittu tekstitys- ja äänikieli muistetaan. Värinäppäimet, MENU ja INFO toimivat niissä TV:issä, joissa ne ovat.

## Samsung Tizen (2015–)

1. TV: Apps → paina kaukosäätimellä **1 2 3 4 5** → Developer mode **On**, Host PC IP = tietokoneen IP → käynnistä TV uudelleen.
2. Lataa tietokoneelle `http://<boksi>/e2tvplayer/E2TVPlayer.wgt`.
3. Asenna se [Samsung Jellyfin Installerilla](https://github.com/Jellyfin2Samsung/Samsung-Jellyfin-Installer)
   (oma .wgt). Ohjelma kirjautuu Samsung-tilille ja allekirjoittaa paketin televisiolle.

Näppäimet ja toiminnot kuten vanhassa Samsungissa (TOOLS = ääni ja tekstitys, INFO = ohjelmatiedot).
Tekstitykset puretaan boksissa kuten vanhalla Samsungilla, koska Tizenin soitin ei näytä DVB-tekstityksiä.
Jos osoitetta ei ole paketissa, sovellus etsii boksin lähiverkosta.

## Samsung Smart TV (2011–2014)

1. TV: Valikko → Smart Hub → Samsung-tili → Kirjaudu, tunnus `develop` (salasana tyhjä tai `000000`).
2. Smart Hub → pidä OK pohjassa jonkin sovelluksen päällä → **IP Setting** → boksin IP.
3. Pidä OK taas pohjassa → **Start User App Sync**, ja käynnistä TV uudelleen.

| Näppäin toistossa | Toiminto |
|---|---|
| OK / ▶❚❚ | tauko / jatka |
| ◀ ▶ / ▲ ▼ / ◀◀ ▶▶ | 15 s / 5 min / 1 min |
| INFO | ohjelmatiedot |
| TOOLS | ääni / tekstitys / ajoitus |
| RETURN / EXIT | takaisin listaan; listassa lopetuskysely |

Samsungin soitin ei näytä DVB-tekstityksiä, joten boksi purkaa ne kuviksi (`subs.py`, tallenteet;
`live.py`, live-välitys `/e2tvplayer/live`) ja sovellus piirtää ne videon päälle.

## Boksin HTTP-osoitteet

| Osoite | |
|---|---|
| `/widgetlist.xml`, `/e2tvplayer/E2Tallenteet.zip` | Samsung-sovellus |
| `/e2tvplayer/E2TVPlayer.apk` | Google TV -sovellus |
| `/e2tvplayer/info` | tunnistus (Google TV -sovelluksen boksihaku) |
| `/e2tvplayer/subs`, `/subimg` | tallenteen tekstitykset (Samsung) |
| `/e2tvplayer/live`, `/livesubs`, `/liveimg` | live-välitys ja sen tekstitykset (Samsung) |

Vanha polku `/e2samsungtv/` toimii edelleen, jotta aiemmin asennettu Samsung-sovellus ei mene rikki.

## Rakentaminen

- Boksin paketti: `sh enigma2/build_ipk.sh` (APK liitetään, jos `E2TVPLAYER_APK` osoittaa siihen).
- APK: `cd android && ./gradlew assembleRelease` (JDK 17 + Android SDK 34). Allekirjoitusavain
  `android/e2tvplayer.keystore` on repossa, jotta päivitykset asentuvat vanhan päälle.

## Lisenssi

E2TVPlayer on vapaa ohjelma: sitä saa levittää ja muuttaa GNU General Public License -lisenssin
version 3 tai (valintasi mukaan) minkä tahansa myöhemmän version ehdoin. Lisenssin teksti on
tiedostossa [LICENSE](LICENSE) ja osoitteessa <https://www.gnu.org/licenses/gpl-3.0.html>.

`SPDX-License-Identifier: GPL-3.0-or-later`

Mukana käytetyt kolmansien osapuolten komponentit ja niiden lisenssit (yhteensopivia GPL v3:n kanssa):

| Komponentti | Käyttö | Lisenssi |
|---|---|---|
| [html2canvas](https://html2canvas.hertzen.com) 1.4.1 | Tizenin kuvakaappaus (`enigma2/src/E2TVPlayer/widget/lib/`) | MIT |
| [AndroidX Media3 / ExoPlayer](https://github.com/androidx/media) | Google TV -soitin | Apache-2.0 |
| [Jellyfin media3-ffmpeg-decoder](https://github.com/jellyfin/jellyfin-androidx-media) | Google TV -äänen purku (FFmpeg) | Apache-2.0 / FFmpeg LGPL-2.1+ |
| AndroidX RecyclerView, Annotation | Google TV -käyttöliittymä | Apache-2.0 |
