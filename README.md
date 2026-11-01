# कलम (Kalam) - Hindi Manuscript & Poetry Authoring Studio

**कलम (Kalam)** is a zero-cost, local-first browser-based authoring environment designed specifically for Hindi novelists and poets. It features real-time spacebar transliteration from Hinglish to Devanagari, chapter and poem organization, and one-click publishing exports for **Google Docs**, **Amazon KDP**, **Notion Press**, and **Pothi**.

---

## 🌟 Key Features

1. **Instant Spacebar Transliteration**:
   - Type naturally in Hinglish: `namaste` + <kbd>Space</kbd> $\to$ **नमस्ते**, `kya baat hai` $\to$ **क्या बात है**.
   - **Zero Cost & Dual Engine**:
     - *Online*: Uses Google's input engine (via JSONP) for conversational Hinglish predictions with 1–5 candidate selections.
     - *Offline*: Includes a built-in phonetic mapping engine and 500+ high-frequency Hindi words dictionary so you can write without internet.
   - **Smart Backspace Recovery**: If you want to keep an English word (e.g. `iPhone` or `Dr.`), pressing <kbd>Backspace</kbd> immediately after space restores the original English text.
   - **Language Toggle**: Press <kbd>Ctrl + M</kbd> anytime to toggle between Hindi and English typing.

2. **Dedicated Novel & Poetry Modes**:
   - **उपन्यास (Novel Mode)**: Classic Indian book formatting with paragraph first-line indents, dialogue flow, and ornamental scene dividers (`❦  ❦  ❦`).
   - **कविता (Poetry Mode)**: Centered stanzas, custom verse spacing (<kbd>Shift + Enter</kbd> for a tight verse line, <kbd>Enter</kbd> for stanza spacing).

3. **Multi-Book Library (मेरी पुस्तकें)**:
   - Create and manage **multiple books simultaneously** (e.g. separate novels, poetry anthologies, short story collections).
   - Instant 1-click book switcher and bookshelf dashboard.
   - Each book maintains its own isolated chapters, stanzas, word counts, settings, and export workflows.

4. **Publishing-Ready Google Docs & KDP Export**:
   - **One-Click Google Docs Copy**: Places pre-formatted HTML (`text/html`) on your clipboard. When you paste into Google Docs (<kbd>Ctrl + V</kbd>), it preserves:
     - 12pt Devanagari serif font (`Noto Serif Devanagari` / `Mangal`)
     - Standard 1.5 line height & justified alignment
     - Proper H1/H2 chapter hierarchy and page-break dividers
   - **Microsoft Word (.doc / .docx)**: Download standard 6x9 inch trade size documents ready for upload to Amazon KDP Paperbacks, Notion Press, or Pothi.
   - **Print & PDF**: Instant print preview with standard 1-inch margins and pagination.
   - **Clean Markdown (.md)** & **Plain Text (.txt)**.

4. **100% Local-First & Zero Dependencies**:
   - No servers or paid API subscriptions required.
   - Auto-saves every keystroke into your browser's **IndexedDB**.
   - Includes **Project Backup (.kalam)** and **Restore** features to safeguard your work.

---

## 🚀 How to Run

You have two easy ways to use Kalam:

### Option 1: Direct Double-Click (Zero Setup)
Simply double-click `index.html` in Windows Explorer or open it in Google Chrome, Microsoft Edge, or Firefox.

### Option 2: Local Server (Optional)
If you have Python installed, you can run:
```powershell
python -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| <kbd>Space</kbd> | Transliterate previous English word to Hindi |
| <kbd>.</kbd> (Full Stop) | Auto-converts to Purna Viram (<kbd>।</kbd>) with suggestions |
| <kbd>..</kbd> (Double Dot) | Converts to Deergha Viram (<kbd>॥</kbd>) for poetry |
| <kbd>Backspace</kbd> (after conversion) | Undo transliteration and revert to English / period |
| <kbd>1</kbd> to <kbd>5</kbd> | Select alternative candidate from suggestion bar |
| <kbd>Ctrl + M</kbd> | Toggle Hindi / English typing mode |
| <kbd>Shift + Enter</kbd> | Soft verse break (Poetry mode) |
| <kbd>Ctrl + B</kbd> | Bold text |
| <kbd>Ctrl + I</kbd> | Italic text |
| <kbd>Ctrl + U</kbd> | Underline text |

---

## 📚 Book Publishing Guide

- **Amazon KDP (Paperback & Kindle)**: Use the **Export Modal $\to$ Word (.doc)** option or paste into Google Docs and export as `.docx` or `.kpf`.
- **Notion Press / Pothi**: Upload the downloaded `.doc` file with standard 1-inch margins and 1.5 line height.
- **Font Recommendation**: When publishing Hindi books, use standard Unicode fonts like `Noto Serif Devanagari` or `Mangal`. Kalam exports exclusively in pure UTF-8 Unicode, eliminating font corruption.

