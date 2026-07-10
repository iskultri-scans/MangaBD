# ═══════════════════════════════════════════════════════════
# 🔍 CELL 11 — Detection + OCR + Verification (V11)
# ═══════════════════════════════════════════════════════════
# প্রতিটি uploaded image-এর উপর:
#   1. CTD detection
#   2. OCR (Baidu primary, Qwen fallback)
#   3. English text filter
#   4. Visual verification (detection map, per-region crops)
#   5. translation_df তৈরি
# ═══════════════════════════════════════════════════════════

import time
import pandas as pd
from tqdm import tqdm
from PIL import Image as PILImage

print("=" * 60)
print("  🔍 MangaBD V11 — Detection + OCR + Verification")
print("=" * 60)
print()

if not uploaded_images:
    print("  ❌ কোনো image নেই! আগে Cell 10 চালাও")
    print("=" * 60)
else:

    # ── Setup ──
    rows = []
    all_detections = {}  # {filename: regions}
    ocr_engine_used = {'qwen': 0, 'failed': 0, 'skipped': 0}

    total_images = len(uploaded_images)
    print(f"  📂 {total_images} টি image process হবে")
    print(f"  🔧 OCR engine: {CONFIG['ocr_engine']}")
    print()

    # ── Process each image ──
    for page_idx, (filename, img_bgr) in enumerate(uploaded_images.items(), 1):

        print(f"  ╔═══════════════════════════════════════════╗")
        print(f"  ║  [{page_idx}/{total_images}] {filename}")
        print(f"  ╚═══════════════════════════════════════════╝")

        page_start = time.time()

        # Skip if already done (checkpoint)
        if is_page_done(filename, 'ocr'):
            print(f"    ✅ Already OCR'd (checkpoint) — skipping")
            print()
            continue

        # ── Step 1: Detection ──
        print(f"    🔎 Detecting text regions...")
        try:
            regions = detect_text_regions(img_bgr)
            all_detections[filename] = regions
            print(f"    ✅ {len(regions)} regions detected")
        except Exception as e:
            print(f"    ❌ Detection failed: {str(e)[:60]}")
            log_event(f"{filename}: detection failed — {str(e)[:60]}",
                      level='ERROR')
            continue

        if not regions:
            print(f"    ⚠️ কোনো text region পাওয়া যায়নি")
            print()
            continue

        # ── Step 2: OCR each region ──
        print(f"    📖 OCR processing {len(regions)} regions...")
        for i, region in enumerate(regions):
            try:
                # ─── V11: Use bubble-context crop for better OCR ──────
                # পুরোনো approach: শুধু text bounding box crop করতাম
                # সমস্যা: text-এর উপরে/নিচে কিছু অংশ কেটে যেত
                # নতুন approach: bubble সহ context (15% expand) সহ crop
                # + white border padding যাতে Baidu পুরো লেখা পড়তে পারে
                if abs(region.get('angle', 0.0)) > 5.0:
                    crop = crop_region_rotated(img_bgr, region)
                else:
                    crop = crop_bubble_with_context(img_bgr, region, context_ratio=0.15)

                # Skip tiny crops
                if crop.shape[0] < 5 or crop.shape[1] < 5:
                    ocr_engine_used['skipped'] += 1
                    text, conf, engine = '[EMPTY]', 0.0, 'none'
                else:
                    # Run OCR
                    text, conf, engine = ocr_recognize(crop)

                # Update counters
                if engine == 'qwen':
                    ocr_engine_used['qwen'] += 1
                elif '[OCR_FAILED' in text or '[EMPTY]' in text:
                    ocr_engine_used['failed'] += 1
                else:
                    ocr_engine_used['skipped'] += 1

                # English filter (V11 new)
                is_eng = is_english_text(text) if text and '[EMPTY]' not in text else False

                # Build row
                x, y, w, h = region['xywh']
                rows.append({
                    'page': filename,
                    'id': i + 1,
                    'region_type': region['region_type'],
                    'x': x, 'y': y, 'width': w, 'height': h,
                    'angle': region.get('angle', 0.0),
                    'original_text': text,
                    'translated_text': '',  # will be filled in Cell 13
                    'confidence': float(conf),
                    'ocr_engine': engine,
                    'translator_engine': '',
                    'quality_score': '',
                    'is_english': bool(is_eng),
                    'bengali_valid': False,
                })

                # Progress indicator
                short_text = text[:30] + ('...' if len(text) > 30 else '')
                status_icon = '✅' if conf >= 0.5 else '⚠️'
                print(f"      [{i+1:2d}] {region['region_type']:8s} "
                      f"conf={conf:.2f} {engine:6s} {status_icon} "
                      f"'{short_text}'")

            except Exception as e:
                log_event(f"OCR region {i+1} failed: {str(e)[:50]}",
                          level='WARN')
                # Add failed row
                rows.append({
                    'page': filename,
                    'id': i + 1,
                    'region_type': region.get('region_type', 'overlay'),
                    'x': region['xywh'][0], 'y': region['xywh'][1],
                    'width': region['xywh'][2], 'height': region['xywh'][3],
                    'angle': region.get('angle', 0.0),
                    'original_text': '[OCR_FAILED]',
                    'translated_text': '',
                    'confidence': 0.0,
                    'ocr_engine': 'none',
                    'translator_engine': '',
                    'quality_score': '',
                    'is_english': False,
                    'bengali_valid': False,
                })

        # Mark page as done
        mark_page_done(filename, 'ocr')
        set_page_meta(filename, 'ocr_engine', CONFIG['ocr_engine'])

        page_time = time.time() - page_start
        print(f"    ⏱️  Time: {page_time:.1f}s")
        print()

    # ── Build DataFrame ──
    if rows:
        translation_df = pd.DataFrame(rows)
    else:
        translation_df = pd.DataFrame(columns=[
            'page', 'id', 'region_type', 'x', 'y', 'width', 'height',
            'angle', 'original_text', 'translated_text', 'confidence',
            'ocr_engine', 'translator_engine', 'quality_score',
            'is_english', 'bengali_valid',
        ])

    # ── Summary ──
    print("═" * 60)
    print("  📊 Detection + OCR Summary")
    print("═" * 60)
    print(f"  Total pages    : {total_images}")
    print(f"  Total regions  : {len(translation_df)}")
    print()
    print(f"  OCR engine breakdown:")
    for engine, count in ocr_engine_used.items():
        pct = count / max(1, len(translation_df)) * 100
        print(f"    {engine:10s}: {count:3d} ({pct:.0f}%)")
    print()

    # Per-page summary
    print("  📄 Per-page:")
    for filename in uploaded_images:
        page_rows = translation_df[translation_df['page'] == filename]
        n_regions = len(page_rows)
        n_eng = sum(page_rows['is_english'])
        avg_conf = page_rows['confidence'].mean() if n_regions > 0 else 0
        print(f"    {filename}: {n_regions} regions, "
              f"{n_eng} English, avg conf {avg_conf:.2f}")

    print()

    # ── Visual Verification ──
    print("─" * 60)
    print("  🖼️ Visual Verification")
    print("─" * 60)
    print()

    for filename, img_bgr in list(uploaded_images.items())[:3]:
        regions = all_detections.get(filename, [])
        if not regions:
            continue

        print(f"  📄 {filename} ({len(regions)} regions):")

        # Detection map
        vis = visualize_detections(img_bgr, regions)
        h, w = vis.shape[:2]
        scale = min(CONFIG['preview_max_width'] / w, 1.0)
        new_w = int(w * scale)
        new_h = int(h * scale)
        vis_small = cv2.resize(vis, (new_w, new_h))
        vis_rgb = cv2.cvtColor(vis_small, cv2.COLOR_BGR2RGB)
        display(PILImage.fromarray(vis_rgb))

        # Per-region crops (first 6)
        print(f"  📝 Region crops (first 6):")
        for i, region in enumerate(regions[:6]):
            crop = crop_region(img_bgr, region)
            if crop.shape[0] > 5 and crop.shape[1] > 5:
                # Get OCR text for this region
                page_rows = translation_df[translation_df['page'] == filename]
                if i < len(page_rows):
                    row = page_rows.iloc[i]
                    text = row['original_text']
                    conf = row['confidence']
                else:
                    text, conf = '?', 0

                # Upscale small crops for display
                ch, cw = crop.shape[:2]
                if ch < 80 or cw < 80:
                    scale_crop = max(80 / ch, 80 / cw, 1.0)
                    crop_disp = cv2.resize(crop, (int(cw * scale_crop),
                                                   int(ch * scale_crop)))
                else:
                    crop_disp = crop

                crop_rgb = cv2.cvtColor(crop_disp, cv2.COLOR_BGR2RGB)
                print(f"    [{i+1}] {region['region_type']} "
                      f"({region['confidence']:.2f}) "
                      f"text='{text[:30]}' conf={conf:.2f}")
                display(PILImage.fromarray(crop_rgb))

        print()

    print("═" * 60)
    print("  ✅ Cell 11 সফল — Cell 12 চালানো যাবে (Export)")
    print("═" * 60)

    log_event(f"Cell 11: {len(translation_df)} regions OCR'd "
              f"({ocr_engine_used})")
