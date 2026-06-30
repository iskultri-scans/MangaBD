# 🤖 AI Developer Instructions

## 📋 Your Task
Build **MangaBD V11** - a production-quality Bengali manga translator as a Google Colab notebook.

## 📚 Step 1: Get the Reference Materials

The repo is **public**, so you can clone it without any token:

```bash
git clone https://github.com/iskultri-scans/MangaBD.git
cd MangaBD
```

### Files to read (IN THIS ORDER):
1. **`PROMPT.md`** - Complete task specification (READ THIS FIRST, FULLY)
2. **`reference/MangaBd_V1.ipynb`** - User's working first version (19 cells, 12875 lines)
   - This is PROVEN WORKING code - use it as your base
   - Keep the good parts (checkpoint, quality inspector, region classification)
   - Replace the broken parts (OCR, detection, inpainting, rendering)
3. **`fonts/`** - Bengali fonts (NotoSansBengali Regular + Bold)

## 🎯 Step 2: Understand the Goal

Build V11 by UPGRADING the V1 notebook. Key changes:

| Component | V1 (current) | V11 (target) |
|-----------|-------------|--------------|
| OCR | EasyOCR+Paddle+Tesseract | **Baidu Unlimited + Qwen 2.5 VL 3B** |
| Detection | ONNX Comic Detector | **CTD (PyTorch, inline from zyddnys)** |
| Inpainting | SimpleLama | **LaMa Large (inline from zyddnys)** |
| Rendering | arabic_reshaper ❌ | **Pillow + libraqm** ✅ |
| Translation | Manual only | **Manual + Gemini + ChatGPT + NLLB** |
| Model storage | Colab local (lost on disconnect) | **Google Drive (permanent)** |
| UI | Cells only | **+ HTML/CSS/JS Dashboard** |

## 🔧 Step 3: Technical Approach

### zyddnys Integration (CRITICAL)
Do NOT `import manga_translator` — it triggers `rusty_manga_image_translator` which is hard to install.

Instead:
1. Clone zyddnys repo: `git clone https://github.com/zyddnys/manga-image-translator.git`
2. Copy ONLY these classes INLINE into your notebook cells:
   - `ComicTextDetector` from `detection/ctd.py`
   - `LamaLargeInpainter` from `inpainting/inpainting_lama_mpe.py`
3. Remove external dependencies from the copied code
4. Download model weights directly from zyddnys GitHub releases

### Async Handling
zyddnys functions are async. Use this helper:
```python
import asyncio
import nest_asyncio
nest_asyncio.apply()

def _run_async(coro):
    try:
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)
```

### Google Drive Storage
```python
from google.colab import drive
drive.mount('/content/drive')
DRIVE_DIR = '/content/drive/MyDrive/MangaBD'
MODELS_DIR = f'{DRIVE_DIR}/models'
os.environ['HF_HOME'] = MODELS_DIR  # HuggingFace cache to Drive
```

### Bengali Rendering (CRITICAL FIX)
```python
# ❌ WRONG (V1 had this):
import arabic_reshaper  # This is for Arabic, NOT Bengali!
from bidi.algorithm import get_display

# ✅ CORRECT (V11):
from PIL import Image, ImageDraw, ImageFont
# Pillow with libraqm handles Bengali conjuncts natively
# Just use ImageFont.truetype() + ImageDraw.text()
```

## 📦 Step 4: Build the Notebook

Create `MangaBD_V11.ipynb` with these cells (see PROMPT.md for details):

1. Installation
2. Config & Global Setup
3. Model Loading (Google Drive cached)
4. Checkpoint System (from V1)
5. Region Classification (from V1)
6. Text Detection (NEW - CTD inline)
7. OCR Engine (NEW - Baidu + Qwen)
8. Inpainting (NEW - LaMa Large inline)
9. Bengali Renderer (NEW - Pillow+libraqm)
10. Input (from V1)
11. Detection + OCR + Verification (from V1)
12. Export (MODIFIED - ai.Text only, no JSON/CSV)
13. Translation (ALL - Manual/Gemini/ChatGPT/NLLB)
14. Full Page Inpainting (from V1)
15. Bengali Rendering (from V1)
16. Quality Inspector (from V1)
17. Manual Fix (from V1)
18. Preview & Download (from V1)
19. Session Log (from V1)
20. 🎨 Dashboard (NEW - HTML/CSS/JS)

## ✅ Step 5: Quality Checklist

Before declaring complete:
- [ ] All 20 cells run without errors in fresh Colab
- [ ] First run downloads models to Google Drive (~3GB)
- [ ] Second run loads from Drive in < 60 sec
- [ ] CTD detects rotated/tilted text
- [ ] Baidu OCR works
- [ ] Qwen VL OCR works as backup
- [ ] LaMa Large removes text cleanly
- [ ] Bengali conjuncts (যুক্তাক্ষর) render correctly
- [ ] All 4 translators work
- [ ] Dashboard UI functional
- [ ] Checkpoint system resumes after crash
- [ ] Batch translation works with ZIP

## 📤 Step 6: Submit Your Work

Since the repo is public, you can clone it. But to push your work back:

### Option A: Fork + Pull Request (recommended)
1. Fork the repo to your GitHub account
2. Clone your fork
3. Create `MangaBD_V11.ipynb`
4. Push to your fork
5. Open a Pull Request to `iskultri-scans/MangaBD`

### Option B: User adds you as collaborator
Ask the user to add your GitHub account as a collaborator:
- Go to: https://github.com/iskultri-scans/MangaBD/settings/access
- Click "Add people"
- Enter your GitHub username
- Then you can push directly to `main`

### Option C: User gives you a Personal Access Token
The user can create a fine-grained token with ONLY `contents: write` permission for this one repo:
- Go to: https://github.com/settings/tokens?type=beta
- Click "Generate new token"
- Repository access: Only select `iskultri-scans/MangaBD`
- Permissions: Contents = Read and write
- Expiration: 7 days (short-lived for safety)
- Share the token with you privately

Then push with:
```bash
git remote set-url origin https://YOUR_TOKEN@github.com/iskultri-scans/MangaBD.git
git add MangaBD_V11.ipynb
git commit -m "V11: Production-quality Bengali manga translator"
git push origin main
```

## 🎯 Priority

**QUALITY IS THE #1 PRIORITY.**
- Take whatever time needed
- Write whatever code needed
- Use as many cells as needed
- But deliver excellence

## 📖 Quick Reference Links

- zyddnys repo: https://github.com/zyddnys/manga-image-translator
- Baidu OCR: https://huggingface.co/baidu/Unlimited-OCR
- Qwen 2.5 VL: https://huggingface.co/Qwen/Qwen2.5-VL-3B-Instruct
- LaMa Large model: https://huggingface.co/dreMaz/AnimeMangaInpainting
- CTD model releases: https://github.com/zyddnys/manga-image-translator/releases

---

**Now read PROMPT.md for full specifications, then start building!**
