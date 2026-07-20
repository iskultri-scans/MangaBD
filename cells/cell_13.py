# ═══════════════════════════════════════════════════════════
# 📤 CELL 13 — Translation (V11: Manual + Gemini + ChatGPT + NLLB)
# ═══════════════════════════════════════════════════════════
# যেকোনো সময় 4টি translator-এর মধ্যে switch করা যাবে।
# Manual: আগে Cell 12 export করে অনুবাদ করে আবার upload
# Gemini: GOOGLE_GEMINI_API_KEY লাগবে
# ChatGPT: OPENAI_API_KEY লাগবে
# NLLB: Facebook-এর offline model (Drive-এ cache হবে)
# Bengali character validation সব translator-এ থাকবে।
# ═══════════════════════════════════════════════════════════

import os
import re
from typing import Optional

print("=" * 60)
print("  📤 MangaBD V11 — Translation Engine")
print("=" * 60)
print()

# ── Helpers ───────────────────────────────────────────

def validate_bengali(text):
    """Bengali character validation — অন্তত একটি Bengali char থাকতে হবে।"""
    if not text:
        return False
    return any('\u0980' <= ch <= '\u09FF' for ch in text)


def clean_translation(text):
    """Translation output clean করো — quotes, extra whitespace সরাও।"""
    if not text:
        return ''
    text = text.strip()
    # Remove surrounding quotes if present
    if (text.startswith('"') and text.endswith('"')) or \
       (text.startswith("'") and text.endswith("'")):
        text = text[1:-1].strip()
    # Remove "Translation:" prefix if model added it
    text = re.sub(r'^Translation:\s*', '', text, flags=re.IGNORECASE)
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


# ═══════════════════════════════════════════════════════════
# Translator 1: Manual (upload ai.Text file with translations)
# ═══════════════════════════════════════════════════════════

def translate_manual_upload():
    """
    User-কে ai.Text file upload করতে দাও (Cell 12-এর ফরম্যাট)।
    Returns: dict {(filename, region_id): translation}
    """
    print("  📤 Upload করো তোমার অনুবাদ করা ai.Text file")
    print("     (Cell 12-এর format-এ থাকতে হবে: [page.jpg:1] text → অনুবাদ)")
    print()

    uploaded = files.upload()
    if not uploaded:
        print("  ⚠️ কোনো file upload হয়নি")
        return {}

    # Read the first uploaded file
    filename = list(uploaded.keys())[0]
    content = uploaded[filename].decode('utf-8', errors='ignore')

    translations = {}
    for line in content.split('\n'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        # Parse: [page.jpg:1] English text → Bengali translation
        match = re.match(r'\[([^:\]]+):(\d+)\]\s*(.+?)\s*→\s*(.*)$', line)
        if match:
            page = match.group(1)
            rid = int(match.group(2))
            orig = match.group(3).strip()
            trans = match.group(4).strip()
            if trans:
                translations[(page, rid)] = trans

    print(f"  ✅ {len(translations)} translations parsed from {filename}")
    return translations


def apply_manual_translation(translations_dict):
    """
    translations_dict থেকে translation_df update করো।
    """
    global translation_df
    if translation_df is None or len(translation_df) == 0:
        print("  ❌ translation_df খালি")
        return 0

    applied = 0
    for _, row in translation_df.iterrows():
        key = (row['page'], int(row['id']))
        if key in translations_dict:
            trans = translations_dict[key]
            trans = clean_translation(trans)
            translation_df.loc[translation_df.index[row.name == translation_df.index],
                              'translated_text'] = trans
            translation_df.loc[translation_df.index[row.name == translation_df.index],
                              'translator_engine'] = 'manual'
            translation_df.loc[translation_df.index[row.name == translation_df.index],
                              'bengali_valid'] = validate_bengali(trans)
            applied += 1

    return applied


# ═══════════════════════════════════════════════════════════
# Translator 2: Gemini API (google-genai)
# ═══════════════════════════════════════════════════════════

def translate_with_gemini(text, target_lang='bn'):
    """
    Gemini API দিয়ে single text translate করো।
    Returns: translated text or empty string on failure
    """
    api_key = CONFIG.get('gemini_api_key') or os.environ.get('GOOGLE_GEMINI_API_KEY', '')
    if not api_key:
        log_event("Gemini API key not set", level='WARN')
        return ''

    try:
        from google import genai
        client = genai.Client(api_key=api_key)

        prompt = (
            f"Translate the following English text to Bengali (Bangla). "
            f"Return ONLY the Bengali translation, nothing else. "
            f"Keep the meaning natural and suitable for manga dialogue. "
            f"Text to translate:\n\n{text}"
        )

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        translated = response.text.strip()
        return clean_translation(translated)
    except Exception as e:
        log_event(f"Gemini translation failed: {str(e)[:60]}", level='WARN')
        return ''


# ═══════════════════════════════════════════════════════════
# Translator 3: ChatGPT API (OpenAI)
# ═══════════════════════════════════════════════════════════

def translate_with_chatgpt(text, target_lang='bn'):
    """
    OpenAI GPT-4o-mini দিয়ে translate করো।
    """
    api_key = CONFIG.get('openai_api_key') or os.environ.get('OPENAI_API_KEY', '')
    if not api_key:
        log_event("OpenAI API key not set", level='WARN')
        return ''

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        prompt = (
            f"Translate the following English text to Bengali (Bangla). "
            f"Return ONLY the Bengali translation, with no quotes, "
            f"no prefixes, no explanations. Keep it natural for manga.\n\n"
            f"English: {text}\nBengali:"
        )

        response = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {'role': 'system',
                 'content': 'You are a professional English-to-Bengali translator for manga.'},
                {'role': 'user', 'content': prompt},
            ],
            max_tokens=512,
            temperature=0.3,
        )
        translated = response.choices[0].message.content.strip()
        return clean_translation(translated)
    except Exception as e:
        log_event(f"ChatGPT translation failed: {str(e)[:60]}", level='WARN')
        return ''


# ═══════════════════════════════════════════════════════════
# Translator 4: NLLB (Facebook, offline)
# ═══════════════════════════════════════════════════════════

nllb_model = None
nllb_tokenizer = None

def load_nllb():
    """NLLB-200 model load করো (Drive-এ cache হবে)।"""
    global nllb_model, nllb_tokenizer
    if nllb_model is not None:
        return True

    try:
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
        NLLB_MODEL_ID = 'facebook/nllb-200-distilled-600M'

        nllb_cache_dir = f"{CONFIG['models_dir']}/nllb"
        os.makedirs(nllb_cache_dir, exist_ok=True)

        print(f"  📥 Loading NLLB-200 (first time ~1.5GB download)...")
        nllb_tokenizer = AutoTokenizer.from_pretrained(
            NLLB_MODEL_ID, cache_dir=nllb_cache_dir,
            src_lang='eng_Latn',
            tgt_lang='ben_Beng',
        )
        # Use float32 for NLLB (float16 can cause issues with seq2seq models)
        nllb_model = AutoModelForSeq2SeqLM.from_pretrained(
            NLLB_MODEL_ID, cache_dir=nllb_cache_dir,
        )
        # Clear GPU cache before loading (Qwen VL already using GPU)
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        nllb_model = nllb_model.to(DEVICE).eval()
        print(f"  ✅ NLLB loaded on {DEVICE}")
        return True
    except Exception as e:
        log_event(f"NLLB load failed: {str(e)[:80]}", level='WARN')
        print(f"  ❌ NLLB load failed: {str(e)[:100]}")
        return False


def translate_with_nllb(text, target_lang='ben_Beng'):
    """NLLB দিয়ে translate করো।"""
    if nllb_model is None:
        if not load_nllb():
            return ''

    try:
        # NLLB-200 uses language codes like 'eng_Latn', 'ben_Beng'
        # Tokenize with source language
        inputs = nllb_tokenizer(text, return_tensors='pt',
                                max_length=512, truncation=True,
                                src_lang='eng_Latn')
        if DEVICE == 'cuda':
            inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

        # Get the forced BOS token for Bengali
        # NLLB-200 tokenizer has special tokens for each language
        forced_bos_id = nllb_tokenizer.convert_tokens_to_ids('ben_Beng')

        # If convert_tokens_to_ids doesn't work, try lang_code_to_id
        if forced_bos_id == nllb_tokenizer.unk_token_id:
            # Try the id2label / label2id approach
            if hasattr(nllb_tokenizer, 'id2lang'):
                for lid, lang in nllb_tokenizer.id2lang.items():
                    if 'ben' in lang.lower():
                        forced_bos_id = lid
                        break
            # Last resort: hardcoded token id for ben_Beng in NLLB-200
            if forced_bos_id == nllb_tokenizer.unk_token_id:
                forced_bos_id = 100362  # ben_Beng token id in NLLB-200

        with torch.no_grad():
            output = nllb_model.generate(
                **inputs,
                forced_bos_token_id=forced_bos_id,
                max_length=512,
                num_beams=4,
            )

        translated = nllb_tokenizer.batch_decode(
            output, skip_special_tokens=True
        )[0]
        return clean_translation(translated)
    except Exception as e:
        log_event(f"NLLB translation failed: {str(e)[:60]}", level='WARN')
        return ''


# ═══════════════════════════════════════════════════════════
# Unified translation dispatcher
# ═══════════════════════════════════════════════════════════

def translate_text(text, engine=None, target_lang='bn'):
    """
    একটি text translate করো।
    Args:
        text: English text
        engine: 'manual' | 'gemini' | 'chatgpt' | 'nllb' | None (use CONFIG)
    Returns: (translation, engine_used)
    """
    if engine is None:
        engine = CONFIG['translator_engine']

    if not text or not text.strip():
        return '', engine

    # Skip special markers
    if text in ('[EMPTY]', '[OCR_FAILED]', '[SFX]', '[SKIP:OCR_FAILED]'):
        return text, engine

    if engine == 'manual':
        # Manual needs the upload workflow (call translate_manual_upload first)
        return '', 'manual'
    elif engine == 'gemini':
        result = translate_with_gemini(text, target_lang)
        return result, 'gemini'
    elif engine == 'chatgpt':
        result = translate_with_chatgpt(text, target_lang)
        return result, 'chatgpt'
    elif engine == 'nllb':
        result = translate_with_nllb(text)
        return result, 'nllb'
    else:
        log_event(f"Unknown translator: {engine}", level='WARN')
        return '', engine


def switch_translator(engine):
    """Translator engine switch করো।"""
    valid = ['manual', 'gemini', 'chatgpt', 'nllb']
    if engine not in valid:
        log_event(f"Invalid translator: {engine}", level='WARN')
        return False
    CONFIG['translator_engine'] = engine
    log_event(f"Translator switched to: {engine}")
    return True


def get_translator_status():
    """Translator status return করো (for dashboard)."""
    return {
        'current': CONFIG['translator_engine'],
        'gemini_key_set': bool(CONFIG.get('gemini_api_key') or
                               os.environ.get('GOOGLE_GEMINI_API_KEY')),
        'openai_key_set': bool(CONFIG.get('openai_api_key') or
                               os.environ.get('OPENAI_API_KEY')),
        'nllb_loaded': nllb_model is not None,
    }


# ═══════════════════════════════════════════════════════════
# Main translation workflow
# ═══════════════════════════════════════════════════════════

def translate_all(engine=None, target_lang='bn'):
    """
    translation_df-এর সব rows translate করো।
    Manual হলে upload prompt করবে।
    """
    global translation_df

    if translation_df is None or len(translation_df) == 0:
        print("  ❌ translation_df খালি! আগে Cell 11 চালাও")
        return

    if engine is None:
        engine = CONFIG['translator_engine']

    print(f"  🌐 Translating with: {engine}")
    print()

    # Manual flow — upload and parse
    if engine == 'manual':
        translations_dict = translate_manual_upload()
        if not translations_dict:
            print("  ⚠️ কোনো translation পাওয়া যায়নি")
            return
        applied = apply_manual_translation(translations_dict)
        print(f"  ✅ {applied} translations applied")
        return

    # Auto translators (gemini, chatgpt, nllb)
    # Preload NLLB if needed
    if engine == 'nllb' and nllb_model is None:
        if not load_nllb():
            print(f"  ❌ NLLB load ব্যর্থ — অন্য translator ব্যবহার করো")
            return

    total = len(translation_df)
    print(f"  📊 {total} regions to translate")
    print()

    success_count = 0
    fail_count = 0
    bengali_count = 0

    from tqdm import tqdm
    for idx in tqdm(translation_df.index, desc="  Translating"):
        text = translation_df.at[idx, 'original_text']
        if not text or text in ('[EMPTY]', '[OCR_FAILED]', '[SFX]',
                                '[SKIP:OCR_FAILED]'):
            translation_df.at[idx, 'translated_text'] = text
            translation_df.at[idx, 'translator_engine'] = engine
            continue

        try:
            translated, used = translate_text(text, engine=engine,
                                              target_lang=target_lang)
            translation_df.at[idx, 'translated_text'] = translated
            translation_df.at[idx, 'translator_engine'] = used

            if translated and validate_bengali(translated):
                bengali_count += 1
                success_count += 1
            elif translated:
                success_count += 1
            else:
                fail_count += 1
        except Exception as e:
            log_event(f"Translation error on row {idx}: {str(e)[:50]}",
                      level='WARN')
            translation_df.at[idx, 'translated_text'] = '[TRANS_FAILED]'
            translation_df.at[idx, 'translator_engine'] = engine
            fail_count += 1

    print()
    print(f"  📊 Translation Summary:")
    print(f"     Success : {success_count}/{total}")
    print(f"     Bengali valid: {bengali_count}")
    print(f"     Failed  : {fail_count}")

    # Update CHECKPOINT
    for filename in translation_df['page'].unique():
        set_page_meta(filename, 'translator_engine', engine)

    log_event(f"Cell 13: translated {success_count}/{total} with {engine}")


# ── UI: Set API keys (interactive) ───────────────────

def set_gemini_key():
    """User থেকে Gemini API key নাও (interactive prompt)।"""
    print("  🔑 Gemini API key দাও (paste করো, তারপর Enter):")
    print("     (Get from: https://aistudio.google.com/apikey)")
    key = input("  Key: ").strip()
    if key:
        CONFIG['gemini_api_key'] = key
        os.environ['GOOGLE_GEMINI_API_KEY'] = key
        print(f"  ✅ Key set")
        return True
    return False


def set_openai_key():
    """User থেকে OpenAI API key নাও।"""
    print("  🔑 OpenAI API key দাও (paste করো, তারপর Enter):")
    print("     (Get from: https://platform.openai.com/api-keys)")
    key = input("  Key: ").strip()
    if key:
        CONFIG['openai_api_key'] = key
        os.environ['OPENAI_API_KEY'] = key
        print(f"  ✅ Key set")
        return True
    return False


# ── Interactive choice ───────────────────────────────

print("  📋 Available translators:")
print("     1. Manual  — Cell 12 file upload করে")
print("     2. Gemini  — GOOGLE_GEMINI_API_KEY লাগবে")
print("     3. ChatGPT — OPENAI_API_KEY লাগবে")
print("     4. NLLB    — Offline, free, ~1.5GB download")
print()
print(f"  📍 Current engine: {CONFIG['translator_engine']}")
print()

status = get_translator_status()
print(f"  Status: {status}")
print()

# Widget to choose engine
print("  ───────────────────────────────────────────")
print("  👇 কোন translator ব্যবহার করবে বলো:")
print("  ───────────────────────────────────────────")

engine_buttons = widgets.ToggleButtons(
    options=[
        ('📝 Manual', 'manual'),
        ('💎 Gemini', 'gemini'),
        ('🤖 ChatGPT', 'chatgpt'),
        ('📚 NLLB (offline)', 'nllb'),
    ],
    value=CONFIG['translator_engine'],
    description='Engine:',
    button_style='info',
    style={'button_width': '150px'},
)

run_button = widgets.Button(
    description='🚀 Translate All',
    button_style='success',
    layout=widgets.Layout(width='200px', height='40px')
)

set_keys_button = widgets.Button(
    description='🔑 Set API Keys',
    button_style='warning',
    layout=widgets.Layout(width='200px', height='40px')
)

def on_engine_change(change):
    new_engine = change['new']
    switch_translator(new_engine)
    print(f"  ✅ Engine switched to: {new_engine}")

def on_run_click(btn):
    clear_output(wait=True)
    print("=" * 60)
    print(f"  🚀 Translating with: {CONFIG['translator_engine']}")
    print("=" * 60)
    print()
    translate_all(engine=CONFIG['translator_engine'])
    print()
    print("═" * 60)
    print("  ✅ Cell 13 সফল — Cell 14 চালানো যাবে (Inpainting)")
    print("═" * 60)

def on_set_keys_click(btn):
    print("\n  🔑 API Key Setup")
    print("  ──────────────────────────────────")
    set_gemini_key()
    print()
    set_openai_key()
    print(f"\n  📊 Updated status: {get_translator_status()}")

engine_buttons.observe(on_engine_change, names='value')
run_button.on_click(on_run_click)
set_keys_button.on_click(on_set_keys_click)

display(widgets.VBox([
    engine_buttons,
    widgets.HBox([run_button, set_keys_button]),
]))

# ── Self-tests (engine sanity, no actual translation) ─
print()
print("─" * 60)
print("  🧪 Self-tests")
print("─" * 60)

# Test 1: validate_bengali
try:
    assert validate_bengali("বাংলা") == True
    assert validate_bengali("Hello") == False
    assert validate_bengali("") == False
    print(f"  Test 1 (validate_bengali): ✅")
except Exception as e:
    print(f"  Test 1: ❌ ({str(e)[:60]})")

# Test 2: clean_translation
try:
    assert clean_translation('"Hello"') == "Hello"
    assert clean_translation("Translation: বাংলা") == "বাংলা"
    assert clean_translation("  বাংলা  ") == "বাংলা"
    print(f"  Test 2 (clean_translation): ✅")
except Exception as e:
    print(f"  Test 2: ❌ ({str(e)[:60]})")

# Test 3: switch_translator
try:
    old = CONFIG['translator_engine']
    switch_translator('nllb')
    new = CONFIG['translator_engine']
    switch_translator(old)
    assert new == 'nllb'
    print(f"  Test 3 (switch_translator): ✅")
except Exception as e:
    print(f"  Test 3: ❌ ({str(e)[:60]})")

# Test 4: status
try:
    s = get_translator_status()
    assert 'current' in s
    print(f"  Test 4 (status): {s} ✅")
except Exception as e:
    print(f"  Test 4: ❌ ({str(e)[:60]})")

print()
print("═" * 60)
print("  📌 এখন: engine বেছে নাও, 'Translate All' চাপো")
print("═" * 60)

log_event("Cell 13: Translation Engine ready (4 modes)")
