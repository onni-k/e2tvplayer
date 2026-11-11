#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 E2TVPlayer contributors
# A simulated Enigma2 box for the CI test: the OpenWebif API (port 80), a recording with
# Range support (/file) and a live stream (port 8001). Standard library only.
import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
TS = os.path.join(HERE, "test.ts")
REC = "/media/hdd/movie/20261103 2000 - Test Channel HD - Test recording.ts"
SREF1 = "1:0:19:1:4:2D:FFFF0000:0:0:0:"
SREF2 = "1:0:19:2:4:2D:FFFF0000:0:0:0:"
NOW = int(time.time())
LOG = []

API = {
    "/e2tvplayer/info": {"app": "E2TVPlayer", "version": "ci", "apk": True},
    "/api/statusinfo": {"currservice_station": "Test Channel HD", "currservice_name": "Evening News", "isRecording": "true", "inStandby": "false"},
    "/api/movielist": {"directory": "/media/hdd/movie/", "bookmarks": ["Series"], "movies": [
        {"filename": REC, "eventname": "Test recording", "servicename": "Test Channel HD", "recordingtime": NOW - 3600,
         "length": "0:30", "filesize": os.path.getsize(TS), "filesize_readable": "2,3 MB",
         "description": "Short description.", "descriptionExtended": "A longer description of the test recording.actor: Rose Nieminenactor: Mikko Heino",
         "serviceref": "1:0:0:0:0:0:0:0:0:0:" + REC},
        {"filename": "/media/hdd/movie/old.ts", "eventname": "Old recording", "servicename": "Channel 2", "recordingtime": NOW - 90000,
         "length": "1:05:00", "filesize": 2000000000, "serviceref": "1:0:0:0:0:0:0:0:0:0:/media/hdd/movie/old.ts"}]},
    "/api/getservices": {"services": [{"servicereference": '1:7:1:0:0:0:0:0:0:0:FROM BOUQUET "userbouquet.fav.tv" ORDER BY bouquet', "servicename": "Favourites"}]},
    "/api/epgnow": {"events": [{"sref": SREF1, "title": "Evening News", "begin_timestamp": NOW - 600, "duration_sec": 1800, "shortdesc": "Daily news."}]},
    "/api/epgservicenow": {"events": [{"sref": SREF1, "title": "Evening News", "begin_timestamp": NOW - 600, "duration_sec": 1800, "shortdesc": "Daily news.", "longdesc": "News and weather."}]},
    "/api/epgservicenext": {"events": [{"sref": SREF1, "title": "Weather", "begin_timestamp": NOW + 1200, "duration_sec": 300}]},
}
SERVICES = {"services": [{"servicereference": SREF1, "servicename": "Test Channel HD"},
                         {"servicereference": "1:64:1:0:0:0:0:0:0:0:", "servicename": "--- marker ---"},
                         {"servicereference": SREF2, "servicename": "Second channel"}]}


class Api(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        LOG.append("%s %s" % (self.address_string(), fmt % args))
        sys.stderr.write("[box] %s\n" % (fmt % args))

    def send_json(self, obj):
        data = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        u = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(u.query).items()}
        if u.path == "/file":
            return self.send_file()
        if u.path == "/api/epgservice":
            # a programme guide: a few programmes per channel from half an hour ago on
            ref = q.get("sRef", "")
            k = 1 if ref == SREF1 else 2
            names = ["Evening News", "Weather", "Documentary", "Film: The Long Night", "Late News"] if k == 1 \
                else ["Football", "Studio", "Ice Hockey", "Sports News", "Night Music"]
            ev, t = [], NOW - 1800 + 300 * k
            for i in range(12):
                d = (1800, 600, 3000, 5400, 1200)[i % 5]
                ev.append({"sref": ref, "title": names[i % 5], "begin_timestamp": t, "duration_sec": d,
                    "shortdesc": "", "longdesc": "Programme %d of the test guide." % (i + 1)})
                t += d
            return self.send_json({"events": ev})
        if u.path == "/api/getservices" and q.get("sRef"):
            return self.send_json(SERVICES)
        if u.path == "/api/movielist" and q.get("dirname", "").rstrip("/").endswith("Series"):
            return self.send_json({"directory": "/media/hdd/movie/Series/", "bookmarks": [], "movies": []})
        if u.path in API:
            return self.send_json(API[u.path])
        self.send_response(404)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_POST(self):
        u = urlparse(self.path)
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n) if n else b""
        if u.path != "/e2tvplayer/screenshot":
            self.send_response(404); self.send_header("Content-Length", "0"); self.end_headers(); return
        out = os.environ.get("SHOTS", os.path.join(HERE, "..", "shots"))
        os.makedirs(out, exist_ok=True)
        name = "screenshot_%d" % int(time.time())
        with open(os.path.join(out, name + ".png"), "wb") as f:
            f.write(body)
        with open(os.path.join(out, name + ".txt"), "w") as f:
            f.write(self.path + "\n" + self.headers.get("Content-Type", "") + "\n")
        self.send_json({"name": name, "ui": name + ".png", "ffmpeg": False})

    def send_file(self):
        size = os.path.getsize(TS)
        start, end = 0, size - 1
        rng = self.headers.get("Range")
        if rng and rng.startswith("bytes="):
            a, _, b = rng[6:].partition("-")
            start = int(a or 0)
            end = int(b) if b else size - 1
            self.send_response(206)
            self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        else:
            self.send_response(200)
        self.send_header("Content-Type", "video/mp2t")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        with open(TS, "rb") as f:
            f.seek(start)
            left = end - start + 1
            try:
                while left > 0:
                    chunk = f.read(min(65536, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass


class Stream(BaseHTTPRequestHandler):
    """Like the Enigma2 stream server: HTTP/1.0, no length, bytes in real time."""
    protocol_version = "HTTP/1.0"

    def log_message(self, fmt, *args):
        sys.stderr.write("[8001] %s\n" % (fmt % args))

    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "video/mpeg")
        self.end_headers()
        data = open(TS, "rb").read()
        rate = len(data) / 30.0
        try:
            while True:     # loop so that "live" never ends
                for i in range(0, len(data), 18800):
                    self.wfile.write(data[i:i + 18800])
                    time.sleep(18800 / rate)
        except (BrokenPipeError, ConnectionResetError):
            pass


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 80
    s1 = ThreadingHTTPServer(("0.0.0.0", port), Api)
    s2 = ThreadingHTTPServer(("0.0.0.0", 8001), Stream)
    threading.Thread(target=s2.serve_forever, daemon=True).start()
    print("fake box on :%d and :8001" % port, flush=True)
    s1.serve_forever()


if __name__ == "__main__":
    main()
