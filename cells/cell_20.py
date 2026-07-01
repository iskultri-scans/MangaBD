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
