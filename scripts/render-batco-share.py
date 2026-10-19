#!/usr/bin/env python3
"""Render the official BATCO link-preview banner from its source-controlled vector logo.

Run in CI so social crawlers always receive a real PNG, not an SVG or an
image assembled in client-side JavaScript. The reference dimensions are
1536 x 807, matching the approved BATCO social artwork.
"""
from pathlib import Path
from io import BytesIO
from PIL import Image, ImageDraw, ImageFilter
import cairosvg

ROOT = Path(__file__).resolve().parents[1]
W, H, SS = 1536, 807, 2
S = lambda x: int(x * SS)
canvas = Image.new("RGBA", (S(W), S(H)), (247, 247, 247, 255))

# Low-contrast corner relief, kept clear of the wordmark.
corner = Image.new("RGBA", canvas.size)
draw = ImageDraw.Draw(corner)
draw.ellipse(tuple(map(S, (-715, -785, 384, 305))), fill=(253, 253, 253, 255))
draw.ellipse(tuple(map(S, (1178, 475, 2280, 1579))), fill=(253, 253, 253, 255))
canvas.alpha_composite(corner)
lines = Image.new("RGBA", canvas.size)
d = ImageDraw.Draw(lines)
d.arc(tuple(map(S, (-715, -785, 384, 305))), start=0, end=180,
      fill=(212, 212, 212, 160), width=S(1))
d.arc(tuple(map(S, (1178, 475, 2280, 1579))), start=180, end=360,
      fill=(212, 212, 212, 160), width=S(1))
canvas.alpha_composite(lines)

# Logo vectors already contain BATCO, the English company name and Arabic
# name: do not redraw the lettering using substitute fonts.
logo_png = cairosvg.svg2png(
    url=str(ROOT / "assets/batco-logo.svg"),
    output_width=S(900), output_height=S(353)
)
logo = Image.open(BytesIO(logo_png)).convert("RGBA")
canvas.alpha_composite(logo, (S(318), S(236)))

final = canvas.convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
final.save(ROOT / "share-image.png", format="PNG", optimize=True, compress_level=9)
print("Generated BATCO social preview:", ROOT / "share-image.png")
