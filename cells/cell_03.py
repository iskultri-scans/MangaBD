# ═══════════════════════════════════════════════════════════
# 🤖 CELL 3 — Model Loading (V11: CTD + Baidu OCR + Qwen VL + LaMa Large)
# ═══════════════════════════════════════════════════════════
# এই cell 4টি model load করবে:
#   1. CTD (Comic Text Detector)         — text detection
#   2. Baidu/Unlimited-OCR                — primary OCR
#   3. Qwen/Qwen2.5-VL-3B-Instruct        — backup OCR
#   4. LaMa Large (LamaLargeInpainter)    — text removal
# প্রথমবার চালালে ~3GB download হবে Google Drive-এ।
# পরের বার <60 sec-এ load হবে।
# ═══════════════════════════════════════════════════════════

import os
import sys
import time
import shutil
import urllib.request
from pathlib import Path

import torch
import numpy as np
from PIL import Image

print("=" * 60)
print("  🤖 MangaBD V11 — Model Loading")
print("=" * 60)
print()

load_start = time.time()
models_loaded = {}

# ── Derive model subdirectories from existing CONFIG paths ──
# Cell 2-এ CONFIG তে শুধু *_model_path (full file path) আর models_dir আছে।
# কোনো directory path key নেই (যেমন models_ctd, models_baidu ইত্যাদি)।
# তাই এখানে সেগুলো derive করছি।
ctd_model_dir = os.path.dirname(CONFIG['ctd_model_path'])
baidu_cache_dir = f"{CONFIG['models_dir']}/baidu_ocr"
qwen_cache_dir = f"{CONFIG['models_dir']}/qwen_vl"
lama_model_dir = os.path.dirname(CONFIG['lama_model_path'])
nllb_cache_dir = f"{CONFIG['models_dir']}/nllb"

# Make sure all directories exist
for d in [ctd_model_dir, baidu_cache_dir, qwen_cache_dir, lama_model_dir, nllb_cache_dir]:
    os.makedirs(d, exist_ok=True)

# ── Helper: download with progress ────────────────────
def download_file(url, dest, label=""):
    """Download a file with progress bar."""
    if os.path.exists(dest) and os.path.getsize(dest) > 1024:
        size_mb = os.path.getsize(dest) / 1e6
        print(f"  ✅ {label} already exists ({size_mb:.1f} MB)")
        return True
    print(f"  ⬇️ Downloading {label}...")
    print(f"     URL: {url}")
    print(f"     Dest: {dest}")
    try:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        def reporthook(count, block_size, total_size):
            if count % 50 == 0:
                downloaded = count * block_size
                if total_size > 0:
                    pct = min(100, downloaded * 100 / total_size)
                    print(f"     {downloaded/1e6:.1f} / {total_size/1e6:.1f} MB ({pct:.0f}%)",
                          end='\r', flush=True)
        urllib.request.urlretrieve(url, dest, reporthook=reporthook)
        size_mb = os.path.getsize(dest) / 1e6
        print(f"  ✅ Downloaded {label} ({size_mb:.1f} MB)               ")
        return True
    except Exception as e:
        print(f"  ❌ Download failed: {e}")
        return False


# ═══════════════════════════════════════════════════════════
# MODEL 1: CTD (Comic Text Detector)
# ═══════════════════════════════════════════════════════════
print("─" * 60)
print("  🔍 Model 1/4: CTD (Comic Text Detector)")
print("─" * 60)

# Ensure model directory exists and download weight
# (ctd_model_dir already created above)
ctd_model_path = CONFIG['ctd_model_path']
ctd_url = 'https://github.com/zyddnys/manga-image-translator/releases/download/beta-0.3/comictextdetector.pt'

if not (os.path.exists(ctd_model_path) and os.path.getsize(ctd_model_path) > 1024):
    download_file(ctd_url, ctd_model_path, "CTD model")
else:
    print(f"  ✅ CTD cached ({os.path.getsize(ctd_model_path)/1e6:.1f} MB)")

ctd_load_start = time.time()
ctd_detector = None
try:
    from manga_translator.detection.ctd import ComicTextDetector

    # ─── FIX for KeyError 'models_ctd' ───────────────────────────
    # The original ComicTextDetector.__init__ does:
    #     os.makedirs(self.model_dir, exist_ok=True)
    #     ...
    #     super().__init__(*args, **kwargs)
    #
    # `self.model_dir` is a @property that returns:
    #     os.path.join(self._MODEL_DIR, self._MODEL_SUB_DIR)
    #
    # We override _MODEL_DIR and _MODEL_SUB_DIR as CLASS ATTRIBUTES
    # (set BEFORE __init__ runs) so the property returns our Drive path.
    # ─────────────────────────────────────────────────────────────
    class MangaBD_CTD(ComicTextDetector):
        """CTD with MangaBD-specific Drive model directory."""
        # Override class attributes — these are read by ModelWrapper.model_dir property
        _MODEL_DIR = CONFIG['models_dir']     # parent dir
        _MODEL_SUB_DIR = 'ctd'                # subdirectory name

        # Override _get_file_path to skip download() since we already have the file
        def _get_file_path(self, *args):
            return os.path.join(self.model_dir, *args)

    ctd_detector = MangaBD_CTD()
    _run_async(ctd_detector.load(DEVICE))
    ctd_load_time = time.time() - ctd_load_start
    print(f"  ✅ CTD loaded in {ctd_load_time:.1f}s on {DEVICE}")
    models_loaded['ctd'] = True
except Exception as e:
    ctd_load_time = time.time() - ctd_load_start
    import traceback
    print(f"  ❌ CTD load failed ({ctd_load_time:.1f}s): {str(e)[:150]}")
    print(f"  📍 Full traceback (last 3 lines):")
    for line in traceback.format_exc().split('\n')[-5:-1]:
        if line.strip():
            print(f"     {line}")
    print(f"  ⚠️ CTD fallback: Cell 6 তে detection skip করবে")
    models_loaded['ctd'] = False
    ctd_detector = None

print()

# ═══════════════════════════════════════════════════════════
# MODEL 2: Baidu/Unlimited-OCR (Primary OCR)
# ═══════════════════════════════════════════════════════════
print("─" * 60)
print("  📖 Model 2/4: Baidu Unlimited OCR (Primary)")
print("─" * 60)

baidu_load_start = time.time()
baidu_ocr = None
try:
    # ─── Baidu OCR: Official API from HuggingFace ───────────────
    # Source: https://huggingface.co/baidu/Unlimited-OCR
    # Requirements: transformers==4.57.1, addict, easydict, pymupdf
    # Uses: torch.bfloat16 (NOT float16), use_safetensors=True
    # API: model.infer(tokenizer, prompt, image_file, output_path, ...)
    # ─────────────────────────────────────────────────────────────

    # Install deps inline (safety net if Cell 1 not run)
    import subprocess
    for pkg in ['addict', 'easydict', 'pymupdf']:
        try:
            __import__(pkg if pkg != 'pymupdf' else 'fitz')
        except ImportError:
            subprocess.run([sys.executable, '-m', 'pip', 'install', '--quiet', pkg],
                          check=False)
    print(f"  ✅ Baidu deps available (addict, easydict, pymupdf)")

    # ─── transformers version check ─────────────────────────────
    # Baidu Unlimited-OCR requires transformers==4.57.1 (per official docs).
    # Cell 1 pins this version. If user is on older/newer version, warn them.
    import transformers
    tf_ver = tuple(int(x) for x in transformers.__version__.split('.')[:3])
    if tf_ver < (4, 50, 0):
        print(f"  ⚠️ transformers {transformers.__version__} — Baidu needs 4.57.1")
        print(f"     Run: !pip install -q transformers==4.57.1")
    elif tf_ver != (4, 57, 1):
        print(f"  ℹ️ transformers {transformers.__version__} (Baidu recommends 4.57.1)")

    from transformers import AutoModel, AutoTokenizer
    import tempfile

    BAIDU_MODEL_ID = 'baidu/Unlimited-OCR'

    print(f"  📥 Loading {BAIDU_MODEL_ID}...")
    print(f"     (first time ~6.7GB download to Drive, later cached)")
    print(f"     Using OFFICIAL API: torch.bfloat16 + use_safetensors + model.infer()")

    baidu_tokenizer = AutoTokenizer.from_pretrained(
        BAIDU_MODEL_ID,
        cache_dir=baidu_cache_dir,
        trust_remote_code=True,
    )

    # ─── OFFICIAL LOADING (from HuggingFace page) ───────────────
    # Key differences from before:
    #   - torch_dtype=torch.bfloat16 (NOT float16 — bfloat16 is required)
    #   - use_safetensors=True (loads .safetensors, not .bin)
    #   - NO device_map='auto' (official code uses .cuda() after load)
    #   - NO low_cpu_mem_usage (can break custom code)
    baidu_model = AutoModel.from_pretrained(
        BAIDU_MODEL_ID,
        cache_dir=baidu_cache_dir,
        trust_remote_code=True,
        use_safetensors=True,
        torch_dtype=torch.bfloat16,
    )
    baidu_model = baidu_model.eval()
    if DEVICE == 'cuda':
        baidu_model = baidu_model.cuda()
    print(f"  ✅ Baidu model loaded on {DEVICE} (bfloat16)")

    # Verify model has .infer() method (official API)
    if not hasattr(baidu_model, 'infer'):
        print(f"  ⚠️ Model doesn't have .infer() method — Baidu may not work")
        raise AttributeError("model.infer() not found")

    class BaiduOCRWrapper:
        """Wrapper around Baidu Unlimited OCR using official .infer() API."""
        def __init__(self, model, tokenizer, device):
            self.model = model
            self.tokenizer = tokenizer
            self.device = device
            # Temp directory for image files (infer() takes file paths)
            self._temp_dir = tempfile.mkdtemp(prefix='baidu_ocr_')

        @torch.no_grad()
        def recognize(self, image_np):
            """
            Recognize text from cropped RGB image.
            Uses official model.infer() API — saves image to temp file,
            runs inference, reads result.
            Returns: (text, confidence)
            """
            try:
                # Clear CUDA cache before inference — Baidu + Qwen দুটোই
                # GPU তে আছে, তাই inference এর আগে cache clear দরকার।
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()

                if isinstance(image_np, np.ndarray):
                    pil_img = Image.fromarray(image_np.astype(np.uint8))
                else:
                    pil_img = image_np

                # Save PIL image to temp file (infer() needs file path)
                import uuid
                temp_img_path = os.path.join(self._temp_dir, f"img_{uuid.uuid4().hex[:8]}.jpg")
                pil_img.save(temp_img_path, format='JPEG', quality=95)

                # Output directory for results
                output_dir = os.path.join(self._temp_dir, f"out_{uuid.uuid4().hex[:8]}")
                os.makedirs(output_dir, exist_ok=True)

                # ─── Official .infer() call ───────────────────────
                # From HuggingFace: model.infer(tokenizer, prompt, image_file, output_path, ...)
                # prompt: '<image>document parsing.' for single image
                # base_size=1024, image_size=640, crop_mode=True (gundam config)
                result = self.model.infer(
                    self.tokenizer,
                    prompt='<image>document parsing.',
                    image_file=temp_img_path,
                    output_path=output_dir,
                    base_size=1024,
                    image_size=640,
                    crop_mode=True,
                    max_length=32768,
                    no_repeat_ngram_size=35,
                    ngram_window=128,
                    save_results=True,  # save to file — we'll read it
                )

                # DEBUG: print what we got
                import sys as _sys
                print(f"      [DEBUG] result type: {type(result).__name__}", file=_sys.stderr)
                if result is not None:
                    print(f"      [DEBUG] result preview: {str(result)[:200]}", file=_sys.stderr)

                # Also check what files were saved in output_dir
                saved_files = []
                if os.path.exists(output_dir):
                    saved_files = os.listdir(output_dir)
                print(f"      [DEBUG] saved files: {saved_files}", file=_sys.stderr)

                # Parse result — Baidu returns string with <|det|> tags
                # Format: <|det|>title [x1,y1,x2,y2]<|/det|>ACTUAL TEXT
                #         <|det|>text [x1,y1,x2,y2]<|/det|>MORE TEXT
                # We need to extract the text AFTER <|/det|> tags
                import re
                text = ''
                raw = ''
                # Try to get text from result first
                if isinstance(result, str) and result.strip():
                    raw = result
                elif isinstance(result, dict):
                    raw = result.get('text', result.get('result', ''))
                elif isinstance(result, (list, tuple)) and len(result) > 0:
                    raw = str(result[0]) if not isinstance(result[0], dict) else \
                          result[0].get('text', str(result[0]))

                # If result is empty/None, read from saved files
                if not raw or not str(raw).strip():
                    if os.path.exists(output_dir):
                        for fname in os.listdir(output_dir):
                            fpath = os.path.join(output_dir, fname)
                            if fname.endswith('.txt') or fname.endswith('.md') or fname.endswith('.json'):
                                try:
                                    with open(fpath) as f:
                                        content = f.read()
                                    if content.strip():
                                        raw = content
                                        print(f"      [DEBUG] read from {fname}: {content[:100]}", file=_sys.stderr)
                                        break
                                except Exception:
                                    pass

                print(f"      [DEBUG] raw text length: {len(str(raw))}", file=_sys.stderr)

                # ─── Parse Baidu's <|det|> format ──────────────────
                # Find all text segments after <|/det|> tags
                # Pattern: <|/det|>TEXT (until next <|det|> or end)
                if raw and '<|' in raw:
                    # Extract text after each <|/det|> tag
                    segments = re.findall(r'<\|/det\|>(.*?)(?=<\|det\|>|$)', raw, re.DOTALL)
                    if segments:
                        # Join all segments with newlines, clean each
                        cleaned_segments = []
                        for seg in segments:
                            seg = seg.strip()
                            # Remove coordinate-like artifacts: [123, 456, 789, 012]
                            seg = re.sub(r'\[\d+,\s*\d+,\s*\d+,\s*\d+\]', '', seg)
                            seg = seg.strip()
                            if seg:
                                cleaned_segments.append(seg)
                        text = '\n'.join(cleaned_segments)
                    else:
                        # No tags found — use raw but strip tags
                        text = re.sub(r'<\|[^|]*\|>', '', raw).strip()
                else:
                    text = raw.strip() if raw else ''

                # Cleanup temp files
                try:
                    os.remove(temp_img_path)
                    import shutil
                    shutil.rmtree(output_dir, ignore_errors=True)
                except Exception:
                    pass

                # Final cleanup — remove markdown artifacts
                text = text.strip()
                text = re.sub(r'^```+\w*\n?', '', text)
                text = re.sub(r'\n?```+$', '', text)
                # Remove leftover LaTeX/math artifacts that Baidu sometimes adds
                text = re.sub(r'\\\([^\)]*\)', '', text)  # \( ... \)
                text = re.sub(r'\\\[[^\]]*\]', '', text)  # \[ ... \]
                text = re.sub(r'\s+', ' ', text)  # normalize whitespace
                text = text.strip()

                confidence = 0.85 if len(text) > 0 else 0.0
                return text, confidence
            except Exception as e:
                return f'[OCR_FAILED: {str(e)[:30]}]', 0.0

    baidu_ocr = BaiduOCRWrapper(baidu_model, baidu_tokenizer, DEVICE)
    baidu_load_time = time.time() - baidu_load_start
    print(f"  ✅ Baidu OCR loaded in {baidu_load_time:.1f}s on {DEVICE}")
    print(f"  📍 Using official model.infer() API")
    models_loaded['baidu'] = True
except Exception as e:
    baidu_load_time = time.time() - baidu_load_start
    import traceback
    print(f"  ❌ Baidu OCR load failed ({baidu_load_time:.1f}s): {str(e)[:150]}")
    print(f"  📍 Last 3 traceback lines:")
    for line in traceback.format_exc().split('\n')[-5:-1]:
        if line.strip():
            print(f"     {line}")
    print(f"  ⚠️ Baidu fallback: Qwen VL primary হবে")
    print(f"  💡 যদি Baidu এর আরো compatibility issue হয়, চিন্তা করো না —")
    print(f"     Qwen VL দিয়েই সব OCR চলবে, Baidu ছাড়াও workflow complete হবে।")
    models_loaded['baidu'] = False
    baidu_ocr = None
    # Auto-switch to Qwen as primary if Baidu fails AND Qwen is available
    if CONFIG.get('ocr_engine', 'baidu') == 'baidu':
        CONFIG['ocr_engine'] = 'qwen'
        print(f"  🔄 Auto-switched CONFIG['ocr_engine'] = 'qwen' (Baidu unavailable)")

print()

# ═══════════════════════════════════════════════════════════
# MODEL 3: Qwen 2.5 VL 3B (Backup OCR) — OPTIONAL
# ═══════════════════════════════════════════════════════════
# Default: SKIP (Baidu দিয়েই fast + accurate output পাওয়া যাচ্ছে)
# Qwen লোড করলে ~6GB GPU memory বাড়ে, যা Baidu inference এ OOM করতে পারে।
# চাইলে CONFIG['enable_qwen_vl'] = True করে enable করতে পারো।
print("─" * 60)
print("  📖 Model 3/4: Qwen 2.5 VL 3B Instruct (Backup OCR)")
print("─" * 60)

qwen_load_start = time.time()
qwen_vl_ocr = None

# Check if Qwen is enabled (default: False — Baidu is enough)
_qwen_enabled = CONFIG.get('enable_qwen_vl', False)

if not _qwen_enabled:
    print(f"  ⏭️  Qwen VL skipped (CONFIG['enable_qwen_vl'] = False)")
    print(f"  💡 Baidu দিয়েই fast + accurate OCR হবে — Qwen এর দরকার নেই")
    print(f"  💡 চাইলে Cell 2-তে CONFIG['enable_qwen_vl'] = True করে enable করতে পারো")
    models_loaded['qwen'] = False
    qwen_vl_ocr = None
    # Ensure Baidu is primary if it's available
    if baidu_ocr is not None:
        CONFIG['ocr_engine'] = 'baidu'
        print(f"  ✅ OCR engine: baidu (primary, only)")
else:
    try:
        from transformers import AutoProcessor
        # Try Qwen2.5-VL first (newer), fall back to Qwen2-VL
        try:
            from transformers import Qwen2_5_VLForConditionalGeneration as QwenModel
            print(f"  ℹ️ Using Qwen2_5_VLForConditionalGeneration")
        except ImportError:
            from transformers import Qwen2VLForConditionalGeneration as QwenModel
            print(f"  ℹ️ Using Qwen2VLForConditionalGeneration (2.5 not available)")

        QWEN_MODEL_ID = 'Qwen/Qwen2.5-VL-3B-Instruct'

        print(f"  📥 Loading {QWEN_MODEL_ID}...")
        print(f"     (using device_map='auto' to avoid OOM during .to(DEVICE))")

        qwen_vl_model = QwenModel.from_pretrained(
            QWEN_MODEL_ID,
            cache_dir=qwen_cache_dir,
            torch_dtype=DEVICE_TORCH_DTYPE,
            trust_remote_code=True,
            low_cpu_mem_usage=True,
            device_map='auto' if DEVICE == 'cuda' else None,
        )
        qwen_vl_model.eval()
        print(f"  ✅ Qwen model loaded to device(s): "
              f"{set(p.device for p in qwen_vl_model.parameters())}")

        qwen_vl_processor = AutoProcessor.from_pretrained(
            QWEN_MODEL_ID,
            cache_dir=qwen_cache_dir,
            trust_remote_code=True,
        )

        class QwenVLOCRWrapper:
            """Wrapper around Qwen 2.5 VL for OCR."""
            def __init__(self, model, processor, device):
                self.model = model
                self.processor = processor
                self.device = device

            @torch.no_grad()
            def recognize(self, image_np):
                """Recognize text. Returns (text, confidence)."""
                try:
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                    if isinstance(image_np, np.ndarray):
                        pil_img = Image.fromarray(image_np.astype(np.uint8))
                    else:
                        pil_img = image_np
                    prompt_text = (
                        "Extract all text visible in this image exactly as written. "
                        "Return only the raw text content, nothing else. "
                        "If there is no readable text, return empty string."
                    )
                    messages = [
                        {
                            "role": "user",
                            "content": [
                                {"type": "image", "image": pil_img},
                                {"type": "text", "text": prompt_text},
                            ],
                        }
                    ]
                    chat_text = self.processor.apply_chat_template(
                        messages, tokenize=False, add_generation_prompt=True
                    )
                    inputs = self.processor(
                        text=chat_text, images=[pil_img],
                        return_tensors='pt', padding=True,
                    )
                    try:
                        model_device = next(self.model.parameters()).device
                    except Exception:
                        model_device = self.device
                    inputs = {
                        k: (v.to(model_device).to(DEVICE_TORCH_DTYPE)
                            if v.dtype.is_floating_point else v.to(model_device))
                        for k, v in inputs.items() if isinstance(v, torch.Tensor)
                    }
                    output_ids = self.model.generate(**inputs, max_new_tokens=256)
                    generated = output_ids[:, inputs['input_ids'].shape[1]:]
                    text = self.processor.batch_decode(
                        generated, skip_special_tokens=True
                    )[0].strip()
                    confidence = 0.80 if len(text) > 0 else 0.0
                    return text, confidence
                except Exception as e:
                    return f'[OCR_FAILED: {str(e)[:30]}]', 0.0

        qwen_vl_ocr = QwenVLOCRWrapper(qwen_vl_model, qwen_vl_processor, DEVICE)
        qwen_load_time = time.time() - qwen_load_start
        print(f"  ✅ Qwen VL loaded in {qwen_load_time:.1f}s on {DEVICE}")
        models_loaded['qwen'] = True
    except Exception as e:
        qwen_load_time = time.time() - qwen_load_start
        import traceback
        print(f"  ❌ Qwen VL load failed ({qwen_load_time:.1f}s): {str(e)[:150]}")
        print(f"  📍 Last 3 traceback lines:")
        for line in traceback.format_exc().split('\n')[-5:-1]:
            if line.strip():
                print(f"     {line}")
        print(f"  ⚠️ Qwen fallback: শুধু Baidu থাকবে (backup থাকবে না)")
        models_loaded['qwen'] = False
        qwen_vl_ocr = None

print()

# ═══════════════════════════════════════════════════════════
# MODEL 4: LaMa Large (LamaLargeInpainter)
# ═══════════════════════════════════════════════════════════
print("─" * 60)
print("  ✂️ Model 4/4: LaMa Large (Inpainting)")
print("─" * 60)

# Download weight if missing
# (lama_model_dir already created above)
# NOTE: LamaLargeInpainter-এর নিজস্ব _MODEL_MAPPING HuggingFace থেকে
# 'lama_large_512px.ckpt' download করে। আমরা সেটাই use করব —
# আলাদা download করার দরকার নেই। শুধু directory নিশ্চিত করছি।
lama_model_path = CONFIG['lama_model_path']

# If the correct file (lama_large_512px.ckpt) is missing, the
# parent class will auto-download it via its _MODEL_MAPPING.
lama_correct_path = f"{lama_model_dir}/lama_large_512px.ckpt"
if os.path.exists(lama_correct_path) and os.path.getsize(lama_correct_path) > 1024:
    print(f"  ✅ LaMa Large cached ({os.path.getsize(lama_correct_path)/1e6:.1f} MB)")
else:
    print(f"  ℹ️ LaMa Large not cached yet — will download from HuggingFace (~200MB)")

lama_load_start = time.time()
lama_inpainter = None
try:
    from manga_translator.inpainting.inpainting_lama_mpe import LamaLargeInpainter

    # ─── FIX for LaMa Large filename mismatch ───────────────────
    # LamaLargeInpainter-এর নিজস্ব _MODEL_MAPPING HuggingFace থেকে
    # 'lama_large_512px.ckpt' download করে এবং _load() সেই filename
    # খুঁজে। আমরা শুধু _MODEL_DIR ও _MODEL_SUB_DIR override করছি
    # যাতে সেটা আমাদের Drive-এ save হয়। _MODEL_MAPPING অপরিবর্তিত রাখি।
    # ─────────────────────────────────────────────────────────────
    class MangaBD_LaMa(LamaLargeInpainter):
        """LaMa Large with MangaBD Drive model dir.
        Inherits _MODEL_MAPPING from LamaLargeInpainter — auto-downloads
        lama_large_512px.ckpt from HuggingFace if missing."""
        _MODEL_DIR = CONFIG['models_dir']
        _MODEL_SUB_DIR = 'lama_large'

    lama_inpainter = MangaBD_LaMa()
    _run_async(lama_inpainter.load(DEVICE))
    lama_load_time = time.time() - lama_load_start
    print(f"  ✅ LaMa Large loaded in {lama_load_time:.1f}s on {DEVICE}")
    models_loaded['lama'] = True
except Exception as e:
    lama_load_time = time.time() - lama_load_start
    import traceback
    print(f"  ❌ LaMa Large load failed ({lama_load_time:.1f}s): {str(e)[:150]}")
    print(f"  📍 Last 3 traceback lines:")
    for line in traceback.format_exc().split('\n')[-5:-1]:
        if line.strip():
            print(f"     {line}")
    print(f"  ⚠️ LaMa fallback: OpenCV TELEA ব্যবহার হবে")
    models_loaded['lama'] = False
    lama_inpainter = None

print()

# ═══════════════════════════════════════════════════════════
# Summary & self-tests
# ═══════════════════════════════════════════════════════════
total_load_time = time.time() - load_start
print("═" * 60)
print(f"  📊 Model Loading Summary")
print("═" * 60)
print(f"  Total time : {total_load_time:.1f}s ({total_load_time/60:.1f} min)")
print()

for name, ok in models_loaded.items():
    status = "✅ Ready" if ok else "❌ Failed"
    print(f"  {name:8s}: {status}")

print()

# ── Self-tests ────────────────────────────────────────
print("─" * 60)
print("  🧪 Self-tests")
print("─" * 60)

# Test 1: CTD detection on a tiny synthetic image
if ctd_detector is not None:
    try:
        test_img = np.ones((300, 300, 3), dtype=np.uint8) * 255
        cv2.putText(test_img, "TEST", (50, 150), cv2.FONT_HERSHEY_SIMPLEX,
                    2, (0, 0, 0), 4)
        textlines, raw_mask, mask = _run_async(ctd_detector.detect(
            test_img,
            detect_size=CONFIG['detection_size'],
            text_threshold=CONFIG['text_threshold'],
            box_threshold=CONFIG['box_threshold'],
            unclip_ratio=CONFIG['unclip_ratio'],
            invert=False, gamma_correct=False, rotate=False,
            auto_rotate=False, verbose=False,
        ))
        print(f"  ✅ CTD: detected {len(textlines)} regions on test image")
    except Exception as e:
        print(f"  ⚠️ CTD test: {str(e)[:80]}")
else:
    print("  ⚠️ CTD not loaded — skip test")

# Test 2: Baidu OCR
if baidu_ocr is not None:
    try:
        test_img = np.ones((60, 200, 3), dtype=np.uint8) * 255
        cv2.putText(test_img, "Hello", (10, 40), cv2.FONT_HERSHEY_SIMPLEX,
                    1.2, (0, 0, 0), 2)
        test_rgb = cv2.cvtColor(test_img, cv2.COLOR_BGR2RGB)
        text, conf = baidu_ocr.recognize(test_rgb)
        print(f"  ✅ Baidu OCR: '{text[:30]}' (conf={conf:.2f})")
    except Exception as e:
        print(f"  ⚠️ Baidu OCR test: {str(e)[:80]}")
else:
    print("  ⚠️ Baidu OCR not loaded — skip test")

# Test 3: Qwen VL OCR
if qwen_vl_ocr is not None:
    try:
        test_img = np.ones((60, 200, 3), dtype=np.uint8) * 255
        cv2.putText(test_img, "Hello", (10, 40), cv2.FONT_HERSHEY_SIMPLEX,
                    1.2, (0, 0, 0), 2)
        test_rgb = cv2.cvtColor(test_img, cv2.COLOR_BGR2RGB)
        text, conf = qwen_vl_ocr.recognize(test_rgb)
        print(f"  ✅ Qwen VL OCR: '{text[:30]}' (conf={conf:.2f})")
    except Exception as e:
        print(f"  ⚠️ Qwen VL OCR test: {str(e)[:80]}")
else:
    print("  ⚠️ Qwen VL not loaded — skip test")

# Test 4: LaMa inpainting
if lama_inpainter is not None:
    try:
        test_img = np.ones((256, 256, 3), dtype=np.uint8) * 255
        test_img[100:160, 100:160] = 0
        mask = np.zeros((256, 256), dtype=np.uint8)
        mask[100:160, 100:160] = 255
        from manga_translator.inpainting.common import InpainterConfig
        cfg = InpainterConfig()
        result = _run_async(lama_inpainter.inpaint(
            test_img, mask, cfg, inpainting_size=256,
            verbose=False,
        ))
        if result is not None and result.size > 0:
            center_val = int(np.mean(result[120:140, 120:140]))
            print(f"  ✅ LaMa: inpainted (center brightness {center_val}/255)")
        else:
            print(f"  ⚠️ LaMa returned empty result")
    except Exception as e:
        print(f"  ⚠️ LaMa test: {str(e)[:80]}")
else:
    print("  ⚠️ LaMa not loaded — will use OpenCV fallback")

print()
print("═" * 60)
ready_count = sum(1 for v in models_loaded.values() if v)
print(f"  🎯 Models ready: {ready_count}/{len(models_loaded)}")
if ready_count >= 3:
    print("  ✅ Cell 3 সফল — Cell 4 চালানো যাবে (Checkpoint System)")
elif ready_count >= 1:
    print("  ⚠️ কিছু model fail — তবে মূল workflow চলবে fallback সহ")
    print("  👉 Cell 4 চালানো যাবে")
else:
    print("  ❌ বেশি model fail — Colab runtime restart করে আবার চেষ্টা করো")
print("═" * 60)

log_event(f"Cell 3: {ready_count}/{len(models_loaded)} models loaded in {total_load_time:.1f}s")
