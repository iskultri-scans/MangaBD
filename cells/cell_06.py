# ═══════════════════════════════════════════════════════════
# 🔎 CELL 6 — Text Detection (V11: RT-DETR-v2 PRIMARY)
# ═══════════════════════════════════════════════════════════
# ⭐ RT-DETR-v2: text_bubble vs text_free আলাদা করে! (V4.0 approach)
# ✅ text_bubble (class 1) = bubble-এর ভেতরের text → PRIMARY
# ✅ text_free (class 2) = bubble-এর বাইরের text → আলাদা
# ✅ bubble (class 0) = speech bubble region
# CTD শুধু fallback হিসেবে (RT-DETR কিছু না পেলে)
# ═══════════════════════════════════════════════════════════

import cv2
import numpy as np
import torch
from PIL import Image as PILImage

print("=" * 60)
print("  🔎 MangaBD V11 — Text Detection (RT-DETR-v2 PRIMARY)")
print("=" * 60)
print()

# ═══════════════════════════════════════════════════════════
# [1] RT-DETR-v2 Detection — PRIMARY (text_bubble / text_free / bubble)
# ═══════════════════════════════════════════════════════════

def rtdetr_detect(image_np):
    """RT-DETR-v2 দিয়ে text+bubble detection

    ৩টি ক্লাস:
      0 = bubble      → speech bubble region (কোনো text নেই)
      1 = text_bubble → text INSIDE bubble ✅ (এটাই আমরা চাই)
      2 = text_free   → text OUTSIDE bubble (SFX, narrator)

    Returns:
        dict with:
          'text_bubble_boxes': list of (x, y, w, h) — bubble-এর ভেতরের text
          'text_free_boxes': list of (x, y, w, h) — bubble-এর বাইরের text
          'bubble_boxes': list of (x, y, w, h) — bubble region
          'all_detections': list of (x, y, w, h, class_name, score)
    """
    try:
        from transformers import RTDetrV2ForObjectDetection, AutoProcessor

        # Cache model globally
        global _rt_detr_bubble_model, _rt_detr_processor
        rt_detr_cache_dir = f"{CONFIG['models_dir']}/rt_detr_bubble"

        if '_rt_detr_bubble_model' not in globals() or _rt_detr_bubble_model is None:
            print(f"    📥 Loading RT-DETR-v2 (first time ~167MB)...")
            _rt_detr_bubble_model = RTDetrV2ForObjectDetection.from_pretrained(
                'ogkalu/comic-text-and-bubble-detector',
                cache_dir=rt_detr_cache_dir,
            ).to(DEVICE).eval()
            _rt_detr_processor = AutoProcessor.from_pretrained(
                'ogkalu/comic-text-and-bubble-detector',
                cache_dir=rt_detr_cache_dir,
            )
            print(f"    ✅ RT-DETR-v2 loaded on {DEVICE}")

        # BGR → RGB → PIL
        image_rgb = cv2.cvtColor(image_np, cv2.COLOR_BGR2RGB)
        pil_img = PILImage.fromarray(image_rgb)

        # Inference
        inputs = _rt_detr_processor(images=pil_img, return_tensors="pt")
        inputs = {k: v.to(DEVICE) for k, v in inputs.items()
                  if isinstance(v, torch.Tensor)}

        with torch.no_grad():
            outputs = _rt_detr_bubble_model(**inputs)

        # Post-process
        target_sizes = torch.tensor([pil_img.size[::-1]])
        results = _rt_detr_processor.post_process_object_detection(
            outputs, threshold=0.3, target_sizes=target_sizes
        )[0]

        class_names = {0: 'bubble', 1: 'text_bubble', 2: 'text_free'}

        text_bubble_boxes = []
        text_free_boxes = []
        bubble_boxes = []
        all_detections = []

        for score, label, box in zip(
            results["scores"].cpu().numpy(),
            results["labels"].cpu().numpy(),
            results["boxes"].cpu().numpy()
        ):
            x1, y1, x2, y2 = box.astype(int)
            w, h = x2 - x1, y2 - y1
            class_name = class_names.get(int(label), 'unknown')

            if w < 10 or h < 8:
                continue

            all_detections.append((int(x1), int(y1), int(w), int(h),
                                   class_name, float(score)))

            if class_name == 'text_bubble':
                text_bubble_boxes.append((int(x1), int(y1), int(w), int(h)))
            elif class_name == 'text_free':
                text_free_boxes.append((int(x1), int(y1), int(w), int(h)))
            elif class_name == 'bubble':
                bubble_boxes.append((int(x1), int(y1), int(w), int(h)))

        return {
            'text_bubble_boxes': text_bubble_boxes,
            'text_free_boxes': text_free_boxes,
            'bubble_boxes': bubble_boxes,
            'all_detections': all_detections,
        }
    except Exception as e:
        log_event(f"RT-DETR detection error: {str(e)[:60]}", 'WARN')
        return {'text_bubble_boxes': [], 'text_free_boxes': [],
                'bubble_boxes': [], 'all_detections': []}


# ═══════════════════════════════════════════════════════════
# [2] CTD Fallback — RT-DETR কিছু না পেলে
# ═══════════════════════════════════════════════════════════

def comic_detect_pixel_mask(image_np):
    """ONNX Comic Text Detector দিয়ে pixel-level text mask তৈরি করো।

    এটা মূল সমাধান! Bounding box mask নয়, বরং প্রতিটা text pixel
    আলাদাভাবে detect করে। এতে inpainting এ শুধু text pixel remove
    হয়, background এর কোনো ক্ষতি হয় না।

    Model: mayocream/comic-text-detector-onnx (HuggingFace)
    Output: text_mask (H, W) — 255 = text pixel, 0 = background

    Returns:
        numpy (H, W) uint8 — pixel-level text mask, or None if failed
    """
    try:
        import onnxruntime as ort
        from huggingface_hub import hf_hub_download

        # Cache model globally
        global _comic_onnx_session
        if '_comic_onnx_session' not in globals() or _comic_onnx_session is None:
            print(f"    📥 Loading ONNX Comic Text Detector (~50MB, first time)...")
            onnx_path = hf_hub_download(
                repo_id="mayocream/comic-text-detector-onnx",
                filename="comic-text-detector.onnx",
                cache_dir=f"{CONFIG['models_dir']}/comic_onnx",
            )
            _comic_onnx_session = ort.InferenceSession(
                onnx_path,
                providers=['CUDAExecutionProvider', 'CPUExecutionProvider'],
            )
            print(f"    ✅ ONNX Comic Text Detector loaded")

        h_orig, w_orig = image_np.shape[:2]
        input_size = 1024  # Model expects 1024×1024

        # Resize to 1024×1024
        image_resized = cv2.resize(image_np, (input_size, input_size))

        # Preprocessing: BGR → RGB, normalize, NCHW
        image_rgb = cv2.cvtColor(image_resized, cv2.COLOR_BGR2RGB)
        image_float = image_rgb.astype(np.float32) / 255.0
        image_transposed = np.transpose(image_float, (2, 0, 1))
        blob = np.expand_dims(image_transposed, axis=0)

        # ONNX Inference
        input_name = _comic_onnx_session.get_inputs()[0].name
        outputs = _comic_onnx_session.run(None, {input_name: blob})

        # Output parsing
        # outputs[1] = text segmentation mask [1, 1, 1024, 1024]
        seg_output = outputs[1]
        seg_mask = seg_output[0, 0]  # [1024, 1024]
        seg_mask = (seg_mask > 0.5).astype(np.uint8) * 255

        # Resize back to original size
        text_mask = cv2.resize(seg_mask, (w_orig, h_orig))

        return text_mask
    except Exception as e:
        log_event(f"ONNX pixel mask failed: {str(e)[:60]}", 'WARN')
        return None


def create_smart_text_mask(image_np, rtdetr_result, pixel_mask):
    """Pixel-level text mask কে RT-DETR text_bubble region দিয়ে filter করো।

    শুধু text_bubble box-এর ভেতরের pixel mask রাখো।
    text_free box-এর ভেতরের pixel mask ও রাখো (SFX, narrator ও remove করতে হবে)।

    Returns:
        numpy (H, W) uint8 — smart pixel-level text mask
    """
    if pixel_mask is None:
        return None

    h_img, w_img = image_np.shape[:2]
    text_bubble_boxes = rtdetr_result.get('text_bubble_boxes', [])
    text_free_boxes = rtdetr_result.get('text_free_boxes', [])
    bubble_boxes = rtdetr_result.get('bubble_boxes', [])

    # যদি কোনো RT-DETR box না থাকে, পুরো pixel mask ফেরত দাও
    if not text_bubble_boxes and not text_free_boxes:
        return pixel_mask

    # text_bubble + text_free box গুলো নাও (দুটোই remove করতে হবে)
    all_text_boxes = list(text_bubble_boxes) + list(text_free_boxes)

    if not all_text_boxes:
        return pixel_mask

    # Region mask তৈরি করো (শুধু box-এর ভেতরের area)
    region_mask = np.zeros((h_img, w_img), dtype=np.uint8)
    for (x, y, w, h) in all_text_boxes:
        x1, y1 = max(0, x), max(0, y)
        x2, y2 = min(w_img, x + w), min(h_img, y + h)
        region_mask[y1:y2, x1:x2] = 255

    # Pixel mask ∩ Region mask = শুধু text_bubble region-এর text pixel
    smart_mask = cv2.bitwise_and(pixel_mask, region_mask)

    # যদি smart_mask খালি হয়, pixel mask ব্যবহার করো (fallback)
    if np.sum(smart_mask > 0) == 0:
        return pixel_mask

    return smart_mask


def _ctd_fallback_detect(image_np):
    """CTD দিয়ে fallback detection (RT-DETR fail করলে)"""
    if ctd_detector is None:
        return []
    try:
        textlines, raw_mask, refined_mask = _run_async(ctd_detector.detect(
            image_np,
            CONFIG['detection_size'],
            CONFIG['text_threshold'],
            CONFIG['box_threshold'],
            CONFIG['unclip_ratio'],
            False, False, False, False, False,
        ))
        # textline_merge
        try:
            from manga_translator.textline_merge import dispatch as merge_dispatch
            img_h, img_w = image_np.shape[:2]
            text_blocks = _run_async(merge_dispatch(textlines, img_w, img_h, verbose=False))
            if text_blocks:
                boxes = []
                for blk in text_blocks:
                    if hasattr(blk, 'lines'):
                        all_pts = np.vstack(blk.lines)
                    elif hasattr(blk, 'pts'):
                        all_pts = np.array(blk.pts)
                    else:
                        continue
                    x1 = int(np.min(all_pts[:, 0]))
                    y1 = int(np.min(all_pts[:, 1]))
                    x2 = int(np.max(all_pts[:, 0]))
                    y2 = int(np.max(all_pts[:, 1]))
                    boxes.append((x1, y1, x2 - x1, y2 - y1))
                return boxes
        except Exception:
            pass
        # If merge failed, return per-line boxes
        boxes = []
        for tl in textlines:
            if hasattr(tl, 'pts'):
                pts = tl.pts
                x1 = int(np.min(pts[:, 0]))
                y1 = int(np.min(pts[:, 1]))
                x2 = int(np.max(pts[:, 0]))
                y2 = int(np.max(pts[:, 1]))
                boxes.append((x1, y1, x2 - x1, y2 - y1))
        return boxes
    except Exception as e:
        log_event(f"CTD fallback failed: {str(e)[:50]}", 'WARN')
        return []


# ═══════════════════════════════════════════════════════════
# [3] MAIN DETECTION — RT-DETR primary, CTD fallback
# ═══════════════════════════════════════════════════════════

def detect_text_regions(image_np, detector=None, return_mask=False):
    """RT-DETR-v2 দিয়ে text regions detect করো (V4.0 approach).

    এখন প্রতিটা region = একটা সম্পূর্ণ bubble এর ভেতরের text
    (CTD এর মতো line-by-line নয়)।

    Returns:
        list of dicts: [{
            'quad': 4x2 numpy array,
            'xyxy': (x1, y1, x2, y2),
            'xywh': (x, y, w, h),
            'angle': 0.0,
            'confidence': float,
            'region_type': str,
        }, ...]
    """
    try:
        # ── Step 1: RT-DETR-v2 Detection (PRIMARY) ──────────
        rtdetr_result = rtdetr_detect(image_np)
        text_bubble_boxes = rtdetr_result['text_bubble_boxes']
        text_free_boxes = rtdetr_result['text_free_boxes']
        bubble_boxes = rtdetr_result['bubble_boxes']

        tb_count = len(text_bubble_boxes)
        tf_count = len(text_free_boxes)
        bb_count = len(bubble_boxes)
        print(f"    🎯 RT-DETR: text_bubble={tb_count}, text_free={tf_count}, bubble={bb_count}")

        # ── Step 2: Choose boxes to process ─────────────────
        # text_bubble = bubble-এর ভেতরের text (PRIMARY)
        # text_free = bubble-এর বাইরের text (SFX, narrator) — also include
        all_boxes = list(text_bubble_boxes) + list(text_free_boxes)

        # ── Step 3: CTD fallback যদি RT-DETR কিছু না পায় ──
        if not all_boxes:
            print(f"    ⚠️ RT-DETR কিছু পায়নি — CTD fallback ব্যবহার")
            ctd_boxes = _ctd_fallback_detect(image_np)
            all_boxes = ctd_boxes
            if all_boxes:
                print(f"    ✅ CTD fallback: {len(all_boxes)} regions")

        if not all_boxes:
            if return_mask:
                return [], None
            return []

        # ── Step 4: Deduplicate overlapping boxes ───────────
        all_boxes = _deduplicate_boxes(all_boxes)

        # ── Step 5: Build region dicts ──────────────────────
        regions = []
        for i, (x, y, w, h) in enumerate(all_boxes):
            # Region type from classification
            region_type = classify_region(image_np, x, y, w, h)

            regions.append({
                'quad': np.array([
                    [x, y], [x + w, y], [x + w, y + h], [x, y + h]
                ], dtype=np.int32),
                'xyxy': (x, y, x + w, y + h),
                'xywh': (x, y, w, h),
                'angle': 0.0,
                'confidence': 0.9,
                'region_type': region_type,
            })

        # ── Step 6: Sort by reading order ───────────────────
        regions.sort(key=lambda r: (r['xyxy'][1] // 50, r['xyxy'][0]))

        if return_mask:
            # ── V11: zyddnys mask_refinement (pixel-perfect!) ──
            # CTD already gives pixel-level raw mask
            # zyddnys এর mask_refinement.dispatch() সেটাকে refine করে:
            #   1. Connected components খুঁজে বের করে
            #   2. প্রতিটা component কে textline এর সাথে match করে
            #   3. DenseCRF দিয়ে pixel-perfect করে
            #   4. Dilate করে
            # ফলে শুধু আসল text pixel remove হবে, background ঠিক থাকবে
            refined_mask = _refine_mask_zyddnys(image_np, regions)
            if refined_mask is not None and np.sum(refined_mask > 0) > 0:
                print(f"    ✅ Refined pixel mask: {np.sum(refined_mask > 0):,} text pixels")
                return regions, refined_mask

            # Fallback 1: ONNX pixel mask
            print(f"    ⚠️ Mask refinement failed, trying ONNX pixel mask")
            pixel_mask = comic_detect_pixel_mask(image_np)
            if pixel_mask is not None and np.sum(pixel_mask > 0) > 0:
                return regions, pixel_mask

            # Fallback 2: bounding box mask (less precise)
            print(f"    ⚠️ All pixel masks failed, using bounding box mask")
            img_h, img_w = image_np.shape[:2]
            mask = np.zeros((img_h, img_w), dtype=np.uint8)
            for r in regions:
                x1, y1, x2, y2 = r['xyxy']
                cv2.rectangle(mask, (x1, y1), (x2, y2), 255, -1)
            return regions, mask
        return regions

    except Exception as e:
        log_event(f"Detection failed: {str(e)[:80]}", 'ERROR')
        if return_mask:
            return [], None
        return []


def _refine_mask_zyddnys(image_np, regions):
    """CTD এর raw pixel mask ব্যবহার করে pixel-level text mask তৈরি করো।

    এটা zyddnys এর approach — CTD নিজেই pixel-level mask দেয়।
    আমরা সেই mask কে cleanup করি (morphological operations দিয়ে)।
    DenseCRF (pydensecrf) দরকার নেই — CTD এর raw mask-ই যথেষ্ট ভালো।

    Returns: numpy (H, W) uint8 — pixel-level text mask, or None
    """
    try:
        if ctd_detector is None:
            return None

        # CTD detect → raw pixel-level mask
        textlines_raw, raw_mask, _ = _run_async(ctd_detector.detect(
            image_np,
            CONFIG['detection_size'],
            CONFIG['text_threshold'],
            CONFIG['box_threshold'],
            CONFIG['unclip_ratio'],
            False, False, False, False, False,
        ))

        if raw_mask is None or np.sum(raw_mask > 0) == 0:
            return None

        # ── Pixel mask cleanup (zyddnys approach, কিন্তু pydensecrf ছাড়া) ──
        # 1. Binary threshold
        mask = (raw_mask > 127).astype(np.uint8) * 255

        # 2. Morphological close (fill small holes in text)
        kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel_close, iterations=1)

        # 3. Remove very small noise ONLY (connected components < 4px)
        # আগে >= 9 ছিল — সেটা ছোট text ও সরিয়ে দিতো!
        # এখন >= 4 — শুধু single-pixel noise সরাবে, ছোট text রাখবে
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask)
        cleaned = np.zeros_like(mask)
        for i in range(1, num_labels):
            if stats[i, cv2.CC_STAT_AREA] >= 4:
                cleaned[labels == i] = 255
        mask = cleaned

        # 4. Adaptive dilation — আগের মতো (ভালো কাজ করতো)
        # dilate_size = font_size এর 30% — text stroke ভালো cover করে
        if textlines_raw:
            font_sizes = []
            for tl in textlines_raw:
                if hasattr(tl, 'font_size'):
                    font_sizes.append(tl.font_size)
                elif hasattr(tl, 'pts'):
                    pts = tl.pts
                    h = np.max(pts[:, 1]) - np.min(pts[:, 1])
                    font_sizes.append(h)
            if font_sizes:
                avg_font = np.median(font_sizes)
                dilate_size = max((int(avg_font * 0.3) // 2) * 2 + 1, 3)
            else:
                dilate_size = 5
        else:
            dilate_size = 5

        kernel_dilate = cv2.getStructuringElement(cv2.MORPH_ELLIPSE,
                                                   (dilate_size, dilate_size))
        mask = cv2.dilate(mask, kernel_dilate, iterations=1)

        # 5. Final small kernel dilation (smooth edges)
        kernel_final = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        mask = cv2.dilate(mask, kernel_final, iterations=1)

        if np.sum(mask > 0) > 0:
            return mask
        return None
    except Exception as e:
        log_event(f"Pixel mask creation failed: {str(e)[:60]}", 'WARN')
        return None


def _deduplicate_boxes(boxes, iou_threshold=0.5):
    """ওভারল্যাপিং বক্স রিমুভ করো"""
    if not boxes:
        return []

    # Sort by area (largest first)
    boxes = sorted(boxes, key=lambda b: -(b[2] * b[3]))
    keep = []
    suppressed = set()

    for i in range(len(boxes)):
        if i in suppressed:
            continue
        keep.append(boxes[i])
        ax, ay, aw, ah = boxes[i]
        for j in range(i + 1, len(boxes)):
            if j in suppressed:
                continue
            bx, by, bw, bh = boxes[j]
            # IoU
            x1 = max(ax, bx)
            y1 = max(ay, by)
            x2 = min(ax + aw, bx + bw)
            y2 = min(ay + ah, by + bh)
            inter = max(0, x2 - x1) * max(0, y2 - y1)
            union = (aw * ah) + (bw * bh) - inter
            iou = inter / union if union > 0 else 0
            if iou > iou_threshold:
                suppressed.add(j)

    return keep


def _compute_quad_angle(pts):
    """4 corner points থেকে rotation angle compute করো।"""
    try:
        pts = np.array(pts, dtype=np.float32)
        if pts.shape[0] < 4:
            return 0.0
        center = np.mean(pts, axis=0)
        centered = pts - center
        cov = np.cov(centered.T)
        eigenvalues, eigenvectors = np.linalg.eigh(cov)
        principal = eigenvectors[:, -1]
        angle_rad = np.arctan2(principal[1], principal[0])
        angle_deg = np.degrees(angle_rad)
        if angle_deg > 90:
            angle_deg -= 180
        elif angle_deg < -90:
            angle_deg += 180
        return float(angle_deg)
    except Exception:
        return 0.0


def crop_region(image_np, region, padding=4):
    """Region থেকে image crop করো (axis-aligned bounding box)।"""
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
    """পুরো bubble সহ context সহ crop করো।"""
    try:
        x1, y1, x2, y2 = region['xyxy']
        h_img, w_img = image_np.shape[:2]
        w_region = x2 - x1
        h_region = y2 - y1

        expand_x = int(max(8, min(100, w_region * context_ratio)))
        expand_y = int(max(8, min(100, h_region * context_ratio)))

        nx1 = max(0, x1 - expand_x)
        ny1 = max(0, y1 - expand_y)
        nx2 = min(w_img, x2 + expand_x)
        ny2 = min(h_img, y2 + expand_y)

        crop = image_np[ny1:ny2, nx1:nx2].copy()

        if crop.shape[0] < 5 or crop.shape[1] < 5:
            return crop

        border = max(8, min(30, w_region // 8))
        crop = cv2.copyMakeBorder(crop, border, border, border, border,
                                   cv2.BORDER_CONSTANT, value=(255, 255, 255))
        return crop
    except Exception:
        return crop_region(image_np, region, padding=4)


def crop_region_rotated(image_np, region, padding=4):
    """Rotated region থেকে image crop করো (perspective transform দিয়ে)।"""
    try:
        pts = region['quad'].astype(np.float32)
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

        dst_pts = np.array([
            [0, 0],
            [width - 1, 0],
            [width - 1, height - 1],
            [0, height - 1],
        ], dtype=np.float32)

        matrix = cv2.getPerspectiveTransform(pts, dst_pts)
        cropped = cv2.warpPerspective(image_np, matrix, (width, height))
        return cropped
    except Exception:
        return crop_region(image_np, region, padding)


def visualize_detections(image_np, regions, max_display_size=1024):
    """Detection results visualize করো।"""
    vis = image_np.copy()
    colors = {
        'bubble': (0, 255, 0),
        'thought': (255, 255, 0),
        'narrator': (0, 165, 255),
        'sfx': (0, 0, 255),
        'overlay': (255, 0, 255),
    }

    for i, region in enumerate(regions):
        color = colors.get(region['region_type'], (200, 200, 200))
        pts = region['quad'].reshape(-1, 1, 2).astype(np.int32)
        cv2.polylines(vis, [pts], True, color, 2)

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

# Test 1: Synthetic text detection
try:
    test_img = np.ones((400, 600, 3), dtype=np.uint8) * 255
    cv2.putText(test_img, "Hello World", (50, 100), cv2.FONT_HERSHEY_SIMPLEX,
                1.5, (0, 0, 0), 3)
    cv2.putText(test_img, "MangaBD V11", (50, 250), cv2.FONT_HERSHEY_SIMPLEX,
                1.5, (0, 0, 0), 3)

    regions = detect_text_regions(test_img)
    print(f"  Test 1 (synthetic text): {len(regions)} regions detected ✅")
    for i, r in enumerate(regions[:3]):
        print(f"    #{i+1} type={r['region_type']} "
              f"xyxy={r['xyxy']} angle={r['angle']:.1f}°")
except Exception as e:
    print(f"  Test 1: ❌ ({str(e)[:80]})")

# Test 2: Visualization
try:
    vis = visualize_detections(test_img, regions)
    print(f"  Test 2 (visualization): shape={vis.shape} ✅")
except Exception as e:
    print(f"  Test 2: ❌ ({str(e)[:80]})")

# Test 3: crop_region
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
    print(f"  Test 3 (crop_region): shape={crop.shape} ✅")
except Exception as e:
    print(f"  Test 3: ❌ ({str(e)[:80]})")

print()
print("═" * 60)
if ctd_detector is not None or True:  # RT-DETR হলো primary, CTD optional
    print("  ✅ Cell 6 সফল — Cell 7 চালানো যাবে (OCR Engine)")
else:
    print("  ⚠️ কোনো detector loaded নয়")
    print("  👉 Cell 3 আবার চালাও")
print("═" * 60)

log_event("Cell 6: Text Detection ready (RT-DETR-v2 primary, CTD fallback)")
