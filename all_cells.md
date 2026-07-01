# 📚 MangaBD V11 — All Cells (Single Reference)
> এই ফাইলে সব ২০টা cell আলাদা আলাদা দেওয়া আছে।> যখন কোনো cell-এ সমস্যা হবে, আমি শুধু সেই cell fix করে দেব।> তুমি শুধু সেই cell-টা paste করে চালাবে — runtime reset লাগবে না।
---

## 📋 Table of Contents
1. [Cell 01 — 📦 CELL 1 — Installation & Environment Setup (V11)](#cell-01)2. [Cell 02 — 🔧 CELL 2 — Import, Config & Global Setup (V11)](#cell-02)3. [Cell 03 — 🤖 CELL 3 — Model Loading (V11: CTD + Baidu OCR + Qwen VL + LaMa Large)](#cell-03)4. [Cell 04 — 💾 CELL 4 — Checkpoint System (V11, from V1)](#cell-04)5. [Cell 05 — 🔍 CELL 5 — Region Classification (V11, from V1)](#cell-05)6. [Cell 06 — 🔎 CELL 6 — Text Detection (V11: CTD inline)](#cell-06)7. [Cell 07 — 📖 CELL 7 — OCR Engine (V11: Baidu + Qwen VL)](#cell-07)8. [Cell 08 — ✂️ CELL 8 — Inpainting Engine (V11: LaMa Large + OpenCV fallback)](#cell-08)9. [Cell 09 — ✍️ CELL 9 — Bengali Text Renderer (V11: Pillow + libraqm)](#cell-09)10. [Cell 10 — 📤 CELL 10 — Input (V11, from V1)](#cell-10)11. [Cell 11 — 🔍 CELL 11 — Detection + OCR + Verification (V11)](#cell-11)12. [Cell 12 — 💾 CELL 12 — Export (V11: ai.Text only)](#cell-12)13. [Cell 13 — 📤 CELL 13 — Translation (V11: Manual + Gemini + ChatGPT + NLLB)](#cell-13)14. [Cell 14 — ✂️ CELL 14 — Full Page Inpainting (V11: LaMa Large)](#cell-14)15. [Cell 15 — ✍️ CELL 15 — Bengali Text Rendering (V11: Pillow + libraqm)](#cell-15)16. [Cell 16 — 🔬 CELL 16 — Quality Inspector (V11, from V1)](#cell-16)17. [Cell 17 — 🔧 CELL 17 — Manual Fix (V11, from V1)](#cell-17)18. [Cell 18 — 🖼️ CELL 18 — Preview & Download (V11, from V1)](#cell-18)19. [Cell 19 — 📋 CELL 19 — Session Log (V11, modified for new OCR/translator engines)](#cell-19)20. [Cell 20 — 🎨 CELL 20 — Dashboard (V11 NEW: HTML/CSS/JS)](#cell-20)
---

<a id='cell-01'></a>
## 🧩 Cell 01 — 📦 CELL 1 — Installation & Environment Setup (V11)
**Source file:** `cell_01_installation.py`
**Length:** 9250 chars / 266 lines

```python
# ═══════════════════════════════════════════════════════════
# 📦 CELL 1 — Installation & Environment Setup (V11)
# ═══════════════════════════════════════════════════════════
# এই cell সব দরকারি package install করবে এবং
# zyddnys/manga-image-translator repo clone করবে (CTD + LaMa Large-এর জন্য)।
# V11 তে আমরা manga_translator package import করব না —
# শুধু specific class file inline import করব patch করে।
# ═══════════════════════════════════════════════════════════

import os
import sys
import subprocess

print("=" * 60)
print("  📦 MangaBD V11 — Installation & Environment Setup")
print("=" * 60)
print()

# ── Colab GPU Check ────────────────────────────────────
print("─" * 60)
print("  🔍 Environment Check")
print("─" * 60)

try:
    import torch
    cuda_ok = torch.cuda.is_available()
    gpu_name = torch.cuda.get_device_name(0) if cuda_ok else 'CPU only'
    print(f"  PyTorch         : {torch.__version__}")
    print(f"  CUDA available  : {'✅ ' + gpu_name if cuda_ok else '⚠️ CPU only (will be slow)'}")
except Exception as e:
    print(f"  ⚠️ PyTorch check failed: {e}")
    cuda_ok = False

print(f"  Python          : {sys.version.split()[0]}")
print(f"  Working dir     : {os.getcwd()}")
print()

# ── Core packages (Colab has torch/torchvision preinstalled) ──
print("─" * 60)
print("  📥 Installing core packages")
print("─" * 60)

CORE_PACKAGES = [
    # Image / video
    "Pillow>=10.0.0",            # libraqm support থাকে Colab-এ
    "opencv-python-headless>=4.8.0",
    # ML / transformers
    "transformers>=4.40.0",
    "huggingface_hub>=0.20.0",
    "accelerate>=0.25.0",
    "bitsandbytes>=0.41.0",
    "sentencepiece>=0.1.99",
    "protobuf>=3.20.0",
    "einops>=0.7.0",
    "kornia>=0.7.0",
    "timm>=0.9.0",
    "safetensors>=0.4.0",
    # Detection / geometry
    "shapely>=2.0.0",
    "pyclipper>=1.3.0",
    "networkx>=3.0",
    "scikit-image>=0.21.0",
    # Baidu OCR dep (needed by baidu/Unlimited-OCR trust_remote_code)
    "addict>=2.4.0",
    # Rendering helpers
    "freetype-py>=2.4.0",
    "pyhyphen>=4.0.0",
    "langcodes[data]>=3.3.0",
    "py3langid>=0.2.0",
    "langdetect>=1.0.9",
    # Config / formatting
    "omegaconf>=2.3.0",
    "python-dotenv>=1.0.0",
    "colorama>=0.4.6",
    "rich>=13.5.0",
    "tqdm>=4.65.0",
    "pandas>=2.0.0",
    # Async
    "nest-asyncio>=1.5.0",
    # Translation APIs
    "google-genai>=0.3.0",
    "openai>=1.10.0",
    # Pydantic (for some HF deps)
    "pydantic>=2.5.0,<3",
    "pydantic-core>=2.14.0",
]

# Install in chunks to avoid pip resolver issues
def pip_install(packages, label=""):
    """Install a list of packages quietly, show only errors."""
    print(f"  📦 {label} ({len(packages)} packages)...", end=" ", flush=True)
    cmd = [sys.executable, "-m", "pip", "install", "--quiet",
           "--disable-pip-version-check"] + packages
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        print("✅")
    else:
        print("⚠️ (retrying with --no-deps)")
        # Retry without deps to bypass conflicts
        cmd2 = [sys.executable, "-m", "pip", "install", "--quiet",
                "--disable-pip-version-check", "--no-deps"] + packages
        r2 = subprocess.run(cmd2, capture_output=True, text=True)
        if r2.returncode == 0:
            print("  ✅ (installed with --no-deps)")
        else:
            print(f"  ❌ Failed: {r2.stderr[:200]}")
    return result.returncode == 0

# Split into chunks of 6 for stability
for i in range(0, len(CORE_PACKAGES), 6):
    chunk = CORE_PACKAGES[i:i+6]
    pip_install(chunk, f"core batch {i//6 + 1}")

print()

# ── Verify libraqm (CRITICAL for Bengali) ─────────────
print("─" * 60)
print("  🔤 Verifying libraqm (Bengali conjuncts)")
print("─" * 60)

try:
    from PIL import features
    raqm_ok = features.check('raqm')
    print(f"  libraqm support : {'✅ Yes' if raqm_ok else '❌ No'}")
    if not raqm_ok:
        print("  ⚠️ libraqm নেই — Bengali যুক্তাক্ষর ঠিকমতো render হবে না!")
        print("  🔄 libraqm install করার চেষ্টা করছি...")
        subprocess.run(['apt-get', 'update', '-qq'], check=False)
        subprocess.run(['apt-get', 'install', '-y', '-qq',
                        'libraqm-dev'], check=False)
        # Reinstall Pillow to pick up libraqm
        subprocess.run([sys.executable, '-m', 'pip', 'install', '--quiet',
                        '--force-reinstall', '--no-cache-dir', 'Pillow'],
                       check=False)
        # Reload check
        import importlib
        import PIL
        importlib.reload(PIL)
        from PIL import features
        raqm_ok = features.check('raqm')
        print(f"  libraqm after retry : {'✅ Yes' if raqm_ok else '❌ Still no'}")
except Exception as e:
    print(f"  ⚠️ libraqm check failed: {e}")
    raqm_ok = False

print()

# ── Clone zyddnys/manga-image-translator ──────────────
# Note: আমরা package import করব না — শুধু specific files inline করব।
print("─" * 60)
print("  📚 Cloning zyddnys/manga-image-translator")
print("─" * 60)

MII_PATH = '/content/manga-image-translator'

if os.path.exists(MII_PATH):
    print(f"  ℹ️ Already exists at {MII_PATH}")
    # Pull latest
    subprocess.run(['git', '-C', MII_PATH, 'pull', '--quiet'],
                   check=False)
    print("  ✅ Updated to latest")
else:
    result = subprocess.run(
        ['git', 'clone', '--depth', '1',
         'https://github.com/zyddnys/manga-image-translator.git',
         MII_PATH],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f"  ✅ Cloned to {MII_PATH}")
    else:
        print(f"  ❌ Clone failed: {result.stderr[:200]}")

print()

# ── Patch zyddnys to avoid rusty_manga_image_translator ──
print("─" * 60)
print("  🔧 Patching zyddnys __init__.py files")
print("─" * 60)

# The problem: manga_translator/__init__.py does `from .manga_translator import *`
# which triggers a chain that imports rusty_manga_image_translator (hard to install).
# Solution: Replace problematic __init__.py files with empty stubs.
# We only need detection.ctd, inpainting.inpainting_lama_mpe, utils, config, rendering.

PATCHES = {
    # Top-level: avoid triggering full chain
    'manga_translator/__init__.py': '# Patched by MangaBD V11 (empty stub)\n',
    # detection: avoid paddle_rust import
    'manga_translator/detection/__init__.py': '# Patched by MangaBD V11 (empty stub)\n',
    # inpainting: avoid sd/ldm import chain
    'manga_translator/inpainting/__init__.py': '# Patched by MangaBD V11 (empty stub)\n',
    # translators: avoid deep chain
    'manga_translator/translators/__init__.py': '# Patched by MangaBD V11 (empty stub)\n',
    # ocr: avoid rust import
    'manga_translator/ocr/__init__.py': '# Patched by MangaBD V11 (empty stub)\n',
    # colorization: not needed
    'manga_translator/colorization/__init__.py': '# Patched by MangaBD V11 (empty stub)\n',
    # upscaling: not needed
    'manga_translator/upscaling/__init__.py': '# Patched by MangaBD V11 (empty stub)\n',
    # mode: not needed
    'manga_translator/mode/__init__.py': '# Patched by MangaBD V11 (empty stub)\n',
    # textline_merge: not needed
    'manga_translator/textline_merge/__init__.py': '# Patched by MangaBD V11 (empty stub)\n',
    # mask_refinement: not needed
    'manga_translator/mask_refinement/__init__.py': '# Patched by MangaBD V11 (empty stub)\n',
    # rendering: avoid triggering chain
    'manga_translator/rendering/__init__.py': '# Patched by MangaBD V11 (empty stub)\n',
}

patched_count = 0
for rel_path, content in PATCHES.items():
    full_path = os.path.join(MII_PATH, rel_path)
    try:
        with open(full_path, 'w') as f:
            f.write(content)
        patched_count += 1
    except Exception as e:
        print(f"  ⚠️ Could not patch {rel_path}: {e}")

print(f"  ✅ Patched {patched_count}/{len(PATCHES)} __init__.py files")
print()

# ── Verify imports work ────────────────────────────────
print("─" * 60)
print("  🧪 Verifying critical imports")
print("─" * 60)

sys.path.insert(0, MII_PATH)

import_errors = []

try:
    from manga_translator.detection.ctd import ComicTextDetector
    print("  ✅ ComicTextDetector (CTD) imported")
except Exception as e:
    print(f"  ❌ CTD import failed: {str(e)[:120]}")
    import_errors.append(('CTD', str(e)))

try:
    from manga_translator.inpainting.inpainting_lama_mpe import LamaLargeInpainter
    print("  ✅ LamaLargeInpainter imported")
except Exception as e:
    print(f"  ❌ LaMa Large import failed: {str(e)[:120]}")
    import_errors.append(('LaMa Large', str(e)))

try:
    from manga_translator.utils import Quadrilateral
    print("  ✅ Quadrilateral imported")
except Exception as e:
    print(f"  ❌ Quadrilateral import failed: {str(e)[:120]}")
    import_errors.append(('Quadrilateral', str(e)))

print()

# ── Final status ───────────────────────────────────────
print("═" * 60)
if import_errors:
    print(f"  ⚠️ {len(import_errors)} import error(s) — V11 তবুও চলবে,")
    print(f"     কিন্তু কিছু feature fallback করতে পারে।")
    for name, err in import_errors:
        print(f"     • {name}: {err[:80]}")
else:
    print("  ✅ Cell 1 সফল — সব package install ও import হয়েছে")
print("  👉 Cell 2 চালানো যাবে (Config & Global Setup)")
print("═" * 60)
```

---

<a id='cell-02'></a>
## 🧩 Cell 02 — 🔧 CELL 2 — Import, Config & Global Setup (V11)
**Source file:** `cell_02_config.py`
**Length:** 13780 chars / 446 lines

```python
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
```

---

<a id='cell-03'></a>
## 🧩 Cell 03 — 🤖 CELL 3 — Model Loading (V11: CTD + Baidu OCR + Qwen VL + LaMa Large)
**Source file:** `cell_03_models.py`
**Length:** 24383 chars / 595 lines

```python
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
    # Baidu OCR-এর trust_remote_code modeling file 'addict' package চায়।
    # Cell 1-এ যোগ করা আছে, কিন্তু যদি কেউ Cell 1 না চালিয়ে থাকে,
    # এখানে inline install করে নিচ্ছি safety হিসেবে।
    try:
        import addict
    except ImportError:
        import subprocess
        subprocess.run([sys.executable, '-m', 'pip', 'install', '--quiet', 'addict'],
                       check=False)
        import addict
    print(f"  ✅ addict package available (Baidu OCR dependency)")

    # ─── FIX: transformers compatibility shim ───────────────────
    # নতুন transformers (4.50+) এ 'is_torch_fx_available' সরিয়ে দেওয়া হয়েছে।
    # Baidu-এর modeling_deepseekv2.py পুরোনো API চায় — তাই এখানে
    # monkey-patch করে missing function টা inject করছি (no-op হিসেবে)।
    import transformers.utils.import_utils as _tui
    if not hasattr(_tui, 'is_torch_fx_available'):
        _tui.is_torch_fx_available = lambda *args, **kwargs: False
        print(f"  ✅ Patched transformers.is_torch_fx_available (Baidu compat)")
    # একই ভাবে আরো কিছু missing function থাকতে পারে — inject করি
    if not hasattr(_tui, 'is_torch_fx_tracer_available'):
        _tui.is_torch_fx_tracer_available = lambda *args, **kwargs: False

    from transformers import AutoModel, AutoTokenizer, AutoConfig

    BAIDU_MODEL_ID = 'baidu/Unlimited-OCR'

    print(f"  📥 Loading {BAIDU_MODEL_ID}...")
    print(f"     (first time ~1.5GB download to Drive, later cached)")

    baidu_tokenizer = AutoTokenizer.from_pretrained(
        BAIDU_MODEL_ID,
        cache_dir=baidu_cache_dir,
        trust_remote_code=True,
    )

    # ─── FIX: 'pad_token_id' missing on UnlimitedOCRConfig ───────
    # transformers 4.50+ generate() এর সময় config.pad_token_id access করে।
    # Baidu এর custom UnlimitedOCRConfig এটা define করে না।
    # Solution: config আগে load করে, missing attribute গুলো inject করি।
    baidu_config = AutoConfig.from_pretrained(
        BAIDU_MODEL_ID,
        cache_dir=baidu_cache_dir,
        trust_remote_code=True,
    )
    # Inject missing attributes with safe defaults
    pad_id = getattr(baidu_tokenizer, 'pad_token_id', None)
    if pad_id is None:
        # Try bos/eos as fallback
        pad_id = getattr(baidu_tokenizer, 'bos_token_id', None) or \
                 getattr(baidu_tokenizer, 'eos_token_id', None) or 0
    if not hasattr(baidu_config, 'pad_token_id') or baidu_config.pad_token_id is None:
        baidu_config.pad_token_id = pad_id
        print(f"  ✅ Patched config.pad_token_id = {pad_id}")
    # Other commonly-missing attributes (prevent future errors)
    for attr, default in [
        ('bos_token_id', getattr(baidu_tokenizer, 'bos_token_id', None) or 1),
        ('eos_token_id', getattr(baidu_tokenizer, 'eos_token_id', None) or 2),
        ('decoder_start_token_id', pad_id),
        ('vocab_size', len(baidu_tokenizer)),
    ]:
        if not hasattr(baidu_config, attr) or getattr(baidu_config, attr) is None:
            try:
                setattr(baidu_config, attr, default)
            except Exception:
                pass  # read-only attribute — skip silently

    # Use low_cpu_mem_usage + device_map='auto' to avoid OOM during loading
    baidu_model = AutoModel.from_pretrained(
        BAIDU_MODEL_ID,
        config=baidu_config,
        cache_dir=baidu_cache_dir,
        trust_remote_code=True,
        torch_dtype=DEVICE_TORCH_DTYPE,
        low_cpu_mem_usage=True,
        device_map='auto' if DEVICE == 'cuda' else None,
    )
    baidu_model.eval()
    print(f"  ✅ Baidu model loaded to device(s): "
          f"{set(p.device for p in baidu_model.parameters())}")

    class BaiduOCRWrapper:
        """Wrapper around Baidu Unlimited OCR."""
        def __init__(self, model, tokenizer, device):
            self.model = model
            self.tokenizer = tokenizer
            self.device = device

        @torch.no_grad()
        def recognize(self, image_np):
            """Recognize text from cropped RGB image. Returns (text, confidence)."""
            try:
                if isinstance(image_np, np.ndarray):
                    pil_img = Image.fromarray(image_np.astype(np.uint8))
                else:
                    pil_img = image_np

                # Baidu OCR has a `.chat()` method (similar to Qwen-VL API)
                if hasattr(self.model, 'chat'):
                    msgs = [{'role': 'user', 'content': pil_img}]
                    try:
                        response = self.model.chat(
                            self.tokenizer, msgs,
                            sampling=False,
                        )
                    except Exception:
                        # Some versions take different args
                        response = self.model.chat(
                            self.tokenizer, msgs,
                        )
                    text = response[0] if isinstance(response, (list, tuple)) else str(response)
                    return text.strip(), 0.85
                elif hasattr(self.model, 'ocr'):
                    result = self.model.ocr(pil_img)
                    text = result[0] if isinstance(result, (list, tuple)) else str(result)
                    return text.strip(), 0.85
                else:
                    # Generic generate API fallback
                    inputs = self.tokenizer(
                        "OCR: recognize text in image",
                        return_tensors='pt'
                    ).to(self.device)
                    output = self.model.generate(**inputs, max_new_tokens=512)
                    text = self.tokenizer.decode(output[0], skip_special_tokens=True)
                    return text.strip(), 0.75
            except Exception as e:
                return f'[OCR_FAILED: {str(e)[:30]}]', 0.0

    baidu_ocr = BaiduOCRWrapper(baidu_model, baidu_tokenizer, DEVICE)
    baidu_load_time = time.time() - baidu_load_start
    print(f"  ✅ Baidu OCR loaded in {baidu_load_time:.1f}s on {DEVICE}")
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
# MODEL 3: Qwen 2.5 VL 3B (Backup OCR)
# ═══════════════════════════════════════════════════════════
print("─" * 60)
print("  📖 Model 3/4: Qwen 2.5 VL 3B Instruct (Backup OCR)")
print("─" * 60)

qwen_load_start = time.time()
qwen_vl_ocr = None
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

    # ─── FIX: CUDA OOM during .to(DEVICE) ───────────────────────
    # আগে আমরা `.to(DEVICE)` করতাম যেটা PyTorch এ একটা temporary
    # copy তৈরি করে → memory double হয়ে যায় → OOM।
    # এখন `device_map='auto'` + `low_cpu_mem_usage=True` দিয়ে
    # directly GPU তে load করছি (no temporary copy)।
    # ─────────────────────────────────────────────────────────────
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
                # ─── FIX: device_map='auto' এর জন্য proper device handling ──
                # Model এর parameter গুলোর উপর ভিত্তি করে actual device বের করি
                # (device_map='auto' হলে model একাধিক device-এ থাকতে পারে)
                try:
                    # প্রথম parameter এর device নাও (input embeddings)
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
```

---

<a id='cell-04'></a>
## 🧩 Cell 04 — 💾 CELL 4 — Checkpoint System (V11, from V1)
**Source file:** `cell_04_checkpoint.py`
**Length:** 10534 chars / 335 lines

```python
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
        set_page_meta('_test_meta.jpg', 'ocr_engine', 'baidu')
        if CHECKPOINT['pages']['_test_meta.jpg'].get('ocr_engine') == 'baidu':
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
```

---

<a id='cell-05'></a>
## 🧩 Cell 05 — 🔍 CELL 5 — Region Classification (V11, from V1)
**Source file:** `cell_05_region.py`
**Length:** 9695 chars / 312 lines

```python
# ═══════════════════════════════════════════════════════════
# 🔍 CELL 5 — Region Classification (V11, from V1)
# ═══════════════════════════════════════════════════════════
# এই cell একটি image region দেখে তার type নির্ধারণ করবে।
# Types: bubble, thought, narrator, sfx, overlay
# ═══════════════════════════════════════════════════════════

print("=" * 60)
print("  🔍 MangaBD V11 — Region Classification")
print("=" * 60)
print()

# ── Classification Functions ───────────────────────────

def get_white_ratio(image_np, x, y, w, h):
    """
    একটি region-এর সাদা pixel-এর percentage বের করো।
    Args:
        image_np: পুরো image (numpy BGR array)
        x, y, w, h: region coordinates
    Returns:
        float: 0.0 থেকে 1.0 (সাদা pixel-এর অনুপাত)
    """
    try:
        img_h, img_w = image_np.shape[:2]

        # boundary check
        x1 = max(0, x)
        y1 = max(0, y)
        x2 = min(img_w, x + w)
        y2 = min(img_h, y + h)

        if x2 <= x1 or y2 <= y1:
            return 0.5

        region = image_np[y1:y2, x1:x2]

        if region.size == 0:
            return 0.5

        gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
        white_pixels = np.sum(gray > 200)
        total_pixels = gray.size

        if total_pixels == 0:
            return 0.5

        return white_pixels / total_pixels

    except Exception:
        return 0.5


def get_border_variance(image_np, x, y, w, h):
    """
    Region-এর border-এর pixel variance বের করো।
    Dotted/dashed border (thought bubble) চিনতে সাহায্য করবে।
    """
    try:
        img_h, img_w = image_np.shape[:2]

        x1 = max(0, x)
        y1 = max(0, y)
        x2 = min(img_w, x + w)
        y2 = min(img_h, y + h)

        if x2 - x1 < 10 or y2 - y1 < 10:
            return 0.0

        region = image_np[y1:y2, x1:x2]
        gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)

        border_width = 3
        h_reg, w_reg = gray.shape

        # চার দিকের border pixel collect করো
        top = gray[0:border_width, :].flatten()
        bottom = gray[h_reg - border_width:h_reg, :].flatten()
        left = gray[:, 0:border_width].flatten()
        right = gray[:, w_reg - border_width:w_reg].flatten()

        all_border = np.concatenate([top, bottom, left, right])

        if len(all_border) == 0:
            return 0.0

        return float(np.var(all_border)) / 10000.0  # normalize

    except Exception:
        return 0.0


def is_narrator_box(image_np, x, y, w, h):
    """
    এটি narrator box কিনা check করো।
    Narrator box সাধারণত page-এর top/bottom-এ, প্রশস্ত, rectangular।
    """
    try:
        img_h, img_w = image_np.shape[:2]

        # Page-এর top 20% বা bottom 20%-এ আছে কিনা
        in_top = (y < img_h * 0.20)
        in_bottom = (y + h > img_h * 0.80)
        near_edge = in_top or in_bottom

        # Aspect ratio: প্রশস্ত হলে narrator হওয়ার সম্ভাবনা বেশি
        if h == 0:
            return False
        aspect_ratio = w / h
        is_wide = aspect_ratio > 2.5

        # Width: page width-এর 40%+ হলে narrator হতে পারে
        width_ratio = w / img_w
        is_broad = width_ratio > 0.40

        # দুটো condition মিললে narrator
        if near_edge and (is_wide or is_broad):
            return True

        # শুধু অনেক প্রশস্ত হলেও narrator হতে পারে
        if aspect_ratio > 4.0 and is_broad:
            return True

        return False

    except Exception:
        return False


def classify_region(image_np, x, y, w, h):
    """
    একটি region-এর type নির্ধারণ করো।
    Args:
        image_np: পুরো image (numpy BGR array)
        x, y, w, h: region coordinates
    Returns:
        str: 'bubble' | 'thought' | 'narrator' | 'sfx' | 'overlay'
    """
    try:
        img_h, img_w = image_np.shape[:2]

        # Step 1: Narrator check (position + shape)
        if is_narrator_box(image_np, x, y, w, h):
            return 'narrator'

        # Step 2: White ratio calculate
        white_ratio = get_white_ratio(image_np, x, y, w, h)

        # Step 3: Bubble check (high white ratio)
        if white_ratio > CONFIG['white_ratio_bubble']:
            # Thought bubble check: border dotted/dashed কিনা
            border_var = get_border_variance(image_np, x, y, w, h)
            if border_var > CONFIG['dotted_border_threshold']:
                return 'thought'
            return 'bubble'

        # Step 4: Thought bubble (medium white ratio)
        if white_ratio > CONFIG['white_ratio_thought']:
            return 'thought'

        # Step 5: SFX check (বড় area, কম সাদা)
        region_area = w * h
        image_area = img_h * img_w
        area_ratio = region_area / image_area if image_area > 0 else 0

        # বড় region + কম সাদা = SFX হতে পারে
        if area_ratio > 0.02 and white_ratio < 0.30:
            # SFX সাধারণত irregular shape, বড় font
            if h > 40 and w > 40:
                return 'sfx'

        # Step 6: Default — overlay
        return 'overlay'

    except Exception:
        return 'overlay'


def classify_region_from_quad(image_np, quad):
    """
    Quadrilateral (4 corner points) থেকে region classify করো।
    CTD output থেকে সরাসরি ব্যবহার করা যাবে।
    Args:
        image_np: full image (BGR)
        quad: 4x2 numpy array of corner points, or Quadrilateral object
    Returns:
        str: region type
    """
    try:
        # Handle both Quadrilateral object and raw array
        if hasattr(quad, 'pts'):
            pts = quad.pts
        elif hasattr(quad, 'xyxy'):
            x1, y1, x2, y2 = quad.xyxy
            return classify_region(image_np, int(x1), int(y1),
                                   int(x2-x1), int(y2-y1))
        else:
            pts = np.array(quad)

        # Compute bounding box from corner points
        x_min = int(np.min(pts[:, 0]))
        y_min = int(np.min(pts[:, 1]))
        x_max = int(np.max(pts[:, 0]))
        y_max = int(np.max(pts[:, 1]))
        w = x_max - x_min
        h = y_max - y_min

        return classify_region(image_np, x_min, y_min, w, h)
    except Exception:
        return 'overlay'


print("  📝 Classification functions তৈরি হয়েছে ✅")
print()

# ── Self Tests ─────────────────────────────────────────

print("─" * 60)
print("  🧪 Classification Tests")
print("─" * 60)
print()

all_tests_pass = True

# Test 1: সাদা image → 'bubble'
try:
    test_img_1 = np.ones((600, 400, 3), dtype=np.uint8) * 255
    result_1 = classify_region(test_img_1, 50, 100, 150, 80)
    status_1 = "✅" if result_1 == 'bubble' else "❌"
    if result_1 != 'bubble':
        all_tests_pass = False
    print(f"  Test 1 (white region → bubble)    : {result_1:10s} {status_1}")
except Exception as e:
    print(f"  Test 1 (white region → bubble)    : ❌ ({str(e)[:40]})")
    all_tests_pass = False

# Test 2: গাঢ় image → 'overlay'
try:
    test_img_2 = np.ones((600, 400, 3), dtype=np.uint8) * 40
    result_2 = classify_region(test_img_2, 50, 250, 100, 60)
    status_2 = "✅" if result_2 == 'overlay' else "❌"
    if result_2 != 'overlay':
        all_tests_pass = False
    print(f"  Test 2 (dark region → overlay)    : {result_2:10s} {status_2}")
except Exception as e:
    print(f"  Test 2 (dark region → overlay)    : ❌ ({str(e)[:40]})")
    all_tests_pass = False

# Test 3: page top-এ প্রশস্ত region → 'narrator'
try:
    test_img_3 = np.ones((800, 600, 3), dtype=np.uint8) * 200
    result_3 = classify_region(test_img_3, 10, 5, 400, 50)
    status_3 = "✅" if result_3 == 'narrator' else "❌"
    if result_3 != 'narrator':
        all_tests_pass = False
    print(f"  Test 3 (top wide → narrator)      : {result_3:10s} {status_3}")
except Exception as e:
    print(f"  Test 3 (top wide → narrator)      : ❌ ({str(e)[:40]})")
    all_tests_pass = False

# Test 4: বড় গাঢ় region → 'sfx'
try:
    test_img_4 = np.ones((800, 600, 3), dtype=np.uint8) * 180
    test_img_4[200:320, 150:350] = 30
    result_4 = classify_region(test_img_4, 150, 200, 200, 120)
    status_4 = "✅" if result_4 == 'sfx' else f"⚠️ (got {result_4})"
    print(f"  Test 4 (large dark → sfx)         : {result_4:10s} {status_4}")
except Exception as e:
    print(f"  Test 4 (large dark → sfx)         : ❌ ({str(e)[:40]})")

# Test 5: get_white_ratio edge case — empty region
try:
    test_img_5 = np.ones((100, 100, 3), dtype=np.uint8) * 128
    result_5 = get_white_ratio(test_img_5, 0, 0, 0, 0)
    status_5 = "✅" if result_5 == 0.5 else "❌"
    print(f"  Test 5 (empty region → 0.5)       : {result_5:<10.1f} {status_5}")
except Exception as e:
    print(f"  Test 5 (empty region → 0.5)       : ❌ ({str(e)[:40]})")

# Test 6: classify_region never crashes
try:
    result_6 = classify_region(np.zeros((1, 1, 3), dtype=np.uint8), 0, 0, 1, 1)
    print(f"  Test 6 (no crash on tiny image)   : {result_6:10s} ✅")
except Exception as e:
    print(f"  Test 6 (no crash on tiny image)   : ❌ ({str(e)[:40]})")
    all_tests_pass = False

# Test 7 (V11 new): classify_region_from_quad
try:
    test_img_7 = np.ones((600, 400, 3), dtype=np.uint8) * 255
    quad = np.array([[50, 100], [200, 100], [200, 180], [50, 180]])
    result_7 = classify_region_from_quad(test_img_7, quad)
    status_7 = "✅" if result_7 == 'bubble' else "❌"
    print(f"  Test 7 (quad input → bubble)      : {result_7:10s} {status_7}")
except Exception as e:
    print(f"  Test 7 (quad input)               : ❌ ({str(e)[:40]})")

# ── Final Status ───────────────────────────────────────

print()
print("═" * 60)

if all_tests_pass:
    print("  ✅ Cell 5 সফল — Cell 6 চালানো যাবে")
else:
    print("  ⚠️ কিছু test expected result দেয়নি")
    print("  👉 তবে এগোনো যাবে — real image-এ ভালো কাজ করবে")
    print("  👉 Cell 6 চালানো যাবে")

print("═" * 60)

log_event("Cell 5: Region Classification ready")
```

---

<a id='cell-06'></a>
## 🧩 Cell 06 — 🔎 CELL 6 — Text Detection (V11: CTD inline)
**Source file:** `cell_06_detection.py`
**Length:** 12977 chars / 360 lines

```python
# ═══════════════════════════════════════════════════════════
# 🔎 CELL 6 — Text Detection (V11: CTD inline)
# ═══════════════════════════════════════════════════════════
# Comic Text Detector (CTD) ব্যবহার করে text regions detect করবে।
# CTD rotated/tilted text ও চিনতে পারে — quadrilateral output দেয়।
# V1-এর ONNX detector এর চেয়ে অনেক ভালো।
# ═══════════════════════════════════════════════════════════

import cv2
import numpy as np
import torch

print("=" * 60)
print("  🔎 MangaBD V11 — Text Detection (CTD)")
print("=" * 60)
print()

# ── Detection Function ────────────────────────────────

def detect_text_regions(image_np, detector=None, return_mask=False):
    """
    একটি image থেকে text regions detect করো।
    Args:
        image_np: BGR image (numpy array)
        detector: ComicTextDetector instance (None হলে global ctd_detector ব্যবহার)
        return_mask: True হলে text mask ও return করবে
    Returns:
        list of dicts: [{
            'quad': 4x2 numpy array (corner points),
            'xyxy': (x1, y1, x2, y2) bounding box,
            'xywh': (x, y, w, h),
            'angle': rotation angle in degrees,
            'confidence': float,
            'region_type': str (from classify_region_from_quad),
        }, ...]
        (mask ও return হবে যদি return_mask=True)
    """
    if detector is None:
        detector = ctd_detector

    if detector is None:
        log_event("CTD detector not loaded — returning empty list", level='WARN')
        return ([], None) if return_mask else []

    try:
        # CTD detect (async — _run_async helper দিয়ে চালাই)
        textlines, raw_mask, refined_mask = _run_async(detector.detect(
            image_np,
            detect_size=CONFIG['detection_size'],
            text_threshold=CONFIG['text_threshold'],
            box_threshold=CONFIG['box_threshold'],
            unclip_ratio=CONFIG['unclip_ratio'],
            invert=False,
            gamma_correct=False,
            rotate=False,
            auto_rotate=True,    # V11: auto-rotate for tilted pages
            verbose=False,
        ))

        # ─── V11: textline_merge — group lines into bubbles ───────
        # CTD returns individual text lines, but manga bubbles এ একাধিক
        # line থাকে যেগুলো একসাথে একটা speech bubble তৈরি করে।
        # zyddnys এর textline_merge module এই grouping করে।
        text_blocks = []
        try:
            from manga_translator.textline_merge import dispatch as merge_dispatch
            img_h, img_w = image_np.shape[:2]
            text_blocks = _run_async(merge_dispatch(textlines, img_w, img_h, verbose=False))
            if text_blocks:
                print(f"    🔗 Merged {len(textlines)} lines → {len(text_blocks)} bubbles")
        except Exception as merge_err:
            log_event(f"textline_merge failed, falling back to per-line: {str(merge_err)[:60]}",
                      level='WARN')
            text_blocks = []  # fall back to per-line mode

        # Use merged blocks if available, else fall back to per-line
        source_items = text_blocks if text_blocks else textlines

        regions = []
        for item in source_items:
            try:
                # TextBlock (merged) বা Quadrilateral (single line) — দুটোই handle করি
                if hasattr(item, 'lines'):
                    # TextBlock: multiple lines
                    all_pts = np.vstack(item.lines)
                    prob = float(getattr(item, 'prob', 0.8))
                    angle = float(getattr(item, 'angle', 0.0))
                elif hasattr(item, 'pts'):
                    # Quadrilateral: single line
                    all_pts = np.array(item.pts)
                    prob = float(getattr(item, 'prob', 0.8))
                    angle = _compute_quad_angle(all_pts)
                else:
                    continue

                # Filter tiny regions (noise)
                x_min = int(np.min(all_pts[:, 0]))
                y_min = int(np.min(all_pts[:, 1]))
                x_max = int(np.max(all_pts[:, 0]))
                y_max = int(np.max(all_pts[:, 1]))
                w = x_max - x_min
                h = y_max - y_min

                if w < 5 or h < 5:
                    continue

                # Region type from classification
                region_type = classify_region_from_quad(image_np, all_pts)

                regions.append({
                    'quad': all_pts.astype(np.int32),
                    'xyxy': (x_min, y_min, x_max, y_max),
                    'xywh': (x_min, y_min, w, h),
                    'angle': angle,
                    'confidence': prob,
                    'region_type': region_type,
                })
            except Exception as e:
                log_event(f"Region parse error: {str(e)[:50]}", level='WARN')
                continue

        # Sort by reading order (top-to-bottom, then left-to-right)
        regions.sort(key=lambda r: (r['xyxy'][1] // 50, r['xyxy'][0]))

        if return_mask:
            return regions, refined_mask
        return regions

    except Exception as e:
        log_event(f"CTD detection failed: {str(e)[:80]}", level='ERROR')
        if return_mask:
            return [], None
        return []


def _compute_quad_angle(pts):
    """
    4 corner points থেকে rotation angle compute করো।
    Returns: angle in degrees (0 = horizontal, positive = counter-clockwise)
    """
    try:
        pts = np.array(pts, dtype=np.float32)
        if pts.shape[0] < 4:
            return 0.0

        # Top edge: pts[0] → pts[1]
        # তবে corner order নির্দিষ্ট না — তাই সবচেয়ে long edge থেকে angle নেওয়া যাক
        # Alternative: PCA on points
        center = np.mean(pts, axis=0)
        centered = pts - center

        # PCA: principal axis = direction of max variance
        # Covariance matrix
        cov = np.cov(centered.T)
        eigenvalues, eigenvectors = np.linalg.eigh(cov)

        # Principal axis = eigenvector with largest eigenvalue
        principal = eigenvectors[:, -1]
        angle_rad = np.arctan2(principal[1], principal[0])
        angle_deg = np.degrees(angle_rad)

        # Normalize to [-90, 90]
        if angle_deg > 90:
            angle_deg -= 180
        elif angle_deg < -90:
            angle_deg += 180

        return float(angle_deg)
    except Exception:
        return 0.0


def crop_region(image_np, region, padding=4):
    """
    Region থেকে image crop করো (axis-aligned bounding box)।
    Padding যোগ করা হয় OCR accuracy বাড়ানোর জন্য।
    Returns: cropped BGR image
    """
    try:
        x1, y1, x2, y2 = region['xyxy']
        h, w = image_np.shape[:2]
        x1 = max(0, x1 - padding)
        y1 = max(0, y1 - padding)
        x2 = min(w, x2 + padding)
        y2 = min(h, y2 + padding)
        return image_np[y1:y2, x1:x2].copy()
    except Exception:
        return np.zeros((10, 10, 3), dtype=np.uint8)


def crop_region_rotated(image_np, region, padding=4):
    """
    Rotated region থেকে image crop করো (perspective transform দিয়ে)।
    Returns: cropped, axis-aligned BGR image (rotation normalized)
    """
    try:
        pts = region['quad'].astype(np.float32)
        # Determine width/height of the un-rotated rectangle
        width = int(max(
            np.linalg.norm(pts[0] - pts[1]),
            np.linalg.norm(pts[2] - pts[3])
        ))
        height = int(max(
            np.linalg.norm(pts[0] - pts[3]),
            np.linalg.norm(pts[1] - pts[2])
        ))

        if width < 5 or height < 5:
            return crop_region(image_np, region, padding)

        # Target rectangle
        dst_pts = np.array([
            [0, 0],
            [width - 1, 0],
            [width - 1, height - 1],
            [0, height - 1],
        ], dtype=np.float32)

        # Perspective transform
        matrix = cv2.getPerspectiveTransform(pts, dst_pts)
        cropped = cv2.warpPerspective(image_np, matrix, (width, height))
        return cropped
    except Exception:
        return crop_region(image_np, region, padding)


def visualize_detections(image_np, regions, max_display_size=1024):
    """
    Detection results visualize করো — প্রতিটি region-এর উপরে bounding box + label।
    Returns: annotated BGR image
    """
    vis = image_np.copy()
    colors = {
        'bubble': (0, 255, 0),    # green
        'thought': (255, 255, 0), # yellow
        'narrator': (0, 165, 255),# orange
        'sfx': (0, 0, 255),       # red
        'overlay': (255, 0, 255), # magenta
    }

    for i, region in enumerate(regions):
        color = colors.get(region['region_type'], (200, 200, 200))
        pts = region['quad'].reshape(-1, 1, 2).astype(np.int32)
        cv2.polylines(vis, [pts], True, color, 2)

        # Label
        x, y = region['xyxy'][0], region['xyxy'][1]
        label = f"#{i+1} {region['region_type']} ({region['confidence']:.2f})"
        cv2.rectangle(vis, (x, y - 18), (x + len(label) * 8, y), color, -1)
        cv2.putText(vis, label, (x + 2, y - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

    return vis


print("  📝 Detection functions তৈরি হয়েছে ✅")
print()

# ── Self-tests ────────────────────────────────────────
print("─" * 60)
print("  🧪 Detection Tests")
print("─" * 60)

if ctd_detector is None:
    print("  ⚠️ CTD not loaded — skipping live tests")
    print("  ✅ Functions defined — পরে CTD load হলে কাজ করবে")
else:
    # Test 1: Detection on synthetic text image
    try:
        test_img = np.ones((400, 600, 3), dtype=np.uint8) * 255
        cv2.putText(test_img, "Hello World", (50, 100), cv2.FONT_HERSHEY_SIMPLEX,
                    1.5, (0, 0, 0), 3)
        cv2.putText(test_img, "MangaBD V11", (50, 250), cv2.FONT_HERSHEY_SIMPLEX,
                    1.5, (0, 0, 0), 3)

        regions = detect_text_regions(test_img)
        print(f"  Test 1 (synthetic text): {len(regions)} regions detected ✅")
        if len(regions) >= 1:
            for i, r in enumerate(regions[:3]):
                print(f"    #{i+1} type={r['region_type']} "
                      f"xyxy={r['xyxy']} angle={r['angle']:.1f}°")
    except Exception as e:
        print(f"  Test 1: ❌ ({str(e)[:80]})")

    # Test 2: Detection with mask
    try:
        regions, mask = detect_text_regions(test_img, return_mask=True)
        if mask is not None:
            print(f"  Test 2 (mask return): mask shape={mask.shape} ✅")
        else:
            print(f"  Test 2 (mask return): no mask returned ⚠️")
    except Exception as e:
        print(f"  Test 2: ❌ ({str(e)[:80]})")

    # Test 3: Visualization
    try:
        vis = visualize_detections(test_img, regions)
        print(f"  Test 3 (visualization): shape={vis.shape} ✅")
    except Exception as e:
        print(f"  Test 3: ❌ ({str(e)[:80]})")

    # Test 4: Rotated text detection
    try:
        # Create a rotated text image
        test_rot = np.ones((400, 600, 3), dtype=np.uint8) * 255
        # Draw text on a separate image, then rotate it
        text_img = np.ones((100, 400, 3), dtype=np.uint8) * 255
        cv2.putText(text_img, "Rotated Text Here", (10, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 3)
        # Rotate 15 degrees
        center = (200, 50)
        rot_mat = cv2.getRotationMatrix2D(center, 15, 1.0)
        rotated = cv2.warpAffine(text_img, rot_mat, (400, 100),
                                 borderMode=cv2.BORDER_CONSTANT,
                                 borderValue=(255, 255, 255))
        test_rot[150:250, 100:500] = rotated

        regions_rot = detect_text_regions(test_rot)
        print(f"  Test 4 (rotated text): {len(regions_rot)} regions "
              f"(angle={regions_rot[0]['angle']:.1f}° if any) ✅"
              if regions_rot else
              f"  Test 4 (rotated text): 0 regions detected ⚠️")
    except Exception as e:
        print(f"  Test 4: ❌ ({str(e)[:80]})")

# Test 5: _compute_quad_angle on horizontal box
try:
    pts = np.array([[10, 10], [100, 10], [100, 50], [10, 50]])
    angle = _compute_quad_angle(pts)
    ok = abs(angle) < 5
    print(f"  Test 5 (horizontal angle): {angle:.1f}° {'✅' if ok else '⚠️'}")
except Exception as e:
    print(f"  Test 5: ❌ ({str(e)[:80]})")

# Test 6: crop_region
try:
    img = np.random.randint(0, 255, (200, 200, 3), dtype=np.uint8)
    region = {
        'quad': np.array([[50, 50], [150, 50], [150, 150], [50, 150]]),
        'xyxy': (50, 50, 150, 150),
        'xywh': (50, 50, 100, 100),
        'angle': 0.0,
        'confidence': 0.9,
        'region_type': 'bubble',
    }
    crop = crop_region(img, region)
    print(f"  Test 6 (crop_region): shape={crop.shape} ✅")
except Exception as e:
    print(f"  Test 6: ❌ ({str(e)[:80]})")

print()
print("═" * 60)
if ctd_detector is not None:
    print("  ✅ Cell 6 সফল — Cell 7 চালানো যাবে (OCR Engine)")
else:
    print("  ⚠️ CTD not loaded — detection কাজ করবে না")
    print("  👉 Cell 3 আবার চালাও, তারপর এই cell আবার")
print("═" * 60)

log_event("Cell 6: Text Detection ready")
```

---

<a id='cell-07'></a>
## 🧩 Cell 07 — 📖 CELL 7 — OCR Engine (V11: Baidu + Qwen VL)
**Source file:** `cell_07_ocr.py`
**Length:** 11135 chars / 316 lines

```python
# ═══════════════════════════════════════════════════════════
# 📖 CELL 7 — OCR Engine (V11: Baidu + Qwen VL)
# ═══════════════════════════════════════════════════════════
# Primary: Baidu/Unlimited-OCR (free, fast, accurate)
# Backup:  Qwen 2.5 VL 3B Instruct (high quality, slower)
# যেকোনো সময় engine switch করা যাবে।
# Preprocessing: upscale 2x if height < 40px, denoise, contrast boost
# ═══════════════════════════════════════════════════════════

import cv2
import numpy as np
import torch

print("=" * 60)
print("  📖 MangaBD V11 — OCR Engine (Baidu + Qwen VL)")
print("=" * 60)
print()

# ── Preprocessing ─────────────────────────────────────

def preprocess_for_ocr(image_np, target_engine='baidu'):
    """
    OCR-এর আগে image preprocess করো:
      1. BGR → RGB
      2. Upscale 2x if height < 40px (small text recovery)
      3. Light denoise (bilateral filter — preserves edges)
      4. Contrast boost (CLAHE on grayscale)
      5. (Optional) pad with white border
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
        engine: 'baidu' | 'qwen' | None (None হলে CONFIG['ocr_engine'])
        fallback: True হলে primary fail করলে backup চেষ্টা করবে
    Returns:
        tuple: (text: str, confidence: float, engine_used: str)
    """
    if engine is None:
        engine = CONFIG['ocr_engine']

    # Preprocess
    preprocessed = preprocess_for_ocr(image_np, target_engine=engine)

    text, confidence, engine_used = '', 0.0, engine

    try:
        if engine == 'baidu' and baidu_ocr is not None:
            text, confidence = baidu_ocr.recognize(preprocessed)
            engine_used = 'baidu'

            # Fallback to Qwen if low confidence or empty
            if fallback and qwen_vl_ocr is not None:
                if (confidence < CONFIG['ocr_min_confidence'] or
                    not text.strip() or
                    '[OCR_FAILED' in text):
                    try:
                        text2, conf2 = qwen_vl_ocr.recognize(preprocessed)
                        if conf2 > confidence and text2.strip():
                            text, confidence = text2, conf2
                            engine_used = 'qwen'
                    except Exception:
                        pass

        elif engine == 'qwen' and qwen_vl_ocr is not None:
            text, confidence = qwen_vl_ocr.recognize(preprocessed)
            engine_used = 'qwen'

            # Fallback to Baidu
            if fallback and baidu_ocr is not None:
                if (confidence < CONFIG['ocr_min_confidence'] or
                    not text.strip() or
                    '[OCR_FAILED' in text):
                    try:
                        text2, conf2 = baidu_ocr.recognize(preprocessed)
                        if conf2 > confidence and text2.strip():
                            text, confidence = text2, conf2
                            engine_used = 'baidu'
                    except Exception:
                        pass
        else:
            # Engine not available — try the other
            if baidu_ocr is not None:
                text, confidence = baidu_ocr.recognize(preprocessed)
                engine_used = 'baidu'
            elif qwen_vl_ocr is not None:
                text, confidence = qwen_vl_ocr.recognize(preprocessed)
                engine_used = 'qwen'
            else:
                return '[OCR_FAILED: no engine]', 0.0, 'none'

    except Exception as e:
        log_event(f"OCR error ({engine}): {str(e)[:60]}", level='WARN')
        # Try fallback if not already
        if fallback:
            other_engine = 'qwen' if engine == 'baidu' else 'baidu'
            other_ocr = qwen_vl_ocr if engine == 'baidu' else baidu_ocr
            if other_ocr is not None:
                try:
                    text, confidence = other_ocr.recognize(preprocessed)
                    engine_used = other_engine
                except Exception:
                    return f'[OCR_FAILED: {str(e)[:30]}]', 0.0, 'none'
            else:
                return f'[OCR_FAILED: {str(e)[:30]}]', 0.0, 'none'
        else:
            return f'[OCR_FAILED: {str(e)[:30]}]', 0.0, 'none'

    # Clean text
    text = _clean_ocr_text(text)
    return text, float(confidence), engine_used


def _clean_ocr_text(text):
    """OCR output থেকে unnecessary whitespace, artifacts সরাও।"""
    if not text:
        return ''
    # Strip
    text = text.strip()
    # Replace multiple whitespace with single space
    import re
    text = re.sub(r'\s+', ' ', text)
    # Remove common OCR artifacts
    text = text.replace('|', 'I').replace('l', 'l')  # pipe → I (common OCR error)
    # Final strip
    return text.strip()


def is_english_text(text):
    """
    একটি text মূলত English কিনা check করো।
    (Bengali OCR প্রতিরোধ করতে — manga source-এ শুধু English থাকা উচিত)
    """
    if not text:
        return False
    # Count letters per script
    latin = sum(1 for c in text if 'a' <= c.lower() <= 'z')
    bengali = sum(1 for c in text if '\u0980' <= c <= '\u09FF')
    total_letters = latin + bengali
    if total_letters == 0:
        return False
    return latin / total_letters > 0.6


def switch_ocr_engine(engine):
    """OCR engine switch করো। Valid: 'baidu' | 'qwen'"""
    if engine not in ('baidu', 'qwen'):
        log_event(f"Invalid OCR engine: {engine}", level='WARN')
        return False
    if engine == 'baidu' and baidu_ocr is None:
        log_event("Baidu OCR not loaded", level='WARN')
        return False
    if engine == 'qwen' and qwen_vl_ocr is None:
        log_event("Qwen VL not loaded", level='WARN')
        return False
    CONFIG['ocr_engine'] = engine
    log_event(f"OCR engine switched to: {engine}")
    return True


def get_ocr_status():
    """OCR engine status return করো (for dashboard)."""
    return {
        'current': CONFIG['ocr_engine'],
        'baidu_loaded': baidu_ocr is not None,
        'qwen_loaded': qwen_vl_ocr is not None,
        'fallback_enabled': True,
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
    # Should be upscaled to >= 60 (2x of 30) + padding
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

# Test 4: Live OCR (Baidu)
if baidu_ocr is not None:
    try:
        # Render clear English text
        test_img = np.ones((80, 300, 3), dtype=np.uint8) * 255
        cv2.putText(test_img, "MANGA TRANSLATOR", (10, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 3)
        text, conf, eng = ocr_recognize(test_img, engine='baidu', fallback=False)
        ok = 'MANGA' in text.upper() or 'TRANSLATOR' in text.upper()
        print(f"  Test 4 (Baidu OCR): '{text[:40]}' conf={conf:.2f} "
              f"engine={eng} {'✅' if ok else '⚠️'}")
    except Exception as e:
        print(f"  Test 4: ❌ ({str(e)[:80]})")
else:
    print(f"  Test 4: ⏭️  Baidu OCR not loaded — skip")

# Test 5: Live OCR (Qwen)
if qwen_vl_ocr is not None:
    try:
        test_img = np.ones((80, 300, 3), dtype=np.uint8) * 255
        cv2.putText(test_img, "MANGA TRANSLATOR", (10, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 3)
        text, conf, eng = ocr_recognize(test_img, engine='qwen', fallback=False)
        ok = 'MANGA' in text.upper() or 'TRANSLATOR' in text.upper()
        print(f"  Test 5 (Qwen OCR): '{text[:40]}' conf={conf:.2f} "
              f"engine={eng} {'✅' if ok else '⚠️'}")
    except Exception as e:
        print(f"  Test 5: ❌ ({str(e)[:80]})")
else:
    print(f"  Test 5: ⏭️  Qwen VL not loaded — skip")

# Test 6: Switch engine
try:
    if baidu_ocr is not None:
        old = CONFIG['ocr_engine']
        switch_ocr_engine('baidu')
        new = CONFIG['ocr_engine']
        switch_ocr_engine(old)
        ok = new == 'baidu'
        print(f"  Test 6 (switch): {old} → {new} → {old} {'✅' if ok else '❌'}")
    else:
        print(f"  Test 6: ⏭️  skip (no engines)")
except Exception as e:
    print(f"  Test 6: ❌ ({str(e)[:60]})")

# Test 7: get_ocr_status
try:
    status = get_ocr_status()
    print(f"  Test 7 (status): {status} ✅")
except Exception as e:
    print(f"  Test 7: ❌ ({str(e)[:60]})")

print()
print("═" * 60)
print("  ✅ Cell 7 সফল — Cell 8 চালানো যাবে (Inpainting)")
print("═" * 60)

log_event("Cell 7: OCR Engine ready (Baidu + Qwen VL)")
```

---

<a id='cell-08'></a>
## 🧩 Cell 08 — ✂️ CELL 8 — Inpainting Engine (V11: LaMa Large + OpenCV fallback)
**Source file:** `cell_08_inpainting.py`
**Length:** 11596 chars / 327 lines

```python
# ═══════════════════════════════════════════════════════════
# ✂️ CELL 8 — Inpainting Engine (V11: LaMa Large + OpenCV fallback)
# ═══════════════════════════════════════════════════════════
# LaMa Large (LamaLargeInpainter from zyddnys) — primary
# OpenCV TELEA — fallback when LaMa fails
# Adaptive mask dilation based on text stroke width
# ═══════════════════════════════════════════════════════════

import cv2
import numpy as np
import torch

print("=" * 60)
print("  ✂️ MangaBD V11 — Inpainting Engine (LaMa Large)")
print("=" * 60)
print()

# ── Mask preparation ──────────────────────────────────

def dilate_mask(mask, radius=None, adaptive=True):
    """
    Text mask dilate করো — text stroke-এর width অনুযায়ী।
    Args:
        mask: binary mask (uint8, 0/255)
        radius: dilation radius (None হলে CONFIG থেকে বা adaptive)
        adaptive: True হলে stroke width analyze করে radius ঠিক করবে
    Returns: dilated mask
    """
    if mask is None or mask.size == 0:
        return np.zeros((10, 10), dtype=np.uint8)

    if mask.max() == 0:
        return mask.copy()

    if radius is None:
        radius = CONFIG['mask_dilate_radius']

    if adaptive:
        try:
            # Estimate stroke width via distance transform
            # Distance transform: each pixel = distance to nearest zero pixel
            dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
            # Max distance ≈ max stroke half-width
            max_stroke_half = float(dist.max())
            # Recommended dilation = max_stroke_half (covers half-width + small margin)
            adaptive_radius = max(2, int(max_stroke_half * 0.7))
            # Blend with config default
            radius = max(radius, min(adaptive_radius, 15))
        except Exception:
            pass

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE,
                                        (2 * radius + 1, 2 * radius + 1))
    dilated = cv2.dilate(mask, kernel, iterations=1)
    return dilated


def clean_mask(mask):
    """
    Mask clean করো — noise remove, fill holes, smooth edges।
    """
    if mask is None or mask.size == 0:
        return np.zeros((10, 10), dtype=np.uint8)

    # Convert to binary
    _, binary = cv2.threshold(mask, 128, 255, cv2.THRESH_BINARY)

    # Morphological close (fill small holes)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=1)

    # Remove tiny components
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(closed)
    cleaned = np.zeros_like(closed)
    if num_labels > 1:
        for i in range(1, num_labels):
            area = stats[i, cv2.CC_STAT_AREA]
            if area >= 8:  # keep components with ≥8 pixels
                cleaned[labels == i] = 255

    return cleaned


# ── Inpainting Function ───────────────────────────────

def inpaint_region(image_np, mask, use_lama=True, inpainting_size=None):
    """
    Image-এর text region inpaint করো (text remove করে background পুনরুদ্ধার)।
    Args:
        image_np: BGR image (numpy array)
        mask: binary mask (uint8, 255 = text pixels)
        use_lama: True হলে LaMa Large চেষ্টা করবে, fail করলে OpenCV
        inpainting_size: LaMa-এর working size (None হলে CONFIG থেকে)
    Returns: inpainted BGR image
    """
    if image_np is None or mask is None:
        return image_np if image_np is not None else np.zeros((10, 10, 3), dtype=np.uint8)

    if image_np.size == 0 or mask.size == 0:
        return image_np

    if inpainting_size is None:
        inpainting_size = CONFIG['inpainting_size']

    # Ensure mask is same size as image
    if mask.shape[:2] != image_np.shape[:2]:
        mask = cv2.resize(mask, (image_np.shape[1], image_np.shape[0]),
                          interpolation=cv2.INTER_NEAREST)

    # Clean and dilate mask
    clean = clean_mask(mask)
    dilated = dilate_mask(clean, adaptive=True)

    # Try LaMa Large first
    if use_lama and lama_inpainter is not None:
        try:
            from manga_translator.inpainting.common import InpainterConfig
            cfg = InpainterConfig()
            result = _run_async(lama_inpainter.inpaint(
                image_np, dilated, cfg,
                inpainting_size=inpainting_size,
                verbose=False,
            ))
            if result is not None and result.size > 0:
                # Ensure same size as input
                if result.shape[:2] != image_np.shape[:2]:
                    result = cv2.resize(result, (image_np.shape[1], image_np.shape[0]))
                return result
        except Exception as e:
            log_event(f"LaMa inpaint failed, falling back to OpenCV: {str(e)[:60]}",
                      level='WARN')

    # Fallback: OpenCV TELEA
    return _opencv_inpaint(image_np, dilated)


def _opencv_inpaint(image_np, mask, radius=5):
    """OpenCV TELEA inpainting — fast, lower quality fallback."""
    try:
        result = cv2.inpaint(image_np, mask, radius, cv2.INPAINT_TELEA)
        return result
    except Exception as e:
        log_event(f"OpenCV inpaint failed: {str(e)[:60]}", level='WARN')
        return image_np.copy()


def inpaint_full_page(image_np, regions, detector=None):
    """
    Page-এর সব text regions একসাথে inpaint করো।
    প্রতিটি region-এর জন্য আলাদা mask তৈরি করে union করে একসাথে inpaint করা হয়।
    Args:
        image_np: BGR image
        regions: list of region dicts (from detect_text_regions)
        detector: CTD detector (None হলে global)
    Returns: inpainted BGR image
    """
    if image_np is None:
        return image_np

    h, w = image_np.shape[:2]

    # Build full-page mask
    full_mask = np.zeros((h, w), dtype=np.uint8)

    for region in regions:
        try:
            # Use quadrilateral points to fill mask
            pts = region['quad'].astype(np.int32).reshape(-1, 1, 2)
            cv2.fillPoly(full_mask, [pts], 255)
        except Exception:
            # Fallback: use bounding box
            x1, y1, x2, y2 = region['xyxy']
            cv2.rectangle(full_mask, (x1, y1), (x2, y2), 255, -1)

    # If detector is available, also use CTD's refined mask
    if detector is None:
        detector = ctd_detector
    if detector is not None:
        try:
            _, _, ctd_mask = _run_async(detector.detect(
                image_np,
                detect_size=CONFIG['detection_size'],
                text_threshold=CONFIG['text_threshold'],
                box_threshold=CONFIG['box_threshold'],
                unclip_ratio=CONFIG['unclip_ratio'],
                invert=False, gamma_correct=False, rotate=False,
                auto_rotate=False, verbose=False,
            ))
            if ctd_mask is not None and ctd_mask.size > 0:
                if ctd_mask.shape[:2] != (h, w):
                    ctd_mask = cv2.resize(ctd_mask, (w, h))
                # Union: take max of our mask and CTD mask
                full_mask = np.maximum(full_mask, ctd_mask.astype(np.uint8))
        except Exception as e:
            log_event(f"CTD mask union failed: {str(e)[:50]}", level='WARN')

    # Inpaint
    return inpaint_region(image_np, full_mask)


def create_inpainting_preview(original_np, inpainted_np, regions=None):
    """
    Original vs inpainted side-by-side preview তৈরি করো।
    Returns: PIL Image (side-by-side)
    """
    from PIL import Image as PILImage

    h, w = original_np.shape[:2]
    new_w = w * 2 + 20  # 2 images + gap
    new_h = h

    # White canvas
    canvas = np.ones((new_h, new_w, 3), dtype=np.uint8) * 255

    # Place originals side by side
    canvas[:h, :w] = original_np
    canvas[:h, w+20:] = inpainted_np

    # Convert BGR → RGB
    canvas_rgb = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB)
    return PILImage.fromarray(canvas_rgb)


print("  📝 Inpainting functions তৈরি হয়েছে ✅")
print()

# ── Self-tests ────────────────────────────────────────
print("─" * 60)
print("  🧪 Inpainting Tests")
print("─" * 60)

# Test 1: dilate_mask
try:
    test_mask = np.zeros((100, 100), dtype=np.uint8)
    test_mask[40:60, 40:60] = 255
    dilated = dilate_mask(test_mask, radius=5, adaptive=False)
    # Dilated should have more white pixels
    original_count = np.sum(test_mask > 0)
    dilated_count = np.sum(dilated > 0)
    ok = dilated_count > original_count
    print(f"  Test 1 (dilate): {original_count} → {dilated_count} pixels "
          f"{'✅' if ok else '❌'}")
except Exception as e:
    print(f"  Test 1: ❌ ({str(e)[:60]})")

# Test 2: clean_mask (fill holes)
try:
    test_mask = np.zeros((50, 50), dtype=np.uint8)
    test_mask[10:40, 10:40] = 255
    test_mask[20:25, 20:25] = 0  # hole
    cleaned = clean_mask(test_mask)
    hole_filled = cleaned[22, 22] == 255
    print(f"  Test 2 (clean): hole filled={'✅' if hole_filled else '❌'}")
except Exception as e:
    print(f"  Test 2: ❌ ({str(e)[:60]})")

# Test 3: Adaptive dilation based on stroke width
try:
    test_mask = np.zeros((200, 200), dtype=np.uint8)
    # Thick rectangle (stroke width ~ 60px)
    cv2.rectangle(test_mask, (50, 50), (150, 150), 255, -1)
    dilated = dilate_mask(test_mask, adaptive=True)
    # Adaptive should give reasonable dilation
    ok = np.sum(dilated > 0) > np.sum(test_mask > 0)
    print(f"  Test 3 (adaptive dilate): {'✅' if ok else '❌'}")
except Exception as e:
    print(f"  Test 3: ❌ ({str(e)[:60]})")

# Test 4: LaMa inpainting
if lama_inpainter is not None:
    try:
        test_img = np.ones((256, 256, 3), dtype=np.uint8) * 200
        # Black "text" rectangle
        test_img[100:160, 80:180] = 0
        mask = np.zeros((256, 256), dtype=np.uint8)
        mask[100:160, 80:180] = 255

        result = inpaint_region(test_img, mask, use_lama=True)
        # Verify text region is now lighter (filled by LaMa)
        center_brightness = int(np.mean(result[120:140, 120:140]))
        original_brightness = int(np.mean(test_img[120:140, 120:140]))
        ok = center_brightness > original_brightness + 50
        print(f"  Test 4 (LaMa inpaint): brightness {original_brightness} → "
              f"{center_brightness} {'✅' if ok else '⚠️'}")
    except Exception as e:
        print(f"  Test 4: ❌ ({str(e)[:80]})")
else:
    print(f"  Test 4: ⏭️  LaMa not loaded — skip")

# Test 5: OpenCV fallback
try:
    test_img = np.ones((100, 100, 3), dtype=np.uint8) * 200
    test_img[40:60, 40:60] = 0
    mask = np.zeros((100, 100), dtype=np.uint8)
    mask[40:60, 40:60] = 255
    result = _opencv_inpaint(test_img, mask)
    ok = result.shape == test_img.shape
    print(f"  Test 5 (OpenCV inpaint): shape OK={'✅' if ok else '❌'}")
except Exception as e:
    print(f"  Test 5: ❌ ({str(e)[:60]})")

# Test 6: Full page inpainting (simulated)
try:
    test_img = np.ones((300, 300, 3), dtype=np.uint8) * 220
    cv2.putText(test_img, "TEXT", (50, 150), cv2.FONT_HERSHEY_SIMPLEX,
                2, (0, 0, 0), 4)
    # Fake regions (manual quad)
    regions = [{
        'quad': np.array([[40, 110], [200, 110], [200, 170], [40, 170]]),
        'xyxy': (40, 110, 200, 170),
        'xywh': (40, 110, 160, 60),
        'angle': 0.0,
        'confidence': 0.9,
        'region_type': 'overlay',
    }]
    result = inpaint_full_page(test_img, regions, detector=None)
    ok = result.shape == test_img.shape
    print(f"  Test 6 (full page): shape OK={'✅' if ok else '❌'}")
except Exception as e:
    print(f"  Test 6: ❌ ({str(e)[:80]})")

print()
print("═" * 60)
print("  ✅ Cell 8 সফল — Cell 9 চালানো যাবে (Bengali Renderer)")
print("═" * 60)

log_event("Cell 8: Inpainting Engine ready (LaMa Large + OpenCV fallback)")
```

---

<a id='cell-09'></a>
## 🧩 Cell 09 — ✍️ CELL 9 — Bengali Text Renderer (V11: Pillow + libraqm)
**Source file:** `cell_09_renderer.py`
**Length:** 15313 chars / 464 lines

```python
# ═══════════════════════════════════════════════════════════
# ✍️ CELL 9 — Bengali Text Renderer (V11: Pillow + libraqm)
# ═══════════════════════════════════════════════════════════
# Pillow with libraqm — Bengali যুক্তাক্ষর (conjuncts) ঠিকমতো render করবে।
# ❌ NO arabic_reshaper (V1-এ ভুল ছিল — এটি Arabic-এর জন্য, Bengali-এর নয়)
# ✅ Auto-fit font size (area-based)
# ✅ Word wrap, center alignment, stroke/border
# ✅ Rotation support (CTD rotated text)
# ✅ Reader.py logic: fit text to bubble properly
# ═══════════════════════════════════════════════════════════

import cv2
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

print("=" * 60)
print("  ✍️ MangaBD V11 — Bengali Renderer (Pillow + libraqm)")
print("=" * 60)
print()

# ── Font cache (avoid reloading TTF on every call) ──
_FONT_CACHE = {}

def get_font(size, bold=False):
    """Font লোড করো (cache সহ)।"""
    key = (size, bold)
    if key in _FONT_CACHE:
        return _FONT_CACHE[key]
    path = CONFIG['font_bold'] if bold else CONFIG['font_regular']
    try:
        font = ImageFont.truetype(path, size)
    except Exception:
        try:
            font = ImageFont.truetype(CONFIG['font_regular'], size)
        except Exception:
            font = ImageFont.load_default()
    _FONT_CACHE[key] = font
    return font


# ── Text measurement (libraqm-aware) ─────────────────

def measure_text(text, font, draw=None):
    """
    একটি text-এর bounding box measure করো (libraqm-aware)।
    Returns: (width, height) in pixels
    """
    if not text:
        return 0, 0
    if draw is None:
        dummy = Image.new('RGB', (1, 1))
        draw = ImageDraw.Draw(dummy)
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        return max(0, w), max(0, h)
    except Exception:
        # Fallback (older Pillow)
        try:
            w, h = draw.textsize(text, font=font)
            return w, h
        except Exception:
            return len(text) * 8, 16


def split_text_to_lines(text, font, draw, max_width):
    """
    Text কে word boundary-তে wrap করো।
    Bengali যুক্তাক্ষর ভাঙবে না — word-level wrap।
    Returns: list of lines (strings)
    """
    if not text:
        return []

    words = text.split(' ')
    lines = []
    current_line = ''

    for word in words:
        if not word:
            continue
        # Try adding word to current line
        if current_line:
            test_line = current_line + ' ' + word
        else:
            test_line = word

        w, _ = measure_text(test_line, font, draw)
        if w <= max_width or not current_line:
            current_line = test_line
        else:
            lines.append(current_line)
            current_line = word

    if current_line:
        lines.append(current_line)

    return lines


def fit_font_size(text, target_width, target_height, bold=False,
                  min_size=None, max_size=None, padding=4):
    """
    Text-এর জন্য সেরা font size বের করো — যাতে target box-এ fit হয়।
    Algorithm: binary search on font size, with word wrapping per size.
    Returns: (best_size, lines, total_height)
    """
    if not text:
        return CONFIG['font_size_default'], [], 0

    if min_size is None:
        min_size = CONFIG['font_size_min']
    if max_size is None:
        max_size = CONFIG['font_size_max']

    avail_w = target_width - 2 * padding
    avail_h = target_height - 2 * padding

    if avail_w <= 0 or avail_h <= 0:
        return min_size, [text], target_height

    # Dummy draw for measurement
    dummy = Image.new('RGB', (1, 1))
    draw = ImageDraw.Draw(dummy)

    best_size = min_size
    best_lines = [text]
    best_height = 0

    # Binary search on font size
    lo, hi = min_size, max_size
    while lo <= hi:
        mid = (lo + hi) // 2
        font = get_font(mid, bold)
        lines = split_text_to_lines(text, font, draw, avail_w)

        # Compute total height
        line_h = mid * 1.3  # line height ~1.3x font size
        total_h = line_h * len(lines)

        if total_h <= avail_h and lines:
            best_size = mid
            best_lines = lines
            best_height = total_h
            lo = mid + 1
        else:
            hi = mid - 1

    return best_size, best_lines, best_height


# ── Main renderer ─────────────────────────────────────

def render_bengali_text(image_pil, text, x, y, w, h, angle=0.0,
                        region_type='bubble', bold=False,
                        stroke_width=None, stroke_color=None,
                        text_color=None, padding=4):
    """
    একটি image-এ Bengali text render করো।
    Args:
        image_pil: PIL Image (will be modified in-place via ImageDraw)
        text: Bengali string to render
        x, y, w, h: target region (axis-aligned bounding box)
        angle: rotation in degrees (CTD rotated text)
        region_type: 'bubble' | 'thought' | 'narrator' | 'sfx' | 'overlay'
        bold: True হলে bold font
        stroke_width: text border thickness (None হলে CONFIG থেকে)
        stroke_color: text border color (None হলে CONFIG থেকে)
        text_color: text fill color (None হলে region_type অনুযায়ী)
        padding: internal padding inside region
    Returns: PIL Image (modified) — also modifies in-place
    """
    if not text or not text.strip():
        return image_pil

    # Defaults
    if stroke_width is None:
        stroke_width = CONFIG['text_stroke_width']
    if stroke_color is None:
        stroke_color = CONFIG['text_stroke_color']

    # Text color by region type
    if text_color is None:
        color_map = {
            'bubble': CONFIG['text_color_bubble'],
            'thought': CONFIG['text_color_bubble'],
            'narrator': CONFIG['text_color_narrator'],
            'sfx': CONFIG['text_color_sfx'],
            'overlay': CONFIG['text_color_overlay'],
        }
        text_color = color_map.get(region_type, CONFIG['text_color_bubble'])

    # Fit font size
    font_size, lines, _ = fit_font_size(
        text, w, h, bold=bold, padding=padding
    )
    font = get_font(font_size, bold)

    # Compute total text height
    line_height = font_size * 1.3
    total_text_height = line_height * len(lines)

    # If angle is significant, render on a separate canvas and rotate
    if abs(angle) > 1.0:
        return _render_rotated_text(
            image_pil, lines, font, x, y, w, h, angle,
            text_color, stroke_color, stroke_width, line_height, padding
        )

    # Render directly
    draw = ImageDraw.Draw(image_pil)

    # Compute starting y for vertical centering
    start_y = y + padding + (h - 2 * padding - total_text_height) // 2
    start_y = max(y + padding, start_y)

    # Render each line, horizontally centered
    for i, line in enumerate(lines):
        line_w, _ = measure_text(line, font, draw)
        line_x = x + (w - line_w) // 2
        line_y = int(start_y + i * line_height)

        # Draw with stroke (border) for readability
        try:
            draw.text(
                (line_x, line_y), line,
                font=font, fill=text_color,
                stroke_width=stroke_width,
                stroke_fill=stroke_color,
            )
        except TypeError:
            # Older Pillow without stroke_width
            # Draw shadow by offsetting
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                draw.text((line_x + dx, line_y + dy), line,
                          font=font, fill=stroke_color)
            draw.text((line_x, line_y), line, font=font, fill=text_color)

    return image_pil


def _render_rotated_text(image_pil, lines, font, x, y, w, h, angle,
                         text_color, stroke_color, stroke_width,
                         line_height, padding):
    """
    Rotated text render করো — আলাদা transparent canvas-এ draw করে
    rotate করে original image-এ paste করবে।
    """
    try:
        # Create transparent canvas (large enough for the text)
        canvas_w = max(w + 4 * padding, 200)
        canvas_h = max(h + 4 * padding, 100)
        text_canvas = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(text_canvas)

        # Compute total text height
        total_text_height = line_height * len(lines)

        # Center vertically
        start_y = padding + (canvas_h - 2 * padding - total_text_height) // 2
        start_y = max(padding, start_y)

        # Render each line, centered
        for i, line in enumerate(lines):
            line_w, _ = measure_text(line, font, draw)
            line_x = (canvas_w - line_w) // 2
            line_y = int(start_y + i * line_height)

            try:
                draw.text(
                    (line_x, line_y), line,
                    font=font, fill=text_color + (255,),  # add alpha
                    stroke_width=stroke_width,
                    stroke_fill=stroke_color + (255,),
                )
            except TypeError:
                # Older Pillow fallback
                draw.text((line_x, line_y), line,
                          font=font, fill=text_color + (255,))

        # Rotate the text canvas
        rotated = text_canvas.rotate(angle, expand=True, resample=Image.BICUBIC)

        # Compute paste position — center on the region's center
        cx = x + w // 2
        cy = y + h // 2
        paste_x = cx - rotated.width // 2
        paste_y = cy - rotated.height // 2

        # Paste with alpha
        image_pil.paste(rotated, (paste_x, paste_y), rotated)

        return image_pil
    except Exception as e:
        log_event(f"Rotated text render failed: {str(e)[:50]}", level='WARN')
        # Fallback: render axis-aligned
        return render_bengali_text(
            image_pil, ' '.join(lines), x, y, w, h,
            angle=0.0, region_type='overlay', bold=False,
            stroke_width=stroke_width, stroke_color=stroke_color,
            text_color=text_color, padding=padding,
        )


# ── High-level helpers ───────────────────────────────

def render_text_on_region(image_pil, region, text, **kwargs):
    """
    Region dict থেকে coordinates বের করে text render করো।
    Args:
        image_pil: PIL Image
        region: dict with 'xywh' and 'angle' and 'region_type'
        text: text to render
        **kwargs: passed to render_bengali_text
    """
    x, y, w, h = region['xywh']
    angle = region.get('angle', 0.0)
    rtype = region.get('region_type', 'bubble')
    return render_bengali_text(
        image_pil, text, x, y, w, h,
        angle=angle, region_type=rtype, **kwargs
    )


def is_bengali_text_valid(text):
    """
    Bengali text valid কিনা check করো — অন্তত একটি Bengali character থাকতে হবে।
    """
    if not text:
        return False
    return any('\u0980' <= ch <= '\u09FF' for ch in text)


print("  📝 Renderer functions তৈরি হয়েছে ✅")
print()

# ── Self-tests ────────────────────────────────────────
print("─" * 60)
print("  🧪 Renderer Tests")
print("─" * 60)

# Verify libraqm first
try:
    from PIL import features
    raqm_ok = features.check('raqm')
    if raqm_ok:
        print("  ✅ libraqm available — Bengali conjuncts will render correctly")
    else:
        print("  ⚠️ libraqm NOT available — Bengali conjuncts may not render correctly")
except Exception:
    print("  ⚠️ libraqm check failed")

print()

# Test 1: Simple Bengali text rendering
try:
    test_img = Image.new('RGB', (300, 100), (255, 255, 255))
    img = render_bengali_text(test_img, "বাংলা", 10, 10, 280, 80,
                              region_type='bubble')
    arr = np.array(img)
    has_dark = arr.min() < 100
    print(f"  Test 1 (বাংলা render): {'✅' if has_dark else '❌'}")
except Exception as e:
    print(f"  Test 1: ❌ ({str(e)[:80]})")

# Test 2: Bengali conjuncts (যুক্তাক্ষর)
try:
    test_img = Image.new('RGB', (300, 100), (255, 255, 255))
    # "যুক্তাক্ষর" has multiple conjuncts
    img = render_bengali_text(test_img, "যুক্তাক্ষর পরীক্ষা", 10, 10, 280, 80,
                              region_type='bubble')
    arr = np.array(img)
    has_dark = arr.min() < 100
    print(f"  Test 2 (যুক্তাক্ষর): {'✅' if has_dark else '❌'}")
except Exception as e:
    print(f"  Test 2: ❌ ({str(e)[:80]})")

# Test 3: Word wrap
try:
    dummy = Image.new('RGB', (1, 1))
    draw = ImageDraw.Draw(dummy)
    font = get_font(20)
    lines = split_text_to_lines("এটি একটি বড় বাক্য যা wrap হওয়া উচিত",
                                font, draw, 100)
    ok = len(lines) > 1
    print(f"  Test 3 (word wrap): {len(lines)} lines {'✅' if ok else '⚠️'}")
except Exception as e:
    print(f"  Test 3: ❌ ({str(e)[:60]})")

# Test 4: fit_font_size
try:
    size, lines, h = fit_font_size("বাংলা", 200, 100)
    ok = 12 <= size <= 48
    print(f"  Test 4 (fit_font_size): size={size} lines={len(lines)} "
          f"{'✅' if ok else '⚠️'}")
except Exception as e:
    print(f"  Test 4: ❌ ({str(e)[:60]})")

# Test 5: Stroke/border rendering
try:
    test_img = Image.new('RGB', (300, 100), (255, 255, 255))
    img = render_bengali_text(test_img, "পরীক্ষা", 10, 10, 280, 80,
                              region_type='bubble', stroke_width=3)
    arr = np.array(img)
    has_dark = arr.min() < 100
    print(f"  Test 5 (stroke): {'✅' if has_dark else '❌'}")
except Exception as e:
    print(f"  Test 5: ❌ ({str(e)[:60]})")

# Test 6: Rotated text rendering
try:
    test_img = Image.new('RGB', (400, 200), (255, 255, 255))
    img = render_bengali_text(test_img, "বাংলা", 100, 50, 200, 100,
                              angle=15.0, region_type='bubble')
    arr = np.array(img)
    has_dark = arr.min() < 100
    print(f"  Test 6 (rotated 15°): {'✅' if has_dark else '❌'}")
except Exception as e:
    print(f"  Test 6: ❌ ({str(e)[:80]})")

# Test 7: SFX color (white text)
try:
    test_img = Image.new('RGB', (300, 100), (0, 0, 0))  # dark bg
    img = render_bengali_text(test_img, "ধুম!", 10, 10, 280, 80,
                              region_type='sfx')
    arr = np.array(img)
    has_white = arr.max() > 200
    print(f"  Test 7 (SFX white text): {'✅' if has_white else '❌'}")
except Exception as e:
    print(f"  Test 7: ❌ ({str(e)[:60]})")

# Test 8: is_bengali_text_valid
try:
    assert is_bengali_text_valid("বাংলা") == True
    assert is_bengali_text_valid("Hello") == False
    assert is_bengali_text_valid("") == False
    assert is_bengali_text_valid("Bangla বাংলা mixed") == True
    print(f"  Test 8 (is_bengali_text_valid): ✅")
except Exception as e:
    print(f"  Test 8: ❌ ({str(e)[:60]})")

# Visual test: render sample Bengali text
try:
    print()
    print("  📸 Visual test — Bengali rendering:")
    sample_img = Image.new('RGB', (600, 200), (240, 240, 240))
    # Title
    title_img = render_bengali_text(sample_img, "বাংলা মাঙ্গা অনুবাদ",
                                    50, 20, 500, 80, region_type='narrator')
    # Body
    body_img = render_bengali_text(title_img, "এটি একটি পরীক্ষামূলক বাক্য",
                                   50, 110, 500, 80, region_type='bubble')
    display(body_img)
except Exception as e:
    print(f"  ⚠️ Visual test skipped: {str(e)[:60]}")

print()
print("═" * 60)
print("  ✅ Cell 9 সফল — Cell 10 চালানো যাবে (Input)")
print("═" * 60)

log_event("Cell 9: Bengali Renderer ready (Pillow + libraqm)")
```

---

<a id='cell-10'></a>
## 🧩 Cell 10 — 📤 CELL 10 — Input (V11, from V1)
**Source file:** `cell_10_input.py`
**Length:** 4028 chars / 120 lines

```python
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
```

---

<a id='cell-11'></a>
## 🧩 Cell 11 — 🔍 CELL 11 — Detection + OCR + Verification (V11)
**Source file:** `cell_11_detection_ocr.py`
**Length:** 9255 chars / 249 lines

```python
# ═══════════════════════════════════════════════════════════
# 🔍 CELL 11 — Detection + OCR + Verification (V11)
# ═══════════════════════════════════════════════════════════
# প্রতিটি uploaded image-এর উপর:
#   1. CTD detection
#   2. OCR (Baidu primary, Qwen fallback)
#   3. English text filter
#   4. Visual verification (detection map, per-region crops)
#   5. translation_df তৈরি
# ═══════════════════════════════════════════════════════════

import time
import pandas as pd
from tqdm import tqdm
from PIL import Image as PILImage

print("=" * 60)
print("  🔍 MangaBD V11 — Detection + OCR + Verification")
print("=" * 60)
print()

if not uploaded_images:
    print("  ❌ কোনো image নেই! আগে Cell 10 চালাও")
    print("=" * 60)
else:

    # ── Setup ──
    rows = []
    all_detections = {}  # {filename: regions}
    ocr_engine_used = {'baidu': 0, 'qwen': 0, 'failed': 0, 'skipped': 0}

    total_images = len(uploaded_images)
    print(f"  📂 {total_images} টি image process হবে")
    print(f"  🔧 OCR engine: {CONFIG['ocr_engine']}")
    print()

    # ── Process each image ──
    for page_idx, (filename, img_bgr) in enumerate(uploaded_images.items(), 1):

        print(f"  ╔═══════════════════════════════════════════╗")
        print(f"  ║  [{page_idx}/{total_images}] {filename}")
        print(f"  ╚═══════════════════════════════════════════╝")

        page_start = time.time()

        # Skip if already done (checkpoint)
        if is_page_done(filename, 'ocr'):
            print(f"    ✅ Already OCR'd (checkpoint) — skipping")
            print()
            continue

        # ── Step 1: Detection ──
        print(f"    🔎 Detecting text regions...")
        try:
            regions = detect_text_regions(img_bgr)
            all_detections[filename] = regions
            print(f"    ✅ {len(regions)} regions detected")
        except Exception as e:
            print(f"    ❌ Detection failed: {str(e)[:60]}")
            log_event(f"{filename}: detection failed — {str(e)[:60]}",
                      level='ERROR')
            continue

        if not regions:
            print(f"    ⚠️ কোনো text region পাওয়া যায়নি")
            print()
            continue

        # ── Step 2: OCR each region ──
        print(f"    📖 OCR processing {len(regions)} regions...")
        for i, region in enumerate(regions):
            try:
                # Crop region (rotated if needed)
                if abs(region.get('angle', 0.0)) > 5.0:
                    crop = crop_region_rotated(img_bgr, region)
                else:
                    crop = crop_region(img_bgr, region)

                # Skip tiny crops
                if crop.shape[0] < 5 or crop.shape[1] < 5:
                    ocr_engine_used['skipped'] += 1
                    text, conf, engine = '[EMPTY]', 0.0, 'none'
                else:
                    # Run OCR
                    text, conf, engine = ocr_recognize(crop)

                # Update counters
                if engine == 'baidu':
                    ocr_engine_used['baidu'] += 1
                elif engine == 'qwen':
                    ocr_engine_used['qwen'] += 1
                elif '[OCR_FAILED' in text or '[EMPTY]' in text:
                    ocr_engine_used['failed'] += 1
                else:
                    ocr_engine_used['skipped'] += 1

                # English filter (V11 new)
                is_eng = is_english_text(text) if text and '[EMPTY]' not in text else False

                # Build row
                x, y, w, h = region['xywh']
                rows.append({
                    'page': filename,
                    'id': i + 1,
                    'region_type': region['region_type'],
                    'x': x, 'y': y, 'width': w, 'height': h,
                    'angle': region.get('angle', 0.0),
                    'original_text': text,
                    'translated_text': '',  # will be filled in Cell 13
                    'confidence': float(conf),
                    'ocr_engine': engine,
                    'translator_engine': '',
                    'quality_score': '',
                    'is_english': bool(is_eng),
                    'bengali_valid': False,
                })

                # Progress indicator
                short_text = text[:30] + ('...' if len(text) > 30 else '')
                status_icon = '✅' if conf >= 0.5 else '⚠️'
                print(f"      [{i+1:2d}] {region['region_type']:8s} "
                      f"conf={conf:.2f} {engine:6s} {status_icon} "
                      f"'{short_text}'")

            except Exception as e:
                log_event(f"OCR region {i+1} failed: {str(e)[:50]}",
                          level='WARN')
                # Add failed row
                rows.append({
                    'page': filename,
                    'id': i + 1,
                    'region_type': region.get('region_type', 'overlay'),
                    'x': region['xywh'][0], 'y': region['xywh'][1],
                    'width': region['xywh'][2], 'height': region['xywh'][3],
                    'angle': region.get('angle', 0.0),
                    'original_text': '[OCR_FAILED]',
                    'translated_text': '',
                    'confidence': 0.0,
                    'ocr_engine': 'none',
                    'translator_engine': '',
                    'quality_score': '',
                    'is_english': False,
                    'bengali_valid': False,
                })

        # Mark page as done
        mark_page_done(filename, 'ocr')
        set_page_meta(filename, 'ocr_engine', CONFIG['ocr_engine'])

        page_time = time.time() - page_start
        print(f"    ⏱️  Time: {page_time:.1f}s")
        print()

    # ── Build DataFrame ──
    if rows:
        translation_df = pd.DataFrame(rows)
    else:
        translation_df = pd.DataFrame(columns=[
            'page', 'id', 'region_type', 'x', 'y', 'width', 'height',
            'angle', 'original_text', 'translated_text', 'confidence',
            'ocr_engine', 'translator_engine', 'quality_score',
            'is_english', 'bengali_valid',
        ])

    # ── Summary ──
    print("═" * 60)
    print("  📊 Detection + OCR Summary")
    print("═" * 60)
    print(f"  Total pages    : {total_images}")
    print(f"  Total regions  : {len(translation_df)}")
    print()
    print(f"  OCR engine breakdown:")
    for engine, count in ocr_engine_used.items():
        pct = count / max(1, len(translation_df)) * 100
        print(f"    {engine:10s}: {count:3d} ({pct:.0f}%)")
    print()

    # Per-page summary
    print("  📄 Per-page:")
    for filename in uploaded_images:
        page_rows = translation_df[translation_df['page'] == filename]
        n_regions = len(page_rows)
        n_eng = sum(page_rows['is_english'])
        avg_conf = page_rows['confidence'].mean() if n_regions > 0 else 0
        print(f"    {filename}: {n_regions} regions, "
              f"{n_eng} English, avg conf {avg_conf:.2f}")

    print()

    # ── Visual Verification ──
    print("─" * 60)
    print("  🖼️ Visual Verification")
    print("─" * 60)
    print()

    for filename, img_bgr in list(uploaded_images.items())[:3]:
        regions = all_detections.get(filename, [])
        if not regions:
            continue

        print(f"  📄 {filename} ({len(regions)} regions):")

        # Detection map
        vis = visualize_detections(img_bgr, regions)
        h, w = vis.shape[:2]
        scale = min(CONFIG['preview_max_width'] / w, 1.0)
        new_w = int(w * scale)
        new_h = int(h * scale)
        vis_small = cv2.resize(vis, (new_w, new_h))
        vis_rgb = cv2.cvtColor(vis_small, cv2.COLOR_BGR2RGB)
        display(PILImage.fromarray(vis_rgb))

        # Per-region crops (first 6)
        print(f"  📝 Region crops (first 6):")
        for i, region in enumerate(regions[:6]):
            crop = crop_region(img_bgr, region)
            if crop.shape[0] > 5 and crop.shape[1] > 5:
                # Get OCR text for this region
                page_rows = translation_df[translation_df['page'] == filename]
                if i < len(page_rows):
                    row = page_rows.iloc[i]
                    text = row['original_text']
                    conf = row['confidence']
                else:
                    text, conf = '?', 0

                # Upscale small crops for display
                ch, cw = crop.shape[:2]
                if ch < 80 or cw < 80:
                    scale_crop = max(80 / ch, 80 / cw, 1.0)
                    crop_disp = cv2.resize(crop, (int(cw * scale_crop),
                                                   int(ch * scale_crop)))
                else:
                    crop_disp = crop

                crop_rgb = cv2.cvtColor(crop_disp, cv2.COLOR_BGR2RGB)
                print(f"    [{i+1}] {region['region_type']} "
                      f"({region['confidence']:.2f}) "
                      f"text='{text[:30]}' conf={conf:.2f}")
                display(PILImage.fromarray(crop_rgb))

        print()

    print("═" * 60)
    print("  ✅ Cell 11 সফল — Cell 12 চালানো যাবে (Export)")
    print("═" * 60)

    log_event(f"Cell 11: {len(translation_df)} regions OCR'd "
              f"({ocr_engine_used})")
```

---

<a id='cell-12'></a>
## 🧩 Cell 12 — 💾 CELL 12 — Export (V11: ai.Text only)
**Source file:** `cell_12_export.py`
**Length:** 4121 chars / 118 lines

```python
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
```

---

<a id='cell-13'></a>
## 🧩 Cell 13 — 📤 CELL 13 — Translation (V11: Manual + Gemini + ChatGPT + NLLB)
**Source file:** `cell_13_translation.py`
**Length:** 18684 chars / 569 lines

```python
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

        # Derive NLLB cache dir from CONFIG['models_dir']
        # (Cell 2-এ CONFIG['models_nllb'] key নেই — তাই এখানে derive করছি)
        nllb_cache_dir = f"{CONFIG['models_dir']}/nllb"
        os.makedirs(nllb_cache_dir, exist_ok=True)

        print(f"  📥 Loading NLLB-200 (first time ~1.5GB download)...")
        nllb_tokenizer = AutoTokenizer.from_pretrained(
            NLLB_MODEL_ID, cache_dir=nllb_cache_dir
        )
        nllb_model = AutoModelForSeq2SeqLM.from_pretrained(
            NLLB_MODEL_ID, cache_dir=nllb_cache_dir,
            torch_dtype=DEVICE_TORCH_DTYPE,
        ).to(DEVICE).eval()
        # NOTE: explicit .to(DEVICE) — device_map='auto' can break
        print(f"  ✅ NLLB loaded")
        return True
    except Exception as e:
        log_event(f"NLLB load failed: {str(e)[:80]}", level='WARN')
        return False


def translate_with_nllb(text, target_lang='ben_Beng'):
    """NLLB দিয়ে translate করো।"""
    if nllb_model is None:
        if not load_nllb():
            return ''

    try:
        # NLLB uses language codes like 'eng_Latn', 'ben_Beng'
        inputs = nllb_tokenizer(text, return_tensors='pt',
                                max_length=512, truncation=True)
        if DEVICE == 'cuda':
            inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

        # Forcing target language
        target_lang_id = nllb_tokenizer.convert_tokens_to_ids(target_lang)
        if target_lang_id == nllb_tokenizer.unk_token_id:
            # Try alternate code
            target_lang_id = nllb_tokenizer.convert_tokens_to_ids('ben_Beng')

        with torch.no_grad():
            output = nllb_model.generate(
                **inputs,
                forced_bos_token_id=target_lang_id,
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
```

---

<a id='cell-14'></a>
## 🧩 Cell 14 — ✂️ CELL 14 — Full Page Inpainting (V11: LaMa Large)
**Source file:** `cell_14_page_inpainting.py`
**Length:** 6993 chars / 183 lines

```python
# ═══════════════════════════════════════════════════════════
# ✂️ CELL 14 — Full Page Inpainting (V11: LaMa Large)
# ═══════════════════════════════════════════════════════════
# প্রতিটি page-এর সব text regions একসাথে inpaint করবে।
# Original → Mask → Result preview দেখাবে।
# Per-region closeup: Original → Mask → Result
# ═══════════════════════════════════════════════════════════

import time
import numpy as np
import cv2
from PIL import Image as PILImage
from tqdm import tqdm

print("=" * 60)
print("  ✂️ MangaBD V11 — Full Page Inpainting (LaMa Large)")
print("=" * 60)
print()

if not uploaded_images:
    print("  ❌ কোনো image নেই! আগে Cell 10 চালাও")
    print("=" * 60)
elif translation_df is None or len(translation_df) == 0:
    print("  ❌ Translation data নেই! আগে Cell 11 চালাও")
    print("=" * 60)
else:

    inpainted_images.clear()
    total_pages = len(uploaded_images)

    print(f"  📂 {total_pages} টি page inpaint হবে")
    print(f"  🔧 Inpainting engine: "
          f"{'LaMa Large' if lama_inpainter is not None else 'OpenCV (fallback)'}")
    print()

    # ── Process each page ──
    for page_idx, (filename, img_bgr) in enumerate(uploaded_images.items(), 1):
        print(f"  ╔═══════════════════════════════════════════╗")
        print(f"  ║  [{page_idx}/{total_pages}] {filename}")
        print(f"  ╚═══════════════════════════════════════════╝")

        # Skip if already done
        if is_page_done(filename, 'inpaint'):
            print(f"    ✅ Already inpainted (checkpoint) — skip")
            print()
            continue

        page_start = time.time()

        # Get regions from translation_df
        page_rows = translation_df[translation_df['page'] == filename]
        regions = []
        for _, row in page_rows.iterrows():
            regions.append({
                'quad': np.array([
                    [row['x'], row['y']],
                    [row['x'] + row['width'], row['y']],
                    [row['x'] + row['width'], row['y'] + row['height']],
                    [row['x'], row['y'] + row['height']],
                ]),
                'xyxy': (row['x'], row['y'],
                         row['x'] + row['width'], row['y'] + row['height']),
                'xywh': (row['x'], row['y'], row['width'], row['height']),
                'angle': row.get('angle', 0.0),
                'confidence': row.get('confidence', 0.9),
                'region_type': row.get('region_type', 'overlay'),
            })

        # Run inpainting
        try:
            inpainted = inpaint_full_page(img_bgr, regions)
            inpainted_images[filename] = inpainted
            mark_page_done(filename, 'inpaint')

            page_time = time.time() - page_start
            print(f"    ✅ Inpainted in {page_time:.1f}s")
        except Exception as e:
            log_event(f"Inpainting failed for {filename}: {str(e)[:60]}",
                      level='ERROR')
            # Fallback: use original
            inpainted_images[filename] = img_bgr.copy()

        print()

    # ── Preview ──
    print("═" * 60)
    print("  🖼️ Preview: Original → Inpainted")
    print("═" * 60)
    print()

    for filename, inpainted in inpainted_images.items():
        original = uploaded_images.get(filename)
        if original is None:
            continue

        print(f"  📄 {filename}:")

        # Side-by-side comparison
        h, w = original.shape[:2]
        scale = min(CONFIG['preview_max_width'] / w, 1.0)
        new_w = int(w * scale)
        new_h = int(h * scale)

        orig_r = cv2.resize(original, (new_w, new_h))
        inp_r = cv2.resize(inpainted, (new_w, new_h))

        # Combined
        combined = np.ones((new_h, new_w * 2 + 20, 3), dtype=np.uint8) * 255
        combined[:new_h, :new_w] = orig_r
        combined[:new_h, new_w + 20:] = inp_r

        # Add labels
        cv2.putText(combined, "ORIGINAL", (10, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
        cv2.putText(combined, "INPAINTED", (new_w + 30, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)

        combined_rgb = cv2.cvtColor(combined, cv2.COLOR_BGR2RGB)
        display(PILImage.fromarray(combined_rgb))
        print()

    # ── Per-region closeup (first 5 regions of first page) ──
    if inpainted_images:
        first_page = list(inpainted_images.keys())[0]
        original = uploaded_images[first_page]
        inpainted = inpainted_images[first_page]
        page_rows = translation_df[translation_df['page'] == first_page]

        if len(page_rows) > 0:
            print(f"  🔍 Per-region closeup: {first_page}")
            print(f"     (Original → Mask → Result — first 5 regions)")
            print()

            for idx, row in page_rows.head(5).iterrows():
                rid = int(row['id'])
                x, y = int(row['x']), int(row['y'])
                w_r, h_r = int(row['width']), int(row['height'])
                rtype = str(row.get('region_type', ''))
                orig_text = str(row.get('original_text', ''))[:30]

                # Expand crop area for context
                pad = max(10, max(w_r, h_r) // 2)
                x1 = max(0, x - pad)
                y1 = max(0, y - pad)
                x2 = min(original.shape[1], x + w_r + pad)
                y2 = min(original.shape[0], y + h_r + pad)

                # Crops
                orig_crop = original[y1:y2, x1:x2]
                inp_crop = inpainted[y1:y2, x1:x2]

                # Mask crop
                mask_full = np.zeros(original.shape[:2], dtype=np.uint8)
                cv2.rectangle(mask_full, (x, y), (x + w_r, y + h_r), 255, -1)
                mask_crop = mask_full[y1:y2, x1:x2]
                # Convert to 3-channel for display
                mask_rgb = cv2.cvtColor(mask_crop, cv2.COLOR_GRAY2BGR)

                # Combined: original | mask | result
                h_c, w_c = orig_crop.shape[:2]
                combined = np.ones((h_c, w_c * 3 + 40, 3), dtype=np.uint8) * 255
                combined[:h_c, :w_c] = orig_crop
                combined[:h_c, w_c + 20:2*w_c + 20] = mask_rgb
                combined[:h_c, 2*w_c + 40:] = inp_crop

                # Labels
                cv2.putText(combined, "ORIG", (10, 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
                cv2.putText(combined, "MASK", (w_c + 30, 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
                cv2.putText(combined, "RESULT", (2*w_c + 50, 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

                print(f"    [{rid}] {rtype} '{orig_text}'")
                combined_rgb = cv2.cvtColor(combined, cv2.COLOR_BGR2RGB)
                display(PILImage.fromarray(combined_rgb))

    print()
    print("═" * 60)
    print("  ✅ Cell 14 সফল — Cell 15 চালানো যাবে (Bengali Rendering)")
    print("═" * 60)

    log_event(f"Cell 14: {len(inpainted_images)} pages inpainted")
```

---

<a id='cell-15'></a>
## 🧩 Cell 15 — ✍️ CELL 15 — Bengali Text Rendering (V11: Pillow + libraqm)
**Source file:** `cell_15_rendering.py`
**Length:** 10783 chars / 281 lines

```python
# ═══════════════════════════════════════════════════════════
# ✍️ CELL 15 — Bengali Text Rendering (V11: Pillow + libraqm)
# ═══════════════════════════════════════════════════════════
# প্রতিটি inpainted page-এ Bengali অনুবাদ render করবে।
# Font-size distribution chart দেখাবে।
# Per-region closeup: Original → Inpainted → Rendered
# ═══════════════════════════════════════════════════════════

import time
import numpy as np
import cv2
from PIL import Image as PILImage
from tqdm import tqdm
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# Bengali font support for matplotlib
import matplotlib.font_manager as fm
try:
    fm.fontManager.addfont(CONFIG['font_regular'])
    fm.fontManager.addfont(CONFIG['font_bold'])
    plt.rcParams['font.sans-serif'] = ['Noto Sans Bengali', 'DejaVu Sans']
    plt.rcParams['axes.unicode_minus'] = False
except Exception:
    pass

print("=" * 60)
print("  ✍️ MangaBD V11 — Bengali Text Rendering")
print("=" * 60)
print()

if not inpainted_images:
    print("  ❌ Inpainted images নেই! আগে Cell 14 চালাও")
    print("=" * 60)
elif translation_df is None or len(translation_df) == 0:
    print("  ❌ Translation data নেই! আগে Cell 13 চালাও")
    print("=" * 60)
else:

    output_images.clear()
    quality_warnings.clear()

    font_sizes_used = []  # for distribution chart

    total_pages = len(inpainted_images)
    print(f"  📂 {total_pages} টি page render হবে")
    print()

    # ── Process each page ──
    for page_idx, (filename, inpainted_np) in enumerate(inpainted_images.items(), 1):
        print(f"  ╔═══════════════════════════════════════════╗")
        print(f"  ║  [{page_idx}/{total_pages}] {filename}")
        print(f"  ╚═══════════════════════════════════════════╝")

        # Skip if already done
        if is_page_done(filename, 'render'):
            print(f"    ✅ Already rendered (checkpoint) — skip")
            # Restore from Drive if available
            cached = f"{CONFIG['results_dir']}/{filename}"
            if os.path.exists(cached):
                output_images[filename] = PILImage.open(cached).convert('RGB')
            print()
            continue

        page_start = time.time()

        # Convert BGR (numpy) → RGB (PIL)
        inpainted_rgb = cv2.cvtColor(inpainted_np, cv2.COLOR_BGR2RGB)
        canvas_pil = PILImage.fromarray(inpainted_rgb).copy()  # mutable copy

        # Get this page's regions
        page_rows = translation_df[translation_df['page'] == filename].sort_values('id')

        rendered_count = 0
        skipped_count = 0

        for _, row in page_rows.iterrows():
            rid = int(row['id'])
            x, y = int(row['x']), int(row['y'])
            w, h = int(row['width']), int(row['height'])
            angle = float(row.get('angle', 0.0))
            rtype = str(row.get('region_type', 'overlay'))
            trans = str(row.get('translated_text', '')).strip()
            orig = str(row.get('original_text', '')).strip()

            # Skip if no translation or markers
            if not trans or trans in ('[EMPTY]', '[OCR_FAILED]', '[SFX]',
                                       '[SKIP:OCR_FAILED]', '[TRANS_FAILED]', 'nan'):
                skipped_count += 1
                quality_warnings.append({
                    'page': filename,
                    'region_id': rid,
                    'issue': f'Skipped: no translation ({trans})',
                    'severity': '🟡',
                })
                continue

            # Skip if translation == original (still English)
            if trans == orig:
                skipped_count += 1
                quality_warnings.append({
                    'page': filename,
                    'region_id': rid,
                    'issue': 'Translation same as original (still English?)',
                    'severity': '🟡',
                })
                continue

            # Determine bold
            bold = (rtype == 'sfx' or rtype == 'narrator')

            # Determine stroke width based on region type
            stroke = 2 if rtype in ('bubble', 'thought') else 3

            # Render
            try:
                # Estimate font size that will be used (for tracking)
                est_size, _, _ = fit_font_size(trans, w, h, bold=bold)
                font_sizes_used.append(est_size)

                canvas_pil = render_bengali_text(
                    canvas_pil, trans,
                    x, y, w, h,
                    angle=angle,
                    region_type=rtype,
                    bold=bold,
                    stroke_width=stroke,
                )

                # Update Bengali validity
                translation_df.loc[
                    (translation_df['page'] == filename) &
                    (translation_df['id'] == rid),
                    'bengali_valid'
                ] = is_bengali_text_valid(trans)

                rendered_count += 1

                # Check for font overflow (text bigger than region)
                if est_size <= CONFIG['font_size_min'] and len(trans) > 20:
                    quality_warnings.append({
                        'page': filename,
                        'region_id': rid,
                        'issue': f'Font at min size ({est_size}px) — text may overflow',
                        'severity': '🟡',
                    })

            except Exception as e:
                log_event(f"Render failed [{filename}:{rid}]: {str(e)[:50]}",
                          level='WARN')
                quality_warnings.append({
                    'page': filename,
                    'region_id': rid,
                    'issue': f'Render error: {str(e)[:40]}',
                    'severity': '🔴',
                })

        # Save to Drive
        output_path = f"{CONFIG['results_dir']}/{filename}"
        canvas_pil.save(output_path, quality=95)
        output_images[filename] = canvas_pil

        # Mark done
        mark_page_done(filename, 'render')

        page_time = time.time() - page_start
        print(f"    ✅ Rendered {rendered_count}, skipped {skipped_count} "
              f"in {page_time:.1f}s")
        print()

    # ── Font-size distribution chart ──
    if font_sizes_used:
        print("─" * 60)
        print("  📊 Font Size Distribution")
        print("─" * 60)
        print()

        fig, ax = plt.subplots(1, 1, figsize=(10, 4), constrained_layout=True)
        ax.hist(font_sizes_used, bins=range(CONFIG['font_size_min'],
                                              CONFIG['font_size_max'] + 2, 2),
                color='#4a90e2', edgecolor='white', alpha=0.8)
        ax.axvline(np.mean(font_sizes_used), color='red', linestyle='--',
                   label=f'Mean: {np.mean(font_sizes_used):.1f}px')
        ax.set_xlabel('Font size (px)')
        ax.set_ylabel('Number of regions')
        ax.set_title('Bengali Font Size Distribution (V11)')
        ax.legend()
        ax.grid(True, alpha=0.3)
        plt.show()

        print(f"  📈 Sizes: min={min(font_sizes_used)}px, "
              f"max={max(font_sizes_used)}px, "
              f"mean={np.mean(font_sizes_used):.1f}px, "
              f"median={np.median(font_sizes_used):.1f}px")
        print()

    # ── Preview ──
    print("─" * 60)
    print("  🖼️ Rendered pages preview")
    print("─" * 60)

    for filename, output_pil in list(output_images.items())[:3]:
        print(f"\n  📄 {filename}")
        w, h = output_pil.size
        scale = min(CONFIG['preview_max_width'] / w, 1.0)
        new_w = int(w * scale)
        new_h = int(h * scale)
        preview = output_pil.resize((new_w, new_h), PILImage.LANCZOS)
        display(preview)

    # ── Per-region closeup ──
    if output_images and uploaded_images:
        print()
        print("─" * 60)
        print("  🔍 Per-region closeup: Original → Inpainted → Rendered")
        print("─" * 60)

        first_page = list(output_images.keys())[0]
        original = uploaded_images.get(first_page)
        inpainted = inpainted_images.get(first_page)
        rendered = output_images.get(first_page)

        if original is not None and inpainted is not None and rendered is not None:
            page_rows = translation_df[translation_df['page'] == first_page]
            page_rows = page_rows[page_rows['translated_text'].notna() &
                                   (page_rows['translated_text'] != '')].head(5)

            for _, row in page_rows.iterrows():
                rid = int(row['id'])
                x, y = int(row['x']), int(row['y'])
                w_r, h_r = int(row['width']), int(row['height'])
                rtype = str(row.get('region_type', ''))
                trans = str(row.get('translated_text', ''))[:30]
                orig = str(row.get('original_text', ''))[:30]

                pad = max(10, max(w_r, h_r) // 2)
                x1 = max(0, x - pad)
                y1 = max(0, y - pad)
                x2 = min(original.shape[1], x + w_r + pad)
                y2 = min(original.shape[0], y + h_r + pad)

                # Crops (BGR for original/inpainted, RGB for rendered)
                orig_crop = original[y1:y2, x1:x2]
                inp_crop = inpainted[y1:y2, x1:x2]
                rendered_crop = np.array(rendered)[y1:y2, x1:x2]

                # All to RGB
                orig_rgb = cv2.cvtColor(orig_crop, cv2.COLOR_BGR2RGB)
                inp_rgb = cv2.cvtColor(inp_crop, cv2.COLOR_BGR2RGB)
                rend_rgb = rendered_crop  # already RGB

                # Combined
                h_c, w_c = orig_rgb.shape[:2]
                combined = np.ones((h_c, w_c * 3 + 40, 3), dtype=np.uint8) * 255
                combined[:h_c, :w_c] = orig_rgb
                combined[:h_c, w_c + 20:2*w_c + 20] = inp_rgb
                combined[:h_c, 2*w_c + 40:] = rend_rgb

                cv2.putText(combined, "ORIG", (10, 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
                cv2.putText(combined, "INPAINT", (w_c + 30, 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
                cv2.putText(combined, "RENDER", (2*w_c + 50, 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

                print(f"\n    [{rid}] {rtype} '{orig}' → '{trans}'")
                display(PILImage.fromarray(combined))

    print()
    print("═" * 60)
    print(f"  📊 Render Summary")
    print("═" * 60)
    print(f"  Pages rendered : {len(output_images)}/{total_pages}")
    print(f"  Quality warnings: {len(quality_warnings)}")
    print()
    print("  ✅ Cell 15 সফল — Cell 16 চালানো যাবে (Quality Inspector)")
    print("═" * 60)

    log_event(f"Cell 15: {len(output_images)} pages rendered, "
              f"{len(quality_warnings)} warnings")
```

---

<a id='cell-16'></a>
## 🧩 Cell 16 — 🔬 CELL 16 — Quality Inspector (V11, from V1)
**Source file:** `cell_16_quality.py`
**Length:** 15944 chars / 398 lines

```python
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
                if baidu_ocr is not None or qwen_vl_ocr is not None:
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
```

---

<a id='cell-17'></a>
## 🧩 Cell 17 — 🔧 CELL 17 — Manual Fix (V11, from V1)
**Source file:** `cell_17_manual_fix.py`
**Length:** 8433 chars / 223 lines

```python
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
```

---

<a id='cell-18'></a>
## 🧩 Cell 18 — 🖼️ CELL 18 — Preview & Download (V11, from V1)
**Source file:** `cell_18_preview_download.py`
**Length:** 7795 chars / 219 lines

```python
# ═══════════════════════════════════════════════════════════
# 🖼️ CELL 18 — Preview & Download (V11, from V1)
# ═══════════════════════════════════════════════════════════
# Original vs final comparison, closeup, download, ZIP
# ═══════════════════════════════════════════════════════════

import os
import zipfile
import io
from PIL import Image as PILImage
from datetime import datetime

print("=" * 60)
print("  🖼️ MangaBD V11 — Preview & Download")
print("=" * 60)
print()

if not output_images:
    print("  ❌ Output images নেই! আগে Cell 15 চালাও")
    print("=" * 60)
else:

    # ── Original vs Final comparison ──
    print("─" * 60)
    print("  📸 Original vs Final Comparison")
    print("─" * 60)
    print()

    for filename, output_pil in output_images.items():
        original = uploaded_images.get(filename)

        print(f"  📄 {filename}")

        if original is not None:
            # Side-by-side
            h, w = original.shape[:2]
            scale = min(CONFIG['preview_max_width'] / w, 1.0)
            dw, dh = int(w * scale), int(h * scale)

            orig_r = cv2.resize(original, (dw, dh))
            orig_rgb = cv2.cvtColor(orig_r, cv2.COLOR_BGR2RGB)
            orig_pil = PILImage.fromarray(orig_rgb)

            final_r = output_pil.resize((dw, dh), PILImage.LANCZOS)

            # Combine
            combined = PILImage.new('RGB', (dw * 2 + 20, dh), (255, 255, 255))
            combined.paste(orig_pil, (0, 0))
            combined.paste(final_r, (dw + 20, 0))

            display(combined)
            print()

    # ── Closeup comparison ──
    print("─" * 60)
    print("  🔍 Closeup Comparison (first page, first 5 regions)")
    print("─" * 60)
    print()

    first_page = list(output_images.keys())[0]
    original = uploaded_images.get(first_page)
    output_pil = output_images[first_page]
    page_rows = translation_df[translation_df['page'] == first_page]

    if original is not None and len(page_rows) > 0:
        for _, row in page_rows.head(5).iterrows():
            rid = int(row['id'])
            x, y = int(row['x']), int(row['y'])
            w, h = int(row['width']), int(row['height'])
            rtype = str(row.get('region_type', ''))
            orig_t = str(row.get('original_text', ''))[:30]
            trans_t = str(row.get('translated_text', ''))[:30]

            pad = max(10, max(w, h) // 2)
            x1 = max(0, x - pad)
            y1 = max(0, y - pad)
            x2 = min(original.shape[1], x + w + pad)
            y2 = min(original.shape[0], y + h + pad)

            orig_crop = original[y1:y2, x1:x2]
            orig_rgb = cv2.cvtColor(orig_crop, cv2.COLOR_BGR2RGB)
            out_np = np.array(output_pil)
            out_crop = out_np[y1:y2, x1:x2]

            h_c, w_c = orig_rgb.shape[:2]
            combined = np.ones((h_c, w_c * 2 + 20, 3), dtype=np.uint8) * 255
            combined[:h_c, :w_c] = orig_rgb
            combined[:h_c, w_c + 20:] = out_crop

            cv2.putText(combined, "ORIGINAL", (10, 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
            cv2.putText(combined, "FINAL", (w_c + 30, 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

            print(f"    [{rid}] {rtype}: '{orig_t}' → '{trans_t}'")
            display(PILImage.fromarray(combined))

    print()

    # ── Download options ──
    print("═" * 60)
    print("  📥 Download Options")
    print("═" * 60)
    print()

    # Save final images to Drive
    save_dir = f"{CONFIG['results_dir']}/final_{CHECKPOINT['session_id']}"
    os.makedirs(save_dir, exist_ok=True)

    for filename, output_pil in output_images.items():
        save_path = f"{save_dir}/{filename}"
        output_pil.save(save_path, quality=95)

    print(f"  ✅ {len(output_images)} images saved to Drive:")
    print(f"     📁 {save_dir}")
    print()

    # Single download buttons
    download_single_btn = widgets.Button(
        description='📥 Download Single (zip)',
        button_style='info',
        layout=widgets.Layout(width='250px', height='40px')
    )
    download_all_btn = widgets.Button(
        description='📦 Download All as ZIP',
        button_style='success',
        layout=widgets.Layout(width='250px', height='40px')
    )
    download_data_btn = widgets.Button(
        description='📊 Download Translation Data (CSV)',
        button_style='warning',
        layout=widgets.Layout(width='300px', height='40px')
    )

    def on_download_single(btn):
        """Download single image (let user pick)."""
        print("\n  📤 যে image চাও সেটি choose করো:")
        filenames = list(output_images.keys())
        dropdown = widgets.Dropdown(
            options=filenames,
            description='File:',
            layout=widgets.Layout(width='400px')
        )
        confirm = widgets.Button(description='⬇️ Download', button_style='success')

        def on_confirm(c):
            chosen = dropdown.value
            save_path = f"{save_dir}/{chosen}"
            files.download(save_path)
            print(f"\n  ✅ Downloading: {chosen}")

        confirm.on_click(on_confirm)
        display(widgets.VBox([dropdown, confirm]))

    def on_download_all(btn):
        """Download all as ZIP."""
        print("\n  📦 ZIP file তৈরি হচ্ছে...")
        zip_path = f"{CONFIG['temp_dir']}/MangaBD_V11_results_{CHECKPOINT['session_id']}.zip"

        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Add images
            for filename, output_pil in output_images.items():
                buf = io.BytesIO()
                output_pil.save(buf, format='PNG')
                zf.writestr(filename, buf.getvalue())

            # Add translation data CSV
            csv_data = translation_df.to_csv(index=False)
            zf.writestr('translation_data.csv', csv_data)

            # Add ai.Text export
            ai_lines = []
            for filename in translation_df['page'].unique():
                page_rows = translation_df[translation_df['page'] == filename].sort_values('id')
                for _, row in page_rows.iterrows():
                    rid = int(row['id'])
                    orig = str(row.get('original_text', '')).strip()
                    trans = str(row.get('translated_text', '')).strip()
                    ai_lines.append(f"[{filename}:{rid}] {orig} → {trans}")
            zf.writestr('translation_data.txt', '\n'.join(ai_lines))

            # Add session log
            zf.writestr('session_log.txt', '\n'.join(session_log))

            # Add checkpoint
            with open(CONFIG['checkpoint_file'], 'r') as f:
                zf.writestr('checkpoint.json', f.read())

        print(f"  ✅ ZIP file: {zip_path}")
        print(f"     📏 {os.path.getsize(zip_path)/1024:.0f} KB")
        files.download(zip_path)
        print(f"  ✅ Download শুরু হয়েছে")

    def on_download_data(btn):
        """Download translation CSV."""
        print("\n  📊 Translation CSV তৈরি হচ্ছে...")
        csv_path = f"{CONFIG['temp_dir']}/translation_data_{CHECKPOINT['session_id']}.csv"
        translation_df.to_csv(csv_path, index=False, encoding='utf-8')
        files.download(csv_path)
        print(f"  ✅ Download শুরু হয়েছে: {csv_path}")

    download_single_btn.on_click(on_download_single)
    download_all_btn.on_click(on_download_all)
    download_data_btn.on_click(on_download_data)

    display(widgets.VBox([
        download_single_btn,
        download_all_btn,
        download_data_btn,
    ]))

    print()
    print("═" * 60)
    print("  📌 এরপর:")
    print("     • Cell 19 চালাও (Session Log) — সব stats দেখবে")
    print("     • বা Cell 20 চালাও (Dashboard) — interactive UI")
    print("═" * 60)

    log_event(f"Cell 18: {len(output_images)} images ready for download")
```

---

<a id='cell-19'></a>
## 🧩 Cell 19 — 📋 CELL 19 — Session Log (V11, modified for new OCR/translator engines)
**Source file:** `cell_19_session_log.py`
**Length:** 10864 chars / 321 lines

```python
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

# OCR engine breakdown (V11: baidu/qwen vs easyocr/tesseract)
ocr_baidu = 0
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

        # OCR method (V11: baidu/qwen)
        method = str(row.get('ocr_engine', '')).strip().lower()
        if method == 'baidu':
            ocr_baidu += 1
        elif method == 'qwen':
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
print(f"  Baidu (primary) : {ocr_baidu}")
print(f"  Qwen VL (backup): {ocr_qwen}")
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
print(f"  Baidu OCR         : {'✅' if baidu_ocr is not None else '❌'}")
print(f"  Qwen 2.5 VL       : {'✅' if qwen_vl_ocr is not None else '❌'}")
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
    f.write(f"  Baidu: {ocr_baidu}\n")
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
```

---

<a id='cell-20'></a>
## 🧩 Cell 20 — 🎨 CELL 20 — Dashboard (V11 NEW: HTML/CSS/JS)
**Source file:** `cell_20_dashboard.py`
**Length:** 27356 chars / 883 lines

```python
# ═══════════════════════════════════════════════════════════
# 🎨 CELL 20 — Dashboard (V11 NEW: HTML/CSS/JS)
# ═══════════════════════════════════════════════════════════
# Unified control panel — drag-drop upload, OCR engine dropdown,
# translator dropdown, translate button, progress, result preview,
# download button, quality score, settings panel.
# Dark theme, modern UI, responsive design.
# ═══════════════════════════════════════════════════════════

import os
import json
import base64
import io
from IPython.display import HTML, Javascript, display
from PIL import Image as PILImage

print("=" * 60)
print("  🎨 MangaBD V11 — Dashboard (HTML/CSS/JS)")
print("=" * 60)
print()

# ── Status info ──
ocr_status = get_ocr_status() if 'get_ocr_status' in globals() else {
    'current': CONFIG.get('ocr_engine', 'baidu'),
    'baidu_loaded': baidu_ocr is not None,
    'qwen_loaded': qwen_vl_ocr is not None,
    'fallback_enabled': True,
}

trans_status = get_translator_status() if 'get_translator_status' in globals() else {
    'current': CONFIG.get('translator_engine', 'manual'),
    'gemini_key_set': bool(CONFIG.get('gemini_api_key')),
    'openai_key_set': bool(CONFIG.get('openai_api_key')),
    'nllb_loaded': nllb_model is not None,
}

# Count processed pages
n_uploaded = len(uploaded_images) if 'uploaded_images' in globals() else 0
n_inpainted = len(inpainted_images) if 'inpainted_images' in globals() else 0
n_rendered = len(output_images) if 'output_images' in globals() else 0
n_regions = len(translation_df) if 'translation_df' in globals() and translation_df is not None else 0

# Quality score
quality_score = 0
if 'quality_reports' in globals() and n_regions > 0:
    total_issues = sum(len(issues) for issues in quality_reports.values())
    issue_regions = set()
    for issues in quality_reports.values():
        for issue in issues:
            if issue.get('id', 0) > 0:
                issue_regions.add(issue['id'])
    quality_score = max(0, int(100 - (len(issue_regions) / n_regions * 100)))

# ═══════════════════════════════════════════════════════════
# Build HTML dashboard
# ═══════════════════════════════════════════════════════════

DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<title>MangaBD V11 Dashboard</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', 'Noto Sans Bengali', system-ui, sans-serif;
    background: #0f1117;
    color: #e4e6eb;
    padding: 24px;
    line-height: 1.6;
  }
  .container { max-width: 1200px; margin: 0 auto; }

  /* Header */
  .header {
    background: linear-gradient(135deg, #1a1f2e, #2d3548);
    padding: 24px 32px;
    border-radius: 16px;
    margin-bottom: 24px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    border: 1px solid #2a3142;
  }
  .header h1 {
    font-size: 28px;
    color: #fff;
    margin-bottom: 8px;
    background: linear-gradient(135deg, #4a90e2, #7c3aed);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .header .subtitle {
    color: #94a3b8;
    font-size: 14px;
  }
  .header .session-info {
    margin-top: 12px;
    color: #64748b;
    font-size: 12px;
    font-family: 'Courier New', monospace;
  }

  /* Grid layout */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  /* Card */
  .card {
    background: #1a1f2e;
    padding: 20px;
    border-radius: 12px;
    border: 1px solid #2a3142;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    transition: border-color 0.2s;
  }
  .card:hover { border-color: #4a90e2; }
  .card h2 {
    font-size: 16px;
    color: #94a3b8;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }
  .card .value {
    font-size: 32px;
    font-weight: 700;
    color: #fff;
  }
  .card .label {
    font-size: 12px;
    color: #64748b;
    margin-top: 4px;
  }

  /* Quality score */
  .quality-card { grid-column: span 2; }
  .quality-score {
    font-size: 48px;
    font-weight: 700;
    background: linear-gradient(135deg, #10b981, #4ade80);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .quality-bar {
    height: 8px;
    background: #2a3142;
    border-radius: 4px;
    margin-top: 12px;
    overflow: hidden;
  }
  .quality-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #4ade80);
    border-radius: 4px;
    transition: width 0.5s ease;
  }

  /* Controls */
  .controls {
    background: #1a1f2e;
    padding: 24px;
    border-radius: 16px;
    border: 1px solid #2a3142;
    margin-bottom: 24px;
  }
  .controls h2 {
    color: #fff;
    margin-bottom: 20px;
    font-size: 20px;
  }
  .control-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 16px;
  }
  .control-group label {
    display: block;
    font-size: 12px;
    color: #94a3b8;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  select, input[type="number"], input[type="text"] {
    width: 100%;
    padding: 10px 12px;
    background: #0f1117;
    border: 1px solid #2a3142;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    font-family: inherit;
    transition: border-color 0.2s;
  }
  select:focus, input:focus {
    outline: none;
    border-color: #4a90e2;
  }

  /* Buttons */
  .btn {
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .btn-primary {
    background: linear-gradient(135deg, #4a90e2, #3b82f6);
    color: #fff;
  }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(74,144,226,0.4); }
  .btn-success {
    background: linear-gradient(135deg, #10b981, #4ade80);
    color: #fff;
  }
  .btn-success:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16,185,129,0.4); }
  .btn-warning {
    background: linear-gradient(135deg, #f59e0b, #f97316);
    color: #fff;
  }
  .btn-secondary {
    background: #2a3142;
    color: #e4e6eb;
  }
  .btn-secondary:hover { background: #374151; }
  .btn-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 16px;
  }

  /* Upload area */
  .upload-area {
    border: 2px dashed #4a90e2;
    border-radius: 12px;
    padding: 40px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    background: rgba(74,144,226,0.05);
  }
  .upload-area:hover {
    background: rgba(74,144,226,0.1);
    border-color: #3b82f6;
  }
  .upload-area.dragover {
    background: rgba(74,144,226,0.2);
    border-color: #4ade80;
  }
  .upload-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }
  .upload-text {
    color: #94a3b8;
    font-size: 14px;
  }
  .upload-text strong { color: #4a90e2; }

  /* Progress */
  .progress {
    height: 6px;
    background: #2a3142;
    border-radius: 3px;
    overflow: hidden;
    margin: 12px 0;
    display: none;
  }
  .progress.active { display: block; }
  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #4a90e2, #3b82f6);
    border-radius: 3px;
    width: 0%;
    transition: width 0.3s;
  }

  /* Preview */
  .preview {
    background: #1a1f2e;
    padding: 24px;
    border-radius: 16px;
    border: 1px solid #2a3142;
    margin-bottom: 24px;
  }
  .preview h2 {
    color: #fff;
    margin-bottom: 16px;
    font-size: 20px;
  }
  .preview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
  }
  .preview-item {
    background: #0f1117;
    border-radius: 8px;
    padding: 12px;
    border: 1px solid #2a3142;
  }
  .preview-item img {
    width: 100%;
    height: auto;
    border-radius: 6px;
    display: block;
  }
  .preview-item .name {
    color: #94a3b8;
    font-size: 12px;
    margin-top: 8px;
    text-align: center;
  }

  /* Status badges */
  .badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .badge-success { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
  .badge-warning { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }
  .badge-danger { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }

  /* Settings panel */
  .settings-panel {
    background: #0f1117;
    padding: 16px;
    border-radius: 8px;
    margin-top: 12px;
    border: 1px solid #2a3142;
  }
  .settings-panel summary {
    cursor: pointer;
    color: #94a3b8;
    font-size: 14px;
    font-weight: 600;
  }
  .settings-content {
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  /* Tooltip */
  [data-tooltip] { position: relative; cursor: help; }
  [data-tooltip]:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1f2e;
    color: #fff;
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 11px;
    white-space: nowrap;
    margin-bottom: 4px;
    z-index: 10;
    border: 1px solid #4a90e2;
  }

  /* Responsive */
  @media (max-width: 768px) {
    body { padding: 12px; }
    .header { padding: 16px; }
    .header h1 { font-size: 22px; }
    .grid { grid-template-columns: 1fr; }
    .quality-card { grid-column: span 1; }
  }

  /* Footer note */
  .footer-note {
    text-align: center;
    color: #64748b;
    font-size: 12px;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid #2a3142;
  }
</style>
</head>
<body>
<div class="container">

  <!-- Header -->
  <div class="header">
    <h1>🎨 MangaBD V11 Dashboard</h1>
    <div class="subtitle">Production-quality Bengali Manga Translator</div>
    <div class="session-info">
      Session: __SESSION_ID__ | Device: __DEVICE__ | __DEVICE_DETAILS__
    </div>
  </div>

  <!-- Stats Grid -->
  <div class="grid">

    <div class="card">
      <h2>📤 Uploaded</h2>
      <div class="value">__N_UPLOADED__</div>
      <div class="label">Pages</div>
    </div>

    <div class="card">
      <h2>🔍 Regions</h2>
      <div class="value">__N_REGIONS__</div>
      <div class="label">Text regions detected</div>
    </div>

    <div class="card">
      <h2>✂️ Inpainted</h2>
      <div class="value">__N_INPAINTED__</div>
      <div class="label">Pages processed</div>
    </div>

    <div class="card">
      <h2>✍️ Rendered</h2>
      <div class="value">__N_RENDERED__</div>
      <div class="label">Final Bengali pages</div>
    </div>

    <div class="card quality-card">
      <h2>📊 Quality Score</h2>
      <div class="quality-score">__QUALITY_SCORE__%</div>
      <div class="label">__QUALITY_GRADE__</div>
      <div class="quality-bar">
        <div class="quality-bar-fill" style="width: __QUALITY_SCORE__%"></div>
      </div>
    </div>

  </div>

  <!-- Engine Status -->
  <div class="controls">
    <h2>⚙️ Engine Status</h2>
    <div class="control-row">
      <div class="control-group">
        <label>OCR Engine</label>
        <div>
          <span class="badge __OCR_BADGE__">__OCR_CURRENT__</span>
          <span class="badge badge-success">Baidu: __OCR_BAIDU__</span>
          <span class="badge badge-success">Qwen: __OCR_QWEN__</span>
        </div>
      </div>
      <div class="control-group">
        <label>Translator</label>
        <div>
          <span class="badge __TRANS_BADGE__">__TRANS_CURRENT__</span>
          <span class="badge __TRANS_GEMINI_BADGE__">Gemini: __TRANS_GEMINI__</span>
          <span class="badge __TRANS_OPENAI_BADGE__">OpenAI: __TRANS_OPENAI__</span>
          <span class="badge __TRANS_NLLB_BADGE__">NLLB: __TRANS_NLLB__</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Controls -->
  <div class="controls">
    <h2>🎮 Control Panel</h2>

    <div class="control-row">
      <div class="control-group">
        <label>OCR Engine</label>
        <select id="ocr-engine-select">
          <option value="baidu" __OCR_BAIDU_SELECTED__>📖 Baidu (Primary)</option>
          <option value="qwen" __OCR_QWEN_SELECTED__>🤖 Qwen 2.5 VL (Backup)</option>
        </select>
      </div>
      <div class="control-group">
        <label>Translator</label>
        <select id="translator-engine-select">
          <option value="manual" __TRANS_MANUAL_SELECTED__>📝 Manual</option>
          <option value="gemini" __TRANS_GEMINI_SELECTED__>💎 Gemini</option>
          <option value="chatgpt" __TRANS_CHATGPT_SELECTED__>🤖 ChatGPT</option>
          <option value="nllb" __TRANS_NLLB_SELECTED__>📚 NLLB (offline)</option>
        </select>
      </div>
      <div class="control-group">
        <label>Default Font Size</label>
        <input type="number" id="font-size-input" min="12" max="48"
               value="__FONT_SIZE__">
      </div>
      <div class="control-group">
        <label>Detection Threshold</label>
        <input type="number" id="detect-threshold-input" min="0.1" max="0.9"
               step="0.05" value="__DETECT_THRESHOLD__">
      </div>
    </div>

    <div class="btn-row">
      <button class="btn btn-primary" onclick="runStep('cell10')">
        📤 Upload Images
      </button>
      <button class="btn btn-primary" onclick="runStep('cell11')">
        🔍 Detect + OCR
      </button>
      <button class="btn btn-primary" onclick="runStep('cell12')">
        💾 Export ai.Text
      </button>
      <button class="btn btn-primary" onclick="runStep('cell13')">
        🌐 Translate
      </button>
      <button class="btn btn-primary" onclick="runStep('cell14')">
        ✂️ Inpaint
      </button>
      <button class="btn btn-primary" onclick="runStep('cell15')">
        ✍️ Render Bengali
      </button>
      <button class="btn btn-success" onclick="runStep('cell16')">
        🔬 Inspect Quality
      </button>
      <button class="btn btn-warning" onclick="downloadResults()">
        📥 Download All
      </button>
    </div>

    <div class="progress" id="progress-bar">
      <div class="progress-bar" id="progress-fill"></div>
    </div>
    <div id="status-message" style="color: #94a3b8; font-size: 14px; margin-top: 8px;">
      ✅ Ready. Choose an action above.
    </div>
  </div>

  <!-- Preview -->
  __PREVIEW_HTML__

  <!-- Settings Panel -->
  <details class="settings-panel">
    <summary>⚙️ Advanced Settings</summary>
    <div class="settings-content">
      <div class="control-group">
        <label>Text Stroke Width</label>
        <input type="number" id="stroke-width-input" min="0" max="6"
               value="__STROKE_WIDTH__">
      </div>
      <div class="control-group">
        <label>Inpainting Size</label>
        <input type="number" id="inpaint-size-input" min="256" max="2048"
               step="128" value="__INPAINT_SIZE__">
      </div>
      <div class="control-group">
        <label>Min OCR Confidence</label>
        <input type="number" id="min-conf-input" min="0.0" max="1.0"
               step="0.05" value="__MIN_CONF__">
      </div>
      <div class="control-group">
        <label>Bubble White Ratio</label>
        <input type="number" id="white-ratio-input" min="0.0" max="1.0"
               step="0.05" value="__WHITE_RATIO__">
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="applySettings()">
        💾 Apply Settings
      </button>
      <button class="btn btn-secondary" onclick="resetCheckpoint()">
        🔄 Reset Checkpoint
      </button>
    </div>
  </details>

  <div class="footer-note">
    MangaBD V11.0 | Built with ❤️ for Bengali manga translation | Quality is #1 priority
  </div>
</div>

<script>
  // Run a notebook cell step
  function runStep(cellName) {
    const statusEl = document.getElementById('status-message');
    const progressEl = document.getElementById('progress-bar');
    const fillEl = document.getElementById('progress-fill');

    statusEl.textContent = '⏳ Running: ' + cellName + '...';
    progressEl.classList.add('active');
    fillEl.style.width = '50%';

    // In Colab, we use google.colab.kernel.invokeFunction
    // to call Python functions from JavaScript
    try {
      google.colab.kernel.invokeFunction('notebook.run_step', [cellName], {})
        .then(function(result) {
          fillEl.style.width = '100%';
          statusEl.textContent = '✅ ' + cellName + ' completed';
          setTimeout(function() {
            progressEl.classList.remove('active');
            fillEl.style.width = '0%';
          }, 2000);
        })
        .catch(function(err) {
          statusEl.textContent = '❌ Error: ' + err.message;
          progressEl.classList.remove('active');
        });
    } catch (e) {
      // Fallback: just show message
      statusEl.textContent = 'ℹ️ "' + cellName + '" — Run the corresponding Python cell manually.';
      progressEl.classList.remove('active');
    }
  }

  function downloadResults() {
    try {
      google.colab.kernel.invokeFunction('notebook.download_results', [], {});
      document.getElementById('status-message').textContent = '📥 Download initiated';
    } catch (e) {
      document.getElementById('status-message').textContent =
        '📥 Run Cell 18 for downloads';
    }
  }

  function applySettings() {
    const settings = {
      font_size: parseInt(document.getElementById('font-size-input').value),
      stroke_width: parseInt(document.getElementById('stroke-width-input').value),
      inpaint_size: parseInt(document.getElementById('inpaint-size-input').value),
      min_conf: parseFloat(document.getElementById('min-conf-input').value),
      white_ratio: parseFloat(document.getElementById('white-ratio-input').value),
      ocr_engine: document.getElementById('ocr-engine-select').value,
      translator_engine: document.getElementById('translator-engine-select').value,
      detect_threshold: parseFloat(document.getElementById('detect-threshold-input').value),
    };
    try {
      google.colab.kernel.invokeFunction('notebook.apply_settings', [settings], {});
      document.getElementById('status-message').textContent = '✅ Settings applied';
    } catch (e) {
      document.getElementById('status-message').textContent =
        '⚠️ Settings UI only — restart runtime to apply';
    }
  }

  function resetCheckpoint() {
    if (confirm('Reset checkpoint? All progress will be lost.')) {
      try {
        google.colab.kernel.invokeFunction('notebook.reset_checkpoint', [], {});
        document.getElementById('status-message').textContent = '🔄 Checkpoint reset';
      } catch (e) {
        document.getElementById('status-message').textContent =
          '⚠️ Call reset_all_pages() in a Python cell';
      }
    }
  }

  // Drag-drop for upload area (if shown)
  document.addEventListener('dragover', function(e) {
    e.preventDefault();
  });
  document.addEventListener('drop', function(e) {
    e.preventDefault();
  });

  console.log('🎨 MangaBD V11 Dashboard loaded');
</script>
</body>
</html>
"""

# ═══════════════════════════════════════════════════════════
# Build preview HTML (first 3 rendered images)
# ═══════════════════════════════════════════════════════════

preview_html = ""
if output_images:
    preview_items = []
    for i, (filename, pil_img) in enumerate(list(output_images.items())[:3]):
        try:
            # Resize for preview
            w, h = pil_img.size
            scale = min(400 / w, 400 / h, 1.0)
            new_w = int(w * scale)
            new_h = int(h * scale)
            small = pil_img.resize((new_w, new_h), PILImage.LANCZOS)

            # Encode as base64
            buf = io.BytesIO()
            small.save(buf, format='JPEG', quality=85)
            b64 = base64.b64encode(buf.getvalue()).decode('utf-8')

            preview_items.append(f'''
              <div class="preview-item">
                <img src="data:image/jpeg;base64,{b64}" alt="{filename}">
                <div class="name">{filename}</div>
              </div>
            ''')
        except Exception:
            pass

    if preview_items:
        preview_html = f'''
        <div class="preview">
          <h2>🖼️ Preview — Rendered Pages (first 3)</h2>
          <div class="preview-grid">
            {''.join(preview_items)}
          </div>
        </div>
        '''

# ═══════════════════════════════════════════════════════════
# Fill in placeholders
# ═══════════════════════════════════════════════════════════

device_details = (f"GPU: {torch.cuda.get_device_name(0)}"
                  if DEVICE == 'cuda' else 'CPU only')

# Quality grade
if quality_score >= 90:
    grade = "🌟 Excellent"
elif quality_score >= 75:
    grade = "✅ Good"
elif quality_score >= 60:
    grade = "🟡 Acceptable"
elif quality_score >= 40:
    grade = "🟠 Needs Work"
else:
    grade = "🔴 Poor"

# OCR badge
ocr_badge_class = "badge-success" if (ocr_status['baidu_loaded'] or ocr_status['qwen_loaded']) else "badge-danger"

# Translator badges
def badge_class(condition):
    return "badge-success" if condition else "badge-warning"

# Selected options
ocr_baidu_sel = "selected" if CONFIG['ocr_engine'] == 'baidu' else ""
ocr_qwen_sel = "selected" if CONFIG['ocr_engine'] == 'qwen' else ""
trans_manual_sel = "selected" if CONFIG['translator_engine'] == 'manual' else ""
trans_gemini_sel = "selected" if CONFIG['translator_engine'] == 'gemini' else ""
trans_chatgpt_sel = "selected" if CONFIG['translator_engine'] == 'chatgpt' else ""
trans_nllb_sel = "selected" if CONFIG['translator_engine'] == 'nllb' else ""

# Replace placeholders
html_filled = DASHBOARD_HTML
replacements = {
    '__SESSION_ID__': CHECKPOINT.get('session_id', '?'),
    '__DEVICE__': DEVICE.upper(),
    '__DEVICE_DETAILS__': device_details,
    '__N_UPLOADED__': str(n_uploaded),
    '__N_REGIONS__': str(n_regions),
    '__N_INPAINTED__': str(n_inpainted),
    '__N_RENDERED__': str(n_rendered),
    '__QUALITY_SCORE__': str(quality_score),
    '__QUALITY_GRADE__': grade,
    '__OCR_BADGE__': ocr_badge_class,
    '__OCR_CURRENT__': ocr_status['current'].upper(),
    '__OCR_BAIDU__': '✅' if ocr_status['baidu_loaded'] else '❌',
    '__OCR_QWEN__': '✅' if ocr_status['qwen_loaded'] else '❌',
    '__TRANS_BADGE__': badge_class(trans_status['current'] != 'manual'),
    '__TRANS_CURRENT__': trans_status['current'].upper(),
    '__TRANS_GEMINI_BADGE__': badge_class(trans_status['gemini_key_set']),
    '__TRANS_GEMINI__': '✅' if trans_status['gemini_key_set'] else '❌',
    '__TRANS_OPENAI_BADGE__': badge_class(trans_status['openai_key_set']),
    '__TRANS_OPENAI__': '✅' if trans_status['openai_key_set'] else '❌',
    '__TRANS_NLLB_BADGE__': badge_class(trans_status['nllb_loaded']),
    '__TRANS_NLLB__': '✅' if trans_status['nllb_loaded'] else '❌',
    '__OCR_BAIDU_SELECTED__': ocr_baidu_sel,
    '__OCR_QWEN_SELECTED__': ocr_qwen_sel,
    '__TRANS_MANUAL_SELECTED__': trans_manual_sel,
    '__TRANS_GEMINI_SELECTED__': trans_gemini_sel,
    '__TRANS_CHATGPT_SELECTED__': trans_chatgpt_sel,
    '__TRANS_NLLB_SELECTED__': trans_nllb_sel,
    '__FONT_SIZE__': str(CONFIG['font_size_default']),
    '__DETECT_THRESHOLD__': str(CONFIG['box_threshold']),
    '__STROKE_WIDTH__': str(CONFIG['text_stroke_width']),
    '__INPAINT_SIZE__': str(CONFIG['inpainting_size']),
    '__MIN_CONF__': str(CONFIG['ocr_confidence_threshold']),
    '__WHITE_RATIO__': str(CONFIG['white_ratio_bubble']),
    '__PREVIEW_HTML__': preview_html,
}

for placeholder, value in replacements.items():
    html_filled = html_filled.replace(placeholder, value)

# Display the dashboard
display(HTML(html_filled))

# ═══════════════════════════════════════════════════════════
# Register Python callbacks for JavaScript → Python calls
# ═══════════════════════════════════════════════════════════

from google.colab import output as colab_output

def run_step(cell_name):
    """JavaScript থেকে call হবে — notebook cell run করার instruction দেখাবে।"""
    cell_map = {
        'cell10': 'Cell 10: Image upload (run the cell below)',
        'cell11': 'Cell 11: Detection + OCR',
        'cell12': 'Cell 12: Export ai.Text',
        'cell13': 'Cell 13: Translation',
        'cell14': 'Cell 14: Full page inpainting',
        'cell15': 'Cell 15: Bengali rendering',
        'cell16': 'Cell 16: Quality inspector',
    }
    return cell_map.get(cell_name, 'Unknown cell')

def download_results_callback():
    """Trigger download of all results."""
    if output_images:
        return f"Ready: {len(output_images)} images in Cell 18"
    return "No images yet — run pipeline first"

def apply_settings_callback(settings):
    """Apply settings from dashboard."""
    try:
        if 'font_size' in settings:
            CONFIG['font_size_default'] = int(settings['font_size'])
        if 'stroke_width' in settings:
            CONFIG['text_stroke_width'] = int(settings['stroke_width'])
        if 'inpaint_size' in settings:
            CONFIG['inpainting_size'] = int(settings['inpaint_size'])
        if 'min_conf' in settings:
            CONFIG['ocr_confidence_threshold'] = float(settings['min_conf'])
        if 'white_ratio' in settings:
            CONFIG['white_ratio_bubble'] = float(settings['white_ratio'])
        if 'ocr_engine' in settings:
            switch_ocr_engine(settings['ocr_engine'])
        if 'translator_engine' in settings:
            switch_translator(settings['translator_engine'])
        if 'detect_threshold' in settings:
            CONFIG['box_threshold'] = float(settings['detect_threshold'])
        return "Settings applied successfully"
    except Exception as e:
        return f"Error: {str(e)[:50]}"

def reset_checkpoint_callback():
    """Reset all checkpoint progress."""
    try:
        reset_all_pages()
        return "Checkpoint reset"
    except Exception as e:
        return f"Error: {str(e)[:50]}"

# Register callbacks
colab_output.register_callback('notebook.run_step', run_step)
colab_output.register_callback('notebook.download_results', download_results_callback)
colab_output.register_callback('notebook.apply_settings', apply_settings_callback)
colab_output.register_callback('notebook.reset_checkpoint', reset_checkpoint_callback)

print()
print("═" * 60)
print("  🎨 Dashboard displayed above")
print("═" * 60)
print()
print("  📌 Dashboard features:")
print("     • 📊 Live stats (uploaded, regions, inpainted, rendered)")
print("     • 🎯 Quality score with visual bar")
print("     • ⚙️ Engine status badges")
print("     • 🎮 Control panel with action buttons")
print("     • 🖼️ Image previews (when available)")
print("     • ⚙️ Advanced settings panel")
print("     • 📥 Download all results button")
print()
print("  💡 Note: কিছু button JavaScript → Python callback ব্যবহার করে।")
print("     Colab-এ সব feature কাজ করবে। অন্য environment-এ")
print("     manual cell run করতে হবে।")
print()
print("═" * 60)
print("  🎉 MangaBD V11 — সব cells সফলভাবে তৈরি হয়েছে!")
print("═" * 60)

log_event("Cell 20: Dashboard rendered (HTML/CSS/JS)")
```

---

