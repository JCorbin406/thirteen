from PIL import Image, ImageDraw, ImageFont

INK = (20, 17, 14)        # #14110E
BONE = (239, 231, 214)    # #EFE7D6
OXBLOOD = (163, 38, 56)   # #A32638
INKBONE = (36, 31, 25)    # #241F19
CARD_EDGE = (203, 190, 162)

SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"  # has ♠


def rounded(draw, box, r, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def make_icon(size, card_scale=0.66, bg=INK):
    img = Image.new("RGB", (size, size), bg)
    d = ImageDraw.Draw(img)

    # playing card, centered
    cw = int(size * card_scale)
    ch = int(cw * 1.4)
    if ch > size * card_scale * 1.4:
        ch = int(size * card_scale * 1.4)
    cx, cy = size // 2, size // 2
    x0, y0 = cx - cw // 2, cy - ch // 2
    x1, y1 = cx + cw // 2, cy + ch // 2
    rad = int(cw * 0.12)

    # soft shadow
    sh = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    off = int(size * 0.012)
    sd.rounded_rectangle([x0 + off, y0 + off, x1 + off, y1 + off], radius=rad,
                         fill=(0, 0, 0, 90))
    img.paste(Image.alpha_composite(img.convert("RGBA"), sh).convert("RGB"), (0, 0))
    d = ImageDraw.Draw(img)

    rounded(d, [x0, y0, x1, y1], rad, BONE, outline=CARD_EDGE, width=max(1, size // 256))

    # corner index "13"
    idx_f = ImageFont.truetype(SERIF, int(cw * 0.22))
    pad = int(cw * 0.10)
    d.text((x0 + pad, y0 + pad), "13", font=idx_f, fill=OXBLOOD)
    # bottom-right mirrored index
    b = d.textbbox((0, 0), "13", font=idx_f)
    tw, th = b[2] - b[0], b[3] - b[1]
    tmp = Image.new("RGBA", (tw + 8, th + 12), (0, 0, 0, 0))
    ImageDraw.Draw(tmp).text((0, 0), "13", font=idx_f, fill=OXBLOOD)
    tmp = tmp.rotate(180, expand=True)
    img.paste(tmp, (x1 - pad - tmp.width, y1 - pad - tmp.height), tmp)

    # center spade pip
    pip_f = ImageFont.truetype(SANS, int(cw * 0.62))
    pb = d.textbbox((0, 0), "\u2660", font=pip_f)
    pw, ph = pb[2] - pb[0], pb[3] - pb[1]
    d.text((cx - pw / 2 - pb[0], cy - ph / 2 - pb[1]), "\u2660",
           font=pip_f, fill=INKBONE)

    return img


# standard icons (some breathing room)
make_icon(512, card_scale=0.62).save("public/icon-512.png")
make_icon(512, card_scale=0.62).resize((192, 192), Image.LANCZOS).save("public/icon-192.png")
# maskable: smaller card inside the safe zone, full ink bleed
make_icon(512, card_scale=0.50).save("public/icon-maskable-512.png")
# apple touch icon (no alpha, 180px)
make_icon(180, card_scale=0.62).save("public/apple-touch-icon.png")

print("icons written")
