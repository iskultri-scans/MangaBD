# MangaBD - Bengali Manga Translator

## 📋 Task
Build MangaBD V11 - a production-quality Bengali manga translator as a Google Colab notebook.

**See [PROMPT.md](PROMPT.md) for complete specifications.**

## 📚 Contents
- `PROMPT.md` - Complete task specification (READ THIS FIRST)
- `reference/MangaBd_V1.ipynb` - User's first version (reference)
- `fonts/NotoSansBengali-Regular.ttf` - Bengali font
- `fonts/NotoSansBengali-Bold.ttf` - Bengali bold font

## 🎯 Goal
Quality is the #1 priority. Take whatever cells/code needed, but deliver excellence.

## 🔧 Tech Stack
- **Detection**: CTD (Comic Text Detector)
- **OCR**: Baidu Unlimited (primary) + Qwen 2.5 VL 3B (backup)
- **Translation**: Manual / Gemini / ChatGPT / NLLB
- **Inpainting**: LaMa Large
- **Rendering**: Pillow + libraqm + NotoSansBengali
- **Storage**: Google Drive (models persist across sessions)
- **UI**: HTML/CSS/JS Dashboard

## 📖 References
- zyddnys/manga-image-translator: https://github.com/zyddnys/manga-image-translator
- Baidu OCR: https://huggingface.co/baidu/Unlimited-OCR
- Qwen 2.5 VL: https://huggingface.co/Qwen/Qwen2.5-VL-3B-Instruct
