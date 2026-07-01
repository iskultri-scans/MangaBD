# ═══════════════════════════════════════════════════════════
# 📤 CELL 10 — Input (V11, from V1)
# ═══════════════════════════════════════════════════════════
# Image upload করবে — একবারে একাধিক ও সব ফরম্যাট সাপোর্ট করবে।
# ছোট image reject করবে (< 50x50)।
# Preview দেখাবে।
# ═══════════════════════════════════════════════════════════

import os
import io
from PIL import Image as PILImage

print("=" * 60)
print("  📤 MangaBD V11 — Image Input")
print("=" * 60)
print()

# ── Upload UI ─────────────────────────────────────────
print("  📤 নিচের button চেপে এক বা একাধিক manga page upload করো")
print("     (JPG, PNG, WEBP, BMP — একসাথে অনেকগুলো চলবে)")
print()

uploaded_files = files.upload()

if not uploaded_files:
    print("  ⚠️ কোনো file upload হয়নি — পরে আবার চেষ্টা করো")
else:
    print()
    print(f"  📥 {len(uploaded_files)} টি file পাওয়া গেছে")
    print("─" * 60)

    uploaded_images.clear()  # Reset from any previous run

    valid_count = 0
    for filename, content in uploaded_files.items():
        try:
            # Decode image
            nparr = np.frombuffer(content, np.uint8)
            img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img_bgr is None:
                print(f"  ❌ {filename}: decode failed")
                continue

            h, w = img_bgr.shape[:2]

            # Reject too-small images
            if h < CONFIG['min_image_size'] or w < CONFIG['min_image_size']:
                print(f"  ⚠️ {filename}: খুব ছোট ({w}x{h}) — skip")
                continue

            # Sanitize filename (no spaces)
            safe_name = filename.replace(' ', '_')
            if safe_name != filename:
                print(f"  ℹ️ Renamed: {filename} → {safe_name}")

            uploaded_images[safe_name] = img_bgr
            valid_count += 1
            print(f"  ✅ {safe_name}: {w}x{h} ({len(content)/1024:.0f} KB)")

        except Exception as e:
            print(f"  ❌ {filename}: {str(e)[:50]}")

    print()
    print("═" * 60)
    print(f"  📊 {valid_count}/{len(uploaded_files)} images ready")
    print("═" * 60)

    if valid_count > 0:
        # ── Preview ──
        print()
        print("─" * 60)
        print("  🖼️ Preview (first 3 images)")
        print("─" * 60)

        for i, (filename, img_bgr) in enumerate(uploaded_images.items()):
            if i >= 3:
                print(f"  ... এবং আরও {len(uploaded_images) - 3} টি")
                break

            print(f"\n  [{i+1}] {filename}")
            h, w = img_bgr.shape[:2]
            scale = min(CONFIG['preview_max_width'] / w, 1.0)
            new_w = int(w * scale)
            new_h = int(h * scale)
            resized = cv2.resize(img_bgr, (new_w, new_h))
            rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
            display(PILImage.fromarray(rgb))

        # ── Initialize workflow state ──
        # V11: per-page result containers (reset on new upload)
        if 'translation_df' not in globals() or translation_df is None:
            translation_df = pd.DataFrame(columns=[
                'page', 'id', 'region_type', 'x', 'y', 'width', 'height',
                'angle', 'original_text', 'translated_text', 'confidence',
                'ocr_engine', 'translator_engine', 'quality_score',
                'is_english', 'bengali_valid'
            ])
        if 'inpainted_images' not in globals():
            inpainted_images = {}
        inpainted_images.clear()
        if 'output_images' not in globals():
            output_images = {}
        output_images.clear()
        if 'quality_warnings' not in globals():
            quality_warnings = []
        quality_warnings.clear()
        if 'quality_reports' not in globals():
            quality_reports = {}
        quality_reports.clear()

        log_event(f"Input: {valid_count} images uploaded")

        print()
        print("  ✅ Cell 10 সফল — Cell 11 চালানো যাবে (Detection + OCR)")

print()
print("═" * 60)
print("  📌 এরপর: Cell 11 চালাও (Detection + OCR + Verification)")
print("═" * 60)
