# ═══════════════════════════════════════════════════════════
# 🔧 CELL 2 — Import, Config & Global Setup (V11)
# ═══════════════════════════════════════════════════════════
# Google Drive mount করবে, সব directory তৈরি করবে,
# CONFIG dict set করবে, Bengali font প্রস্তুত করবে।
# ═══════════════════════════════════════════════════════════

import os
import sys
import json
import uuid
import asyncio
import nest_asyncio
import warnings
from datetime import datetime
from pathlib import Path

warnings.filterwarnings('ignore')
nest_asyncio.apply()

# ── Standard library ──
import numpy as np
import cv2
import pandas as pd
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
import torch

# ── IPython display ──
from IPython.display import display, HTML, Javascript, clear_output
import ipywidgets as widgets
from google.colab import files
from google.colab import drive

print("=" * 60)
print("  🔧 MangaBD V11 — Config & Global Setup")
print("=" * 60)
print()

# ── Mount Google Drive ────────────────────────────────
print("─" * 60)
print("  💾 Mounting Google Drive")
print("─" * 60)

DRIVE_MOUNT = '/content/drive'
DRIVE_DIR = f'{DRIVE_MOUNT}/MyDrive/MangaBD'

if not os.path.exists(DRIVE_MOUNT):
    try:
        drive.mount(DRIVE_MOUNT)
        print(f"  ✅ Drive mounted at {DRIVE_MOUNT}")
    except Exception as e:
        print(f"  ❌ Drive mount failed: {e}")
        print("  ⚠️ Models শুধু Colab session-এ থাকবে (disconnect হলে হারিয়ে যাবে)")
else:
    print(f"  ✅ Drive already mounted")

# ── Directory structure ───────────────────────────────
print()
print("─" * 60)
print("  📁 Creating directory structure")
print("─" * 60)

DIRS = {
    'root': DRIVE_DIR,
    'models': f'{DRIVE_DIR}/models',
    'models_ctd': f'{DRIVE_DIR}/models/ctd',
    'models_baidu': f'{DRIVE_DIR}/models/baidu_ocr',
    'models_qwen': f'{DRIVE_DIR}/models/qwen_vl',
    'models_lama': f'{DRIVE_DIR}/models/lama_large',
    'models_nllb': f'{DRIVE_DIR}/models/nllb',
    'fonts': f'{DRIVE_DIR}/fonts',
    'results': f'{DRIVE_DIR}/results',
    'temp': '/content/temp',
    'mii': '/content/manga-image-translator',
}

for key, path in DIRS.items():
    os.makedirs(path, exist_ok=True)
    print(f"  📂 {key:15s}: {path}")

print()

# ── Bengali fonts ─────────────────────────────────────
print("─" * 60)
print("  🔤 Preparing Bengali fonts")
print("─" * 60)

# Repo-তে দেওয়া font গুলো Drive-এ copy করো
REPO_FONTS = '/content/MangaBD/fonts'  # If user uploaded repo
FALLBACK_FONTS = {
    'NotoSansBengali-Regular.ttf': 'https://github.com/google/fonts/raw/main/ofl/notosansbengali/NotoSansBengali%5Bwdth%2Cwght%5D.ttf',
    'NotoSansBengali-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/notosansbengali/NotoSansBengali%5Bwdth%2Cwght%5D.ttf',
}

# Try local repo first, then Drive, then download
FONT_REGULAR = f"{DIRS['fonts']}/NotoSansBengali-Regular.ttf"
FONT_BOLD = f"{DIRS['fonts']}/NotoSansBengali-Bold.ttf"

# Also check the bundled fonts in this Colab's MangaBD repo (if user cloned)
bundled_regular = None
bundled_bold = None
for candidate in ['/content/MangaBD/fonts/NotoSansBengali-Regular.ttf',
                  '/content/MangaBD/fonts/NotoSansBengali-Bold.ttf']:
    if os.path.exists(candidate):
        if 'Bold' in candidate:
            bundled_bold = candidate
        else:
            bundled_regular = candidate

# Copy bundled fonts to Drive if Drive is empty
if bundled_regular and not os.path.exists(FONT_REGULAR):
    import shutil
    shutil.copy(bundled_regular, FONT_REGULAR)
    print(f"  📋 Copied regular font from bundled repo")
if bundled_bold and not os.path.exists(FONT_BOLD):
    import shutil
    shutil.copy(bundled_bold, FONT_BOLD)
    print(f"  📋 Copied bold font from bundled repo")

# Download from Google Fonts if still missing
def download_font(url, dest):
    """Download a font file with fallback."""
    import urllib.request
    try:
        urllib.request.urlretrieve(url, dest)
        return True
    except Exception as e:
        print(f"  ⚠️ Font download failed: {e}")
        return False

if not os.path.exists(FONT_REGULAR):
    print(f"  ⬇️ Downloading NotoSansBengali-Regular...")
    download_font(FALLBACK_FONTS['NotoSansBengali-Regular.ttf'], FONT_REGULAR)

if not os.path.exists(FONT_BOLD):
    print(f"  ⬇️ Downloading NotoSansBengali-Bold...")
    download_font(FALLBACK_FONTS['NotoSansBengali-Bold.ttf'], FONT_BOLD)

# Verify fonts load
fonts_ok = True
for label, path in [('Regular', FONT_REGULAR), ('Bold', FONT_BOLD)]:
    if os.path.exists(path):
        try:
            f = ImageFont.truetype(path, 24)
            print(f"  ✅ {label} font loaded: {path}")
        except Exception as e:
            print(f"  ❌ {label} font load failed: {e}")
            fonts_ok = False
    else:
        print(f"  ⚠️ {label} font missing: {path}")
        fonts_ok = False

print()

# ── CONFIG dict ───────────────────────────────────────
print("─" * 60)
print("  ⚙️ Setting up CONFIG")
print("─" * 60)

CONFIG = {
    # Version
    'version': '11.0',
    'session_start': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),

    # Paths
    'drive_dir': DRIVE_DIR,
    'models_dir': DIRS['models'],
    'fonts_dir': DIRS['fonts'],
    'results_dir': DIRS['results'],
    'temp_dir': DIRS['temp'],
    'mii_path': DIRS['mii'],
    'checkpoint_file': f'{DRIVE_DIR}/checkpoint_v11.json',

    # Fonts
    'font_regular': FONT_REGULAR,
    'font_bold': FONT_BOLD,

    # Model paths
    'ctd_model_path': f"{DIRS['models_ctd']}/comictextdetector.pt",
    'lama_model_path': f"{DIRS['models_lama']}/inpainting_lama_mpe.ckpt",

    # OCR engine selection
    'ocr_engine': 'baidu',          # 'baidu' | 'qwen'
    'translator_engine': 'manual',  # 'manual' | 'gemini' | 'chatgpt' | 'nllb'

    # API keys (set via os.environ or widgets later)
    'gemini_api_key': os.environ.get('GOOGLE_GEMINI_API_KEY', ''),
    'openai_api_key': os.environ.get('OPENAI_API_KEY', ''),

    # Detection parameters
    'detection_size': 1024,
    'text_threshold': 0.3,
    'box_threshold': 0.6,
    'unclip_ratio': 1.5,

    # OCR parameters
    'ocr_min_confidence': 0.50,
    'ocr_confidence_threshold': 0.65,
    'ocr_min_image_height': 40,  # upscale if smaller

    # Inpainting
    'inpainting_size': 1024,
    'mask_dilate_radius': 6,

    # Rendering
    'font_size_min': 12,
    'font_size_max': 48,
    'font_size_default': 24,
    'text_stroke_width': 2,
    'text_stroke_color': (0, 0, 0),       # black border
    'text_color_bubble': (0, 0, 0),       # black text on white bubble
    'text_color_narrator': (0, 0, 0),
    'text_color_sfx': (255, 255, 255),    # white text on dark SFX
    'text_color_overlay': (255, 255, 255),

    # Region classification thresholds (from V1)
    'white_ratio_bubble': 0.70,
    'white_ratio_thought': 0.50,
    'dotted_border_threshold': 0.015,

    # Input
    'min_image_size': 50,
    'preview_max_width': 800,

    # Translation
    'translation_source_lang': 'en',
    'translation_target_lang': 'bn',
    'batch_size': 4,
}

print(f"  ✅ CONFIG dict তৈরি হয়েছে ({len(CONFIG)} keys)")
print(f"  📍 Drive dir   : {CONFIG['drive_dir']}")
print(f"  📍 Models dir  : {CONFIG['models_dir']}")
print(f"  📍 Fonts dir   : {CONFIG['fonts_dir']}")
print(f"  📍 Results dir : {CONFIG['results_dir']}")
print()

# ── HuggingFace cache to Drive ────────────────────────
print("─" * 60)
print("  🤗 Setting HuggingFace cache to Drive")
print("─" * 60)

os.environ['HF_HOME'] = CONFIG['models_dir']
os.environ['TRANSFORMERS_CACHE'] = f"{CONFIG['models_dir']}/transformers"
os.environ['HF_HUB_CACHE'] = f"{CONFIG['models_dir']}/hub"
os.environ['HF_DATASETS_CACHE'] = f"{CONFIG['models_dir']}/datasets"

# Disable HF telemetry (privacy)
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
os.environ['TOKENIZERS_PARALLELISM'] = 'false'

print(f"  ✅ HF_HOME = {os.environ['HF_HOME']}")
print()

# ── Device selection ──────────────────────────────────
print("─" * 60)
print("  🎯 Device selection")
print("─" * 60)

if torch.cuda.is_available():
    DEVICE = 'cuda'
    print(f"  ✅ Using CUDA: {torch.cuda.get_device_name(0)}")
    print(f"     Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
else:
    DEVICE = 'cpu'
    print("  ⚠️ Using CPU (will be slow — Colab GPU recommended)")

DEVICE_TORCH_DTYPE = torch.float16 if DEVICE == 'cuda' else torch.float32
print()

# ── Async helper (zyddnys functions are async) ────────
print("─" * 60)
print("  ⚡ Async helper for zyddnys")
print("─" * 60)

def _run_async(coro):
    """
    zyddnys-এর async functions চালানোর জন্য helper।
    Colab-এ ইতিমধ্যে event loop চলে (nest_asyncio apply করা)।
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # nest_asyncio apply করা আছে তাই loop.run_until_complete কাজ করবে
            return loop.run_until_complete(coro)
        else:
            return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)

print("  ✅ _run_async() helper তৈরি হয়েছে")
print()

# ── Global state ──────────────────────────────────────
print("─" * 60)
print("  🌐 Initializing global state")
print("─" * 60)

# Session log (list of strings)
session_log = []

# Checkpoint dict (will be populated in Cell 4)
CHECKPOINT = {
    'version': '11.0',
    'session_id': str(uuid.uuid4())[:8],
    'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
    'pages': {},
}

# Model holders (populated in Cell 3)
ctd_detector = None           # ComicTextDetector instance
baidu_ocr = None              # Baidu pipeline
qwen_vl_ocr = None            # Qwen 2.5 VL pipeline
lama_inpainter = None         # LamaLargeInpainter instance
nllb_translator = None        # NLLB translator instance

# Workflow state (populated by later cells)
uploaded_images = {}          # {filename: np.ndarray BGR}
translation_df = None         # pandas DataFrame
inpainted_images = {}         # {filename: np.ndarray BGR}
output_images = {}            # {filename: PIL.Image}
quality_warnings = []         # list of warning dicts
quality_reports = {}          # {filename: list of issue dicts}

# Region tracking
ocr_methods_used = {}         # {'baidu': N, 'qwen': M, 'failed': K}

# Log helper
def log_event(message, level='INFO'):
    """Session log-এ event record করো।"""
    timestamp = datetime.now().strftime('%H:%M:%S')
    entry = f"[{timestamp}] [{level}] {message}"
    session_log.append(entry)
    if level == 'ERROR':
        print(f"  ❌ {message}")
    elif level == 'WARN':
        print(f"  ⚠️ {message}")

print(f"  ✅ Global state initialized")
print(f"     Session ID: {CHECKPOINT['session_id']}")
print()

# ── Self-tests ────────────────────────────────────────
print("─" * 60)
print("  🧪 Self-tests")
print("─" * 60)

tests_pass = 0
tests_total = 0

# Test 1: libraqm (Bengali rendering)
tests_total += 1
try:
    from PIL import features
    if features.check('raqm'):
        # Render a Bengali test string
        test_img = Image.new('RGB', (300, 60), (255, 255, 255))
        draw = ImageDraw.Draw(test_img)
        font = ImageFont.truetype(FONT_REGULAR, 28)
        # "বাংলা" with conjuncts
        draw.text((10, 10), "বাংলা যুক্তাক্ষর পরীক্ষা", font=font, fill=(0,0,0))
        # Verify it actually drew something
        arr = np.array(test_img)
        if arr.min() < 250:  # some dark pixels = text was drawn
            print("  ✅ Test 1: libraqm Bengali rendering")
            tests_pass += 1
        else:
            print("  ❌ Test 1: libraqm installed but text not drawn")
    else:
        print("  ❌ Test 1: libraqm not available")
except Exception as e:
    print(f"  ❌ Test 1: libraqm — {str(e)[:60]}")

# Test 2: _run_async
tests_total += 1
try:
    async def _test_coro():
        await asyncio.sleep(0.001)
        return 42
    result = _run_async(_test_coro())
    if result == 42:
        print("  ✅ Test 2: _run_async helper")
        tests_pass += 1
    else:
        print(f"  ❌ Test 2: _run_async returned {result}")
except Exception as e:
    print(f"  ❌ Test 2: _run_async — {str(e)[:60]}")

# Test 3: Drive write
tests_total += 1
try:
    test_file = f"{DRIVE_DIR}/.v11_test"
    with open(test_file, 'w') as f:
        f.write('ok')
    with open(test_file) as f:
        content = f.read()
    os.remove(test_file)
    if content == 'ok':
        print("  ✅ Test 3: Drive write/read")
        tests_pass += 1
    else:
        print("  ❌ Test 3: Drive write/read mismatch")
except Exception as e:
    print(f"  ❌ Test 3: Drive write — {str(e)[:60]}")

# Test 4: Device
tests_total += 1
try:
    if DEVICE == 'cuda':
        x = torch.zeros(2, 2, device=DEVICE)
        assert x.device.type == 'cuda'
    print(f"  ✅ Test 4: PyTorch on {DEVICE}")
    tests_pass += 1
except Exception as e:
    print(f"  ❌ Test 4: PyTorch device — {str(e)[:60]}")

# Test 5: Font file
tests_total += 1
try:
    f = ImageFont.truetype(FONT_REGULAR, 24)
    f2 = ImageFont.truetype(FONT_BOLD, 24)
    print("  ✅ Test 5: Bengali fonts loadable")
    tests_pass += 1
except Exception as e:
    print(f"  ❌ Test 5: Font load — {str(e)[:60]}")

# Test 6: Manga-image-translator patched imports
tests_total += 1
try:
    sys.path.insert(0, CONFIG['mii_path'])
    from manga_translator.utils import Quadrilateral
    print("  ✅ Test 6: zyddnys utils importable (patched)")
    tests_pass += 1
except Exception as e:
    print(f"  ❌ Test 6: zyddnys import — {str(e)[:60]}")

print()
print("═" * 60)
print(f"  📊 Self-tests: {tests_pass}/{tests_total} passed")
if tests_pass == tests_total:
    print("  ✅ Cell 2 সফল — Cell 3 চালানো যাবে (Model Loading)")
else:
    print("  ⚠️ কিছু test fail — তবে এগোনো যাবে (fallback চালু আছে)")
print("═" * 60)

log_event(f"Cell 2 complete: {tests_pass}/{tests_total} tests passed")
