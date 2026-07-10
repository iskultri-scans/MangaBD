# ═══════════════════════════════════════════════════════════
# 📋 CELL 19 — Session Log (V11, modified for new OCR/translator engines)
# ═══════════════════════════════════════════════════════════
# পুরো session-এর summary log তৈরি করবে এবং save করবে।
# সব statistics, methods, warnings একসাথে।
# ═══════════════════════════════════════════════════════════

import os
from datetime import datetime

print("=" * 60)
print("  📋 MangaBD V11 — Session Log")
print("=" * 60)
print()

# ═══════════════════════════════════════════════════════════
# PART 1: COLLECT STATISTICS
# ═══════════════════════════════════════════════════════════

# ── Session info ──
session_id = CHECKPOINT.get('session_id', 'unknown')
session_start = CHECKPOINT.get('created_at', 'unknown')
session_end = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

# Calculate duration
try:
    start_dt = datetime.strptime(session_start, '%Y-%m-%d %H:%M:%S')
    end_dt = datetime.strptime(session_end, '%Y-%m-%d %H:%M:%S')
    duration = end_dt - start_dt
    duration_mins = int(duration.total_seconds() // 60)
    duration_secs = int(duration.total_seconds() % 60)
    duration_str = f"{duration_mins} মিনিট {duration_secs} সেকেন্ড"
except Exception:
    duration_str = "unknown"

# ── Pages info ──
total_pages = len(uploaded_images) if uploaded_images else 0
output_pages = len(output_images) if output_images else 0
inpainted_pages = len(inpainted_images) if inpainted_images else 0

# ── Translation stats ──
total_regions = 0
translated_regions = 0
empty_regions = 0
marker_regions = 0
bangla_regions = 0
english_remaining = 0

# OCR engine breakdown (V11: Qwen VL)
# Baidu removed — only Qwen VL
ocr_qwen = 0
ocr_skipped = 0
ocr_failed = 0
ocr_fallback = 0
low_conf_count = 0

# Translator engine breakdown (V11 new)
trans_manual = 0
trans_gemini = 0
trans_chatgpt = 0
trans_nllb = 0
trans_failed = 0
trans_none = 0

region_types = {}

if translation_df is not None and len(translation_df) > 0:
    total_regions = len(translation_df)

    for _, row in translation_df.iterrows():
        # Translation status
        trans = str(row.get('translated_text', '')).strip()
        orig = str(row.get('original_text', '')).strip()

        if not trans or trans in ['', 'nan']:
            empty_regions += 1
        elif trans in ['[EMPTY]', '[SFX]', '[OCR_FAILED]',
                       '[SKIP:OCR_FAILED]', '[TRANS_FAILED]']:
            marker_regions += 1
        elif any('\u0980' <= ch <= '\u09FF' for ch in trans):
            bangla_regions += 1
            translated_regions += 1
        elif trans != orig:
            translated_regions += 1
        else:
            empty_regions += 1

        # OCR method (V11: Qwen VL)
        method = str(row.get('ocr_engine', '')).strip().lower()
        if method == 'qwen':
            ocr_qwen += 1
        elif method == 'none':
            ocr_failed += 1
        elif method in ('', 'skipped'):
            ocr_skipped += 1
        else:
            ocr_fallback += 1

        # OCR confidence
        conf = float(row.get('confidence', 0))
        if conf < CONFIG['ocr_confidence_threshold']:
            low_conf_count += 1

        # Translator method (V11 new)
        trans_method = str(row.get('translator_engine', '')).strip().lower()
        if trans_method == 'manual':
            trans_manual += 1
        elif trans_method == 'gemini':
            trans_gemini += 1
        elif trans_method == 'chatgpt':
            trans_chatgpt += 1
        elif trans_method == 'nllb':
            trans_nllb += 1
        elif trans_method in ('', 'none'):
            trans_none += 1
        else:
            trans_failed += 1

        # Region type
        rtype = str(row.get('region_type', ''))
        region_types[rtype] = region_types.get(rtype, 0) + 1

# ── Quality stats ──
quality_critical = 0
quality_warnings_count = 0
quality_clean = 0

for filename, issues in quality_reports.items():
    for issue in issues:
        if issue.get('severity') == '🔴':
            quality_critical += 1
        elif issue.get('severity') == '🟡':
            quality_warnings_count += 1

if total_regions > 0:
    issue_regions = set()
    for issues in quality_reports.values():
        for issue in issues:
            if issue.get('id', 0) > 0:
                issue_regions.add(issue['id'])
    quality_clean = max(0, total_regions - len(issue_regions))

# ═══════════════════════════════════════════════════════════
# PART 2: PRINT SESSION LOG
# ═══════════════════════════════════════════════════════════

print("╔" + "═" * 58 + "╗")
print("║" + " 📋 MangaBD V11 Session Log".center(58) + " ║")
print("╚" + "═" * 58 + "╝")
print()

print("  ─────────────────────────────────────────")
print("  🆔 Session Information")
print("  ─────────────────────────────────────────")
print(f"  Session ID    : {session_id}")
print(f"  Created       : {session_start}")
print(f"  Ended         : {session_end}")
print(f"  Duration      : {duration_str}")
print(f"  Version       : V11.0")
print(f"  Device        : {DEVICE}")
if DEVICE == 'cuda':
    print(f"  GPU           : {torch.cuda.get_device_name(0)}")
print()

print("  ─────────────────────────────────────────")
print("  📊 Page Statistics")
print("  ─────────────────────────────────────────")
print(f"  Total pages    : {total_pages}")
print(f"  Inpainted      : {inpainted_pages}")
print(f"  Final rendered : {output_pages}")
print(f"  Completion     : {(output_pages/max(1,total_pages))*100:.0f}%")
print()

print("  ─────────────────────────────────────────")
print("  📝 Region Statistics")
print("  ─────────────────────────────────────────")
print(f"  Total regions    : {total_regions}")
print(f"  Translated       : {translated_regions}")
print(f"  Bengali valid    : {bangla_regions}")
print(f"  Empty            : {empty_regions}")
print(f"  Markers (SFX etc): {marker_regions}")
print()

if region_types:
    print("  Region types:")
    for rtype, count in sorted(region_types.items(), key=lambda x: x[1], reverse=True):
        emoji_map = {'bubble':'💬','thought':'💭','narrator':'📋',
                     'sfx':'💥','overlay':'📝'}
        emoji = emoji_map.get(rtype, '❓')
        print(f"    {emoji} {rtype:10s}: {count}")
    print()

print("  ─────────────────────────────────────────")
print("  🔍 OCR Engine Breakdown (V11)")
print("  ─────────────────────────────────────────")
print(f"  Qwen VL (primary): {ocr_qwen}")
print(f"  Failed          : {ocr_failed}")
print(f"  Skipped         : {ocr_skipped}")
if ocr_fallback > 0:
    print(f"  Other           : {ocr_fallback}")
print(f"  Low confidence  : {low_conf_count} "
      f"(<{CONFIG['ocr_confidence_threshold']:.2f})")
print()

print("  ─────────────────────────────────────────")
print("  🌐 Translator Engine Breakdown (V11 new)")
print("  ─────────────────────────────────────────")
print(f"  Manual   : {trans_manual}")
print(f"  Gemini   : {trans_gemini}")
print(f"  ChatGPT  : {trans_chatgpt}")
print(f"  NLLB     : {trans_nllb}")
print(f"  Failed   : {trans_failed}")
print(f"  Not set  : {trans_none}")
print()

print("  ─────────────────────────────────────────")
print("  🔬 Quality Summary")
print("  ─────────────────────────────────────────")
print(f"  Critical issues : {quality_critical}")
print(f"  Warnings        : {quality_warnings_count}")
print(f"  Clean regions   : {quality_clean}/{total_regions}")
if total_regions > 0:
    score = (quality_clean / total_regions) * 100
    if score >= 90:
        grade = "🌟 Excellent"
    elif score >= 75:
        grade = "✅ Good"
    elif score >= 60:
        grade = "🟡 Acceptable"
    elif score >= 40:
        grade = "🟠 Needs Work"
    else:
        grade = "🔴 Poor"
    print(f"  Quality score   : {score:.0f}% — {grade}")
print()

print("  ─────────────────────────────────────────")
print("  🤖 Models Loaded")
print("  ─────────────────────────────────────────")
print(f"  CTD (Detector)    : {'✅' if ctd_detector is not None else '❌'}")
print(f"  Qwen VL OCR       : {'✅' if qwen_vl_ocr is not None else '❌'}")
print(f"  LaMa Large        : {'✅' if lama_inpainter is not None else '❌'}")
print(f"  NLLB              : {'✅' if nllb_model is not None else '❌ (not loaded)'}")
print()

print("  ─────────────────────────────────────────")
print("  📁 Output Locations")
print("  ─────────────────────────────────────────")
print(f"  Drive root    : {CONFIG['drive_dir']}")
print(f"  Models        : {CONFIG['models_dir']}")
print(f"  Results       : {CONFIG['results_dir']}")
print(f"  Checkpoint    : {CONFIG['checkpoint_file']}")
print()

print("  ─────────────────────────────────────────")
print("  📜 Session Events (last 20)")
print("  ─────────────────────────────────────────")
for entry in session_log[-20:]:
    print(f"  {entry}")
if len(session_log) > 20:
    print(f"  ... ({len(session_log) - 20} more)")
print()

# ═══════════════════════════════════════════════════════════
# PART 3: SAVE LOG FILE
# ═══════════════════════════════════════════════════════════

log_filename = f"session_log_{session_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
log_path = f"{CONFIG['results_dir']}/{log_filename}"

with open(log_path, 'w', encoding='utf-8') as f:
    f.write("MangaBD V11 Session Log\n")
    f.write("=" * 60 + "\n\n")
    f.write(f"Session ID    : {session_id}\n")
    f.write(f"Created       : {session_start}\n")
    f.write(f"Ended         : {session_end}\n")
    f.write(f"Duration      : {duration_str}\n")
    f.write(f"Version       : V11.0\n")
    f.write(f"Device        : {DEVICE}\n\n")

    f.write("Pages:\n")
    f.write(f"  Total: {total_pages}\n")
    f.write(f"  Inpainted: {inpainted_pages}\n")
    f.write(f"  Rendered: {output_pages}\n\n")

    f.write("Regions:\n")
    f.write(f"  Total: {total_regions}\n")
    f.write(f"  Translated: {translated_regions}\n")
    f.write(f"  Bengali valid: {bangla_regions}\n\n")

    f.write("OCR engines:\n")
    f.write(f"  Qwen: {ocr_qwen}\n")
    f.write(f"  Failed: {ocr_failed}\n\n")

    f.write("Translators:\n")
    f.write(f"  Manual: {trans_manual}\n")
    f.write(f"  Gemini: {trans_gemini}\n")
    f.write(f"  ChatGPT: {trans_chatgpt}\n")
    f.write(f"  NLLB: {trans_nllb}\n\n")

    f.write("Quality:\n")
    f.write(f"  Critical: {quality_critical}\n")
    f.write(f"  Warnings: {quality_warnings_count}\n")
    f.write(f"  Clean: {quality_clean}\n\n")

    f.write("Full event log:\n")
    f.write("-" * 60 + "\n")
    for entry in session_log:
        f.write(f"{entry}\n")

print("═" * 60)
print(f"  💾 Log file saved: {log_path}")
print("═" * 60)
print()
print("  ✅ Cell 19 সফল — Cell 20 চালানো যাবে (Dashboard)")
print("═" * 60)
