# ═══════════════════════════════════════════════════════════
# ✍️ CELL 9 — Bengali Text Renderer (V11: Pillow + libraqm)
# ═══════════════════════════════════════════════════════════
# Pillow with libraqm — Bengali যুক্তাক্ষর (conjuncts) ঠিকমতো render করবে।
# ❌ NO arabic_reshaper (V1-এ ভুল ছিল — এটি Arabic-এর জন্য, Bengali-এর নয়)
# ✅ Auto-fit font size (area-based)
# ✅ Word wrap, center alignment, stroke/border
# ✅ Rotation support (CTD rotated text)
# ✅ Reader.py logic: fit text to bubble properly
# ═══════════════════════════════════════════════════════════

import cv2
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

print("=" * 60)
print("  ✍️ MangaBD V11 — Bengali Renderer (Pillow + libraqm)")
print("=" * 60)
print()

# ── Font cache (avoid reloading TTF on every call) ──
_FONT_CACHE = {}

def get_font(size, bold=False):
    """Font লোড করো (cache সহ)।"""
    key = (size, bold)
    if key in _FONT_CACHE:
        return _FONT_CACHE[key]
    path = CONFIG['font_bold'] if bold else CONFIG['font_regular']
    try:
        font = ImageFont.truetype(path, size)
    except Exception:
        try:
            font = ImageFont.truetype(CONFIG['font_regular'], size)
        except Exception:
            font = ImageFont.load_default()
    _FONT_CACHE[key] = font
    return font


# ── Text measurement (libraqm-aware) ─────────────────

def measure_text(text, font, draw=None):
    """
    একটি text-এর bounding box measure করো (libraqm-aware)।
    Returns: (width, height) in pixels
    """
    if not text:
        return 0, 0
    if draw is None:
        dummy = Image.new('RGB', (1, 1))
        draw = ImageDraw.Draw(dummy)
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        return max(0, w), max(0, h)
    except Exception:
        # Fallback (older Pillow)
        try:
            w, h = draw.textsize(text, font=font)
            return w, h
        except Exception:
            return len(text) * 8, 16


def split_text_to_lines(text, font, draw, max_width):
    """
    Text কে word boundary-তে wrap করো।
    Bengali যুক্তাক্ষর ভাঙবে না — word-level wrap।
    Returns: list of lines (strings)
    """
    if not text:
        return []

    words = text.split(' ')
    lines = []
    current_line = ''

    for word in words:
        if not word:
            continue
        # Try adding word to current line
        if current_line:
            test_line = current_line + ' ' + word
        else:
            test_line = word

        w, _ = measure_text(test_line, font, draw)
        if w <= max_width or not current_line:
            current_line = test_line
        else:
            lines.append(current_line)
            current_line = word

    if current_line:
        lines.append(current_line)

    return lines


def fit_font_size(text, target_width, target_height, bold=False,
                  min_size=None, max_size=None, padding=4):
    """
    Text-এর জন্য সেরা font size বের করো — যাতে target box-এ fit হয়।
    Algorithm: binary search on font size, with word wrapping per size.
    Returns: (best_size, lines, total_height)

    V11 fix: যদি text min_size এও fit না হয়, তাহলে text কে ছোট করে নেওয়া হবে
    (truncation) যাতে bubble এর বাইরে না যায়।
    """
    if not text:
        return CONFIG['font_size_default'], [], 0

    if min_size is None:
        min_size = CONFIG['font_size_min']
    if max_size is None:
        max_size = CONFIG['font_size_max']

    # Padding বাড়ানো — bubble border থেকে দূরে রাখতে
    effective_padding = max(padding, min(target_width, target_height) // 12)
    avail_w = target_width - 2 * effective_padding
    avail_h = target_height - 2 * effective_padding

    if avail_w <= 10 or avail_h <= 10:
        # খুব ছোট bubble — সবচেয়ে ছোট font দিয়ে চেষ্টা করো
        return min_size, [text], target_height

    dummy = Image.new('RGB', (1, 1))
    draw = ImageDraw.Draw(dummy)

    best_size = min_size
    best_lines = [text]
    best_height = 0

    lo, hi = min_size, max_size
    while lo <= hi:
        mid = (lo + hi) // 2
        font = get_font(mid, bold)
        lines = split_text_to_lines(text, font, draw, avail_w)

        line_h = mid * 1.3
        total_h = line_h * len(lines)

        if total_h <= avail_h and lines:
            best_size = mid
            best_lines = lines
            best_height = total_h
            lo = mid + 1
        else:
            hi = mid - 1

    # ── V11 fix: যদি min_size এও fit না হয় ──
    # TRUNCATION নেই! ডায়লগ কাটা যাবে না।
    # পুরো text render করব — font size min_size এ রেখে
    if best_height == 0 or best_height > avail_h:
        font = get_font(min_size, bold)
        lines = split_text_to_lines(text, font, draw, avail_w)
        line_h = min_size * 1.1  # line spacing কমানো (1.3 → 1.1)
        total_h = line_h * len(lines)

        # এখনও fit হচ্ছে না? font আরো ছোট করো (8px পর্যন্ত)
        if total_h > avail_h:
            smaller_size = max(6, min_size - 2)
            font = get_font(smaller_size, bold)
            lines = split_text_to_lines(text, font, draw, avail_w)
            line_h = smaller_size * 1.1
            total_h = line_h * len(lines)

            # এখনও fit না হলে line spacing আরো কমাও
            if total_h > avail_h:
                line_h = smaller_size * 1.0  # tight spacing
                total_h = line_h * len(lines)

            best_size = smaller_size
        else:
            best_size = min_size

        best_lines = lines
        best_height = line_h * len(lines)

    return best_size, best_lines, best_height


# ── Main renderer ─────────────────────────────────────

def render_bengali_text(image_pil, text, x, y, w, h, angle=0.0,
                        region_type='bubble', bold=False,
                        stroke_width=None, stroke_color=None,
                        text_color=None, padding=4):
    """
    একটি image-এ Bengali text render করো।
    Args:
        image_pil: PIL Image (will be modified in-place via ImageDraw)
        text: Bengali string to render
        x, y, w, h: target region (axis-aligned bounding box)
        angle: rotation in degrees (CTD rotated text)
        region_type: 'bubble' | 'thought' | 'narrator' | 'sfx' | 'overlay'
        bold: True হলে bold font
        stroke_width: text border thickness (None হলে CONFIG থেকে)
        stroke_color: text border color (None হলে CONFIG থেকে)
        text_color: text fill color (None হলে region_type অনুযায়ী)
        padding: internal padding inside region
    Returns: PIL Image (modified) — also modifies in-place
    """
    if not text or not text.strip():
        return image_pil

    # Defaults
    if stroke_width is None:
        stroke_width = CONFIG['text_stroke_width']
    if stroke_color is None:
        stroke_color = CONFIG['text_stroke_color']

    # Text color by region type
    if text_color is None:
        color_map = {
            'bubble': CONFIG['text_color_bubble'],
            'thought': CONFIG['text_color_bubble'],
            'narrator': CONFIG['text_color_narrator'],
            'sfx': CONFIG['text_color_sfx'],
            'overlay': CONFIG['text_color_overlay'],
        }
        text_color = color_map.get(region_type, CONFIG['text_color_bubble'])

    # Fit font size
    font_size, lines, _ = fit_font_size(
        text, w, h, bold=bold, padding=padding
    )
    font = get_font(font_size, bold)

    # Compute total text height
    line_height = font_size * 1.3
    total_text_height = line_height * len(lines)

    # If angle is significant, render on a separate canvas and rotate
    if abs(angle) > 1.0:
        return _render_rotated_text(
            image_pil, lines, font, x, y, w, h, angle,
            text_color, stroke_color, stroke_width, line_height, padding
        )

    # Render directly
    draw = ImageDraw.Draw(image_pil)

    # Compute starting y for vertical centering
    start_y = y + padding + (h - 2 * padding - total_text_height) // 2
    start_y = max(y + padding, start_y)

    # Render each line, horizontally centered
    for i, line in enumerate(lines):
        line_w, _ = measure_text(line, font, draw)
        line_x = x + (w - line_w) // 2
        line_y = int(start_y + i * line_height)

        # Draw with stroke (border) for readability
        try:
            draw.text(
                (line_x, line_y), line,
                font=font, fill=text_color,
                stroke_width=stroke_width,
                stroke_fill=stroke_color,
            )
        except TypeError:
            # Older Pillow without stroke_width
            # Draw shadow by offsetting
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                draw.text((line_x + dx, line_y + dy), line,
                          font=font, fill=stroke_color)
            draw.text((line_x, line_y), line, font=font, fill=text_color)

    return image_pil


def _render_rotated_text(image_pil, lines, font, x, y, w, h, angle,
                         text_color, stroke_color, stroke_width,
                         line_height, padding):
    """
    Rotated text render করো — আলাদা transparent canvas-এ draw করে
    rotate করে original image-এ paste করবে।
    """
    try:
        # Create transparent canvas (large enough for the text)
        canvas_w = max(w + 4 * padding, 200)
        canvas_h = max(h + 4 * padding, 100)
        text_canvas = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(text_canvas)

        # Compute total text height
        total_text_height = line_height * len(lines)

        # Center vertically
        start_y = padding + (canvas_h - 2 * padding - total_text_height) // 2
        start_y = max(padding, start_y)

        # Render each line, centered
        for i, line in enumerate(lines):
            line_w, _ = measure_text(line, font, draw)
            line_x = (canvas_w - line_w) // 2
            line_y = int(start_y + i * line_height)

            try:
                draw.text(
                    (line_x, line_y), line,
                    font=font, fill=text_color + (255,),  # add alpha
                    stroke_width=stroke_width,
                    stroke_fill=stroke_color + (255,),
                )
            except TypeError:
                # Older Pillow fallback
                draw.text((line_x, line_y), line,
                          font=font, fill=text_color + (255,))

        # Rotate the text canvas
        rotated = text_canvas.rotate(angle, expand=True, resample=Image.BICUBIC)

        # Compute paste position — center on the region's center
        cx = x + w // 2
        cy = y + h // 2
        paste_x = cx - rotated.width // 2
        paste_y = cy - rotated.height // 2

        # Paste with alpha
        image_pil.paste(rotated, (paste_x, paste_y), rotated)

        return image_pil
    except Exception as e:
        log_event(f"Rotated text render failed: {str(e)[:50]}", level='WARN')
        # Fallback: render axis-aligned
        return render_bengali_text(
            image_pil, ' '.join(lines), x, y, w, h,
            angle=0.0, region_type='overlay', bold=False,
            stroke_width=stroke_width, stroke_color=stroke_color,
            text_color=text_color, padding=padding,
        )


# ── High-level helpers ───────────────────────────────

def render_text_on_region(image_pil, region, text, **kwargs):
    """
    Region dict থেকে coordinates বের করে text render করো।
    Args:
        image_pil: PIL Image
        region: dict with 'xywh' and 'angle' and 'region_type'
        text: text to render
        **kwargs: passed to render_bengali_text
    """
    x, y, w, h = region['xywh']
    angle = region.get('angle', 0.0)
    rtype = region.get('region_type', 'bubble')
    return render_bengali_text(
        image_pil, text, x, y, w, h,
        angle=angle, region_type=rtype, **kwargs
    )


def is_bengali_text_valid(text):
    """
    Bengali text valid কিনা check করো — অন্তত একটি Bengali character থাকতে হবে।
    """
    if not text:
        return False
    return any('\u0980' <= ch <= '\u09FF' for ch in text)


print("  📝 Renderer functions তৈরি হয়েছে ✅")
print()

# ── Self-tests ────────────────────────────────────────
print("─" * 60)
print("  🧪 Renderer Tests")
print("─" * 60)

# Verify libraqm first
try:
    from PIL import features
    raqm_ok = features.check('raqm')
    if raqm_ok:
        print("  ✅ libraqm available — Bengali conjuncts will render correctly")
    else:
        print("  ⚠️ libraqm NOT available — Bengali conjuncts may not render correctly")
except Exception:
    print("  ⚠️ libraqm check failed")

print()

# Test 1: Simple Bengali text rendering
try:
    test_img = Image.new('RGB', (300, 100), (255, 255, 255))
    img = render_bengali_text(test_img, "বাংলা", 10, 10, 280, 80,
                              region_type='bubble')
    arr = np.array(img)
    has_dark = arr.min() < 100
    print(f"  Test 1 (বাংলা render): {'✅' if has_dark else '❌'}")
except Exception as e:
    print(f"  Test 1: ❌ ({str(e)[:80]})")

# Test 2: Bengali conjuncts (যুক্তাক্ষর)
try:
    test_img = Image.new('RGB', (300, 100), (255, 255, 255))
    # "যুক্তাক্ষর" has multiple conjuncts
    img = render_bengali_text(test_img, "যুক্তাক্ষর পরীক্ষা", 10, 10, 280, 80,
                              region_type='bubble')
    arr = np.array(img)
    has_dark = arr.min() < 100
    print(f"  Test 2 (যুক্তাক্ষর): {'✅' if has_dark else '❌'}")
except Exception as e:
    print(f"  Test 2: ❌ ({str(e)[:80]})")

# Test 3: Word wrap
try:
    dummy = Image.new('RGB', (1, 1))
    draw = ImageDraw.Draw(dummy)
    font = get_font(20)
    lines = split_text_to_lines("এটি একটি বড় বাক্য যা wrap হওয়া উচিত",
                                font, draw, 100)
    ok = len(lines) > 1
    print(f"  Test 3 (word wrap): {len(lines)} lines {'✅' if ok else '⚠️'}")
except Exception as e:
    print(f"  Test 3: ❌ ({str(e)[:60]})")

# Test 4: fit_font_size
try:
    size, lines, h = fit_font_size("বাংলা", 200, 100)
    ok = 12 <= size <= 48
    print(f"  Test 4 (fit_font_size): size={size} lines={len(lines)} "
          f"{'✅' if ok else '⚠️'}")
except Exception as e:
    print(f"  Test 4: ❌ ({str(e)[:60]})")

# Test 5: Stroke/border rendering
try:
    test_img = Image.new('RGB', (300, 100), (255, 255, 255))
    img = render_bengali_text(test_img, "পরীক্ষা", 10, 10, 280, 80,
                              region_type='bubble', stroke_width=3)
    arr = np.array(img)
    has_dark = arr.min() < 100
    print(f"  Test 5 (stroke): {'✅' if has_dark else '❌'}")
except Exception as e:
    print(f"  Test 5: ❌ ({str(e)[:60]})")

# Test 6: Rotated text rendering
try:
    test_img = Image.new('RGB', (400, 200), (255, 255, 255))
    img = render_bengali_text(test_img, "বাংলা", 100, 50, 200, 100,
                              angle=15.0, region_type='bubble')
    arr = np.array(img)
    has_dark = arr.min() < 100
    print(f"  Test 6 (rotated 15°): {'✅' if has_dark else '❌'}")
except Exception as e:
    print(f"  Test 6: ❌ ({str(e)[:80]})")

# Test 7: SFX color (white text)
try:
    test_img = Image.new('RGB', (300, 100), (0, 0, 0))  # dark bg
    img = render_bengali_text(test_img, "ধুম!", 10, 10, 280, 80,
                              region_type='sfx')
    arr = np.array(img)
    has_white = arr.max() > 200
    print(f"  Test 7 (SFX white text): {'✅' if has_white else '❌'}")
except Exception as e:
    print(f"  Test 7: ❌ ({str(e)[:60]})")

# Test 8: is_bengali_text_valid
try:
    assert is_bengali_text_valid("বাংলা") == True
    assert is_bengali_text_valid("Hello") == False
    assert is_bengali_text_valid("") == False
    assert is_bengali_text_valid("Bangla বাংলা mixed") == True
    print(f"  Test 8 (is_bengali_text_valid): ✅")
except Exception as e:
    print(f"  Test 8: ❌ ({str(e)[:60]})")

# Visual test: render sample Bengali text
try:
    print()
    print("  📸 Visual test — Bengali rendering:")
    sample_img = Image.new('RGB', (600, 200), (240, 240, 240))
    # Title
    title_img = render_bengali_text(sample_img, "বাংলা মাঙ্গা অনুবাদ",
                                    50, 20, 500, 80, region_type='narrator')
    # Body
    body_img = render_bengali_text(title_img, "এটি একটি পরীক্ষামূলক বাক্য",
                                   50, 110, 500, 80, region_type='bubble')
    display(body_img)
except Exception as e:
    print(f"  ⚠️ Visual test skipped: {str(e)[:60]}")

print()
print("═" * 60)
print("  ✅ Cell 9 সফল — Cell 10 চালানো যাবে (Input)")
print("═" * 60)

log_event("Cell 9: Bengali Renderer ready (Pillow + libraqm)")
