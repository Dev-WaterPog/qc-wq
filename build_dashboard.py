"""Build index.html (standalone water-quality risk dashboard) from the newest QC Excel file in this folder.

Usage:  python build_dashboard.py [path/to/file.xlsx]
Needs:  pip install openpyxl, and Node.js (the app in ./app is React + TypeScript, built with Vite)
"""
import glob
import json
import os
import re
import shutil
import subprocess
import sys

import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, "app")
COLS = ["wtp", "code", "site", "province", "type",
        "raw_ph", "raw_tds", "raw_ntu", "rawlab_ph", "rawlab_tds", "rawlab_ntu",
        "filt_ph", "filt_tds", "filt_ntu", "filtlab_ph", "filtlab_tds", "filtlab_ntu"]


def find_xlsx():
    if len(sys.argv) > 1:
        return sys.argv[1]
    files = [f for f in glob.glob(os.path.join(HERE, "*.xlsx")) if not os.path.basename(f).startswith("~$")]
    if not files:
        sys.exit("ไม่พบไฟล์ .xlsx ในโฟลเดอร์นี้")
    return max(files, key=os.path.getmtime)


def num(v):
    if v is None or (isinstance(v, str) and v.strip() in ("", "-")):
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def read_rows(path):
    ws = openpyxl.load_workbook(path, data_only=True).worksheets[0]
    rows = []
    for r in ws.iter_rows(min_row=2, max_col=16, values_only=True):
        if not r[0] and not r[1]:
            continue
        site = re.sub(r"\s+", " ", str(r[2] or "")).strip()
        m = re.search(r"จ\.\s*(\S+)\s*$", site)
        rows.append(dict(zip(COLS, [str(r[0] or ""), str(r[1] or ""), site, m.group(1) if m else "", str(r[3] or "")]
                             + [num(v) for v in r[4:16]])))
    return rows


def data_date(path):
    m = re.search(r"\((\d{2})(\d{2})(\d{4})\)", os.path.basename(path))
    return f"{m.group(1)}/{m.group(2)}/{m.group(3)}" if m else ""


def main():
    src = find_xlsx()
    rows = read_rows(src)
    data = {"meta": {"file": os.path.basename(src), "date": data_date(src)}, "rows": rows}
    os.makedirs(os.path.join(APP, "src", "data"), exist_ok=True)
    with open(os.path.join(APP, "src", "data", "projects.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)

    npm = shutil.which("npm") or sys.exit("ไม่พบ npm กรุณาติดตั้ง Node.js")
    if not os.path.isdir(os.path.join(APP, "node_modules")):
        subprocess.run([npm, "install"], cwd=APP, check=True)
    subprocess.run([npm, "run", "build"], cwd=APP, check=True)
    out = os.path.join(HERE, "index.html")
    shutil.copyfile(os.path.join(APP, "dist", "index.html"), out)
    print(f"{len(rows)} โครงการ จาก {data['meta']['file']} -> {out}")


if __name__ == "__main__":
    main()
