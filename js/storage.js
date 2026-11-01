/**
 * Kalam (कलाम) - Local-First Storage (IndexedDB)
 * Saves all manuscripts, books, chapters, poems, and metadata locally
 * in the browser. Supports multi-book library, auto-save, JSON backup, and project restore.
 */

window.KalamStorage = (function () {
  'use strict';

  const DB_NAME = 'KalamManuscriptDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'projects';
  const ACTIVE_PROJECT_KEY = 'active_project_id';

  let dbPromise = null;

  function openDatabase() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function (event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };

      request.onsuccess = function (event) {
        resolve(event.target.result);
      };

      request.onerror = function (event) {
        console.error('IndexedDB open error:', event.target.error);
        reject(event.target.error);
      };
    });

    return dbPromise;
  }

  // Generate unique ID
  function generateId(prefix = 'item') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  // Create default starter project
  function createDefaultProject(title = 'मेरी पहली रचना', author = 'अज्ञात लेखक', genre = 'novel') {
    return {
      id: generateId('book'),
      title: title,
      subtitle: genre === 'poetry' ? 'कविता संग्रह' : 'उपन्यास',
      author: author,
      genre: genre, // 'novel' or 'poetry'
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        fontFamily: 'Noto Serif Devanagari',
        fontSize: '18px',
        lineHeight: '1.8',
        theme: 'sepia',
        transliterationEnabled: true
      },
      chapters: genre === 'poetry' ? [
        {
          id: generateId('poem'),
          title: 'कविता १: नई शुरुआत',
          type: 'poem',
          status: 'draft',
          updatedAt: new Date().toISOString(),
          contentHtml: '<p class="poetry-stanza">बहती हुई नदिया सा यह जीवन,<br>क्षण-क्षण बदलता इसका रंग।<br>कभी किनारों से टकराता,<br>कभी बहा ले जाता उमंग।</p>'
        }
      ] : [
        {
          id: generateId('ch'),
          title: 'प्रस्तावना (Preface)',
          type: 'prologue',
          status: 'completed',
          updatedAt: new Date().toISOString(),
          contentHtml: '<p>साहित्य केवल शब्दों का जोड़ नहीं, बल्कि मानव हृदय की गहरी अनुभूतियों और संवेदनाओं का दर्पण है। यह पुस्तक उन्हीं अनकहे जज़्बातों और अनुभवों की एक विनम्र अभिव्यक्ति है।</p><p>यहाँ आप उपन्यास के विभिन्न अध्यायों अथवा कविताओं के छंदों को सुगमता से लिख सकते हैं। स्पेस दबाते ही अंग्रेज़ी के अक्षर स्वतः शुद्ध देवनागरी में परिवर्तित हो जाते हैं।</p>'
        },
        {
          id: generateId('ch'),
          title: 'अध्याय १: नई शुरुआत',
          type: 'chapter',
          status: 'in-progress',
          updatedAt: new Date().toISOString(),
          contentHtml: '<p>वह एक शांत और सुहानी सुबह थी। खिड़की के बाहर ठंडी हवा के झोंके पत्तों से फुसफुसा रहे थे। कमरे की मेज़ पर रखी स्याही और क़लम मानो किसी अनकही कहानी की प्रतीक्षा कर रहे थे।</p><p>उसने कागज़ पर पहला शब्द लिखा और ऐसा लगा जैसे वर्षों से संजोए हुए विचार पंख लगाकर उड़ने लगे हों। सफर लंबा था, मगर शुरुआत हो चुकी थी।</p>'
        }
      ]
    };
  }

  // Save full project object
  async function saveProject(project) {
    project.updatedAt = new Date().toISOString();
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(project);

      req.onsuccess = () => {
        localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
        resolve(project);
      };

      req.onerror = () => reject(req.error);
    });
  }

  // Load active project (or create default)
  async function loadActiveProject() {
    const db = await openDatabase();
    const activeId = localStorage.getItem(ACTIVE_PROJECT_KEY);

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);

      if (activeId) {
        const req = store.get(activeId);
        req.onsuccess = async () => {
          if (req.result) {
            resolve(req.result);
          } else {
            const defaultProj = createDefaultProject();
            await saveProject(defaultProj);
            resolve(defaultProj);
          }
        };
        req.onerror = () => reject(req.error);
      } else {
        const countReq = store.count();
        countReq.onsuccess = async () => {
          if (countReq.result === 0) {
            const defaultProj = createDefaultProject();
            await saveProject(defaultProj);
            resolve(defaultProj);
          } else {
            const cursorReq = store.openCursor();
            cursorReq.onsuccess = (e) => {
              const cursor = e.target.result;
              if (cursor) {
                localStorage.setItem(ACTIVE_PROJECT_KEY, cursor.value.id);
                resolve(cursor.value);
              }
            };
          }
        };
      }
    });
  }

  // Load a specific project by ID
  async function loadProjectById(id) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        if (req.result) {
          localStorage.setItem(ACTIVE_PROJECT_KEY, req.result.id);
          resolve(req.result);
        } else {
          reject(new Error('Project not found'));
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  // Retrieve all books in library
  async function getAllProjects() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const projects = req.result || [];
        // Sort by updatedAt descending
        projects.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        resolve(projects);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // Create a brand new book project
  async function createNewProject(title, author, genre) {
    const newBook = createDefaultProject(title, author, genre);
    await saveProject(newBook);
    return newBook;
  }

  // Delete a project from library
  async function deleteProject(id) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // Export full project as JSON download
  function exportProjectBackup(project) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    const safeTitle = (project.title || 'HindiManuscript').replace(/[^a-zA-Z0-9\u0900-\u097F]/g, '_');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${safeTitle}_backup_${new Date().toISOString().slice(0, 10)}.kalam`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  // Import project from JSON file
  function importProjectBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!parsed.id || !parsed.chapters) {
            throw new Error('Invalid project file format.');
          }
          parsed.id = generateId('imported');
          await saveProject(parsed);
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('File reading error'));
      reader.readAsText(file);
    });
  }

  return {
    generateId: generateId,
    loadActiveProject: loadActiveProject,
    loadProjectById: loadProjectById,
    getAllProjects: getAllProjects,
    createNewProject: createNewProject,
    deleteProject: deleteProject,
    saveProject: saveProject,
    exportProjectBackup: exportProjectBackup,
    importProjectBackup: importProjectBackup
  };
})();
