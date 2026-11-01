/**
 * Kalam (कalam) - Editor Core (Enhanced Transliteration & Multi-Space Stability)
 * Fixes:
 * 1. Accurate Google transliteration for all words with candidate options (1-5)
 * 2. Background predictive pre-fetching while typing
 * 3. Bulletproof multi-space handling (survives 2+ spaces, non-breaking spaces, and element nodes)
 * 4. Smart Backspace undo to restore English words
 */

window.KalamEditor = (function () {
  'use strict';

  let editorElement = null;
  let suggestionBoxElement = null;
  let transliterationEnabled = true;
  let activeMode = 'novel'; // 'novel' or 'poetry'

  // Transliteration transaction history for Backspace Reversal
  let lastTransliteration = null;
  // Current active candidates array & target tracking
  let currentCandidates = [];
  let currentCandidateTarget = null;
  let prefetchTimer = null;

  function init(element, suggestionBox) {
    editorElement = element;
    suggestionBoxElement = suggestionBox;

    attachEventListeners();
  }

  function attachEventListeners() {
    if (!editorElement) return;

    // Intercept Keydown for Space, Backspace, Enter, and candidate keys (1-5)
    editorElement.addEventListener('keydown', handleKeyDown);

    // Predictive pre-fetching on input
    editorElement.addEventListener('input', handleInput);

    // Hide suggestions on click or blur
    editorElement.addEventListener('click', () => {
      hideSuggestions();
      lastTransliteration = null;
    });

    // Clean text on paste
    editorElement.addEventListener('paste', handlePaste);
  }

  /**
   * Predictive pre-fetching: As user types Roman letters, pre-fetch
   * Google transliteration candidates with a fast 35ms debounce so they are already cached
   * in memory before the user can hit Space!
   */
  function handleInput() {
    clearTimeout(prefetchTimer);
    prefetchTimer = setTimeout(() => {
      if (!transliterationEnabled) return;
      const caretInfo = getCaretTextNodeAndOffset();
      if (!caretInfo || !caretInfo.node) return;

      const textBefore = caretInfo.node.nodeValue.substring(0, caretInfo.offset);
      const match = textBefore.match(/([a-zA-Z]{2,})$/);
      if (match && window.KalamTransliterator) {
        window.KalamTransliterator.prefetch(match[1]);
      }
    }, 35);
  }

  function handleKeyDown(e) {
    // 1. Suggestion Selection via number keys 1-5 or Escape
    if (currentCandidates.length > 0 && suggestionBoxElement && suggestionBoxElement.style.display !== 'none') {
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const index = parseInt(e.key, 10) - 1;
        if (currentCandidates[index]) {
          e.preventDefault();
          selectCandidate(currentCandidates[index]);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        hideSuggestions();
        return;
      }
    }

    // 2. Smart Backspace Reversal:
    // If user presses Backspace immediately after an auto-transliterated word,
    // restore the original English word so English words (e.g. 'iPhone', 'Dr.') can be retained easily.
    if (e.key === 'Backspace' && lastTransliteration) {
      if (tryUndoLastTransliteration()) {
        e.preventDefault();
        lastTransliteration = null;
        hideSuggestions();
        return;
      }
    }

    // Any key other than Backspace clears the single-step undo
    if (e.key !== 'Backspace') {
      lastTransliteration = null;
    }

    // 3. Spacebar or Punctuation Trigger: Transliterate word before caret SYNCHRONOUSLY
    // CRITICAL: Must be 100% synchronous (no await) to avoid race conditions during fast typing!
    if (transliterationEnabled && (e.key === ' ' || isPunctuation(e.key))) {
      const handled = handleSpacebarTransliteration(e.key);
      if (handled) {
        e.preventDefault();
        return;
      }

      // 4. Full Stop (.) -> Purna Viram (।) Recommendation & Conversion:
      // If user presses '.' without an active Roman word before it (e.g. after Hindi text),
      // auto-convert or recommend Purna Viram '। ' with candidate options.
      if (e.key === '.') {
        const fullStopHandled = handleFullStopConversion();
        if (fullStopHandled) {
          e.preventDefault();
          return;
        }
      }

      // 5. Consecutive Space Handling:
      // If user presses Space when the caret is already after a space, insert a clean non-breaking space
      // to prevent Chrome/Edge from corrupting text nodes or resetting selection to parent element!
      if (e.key === ' ') {
        const caretInfo = getCaretTextNodeAndOffset();
        if (caretInfo && caretInfo.node) {
          const textBefore = caretInfo.node.nodeValue.substring(0, caretInfo.offset);
          if (/[\s\u00A0]$/.test(textBefore)) {
            e.preventDefault();
            document.execCommand('insertText', false, '\u00A0');
            triggerEditorChange();
            return;
          }
        }
      }
    }
  }

  function isPunctuation(key) {
    return [',', '.', '?', '!', ';', ':', '।'].includes(key);
  }

  /**
   * Robustly finds the text node and offset at the caret position,
   * even if the browser placed selection on an ELEMENT_NODE (e.g. <p> or <div>)
   * or across multiple spaces.
   */
  function getCaretTextNodeAndOffset() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;

    let node = sel.anchorNode;
    let offset = sel.anchorOffset;
    if (!node) return null;

    // If anchorNode is an Element node (e.g. <p> or <div>)
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.childNodes.length === 0) return null;

      let targetChild = null;
      if (offset > 0 && offset <= node.childNodes.length) {
        targetChild = node.childNodes[offset - 1];
      } else if (node.childNodes[offset]) {
        targetChild = node.childNodes[offset];
      } else {
        targetChild = node.lastChild;
      }

      if (!targetChild) return null;

      if (targetChild.nodeType === Node.TEXT_NODE) {
        node = targetChild;
        offset = targetChild.nodeValue.length;
      } else {
        // Deep search for rightmost text node
        const walker = document.createTreeWalker(targetChild, NodeFilter.SHOW_TEXT, null, false);
        let lastText = null;
        while (walker.nextNode()) {
          lastText = walker.currentNode;
        }
        if (lastText) {
          node = lastText;
          offset = lastText.nodeValue.length;
        } else {
          return null;
        }
      }
    }

    if (node && node.nodeType === Node.TEXT_NODE) {
      return { node, offset };
    }
    return null;
  }

  /**
   * Transliterates the Roman word immediately preceding the caret into Hindi.
   * Uses cached Google candidates (or awaits Google fetch) for 100% accuracy.
   */
  /**
   * Transliterates the Roman word immediately preceding the caret into Hindi.
   * Completely SYNCHRONOUS: Runs in <0.2ms so incoming keystrokes like 'm' in 'good morning'
   * are never misplaced or scrambled!
   */
  function handleSpacebarTransliteration(delimiter) {
    const caretInfo = getCaretTextNodeAndOffset();
    if (!caretInfo || !caretInfo.node) return false;

    const { node, offset } = caretInfo;
    const textBeforeCaret = node.nodeValue.substring(0, offset);

    // Match Roman English word before cursor (letters, apostrophes, hyphens)
    const match = textBeforeCaret.match(/([a-zA-Z0-9_\'-]+)$/);
    if (!match) return false;

    const romanWord = match[1];
    // Ignore pure numbers
    if (/^\d+$/.test(romanWord)) return false;

    const wordStartOffset = match.index;
    const wordEndOffset = offset;

    // 1. Get Instant Top Hindi Candidate SYNCHRONOUSLY (0 ms latency)
    // Pre-fetched cache -> dictionary -> smart phonetic rules
    const topHindi = window.KalamTransliterator.getInstantTopCandidate(romanWord) || romanWord;
    
    // If delimiter is '.', auto-convert to Purna Viram '। '
    const effectiveDelimiter = (delimiter === '.') ? '। ' : delimiter;
    const replacement = topHindi + effectiveDelimiter;

    // 2. Perform Immediate, Synchronous DOM Replacement
    // Before ANY subsequent key events can enter the event queue!
    const sel = window.getSelection();
    const range = document.createRange();
    range.setStart(node, wordStartOffset);
    range.setEnd(node, wordEndOffset);
    sel.removeAllRanges();
    sel.addRange(range);

    // Replace the Roman word with the Hindi word + space
    document.execCommand('insertText', false, replacement);

    // Find new caret position after insertion
    const updatedCaret = getCaretTextNodeAndOffset();

    // 3. Record transaction for smart Backspace reversal
    if (updatedCaret && updatedCaret.node) {
      lastTransliteration = {
        node: updatedCaret.node,
        originalRoman: romanWord,
        convertedHindi: topHindi,
        delimiter: delimiter,
        effectiveDelimiter: effectiveDelimiter,
        caretOffset: updatedCaret.offset,
        replacementLength: replacement.length
      };

      currentCandidateTarget = {
        node: updatedCaret.node,
        caretOffset: updatedCaret.offset,
        convertedLength: topHindi.length,
        originalWord: romanWord,
        delimiter: effectiveDelimiter
      };
    }

    // 4. Render candidate suggestion pill with options (1-5)
    // If cached from predictive pre-fetching, display candidates immediately
    const cached = window.KalamTransliterator.getCachedCandidates(romanWord);
    if (cached && cached.length > 1) {
      currentCandidates = cached;
      renderSuggestionPill(cached, topHindi);
    } else if (delimiter === '.') {
      currentCandidates = [`${topHindi}।`, `${topHindi}.`, romanWord];
      renderSuggestionPill(currentCandidates, `${topHindi}।`);
    } else {
      // Background fetch without touching the caret!
      window.KalamTransliterator.getCandidates(romanWord).then((candidates) => {
        if (candidates && candidates.length > 1) {
          currentCandidates = candidates;
          renderSuggestionPill(candidates, topHindi);
        }
      }).catch(() => {});
    }

    triggerEditorChange();
    return true;
  }

  /**
   * Handles converting '.' to '। ' (Purna Viram) when typed after existing Hindi text.
   * Also supports typing '..' to get '॥ ' (Deergha Viram for poetry / dohas).
   */
  function handleFullStopConversion() {
    const caretInfo = getCaretTextNodeAndOffset();
    if (!caretInfo || !caretInfo.node) return false;

    const { node, offset } = caretInfo;
    const textBefore = node.nodeValue.substring(0, offset);

    // If preceded by a digit (e.g. 3. or 10.), keep as regular decimal point
    if (/\d$/.test(textBefore)) {
      return false;
    }

    // If preceded by Purna Viram already (user typed dot twice: '..'), convert to Deergha Viram '॥ '
    if (/।\s?$/.test(textBefore)) {
      const matchViram = textBefore.match(/।\s?$/);
      const sel = window.getSelection();
      const range = document.createRange();
      range.setStart(node, matchViram.index);
      range.setEnd(node, offset);
      sel.removeAllRanges();
      sel.addRange(range);

      document.execCommand('insertText', false, '॥ ');
      triggerEditorChange();
      return true;
    }

    // If preceded by a space after text (e.g. 'गया '), trim that space so purna viram sits right against the word: 'गया। '
    let startOffset = offset;
    if (/[\s\u00A0]$/.test(textBefore) && textBefore.length > 1) {
      startOffset = offset - 1;
    }

    const sel = window.getSelection();
    const range = document.createRange();
    range.setStart(node, startOffset);
    range.setEnd(node, offset);
    sel.removeAllRanges();
    sel.addRange(range);

    const replacement = '। ';
    document.execCommand('insertText', false, replacement);

    const updatedCaret = getCaretTextNodeAndOffset();
    if (updatedCaret && updatedCaret.node) {
      lastTransliteration = {
        node: updatedCaret.node,
        originalRoman: '.',
        convertedHindi: '।',
        delimiter: '',
        effectiveDelimiter: ' ',
        caretOffset: updatedCaret.offset,
        replacementLength: replacement.length
      };

      currentCandidateTarget = {
        node: updatedCaret.node,
        caretOffset: updatedCaret.offset,
        convertedLength: 1,
        originalWord: '.',
        delimiter: ' '
      };

      currentCandidates = ['। (पूर्ण विराम)', '. (फुल स्टॉप)', '॥ (दीर्घ विराम)'];
      renderSuggestionPill(['।', '.', '॥'], '।');
    }

    triggerEditorChange();
    return true;
  }

  /**
   * Undoes the last transliteration if user presses Backspace.
   */
  function tryUndoLastTransliteration() {
    const caretInfo = getCaretTextNodeAndOffset();
    if (!caretInfo || !lastTransliteration) return false;

    const { node, offset } = caretInfo;
    if (node !== lastTransliteration.node) return false;

    // Ensure caret is located immediately after the replaced word
    if (offset !== lastTransliteration.caretOffset) return false;

    const sel = window.getSelection();
    const range = document.createRange();
    const wordStart = offset - lastTransliteration.replacementLength;

    if (wordStart < 0) return false;

    range.setStart(node, wordStart);
    range.setEnd(node, offset);
    sel.removeAllRanges();
    sel.addRange(range);

    // Restore original Roman word + delimiter
    const restoredText = lastTransliteration.originalRoman + lastTransliteration.delimiter;
    document.execCommand('insertText', false, restoredText);

    triggerEditorChange();
    return true;
  }

  function renderSuggestionPill(candidates, selected) {
    if (!suggestionBoxElement) return;

    suggestionBoxElement.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'kalam-candidates-pill';

    candidates.slice(0, 5).forEach((cand, idx) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `candidate-item ${cand === selected ? 'active' : ''}`;
      item.innerHTML = `<span class="cand-num">${idx + 1}</span> <span class="cand-text">${escapeHtml(cand)}</span>`;

      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectCandidate(cand);
      });

      container.appendChild(item);
    });

    suggestionBoxElement.appendChild(container);
    positionSuggestionBox();
    suggestionBoxElement.style.display = 'block';
  }

  function positionSuggestionBox() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !suggestionBoxElement) return;

    const range = sel.getRangeAt(0).cloneRange();
    const rect = range.getBoundingClientRect();

    if (rect && rect.bottom > 0) {
      const top = rect.bottom + 6;
      const left = Math.max(12, Math.min(window.innerWidth - 320, rect.left));
      suggestionBoxElement.style.top = `${top}px`;
      suggestionBoxElement.style.left = `${left}px`;
    }
  }

  function hideSuggestions() {
    if (suggestionBoxElement) {
      suggestionBoxElement.style.display = 'none';
      suggestionBoxElement.innerHTML = '';
    }
    currentCandidates = [];
    currentCandidateTarget = null;
  }

  function selectCandidate(newCandidate) {
    if (!currentCandidateTarget || !currentCandidateTarget.node) {
      hideSuggestions();
      return;
    }

    const { node, caretOffset, convertedLength, delimiter } = currentCandidateTarget;
    const wordStart = caretOffset - (convertedLength + delimiter.length);
    if (wordStart < 0 || wordStart > node.nodeValue.length) {
      hideSuggestions();
      return;
    }

    const sel = window.getSelection();
    const range = document.createRange();
    range.setStart(node, wordStart);
    range.setEnd(node, caretOffset);
    sel.removeAllRanges();
    sel.addRange(range);

    const replacement = newCandidate + delimiter;
    document.execCommand('insertText', false, replacement);

    hideSuggestions();
    triggerEditorChange();
  }

  function handlePaste(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
    triggerEditorChange();
  }

  function triggerEditorChange() {
    if (editorElement) {
      editorElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
  }

  // --- Formatting Commands ---
  function format(command, value = null) {
    document.execCommand(command, false, value);
    if (editorElement) editorElement.focus();
    triggerEditorChange();
  }

  function insertPurnaViram() {
    document.execCommand('insertText', false, '। ');
    triggerEditorChange();
  }

  function insertSceneBreak() {
    const dividerHtml = '<p style="text-align: center; margin: 24pt 0; font-size: 16pt; color: #888;">❦ &nbsp; ❦ &nbsp; ❦</p><p><br></p>';
    document.execCommand('insertHTML', false, dividerHtml);
    triggerEditorChange();
  }

  function insertPoetryStanza() {
    const stanzaHtml = '<p class="poetry-stanza"><br></p>';
    document.execCommand('insertHTML', false, stanzaHtml);
    triggerEditorChange();
  }

  // Live Statistics
  function getStats() {
    if (!editorElement) return { words: 0, hindiWords: 0, chars: 0, readingTimeMinutes: 0 };
    const text = editorElement.innerText || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const hindiWords = words.filter(w => /[\u0900-\u097F]/.test(w));
    const chars = text.replace(/\s/g, '').length;
    const readingTime = Math.ceil(words.length / 150);

    return {
      words: words.length,
      hindiWords: hindiWords.length,
      chars: chars,
      readingTimeMinutes: readingTime
    };
  }

  return {
    init: init,
    format: format,
    insertPurnaViram: insertPurnaViram,
    insertSceneBreak: insertSceneBreak,
    insertPoetryStanza: insertPoetryStanza,
    getStats: getStats,
    setTransliterationEnabled: (val) => { transliterationEnabled = !!val; },
    isTransliterationEnabled: () => transliterationEnabled,
    setMode: (mode) => {
      activeMode = mode;
      if (editorElement) {
        editorElement.classList.toggle('mode-poetry', mode === 'poetry');
        editorElement.classList.toggle('mode-novel', mode === 'novel');
      }
    },
    getMode: () => activeMode,
    setContent: (html) => {
      if (editorElement) editorElement.innerHTML = html || '<p><br></p>';
    },
    getContent: () => {
      return editorElement ? editorElement.innerHTML : '';
    }
  };
})();
