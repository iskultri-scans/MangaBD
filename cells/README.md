# 📚 MangaBD V11 — Individual Cell Files

এই folder-এ প্রতিটা cell আলাদা ফাইলে আছে। যখন কোনো cell fix হবে, শুধু সেই ফাইলটাই update হবে।

## 📋 Cell List

| File | Cell | Description |
|------|------|-------------|
| [cell_01.py](cell_01.py) | Cell 1  | Installation & Environment Setup |
| [cell_02.py](cell_02.py) | Cell 2  | Import, Config & Global Setup |
| [cell_03.py](cell_03.py) | Cell 3  | Model Loading (CTD + Baidu + Qwen + LaMa) |
| [cell_04.py](cell_04.py) | Cell 4  | Checkpoint System |
| [cell_05.py](cell_05.py) | Cell 5  | Region Classification |
| [cell_06.py](cell_06.py) | Cell 6  | Text Detection (CTD) |
| [cell_07.py](cell_07.py) | Cell 7  | OCR Engine (Baidu + Qwen) |
| [cell_08.py](cell_08.py) | Cell 8  | Inpainting Engine (LaMa Large) |
| [cell_09.py](cell_09.py) | Cell 9  | Bengali Text Renderer |
| [cell_10.py](cell_10.py) | Cell 10 | Input (Image Upload) |
| [cell_11.py](cell_11.py) | Cell 11 | Detection + OCR + Verification |
| [cell_12.py](cell_12.py) | Cell 12 | Export (ai.Text) |
| [cell_13.py](cell_13.py) | Cell 13 | Translation (Manual/Gemini/ChatGPT/NLLB) |
| [cell_14.py](cell_14.py) | Cell 14 | Full Page Inpainting |
| [cell_15.py](cell_15.py) | Cell 15 | Bengali Text Rendering |
| [cell_16.py](cell_16.py) | Cell 16 | Quality Inspector |
| [cell_17.py](cell_17.py) | Cell 17 | Manual Fix |
| [cell_18.py](cell_18.py) | Cell 18 | Preview & Download |
| [cell_19.py](cell_19.py) | Cell 19 | Session Log |
| [cell_20.py](cell_20.py) | Cell 20 | Dashboard (HTML/CSS/JS) |

## 🔄 How to Update a Cell

যখন তুমি কোনো cell-এ error পাবে, আমাকে বলো:
> "Cell 6 তে error: [error message]"

আমি:
1. শুধু সেই একটা cell file update করব
2. GitHub-এ push করব
3. তোমাকে বলব: "Cell 6 updated — [link] থেকে copy করে paste করো"

তুমি:
1. সেই link খুলবে
2. পুরো code copy করবে
3. Colab-এ পুরোনো Cell 6 select করে delete করে, নতুন code paste করবে
4. Run করবে

## 📊 Latest Updates

| Date | Cell | What Changed |
|------|------|--------------|
| Latest | Cell 6 | Added textline_merge integration + safety restore |

---

**Note:** `MangaBD_V11.ipynb` (main notebook) ও `all_cells.md` (single reference file) ও আছে, কিন্তু তুমি চাইলে শুধু এই `cells/` folder থেকেই কাজ করতে পারো। প্রতিটা cell আলাদা ফাইলে থাকায় কোনটা update হয়েছে সহজে বোঝা যাবে।
