# ═══════════════════════════════════════════════════════════
# ✂️ CELL 14 — Full Page Inpainting (V11: LaMa Large)
# ═══════════════════════════════════════════════════════════
# প্রতিটি page-এর সব text regions একসাথে inpaint করবে।
# Original → Mask → Result preview দেখাবে।
# Per-region closeup: Original → Mask → Result
# ═══════════════════════════════════════════════════════════

import time
import numpy as np
import cv2
from PIL import Image as PILImage
from tqdm import tqdm

print("=" * 60)
print("  ✂️ MangaBD V11 — Full Page Inpainting (LaMa Large)")
print("=" * 60)
print()

if not uploaded_images:
    print("  ❌ কোনো image নেই! আগে Cell 10 চালাও")
    print("=" * 60)
elif translation_df is None or len(translation_df) == 0:
    print("  ❌ Translation data নেই! আগে Cell 11 চালাও")
    print("=" * 60)
else:

    inpainted_images.clear()
    total_pages = len(uploaded_images)

    print(f"  📂 {total_pages} টি page inpaint হবে")
    print(f"  🔧 Inpainting engine: "
          f"{'LaMa Large' if lama_inpainter is not None else 'OpenCV (fallback)'}")
    print()

    # ── Process each page ──
    for page_idx, (filename, img_bgr) in enumerate(uploaded_images.items(), 1):
        print(f"  ╔═══════════════════════════════════════════╗")
        print(f"  ║  [{page_idx}/{total_pages}] {filename}")
        print(f"  ╚═══════════════════════════════════════════╝")

        # Skip if already done
        if is_page_done(filename, 'inpaint'):
            print(f"    ✅ Already inpainted (checkpoint) — skip")
            print()
            continue

        page_start = time.time()

        # Get regions from translation_df
        page_rows = translation_df[translation_df['page'] == filename]
        regions = []
        for _, row in page_rows.iterrows():
            regions.append({
                'quad': np.array([
                    [row['x'], row['y']],
                    [row['x'] + row['width'], row['y']],
                    [row['x'] + row['width'], row['y'] + row['height']],
                    [row['x'], row['y'] + row['height']],
                ]),
                'xyxy': (row['x'], row['y'],
                         row['x'] + row['width'], row['y'] + row['height']),
                'xywh': (row['x'], row['y'], row['width'], row['height']),
                'angle': row.get('angle', 0.0),
                'confidence': row.get('confidence', 0.9),
                'region_type': row.get('region_type', 'overlay'),
            })

        # Run inpainting
        try:
            inpainted = inpaint_full_page(img_bgr, regions)
            inpainted_images[filename] = inpainted
            mark_page_done(filename, 'inpaint')

            page_time = time.time() - page_start
            print(f"    ✅ Inpainted in {page_time:.1f}s")
        except Exception as e:
            log_event(f"Inpainting failed for {filename}: {str(e)[:60]}",
                      level='ERROR')
            # Fallback: use original
            inpainted_images[filename] = img_bgr.copy()

        print()

    # ── Preview ──
    print("═" * 60)
    print("  🖼️ Preview: Original → Inpainted")
    print("═" * 60)
    print()

    for filename, inpainted in inpainted_images.items():
        original = uploaded_images.get(filename)
        if original is None:
            continue

        print(f"  📄 {filename}:")

        # Side-by-side comparison
        h, w = original.shape[:2]
        scale = min(CONFIG['preview_max_width'] / w, 1.0)
        new_w = int(w * scale)
        new_h = int(h * scale)

        orig_r = cv2.resize(original, (new_w, new_h))
        inp_r = cv2.resize(inpainted, (new_w, new_h))

        # Combined
        combined = np.ones((new_h, new_w * 2 + 20, 3), dtype=np.uint8) * 255
        combined[:new_h, :new_w] = orig_r
        combined[:new_h, new_w + 20:] = inp_r

        # Add labels
        cv2.putText(combined, "ORIGINAL", (10, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
        cv2.putText(combined, "INPAINTED", (new_w + 30, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)

        combined_rgb = cv2.cvtColor(combined, cv2.COLOR_BGR2RGB)
        display(PILImage.fromarray(combined_rgb))
        print()

    # ── Per-region closeup (first 5 regions of first page) ──
    if inpainted_images:
        first_page = list(inpainted_images.keys())[0]
        original = uploaded_images[first_page]
        inpainted = inpainted_images[first_page]
        page_rows = translation_df[translation_df['page'] == first_page]

        if len(page_rows) > 0:
            print(f"  🔍 Per-region closeup: {first_page}")
            print(f"     (Original → Mask → Result — first 5 regions)")
            print()

            for idx, row in page_rows.head(5).iterrows():
                rid = int(row['id'])
                x, y = int(row['x']), int(row['y'])
                w_r, h_r = int(row['width']), int(row['height'])
                rtype = str(row.get('region_type', ''))
                orig_text = str(row.get('original_text', ''))[:30]

                # Expand crop area for context
                pad = max(10, max(w_r, h_r) // 2)
                x1 = max(0, x - pad)
                y1 = max(0, y - pad)
                x2 = min(original.shape[1], x + w_r + pad)
                y2 = min(original.shape[0], y + h_r + pad)

                # Crops
                orig_crop = original[y1:y2, x1:x2]
                inp_crop = inpainted[y1:y2, x1:x2]

                # Mask crop
                mask_full = np.zeros(original.shape[:2], dtype=np.uint8)
                cv2.rectangle(mask_full, (x, y), (x + w_r, y + h_r), 255, -1)
                mask_crop = mask_full[y1:y2, x1:x2]
                # Convert to 3-channel for display
                mask_rgb = cv2.cvtColor(mask_crop, cv2.COLOR_GRAY2BGR)

                # Combined: original | mask | result
                h_c, w_c = orig_crop.shape[:2]
                combined = np.ones((h_c, w_c * 3 + 40, 3), dtype=np.uint8) * 255
                combined[:h_c, :w_c] = orig_crop
                combined[:h_c, w_c + 20:2*w_c + 20] = mask_rgb
                combined[:h_c, 2*w_c + 40:] = inp_crop

                # Labels
                cv2.putText(combined, "ORIG", (10, 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
                cv2.putText(combined, "MASK", (w_c + 30, 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
                cv2.putText(combined, "RESULT", (2*w_c + 50, 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

                print(f"    [{rid}] {rtype} '{orig_text}'")
                combined_rgb = cv2.cvtColor(combined, cv2.COLOR_BGR2RGB)
                display(PILImage.fromarray(combined_rgb))

    print()
    print("═" * 60)
    print("  ✅ Cell 14 সফল — Cell 15 চালানো যাবে (Bengali Rendering)")
    print("═" * 60)

    log_event(f"Cell 14: {len(inpainted_images)} pages inpainted")
