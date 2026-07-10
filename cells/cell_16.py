# ═══════════════════════════════════════════════════════════
# 🔬 CELL 16 — Quality Inspector (V11, from V1)
# ═══════════════════════════════════════════════════════════
# Output-এর quality automatically check করবে।
# 8 quality checks per region + per-page report + overall score।
# ═══════════════════════════════════════════════════════════

print("=" * 60)
print("  🔬 MangaBD V11 — Quality Inspector")
print("=" * 60)
print()

# ── Check ─────────────────────────────────────────────

if not output_images or len(output_images) == 0:
    print("  ❌ Output images নেই! আগে Cell 15 চালাও")
    print("=" * 60)
elif translation_df is None or len(translation_df) == 0:
    print("  ❌ Translation data নেই!")
    print("=" * 60)
else:

    all_issues = []
    page_reports = {}
    quality_reports.clear()

    total_pages = len(output_images)
    print(f"  📂 {total_pages} টি page inspect হবে")
    print()

    # ═══════════════════════════════════════════════════
    # PART 1: INSPECT EACH PAGE
    # ═══════════════════════════════════════════════════

    for page_idx, (filename, output_pil) in enumerate(output_images.items(), 1):

        print(f"  ╔═══════════════════════════════════════════╗")
        print(f"  ║  🔬 [{page_idx}/{total_pages}] {filename}")
        print(f"  ╚═══════════════════════════════════════════╝")

        page_df = translation_df[translation_df['page'] == filename]
        page_issues = []

        if len(page_df) == 0:
            print(f"    ℹ️ কোনো region নেই — skip")
            print()
            continue

        output_np = np.array(output_pil)
        pil_w, pil_h = output_pil.size

        # Get original image for comparison
        original_np = uploaded_images.get(filename, None)

        type_emoji = {'bubble':'💬','thought':'💭','narrator':'📋',
                      'sfx':'💥','overlay':'📝'}

        for _, row in page_df.iterrows():
            rid = int(row['id'])
            x, y = int(row['x']), int(row['y'])
            w, h = int(row['width']), int(row['height'])
            rtype = str(row.get('region_type', 'overlay'))
            orig = str(row.get('original_text', '')).strip()
            trans = str(row.get('translated_text', '')).strip()
            conf = float(row.get('confidence', 0))
            emoji = type_emoji.get(rtype, '❓')

            # ── Check 1: Empty translation ──
            if not trans or trans in ['', 'nan']:
                page_issues.append({
                    'id': rid, 'type': rtype, 'emoji': emoji,
                    'issue': 'অনুবাদ খালি',
                    'severity': '🔴',
                    'fix': 'Cell 13-এ translation upload করো'
                })
                continue

            # ── Check 2: Untranslated markers ──
            if trans in ['[EMPTY]', '[OCR_FAILED]', '[SFX]', '[SKIP:OCR_FAILED]',
                         '[TRANS_FAILED]']:
                if trans == '[SFX]':
                    page_issues.append({
                        'id': rid, 'type': rtype, 'emoji': emoji,
                        'issue': f'SFX অনুবাদ হয়নি ({orig[:20]})',
                        'severity': '🟡',
                        'fix': 'SFX-এর বাংলা লেখো (যেমন: ধুম!, ঝড়াম!)'
                    })
                elif trans == '[TRANS_FAILED]':
                    page_issues.append({
                        'id': rid, 'type': rtype, 'emoji': emoji,
                        'issue': 'Translation engine fail',
                        'severity': '🔴',
                        'fix': 'অন্য translator চেষ্টা করো (Cell 13)'
                    })
                else:
                    page_issues.append({
                        'id': rid, 'type': rtype, 'emoji': emoji,
                        'issue': f'OCR fail, অনুবাদ নেই',
                        'severity': '🟡',
                        'fix': 'ইমেজ দেখে নিজে text লেখো (Cell 17)'
                    })
                continue

            # ── Check 3: Translation same as original ──
            if trans == orig:
                page_issues.append({
                    'id': rid, 'type': rtype, 'emoji': emoji,
                    'issue': f'অনুবাদ = original (বাংলা লেখা হয়নি)',
                    'severity': '🟡',
                    'fix': 'Bengali অনুবাদ লেখো (Cell 13/17)'
                })

            # ── Check 4: Bengali character validation (V11) ──
            if not is_bengali_text_valid(trans) and trans != orig:
                page_issues.append({
                    'id': rid, 'type': rtype, 'emoji': emoji,
                    'issue': 'Bengali character নেই (এখনো English?)',
                    'severity': '🟡',
                    'fix': 'Bengali-এ অনুবাদ করো (Cell 13)'
                })

            # ── Check 5: Font overflow warning ──
            region_warns = [w_q for w_q in quality_warnings
                           if w_q.get('region_id') == rid or
                           (w_q.get('page') == filename and
                            str(rid) in str(w_q.get('region', '')))]
            for warn in region_warns:
                if 'font' in str(warn.get('issue', '')).lower() or \
                   'overflow' in str(warn.get('issue', '')).lower():
                    page_issues.append({
                        'id': rid, 'type': rtype, 'emoji': emoji,
                        'issue': warn['issue'],
                        'severity': '🟡',
                        'fix': 'অনুবাদ ছোট করো বা region বড় করো'
                    })

            # ── Check 6: Text overflow (visual check) ──
            if w > 5 and h > 5:
                try:
                    y1 = max(0, y)
                    y2 = min(pil_h, y + h)
                    x1 = max(0, x)
                    x2 = min(pil_w, x + w)

                    if y2 > y1 and x2 > x1:
                        region_crop = output_np[y1:y2, x1:x2]

                        if region_crop.size > 0:
                            edge_size = 2
                            if region_crop.shape[0] > edge_size * 2 and region_crop.shape[1] > edge_size * 2:
                                bottom_strip = region_crop[-edge_size:, :]
                                bottom_dark = np.mean(bottom_strip) < 100

                                right_strip = region_crop[:, -edge_size:]
                                right_dark = np.mean(right_strip) < 100

                                if bottom_dark and rtype in ('bubble', 'thought'):
                                    page_issues.append({
                                        'id': rid, 'type': rtype, 'emoji': emoji,
                                        'issue': 'Text overflow হতে পারে (নিচে)',
                                        'severity': '🟡',
                                        'fix': 'অনুবাদ সংক্ষেপ করো'
                                    })

                except Exception:
                    pass

            # ── Check 7: Low OCR confidence ──
            if conf < CONFIG['ocr_confidence_threshold'] and trans != orig:
                page_issues.append({
                    'id': rid, 'type': rtype, 'emoji': emoji,
                    'issue': f'OCR confidence কম ({conf:.2f})',
                    'severity': '🟡',
                    'fix': 'original text ঠিক আছে কিনা verify করো'
                })

            # ── Check 8: Very long translation ──
            if len(trans) > len(orig) * 3 and len(orig) > 5:
                page_issues.append({
                    'id': rid, 'type': rtype, 'emoji': emoji,
                    'issue': f'অনুবাদ অনেক লম্বা ({len(trans)} chars vs {len(orig)})',
                    'severity': '🟡',
                    'fix': 'সংক্ষেপ করো — bubble-তে নাও ধরতে পারে'
                })

        # ── Check 9 (V11): Re-run OCR on output to detect remaining English ──
        if original_np is not None and original_np.size > 0:
            try:
                if qwen_vl_ocr is not None:
                    # Sample a few random regions and check
                    sample_size = min(3, len(page_df))
                    if sample_size > 0:
                        sample_rows = page_df.sample(sample_size)
                        english_remaining = 0
                        for _, s_row in sample_rows.iterrows():
                            sx, sy = int(s_row['x']), int(s_row['y'])
                            sw, sh = int(s_row['width']), int(s_row['height'])
                            if sw > 5 and sh > 5:
                                crop = output_np[max(0, sy):min(pil_h, sy+sh),
                                                 max(0, sx):min(pil_w, sx+sw)]
                                if crop.size > 0:
                                    crop_bgr = cv2.cvtColor(crop, cv2.COLOR_RGB2BGR)
                                    text, _, _ = ocr_recognize(crop_bgr, fallback=False)
                                    if is_english_text(text) and len(text.strip()) >= 3:
                                        # Check if it matches original
                                        s_orig = str(s_row.get('original_text', ''))
                                        if s_orig and s_orig in text:
                                            english_remaining += 1

                        if english_remaining > 0:
                            page_issues.append({
                                'id': 0, 'type': 'page', 'emoji': '📄',
                                'issue': f'{english_remaining} টি English text এখনো দেখা যাচ্ছে',
                                'severity': '🔴',
                                'fix': 'Cell 14 আবার চালাও বা manually fix করো'
                            })
            except Exception:
                pass

        # ── Store page issues ──
        page_reports[filename] = page_issues
        quality_reports[filename] = page_issues
        all_issues.extend(page_issues)

        # ── Print page report ──
        if page_issues:
            critical = [i for i in page_issues if i['severity'] == '🔴']
            warnings = [i for i in page_issues if i['severity'] == '🟡']

            if critical:
                print(f"\n    🔴 Critical Issues ({len(critical)}):")
                for issue in critical:
                    print(f"      [{issue['id']:2d}] {issue['emoji']} {issue['issue']}")
                    print(f"           Fix: {issue['fix']}")

            if warnings:
                print(f"\n    🟡 Warnings ({len(warnings)}):")
                for issue in warnings:
                    print(f"      [{issue['id']:2d}] {issue['emoji']} {issue['issue']}")
                    print(f"           Fix: {issue['fix']}")

            print()
        else:
            print(f"    ✅ কোনো সমস্যা নেই!")
            print()

        # ── Visual comparison (Original vs Final) ──
        if original_np is not None:
            print(f"    📸 Original vs Final:")

            img_h, img_w = original_np.shape[:2]
            scale = min(CONFIG['preview_max_width'] / img_w, 1.0)
            dw, dh = int(img_w * scale), int(img_h * scale)

            orig_r = cv2.resize(original_np, (dw, dh))
            orig_rgb = cv2.cvtColor(orig_r, cv2.COLOR_BGR2RGB)
            orig_pil = PILImage.fromarray(orig_rgb)

            final_r = output_pil.resize((dw, dh), PILImage.LANCZOS)

            print(f"\n    📸 ORIGINAL (English):")
            display(orig_pil)

            print(f"\n    📸 FINAL (বাংলা):")
            display(final_r)

        print()

    # ═══════════════════════════════════════════════════
    # PART 2: OVERALL REPORT
    # ═══════════════════════════════════════════════════

    print()
    print("╔" + "═" * 58 + "╗")
    print("║  📊 Quality Report" + " " * 40 + "║")
    print("╚" + "═" * 58 + "╝")
    print()

    total_issues = len(all_issues)
    critical_count = sum(1 for i in all_issues if i['severity'] == '🔴')
    warning_count = sum(1 for i in all_issues if i['severity'] == '🟡')

    if total_issues == 0:
        print("  🎉 কোনো সমস্যা পাওয়া যায়নি!")
        print("  ✅ Output quality ভালো!")
    else:
        print(f"  মোট issues    : {total_issues}")
        if critical_count > 0:
            print(f"  🔴 Critical    : {critical_count}")
        if warning_count > 0:
            print(f"  🟡 Warnings    : {warning_count}")

    # ── Issue category breakdown ──
    if all_issues:
        print()
        print("  📋 Issue Categories:")

        categories = {}
        for issue in all_issues:
            cat = issue['issue'].split('(')[0].strip()
            categories[cat] = categories.get(cat, 0) + 1

        for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
            print(f"    • {cat}: {count}")

    # ── Per-page summary ──
    print()
    print("  📄 Page-wise:")
    for filename, issues in page_reports.items():
        if issues:
            c = sum(1 for i in issues if i['severity'] == '🔴')
            w = sum(1 for i in issues if i['severity'] == '🟡')
            parts = []
            if c > 0:
                parts.append(f"🔴{c}")
            if w > 0:
                parts.append(f"🟡{w}")
            print(f"    {filename}: {', '.join(parts)}")
        else:
            print(f"    {filename}: ✅ No issues")

    # ═══════════════════════════════════════════════════
    # PART 3: FIX SUGGESTIONS
    # ═══════════════════════════════════════════════════

    if total_issues > 0:
        print()
        print("  ─" * 29)
        print("  🔧 Fix করার উপায়:")
        print("  ─" * 29)
        print()

        if critical_count > 0:
            print("  🔴 Critical fixes:")
            print("     1. Cell 17 (Manual Fix) ব্যবহার করো")
            print("     2. translation_df edit করো")
            print("     3. Cell 14 → Cell 15 আবার চালাও")
            print()

        if warning_count > 0:
            print("  🟡 Warning fixes:")
            print("     1. JSON file edit করো (অনুবাদ ঠিক করো)")
            print("     2. Cell 13 → Cell 14 → Cell 15 আবার চালাও")
            print()

    # ═══════════════════════════════════════════════════
    # PART 4: SCORE
    # ═══════════════════════════════════════════════════

    print()
    total_regions = len(translation_df)
    issue_regions = len(set(i['id'] for i in all_issues if i['id'] > 0))

    if total_regions > 0:
        clean_regions = total_regions - issue_regions
        score = (clean_regions / total_regions) * 100

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

        print(f"  📊 Quality Score: {score:.0f}% — {grade}")
        print(f"     ({clean_regions}/{total_regions} regions issue-free)")

        # Save score to translation_df
        for filename, issues in page_reports.items():
            page_rows = translation_df[translation_df['page'] == filename]
            page_score = 100
            if len(page_rows) > 0:
                page_issue_regions = len(set(i['id'] for i in issues if i['id'] > 0))
                page_score = ((len(page_rows) - page_issue_regions) / len(page_rows)) * 100
            for idx in page_rows.index:
                translation_df.at[idx, 'quality_score'] = f"{page_score:.0f}%"

    print()

    if total_issues == 0:
        print("  🎉 সব ঠিক আছে! Cell 18 চালাও (Download)")
    elif critical_count == 0:
        print("  ✅ Critical issue নেই — Cell 18 চালাতে পারো")
        print("     (warnings পরে fix করতে পারো)")
    else:
        print("  ⚠️ Critical issues আছে — Cell 17 দিয়ে fix করো")
        print("     তারপর Cell 14 → 15 → 16 আবার চালাও")

    print()
    print("  ✅ Cell 16 সফল — Cell 17 বা Cell 18 চালানো যাবে")
    print("=" * 60)

    log_event(f"Quality: {total_issues} issues "
              f"({critical_count} critical, {warning_count} warnings)")
