"""Découpe la grille Assistimmo en avatars individuels."""
from PIL import Image
from pathlib import Path

SRC = Path(__file__).parent.parent.parent / "ChatGPT Image 25 avr. 2026 à 12_40_03.png"
OUT = Path(__file__).parent

im = Image.open(SRC)
W, H = im.size  # 1536 x 1024

# 2 rangées de 5, puis Oscar en bas full-width
people_rows = [
    # (filename, x0, y0, x1, y1)
    # Row 1
    ("01-tom.png",     0,    0,  307,  440),
    ("02-nora.png",  307,    0,  614,  440),
    ("03-sarah.png", 614,    0,  922,  440),
    ("04-emma.png",  922,    0, 1229,  440),
    ("05-stella.png",1229,   0, 1536,  440),
    # Row 2
    ("06-franck.png",   0,  440,  307,  860),
    ("07-hugo.png",   307,  440,  614,  860),
    ("08-ines.png",   614,  440,  922,  860),
    ("09-gabriel.png",922,  440, 1229,  860),
    ("10-lea.png",   1229,  440, 1536,  860),
    # Oscar bottom row, layout horizontal -> on prend large
    ("11-oscar.png",  300,  870, 1236, 1024),
]

for name, x0, y0, x1, y1 in people_rows:
    crop = im.crop((x0, y0, x1, y1))
    crop.save(OUT / name)
    print(f"OK {name} ({x1-x0}x{y1-y0})")
