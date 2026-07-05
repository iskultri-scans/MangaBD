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
    # NOTE: Baidu Unlimited-OCR এর documentation বলছে transformers==4.57.1
    # দরকার। আমরা সেটাই pin করছি যাতে Baidu এর custom code ঠিকভাবে চলে।
    "transformers==4.57.1",
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
    # Baidu OCR deps (needed by baidu/Unlimited-OCR trust_remote_code)
    # Official requirements from https://huggingface.co/baidu/Unlimited-OCR
    "addict>=2.4.0",
    "easydict>=1.13",
    "pymupdf>=1.27.0",
    # RT-DETR for Comic Bubble Detection (ogkalu/comic-text-and-bubble-detector)
    # Uses HuggingFace transformers — no extra package needed
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
    # textline_merge: KEEP ORIGINAL (Cell 6 uses it to group lines into bubbles)
    # 'manga_translator/textline_merge/__init__.py': '# Patched by MangaBD V11 (empty stub)\n',
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

# ── PyTorch compatibility shim for zyddnys YOLOv5 code ──
print("─" * 60)
print("  🔧 PyTorch compatibility shim")
print("─" * 60)

# zyddnys এর CTD/YOLOv5 code পুরোনো PyTorch এর জন্য লেখা।
# PyTorch 2.11+ এ torch._utils module টা exists করে, কিন্তু কিছু
# internal function (যেমন _rebuild_parameter, _get_device_index)
# সরিয়ে দেওয়া হয়েছে। এই functions গুলো checkpoint loading এর
# সময় torch._weights_only_unpickler এ দরকার হয়।
import torch as _torch
import types

# torch._utils কে ensure করি যে সে module হিসেবে exists করছে
if not hasattr(_torch, '_utils'):
    _torch._utils = types.ModuleType('torch._utils')
    print(f"  ℹ️ Created torch._utils (was missing)")
else:
    print(f"  ℹ️ torch._utils already exists")

# PyTorch এর বিভিন্ন internal function গুলো _utils এ সরিয়ে দেওয়া হয়েছে
# আমরা সেগুলো আবার যোগ করছি (no-op বা real implementation সহ)
_added = []

# _rebuild_parameter — used by checkpoint loading
if not hasattr(_torch._utils, '_rebuild_parameter'):
    # Real implementation: rebuild a Parameter from data
    def _rebuild_parameter(data, requires_grad, backward_hooks):
        param = _torch.nn.Parameter(data, requires_grad=requires_grad)
        if backward_hooks:
            param._backward_hooks = backward_hooks
        return param
    _torch._utils._rebuild_parameter = _rebuild_parameter
    _added.append('_rebuild_parameter')

# _rebuild_tensor — used by checkpoint loading
if not hasattr(_torch._utils, '_rebuild_tensor'):
    def _rebuild_tensor(storage, storage_offset, size, stride, requires_grad,
                        backward_hooks, metadata=None):
        # Create a tensor from storage
        if isinstance(storage, _torch.Storage):
            tensor = storage.as_tensor()
        else:
            tensor = storage
        tensor = tensor[offset:offset + size[0]] if size else tensor
        return tensor
    _torch._utils._rebuild_tensor = _rebuild_tensor
    _added.append('_rebuild_tensor')

# _rebuild_tensor_v2 — newer version
if not hasattr(_torch._utils, '_rebuild_tensor_v2'):
    def _rebuild_tensor_v2(storage, storage_offset, size, stride, requires_grad,
                           backward_hooks, metadata=None):
        return _torch._utils._rebuild_tensor(storage, storage_offset, size, stride,
                                              requires_grad, backward_hooks, metadata)
    _torch._utils._rebuild_tensor_v2 = _rebuild_tensor_v2
    _added.append('_rebuild_tensor_v2')

# _get_device_index — used by torch._dynamo
if not hasattr(_torch._utils, '_get_device_index'):
    def _get_device_index(param, optional=False, allow_cpu=False):
        if param is None:
            if optional:
                return None
            raise RuntimeError("device index is None")
        if isinstance(param, int):
            return param
        if isinstance(param, str):
            # Parse 'cuda:0' style strings
            if ':' in param:
                dev, idx = param.split(':')
                return int(idx)
            return -1 if param == 'cpu' else 0
        if hasattr(param, 'index'):
            return param.index
        if hasattr(param, 'idx'):
            return param.idx
        return int(param)
    _torch._utils._get_device_index = _get_device_index
    _added.append('_get_device_index')

if _added:
    print(f"  ✅ Added {len(_added)} missing functions to torch._utils:")
    for fn in _added:
        print(f"     • torch._utils.{fn}")
else:
    print(f"  ✅ All required functions already present")

print(f"  ℹ️ PyTorch version: {_torch.__version__}")
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
