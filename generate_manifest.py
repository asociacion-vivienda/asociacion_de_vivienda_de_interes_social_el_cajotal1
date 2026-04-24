#!/usr/bin/env python3
"""
CJ Constructores — Generador de manifest de galería.

Escanea img/barrios/ y produce img/barrios/manifest.json con la
lista de carpetas (barrios) y sus imágenes.

Uso:
    python generate_manifest.py

Se ejecuta automáticamente en el GitHub Action antes de desplegar
a GitHub Pages, pero también puedes correrlo en local cuando
agregues nuevas carpetas o fotos.
"""

import io
import json
import sys
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

IMG_ROOT = Path(__file__).parent / "img" / "barrios"
VALID_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"}
HIDDEN_PREFIXES = (".", "_")


def scan_barrios() -> dict:
    """Recorre img/barrios/ y devuelve {nombre_barrio: [imgs...]}"""
    if not IMG_ROOT.exists():
        print(f"⚠️  No existe la carpeta {IMG_ROOT}. Créala y agrega subcarpetas.")
        return {}

    barrios = {}
    for folder in sorted(IMG_ROOT.iterdir(), key=lambda p: p.name.lower()):
        if not folder.is_dir() or folder.name.startswith(HIDDEN_PREFIXES):
            continue

        images = sorted(
            [
                f.name
                for f in folder.iterdir()
                if f.is_file()
                and f.suffix.lower() in VALID_EXTS
                and not f.name.startswith(HIDDEN_PREFIXES)
            ],
            key=str.lower,
        )
        if images:
            barrios[folder.name] = images

    return barrios


def build_manifest(barrios: dict) -> dict:
    return {
        "generated_by": "generate_manifest.py",
        "version": 1,
        "total_barrios": len(barrios),
        "total_photos": sum(len(v) for v in barrios.values()),
        "barrios": barrios,
    }


def main() -> int:
    barrios = scan_barrios()
    manifest = build_manifest(barrios)

    if not IMG_ROOT.exists():
        IMG_ROOT.mkdir(parents=True, exist_ok=True)

    out_file = IMG_ROOT / "manifest.json"
    out_file.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"✅ Manifest generado en {out_file}")
    print(f"   · {manifest['total_barrios']} barrios")
    print(f"   · {manifest['total_photos']} fotografías")
    for barrio, imgs in barrios.items():
        print(f"   · {barrio:<30} {len(imgs)} foto(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
