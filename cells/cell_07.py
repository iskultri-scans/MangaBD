# ═══════════════════════════════════════════════════════════
# 📖 CELL 7 — OCR Engine (V11: Qwen VL only)
# ═══════════════════════════════════════════════════════════
# Qwen 2.5 VL 3B Instruct — the ONLY OCR engine
# (Baidu removed — too many compatibility issues)
# Preprocessing: upscale 2x if height < 40px, denoise, contrast boost
# ═══════════════════════════════════════════════════════════

import cv2
import numpy as np
import torch

print("=" * 60)
print("  📖 MangaBD V11 — OCR Engine (Qwen VL)")
print("=" * 60)
print()

# ── Preprocessing ─────────────────────────────────────

def preprocess_for_ocr(image_np, target_engine='qwen'):
    """
    OCR-এর আগে image preprocess করো:
      1. BGR → RGB
      2. Upscale 2x if height < 40px (small text recovery)
      3. Light denoise (bilateral filter — preserves edges)
      4. Contrast boost (CLAHE on grayscale)
      5. Pad with white border
    Returns: preprocessed RGB image
    """
    try:
        if image_np is None or image_np.size == 0:
            return np.zeros((40, 100, 3), dtype=np.uint8)

        # Convert BGR → RGB
        if image_np.shape[-1] == 3:
            img = cv2.cvtColor(image_np, cv2.COLOR_BGR2RGB)
        else:
            img = image_np.copy()

        h, w = img.shape[:2]

        # Upscale small images
        if h < CONFIG['ocr_min_image_height']:
            scale = 2.0
            new_w = int(w * scale)
            new_h = int(h * scale)
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

        # Light denoise (preserves edges)
        img = cv2.bilateralFilter(img, d=5, sigmaColor=50, sigmaSpace=50)

        # Contrast boost via CLAHE on L channel
        try:
            lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            lab[:, :, 0] = clahe.apply(lab[:, :, 0])
            img = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
        except Exception:
            pass

        # Pad with white border (OCR engines prefer some margin)
        h, w = img.shape[:2]
        pad = max(4, min(h, w) // 10)
        padded = np.ones((h + 2*pad, w + 2*pad, 3), dtype=np.uint8) * 255
        padded[pad:pad+h, pad:pad+w] = img

        return padded
    except Exception as e:
        log_event(f"OCR preprocess failed: {str(e)[:50]}", level='WARN')
        if image_np is not None and image_np.size > 0:
            return cv2.cvtColor(image_np, cv2.COLOR_BGR2RGB)
        return np.zeros((40, 100, 3), dtype=np.uint8)


# ── OCR Function ──────────────────────────────────────

def ocr_recognize(image_np, engine=None, fallback=True):
    """
    একটি image region থেকে text recognize করো।
    Args:
        image_np: BGR image (cropped region)
        engine: 'qwen' | None (None হলে CONFIG['ocr_engine'])
        fallback: kept for compatibility (ignored — only Qwen available)
    Returns:
        tuple: (text: str, confidence: float, engine_used: str)
    """
    if engine is None:
        engine = CONFIG['ocr_engine']

    # Preprocess
    preprocessed = preprocess_for_ocr(image_np, target_engine=engine)

    # Only Qwen VL is available
    if qwen_vl_ocr is None:
        return '[OCR_FAILED: no engine]', 0.0, 'none'

    try:
        text, confidence = qwen_vl_ocr.recognize(preprocessed)
        engine_used = 'qwen'
    except Exception as e:
        log_event(f"OCR error (qwen): {str(e)[:60]}", level='WARN')
        return f'[OCR_FAILED: {str(e)[:30]}]', 0.0, 'none'

    # Clean text
    text = _clean_ocr_text(text)
    return text, float(confidence), engine_used


def _clean_ocr_text(text):
    """OCR output থেকে unnecessary whitespace, artifacts সরাও।"""
    if not text:
        return ''
    text = text.strip()
    import re
    text = re.sub(r'\s+', ' ', text)
    text = text.replace('|', 'I').replace('l', 'l')
    return text.strip()


def is_english_text(text):
    """একটি text মূলত English কিনা check করো।"""
    if not text:
        return False
    latin = sum(1 for c in text if 'a' <= c.lower() <= 'z')
    bengali = sum(1 for c in text if '\u0980' <= c <= '\u09FF')
    total_letters = latin + bengali
    if total_letters == 0:
        return False
    return latin / total_letters > 0.6


def switch_ocr_engine(engine):
    """OCR engine switch করো. Only 'qwen' is valid."""
    if engine != 'qwen':
        log_event(f"Invalid OCR engine: {engine} (only 'qwen' available)", level='WARN')
        return False
    if qwen_vl_ocr is None:
        log_event("Qwen VL not loaded", level='WARN')
        return False
    CONFIG['ocr_engine'] = engine
    log_event(f"OCR engine: {engine}")
    return True


def get_ocr_status():
    """OCR engine status return করো (for dashboard)."""
    return {
        'current': CONFIG['ocr_engine'],
        'qwen_loaded': qwen_vl_ocr is not None,
    }


print("  📝 OCR functions তৈরি হয়েছে ✅")
print()

# ── Self-tests ────────────────────────────────────────
print("─" * 60)
print("  🧪 OCR Tests")
print("─" * 60)

# Test 1: Preprocess
try:
    test_img = np.ones((30, 100, 3), dtype=np.uint8) * 255
    cv2.putText(test_img, "Hi", (10, 20), cv2.FONT_HERSHEY_SIMPLEX,
                0.6, (0, 0, 0), 1)
    preprocessed = preprocess_for_ocr(test_img)
    h, w = preprocessed.shape[:2]
    upscaled_ok = h >= 60
    print(f"  Test 1 (preprocess): {h}x{w} (upscaled={'✅' if upscaled_ok else '⚠️'})")
except Exception as e:
    print(f"  Test 1: ❌ ({str(e)[:60]})")

# Test 2: _clean_ocr_text
try:
    cleaned = _clean_ocr_text("  Hello\nWorld  |  test  ")
    ok = cleaned == "Hello World I test"
    print(f"  Test 2 (clean): '{cleaned}' {'✅' if ok else '⚠️'}")
except Exception as e:
    print(f"  Test 2: ❌ ({str(e)[:60]})")

# Test 3: is_english_text
try:
    assert is_english_text("Hello World") == True
    assert is_english_text("বাংলা ভাষা") == False
    assert is_english_text("123") == False
    assert is_english_text("") == False
    print(f"  Test 3 (is_english_text): ✅")
except Exception as e:
    print(f"  Test 3: ❌ ({str(e)[:60]})")

# Test 4: Live OCR (Qwen)
if qwen_vl_ocr is not None:
    try:
        test_img = np.ones((80, 300, 3), dtype=np.uint8) * 255
        cv2.putText(test_img, "MANGA TRANSLATOR", (10, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 3)
        text, conf, eng = ocr_recognize(test_img, engine='qwen', fallback=False)
        ok = 'MANGA' in text.upper() or 'TRANSLATOR' in text.upper()
        print(f"  Test 4 (Qwen OCR): '{text[:40]}' conf={conf:.2f} "
              f"engine={eng} {'✅' if ok else '⚠️'}")
    except Exception as e:
        print(f"  Test 4: ❌ ({str(e)[:80]})")
else:
    print(f"  Test 4: ⏭️  Qwen VL not loaded — skip")

# Test 5: Switch engine
try:
    if qwen_vl_ocr is not None:
        old = CONFIG['ocr_engine']
        switch_ocr_engine('qwen')
        new = CONFIG['ocr_engine']
        switch_ocr_engine(old)
        ok = new == 'qwen'
        print(f"  Test 5 (switch): {old} → {new} → {old} {'✅' if ok else '❌'}")
    else:
        print(f"  Test 5: ⏭️  skip (Qwen not loaded)")
except Exception as e:
    print(f"  Test 5: ❌ ({str(e)[:60]})")

# Test 6: get_ocr_status
try:
    status = get_ocr_status()
    print(f"  Test 6 (status): {status} ✅")
except Exception as e:
    print(f"  Test 6: ❌ ({str(e)[:60]})")

print()
print("═" * 60)
print("  ✅ Cell 7 সফল — Cell 8 চালানো যাবে (Inpainting)")
print("═" * 60)

log_event("Cell 7: OCR Engine ready (Qwen VL only)")
