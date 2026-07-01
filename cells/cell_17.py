# ═══════════════════════════════════════════════════════════
# 🔧 CELL 17 — Manual Fix (V11, from V1)
# ═══════════════════════════════════════════════════════════
# Quality Inspector-এ যেসব সমস্যা পাওয়া গেছে সেগুলো
# manually ঠিক করো। কোনো button নেই — code চালাও।
# ═══════════════════════════════════════════════════════════

print("=" * 60)
print("  🔧 MangaBD V11 — Manual Fix")
print("=" * 60)
print()

if translation_df is None or len(translation_df) == 0:
    print("  ❌ Translation data নেই!")
    print("=" * 60)
else:

    # ═══════════════════════════════════════════════════
    # PART 1: CURRENT DATA দেখাও
    # ═══════════════════════════════════════════════════

    print("  📊 Current Data:")
    print("  ─" * 29)
    print()

    type_emoji = {'bubble':'💬','thought':'💭','narrator':'📋',
                  'sfx':'💥','overlay':'📝','text_only':'📝'}

    for page_name in translation_df['page'].unique():
        page_df = translation_df[translation_df['page'] == page_name]
        print(f"  📄 {page_name} ({len(page_df)} regions):")
        print()
        print(f"    {'ID':>4} {'Type':10} {'Original':30} {'Translation':30} {'Status'}")
        print(f"    {'─'*4} {'─'*10} {'─'*30} {'─'*30} {'─'*8}")

        for _, row in page_df.iterrows():
            rid = int(row['id'])
            rtype = str(row.get('region_type', ''))
            orig = str(row.get('original_text', ''))[:28]
            trans = str(row.get('translated_text', ''))[:28]
            emoji = type_emoji.get(rtype, '❓')

            # Status
            if not trans or trans in ['', 'nan']:
                status = "🔴 খালি"
            elif trans in ['[EMPTY]', '[OCR_FAILED]', '[SFX]',
                           '[SKIP:OCR_FAILED]', '[TRANS_FAILED]']:
                status = "🟡 marker"
            elif trans == orig:
                status = "🟡 same"
            elif any('\u0980' <= ch <= '\u09FF' for ch in trans):
                status = "✅ বাংলা"
            else:
                status = "🟡 eng?"

            print(f"    {rid:4d} {emoji}{rtype:9s} {orig:30s} {trans:30s} {status}")

        print()

    # ═══════════════════════════════════════════════════
    # PART 2: FIX EXAMPLES
    # ═══════════════════════════════════════════════════

    print("  ─" * 29)
    print("  🔧 Fix করার উপায়:")
    print("  ─" * 29)
    print()
    print("  নিচের code examples থেকে যেটা দরকার copy করো,")
    print("  একটি নতুন cell-এ paste করো, edit করো, চালাও।")
    print()

    # ── Fix 1: Translation edit ──
    print("  ┌─────────────────────────────────────────────")
    print("  │ 📝 Fix 1: অনুবাদ পরিবর্তন করো")
    print("  │")
    print("  │ # একটি region-এর অনুবাদ ঠিক করো:")
    print("  │ translation_df.loc[")
    print("  │     (translation_df['page'] == 'page1.jpg') &")
    print("  │     (translation_df['id'] == 1),")
    print("  │     'translated_text'")
    print("  │ ] = 'নতুন বাংলা অনুবাদ'")
    print("  │")
    print("  │ # একাধিক region একসাথে:")
    print("  │ fixes = {")
    print("  │     ('page1.jpg', 1): 'প্রথম অনুবাদ',")
    print("  │     ('page1.jpg', 2): 'দ্বিতীয় অনুবাদ',")
    print("  │     ('page1.jpg', 3): 'তৃতীয় অনুবাদ',")
    print("  │ }")
    print("  │ for (page, rid), text in fixes.items():")
    print("  │     mask = (translation_df['page'] == page) & \\")
    print("  │             (translation_df['id'] == rid)")
    print("  │     translation_df.loc[mask, 'translated_text'] = text")
    print("  │     translation_df.loc[mask, 'bengali_valid'] = True")
    print("  └─────────────────────────────────────────────")
    print()

    # ── Fix 2: Region type change ──
    print("  ┌─────────────────────────────────────────────")
    print("  │ 🏷️ Fix 2: Region type পরিবর্তন করো")
    print("  │")
    print("  │ # ভুল করে overlay হয়ে গেছে, আসলে bubble:")
    print("  │ translation_df.loc[")
    print("  │     (translation_df['page'] == 'page1.jpg') &")
    print("  │     (translation_df['id'] == 1),")
    print("  │     'region_type'")
    print("  │ ] = 'bubble'")
    print("  └─────────────────────────────────────────────")
    print()

    # ── Fix 3: Region delete ──
    print("  ┌─────────────────────────────────────────────")
    print("  │ 🗑️ Fix 3: Region delete করো (false positive)")
    print("  │")
    print("  │ # একটি region সরাও (যেটি আসলে text নয়):")
    print("  │ translation_df = translation_df[~(")
    print("  │     (translation_df['page'] == 'page1.jpg') &")
    print("  │     (translation_df['id'] == 5)")
    print("  │ )].reset_index(drop=True)")
    print("  └─────────────────────────────────────────────")
    print()

    # ── Fix 4: Re-render after fix ──
    print("  ┌─────────────────────────────────────────────")
    print("  │ 🔄 Fix 4: Fix করার পর আবার render করো")
    print("  │")
    print("  │ # Fix করার পর এই cells আবার চালাও:")
    print("  │ # 1. Cell 15 (Bengali Rendering)")
    print("  │ # 2. Cell 16 (Quality Inspector)")
    print("  │ # 3. Cell 18 (Preview & Download)")
    print("  └─────────────────────────────────────────────")
    print()

    # ── Fix 5: Bulk fix from JSON ──
    print("  ┌─────────────────────────────────────────────")
    print("  │ 📦 Fix 5: Bulk fix from JSON-like dict")
    print("  │")
    print("  │ # অনেক অনুবাদ একসাথে আপডেট করো:")
    print("  │ import json")
    print("  │ fixes_json = '''{")
    print("  │   \"page1.jpg\": {")
    print("  │     \"1\": \"প্রথম অনুবাদ\",")
    print("  │     \"2\": \"দ্বিতীয় অনুবাদ\"")
    print("  │   }")
    print("  │ }'''")
    print("  │ fixes = json.loads(fixes_json)")
    print("  │ for page, id_map in fixes.items():")
    print("  │     for rid, text in id_map.items():")
    print("  │         mask = (translation_df['page'] == page) & \\")
    print("  │                 (translation_df['id'] == int(rid))")
    print("  │         translation_df.loc[mask, 'translated_text'] = text")
    print("  │         translation_df.loc[mask, 'bengali_valid'] = True")
    print("  └─────────────────────────────────────────────")
    print()

    # ═══════════════════════════════════════════════════
    # PART 3: Auto-generate fixes dict from current data
    # ═══════════════════════════════════════════════════

    print("  ─" * 29)
    print("  🤖 Auto-generated fixes template (copy করো, edit করো):")
    print("  ─" * 29)
    print()

    print("  fixes = {")
    for _, row in translation_df.iterrows():
        rid = int(row['id'])
        page = row['page']
        orig = str(row.get('original_text', ''))[:30].replace("'", "\\'")
        trans = str(row.get('translated_text', ''))
        # Only show rows that need fixing
        if (not trans or trans in ['', 'nan', '[EMPTY]', '[OCR_FAILED]',
                                   '[SFX]', '[SKIP:OCR_FAILED]', '[TRANS_FAILED]']
            or trans == orig
            or not any('\u0980' <= ch <= '\u09FF' for ch in trans)):
            print(f"      ('{page}', {rid}): '',  # orig: '{orig}'")
    print("  }")
    print()
    print("  # উপরের dict-এ প্রতিটি '' এর জায়গায় Bengali অনুবাদ লেখো")
    print()

    # ═══════════════════════════════════════════════════
    # PART 4: Quick apply function
    # ═══════════════════════════════════════════════════

    print("  ─" * 29)
    print("  ⚡ Quick apply function (ready to use):")
    print("  ─" * 29)
    print()

    print('''
  def apply_fixes(fixes_dict):
      """Apply translation fixes from {(page, id): text} dict."""
      global translation_df
      applied = 0
      for (page, rid), text in fixes_dict.items():
          if not text:
              continue
          mask = (translation_df['page'] == page) & \\
                  (translation_df['id'] == rid)
          if mask.any():
              translation_df.loc[mask, 'translated_text'] = text
              translation_df.loc[mask, 'bengali_valid'] = \\
                  any('\\u0980' <= ch <= '\\u09FF' for ch in text)
              translation_df.loc[mask, 'translator_engine'] = 'manual'
              applied += 1
      print(f"  ✅ {applied} fixes applied")
      return applied

  # ব্যবহার:
  # fixes = {
  #     ('page1.jpg', 1): 'নতুন অনুবাদ',
  #     ('page1.jpg', 2): 'আরেকটি অনুবাদ',
  # }
  # apply_fixes(fixes)
  # # তারপর Cell 15, 16, 18 আবার চালাও
  ''')

    print()
    print("═" * 60)
    print("  ✅ Cell 17 সফল — fix করে Cell 15 আবার চালাও")
    print("═" * 60)

    log_event("Cell 17: Manual Fix templates shown")
