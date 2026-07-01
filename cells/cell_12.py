# ═══════════════════════════════════════════════════════════
# 💾 CELL 12 — Export (V11: ai.Text only)
# ═══════════════════════════════════════════════════════════
# ❌ NO JSON export
# ❌ NO CSV export
# ✅ ai.Text format only:
#      [ID] English text →
#   প্রতিটি region-এর জন্য একটি line।
# এই format ম্যানুয়ালি অনুবাদ করার জন্য ডিজাইন করা —
# অনুবাদ করে আবার upload করতে হবে (Cell 13)।
# ═══════════════════════════════════════════════════════════

import os
from datetime import datetime

print("=" * 60)
print("  💾 MangaBD V11 — Export (ai.Text format)")
print("=" * 60)
print()

if translation_df is None or len(translation_df) == 0:
    print("  ❌ Translation data নেই! আগে Cell 11 চালাও")
    print("=" * 60)
else:

    # ── Generate ai.Text content ──
    print("  📝 ai.Text format তৈরি হচ্ছে...")
    print()

    lines = []
    lines.append(f"# MangaBD V11 — ai.Text Export")
    lines.append(f"# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"# Session: {CHECKPOINT.get('session_id', '?')}")
    lines.append(f"# OCR Engine: {CONFIG['ocr_engine']}")
    lines.append(f"#")
    lines.append(f"# Format:")
    lines.append(f"#   [PAGE_FILENAME:REGION_ID] English text →")
    lines.append(f"#")
    lines.append(f"# অনুবাদ করার জন্য প্রতিটি line-এর '→' চিহ্নের পরে")
    lines.append(f"# Bengali translation যোগ করো, এভাবে:")
    lines.append(f"#   [page.jpg:1] Hello World → নমস্কার বিশ্ব")
    lines.append(f"#")
    lines.append(f"# তারপর Cell 13-এ upload করো।")
    lines.append("")

    # Group by page
    for filename in translation_df['page'].unique():
        page_rows = translation_df[translation_df['page'] == filename].sort_values('id')
        lines.append(f"# ═══════════════════════════════════════════")
        lines.append(f"# 📄 Page: {filename} ({len(page_rows)} regions)")
        lines.append(f"# ═══════════════════════════════════════════")

        for _, row in page_rows.iterrows():
            rid = int(row['id'])
            text = str(row['original_text']).strip()
            rtype = str(row.get('region_type', ''))
            conf = float(row.get('confidence', 0))

            # Skip empty / failed
            if not text or text in ('[EMPTY]', '[OCR_FAILED]', 'nan'):
                lines.append(f"[{filename}:{rid}] [SKIP:OCR_FAILED] →")
                continue

            # Format: [page:id] text →
            # যদি text-এ নিউলাইন থাকে সেগুলো space করে দাও
            clean_text = ' '.join(text.split())
            lines.append(f"[{filename}:{rid}] {clean_text} →")

        lines.append("")

    ai_text_content = '\n'.join(lines)

    # ── Save to file ──
    ai_text_path = f"{CONFIG['temp_dir']}/ai_text_export.txt"
    with open(ai_text_path, 'w', encoding='utf-8') as f:
        f.write(ai_text_content)

    # Also save to Drive for persistence
    ai_text_drive = f"{CONFIG['results_dir']}/ai_text_export_{CHECKPOINT['session_id']}.txt"
    with open(ai_text_drive, 'w', encoding='utf-8') as f:
        f.write(ai_text_content)

    print(f"  ✅ ai.Text file তৈরি হয়েছে")
    print(f"     📁 {ai_text_path}")
    print(f"     📁 {ai_text_drive}")
    print(f"     📏 {len(ai_text_content)} chars, {len(lines)} lines")
    print()

    # ── Preview ──
    print("─" * 60)
    print("  📄 Preview (first 30 lines)")
    print("─" * 60)
    for line in lines[:30]:
        print(f"  {line}")
    if len(lines) > 30:
        print(f"  ... ({len(lines) - 30} more lines)")
    print()

    # ── Download ──
    print("─" * 60)
    print("  📥 Auto-download হচ্ছে...")
    print("─" * 60)
    try:
        files.download(ai_text_path)
        print("  ✅ ডাউনলোড শুরু হয়েছে (browser check করো)")
    except Exception as e:
        print(f"  ⚠️ ডাউনলোড ব্যর্থ: {e}")
        print(f"     Manual: {ai_text_path} থেকে copy করো")

    print()
    print("═" * 60)
    print("  📌 এরপর:")
    print("     1. ডাউনলোড করা file খোলো")
    print("     2. প্রতিটি line-এ '→' এর পরে Bengali অনুবাদ লেখো")
    print("     3. Cell 13 চালাও (Translation upload)")
    print("═" * 60)

    log_event(f"Cell 12: ai.Text exported ({len(lines)} lines)")
