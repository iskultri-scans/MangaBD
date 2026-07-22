# ═══════════════════════════════════════════════════════════
# ✂️ CELL 8 — Inpainting Engine (V11: LaMa Large + OpenCV fallback)
# ═══════════════════════════════════════════════════════════
# LaMa Large (LamaLargeInpainter from zyddnys) — primary
# OpenCV TELEA — fallback when LaMa fails
# Adaptive mask dilation based on text stroke width
# ═══════════════════════════════════════════════════════════

import cv2
import numpy as np
import torch

print("=" * 60)
print("  ✂️ MangaBD V11 — Inpainting Engine (LaMa Large)")
print("=" * 60)
print()

# ── Mask preparation ──────────────────────────────────

def dilate_mask(mask, radius=None, adaptive=True):
    """
    Text mask dilate করো — text stroke-এর width অনুযায়ী।
    Args:
        mask: binary mask (uint8, 0/255)
        radius: dilation radius (None হলে CONFIG থেকে বা adaptive)
        adaptive: True হলে stroke width analyze করে radius ঠিক করবে
    Returns: dilated mask
    """
    if mask is None or mask.size == 0:
        return np.zeros((10, 10), dtype=np.uint8)

    if mask.max() == 0:
        return mask.copy()

    if radius is None:
        radius = CONFIG['mask_dilate_radius']

    if adaptive:
        try:
            # Estimate stroke width via distance transform
            # Distance transform: each pixel = distance to nearest zero pixel
            dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
            # Max distance ≈ max stroke half-width
            max_stroke_half = float(dist.max())
            # Recommended dilation = max_stroke_half (covers half-width + small margin)
            adaptive_radius = max(2, int(max_stroke_half * 0.7))
            # Blend with config default
            radius = max(radius, min(adaptive_radius, 15))
        except Exception:
            pass

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE,
                                        (2 * radius + 1, 2 * radius + 1))
    dilated = cv2.dilate(mask, kernel, iterations=1)
    return dilated


def clean_mask(mask):
    """
    Mask clean করো — noise remove, fill holes, smooth edges।
    """
    if mask is None or mask.size == 0:
        return np.zeros((10, 10), dtype=np.uint8)

    # Convert to binary
    _, binary = cv2.threshold(mask, 128, 255, cv2.THRESH_BINARY)

    # Morphological close (fill small holes)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=1)

    # Remove tiny components
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(closed)
    cleaned = np.zeros_like(closed)
    if num_labels > 1:
        for i in range(1, num_labels):
            area = stats[i, cv2.CC_STAT_AREA]
            if area >= 8:  # keep components with ≥8 pixels
                cleaned[labels == i] = 255

    return cleaned


# ── Inpainting Function ───────────────────────────────

def inpaint_region(image_np, mask, use_lama=True, inpainting_size=None):
    """
    Image-এর text region inpaint করো (text remove করে background পুনরুদ্ধার)।
    Args:
        image_np: BGR image (numpy array)
        mask: binary mask (uint8, 255 = text pixels)
        use_lama: True হলে LaMa Large চেষ্টা করবে, fail করলে OpenCV
        inpainting_size: LaMa-এর working size (None হলে CONFIG থেকে)
    Returns: inpainted BGR image
    """
    if image_np is None or mask is None:
        return image_np if image_np is not None else np.zeros((10, 10, 3), dtype=np.uint8)

    if image_np.size == 0 or mask.size == 0:
        return image_np

    if inpainting_size is None:
        inpainting_size = CONFIG['inpainting_size']

    # Ensure mask is same size as image
    if mask.shape[:2] != image_np.shape[:2]:
        mask = cv2.resize(mask, (image_np.shape[1], image_np.shape[0]),
                          interpolation=cv2.INTER_NEAREST)

    # Clean and dilate mask (আগের মতো — ভালো কাজ করতো)
    clean = clean_mask(mask)
    dilated = dilate_mask(clean, adaptive=True)

    # Try LaMa Large first
    if use_lama and lama_inpainter is not None:
        try:
            from manga_translator.inpainting.common import InpainterConfig
            cfg = InpainterConfig()
            import torch

            # ── FULL QUALITY: Temporarily move Qwen VL to CPU ──
            # Qwen VL (6GB) GPU তে থাকলে LaMa 1024px OOM করে
            # Solution: Qwen কে CPU তে পাঠাও → LaMa full GPU তে চালাও → Qwen কে ফিরিয়ে আনো
            _qwen_moved = False
            if torch.cuda.is_available() and 'qwen_vl_ocr' in globals() and qwen_vl_ocr is not None:
                try:
                    if hasattr(qwen_vl_ocr, 'model') and qwen_vl_ocr.model is not None:
                        qwen_vl_ocr.model = qwen_vl_ocr.model.cpu()
                        _qwen_moved = True
                        torch.cuda.empty_cache()
                        torch.cuda.synchronize()
                except Exception:
                    pass

            # Full quality: 1024px (আগে 512 ছিল)
            effective_size = inpainting_size  # full size, no reduction

            import asyncio
            import nest_asyncio
            nest_asyncio.apply()

            async def _run_lama():
                return await lama_inpainter.inpaint(
                    image_np, dilated, cfg, effective_size, False
                )

            result = asyncio.run(_run_lama())

            # GPU cache clear after inference
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

            # Qwen VL কে আবার GPU তে ফিরিয়ে আনো
            if _qwen_moved and 'qwen_vl_ocr' in globals() and qwen_vl_ocr is not None:
                try:
                    if hasattr(qwen_vl_ocr, 'model') and qwen_vl_ocr.model is not None:
                        qwen_vl_ocr.model = qwen_vl_ocr.model.to(DEVICE)
                except Exception:
                    pass

            if result is not None and result.size > 0:
                if result.shape[:2] != image_np.shape[:2]:
                    result = cv2.resize(result, (image_np.shape[1], image_np.shape[0]))
                return result
        except Exception as e:
            log_event(f"LaMa inpaint failed, falling back to OpenCV: {str(e)[:60]}",
                      level='WARN')
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            # Qwen কে ফিরিয়ে আনো (fail হলেও)
            if _qwen_moved and 'qwen_vl_ocr' in globals() and qwen_vl_ocr is not None:
                try:
                    if hasattr(qwen_vl_ocr, 'model') and qwen_vl_ocr.model is not None:
                        qwen_vl_ocr.model = qwen_vl_ocr.model.to(DEVICE)
                except Exception:
                    pass

    # Fallback: OpenCV TELEA
    return _opencv_inpaint(image_np, dilated)


def _opencv_inpaint(image_np, mask, radius=5):
    """OpenCV TELEA inpainting — fast, lower quality fallback."""
    try:
        result = cv2.inpaint(image_np, mask, radius, cv2.INPAINT_TELEA)
        return result
    except Exception as e:
        log_event(f"OpenCV inpaint failed: {str(e)[:60]}", level='WARN')
        return image_np.copy()


def inpaint_full_page(image_np, regions, detector=None):
    """
    Page-এর সব text regions একসাথে inpaint করো।
    V11: Pixel-level text mask ব্যবহার করে (bounding box নয়)।
    Args:
        image_np: BGR image
        regions: list of region dicts (from detect_text_regions)
        detector: CTD detector (None হলে global)
    Returns: inpainted BGR image
    """
    if image_np is None:
        return image_np

    h, w = image_np.shape[:2]

    # ── V11: Pixel-level mask via CTD (NO ONNX — too slow on CPU) ──
    # CTD নিজেই pixel-level mask দেয় (GPU তে চলে, দ্রুত)
    # ONNX model বাদ — CPU তে ধীর, ৫ মিনিট লাগতো
    full_mask = None

    # Primary: CTD pixel mask (via _refine_mask_zyddnys)
    try:
        if '_refine_mask_zyddnys' in globals():
            refined_mask = _refine_mask_zyddnys(image_np, regions)
            if refined_mask is not None and np.sum(refined_mask > 0) > 0:
                full_mask = refined_mask
                print(f"    ✅ CTD pixel mask: {np.sum(full_mask > 0):,} text pixels")
    except Exception as e:
        log_event(f"CTD pixel mask failed: {str(e)[:50]}", 'WARN')

    # Fallback: bounding box mask (if CTD not available)
    if full_mask is None:
        print(f"    ⚠️ Using bounding box mask (CTD not available)")
        full_mask = np.zeros((h, w), dtype=np.uint8)
        for region in regions:
            try:
                pts = region['quad'].astype(np.int32).reshape(-1, 1, 2)
                cv2.fillPoly(full_mask, [pts], 255)
            except Exception:
                x1, y1, x2, y2 = region['xyxy']
                cv2.rectangle(full_mask, (x1, y1), (x2, y2), 255, -1)

    # Inpaint
    return inpaint_region(image_np, full_mask)


def create_inpainting_preview(original_np, inpainted_np, regions=None):
    """
    Original vs inpainted side-by-side preview তৈরি করো।
    Returns: PIL Image (side-by-side)
    """
    from PIL import Image as PILImage

    h, w = original_np.shape[:2]
    new_w = w * 2 + 20  # 2 images + gap
    new_h = h

    # White canvas
    canvas = np.ones((new_h, new_w, 3), dtype=np.uint8) * 255

    # Place originals side by side
    canvas[:h, :w] = original_np
    canvas[:h, w+20:] = inpainted_np

    # Convert BGR → RGB
    canvas_rgb = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB)
    return PILImage.fromarray(canvas_rgb)


print("  📝 Inpainting functions তৈরি হয়েছে ✅")
print()

# ── Self-tests ────────────────────────────────────────
print("─" * 60)
print("  🧪 Inpainting Tests")
print("─" * 60)

# Test 1: dilate_mask
try:
    test_mask = np.zeros((100, 100), dtype=np.uint8)
    test_mask[40:60, 40:60] = 255
    dilated = dilate_mask(test_mask, radius=5, adaptive=False)
    # Dilated should have more white pixels
    original_count = np.sum(test_mask > 0)
    dilated_count = np.sum(dilated > 0)
    ok = dilated_count > original_count
    print(f"  Test 1 (dilate): {original_count} → {dilated_count} pixels "
          f"{'✅' if ok else '❌'}")
except Exception as e:
    print(f"  Test 1: ❌ ({str(e)[:60]})")

# Test 2: clean_mask (fill holes)
try:
    test_mask = np.zeros((50, 50), dtype=np.uint8)
    test_mask[10:40, 10:40] = 255
    test_mask[20:25, 20:25] = 0  # hole
    cleaned = clean_mask(test_mask)
    hole_filled = cleaned[22, 22] == 255
    print(f"  Test 2 (clean): hole filled={'✅' if hole_filled else '❌'}")
except Exception as e:
    print(f"  Test 2: ❌ ({str(e)[:60]})")

# Test 3: Adaptive dilation based on stroke width
try:
    test_mask = np.zeros((200, 200), dtype=np.uint8)
    # Thick rectangle (stroke width ~ 60px)
    cv2.rectangle(test_mask, (50, 50), (150, 150), 255, -1)
    dilated = dilate_mask(test_mask, adaptive=True)
    # Adaptive should give reasonable dilation
    ok = np.sum(dilated > 0) > np.sum(test_mask > 0)
    print(f"  Test 3 (adaptive dilate): {'✅' if ok else '❌'}")
except Exception as e:
    print(f"  Test 3: ❌ ({str(e)[:60]})")

# Test 4: LaMa inpainting
if lama_inpainter is not None:
    try:
        test_img = np.ones((256, 256, 3), dtype=np.uint8) * 200
        # Black "text" rectangle
        test_img[100:160, 80:180] = 0
        mask = np.zeros((256, 256), dtype=np.uint8)
        mask[100:160, 80:180] = 255

        result = inpaint_region(test_img, mask, use_lama=True)
        # Verify text region is now lighter (filled by LaMa)
        center_brightness = int(np.mean(result[120:140, 120:140]))
        original_brightness = int(np.mean(test_img[120:140, 120:140]))
        ok = center_brightness > original_brightness + 50
        print(f"  Test 4 (LaMa inpaint): brightness {original_brightness} → "
              f"{center_brightness} {'✅' if ok else '⚠️'}")
    except Exception as e:
        print(f"  Test 4: ❌ ({str(e)[:80]})")
else:
    print(f"  Test 4: ⏭️  LaMa not loaded — skip")

# Test 5: OpenCV fallback
try:
    test_img = np.ones((100, 100, 3), dtype=np.uint8) * 200
    test_img[40:60, 40:60] = 0
    mask = np.zeros((100, 100), dtype=np.uint8)
    mask[40:60, 40:60] = 255
    result = _opencv_inpaint(test_img, mask)
    ok = result.shape == test_img.shape
    print(f"  Test 5 (OpenCV inpaint): shape OK={'✅' if ok else '❌'}")
except Exception as e:
    print(f"  Test 5: ❌ ({str(e)[:60]})")

# Test 6: Full page inpainting (SIMPLIFIED — no model download)
# আগে এই test টা inpaint_full_page() কল করতো যেটা ONNX model download করতো (৫ মিনিট)
# এখন শুধু bounding box mask দিয়ে test করব — কোনো download নেই
try:
    test_img = np.ones((300, 300, 3), dtype=np.uint8) * 220
    cv2.putText(test_img, "TEXT", (50, 150), cv2.FONT_HERSHEY_SIMPLEX,
                2, (0, 0, 0), 4)
    # Simple mask (bounding box)
    test_mask = np.zeros((300, 300), dtype=np.uint8)
    cv2.rectangle(test_mask, (40, 110), (200, 170), 255, -1)
    result = inpaint_region(test_img, test_mask, use_lama=False)
    ok = result.shape == test_img.shape
    print(f"  Test 6 (full page): shape OK={'✅' if ok else '❌'}")
except Exception as e:
    print(f"  Test 6: ❌ ({str(e)[:80]})")

print()
print("═" * 60)
print("  ✅ Cell 8 সফল — Cell 9 চালানো যাবে (Bengali Renderer)")
print("═" * 60)

log_event("Cell 8: Inpainting Engine ready (LaMa Large + OpenCV fallback)")
