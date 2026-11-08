#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 E2TVPlayer contributors
# Builds the unsigned Tizen package (E2TVPlayer.wgt) without a box.
# Usage: build_wgt.py <directory or .wgt file> [box address]
import importlib.util
import io
import os
import sys
import zipfile

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "E2TVPlayer")
spec = importlib.util.spec_from_file_location("E2TVPlayer", os.path.join(SRC, "__init__.py"), submodule_search_locations=[SRC])
pkg = importlib.util.module_from_spec(spec)
sys.modules["E2TVPlayer"] = pkg
spec.loader.exec_module(pkg)
from E2TVPlayer import web  # noqa: E402

out = sys.argv[1] if len(sys.argv) > 1 else "E2TVPlayer.wgt"
data = web.build_wgt(sys.argv[2] if len(sys.argv) > 2 else "")
if out.endswith(".wgt"):
    with open(out, "wb") as f:
        f.write(data)
else:
    os.makedirs(out, exist_ok=True)
    zipfile.ZipFile(io.BytesIO(data)).extractall(out)
print("%s (%d bytes, version %s)" % (out, len(data), web.tizen_version()))
