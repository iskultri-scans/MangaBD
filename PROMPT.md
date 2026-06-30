# 📝 TASK: Build MangaBD V11 - Bengali Manga Translator

## 🎯 OBJECTIVE
Build a **production-quality** Bengali manga translator as a Google Colab notebook. Quality is the #1 priority — take as many cells as needed, write as much code as needed, but the output must be excellent.

## 📚 REFERENCE MATERIALS

### 1. User's First Version (MUST READ)
File: `reference/MangaBd_V1.ipynb`

This is the user's first version built with hard work. It has 19 cells with:
- ✅ Checkpoint system (keep this)
- ✅ Region classification (keep this)
- ✅ Quality inspector (keep this)
- ✅ Manual fix templates (keep this)
- ✅ Session log (keep this)
- ✅ ai.Text export format (keep this)

**Problems to fix:**
- ❌ arabic_reshaper for Bengali (WRONG - use Pillow+libraqm instead)
- ❌ 3 OCR engines (EasyOCR+Paddle+Tesseract) - replace with Baidu+Qwen
- ❌ ONNX Comic Detector - replace with CTD PyTorch
- ❌ SimpleLama - replace with LaMa Large
- ❌ PaddleOCR never worked properly

### 2. zyddnys/manga-image-translator (Reference)
GitHub: https://github.com/zyddnys/manga-image-translator

Extract these components INLINE (do not import the package - it has dependency chain issues with rusty_manga_image_translator):

- `detection/ctd.py` → ComicTextDetector class (CTD detection)
- `inpainting/inpainting_lama_mpe.py` → LamaLargeInpainter class (text removal)
- `rendering/text_render_pillow_eng.py` → Pillow rendering logic
- reader.py logic → bubble-fit text sizing

### 3. HuggingFace Models
- **Baidu/Unlimited-OCR**: https://huggingface.co/baidu/Unlimited-OCR (primary OCR, free)
- **Qwen/Qwen2.5-VL-3B-Instruct**: https://huggingface.co/Qwen/Qwen2.5-VL-3B-Instruct (backup OCR)

### 4. Bengali Fonts (provided)
- `fonts/NotoSansBengali-Regular.ttf`
- `fonts/NotoSansBengali-Bold.ttf`

---

## 🏗️ ARCHITECTURE: Cell-Based Notebook

Google Colab notebook with sequential cells. Each cell:
- Has clear purpose
- Includes self-test at the end
- Uses Bengali + English comments (bilingual)
- Shows progress with emojis
- Handles errors gracefully with fallbacks

---

## 📦 COMPONENT SPECIFICATIONS

### Cell 1: Installation
Install packages:
```
transformers, torch (Colab pre-installed - DO NOT reinstall),
torchvision (Colab pre-installed - DO NOT reinstall),
Pillow (with libraqm support), opencv-python-headless,
google-genai, openai, pydantic>=2.5,<3, pydantic-core>=2.14,
nest-asyncio, huggingface_hub, accelerate, bitsandbytes,
sentencepiece, protobuf, einops, kornia, timm, safetensors,
networkx, shapely, pyclipper, freetype-py, pyhyphen, langcodes[data],
py3langid, langdetect, scikit-image, omegaconf, python-dotenv,
colorama, rich, tqdm, arabic-reshaper, python-bidi
```
Verify each install. Download Bengali font to Google Drive.

### Cell 2: Config & Global Setup
- Mount Google Drive at `/content/drive/MyDrive/MangaBD/`
- Create directories: models/, fonts/, results/
- CONFIG dict with all settings
- Model paths point to Google Drive (persistent)
- Set HF_HOME to Google Drive for model caching
- Bengali font path

### Cell 3: Model Loading (Google Drive cached)
Load models (first time downloads ~3GB to Google Drive, later loads in 30sec):

1. **CTD (Comic Text Detector)** - for text detection
   - Inline the ComicTextDetector class from zyddnys
   - Download model from zyddnys GitHub releases
   - Save to Google Drive

2. **Baidu/Unlimited-OCR** - primary OCR
   - Load from HuggingFace with cache_dir=Google Drive
   - trust_remote_code=True

3. **Qwen 2.5 VL 3B** - backup OCR
   - Load from HuggingFace with cache_dir=Google Drive
   - torch_dtype=float16, device_map=auto

4. **LaMa Large** - inpainting
   - Inline the LamaLargeInpainter class from zyddnys
   - Download model from HuggingFace dreMaz/AnimeMangaInpainting

Each model: self-test with sample input.

### Cell 4: Checkpoint System (from V1)
- save_checkpoint(), load_checkpoint(), mark_page_done(), is_page_done()
- JSON file in Google Drive
- Per-page status: ocr_done, inpaint_done, render_done
- Resume after Colab crash

### Cell 5: Region Classification (from V1)
- classify_region(): bubble / thought / narrator / sfx / overlay
- Heuristics: white_ratio, position (top/bottom 20%), aspect_ratio
- Self-tests

### Cell 6: Text Detection (NEW - CTD)
- Use ComicTextDetector (inlined from zyddnys)
- Detect text regions with quadrilateral output (4 corner points)
- Handle rotated/tilted text automatically
- Output: list of regions + pixel-level text mask
- Self-test

### Cell 7: OCR Engine (NEW)
- **Primary: Baidu/Unlimited-OCR**
- **Backup: Qwen 2.5 VL 3B**
- Switch function to change engine anytime
- Preprocessing: upscale 2x if height < 40px, denoise
- Return: text + confidence score
- Self-test

### Cell 8: Inpainting (NEW - LaMa Large)
- Use LamaLargeInpainter (inlined from zyddnys)
- OpenCV TELEA fallback if LaMa fails
- Adaptive mask dilation based on text stroke width
- Self-test

### Cell 9: Bengali Renderer (NEW - Pillow+libraqm)
- **Pillow with libraqm** for proper Bengali conjunct shaping
- ❌ NO arabic_reshaper (it was wrong for Bengali)
- NotoSansBengali-Regular.ttf font
- Auto-fit font size (area-based: large bubbles=32px, small=12px)
- reader.py logic: fit text to bubble size properly
- Text wrapping with word boundaries
- Center alignment (horizontal + vertical)
- Stroke/border support for readability
- **Self-test: verify Bengali conjuncts (যুক্তাক্ষর) render correctly**

### Cell 10: Input (from V1)
- google.colab.files.upload()
- Multiple format support (jpg, png, webp, bmp)
- Image preview
- Reject images < 50x50

### Cell 11: Detection + OCR + Verification (from V1)
- Run CTD detection → OCR → English text filter
- Visual verification: detection map, per-region crops
- Build DataFrame with results

### Cell 12: Export (MODIFIED - ai.Text only)
- ❌ NO JSON export
- ❌ NO CSV export
- ✅ ai.Text format only: `[ID] English text →`
- For manual translation workflow
- Auto-download

### Cell 13: Translation (ALL OPTIONS)
Switch between translators anytime:
- ✅ **Manual**: upload ai.Text file with translations
- ✅ **Gemini API**: automatic, free tier, set GOOGLE_GEMINI_API_KEY
- ✅ **ChatGPT API**: automatic, paid, best quality, set OPENAI_API_KEY
- ✅ **NLLB** (Facebook): offline free, loads from Google Drive
- Switch function: change translator anytime
- Bengali character validation

### Cell 14: Full Page Inpainting (from V1)
- Run LaMa Large on each page
- Before/after preview
- Per-region closeup (Original → Mask → Result)

### Cell 15: Bengali Rendering (from V1)
- Use Cell 9 renderer
- Per-page render with tqdm progress
- Font-size distribution chart
- Preview + closeup

### Cell 16: Quality Inspector (from V1)
- 8 quality checks per region:
  1. Empty translation
  2. Untranslated markers ([EMPTY], [SFX], [OCR_FAILED])
  3. Translation == original
  4. Font overflow warning
  5. Low OCR confidence
  6. Very long translation (>3x original)
  7. Re-run OCR on output (detect remaining English)
  8. Bengali character check
- Quality score: 🌟/✅/🟡/🟠/🔴

### Cell 17: Manual Fix (from V1)
- Copy-paste fix templates
- Translation edit, region-type change, region delete
- Auto-generate fixes dict from current data

### Cell 18: Preview & Download (from V1)
- Original vs final comparison
- Closeup comparisons
- Download translated images
- ZIP for batch

### Cell 19: Session Log (from V1)
- Statistics: duration, pages, regions, translations
- OCR method breakdown
- Quality score distribution
- Save log file

### Cell 20: 🎨 DASHBOARD (NEW - HTML/CSS/JS)
Unified control panel using IPython.display.HTML():

Features:
- 📤 Image upload area (drag-drop)
- 🔄 OCR engine dropdown: Baidu / Qwen
- 🌐 Translator dropdown: Manual / Gemini / ChatGPT / NLLB
- ▶️ Translate button
- 📊 Progress indicator
- 🖼️ Result preview (side-by-side original vs translated)
- 📥 Download button
- 📈 Quality score display
- ⚙️ Settings panel (font size, detection threshold, etc.)

Use clean, modern UI with:
- CSS Grid/Flexbox layout
- Dark theme (easier on eyes)
- Responsive design
- JavaScript for interactivity
- Backend calls via Python callbacks

---

## 🔧 TECHNICAL REQUIREMENTS

### Google Drive Model Storage
```
/content/drive/MyDrive/MangaBD/
├── models/
│   ├── ctd/              # Comic Text Detector
│   ├── baidu_ocr/        # Baidu Unlimited OCR
│   ├── qwen_vl/          # Qwen 2.5 VL 3B
│   ├── lama_large/       # LaMa Large inpainting
│   └── nllb/             # NLLB translation (optional)
├── fonts/
│   ├── NotoSansBengali-Regular.ttf
│   └── NotoSansBengali-Bold.ttf
├── results/              # Translated images
└── checkpoint.json       # Resume state
```

### zyddnys Integration (INLINE, not import)
**CRITICAL**: Do NOT `import manga_translator` - it triggers a dependency chain that requires `rusty_manga_image_translator` which is hard to install.

Instead:
1. Clone zyddnys repo to `/content/manga-image-translator/`
2. Copy ONLY the needed class files into the notebook as inline code:
   - `ComicTextDetector` from `detection/ctd.py`
   - `LamaLargeInpainter` from `inpainting/inpainting_lama_mpe.py`
3. Modify them to remove external dependencies
4. Download model weights directly from zyddnys GitHub releases

### Rotated Text Detection
- CTD outputs quadrilateral (4 corner points)
- Calculate angle from corner points
- Apply rotation when rendering Bengali text
- Handle 0°, 90°, 180°, 270° + arbitrary angles

### Upscale System
- If image width or height < 800px, upscale 2x
- Use ESRGAN if available, else Lanczos interpolation
- Preserve aspect ratio

### Error Handling
- Every cell: try/except with clear error messages
- Graceful fallbacks (LaMa → OpenCV, Baidu → Qwen, etc.)
- Bengali + English error messages

### Async Handling
- zyddnys functions are async - use `_run_async()` helper with nest_asyncio
- Colab has its own event loop - nest_asyncio.apply() required

---

## ✅ QUALITY CHECKLIST

Before declaring complete, verify:
- [ ] All 20 cells run without errors in fresh Colab session
- [ ] First run downloads models to Google Drive (~3GB)
- [ ] Second run loads from Google Drive in < 60 sec
- [ ] CTD detects rotated/tilted text correctly
- [ ] Baidu OCR extracts text with > 80% accuracy
- [ ] Qwen VL OCR works as backup
- [ ] LaMa Large removes text cleanly (no artifacts)
- [ ] Bengali conjuncts (যুক্তাক্ষর) render correctly
- [ ] All 4 translators work (Manual, Gemini, ChatGPT, NLLB)
- [ ] Dashboard UI is functional and beautiful
- [ ] Quality inspector catches issues
- [ ] Checkpoint system resumes after crash
- [ ] Batch translation works with ZIP upload/download

---

## 🚀 OUTPUT

Single Google Colab notebook file: `MangaBD_V11.ipynb`

- Bilingual comments (Bengali + English)
- Self-tests in every cell
- Progress feedback with emojis
- Clean, production-quality code
- No shortcuts on quality

**QUALITY IS THE #1 PRIORITY. Take whatever time needed, write whatever code needed, but deliver excellence.**
