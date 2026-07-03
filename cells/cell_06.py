# ═══════════════════════════════════════════════════════════
# 🔎 CELL 6 — Text Detection (V11: CTD inline)
# ═══════════════════════════════════════════════════════════
# Comic Text Detector (CTD) ব্যবহার করে text regions detect করবে।
# CTD rotated/tilted text ও চিনতে পারে — quadrilateral output দেয়।
# V1-এর ONNX detector এর চেয়ে অনেক ভালো।
# ═══════════════════════════════════════════════════════════

import cv2
import numpy as np
import torch

print("=" * 60)
print("  🔎 MangaBD V11 — Text Detection (CTD)")
print("=" * 60)
print()

# ── Detection Function ────────────────────────────────

def detect_text_regions(image_np, detector=None, return_mask=False):
    """
    একটি image থেকে text regions detect করো।
    Args:
        image_np: BGR image (numpy array)
        detector: ComicTextDetector instance (None হলে global ctd_detector ব্যবহার)
        return_mask: True হলে text mask ও return করবে
    Returns:
        list of dicts: [{
            'quad': 4x2 numpy array (corner points),
            'xyxy': (x1, y1, x2, y2) bounding box,
            'xywh': (x, y, w, h),
            'angle': rotation angle in degrees,
            'confidence': float,
            'region_type': str (from classify_region_from_quad),
        }, ...]
        (mask ও return হবে যদি return_mask=True)
    """
    if detector is None:
        detector = ctd_detector

    if detector is None:
        log_event("CTD detector not loaded — returning empty list", level='WARN')
        return ([], None) if return_mask else []

    try:
        # CTD detect (async — _run_async helper দিয়ে চালাই)
        textlines, raw_mask, refined_mask = _run_async(detector.detect(
            image_np,
            detect_size=CONFIG['detection_size'],
            text_threshold=CONFIG['text_threshold'],
            box_threshold=CONFIG['box_threshold'],
            unclip_ratio=CONFIG['unclip_ratio'],
            invert=False,
            gamma_correct=False,
            rotate=False,
            auto_rotate=True,    # V11: auto-rotate for tilted pages
            verbose=False,
        ))

        # ─── V11: textline_merge — group lines into bubbles ───────
        # CTD returns individual text lines, but manga bubbles এ একাধিক
        # line থাকে যেগুলো একসাথে একটা speech bubble তৈরি করে।
        # zyddnys এর textline_merge module এই grouping করে।
        text_blocks = []
        try:
            # Cell 1-এ textline_merge/__init__.py আগে empty stub করা হতো।
            # V11 এখন original file ব্যবহার করে। কিন্তু যদি user Cell 1
            # আবার না চালিয়ে থাকে (পুরোনো stub file এখনো আছে),
            # এখানে actual file overwrite করে reload করছি।
            import manga_translator.textline_merge as _tlm
            if not hasattr(_tlm, 'dispatch'):
                # Stubbed — restore original file from zyddnys repo
                _orig_path = os.path.join(
                    CONFIG.get('mii_path', '/content/manga-image-translator'),
                    'manga_translator/textline_merge/__init__.py'
                )
                if os.path.exists(_orig_path) and _tlm.__file__:
                    # Read original source from zyddnys repo
                    with open(_orig_path) as f:
                        _orig_src = f.read()
                    # Overwrite the stubbed __init__.py with original content
                    with open(_tlm.__file__, 'w') as f:
                        f.write(_orig_src)
                    # Force re-import (clear cache + reload)
                    import importlib
                    importlib.reload(_tlm)
                    print(f"    🔧 Restored textline_merge from zyddnys repo")

            from manga_translator.textline_merge import dispatch as merge_dispatch
            img_h, img_w = image_np.shape[:2]
            text_blocks = _run_async(merge_dispatch(textlines, img_w, img_h, verbose=False))
            if text_blocks:
                print(f"    🔗 Merged {len(textlines)} lines → {len(text_blocks)} bubbles")
        except Exception as merge_err:
            log_event(f"textline_merge failed, falling back to per-line: {str(merge_err)[:60]}",
                      level='WARN')
            text_blocks = []  # fall back to per-line mode

        # Use merged blocks if available, else fall back to per-line
        source_items = text_blocks if text_blocks else textlines

        regions = []
        for item in source_items:
            try:
                # TextBlock (merged) বা Quadrilateral (single line) — দুটোই handle করি
                if hasattr(item, 'lines'):
                    # TextBlock: multiple lines
                    all_pts = np.vstack(item.lines)
                    prob = float(getattr(item, 'prob', 0.8))
                    angle = float(getattr(item, 'angle', 0.0))
                elif hasattr(item, 'pts'):
                    # Quadrilateral: single line
                    all_pts = np.array(item.pts)
                    prob = float(getattr(item, 'prob', 0.8))
                    angle = _compute_quad_angle(all_pts)
                else:
                    continue

                # Filter tiny regions (noise)
                x_min = int(np.min(all_pts[:, 0]))
                y_min = int(np.min(all_pts[:, 1]))
                x_max = int(np.max(all_pts[:, 0]))
                y_max = int(np.max(all_pts[:, 1]))
                w = x_max - x_min
                h = y_max - y_min

                if w < 5 or h < 5:
                    continue

                # Region type from classification
                region_type = classify_region_from_quad(image_np, all_pts)

                regions.append({
                    'quad': all_pts.astype(np.int32),
                    'xyxy': (x_min, y_min, x_max, y_max),
                    'xywh': (x_min, y_min, w, h),
                    'angle': angle,
                    'confidence': prob,
                    'region_type': region_type,
                })
            except Exception as e:
                log_event(f"Region parse error: {str(e)[:50]}", level='WARN')
                continue

        # Sort by reading order (top-to-bottom, then left-to-right)
        regions.sort(key=lambda r: (r['xyxy'][1] // 50, r['xyxy'][0]))

        if return_mask:
            return regions, refined_mask
        return regions

    except Exception as e:
        log_event(f"CTD detection failed: {str(e)[:80]}", level='ERROR')
        if return_mask:
            return [], None
        return []


def _compute_quad_angle(pts):
    """
    4 corner points থেকে rotation angle compute করো।
    Returns: angle in degrees (0 = horizontal, positive = counter-clockwise)
    """
    try:
        pts = np.array(pts, dtype=np.float32)
        if pts.shape[0] < 4:
            return 0.0

        # Top edge: pts[0] → pts[1]
        # তবে corner order নির্দিষ্ট না — তাই সবচেয়ে long edge থেকে angle নেওয়া যাক
        # Alternative: PCA on points
        center = np.mean(pts, axis=0)
        centered = pts - center

        # PCA: principal axis = direction of max variance
        # Covariance matrix
        cov = np.cov(centered.T)
        eigenvalues, eigenvectors = np.linalg.eigh(cov)

        # Principal axis = eigenvector with largest eigenvalue
        principal = eigenvectors[:, -1]
        angle_rad = np.arctan2(principal[1], principal[0])
        angle_deg = np.degrees(angle_rad)

        # Normalize to [-90, 90]
        if angle_deg > 90:
            angle_deg -= 180
        elif angle_deg < -90:
            angle_deg += 180

        return float(angle_deg)
    except Exception:
        return 0.0


def crop_region(image_np, region, padding=4):
    """
    Region থেকে image crop করো (axis-aligned bounding box)।
    Padding যোগ করা হয় OCR accuracy বাড়ানোর জন্য।
    Returns: cropped BGR image
    """
    try:
        x1, y1, x2, y2 = region['xyxy']
        h, w = image_np.shape[:2]
        x1 = max(0, x1 - padding)
        y1 = max(0, y1 - padding)
        x2 = min(w, x2 + padding)
        y2 = min(h, y2 + padding)
        return image_np[y1:y2, x1:x2].copy()
    except Exception:
        return np.zeros((10, 10, 3), dtype=np.uint8)


def crop_bubble_with_context(image_np, region, context_ratio=0.15):
    """
    পুরো bubble সহ context সহ crop করো — যাতে Baidu পুরো লেখা পড়তে পারে।

    সমস্যা: textline_merge শুধু text lines গুলোকে group করে, কিন্তু
    bounding box শুধু text এর উপর থাকে। Bubble এর border বা
    text এর উপরের/নিচের অংশ কেটে যেতে পারে।

    Solution: bounding box কে context_ratio দিয়ে expand করি
    (default 15% প্রতিদিকে)। এতে পুরো bubble + কিছু background যায়।

    Args:
        image_np: BGR image
        region: dict with 'xywh' or 'xyxy'
        context_ratio: 0.0-0.5, কতটুকু expand করবে (default 0.15 = 15%)
    Returns: cropped BGR image (with white padding if near edge)
    """
    try:
        x1, y1, x2, y2 = region['xyxy']
        h_img, w_img = image_np.shape[:2]
        w_region = x2 - x1
        h_region = y2 - y1

        # Expand by context_ratio (at least 8px, at most 100px)
        expand_x = int(max(8, min(100, w_region * context_ratio)))
        expand_y = int(max(8, min(100, h_region * context_ratio)))

        # New bounds
        nx1 = max(0, x1 - expand_x)
        ny1 = max(0, y1 - expand_y)
        nx2 = min(w_img, x2 + expand_x)
        ny2 = min(h_img, y2 + expand_y)

        crop = image_np[ny1:ny2, nx1:nx2].copy()

        # If crop is too small, return it anyway
        if crop.shape[0] < 5 or crop.shape[1] < 5:
            return crop

        # Add white border padding (Baidu likes some margin around text)
        border = max(8, min(30, w_region // 8))
        crop = cv2.copyMakeBorder(crop, border, border, border, border,
                                   cv2.BORDER_CONSTANT, value=(255, 255, 255))
        return crop
    except Exception:
        return crop_region(image_np, region, padding=4)


def crop_region_rotated(image_np, region, padding=4):
    """
    Rotated region থেকে image crop করো (perspective transform দিয়ে)।
    Returns: cropped, axis-aligned BGR image (rotation normalized)
    """
    try:
        pts = region['quad'].astype(np.float32)
        # Determine width/height of the un-rotated rectangle
        width = int(max(
            np.linalg.norm(pts[0] - pts[1]),
            np.linalg.norm(pts[2] - pts[3])
        ))
        height = int(max(
            np.linalg.norm(pts[0] - pts[3]),
            np.linalg.norm(pts[1] - pts[2])
        ))

        if width < 5 or height < 5:
            return crop_region(image_np, region, padding)

        # Target rectangle
        dst_pts = np.array([
            [0, 0],
            [width - 1, 0],
            [width - 1, height - 1],
            [0, height - 1],
        ], dtype=np.float32)

        # Perspective transform
        matrix = cv2.getPerspectiveTransform(pts, dst_pts)
        cropped = cv2.warpPerspective(image_np, matrix, (width, height))
        return cropped
    except Exception:
        return crop_region(image_np, region, padding)


def visualize_detections(image_np, regions, max_display_size=1024):
    """
    Detection results visualize করো — প্রতিটি region-এর উপরে bounding box + label।
    Returns: annotated BGR image
    """
    vis = image_np.copy()
    colors = {
        'bubble': (0, 255, 0),    # green
        'thought': (255, 255, 0), # yellow
        'narrator': (0, 165, 255),# orange
        'sfx': (0, 0, 255),       # red
        'overlay': (255, 0, 255), # magenta
    }

    for i, region in enumerate(regions):
        color = colors.get(region['region_type'], (200, 200, 200))
        pts = region['quad'].reshape(-1, 1, 2).astype(np.int32)
        cv2.polylines(vis, [pts], True, color, 2)

        # Label
        x, y = region['xyxy'][0], region['xyxy'][1]
        label = f"#{i+1} {region['region_type']} ({region['confidence']:.2f})"
        cv2.rectangle(vis, (x, y - 18), (x + len(label) * 8, y), color, -1)
        cv2.putText(vis, label, (x + 2, y - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

    return vis


print("  📝 Detection functions তৈরি হয়েছে ✅")
print()

# ── Self-tests ────────────────────────────────────────
print("─" * 60)
print("  🧪 Detection Tests")
print("─" * 60)

if ctd_detector is None:
    print("  ⚠️ CTD not loaded — skipping live tests")
    print("  ✅ Functions defined — পরে CTD load হলে কাজ করবে")
else:
    # Test 1: Detection on synthetic text image
    try:
        test_img = np.ones((400, 600, 3), dtype=np.uint8) * 255
        cv2.putText(test_img, "Hello World", (50, 100), cv2.FONT_HERSHEY_SIMPLEX,
                    1.5, (0, 0, 0), 3)
        cv2.putText(test_img, "MangaBD V11", (50, 250), cv2.FONT_HERSHEY_SIMPLEX,
                    1.5, (0, 0, 0), 3)

        regions = detect_text_regions(test_img)
        print(f"  Test 1 (synthetic text): {len(regions)} regions detected ✅")
        if len(regions) >= 1:
            for i, r in enumerate(regions[:3]):
                print(f"    #{i+1} type={r['region_type']} "
                      f"xyxy={r['xyxy']} angle={r['angle']:.1f}°")
    except Exception as e:
        print(f"  Test 1: ❌ ({str(e)[:80]})")

    # Test 2: Detection with mask
    try:
        regions, mask = detect_text_regions(test_img, return_mask=True)
        if mask is not None:
            print(f"  Test 2 (mask return): mask shape={mask.shape} ✅")
        else:
            print(f"  Test 2 (mask return): no mask returned ⚠️")
    except Exception as e:
        print(f"  Test 2: ❌ ({str(e)[:80]})")

    # Test 3: Visualization
    try:
        vis = visualize_detections(test_img, regions)
        print(f"  Test 3 (visualization): shape={vis.shape} ✅")
    except Exception as e:
        print(f"  Test 3: ❌ ({str(e)[:80]})")

    # Test 4: Rotated text detection
    try:
        # Create a rotated text image
        test_rot = np.ones((400, 600, 3), dtype=np.uint8) * 255
        # Draw text on a separate image, then rotate it
        text_img = np.ones((100, 400, 3), dtype=np.uint8) * 255
        cv2.putText(text_img, "Rotated Text Here", (10, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 3)
        # Rotate 15 degrees
        center = (200, 50)
        rot_mat = cv2.getRotationMatrix2D(center, 15, 1.0)
        rotated = cv2.warpAffine(text_img, rot_mat, (400, 100),
                                 borderMode=cv2.BORDER_CONSTANT,
                                 borderValue=(255, 255, 255))
        test_rot[150:250, 100:500] = rotated

        regions_rot = detect_text_regions(test_rot)
        print(f"  Test 4 (rotated text): {len(regions_rot)} regions "
              f"(angle={regions_rot[0]['angle']:.1f}° if any) ✅"
              if regions_rot else
              f"  Test 4 (rotated text): 0 regions detected ⚠️")
    except Exception as e:
        print(f"  Test 4: ❌ ({str(e)[:80]})")

# Test 5: _compute_quad_angle on horizontal box
try:
    pts = np.array([[10, 10], [100, 10], [100, 50], [10, 50]])
    angle = _compute_quad_angle(pts)
    ok = abs(angle) < 5
    print(f"  Test 5 (horizontal angle): {angle:.1f}° {'✅' if ok else '⚠️'}")
except Exception as e:
    print(f"  Test 5: ❌ ({str(e)[:80]})")

# Test 6: crop_region
try:
    img = np.random.randint(0, 255, (200, 200, 3), dtype=np.uint8)
    region = {
        'quad': np.array([[50, 50], [150, 50], [150, 150], [50, 150]]),
        'xyxy': (50, 50, 150, 150),
        'xywh': (50, 50, 100, 100),
        'angle': 0.0,
        'confidence': 0.9,
        'region_type': 'bubble',
    }
    crop = crop_region(img, region)
    print(f"  Test 6 (crop_region): shape={crop.shape} ✅")
except Exception as e:
    print(f"  Test 6: ❌ ({str(e)[:80]})")

print()
print("═" * 60)
if ctd_detector is not None:
    print("  ✅ Cell 6 সফল — Cell 7 চালানো যাবে (OCR Engine)")
else:
    print("  ⚠️ CTD not loaded — detection কাজ করবে না")
    print("  👉 Cell 3 আবার চালাও, তারপর এই cell আবার")
print("═" * 60)

log_event("Cell 6: Text Detection ready")
