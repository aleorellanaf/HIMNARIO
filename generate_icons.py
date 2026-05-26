"""
Generador de íconos PWA para Himnario Digital IDS Lanín.
Crea todos los tamaños requeridos por el manifest.json usando Pillow.
"""
from PIL import Image, ImageDraw, ImageFont
import os
import math

ICON_SIZES = [16, 32, 72, 96, 128, 144, 152, 180, 192, 256, 512]
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "icons")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Paleta AMOLED
COLOR_BG       = (0, 0, 0, 255)         # Negro puro
COLOR_ACCENT   = (157, 78, 223, 255)    # Púrpura #9d4edf
COLOR_ACCENT_L = (187, 128, 240, 255)   # Púrpura claro
COLOR_WHITE    = (255, 255, 255, 255)
COLOR_MASKABLE = (20, 0, 40, 255)       # Fondo oscuro para maskable


def draw_cross_music(draw: ImageDraw.Draw, cx: float, cy: float, size: float, color):
    """Dibuja el símbolo: cruz estilizada con nota musical integrada."""
    lw = max(2, int(size * 0.055))
    arm_v = size * 0.38
    arm_h = size * 0.24

    # Brazo vertical de la cruz
    draw.line(
        [(cx, cy - arm_v), (cx, cy + arm_v)],
        fill=color, width=lw
    )
    # Brazo horizontal de la cruz
    draw.line(
        [(cx - arm_h, cy - arm_v * 0.25), (cx + arm_h, cy - arm_v * 0.25)],
        fill=color, width=lw
    )

    # Nota musical: corchea estilizada (círculo + línea)
    note_r = size * 0.07
    note_cx = cx + arm_h * 0.6
    note_cy = cy + arm_v * 0.45
    draw.ellipse(
        [note_cx - note_r, note_cy - note_r,
         note_cx + note_r, note_cy + note_r],
        fill=color
    )
    stem_w = max(1, int(lw * 0.7))
    draw.line(
        [(note_cx + note_r - stem_w // 2, note_cy),
         (note_cx + note_r - stem_w // 2, note_cy - size * 0.18)],
        fill=color, width=stem_w
    )


def create_icon(size: int, maskable: bool = False) -> Image.Image:
    """Crea un ícono cuadrado con fondo y símbolo centrado."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    padding = size * (0.12 if maskable else 0.0)
    radius = size * (0.22 if maskable else 0.18)

    bg_color = COLOR_MASKABLE if maskable else COLOR_BG

    # Fondo redondeado
    draw.rounded_rectangle(
        [padding, padding, size - padding, size - padding],
        radius=radius,
        fill=bg_color
    )

    # Círculo de acento exterior
    margin = size * 0.08
    draw.ellipse(
        [margin, margin, size - margin, size - margin],
        outline=COLOR_ACCENT, width=max(1, int(size * 0.03))
    )

    # Símbolo central
    cx, cy = size / 2, size / 2
    draw.ellipse(
        [cx - size * 0.28, cy - size * 0.28,
         cx + size * 0.28, cy + size * 0.28],
        fill=(*COLOR_ACCENT[:3], 35)
    )
    draw_cross_music(draw, cx, cy, size, COLOR_ACCENT_L)

    # Texto "IDS" para tamaños grandes
    if size >= 128:
        font_size = max(8, int(size * 0.11))
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except Exception:
            font = ImageFont.load_default()

        text = "IDS"
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = (size - tw) / 2
        ty = size * 0.72
        draw.text((tx, ty), text, font=font, fill=COLOR_WHITE)

    return img


def generate_screenshot_placeholder(width: int = 390, height: int = 844):
    """Genera una captura de pantalla placeholder para el manifest."""
    img = Image.new("RGB", (width, height), (0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Fondo con degradado simulado
    for y in range(height):
        alpha = int(y / height * 30)
        draw.line([(0, y), (width, y)], fill=(alpha // 3, 0, alpha))

    # Barra superior
    draw.rectangle([0, 0, width, 80], fill=(15, 0, 30))
    draw.rectangle([0, 78, width, 80], fill=(*COLOR_ACCENT[:3],))

    # Título
    try:
        font_lg = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
        font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    except Exception:
        font_lg = font_sm = ImageFont.load_default()

    draw.text((20, 20), "Himnario IDS Lanín", font=font_lg, fill=COLOR_WHITE)
    draw.text((20, 50), "385 himnos · Región Lanín", font=font_sm, fill=(*COLOR_ACCENT[:3],))

    # Simular tarjetas
    card_h = 72
    card_margin = 12
    y_start = 100
    colors_cat = [(157, 78, 223), (100, 60, 180), (130, 50, 200)]

    for i in range(8):
        y = y_start + i * (card_h + card_margin)
        if y + card_h > height - 20:
            break
        draw.rounded_rectangle(
            [card_margin, y, width - card_margin, y + card_h],
            radius=12, fill=(15, 5, 25)
        )
        num_color = colors_cat[i % len(colors_cat)]
        draw.rounded_rectangle(
            [card_margin + 10, y + 15, card_margin + 50, y + card_h - 15],
            radius=8, fill=(*num_color, 60)
        )
        draw.text(
            (card_margin + 18, y + 22),
            f"{i + 1:03d}",
            font=font_sm, fill=(*num_color,)
        )
        draw.text(
            (card_margin + 65, y + 18),
            f"Himno de ejemplo {i + 1}",
            font=font_sm, fill=COLOR_WHITE
        )

    path = os.path.join(OUTPUT_DIR, "screenshot-mobile.png")
    img.save(path, "PNG", optimize=True)
    print(f"  Captura generada: screenshot-mobile.png ({width}x{height})")


if __name__ == "__main__":
    print("Generando íconos PWA…")

    for size in ICON_SIZES:
        icon = create_icon(size, maskable=False)
        path = os.path.join(OUTPUT_DIR, f"icon-{size}.png")
        icon.save(path, "PNG", optimize=True)
        print(f"  ✓ icon-{size}.png")

    # Ícono maskable 512x512
    maskable = create_icon(512, maskable=True)
    path = os.path.join(OUTPUT_DIR, "icon-512-maskable.png")
    maskable.save(path, "PNG", optimize=True)
    print(f"  ✓ icon-512-maskable.png")

    # Captura de pantalla
    generate_screenshot_placeholder()

    print("\n✅ Todos los íconos generados correctamente en /icons/")
