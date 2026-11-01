/**
 * Kalam (कलाम) - Main Application Controller
 * Coordinates State, Sidebar, Editor, Auto-Save, and Publishing Exports.
 */

(function () {
  'use strict';

  // Global State
  let project = null;
  let activeChapterId = null;
  let autoSaveTimeout = null;

  // DOM Elements
  const elements = {
    bookTitleInput: document.getElementById('bookTitleInput'),
    bookAuthorInput: document.getElementById('bookAuthorInput'),
    chapterList: document.getElementById('chapterList'),
    chapterTitleInput: document.getElementById('chapterTitleInput'),
    chapterStatusSelect: document.getElementById('chapterStatusSelect'),
    editorArea: document.getElementById('editorArea'),
    suggestionBox: document.getElementById('suggestionBox'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    saveIndicator: document.getElementById('saveIndicator'),

    // Stats
    statWords: document.getElementById('statWords'),
    statHindiWords: document.getElementById('statHindiWords'),
    statChars: document.getElementById('statChars'),
    statTime: document.getElementById('statTime'),
    totalBookWords: document.getElementById('totalBookWords'),

    // Toggles & Settings
    translitToggle: document.getElementById('translitToggle'),
    translitStatusPill: document.getElementById('translitStatusPill'),
    modeNovelBtn: document.getElementById('modeNovelBtn'),
    modePoetryBtn: document.getElementById('modePoetryBtn'),
    themeSelect: document.getElementById('themeSelect'),
    fontSelect: document.getElementById('fontSelect'),
    fontSizeSelect: document.getElementById('fontSizeSelect'),
    zenModeBtn: document.getElementById('zenModeBtn'),

    // Modals
    shortcutsModal: document.getElementById('shortcutsModal'),
    exportModal: document.getElementById('exportModal'),

    // Library / Bookshelf
    libraryModal: document.getElementById('libraryModal'),
    openLibraryBtn: document.getElementById('openLibraryBtn'),
    closeLibraryModal: document.getElementById('closeLibraryModal'),
    libraryBooksGrid: document.getElementById('libraryBooksGrid'),
    newBookTitleInput: document.getElementById('newBookTitleInput'),
    newBookAuthorInput: document.getElementById('newBookAuthorInput'),
    newBookGenreSelect: document.getElementById('newBookGenreSelect'),
    createNewBookBtn: document.getElementById('createNewBookBtn')
  };

  // Initialize Application
  async function init() {
    try {
      // 1. Initialize Editor Core
      window.KalamEditor.init(elements.editorArea, elements.suggestionBox);

      // 2. Load Active Project from IndexedDB
      project = await window.KalamStorage.loadActiveProject();

      // 3. Populate Project Metadata
      elements.bookTitleInput.value = project.title || 'शीर्षक विहीन पुस्तक';
      elements.bookAuthorInput.value = project.author || '';

      // 4. Apply Project Settings
      applySettings(project.settings || {});

      // 5. Select Initial Chapter
      if (project.chapters && project.chapters.length > 0) {
        activeChapterId = project.chapters[0].id;
      }

      // 6. Render Sidebar & Load Active Chapter
      renderChapterList();
      loadActiveChapter();

      // 7. Bind All Event Listeners
      bindEvents();

      showToast('कलाम में आपका स्वागत है! लिखना प्रारंभ करें।');
    } catch (err) {
      console.error('Initialization error:', err);
      showToast('प्रारंभ करने में समस्या आई: ' + err.message, true);
    }
  }

  // Bind All UI Events
  function bindEvents() {
    // Book Metadata Change
    elements.bookTitleInput.addEventListener('input', () => {
      project.title = elements.bookTitleInput.value;
      scheduleAutoSave();
    });

    elements.bookAuthorInput.addEventListener('input', () => {
      project.author = elements.bookAuthorInput.value;
      scheduleAutoSave();
    });

    // Chapter Title & Status Change
    elements.chapterTitleInput.addEventListener('input', () => {
      const ch = getActiveChapter();
      if (ch) {
        ch.title = elements.chapterTitleInput.value;
        renderChapterList();
        scheduleAutoSave();
      }
    });

    elements.chapterStatusSelect.addEventListener('change', () => {
      const ch = getActiveChapter();
      if (ch) {
        ch.status = elements.chapterStatusSelect.value;
        renderChapterList();
        scheduleAutoSave();
      }
    });

    // Editor Area Input
    elements.editorArea.addEventListener('input', () => {
      const ch = getActiveChapter();
      if (ch) {
        ch.contentHtml = window.KalamEditor.getContent();
        ch.updatedAt = new Date().toISOString();
        updateLiveStats();
        scheduleAutoSave();
      }
    });

    // Add Chapter / Poem Buttons
    document.getElementById('addChapterBtn').addEventListener('click', () => addNewItem('chapter'));
    document.getElementById('addPoemBtn').addEventListener('click', () => addNewItem('poem'));

    // Mode Switcher (Novel vs. Poetry)
    elements.modeNovelBtn.addEventListener('click', () => setMode('novel'));
    elements.modePoetryBtn.addEventListener('click', () => setMode('poetry'));

    // Transliteration Toggle
    elements.translitToggle.addEventListener('change', () => {
      const enabled = elements.translitToggle.checked;
      window.KalamEditor.setTransliterationEnabled(enabled);
      updateTranslitStatusPill(enabled);
      showToast(enabled ? 'देवनागरी टाइपिंग सक्रिय (ON)' : 'अंग्रेज़ी टाइपिंग सक्रिय (OFF)');
    });

    // Global Keyboard Shortcuts: Ctrl+M to toggle Hindi transliteration & Esc to exit Zen Mode / close Modals
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        elements.translitToggle.checked = !elements.translitToggle.checked;
        elements.translitToggle.dispatchEvent(new Event('change'));
        return;
      }

      if (e.key === 'Escape') {
        // 1. If candidate suggestion box is active, let it close first
        const suggestionBox = document.getElementById('suggestionBox');
        if (suggestionBox && suggestionBox.style.display !== 'none' && suggestionBox.children.length > 0) {
          return;
        }

        // 2. If any modal is open, close it
        const openModalElem = document.querySelector('.modal-overlay.open');
        if (openModalElem) {
          openModalElem.classList.remove('open');
          return;
        }

        // 3. If in Zen Mode, exit Zen Mode!
        if (document.body.classList.contains('zen-mode')) {
          e.preventDefault();
          toggleZenMode();
          return;
        }
      }
    });

    const exitZenBtn = document.getElementById('exitZenBtn');
    if (exitZenBtn) {
      exitZenBtn.addEventListener('click', toggleZenMode);
    }

    // Formatting Toolbar Buttons
    bindToolbarButtons();

    // Export & Google Docs Actions
    bindExportActions();

    // Project Backup & Restore
    document.getElementById('backupProjectBtn').addEventListener('click', () => {
      window.KalamStorage.exportProjectBackup(project);
      showToast('परियोजना की बैकअप फ़ाइल (.kalam) डाउनलोड हो गई है।');
    });

    const fileInput = document.getElementById('importProjectInput');
    document.getElementById('importProjectBtn').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files[0]) {
        try {
          project = await window.KalamStorage.importProjectBackup(e.target.files[0]);
          activeChapterId = project.chapters[0].id;
          renderChapterList();
          loadActiveChapter();
          showToast('परियोजना सफलतापूर्वक लोड की गई!');
        } catch (err) {
          showToast('फ़ाइल पढ़ने में त्रुटि: ' + err.message, true);
        }
      }
    });

    // Theme & Typography Controls
    elements.themeSelect.addEventListener('change', (e) => applyTheme(e.target.value));
    elements.fontSelect.addEventListener('change', (e) => applyFont(e.target.value));
    elements.fontSizeSelect.addEventListener('change', (e) => applyFontSize(e.target.value));

    // Zen Mode (Fullscreen)
    elements.zenModeBtn.addEventListener('click', toggleZenMode);

    // Help & Shortcuts Modal
    document.getElementById('helpBtn').addEventListener('click', () => openModal(elements.shortcutsModal));
    document.getElementById('closeShortcutsModal').addEventListener('click', () => closeModal(elements.shortcutsModal));

    // Library Modal & New Book Creation
    if (elements.openLibraryBtn) {
      elements.openLibraryBtn.addEventListener('click', () => {
        renderLibraryGrid();
        openModal(elements.libraryModal);
      });
    }
    if (elements.closeLibraryModal) {
      elements.closeLibraryModal.addEventListener('click', () => closeModal(elements.libraryModal));
    }
    if (elements.createNewBookBtn) {
      elements.createNewBookBtn.addEventListener('click', handleCreateNewBook);
    }
  }

  function bindToolbarButtons() {
    document.getElementById('btnBold').addEventListener('click', () => window.KalamEditor.format('bold'));
    document.getElementById('btnItalic').addEventListener('click', () => window.KalamEditor.format('italic'));
    document.getElementById('btnUnderline').addEventListener('click', () => window.KalamEditor.format('underline'));
    document.getElementById('btnH1').addEventListener('click', () => window.KalamEditor.format('formatBlock', '<h1>'));
    document.getElementById('btnH2').addEventListener('click', () => window.KalamEditor.format('formatBlock', '<h2>'));
    document.getElementById('btnBlockquote').addEventListener('click', () => window.KalamEditor.format('formatBlock', '<blockquote>'));
    document.getElementById('btnPurnaViram').addEventListener('click', () => window.KalamEditor.insertPurnaViram());
    document.getElementById('btnSceneBreak').addEventListener('click', () => window.KalamEditor.insertSceneBreak());
    document.getElementById('btnPoetryStanza').addEventListener('click', () => window.KalamEditor.insertPoetryStanza());
    document.getElementById('btnUndo').addEventListener('click', () => window.KalamEditor.format('undo'));
    document.getElementById('btnRedo').addEventListener('click', () => window.KalamEditor.format('redo'));
  }

  function bindExportActions() {
    // One-Click Copy Active Chapter for Google Docs
    document.getElementById('copyChapterGDocsBtn').addEventListener('click', async () => {
      const ch = getActiveChapter();
      if (!ch) return;
      const res = await window.KalamExporter.copyChapterForGoogleDocs(ch.title, ch.contentHtml);
      if (res.success) {
        showToast('✓ अध्याय Google Docs के लिए कॉपी हो गया! Google Docs में Ctrl+V दबाएँ।');
      }
    });

    // One-Click Copy Entire Book for Google Docs
    document.getElementById('copyFullBookGDocsBtn').addEventListener('click', async () => {
      const res = await window.KalamExporter.copyFullBookForGoogleDocs(project);
      if (res.success) {
        showToast('✓ पूरी पुस्तक Google Docs के लिए कॉपी हो गई! Google Docs में Ctrl+V दबाएँ।');
      }
    });

    // Open Export Modal
    document.getElementById('openExportModalBtn').addEventListener('click', () => openModal(elements.exportModal));
    document.getElementById('closeExportModal').addEventListener('click', () => closeModal(elements.exportModal));

    // Modal Export Triggers
    document.getElementById('exportDocxBtn').addEventListener('click', () => {
      const ch = getActiveChapter();
      window.KalamExporter.downloadWordDoc(ch ? ch.title : project.title, project.title, project.author, ch ? ch.contentHtml : '');
      showToast('Word (.doc) फ़ाइल डाउनलोड हो रही है।');
    });

    document.getElementById('exportFullDocxBtn').addEventListener('click', () => {
      let combined = '';
      project.chapters.forEach(ch => {
        combined += `<h1>${ch.title}</h1>${ch.contentHtml}<br><br>`;
      });
      window.KalamExporter.downloadWordDoc(project.title, project.title, project.author, combined);
      showToast('सम्पूर्ण पुस्तक की Word फ़ाइल डाउनलोड हो रही है।');
    });

    document.getElementById('exportMarkdownBtn').addEventListener('click', () => {
      const ch = getActiveChapter();
      if (ch) {
        window.KalamExporter.downloadMarkdown(ch.title, ch.title, ch.contentHtml);
        showToast('Markdown (.md) फ़ाइल डाउनलोड हो गई।');
      }
    });

    document.getElementById('exportPlainTextBtn').addEventListener('click', () => {
      const ch = getActiveChapter();
      if (ch) {
        const text = window.KalamExporter.convertHtmlToPlainText(ch.contentHtml);
        window.KalamExporter.downloadPlainText(ch.title, `${ch.title}\n\n${text}`);
        showToast('Plain Text (.txt) फ़ाइल डाउनलोड हो गई।');
      }
    });

    document.getElementById('printManuscriptBtn').addEventListener('click', () => {
      window.print();
    });
  }

  // Chapter Management
  function getActiveChapter() {
    return project.chapters.find(c => c.id === activeChapterId) || null;
  }

  function loadActiveChapter() {
    const ch = getActiveChapter();
    if (!ch) return;

    elements.chapterTitleInput.value = ch.title || '';
    elements.chapterStatusSelect.value = ch.status || 'draft';
    window.KalamEditor.setContent(ch.contentHtml || '');

    // Set editor mode based on chapter type
    setMode(ch.type === 'poem' ? 'poetry' : 'novel', false);

    updateLiveStats();
  }

  async function addNewItem(type = 'chapter') {
    const count = project.chapters.filter(c => c.type === type).length + 1;
    const defaultTitle = type === 'poem' ? `कविता ${count}: नया छंद` : `अध्याय ${count}: नया प्रसंग`;

    const newItem = {
      id: window.KalamStorage.generateId(type === 'poem' ? 'poem' : 'ch'),
      title: defaultTitle,
      type: type,
      status: 'draft',
      updatedAt: new Date().toISOString(),
      contentHtml: type === 'poem' ? '<p class="poetry-stanza">यहाँ कविता की पंक्तियाँ लिखें...<br></p>' : '<p>यहाँ से अध्याय लिखना प्रारंभ करें...</p>'
    };

    project.chapters.push(newItem);
    activeChapterId = newItem.id;

    renderChapterList();
    loadActiveChapter();
    elements.editorArea.focus();
    await saveProjectImmediately();
    showToast(`${type === 'poem' ? 'नई कविता' : 'नया अध्याय'} जोड़ा गया।`);
  }

  function renderChapterList() {
    elements.chapterList.innerHTML = '';

    project.chapters.forEach((ch, index) => {
      const li = document.createElement('li');
      li.className = `chapter-nav-item ${ch.id === activeChapterId ? 'active' : ''}`;

      const icon = ch.type === 'poem' ? 'feather' : 'book-open';
      const statusBadge = getStatusBadge(ch.status);

      li.innerHTML = `
        <div class="chapter-item-header">
          <span class="chapter-icon"><i data-lucide="${icon}"></i></span>
          <span class="chapter-item-title">${escapeHtml(ch.title)}</span>
        </div>
        <div class="chapter-item-footer">
          ${statusBadge}
          <div class="chapter-item-actions">
            ${index > 0 ? `<button type="button" class="btn-move-up" title="ऊपर ले जाएँ">▲</button>` : ''}
            ${index < project.chapters.length - 1 ? `<button type="button" class="btn-move-down" title="नीचे ले जाएँ">▼</button>` : ''}
            ${project.chapters.length > 1 ? `<button type="button" class="btn-delete-ch" title="हटाएँ">✕</button>` : ''}
          </div>
        </div>
      `;

      // Click to switch chapter
      li.addEventListener('click', (e) => {
        if (e.target.closest('button')) return; // ignore action buttons
        if (activeChapterId !== ch.id) {
          activeChapterId = ch.id;
          renderChapterList();
          loadActiveChapter();
        }
      });

      // Move Up
      const btnUp = li.querySelector('.btn-move-up');
      if (btnUp) {
        btnUp.addEventListener('click', (e) => {
          e.stopPropagation();
          moveChapter(index, index - 1);
        });
      }

      // Move Down
      const btnDown = li.querySelector('.btn-move-down');
      if (btnDown) {
        btnDown.addEventListener('click', (e) => {
          e.stopPropagation();
          moveChapter(index, index + 1);
        });
      }

      // Delete
      const btnDel = li.querySelector('.btn-delete-ch');
      if (btnDel) {
        btnDel.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`क्या आप '${ch.title}' को हटाना चाहते हैं?`)) {
            deleteChapter(ch.id);
          }
        });
      }

      elements.chapterList.appendChild(li);
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  async function moveChapter(fromIdx, toIdx) {
    const item = project.chapters.splice(fromIdx, 1)[0];
    project.chapters.splice(toIdx, 0, item);
    renderChapterList();
    await saveProjectImmediately();
  }

  async function deleteChapter(id) {
    if (project.chapters.length <= 1) return;
    const idx = project.chapters.findIndex(c => c.id === id);
    project.chapters.splice(idx, 1);
    activeChapterId = project.chapters[Math.max(0, idx - 1)].id;
    renderChapterList();
    loadActiveChapter();
    await saveProjectImmediately();
    showToast('अध्याय हटा दिया गया।');
  }

  function getStatusBadge(status) {
    if (status === 'completed') return `<span class="badge badge-success">पूर्ण</span>`;
    if (status === 'in-progress') return `<span class="badge badge-warning">प्रगति पर</span>`;
    return `<span class="badge badge-draft">प्रारूप</span>`;
  }

  // Mode & Theme Setters
  function setMode(mode, save = true) {
    window.KalamEditor.setMode(mode);
    elements.modeNovelBtn.classList.toggle('active', mode === 'novel');
    elements.modePoetryBtn.classList.toggle('active', mode === 'poetry');

    const ch = getActiveChapter();
    if (ch && save) {
      ch.type = mode === 'poetry' ? 'poem' : 'chapter';
      renderChapterList();
      scheduleAutoSave();
    }
  }

  function applySettings(settings) {
    if (settings.theme) applyTheme(settings.theme);
    if (settings.fontFamily) applyFont(settings.fontFamily);
    if (settings.fontSize) applyFontSize(settings.fontSize);
    if (settings.transliterationEnabled !== undefined) {
      elements.translitToggle.checked = settings.transliterationEnabled;
      window.KalamEditor.setTransliterationEnabled(settings.transliterationEnabled);
      updateTranslitStatusPill(settings.transliterationEnabled);
    }
  }

  function applyTheme(theme) {
    document.body.classList.remove('theme-sepia', 'theme-dark', 'theme-light');
    document.body.classList.add(`theme-${theme}`);
    elements.themeSelect.value = theme;
    if (project) {
      project.settings = project.settings || {};
      project.settings.theme = theme;
      scheduleAutoSave();
    }
  }

  function applyFont(font) {
    elements.editorArea.style.fontFamily = `'${font}', 'Mangal', serif`;
    elements.fontSelect.value = font;
    if (project) {
      project.settings = project.settings || {};
      project.settings.fontFamily = font;
      scheduleAutoSave();
    }
  }

  function applyFontSize(size) {
    elements.editorArea.style.fontSize = size;
    elements.fontSizeSelect.value = size;
    if (project) {
      project.settings = project.settings || {};
      project.settings.fontSize = size;
      scheduleAutoSave();
    }
  }

  function updateTranslitStatusPill(enabled) {
    elements.translitStatusPill.textContent = enabled ? 'हिंदी देवनागरी (Space to convert)' : 'English Script';
    elements.translitStatusPill.className = `status-pill ${enabled ? 'active' : 'inactive'}`;
  }

  function toggleZenMode() {
    document.body.classList.toggle('zen-mode');
    const isZen = document.body.classList.contains('zen-mode');
    showToast(isZen ? 'ज़ेन मोड (विघ्न-रहित लेखन) चालू। बाहर आने के लिए Esc या बटन दबाएँ।' : 'सामान्य दृश्य पर वापस।');
  }

  // Live Statistics
  function updateLiveStats() {
    const stats = window.KalamEditor.getStats();
    elements.statWords.textContent = stats.words;
    elements.statHindiWords.textContent = stats.hindiWords;
    elements.statChars.textContent = stats.chars;
    elements.statTime.textContent = `${stats.readingTimeMinutes} मि.`;

    // Calculate total book word count
    let total = 0;
    project.chapters.forEach(ch => {
      const text = window.KalamExporter.convertHtmlToPlainText(ch.contentHtml || '');
      const words = text.trim().split(/\s+/).filter(w => w.length > 0);
      total += words.length;
    });
    elements.totalBookWords.textContent = total;
  }

  // Auto-Save Mechanism
  function scheduleAutoSave() {
    elements.saveIndicator.textContent = 'सहेजा जा रहा है...';
    elements.saveIndicator.classList.add('saving');

    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      saveProjectImmediately();
    }, 400);
  }

  // Instant Save Mechanism (for structural changes or window close)
  async function saveProjectImmediately() {
    clearTimeout(autoSaveTimeout);
    elements.saveIndicator.textContent = 'सहेजा जा रहा है...';
    elements.saveIndicator.classList.add('saving');
    try {
      const ch = getActiveChapter();
      if (ch && window.KalamEditor) {
        ch.contentHtml = window.KalamEditor.getContent();
        ch.updatedAt = new Date().toISOString();
      }
      await window.KalamStorage.saveProject(project);
      elements.saveIndicator.textContent = '✓ सहेजा गया';
      elements.saveIndicator.classList.remove('saving');
    } catch (err) {
      elements.saveIndicator.textContent = 'त्रुटि!';
      console.error('Save failed:', err);
    }
  }

  // Flushes auto-save immediately on tab switch or page close
  window.addEventListener('beforeunload', () => {
    const ch = getActiveChapter();
    if (ch && window.KalamEditor) {
      ch.contentHtml = window.KalamEditor.getContent();
      ch.updatedAt = new Date().toISOString();
      try {
        localStorage.setItem('kalam_backup_' + project.id, JSON.stringify(project));
      } catch (e) {}
    }
    window.KalamStorage.saveProject(project);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveProjectImmediately();
    }
  });

  // Toast Notification
  function showToast(msg, isError = false) {
    elements.toastMessage.textContent = msg;
    elements.toast.className = `kalam-toast show ${isError ? 'error' : ''}`;
    setTimeout(() => {
      elements.toast.classList.remove('show');
    }, 3500);
  }

  // --- Multi-Book Library Management ---
  async function renderLibraryGrid() {
    if (!elements.libraryBooksGrid) return;
    elements.libraryBooksGrid.innerHTML = '<p style="color: var(--text-muted); font-size: 12px; padding: 10px;">लोड हो रहा है...</p>';
    const allProjects = await window.KalamStorage.getAllProjects();
    elements.libraryBooksGrid.innerHTML = '';

    allProjects.forEach(proj => {
      const card = document.createElement('div');
      const isActive = proj.id === project.id;
      card.className = `book-shelf-card ${isActive ? 'active-book' : ''}`;

      let totalWords = 0;
      (proj.chapters || []).forEach(ch => {
        const text = window.KalamExporter.convertHtmlToPlainText(ch.contentHtml || '');
        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        totalWords += words.length;
      });

      const genreLabel = proj.genre === 'poetry' ? 'कविता संग्रह' : 'उपन्यास';
      const updatedDate = new Date(proj.updatedAt || proj.createdAt).toLocaleDateString('hi-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      });

      card.innerHTML = `
        <div>
          <div class="book-card-title">${escapeHtml(proj.title || 'शीर्षक विहीन')}</div>
          <div class="book-card-author">लेखक: ${escapeHtml(proj.author || 'अज्ञात')}</div>
          <span class="badge ${proj.genre === 'poetry' ? 'badge-warning' : 'badge-success'}">${genreLabel}</span>
        </div>
        <div class="book-card-meta">
          <span>${(proj.chapters || []).length} अध्याय/छंद • ${totalWords} शब्द</span>
          <span>${updatedDate}</span>
        </div>
        <div class="book-card-actions">
          ${isActive ? 
            `<span style="font-size: 11px; font-weight: 600; color: var(--accent-color); padding: 4px 0;">✓ वर्तमान पुस्तक</span>` :
            `<button type="button" class="btn-sidebar-add btn-open-book" style="padding: 4px 10px; font-size: 11px;">खोलें</button>`
          }
          ${allProjects.length > 1 ? 
            `<button type="button" class="btn-icon btn-del-book" style="width: 26px; height: 26px; font-size: 11px;" title="हटाएँ">✕</button>` : ''
          }
        </div>
      `;

      const btnOpen = card.querySelector('.btn-open-book');
      if (btnOpen) {
        btnOpen.addEventListener('click', async () => {
          await switchProject(proj.id);
          closeModal(elements.libraryModal);
        });
      }

      const btnDel = card.querySelector('.btn-del-book');
      if (btnDel) {
        btnDel.addEventListener('click', async () => {
          if (confirm(`क्या आप '${proj.title}' को हटाना चाहते हैं?`)) {
            await window.KalamStorage.deleteProject(proj.id);
            if (proj.id === project.id) {
              const remaining = await window.KalamStorage.getAllProjects();
              if (remaining.length > 0) {
                await switchProject(remaining[0].id);
              }
            }
            renderLibraryGrid();
            showToast('पुस्तक हटा दी गई।');
          }
        });
      }

      elements.libraryBooksGrid.appendChild(card);
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  async function handleCreateNewBook() {
    const title = elements.newBookTitleInput.value.trim() || 'मेरी नई पुस्तक';
    const author = elements.newBookAuthorInput.value.trim() || project.author || 'अज्ञात लेखक';
    const genre = elements.newBookGenreSelect.value || 'novel';

    const newBook = await window.KalamStorage.createNewProject(title, author, genre);
    elements.newBookTitleInput.value = '';
    elements.newBookAuthorInput.value = '';

    await switchProject(newBook.id);
    closeModal(elements.libraryModal);
    showToast(`'${title}' प्रारंभ कर दी गई है!`);
  }

  async function switchProject(id) {
    project = await window.KalamStorage.loadProjectById(id);
    elements.bookTitleInput.value = project.title || '';
    elements.bookAuthorInput.value = project.author || '';
    applySettings(project.settings || {});

    if (project.chapters && project.chapters.length > 0) {
      activeChapterId = project.chapters[0].id;
    } else {
      activeChapterId = null;
    }

    renderChapterList();
    loadActiveChapter();
    updateLiveStats();
  }

  function openModal(modal) {
    modal.classList.add('open');
  }

  function closeModal(modal) {
    modal.classList.remove('open');
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
  }

  // Bootstrapping on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', init);
})();

