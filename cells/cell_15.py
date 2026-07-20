# ═══════════════════════════════════════════════════════════
# ✍️ CELL 15 — Bengali Text Rendering (V11: Pillow + libraqm)
# ═══════════════════════════════════════════════════════════
# প্রতিটি inpainted page-এ Bengali অনুবাদ render করবে।
# Font-size distribution chart দেখাবে।
# Per-region closeup: Original → Inpainted → Rendered
# ═══════════════════════════════════════════════════════════

import time
import numpy as np
import cv2
from PIL import Image as PILImage
from tqdm import tqdm
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# Bengali font support for matplotlib
import matplotlib.font_manager as fm
try:
    fm.fontManager.addfont(CONFIG['font_regular'])
    fm.fontManager.addfont(CONFIG['font_bold'])
    plt.rcParams['font.sans-serif'] = ['Noto Sans Bengali', 'DejaVu Sans']
    plt.rcParams['axes.unicode_minus'] = False
except Exception:
    pass

print("=" * 60)
print("  ✍️ MangaBD V11 — Bengali Text Rendering")
print("=" * 60)
print()

if not inpainted_images:
    print("  ❌ Inpainted images নেই! আগে Cell 14 চালাও")
    print("=" * 60)
elif translation_df is None or len(translation_df) == 0:
    print("  ❌ Translation data নেই! আগে Cell 13 চালাও")
    print("=" * 60)
else:

    output_images.clear()
    quality_warnings.clear()

    font_sizes_used = []  # for distribution chart

    total_pages = len(inpainted_images)
    print(f"  📂 {total_pages} টি page render হবে")
    print()

    # ── Process each page ──
    for page_idx, (filename, inpainted_np) in enumerate(inpainted_images.items(), 1):
        print(f"  ╔═══════════════════════════════════════════╗")
        print(f"  ║  [{page_idx}/{total_pages}] {filename}")
        print(f"  ╚═══════════════════════════════════════════╝")

        # Skip if already done
        if is_page_done(filename, 'render'):
            print(f"    ✅ Already rendered (checkpoint) — skip")
            # Restore from Drive if available
            cached = f"{CONFIG['results_dir']}/{filename}"
            if os.path.exists(cached):
                output_images[filename] = PILImage.open(cached).convert('RGB')
            print()
            continue

        page_start = time.time()

        # Convert BGR (numpy) → RGB (PIL)
        inpainted_rgb = cv2.cvtColor(inpainted_np, cv2.COLOR_BGR2RGB)
        canvas_pil = PILImage.fromarray(inpainted_rgb).copy()  # mutable copy

        # Get this page's regions
        page_rows = translation_df[translation_df['page'] == filename].sort_values('id')

        rendered_count = 0
        skipped_count = 0

        for _, row in page_rows.iterrows():
            rid = int(row['id'])
            x, y = int(row['x']), int(row['y'])
            w, h = int(row['width']), int(row['height'])
            angle = float(row.get('angle', 0.0))
            rtype = str(row.get('region_type', 'overlay'))
            trans = str(row.get('translated_text', '')).strip()
            orig = str(row.get('original_text', '')).strip()

            # Skip if no translation or markers
            if not trans or trans in ('[EMPTY]', '[OCR_FAILED]', '[SFX]',
                                       '[SKIP:OCR_FAILED]', '[TRANS_FAILED]', 'nan'):
                skipped_count += 1
                quality_warnings.append({
                    'page': filename,
                    'region_id': rid,
                    'issue': f'Skipped: no translation ({trans})',
                    'severity': '🟡',
                })
                continue

            # Skip if translation == original (still English)
            if trans == orig:
                skipped_count += 1
                quality_warnings.append({
                    'page': filename,
                    'region_id': rid,
                    'issue': 'Translation same as original (still English?)',
                    'severity': '🟡',
                })
                continue

            # Determine bold
            bold = (rtype == 'sfx' or rtype == 'narrator')

            # Determine stroke width from CONFIG (Cell 2 তে set করা)
            stroke = CONFIG['text_stroke_width']

            # Render
            try:
                # Estimate font size that will be used (for tracking)
                est_size, _, _ = fit_font_size(trans, w, h, bold=bold)
                font_sizes_used.append(est_size)

                canvas_pil = render_bengali_text(
                    canvas_pil, trans,
                    x, y, w, h,
                    angle=angle,
                    region_type=rtype,
                    bold=bold,
                    stroke_width=stroke,
                )

                # Update Bengali validity
                translation_df.loc[
                    (translation_df['page'] == filename) &
                    (translation_df['id'] == rid),
                    'bengali_valid'
                ] = is_bengali_text_valid(trans)

                rendered_count += 1

                # Check for font overflow (text bigger than region)
                if est_size <= CONFIG['font_size_min'] and len(trans) > 20:
                    quality_warnings.append({
                        'page': filename,
                        'region_id': rid,
                        'issue': f'Font at min size ({est_size}px) — text may overflow',
                        'severity': '🟡',
                    })

            except Exception as e:
                log_event(f"Render failed [{filename}:{rid}]: {str(e)[:50]}",
                          level='WARN')
                quality_warnings.append({
                    'page': filename,
                    'region_id': rid,
                    'issue': f'Render error: {str(e)[:40]}',
                    'severity': '🔴',
                })

        # Save to Drive
        output_path = f"{CONFIG['results_dir']}/{filename}"
        canvas_pil.save(output_path, quality=95)
        output_images[filename] = canvas_pil

        # Mark done
        mark_page_done(filename, 'render')

        page_time = time.time() - page_start
        print(f"    ✅ Rendered {rendered_count}, skipped {skipped_count} "
              f"in {page_time:.1f}s")
        print()

    # ── Font-size distribution chart ──
    if font_sizes_used:
        print("─" * 60)
        print("  📊 Font Size Distribution")
        print("─" * 60)
        print()

        fig, ax = plt.subplots(1, 1, figsize=(10, 4), constrained_layout=True)
        ax.hist(font_sizes_used, bins=range(CONFIG['font_size_min'],
                                              CONFIG['font_size_max'] + 2, 2),
                color='#4a90e2', edgecolor='white', alpha=0.8)
        ax.axvline(np.mean(font_sizes_used), color='red', linestyle='--',
                   label=f'Mean: {np.mean(font_sizes_used):.1f}px')
        ax.set_xlabel('Font size (px)')
        ax.set_ylabel('Number of regions')
        ax.set_title('Bengali Font Size Distribution (V11)')
        ax.legend()
        ax.grid(True, alpha=0.3)
        plt.show()

        print(f"  📈 Sizes: min={min(font_sizes_used)}px, "
              f"max={max(font_sizes_used)}px, "
              f"mean={np.mean(font_sizes_used):.1f}px, "
              f"median={np.median(font_sizes_used):.1f}px")
        print()

    # ── Preview ──
    print("─" * 60)
    print("  🖼️ Rendered pages preview")
    print("─" * 60)

    for filename, output_pil in list(output_images.items())[:3]:
        print(f"\n  📄 {filename}")
        w, h = output_pil.size
        scale = min(CONFIG['preview_max_width'] / w, 1.0)
        new_w = int(w * scale)
        new_h = int(h * scale)
        preview = output_pil.resize((new_w, new_h), PILImage.LANCZOS)
        display(preview)

    # ── Per-region closeup ──
    if output_images and uploaded_images:
        print()
        print("─" * 60)
        print("  🔍 Per-region closeup: Original → Inpainted → Rendered")
        print("─" * 60)

        first_page = list(output_images.keys())[0]
        original = uploaded_images.get(first_page)
        inpainted = inpainted_images.get(first_page)
        rendered = output_images.get(first_page)

        if original is not None and inpainted is not None and rendered is not None:
            page_rows = translation_df[translation_df['page'] == first_page]
            page_rows = page_rows[page_rows['translated_text'].notna() &
                                   (page_rows['translated_text'] != '')].head(5)

            for _, row in page_rows.iterrows():
                rid = int(row['id'])
                x, y = int(row['x']), int(row['y'])
                w_r, h_r = int(row['width']), int(row['height'])
                rtype = str(row.get('region_type', ''))
                trans = str(row.get('translated_text', ''))[:30]
                orig = str(row.get('original_text', ''))[:30]

                pad = max(10, max(w_r, h_r) // 2)
                x1 = max(0, x - pad)
                y1 = max(0, y - pad)
                x2 = min(original.shape[1], x + w_r + pad)
                y2 = min(original.shape[0], y + h_r + pad)

                # Crops (BGR for original/inpainted, RGB for rendered)
                orig_crop = original[y1:y2, x1:x2]
                inp_crop = inpainted[y1:y2, x1:x2]
                rendered_crop = np.array(rendered)[y1:y2, x1:x2]

                # All to RGB
                orig_rgb = cv2.cvtColor(orig_crop, cv2.COLOR_BGR2RGB)
                inp_rgb = cv2.cvtColor(inp_crop, cv2.COLOR_BGR2RGB)
                rend_rgb = rendered_crop  # already RGB

                # Combined
                h_c, w_c = orig_rgb.shape[:2]
                combined = np.ones((h_c, w_c * 3 + 40, 3), dtype=np.uint8) * 255
                combined[:h_c, :w_c] = orig_rgb
                combined[:h_c, w_c + 20:2*w_c + 20] = inp_rgb
                combined[:h_c, 2*w_c + 40:] = rend_rgb

                cv2.putText(combined, "ORIG", (10, 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
                cv2.putText(combined, "INPAINT", (w_c + 30, 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
                cv2.putText(combined, "RENDER", (2*w_c + 50, 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

                print(f"\n    [{rid}] {rtype} '{orig}' → '{trans}'")
                display(PILImage.fromarray(combined))

    print()
    print("═" * 60)
    print(f"  📊 Render Summary")
    print("═" * 60)
    print(f"  Pages rendered : {len(output_images)}/{total_pages}")
    print(f"  Quality warnings: {len(quality_warnings)}")
    print()
    print("  ✅ Cell 15 সফল — Cell 16 চালানো যাবে (Quality Inspector)")
    print("═" * 60)

    log_event(f"Cell 15: {len(output_images)} pages rendered, "
              f"{len(quality_warnings)} warnings")
