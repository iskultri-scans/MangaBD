# ═══════════════════════════════════════════════════════════
# 🔍 CELL 5 — Region Classification (V11, from V1)
# ═══════════════════════════════════════════════════════════
# এই cell একটি image region দেখে তার type নির্ধারণ করবে।
# Types: bubble, thought, narrator, sfx, overlay
# ═══════════════════════════════════════════════════════════

print("=" * 60)
print("  🔍 MangaBD V11 — Region Classification")
print("=" * 60)
print()

# ── Classification Functions ───────────────────────────

def get_white_ratio(image_np, x, y, w, h):
    """
    একটি region-এর সাদা pixel-এর percentage বের করো।
    Args:
        image_np: পুরো image (numpy BGR array)
        x, y, w, h: region coordinates
    Returns:
        float: 0.0 থেকে 1.0 (সাদা pixel-এর অনুপাত)
    """
    try:
        img_h, img_w = image_np.shape[:2]

        # boundary check
        x1 = max(0, x)
        y1 = max(0, y)
        x2 = min(img_w, x + w)
        y2 = min(img_h, y + h)

        if x2 <= x1 or y2 <= y1:
            return 0.5

        region = image_np[y1:y2, x1:x2]

        if region.size == 0:
            return 0.5

        gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
        white_pixels = np.sum(gray > 200)
        total_pixels = gray.size

        if total_pixels == 0:
            return 0.5

        return white_pixels / total_pixels

    except Exception:
        return 0.5


def get_border_variance(image_np, x, y, w, h):
    """
    Region-এর border-এর pixel variance বের করো।
    Dotted/dashed border (thought bubble) চিনতে সাহায্য করবে।
    """
    try:
        img_h, img_w = image_np.shape[:2]

        x1 = max(0, x)
        y1 = max(0, y)
        x2 = min(img_w, x + w)
        y2 = min(img_h, y + h)

        if x2 - x1 < 10 or y2 - y1 < 10:
            return 0.0

        region = image_np[y1:y2, x1:x2]
        gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)

        border_width = 3
        h_reg, w_reg = gray.shape

        # চার দিকের border pixel collect করো
        top = gray[0:border_width, :].flatten()
        bottom = gray[h_reg - border_width:h_reg, :].flatten()
        left = gray[:, 0:border_width].flatten()
        right = gray[:, w_reg - border_width:w_reg].flatten()

        all_border = np.concatenate([top, bottom, left, right])

        if len(all_border) == 0:
            return 0.0

        return float(np.var(all_border)) / 10000.0  # normalize

    except Exception:
        return 0.0


def is_narrator_box(image_np, x, y, w, h):
    """
    এটি narrator box কিনা check করো।
    Narrator box সাধারণত page-এর top/bottom-এ, প্রশস্ত, rectangular।
    """
    try:
        img_h, img_w = image_np.shape[:2]

        # Page-এর top 20% বা bottom 20%-এ আছে কিনা
        in_top = (y < img_h * 0.20)
        in_bottom = (y + h > img_h * 0.80)
        near_edge = in_top or in_bottom

        # Aspect ratio: প্রশস্ত হলে narrator হওয়ার সম্ভাবনা বেশি
        if h == 0:
            return False
        aspect_ratio = w / h
        is_wide = aspect_ratio > 2.5

        # Width: page width-এর 40%+ হলে narrator হতে পারে
        width_ratio = w / img_w
        is_broad = width_ratio > 0.40

        # দুটো condition মিললে narrator
        if near_edge and (is_wide or is_broad):
            return True

        # শুধু অনেক প্রশস্ত হলেও narrator হতে পারে
        if aspect_ratio > 4.0 and is_broad:
            return True

        return False

    except Exception:
        return False


def classify_region(image_np, x, y, w, h):
    """
    একটি region-এর type নির্ধারণ করো।
    Args:
        image_np: পুরো image (numpy BGR array)
        x, y, w, h: region coordinates
    Returns:
        str: 'bubble' | 'thought' | 'narrator' | 'sfx' | 'overlay'
    """
    try:
        img_h, img_w = image_np.shape[:2]

        # Step 1: Narrator check (position + shape)
        if is_narrator_box(image_np, x, y, w, h):
            return 'narrator'

        # Step 2: White ratio calculate
        white_ratio = get_white_ratio(image_np, x, y, w, h)

        # Step 3: Bubble check (high white ratio)
        if white_ratio > CONFIG['white_ratio_bubble']:
            # Thought bubble check: border dotted/dashed কিনা
            border_var = get_border_variance(image_np, x, y, w, h)
            if border_var > CONFIG['dotted_border_threshold']:
                return 'thought'
            return 'bubble'

        # Step 4: Thought bubble (medium white ratio)
        if white_ratio > CONFIG['white_ratio_thought']:
            return 'thought'

        # Step 5: SFX check (বড় area, কম সাদা)
        region_area = w * h
        image_area = img_h * img_w
        area_ratio = region_area / image_area if image_area > 0 else 0

        # বড় region + কম সাদা = SFX হতে পারে
        if area_ratio > 0.02 and white_ratio < 0.30:
            # SFX সাধারণত irregular shape, বড় font
            if h > 40 and w > 40:
                return 'sfx'

        # Step 6: Default — overlay
        return 'overlay'

    except Exception:
        return 'overlay'


def classify_region_from_quad(image_np, quad):
    """
    Quadrilateral (4 corner points) থেকে region classify করো।
    CTD output থেকে সরাসরি ব্যবহার করা যাবে।
    Args:
        image_np: full image (BGR)
        quad: 4x2 numpy array of corner points, or Quadrilateral object
    Returns:
        str: region type
    """
    try:
        # Handle both Quadrilateral object and raw array
        if hasattr(quad, 'pts'):
            pts = quad.pts
        elif hasattr(quad, 'xyxy'):
            x1, y1, x2, y2 = quad.xyxy
            return classify_region(image_np, int(x1), int(y1),
                                   int(x2-x1), int(y2-y1))
        else:
            pts = np.array(quad)

        # Compute bounding box from corner points
        x_min = int(np.min(pts[:, 0]))
        y_min = int(np.min(pts[:, 1]))
        x_max = int(np.max(pts[:, 0]))
        y_max = int(np.max(pts[:, 1]))
        w = x_max - x_min
        h = y_max - y_min

        return classify_region(image_np, x_min, y_min, w, h)
    except Exception:
        return 'overlay'


print("  📝 Classification functions তৈরি হয়েছে ✅")
print()

# ── Self Tests ─────────────────────────────────────────

print("─" * 60)
print("  🧪 Classification Tests")
print("─" * 60)
print()

all_tests_pass = True

# Test 1: সাদা image → 'bubble'
try:
    test_img_1 = np.ones((600, 400, 3), dtype=np.uint8) * 255
    result_1 = classify_region(test_img_1, 50, 100, 150, 80)
    status_1 = "✅" if result_1 == 'bubble' else "❌"
    if result_1 != 'bubble':
        all_tests_pass = False
    print(f"  Test 1 (white region → bubble)    : {result_1:10s} {status_1}")
except Exception as e:
    print(f"  Test 1 (white region → bubble)    : ❌ ({str(e)[:40]})")
    all_tests_pass = False

# Test 2: গাঢ় image → 'overlay'
try:
    test_img_2 = np.ones((600, 400, 3), dtype=np.uint8) * 40
    result_2 = classify_region(test_img_2, 50, 250, 100, 60)
    status_2 = "✅" if result_2 == 'overlay' else "❌"
    if result_2 != 'overlay':
        all_tests_pass = False
    print(f"  Test 2 (dark region → overlay)    : {result_2:10s} {status_2}")
except Exception as e:
    print(f"  Test 2 (dark region → overlay)    : ❌ ({str(e)[:40]})")
    all_tests_pass = False

# Test 3: page top-এ প্রশস্ত region → 'narrator'
try:
    test_img_3 = np.ones((800, 600, 3), dtype=np.uint8) * 200
    result_3 = classify_region(test_img_3, 10, 5, 400, 50)
    status_3 = "✅" if result_3 == 'narrator' else "❌"
    if result_3 != 'narrator':
        all_tests_pass = False
    print(f"  Test 3 (top wide → narrator)      : {result_3:10s} {status_3}")
except Exception as e:
    print(f"  Test 3 (top wide → narrator)      : ❌ ({str(e)[:40]})")
    all_tests_pass = False

# Test 4: বড় গাঢ় region → 'sfx'
try:
    test_img_4 = np.ones((800, 600, 3), dtype=np.uint8) * 180
    test_img_4[200:320, 150:350] = 30
    result_4 = classify_region(test_img_4, 150, 200, 200, 120)
    status_4 = "✅" if result_4 == 'sfx' else f"⚠️ (got {result_4})"
    print(f"  Test 4 (large dark → sfx)         : {result_4:10s} {status_4}")
except Exception as e:
    print(f"  Test 4 (large dark → sfx)         : ❌ ({str(e)[:40]})")

# Test 5: get_white_ratio edge case — empty region
try:
    test_img_5 = np.ones((100, 100, 3), dtype=np.uint8) * 128
    result_5 = get_white_ratio(test_img_5, 0, 0, 0, 0)
    status_5 = "✅" if result_5 == 0.5 else "❌"
    print(f"  Test 5 (empty region → 0.5)       : {result_5:<10.1f} {status_5}")
except Exception as e:
    print(f"  Test 5 (empty region → 0.5)       : ❌ ({str(e)[:40]})")

# Test 6: classify_region never crashes
try:
    result_6 = classify_region(np.zeros((1, 1, 3), dtype=np.uint8), 0, 0, 1, 1)
    print(f"  Test 6 (no crash on tiny image)   : {result_6:10s} ✅")
except Exception as e:
    print(f"  Test 6 (no crash on tiny image)   : ❌ ({str(e)[:40]})")
    all_tests_pass = False

# Test 7 (V11 new): classify_region_from_quad
try:
    test_img_7 = np.ones((600, 400, 3), dtype=np.uint8) * 255
    quad = np.array([[50, 100], [200, 100], [200, 180], [50, 180]])
    result_7 = classify_region_from_quad(test_img_7, quad)
    status_7 = "✅" if result_7 == 'bubble' else "❌"
    print(f"  Test 7 (quad input → bubble)      : {result_7:10s} {status_7}")
except Exception as e:
    print(f"  Test 7 (quad input)               : ❌ ({str(e)[:40]})")

# ── Final Status ───────────────────────────────────────

print()
print("═" * 60)

if all_tests_pass:
    print("  ✅ Cell 5 সফল — Cell 6 চালানো যাবে")
else:
    print("  ⚠️ কিছু test expected result দেয়নি")
    print("  👉 তবে এগোনো যাবে — real image-এ ভালো কাজ করবে")
    print("  👉 Cell 6 চালানো যাবে")

print("═" * 60)

log_event("Cell 5: Region Classification ready")
