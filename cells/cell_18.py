# ═══════════════════════════════════════════════════════════
# 🖼️ CELL 18 — Preview & Download (V11, from V1)
# ═══════════════════════════════════════════════════════════
# Original vs final comparison, closeup, download, ZIP
# ═══════════════════════════════════════════════════════════

import os
import zipfile
import io
from PIL import Image as PILImage
from datetime import datetime

print("=" * 60)
print("  🖼️ MangaBD V11 — Preview & Download")
print("=" * 60)
print()

if not output_images:
    print("  ❌ Output images নেই! আগে Cell 15 চালাও")
    print("=" * 60)
else:

    # ── Original vs Final comparison ──
    print("─" * 60)
    print("  📸 Original vs Final Comparison")
    print("─" * 60)
    print()

    for filename, output_pil in output_images.items():
        original = uploaded_images.get(filename)

        print(f"  📄 {filename}")

        if original is not None:
            # Side-by-side
            h, w = original.shape[:2]
            scale = min(CONFIG['preview_max_width'] / w, 1.0)
            dw, dh = int(w * scale), int(h * scale)

            orig_r = cv2.resize(original, (dw, dh))
            orig_rgb = cv2.cvtColor(orig_r, cv2.COLOR_BGR2RGB)
            orig_pil = PILImage.fromarray(orig_rgb)

            final_r = output_pil.resize((dw, dh), PILImage.LANCZOS)

            # Combine
            combined = PILImage.new('RGB', (dw * 2 + 20, dh), (255, 255, 255))
            combined.paste(orig_pil, (0, 0))
            combined.paste(final_r, (dw + 20, 0))

            display(combined)
            print()

    # ── Closeup comparison ──
    print("─" * 60)
    print("  🔍 Closeup Comparison (first page, first 5 regions)")
    print("─" * 60)
    print()

    first_page = list(output_images.keys())[0]
    original = uploaded_images.get(first_page)
    output_pil = output_images[first_page]
    page_rows = translation_df[translation_df['page'] == first_page]

    if original is not None and len(page_rows) > 0:
        for _, row in page_rows.head(5).iterrows():
            rid = int(row['id'])
            x, y = int(row['x']), int(row['y'])
            w, h = int(row['width']), int(row['height'])
            rtype = str(row.get('region_type', ''))
            orig_t = str(row.get('original_text', ''))[:30]
            trans_t = str(row.get('translated_text', ''))[:30]

            pad = max(10, max(w, h) // 2)
            x1 = max(0, x - pad)
            y1 = max(0, y - pad)
            x2 = min(original.shape[1], x + w + pad)
            y2 = min(original.shape[0], y + h + pad)

            orig_crop = original[y1:y2, x1:x2]
            orig_rgb = cv2.cvtColor(orig_crop, cv2.COLOR_BGR2RGB)
            out_np = np.array(output_pil)
            out_crop = out_np[y1:y2, x1:x2]

            h_c, w_c = orig_rgb.shape[:2]
            combined = np.ones((h_c, w_c * 2 + 20, 3), dtype=np.uint8) * 255
            combined[:h_c, :w_c] = orig_rgb
            combined[:h_c, w_c + 20:] = out_crop

            cv2.putText(combined, "ORIGINAL", (10, 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
            cv2.putText(combined, "FINAL", (w_c + 30, 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

            print(f"    [{rid}] {rtype}: '{orig_t}' → '{trans_t}'")
            display(PILImage.fromarray(combined))

    print()

    # ── Download options ──
    print("═" * 60)
    print("  📥 Download Options")
    print("═" * 60)
    print()

    # Save final images to Drive
    save_dir = f"{CONFIG['results_dir']}/final_{CHECKPOINT['session_id']}"
    os.makedirs(save_dir, exist_ok=True)

    for filename, output_pil in output_images.items():
        save_path = f"{save_dir}/{filename}"
        output_pil.save(save_path, quality=95)

    print(f"  ✅ {len(output_images)} images saved to Drive:")
    print(f"     📁 {save_dir}")
    print()

    # Single download buttons
    download_single_btn = widgets.Button(
        description='📥 Download Single (zip)',
        button_style='info',
        layout=widgets.Layout(width='250px', height='40px')
    )
    download_all_btn = widgets.Button(
        description='📦 Download All as ZIP',
        button_style='success',
        layout=widgets.Layout(width='250px', height='40px')
    )
    download_data_btn = widgets.Button(
        description='📊 Download Translation Data (CSV)',
        button_style='warning',
        layout=widgets.Layout(width='300px', height='40px')
    )

    def on_download_single(btn):
        """Download single image (let user pick)."""
        print("\n  📤 যে image চাও সেটি choose করো:")
        filenames = list(output_images.keys())
        dropdown = widgets.Dropdown(
            options=filenames,
            description='File:',
            layout=widgets.Layout(width='400px')
        )
        confirm = widgets.Button(description='⬇️ Download', button_style='success')

        def on_confirm(c):
            chosen = dropdown.value
            save_path = f"{save_dir}/{chosen}"
            files.download(save_path)
            print(f"\n  ✅ Downloading: {chosen}")

        confirm.on_click(on_confirm)
        display(widgets.VBox([dropdown, confirm]))

    def on_download_all(btn):
        """Download all as ZIP."""
        print("\n  📦 ZIP file তৈরি হচ্ছে...")
        zip_path = f"{CONFIG['temp_dir']}/MangaBD_V11_results_{CHECKPOINT['session_id']}.zip"

        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Add images
            for filename, output_pil in output_images.items():
                buf = io.BytesIO()
                output_pil.save(buf, format='PNG')
                zf.writestr(filename, buf.getvalue())

            # Add translation data CSV
            csv_data = translation_df.to_csv(index=False)
            zf.writestr('translation_data.csv', csv_data)

            # Add ai.Text export
            ai_lines = []
            for filename in translation_df['page'].unique():
                page_rows = translation_df[translation_df['page'] == filename].sort_values('id')
                for _, row in page_rows.iterrows():
                    rid = int(row['id'])
                    orig = str(row.get('original_text', '')).strip()
                    trans = str(row.get('translated_text', '')).strip()
                    ai_lines.append(f"[{filename}:{rid}] {orig} → {trans}")
            zf.writestr('translation_data.txt', '\n'.join(ai_lines))

            # Add session log
            zf.writestr('session_log.txt', '\n'.join(session_log))

            # Add checkpoint
            with open(CONFIG['checkpoint_file'], 'r') as f:
                zf.writestr('checkpoint.json', f.read())

        print(f"  ✅ ZIP file: {zip_path}")
        print(f"     📏 {os.path.getsize(zip_path)/1024:.0f} KB")
        files.download(zip_path)
        print(f"  ✅ Download শুরু হয়েছে")

    def on_download_data(btn):
        """Download translation CSV."""
        print("\n  📊 Translation CSV তৈরি হচ্ছে...")
        csv_path = f"{CONFIG['temp_dir']}/translation_data_{CHECKPOINT['session_id']}.csv"
        translation_df.to_csv(csv_path, index=False, encoding='utf-8')
        files.download(csv_path)
        print(f"  ✅ Download শুরু হয়েছে: {csv_path}")

    download_single_btn.on_click(on_download_single)
    download_all_btn.on_click(on_download_all)
    download_data_btn.on_click(on_download_data)

    display(widgets.VBox([
        download_single_btn,
        download_all_btn,
        download_data_btn,
    ]))

    print()
    print("═" * 60)
    print("  📌 এরপর:")
    print("     • Cell 19 চালাও (Session Log) — সব stats দেখবে")
    print("     • বা Cell 20 চালাও (Dashboard) — interactive UI")
    print("═" * 60)

    log_event(f"Cell 18: {len(output_images)} images ready for download")
