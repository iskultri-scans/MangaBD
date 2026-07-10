# ═══════════════════════════════════════════════════════════
# 💾 CELL 4 — Checkpoint System (V11, from V1)
# ═══════════════════════════════════════════════════════════
# এই cell checkpoint save/load system তৈরি করবে।
# Session crash হলে বা Colab disconnect হলে
# এখান থেকে কাজ resume করা যাবে।
# ═══════════════════════════════════════════════════════════

global CHECKPOINT, session_log

print("=" * 60)
print("  💾 MangaBD V11 — Checkpoint System")
print("=" * 60)
print()

# ── Checkpoint Functions ───────────────────────────────

def save_checkpoint():
    """
    CHECKPOINT dict কে JSON file হিসেবে save করো।
    Returns: True (সফল) বা False (ব্যর্থ)
    """
    global CHECKPOINT
    try:
        checkpoint_data = CHECKPOINT.copy()
        checkpoint_data['last_saved'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        with open(CONFIG['checkpoint_file'], 'w', encoding='utf-8') as f:
            json.dump(checkpoint_data, f, ensure_ascii=False, indent=2)

        return True
    except Exception as e:
        log_event(f"Checkpoint save failed: {str(e)[:60]}", level='ERROR')
        return False


def load_checkpoint(filepath=None):
    """
    JSON file থেকে CHECKPOINT dict restore করো।
    Args:
        filepath: checkpoint file path (None হলে default ব্যবহার হবে)
    Returns: True (সফল) বা False (file নেই বা ব্যর্থ)
    """
    global CHECKPOINT
    if filepath is None:
        filepath = CONFIG['checkpoint_file']

    if not os.path.exists(filepath):
        return False

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            loaded = json.load(f)

        # Version check
        if loaded.get('version') != '11.0':
            log_event("Checkpoint version mismatch, নতুন session শুরু হচ্ছে", level='WARN')
            return False

        CHECKPOINT.update(loaded)
        log_event(f"Checkpoint loaded: session {CHECKPOINT.get('session_id', '?')}")
        return True

    except json.JSONDecodeError:
        log_event("Checkpoint file corrupt, নতুন session শুরু হচ্ছে", level='WARN')
        return False
    except Exception as e:
        log_event(f"Checkpoint load failed: {str(e)[:60]}", level='ERROR')
        return False


def mark_page_done(filename, stage):
    """
    একটি page-এর নির্দিষ্ট stage complete হিসেবে mark করো।
    Args:
        filename: image filename (str)
        stage: 'ocr' | 'inpaint' | 'render' (str)
    """
    global CHECKPOINT
    if filename not in CHECKPOINT['pages']:
        CHECKPOINT['pages'][filename] = {
            'regions': [],
            'ocr_done': False,
            'inpaint_done': False,
            'render_done': False,
            'ocr_engine': '',
            'translator_engine': '',
        }

    CHECKPOINT['pages'][filename][stage + '_done'] = True
    CHECKPOINT['pages'][filename]['last_updated'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    save_checkpoint()
    log_event(f"{filename}: {stage} complete ✅")


def is_page_done(filename, stage):
    """
    একটি page-এর নির্দিষ্ট stage আগেই complete হয়েছে কিনা check করো।
    """
    try:
        return CHECKPOINT['pages'].get(filename, {}).get(stage + '_done', False)
    except Exception:
        return False


def reset_page(filename):
    """একটি page-এর সব stage reset করো (re-process করতে হলে)।"""
    global CHECKPOINT
    if filename in CHECKPOINT['pages']:
        CHECKPOINT['pages'][filename] = {
            'regions': [],
            'ocr_done': False,
            'inpaint_done': False,
            'render_done': False,
        }
        save_checkpoint()
        log_event(f"{filename}: reset done")


def reset_all_pages():
    """সব pages reset করো (নতুন করে শুরু করতে চাইলে)।"""
    global CHECKPOINT
    CHECKPOINT['pages'] = {}
    save_checkpoint()
    log_event("All pages reset")


def set_page_meta(filename, key, value):
    """Page-এর মেটাডেটা সেট করো (যেমন কোন OCR engine ব্যবহার হয়েছে)।"""
    global CHECKPOINT
    if filename not in CHECKPOINT['pages']:
        CHECKPOINT['pages'][filename] = {
            'regions': [],
            'ocr_done': False,
            'inpaint_done': False,
            'render_done': False,
        }
    CHECKPOINT['pages'][filename][key] = value
    save_checkpoint()


print("  📝 Checkpoint functions তৈরি হয়েছে ✅")
print()

# ── Resume Check ──────────────────────────────────────

checkpoint_exists = os.path.exists(CONFIG['checkpoint_file'])

if checkpoint_exists:
    print("─" * 60)
    print("  📂 আগের session-এর checkpoint পাওয়া গেছে!")
    print("─" * 60)
    print()

    # আগের checkpoint-এর info দেখাও
    try:
        with open(CONFIG['checkpoint_file'], 'r', encoding='utf-8') as f:
            old_data = json.load(f)

        old_id = old_data.get('session_id', '?')
        old_time = old_data.get('created_at', '?')
        old_pages = old_data.get('pages', {})
        old_saved = old_data.get('last_saved', '?')

        print(f"      Session ID  : {old_id}")
        print(f"      তৈরি হয়েছে  : {old_time}")
        print(f"      শেষ save    : {old_saved}")
        print(f"      Pages       : {len(old_pages)} টি")

        for pg_name, pg_data in old_pages.items():
            ocr_s = "✅" if pg_data.get('ocr_done') else "❌"
            inp_s = "✅" if pg_data.get('inpaint_done') else "❌"
            ren_s = "✅" if pg_data.get('render_done') else "❌"
            print(f"        {pg_name}: OCR {ocr_s} | Inpaint {inp_s} | Render {ren_s}")

        print()
    except Exception:
        print("      (checkpoint details পড়া যায়নি)")
        print()

    # Resume বা New session button
    resume_choice = [None]  # mutable container for callback

    resume_btn = widgets.Button(
        description='🔄 আগের session resume করো',
        button_style='warning',
        layout=widgets.Layout(width='280px', height='40px')
    )
    new_btn = widgets.Button(
        description='🆕 নতুন session শুরু করো',
        button_style='info',
        layout=widgets.Layout(width='280px', height='40px')
    )

    def on_resume(btn):
        resume_choice[0] = 'resume'
        success = load_checkpoint()
        if success:
            print()
            print(f"  ✅ আগের session resume হয়েছে (ID: {CHECKPOINT['session_id']})")
            log_event("Session resumed from checkpoint")
        else:
            print()
            print(f"  ⚠️ Checkpoint load হয়নি, নতুন session শুরু হচ্ছে")
            log_event("Resume failed, starting new session", level='WARN')
        print()
        print("  ✅ Cell 4 সফল — Cell 5 চালানো যাবে")
        print("=" * 60)

    def on_new(btn):
        global CHECKPOINT
        resume_choice[0] = 'new'
        CHECKPOINT = {
            'version': '11.0',
            'session_id': str(uuid.uuid4())[:8],
            'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'pages': {},
        }
        save_checkpoint()
        print()
        print(f"  🆕 নতুন session শুরু হয়েছে (ID: {CHECKPOINT['session_id']})")
        log_event("New session started")
        print()
        print("  ✅ Cell 4 সফল — Cell 5 চালানো যাবে")
        print("=" * 60)

    resume_btn.on_click(on_resume)
    new_btn.on_click(on_new)

    print("  কোনটা করতে চাও?")
    print()
    display(widgets.HBox([resume_btn, new_btn]))

else:
    # কোনো আগের checkpoint নেই — নতুন session
    save_checkpoint()
    log_event("New session initialized")

    print(f"  🆕 নতুন session শুরু হয়েছে")
    print(f"      Session ID : {CHECKPOINT['session_id']}")
    print(f"      Checkpoint : {CONFIG['checkpoint_file']}")
    print()

    # ── Self Tests ─────────────────────────────────────

    print("─" * 60)
    print("  🧪 Checkpoint Tests")
    print("─" * 60)
    print()

    # Test 1: save + load
    test1_ok = False
    try:
        save_checkpoint()
        loaded = load_checkpoint()
        if loaded and CHECKPOINT['session_id']:
            print(f"  Test 1 (save/load)     : ✅")
            test1_ok = True
        else:
            print(f"  Test 1 (save/load)     : ❌")
    except Exception as e:
        print(f"  Test 1 (save/load)     : ❌ ({str(e)[:40]})")

    # Test 2: mark_page_done + is_page_done
    test2_ok = False
    try:
        mark_page_done('_test_page.jpg', 'ocr')
        result = is_page_done('_test_page.jpg', 'ocr')
        not_done = is_page_done('_test_page.jpg', 'render')
        if result and not not_done:
            print(f"  Test 2 (mark/check)    : ✅")
            test2_ok = True
        else:
            print(f"  Test 2 (mark/check)    : ❌")
        # Test page cleanup
        del CHECKPOINT['pages']['_test_page.jpg']
        save_checkpoint()
    except Exception as e:
        print(f"  Test 2 (mark/check)    : ❌ ({str(e)[:40]})")

    # Test 3: log_event
    test3_ok = False
    try:
        log_count_before = len(session_log)
        log_event("Test log entry")
        if len(session_log) > log_count_before:
            print(f"  Test 3 (log_event)     : ✅")
            test3_ok = True
        else:
            print(f"  Test 3 (log_event)     : ❌")
    except Exception as e:
        print(f"  Test 3 (log_event)     : ❌ ({str(e)[:40]})")

    # Test 4: reset_page
    test4_ok = False
    try:
        mark_page_done('_test_reset.jpg', 'ocr')
        reset_page('_test_reset.jpg')
        result = is_page_done('_test_reset.jpg', 'ocr')
        if not result:
            print(f"  Test 4 (reset_page)    : ✅")
            test4_ok = True
        else:
            print(f"  Test 4 (reset_page)    : ❌")
        # Cleanup
        if '_test_reset.jpg' in CHECKPOINT['pages']:
            del CHECKPOINT['pages']['_test_reset.jpg']
            save_checkpoint()
    except Exception as e:
        print(f"  Test 4 (reset_page)    : ❌ ({str(e)[:40]})")

    # Test 5: set_page_meta (V11 new)
    test5_ok = False
    try:
        set_page_meta('_test_meta.jpg', 'ocr_engine', 'qwen')
        if CHECKPOINT['pages']['_test_meta.jpg'].get('ocr_engine') == 'qwen':
            print(f"  Test 5 (set_page_meta) : ✅")
            test5_ok = True
        else:
            print(f"  Test 5 (set_page_meta) : ❌")
        del CHECKPOINT['pages']['_test_meta.jpg']
        save_checkpoint()
    except Exception as e:
        print(f"  Test 5 (set_page_meta) : ❌ ({str(e)[:40]})")

    print()
    print("═" * 60)

    if test1_ok and test2_ok and test3_ok and test4_ok and test5_ok:
        print("  ✅ Cell 4 সফল — Cell 5 চালানো যাবে")
    else:
        print("  ⚠️ কিছু test fail হয়েছে, তবে এগোনো যাবে")
        print("  👉 Cell 5 চালানো যাবে")

    print("═" * 60)
