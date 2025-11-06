// Storage adapter: uses Electron file system if available, falls back to localStorage
const Storage = {
  isElectron: typeof window.electronAPI !== "undefined",

  async loadNotes() {
    if (this.isElectron) {
      return await window.electronAPI.readNotes();
    } else {
      try {
        const raw = localStorage.getItem("notes.offline.v1");
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
  },

  async saveNotes(data) {
    if (this.isElectron) {
      await window.electronAPI.writeNotes(data);
    } else {
      localStorage.setItem("notes.offline.v1", JSON.stringify(data));
    }
  },

  async loadFolders() {
    if (this.isElectron) {
      return await window.electronAPI.readFolders();
    } else {
      try {
        const raw = localStorage.getItem("notes.folders.v1");
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
  },

  async saveFolders(data) {
    if (this.isElectron) {
      await window.electronAPI.writeFolders(data);
    } else {
      localStorage.setItem("notes.folders.v1", JSON.stringify(data));
    }
  },

  async loadSettings() {
    if (this.isElectron) {
      const settings = await window.electronAPI.readSettings();
      return settings || {};
    } else {
      const theme = localStorage.getItem("notes.theme") || "light";
      const foldersOpen = localStorage.getItem("notes.foldersOpen.v1");
      return {
        theme,
        foldersOpen: foldersOpen ? JSON.parse(foldersOpen) : [],
      };
    }
  },

  async saveSettings(data) {
    if (this.isElectron) {
      await window.electronAPI.writeSettings(data);
    } else {
      if (data.theme) localStorage.setItem("notes.theme", data.theme);
      if (data.foldersOpen)
        localStorage.setItem(
          "notes.foldersOpen.v1",
          JSON.stringify(data.foldersOpen)
        );
    }
  },

  async loadTrash() {
    if (this.isElectron) {
      return await window.electronAPI.readTrash();
    } else {
      return []; // trash not persisted in browser version
    }
  },

  async saveTrash(data) {
    if (this.isElectron) {
      await window.electronAPI.writeTrash(data);
    }
  },
};

(async () => {
  // Elements
  const el = {
    sidebar: document.getElementById("sidebar"),
    toggleSidebarBtn: document.getElementById("toggleSidebarBtn"),
    homeBtn: document.getElementById("homeBtn"),
    newNoteBtn: document.getElementById("newNoteBtn"),
    noteList: document.getElementById("noteList"),
    workspace: document.querySelector(".workspace"),
    paneLeft: document.getElementById("pane-left"),
    paneRight: document.getElementById("pane-right"),
    tabsLeft: document.getElementById("tabs-left"),
    tabsRight: document.getElementById("tabs-right"),
    floatLayer: document.getElementById("float-layer"),
    dock: document.getElementById("dock"),
    importInput: document.getElementById("importInput"),
    toolsBtn: document.getElementById("toolsBtn"),
    toolsMenu: document.getElementById("toolsMenu"),
    duplicateBtn: document.getElementById("duplicateBtn"),
    trashBtn: document.getElementById("trashBtn"),
    insertTableBtn: document.getElementById("insertTableBtn"),
    exportBtn: document.getElementById("exportBtn"),
    importBtn: document.getElementById("importBtn"),
    settingsBtn: document.getElementById("settingsBtn"),
    settingsMenu: document.getElementById("settingsMenu"),
    themeOptions: document.querySelectorAll(".theme-option"),
    clearAllBtn: document.getElementById("clearAllBtn"),
    autoBackupBtn: document.getElementById("autoBackupBtn"),
    hlPalette: document.getElementById("hlPalette"),
    autoHlToggle: document.getElementById("autoHlToggle"),
    newFolderBtn: document.getElementById("newFolderBtn"),
    ctxTemplate: document.getElementById("context-menu-template"),
    exportHtmlBtn: document.getElementById("exportHtmlBtn"),
    exportPdfBtn: document.getElementById("exportPdfBtn"),
    resizer: document.getElementById("resizer"),
    emptyState: document.getElementById("empty-state"),
    searchInput: document.getElementById("searchInput"),
    clearSearch: document.getElementById("clearSearch"),
    trashBtn: document.getElementById("trashBtn"),
    templates: {
      editor: document.getElementById("note-editor-template"),
      window: document.getElementById("window-template"),
    },
  };
  // Make modalPrompt globally available for table-utils
  window.modalPrompt = modalPrompt;

  async function modalIconPicker(current = "📁") {
    return new Promise((res) => {
      const m = modalBase();
      if (!m) return res(null);
      m.querySelector(".modal-title").textContent = "Choose Icon";
      const body = m.querySelector(".modal-body");
      const txt = document.createElement("input");
      txt.placeholder = "Or type custom icon";
      txt.value = current;
      txt.style.marginTop = "8px";
      const presets = [
        "📁",
        "🗂️",
        "📒",
        "📝",
        "⭐",
        "📌",
        "🔖",
        "🧪",
        "📚",
        "💡",
        "✅",
        "🚀",
      ];
      const grid = document.createElement("div");
      grid.style.display = "grid";
      grid.style.gridTemplateColumns = "repeat(6, 1fr)";
      grid.style.gap = "6px";
      presets.forEach((ic) => {
        const b = document.createElement("button");
        b.className = "btn";
        b.textContent = ic;
        b.addEventListener("click", () => {
          txt.value = ic;
        });
        grid.appendChild(b);
      });
      body.appendChild(grid);
      body.appendChild(txt);
      const actions = m.querySelector(".modal-actions");
      const cancel = document.createElement("button");
      cancel.className = "btn";
      cancel.textContent = "Cancel";
      const ok = document.createElement("button");
      ok.className = "btn primary";
      ok.textContent = "Save";
      actions.appendChild(cancel);
      actions.appendChild(ok);
      const done = (v) => {
        m.remove();
        res(v);
      };
      cancel.addEventListener("click", () => done(null));
      ok.addEventListener("click", () => done(txt.value.trim() || null));
      m.querySelector(".modal-x").addEventListener("click", () => done(null));
    });
  }
  // Paste helpers (images)
  function fileToDataURL(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }
  function insertImageAtSelection(container, dataUrl, note, imgId = null) {
    console.log("insertImageAtSelection called with:", {
      container,
      dataUrl: dataUrl ? dataUrl.substring(0, 50) + "..." : "null",
      noteId: note?.id,
      imgId,
    });

    if (!container || !dataUrl) {
      console.error("Invalid container or dataUrl");
      return null;
    }

    try {
      // Create placeholder wrapper with brackets
      const wrapper = document.createElement("span");
      wrapper.className = "image-placeholder-wrapper";
      wrapper.style.display = "inline";

      // Opening bracket (normal text)
      const openBracket = document.createTextNode("(");

      // Clickable "Image" text (styled in blue)
      const placeholder = document.createElement("span");
      placeholder.className = "image-placeholder";
      placeholder.textContent = "Image";
      placeholder.style.color = "#3b82f6"; // Blue color
      placeholder.style.cursor = "pointer";
      placeholder.style.textDecoration = "none";
      placeholder.style.fontWeight = "600";
      placeholder.style.userSelect = "none";
      placeholder.style.transition = "color 0.2s";
      placeholder.title = "Click to view image";

      // Closing bracket (normal text)
      const closeBracket = document.createTextNode(")");

      // Add hover effect
      placeholder.addEventListener("mouseenter", () => {
        placeholder.style.color = "#2563eb"; // Darker blue on hover
        placeholder.style.textDecoration = "underline";
      });
      placeholder.addEventListener("mouseleave", () => {
        placeholder.style.color = "#3b82f6";
        placeholder.style.textDecoration = "none";
      });

      // Assemble the wrapper
      wrapper.appendChild(openBracket);
      wrapper.appendChild(placeholder);
      wrapper.appendChild(closeBracket);

      // Store image data in note
      if (!note.images) note.images = [];

      // Use provided imgId when pasting, or generate a new one
      if (!imgId) {
        imgId =
          "img-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
        note.images.push({ id: imgId, data: dataUrl });
        console.log("Created new image entry with ID:", imgId);
      } else {
        // When pasting, check if we already have this image
        const existingImgIndex = note.images.findIndex(
          (img) => img.id === imgId
        );
        if (existingImgIndex === -1) {
          note.images.push({ id: imgId, data: dataUrl });
          console.log("Added new image with existing ID:", imgId);
        } else {
          console.log("Using existing image with ID:", imgId);
        }
      }

      // Set data attributes on wrapper
      wrapper.dataset.imageId = imgId;

      // Click to view in image viewer (on the blue "Image" text)
      placeholder.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Opening image in viewer:", imgId);
        openImageViewer(dataUrl);
      });

      // Handle selection and insertion
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) {
        // If no selection, append to the end of the container
        console.log("No selection, appending to container");
        container.appendChild(wrapper);
      } else {
        try {
          const range = sel.getRangeAt(0);
          console.log("Inserting at range:", range.toString());

          // If the range is in the middle of a text node, split it
          if (
            range.startContainer.nodeType === Node.TEXT_NODE &&
            range.startOffset > 0
          ) {
            const textNode = range.startContainer;
            const offset = range.startOffset;
            const afterText = textNode.splitText(offset);
            textNode.parentNode.insertBefore(wrapper, afterText);
          } else {
            range.deleteContents();
            range.insertNode(wrapper);
          }

          // Move cursor after the wrapper
          const newRange = document.createRange();
          newRange.setStartAfter(wrapper);
          newRange.collapse(true);

          sel.removeAllRanges();
          sel.addRange(newRange);
          console.log("Image placeholder inserted at selection");
        } catch (err) {
          console.error("Error inserting image placeholder at selection:", err);
          // Fallback: append to container
          container.appendChild(wrapper);
        }
      }

      // Ensure the wrapper is visible in the viewport
      wrapper.scrollIntoView({ behavior: "smooth", block: "nearest" });

      // Save the note after inserting the image placeholder
      try {
        saveNotes(); // This is the correct function name (with 's' at the end)
        console.log("Image placeholder inserted and note saved");
        return wrapper;
      } catch (saveError) {
        console.error("Error saving note after image insertion:", saveError);
        // Still return the wrapper even if save fails
        return wrapper;
      }
    } catch (error) {
      console.error("Error in insertImageAtSelection:", error);
      return null;
    }
  }

  // Image drag-and-drop inside editor (helpers)
  let draggedImg = null;
  let editorDropInd = null;
  function setupImgDnD(img) {
    img.draggable = true;
    img.addEventListener("dragstart", () => {
      draggedImg = img;
      hideImgTools();
    });
    img.addEventListener("dragend", () => {
      draggedImg = null;
      removeEditorDropIndicator();
    });
  }
  function getEditorDropInd() {
    if (!editorDropInd) {
      editorDropInd = document.createElement("div");
      editorDropInd.className = "drop-indicator";
    }
    return editorDropInd;
  }
  function showEditorDropIndicator(container, x, y) {
    const r = caretRangeAtPoint(x, y);
    if (!r) return;
    const ind = getEditorDropInd();
    const ref =
      r.startContainer.nodeType === 3
        ? r.startContainer.parentNode
        : r.startContainer;
    if (ref && ref.parentNode) {
      ref.parentNode.insertBefore(ind, ref.nextSibling);
    }
  }
  function removeEditorDropIndicator() {
    if (editorDropInd && editorDropInd.parentNode) editorDropInd.remove();
  }
  function caretRangeAtPoint(x, y) {
    if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
    const pos =
      document.caretPositionFromPoint && document.caretPositionFromPoint(x, y);
    if (pos) {
      const r = document.createRange();
      r.setStart(pos.offsetNode, pos.offset);
      r.collapse(true);
      return r;
    }
    return null;
  }

  // Simple list behavior in editor
  function handleListKeys(e, container) {
    if (e.key !== "Enter") return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    const line =
      (node.textContent?.slice(0, range.startOffset) ?? node.textContent) || "";
    const fullText =
      node.nodeType === 3
        ? node.parentElement?.textContent || ""
        : node.textContent || "";
    const matchBullet = /^\s*[-•]\s/.exec(fullText);
    const matchNum = /^\s*(\d+)\.\s/.exec(fullText || "");
    if (matchBullet || matchNum) {
      e.preventDefault();
      document.execCommand("insertHTML", false, "<br>");
      // insert marker for next line
      const marker = matchBullet ? "- " : Number(matchNum[1]) + 1 + ". ";
      document.execCommand("insertText", false, marker);
    }
  }

  // Sidebar reorder helpers
  let dropIndicatorEl = null;
  function getDropIndicator() {
    if (!dropIndicatorEl) {
      dropIndicatorEl = document.createElement("div");
      dropIndicatorEl.className = "drop-indicator";
    }
    return dropIndicatorEl;
  }
  function removeDropIndicator() {
    if (dropIndicatorEl && dropIndicatorEl.parentNode) dropIndicatorEl.remove();
  }
  function showDropIndicator(targetBtn, e) {
    const rect = targetBtn.getBoundingClientRect();
    const before = e.clientY - rect.top < rect.height / 2;
    const ind = getDropIndicator();
    targetBtn.parentNode.insertBefore(
      ind,
      before ? targetBtn : targetBtn.nextSibling
    );
  }
  function handleReorderDrop(e, targetBtn) {
    const dragId = e.dataTransfer.getData("text/note-id");
    if (!dragId) return;
    const targetId = targetBtn.dataset.noteId;
    if (!targetId || targetId === dragId) return;
    const ind = dropIndicatorEl;
    const before = ind && ind.nextSibling !== targetBtn.nextSibling; // rough; ok either way
    reorderNotes(dragId, targetId, before);
    removeDropIndicator();
  }
  function reorderNotes(dragId, targetId, placeBefore) {
    const dragIdx = state.notes.findIndex((n) => n.id === dragId);
    const targetIdx = state.notes.findIndex((n) => n.id === targetId);
    if (dragIdx < 0 || targetIdx < 0) return;
    const [item] = state.notes.splice(dragIdx, 1);
    const insertAt =
      targetIdx + (placeBefore ? 0 : 1 - (dragIdx < targetIdx ? 1 : 0));
    // Align folder with target
    const tgt =
      state.notes[
        insertAt > targetIdx
          ? targetIdx
          : targetIdx > 0
          ? targetIdx - 1
          : targetIdx
      ] || state.notes[targetIdx];
    item.folderId = tgt?.folderId ?? null;
    state.notes.splice(insertAt, 0, item);
    item.updatedAt = new Date().toISOString();
    saveNotes();
    renderSidebar();
    refreshOpenTabs(item.id);
  }

  function ensureSplitState() {
    const hasLeftContent = state.left.tabs.length > 0;
    const hasRightContent = state.right.tabs.length > 0;

    // If left pane is empty but right pane has content, move right to left FIRST
    if (!hasLeftContent && hasRightContent) {
      // Move all right tabs to left
      state.left.tabs = [...state.right.tabs];
      state.left.active = state.right.active;

      // Clear right pane
      state.right.tabs = [];
      state.right.active = null;

      // Disable split and re-render
      disableSplit();
      renderTabs("left");
      renderPane("left");
      renderTabs("right");
      renderPane("right");

      // Save session state
      if (typeof saveSessionState === "function") {
        saveSessionState();
      }
      return; // Exit early since we've handled this case
    }

    // If right pane is empty and split is on, close split
    if (!hasRightContent && state.splitMode) {
      disableSplit();
    }
  }

  // Global context menu
  document.addEventListener("contextmenu", async (e) => {
    e.preventDefault();
    const target = e.target;
    // Sidebar space → show sidebar context
    const inSidebar = el.sidebar.contains(target);
    const onNoteBtn = target.closest("button[data-note-id]");
    const onFolderRow = target.closest(".folder-item");
    if (inSidebar && !onNoteBtn && !onFolderRow) {
      return showContextMenu(
        e.clientX,
        e.clientY,
        {
          onNewNote: () => {
            const now = new Date().toISOString();
            const today = new Date();
            const dayName = today.toLocaleDateString("en-US", {
              weekday: "long",
            });
            const day = String(today.getDate()).padStart(2, "0");
            const month = String(today.getMonth() + 1).padStart(2, "0");
            const year = String(today.getFullYear()).slice(-2);
            const defaultTitle = `${dayName} - ${day}/${month}/${year}`;
            const n = {
              id: uid(),
              title: defaultTitle,
              contentHtml: "",
              tags: [],
              folderId: null,
              createdAt: now,
              updatedAt: now,
            };
            state.notes.unshift(n);
            saveNotes();
            renderSidebar();
            openInPane(n.id, "left");
          },
          onNewFolder: async () => {
            const name = await modalPrompt("New Folder", "Folder name");
            if (!name) return;
            const f = { id: uid(), name, parentId: null };
            state.folders.push(f);
            saveFolders();
            renderSidebar();
          },
        },
        "sidebar"
      );
    }
    // Note row
    const noteBtn = target.closest("button[data-note-id]");
    if (noteBtn) {
      const id = noteBtn.dataset.noteId;
      return showContextMenu(
        e.clientX,
        e.clientY,
        {
          onOpenWindow: () => openWindow(id),
          onRenameNote: async () => {
            const note = getNote(id);
            if (!note) return;
            const name = await modalPrompt(
              "Rename Note",
              "Title",
              note.title || ""
            );
            if (name == null) return;
            note.title = name;
            note.updatedAt = new Date().toISOString();
            saveNotes();
            renderSidebar();
            refreshOpenTabs(id);
            refreshWindowTitle(id);
          },
          onDeleteNote: async () => {
            const ok = await modalConfirm("Delete this note?");
            if (!ok) return;
            const idx = state.notes.findIndex((n) => n.id === id);
            if (idx >= 0) {
              const [note] = state.notes.splice(idx, 1);
              state.trash.push({
                ...note,
                deletedAt: new Date().toISOString(),
              });
            }
            closeTab("left", id);
            closeTab("right", id);
            closeWindow(id);
            saveNotes();
            saveTrash();
            renderSidebar();
          },
        },
        "note"
      );
    }
    // Folder row
    const folderRow = target.closest(".folder-item");
    if (folderRow && folderRow.dataset.folderId !== undefined) {
      const fid = folderRow.dataset.folderId;
      const isUncat = fid === "";
      const handlers = {};
      if (!isUncat) {
        handlers.onNewSubfolder = async () => {
          const name = await modalPrompt("New Subfolder", "Folder name");
          if (!name) return;
          const f = { id: uid(), name, parentId: fid };
          state.folders.push(f);
          state.foldersOpen.add(fid); // Auto-expand parent
          saveFolders();
          renderSidebar();
        };
        handlers.onRenameFolder = async () => {
          const name = await modalPrompt(
            "Rename Folder",
            "Folder name",
            getFolderName(fid)
          );
          if (!name) return;
          const f = state.folders.find((x) => x.id === fid);
          if (f) {
            f.name = name;
            saveFolders();
            renderSidebar();
          }
        };
        handlers.onDeleteFolder = async () => {
          const folder = state.folders.find((f) => f.id === fid);
          if (!folder) return;

          // Get notes in this folder
          const notesInFolder = state.notes.filter((n) => n.folderId === fid);
          const noteCount = notesInFolder.length;

          // Get subfolders recursively
          const getSubfolders = (parentId) => {
            const subs = state.folders.filter((f) => f.parentId === parentId);
            let allSubs = [...subs];
            subs.forEach((sub) => {
              allSubs = allSubs.concat(getSubfolders(sub.id));
            });
            return allSubs;
          };
          const subfolders = getSubfolders(fid);
          const subfolderCount = subfolders.length;

          const ok = await modalConfirm(
            `Delete folder "${folder.name}"?${
              noteCount > 0
                ? `\n\n${noteCount} note${
                    noteCount !== 1 ? "s" : ""
                  } inside will be moved to trash.`
                : ""
            }${
              subfolderCount > 0
                ? `\n${subfolderCount} subfolder${
                    subfolderCount !== 1 ? "s" : ""
                  } will be moved to root.`
                : ""
            }\n\nYou can restore from trash later.`
          );
          if (!ok) return;

          // Close tabs and windows for notes in folder
          notesInFolder.forEach((note) => {
            closeTab("left", note.id);
            closeTab("right", note.id);
            closeWindow(note.id);
          });

          // Remove notes from state
          state.notes = state.notes.filter((n) => n.folderId !== fid);

          // Move folder to trash WITH its notes and subfolders nested inside
          const ix = state.folders.findIndex((x) => x.id === fid);
          if (ix >= 0) {
            const [deletedFolder] = state.folders.splice(ix, 1);
            state.trash.push({
              ...deletedFolder,
              type: "folder",
              notes: notesInFolder, // Keep notes nested in folder
              subfolders: subfolders, // Keep subfolders nested
              deletedAt: new Date().toISOString(),
            });
          }

          // Move subfolders to root
          state.folders.forEach((f) => {
            if (f.parentId === fid) f.parentId = null;
          });

          saveFolders();
          saveNotes();
          saveTrash();
          renderSidebar();
        };
      }
      return showContextMenu(e.clientX, e.clientY, handlers, "folder");
    }
    // Editor selection - context menu disabled
    const content = target.closest(".content.editable");
    if (content) {
      // Context menu disabled for editor content area
      return;
    }
  });

  // Removed global selectionchange highlighter; we highlight on mouseup in editor only.

  // In-app modal helpers
  function modalBase() {
    const tpl = document.getElementById("modal-template");
    if (!tpl) return null;
    const node = tpl.content.firstElementChild.cloneNode(true);
    document.body.appendChild(node);
    return node;
  }
  function modalAlert(message) {
    return new Promise((res) => {
      const m = modalBase();
      if (!m) return res();
      m.querySelector(".modal-title").textContent = "Notice";
      m.querySelector(".modal-body").textContent = message;
      const actions = m.querySelector(".modal-actions");
      const ok = document.createElement("button");
      ok.className = "btn primary";
      ok.textContent = "OK";
      actions.appendChild(ok);
      const close = () => {
        m.remove();
        res();
      };
      ok.addEventListener("click", close);
      m.querySelector(".modal-x").addEventListener("click", close);
    });
  }
  function modalConfirm(message) {
    return new Promise((res) => {
      const m = modalBase();
      if (!m) return res(false);
      m.querySelector(".modal-title").textContent = "Confirm";
      m.querySelector(".modal-body").textContent = message;
      const actions = m.querySelector(".modal-actions");
      const cancel = document.createElement("button");
      cancel.className = "btn";
      cancel.textContent = "Cancel";
      const yes = document.createElement("button");
      yes.className = "btn danger";
      yes.textContent = "Delete";
      actions.appendChild(cancel);
      actions.appendChild(yes);
      const done = (v) => {
        m.remove();
        res(v);
      };
      cancel.addEventListener("click", () => done(false));
      yes.addEventListener("click", () => done(true));
      m.querySelector(".modal-x").addEventListener("click", () => done(false));
    });
  }
  function modalPrompt(title, placeholder, value = "") {
    return new Promise((res) => {
      const m = modalBase();
      if (!m) return res(null);
      m.querySelector(".modal-title").textContent = title;
      const body = m.querySelector(".modal-body");
      const inp = document.createElement("input");
      inp.placeholder = placeholder;
      inp.value = value;
      body.appendChild(inp);
      inp.focus();
      const actions = m.querySelector(".modal-actions");
      const cancel = document.createElement("button");
      cancel.className = "btn";
      cancel.textContent = "Cancel";
      const ok = document.createElement("button");
      ok.className = "btn primary";
      ok.textContent = "Save";
      actions.appendChild(cancel);
      actions.appendChild(ok);
      const done = (v) => {
        m.remove();
        res(v);
      };
      cancel.addEventListener("click", () => done(null));
      ok.addEventListener("click", () => done(inp.value.trim() || null));
      m.querySelector(".modal-x").addEventListener("click", () => done(null));
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") ok.click();
        if (e.key === "Escape") cancel.click();
      });
    });
  }

  // Storage
  // Data persistence functions
  function saveNotes() {
    Storage.saveNotes(state.notes);
    if (state.backupHandle) {
      writeBackup().catch(() => {});
    }
  }
  function saveFolders() {
    Storage.saveFolders(state.folders);
  }
  function saveFoldersOpen() {
    state.settings.foldersOpen = Array.from(state.foldersOpen);
    Storage.saveSettings(state.settings);
  }
  function saveTrash() {
    Storage.saveTrash(state.trash);
    updateTrashButton();
  }

  function updateTrashButton() {
    if (el.trashBtn) {
      // Find or create the text span to preserve the SVG icon
      let textSpan = el.trashBtn.querySelector('.trash-text');
      if (!textSpan) {
        // Create a span for the text and move existing text into it
        textSpan = document.createElement('span');
        textSpan.className = 'trash-text';
        // Move any existing text nodes to the span
        const textNodes = Array.from(el.trashBtn.childNodes).filter(node => node.nodeType === 3);
        textNodes.forEach(node => {
          if (node.textContent.trim()) {
            textSpan.textContent = node.textContent.trim();
            node.remove();
          }
        });
        el.trashBtn.appendChild(textSpan);
      }
      textSpan.textContent =
        state.trash.length > 0 ? `Trash (${state.trash.length})` : "Trash";
    }
  }

  // State (will be initialized asynchronously)
  const state = {
    notes: [],
    left: { tabs: [], active: null },
    right: { tabs: [], active: null },
    windows: {}, // id -> {el, minimized}
    splitMode: false,
    backupHandle: null,
    folders: [],
    currentHighlightColor: "#ffff00",
    autoHighlight: false,
    foldersOpen: new Set(),
    pinnedTabs: new Set(),
    trash: [],
    settings: {},
    searchQuery: "",
    selectedItems: new Set(), // For multi-select in sidebar
  };

  // Helper function to initialize all tables in a container
  function initializeTables(container) {
    if (!container) return;

    container.querySelectorAll("table").forEach((table) => {
      // Add note-table class if missing
      if (!table.classList.contains("note-table")) {
        table.classList.add("note-table");
      }

      // Set contentEditable attributes
      table.contentEditable = "false";
      table.querySelectorAll("td, th").forEach((cell) => {
        cell.contentEditable = "true";

        // Restore styles from data attributes
        const bgcolor = cell.getAttribute("data-bgcolor");
        const color = cell.getAttribute("data-color");
        if (bgcolor) cell.style.backgroundColor = bgcolor;
        if (color) cell.style.color = color;
      });

      // Add table controls
      if (typeof addTableControls === "function") {
        addTableControls(table);
      }

      // Remove any existing context menu listeners to avoid duplicates
      const newTable = table.cloneNode(true);
      table.parentNode.replaceChild(newTable, table);

      // Add context menu handler
      newTable.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof showTableContextMenu === "function") {
          showTableContextMenu(e, e.target);
        }
      });

      // Add input handler for cells
      newTable.addEventListener("input", (e) => {
        if (e.target.tagName === "TD" || e.target.tagName === "TH") {
          // Find the content container
          const content = newTable.closest(".content");
          if (content) {
            content.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
      });
    });
  }

  // Initialize data from storage
  async function initializeData() {
    state.notes = await Storage.loadNotes();
    state.folders = await Storage.loadFolders();
    state.trash = await Storage.loadTrash();
    state.settings = await Storage.loadSettings();

    // Restore image placeholder handlers for all loaded notes
    restoreAllImagePlaceholders();

    // Apply theme (default to dark if none saved)
    applyTheme(state.settings.theme || "dark");
    if (state.settings.foldersOpen)
      state.foldersOpen = new Set(state.settings.foldersOpen);
    // Set default for autoSplitMode if not present
    if (state.settings.autoSplitMode === undefined)
      state.settings.autoSplitMode = true;
    // Set default for autoSave if not present (default: OFF for manual save)
    if (state.settings.autoSave === undefined) state.settings.autoSave = false;

    // Restore sidebar width
    if (state.settings.sidebarWidth) {
      el.sidebar.style.width = state.settings.sidebarWidth + "px";

      // Apply narrow class if width is small
      if (
        state.settings.sidebarWidth <= 150 &&
        !state.settings.sidebarCollapsed
      ) {
        el.sidebar.classList.add("narrow");
      }
    }

    // Restore sidebar collapsed state
    if (state.settings.sidebarCollapsed) {
      el.sidebar.classList.add("collapsed");
    }

    // Update trash button with count
    updateTrashButton();
  }

  // Helper function to attach image placeholder click handlers to a content element
  function attachImagePlaceholderHandlers(contentElement, note) {
    if (!contentElement || !note || !note.images) return;

    const placeholders = contentElement.querySelectorAll(".image-placeholder");
    let count = 0;

    placeholders.forEach((span) => {
      // The data-image-id is on the wrapper, not the span
      const wrapper = span.closest(".image-placeholder-wrapper");
      if (!wrapper) return;

      const imgId = wrapper.dataset.imageId;
      if (imgId) {
        const img = note.images.find((i) => i.id === imgId);
        if (img) {
          // Remove any existing listeners to prevent duplicates
          const newSpan = span.cloneNode(true);
          span.parentNode.replaceChild(newSpan, span);

          // Add click handler
          newSpan.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            openImageViewer(img.data);
          });

          // Ensure proper styling
          newSpan.style.cursor = "pointer";
          newSpan.style.color = "#3b82f6";

          // Add hover effects
          newSpan.addEventListener("mouseenter", () => {
            newSpan.style.color = "#2563eb";
            newSpan.style.textDecoration = "underline";
          });
          newSpan.addEventListener("mouseleave", () => {
            newSpan.style.color = "#3b82f6";
            newSpan.style.textDecoration = "none";
          });

          count++;
        }
      }
    });
  }

  // Restore image placeholder click handlers for all notes after loading from storage
  function restoreAllImagePlaceholders() {
    if (!state.notes || state.notes.length === 0) return;

    // Mark that we need to restore handlers when notes are opened
    state.notes.forEach((note) => {
      if (note.images && note.images.length > 0) {
        note._needsImageHandlerRestore = true;
      }
    });
  }

  // Utils
  const pad = (n) => (n < 10 ? "0" + n : "" + n);
  function fmt(dateStr) {
    const d = new Date(dateStr);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${days[d.getDay()]}, ${
      months[d.getMonth()]
    } ${d.getDate()}, ${d.getFullYear()} ${
      ((d.getHours() + 11) % 12) + 1
    }:${pad(d.getMinutes())} ${d.getHours() < 12 ? "AM" : "PM"}`;
  }
  const uid = () => Math.random().toString(36).slice(2, 9);
  const debounce = (fn, ms = 300) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };

  function getNote(id) {
    return state.notes.find((n) => n.id === id);
  }
  function getActive(side) {
    return state[side].active ? getNote(state[side].active) : null;
  }
  function getFolderName(fid) {
    const f = state.folders.find((f) => f.id === fid);
    return f ? f.name : "";
  }

  // Sidebar
  function renderSidebar() {
    el.noteList.innerHTML = "";

    // Filter notes and folders based on search query
    const query = state.searchQuery.toLowerCase().trim();
    const filteredNotes = query
      ? state.notes.filter((n) => {
          const titleMatch = (n.title || "").toLowerCase().includes(query);
          const tagsMatch =
            Array.isArray(n.tags) &&
            n.tags.some((t) => t.toLowerCase().includes(query));
          const contentMatch = (n.contentHtml || "")
            .toLowerCase()
            .includes(query);
          return titleMatch || tagsMatch || contentMatch;
        })
      : state.notes;

    const filteredFolders = query
      ? state.folders.filter((f) => f.name.toLowerCase().includes(query))
      : state.folders;

    // Render folders
    const groups = new Map(); // folderId -> notes[]
    filteredNotes.forEach((n) => {
      const key = n.folderId || "__none";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(n);
    });
    const sortedFolders = filteredFolders
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    const makeNoteBtn = (n) => {
      const btn = document.createElement("button");
      btn.dataset.noteId = n.id;
      btn.dataset.itemType = "note";
      btn.draggable = true;

      // Add selected class if item is selected
      if (state.selectedItems.has(`note-${n.id}`)) {
        btn.classList.add("selected");
      }

      const tags =
        Array.isArray(n.tags) && n.tags.length > 0
          ? n.tags
              .map((t) => `<span class="sidebar-tag">${escapeHtml(t)}</span>`)
              .join("")
          : "";
      btn.innerHTML = `<svg class="note-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg><div class="font">${escapeHtml(
        n.title || "Untitled"
      )}${tags}</div><div class="small">${fmt(n.createdAt)}</div>`;

      btn.addEventListener("click", (e) => {
        // Ctrl/Cmd+click for multi-select
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const itemId = `note-${n.id}`;
          if (state.selectedItems.has(itemId)) {
            state.selectedItems.delete(itemId);
          } else {
            state.selectedItems.add(itemId);
          }
          renderSidebar();
        } else {
          // Clear selection and open note
          state.selectedItems.clear();
          // Auto-split mode: if enabled and left pane has a note, open in right; otherwise in left (as new tab)
          if (state.settings.autoSplitMode) {
            const leftActive = state.left.active;
            if (leftActive && leftActive !== n.id) {
              openInPane(n.id, "right");
              enableSplit();
            } else {
              openInPane(n.id, "left");
            }
          } else {
            // Tab mode: always open in left pane as new tab
            openInPane(n.id, "left");
          }
        }
      });
      btn.addEventListener("dragstart", (e) => {
        // If this item is selected and there are multiple selections, drag all
        const itemId = `note-${n.id}`;
        if (state.selectedItems.has(itemId) && state.selectedItems.size > 1) {
          const selectedNotes = Array.from(state.selectedItems)
            .filter((id) => id.startsWith("note-"))
            .map((id) => id.replace("note-", ""));
          e.dataTransfer.setData(
            "text/multi-notes",
            JSON.stringify(selectedNotes)
          );
          e.dataTransfer.effectAllowed = "move";
        } else {
          e.dataTransfer.setData("text/note-id", n.id);
          e.dataTransfer.effectAllowed = "move";
        }
        btn.classList.add("dragging");
      });
      btn.addEventListener("dragend", () => {
        btn.classList.remove("dragging");
        removeDropIndicator();
      });
      btn.addEventListener("dragover", (e) => {
        e.preventDefault();
        showDropIndicator(btn, e);
      });
      btn.addEventListener("drop", (e) => {
        e.preventDefault();
        handleReorderDrop(e, btn);
      });
      return btn;
    };
    // Folders - render hierarchically
    const renderFolderTree = (parentId, depth = 0) => {
      const children = sortedFolders.filter(
        (f) => (f.parentId || null) === parentId
      );
      children.forEach((f) => {
        const row = document.createElement("div");
        row.className = "folder-item";
        row.dataset.folderId = f.id;
        row.dataset.itemType = "folder";
        row.style.paddingLeft = 10 + depth * 16 + "px";

        // Add selected class if item is selected
        if (state.selectedItems.has(`folder-${f.id}`)) {
          row.classList.add("selected");
        }

        const caret = document.createElement("span");
        caret.className = "folder-caret";
        caret.textContent = state.foldersOpen.has(f.id) ? "▾" : "▸";
        const icon = document.createElement("span");
        icon.className = "folder-icon";
        icon.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
        const name = document.createElement("span");
        name.textContent = f.name;
        row.appendChild(caret);
        row.appendChild(icon);
        row.appendChild(name);
        row.addEventListener("click", (e) => {
          // Ctrl/Cmd+click for multi-select
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const itemId = `folder-${f.id}`;
            if (state.selectedItems.has(itemId)) {
              state.selectedItems.delete(itemId);
            } else {
              state.selectedItems.add(itemId);
            }
            renderSidebar();
          } else {
            // Toggle folder open/close when clicking anywhere on the folder
            e.preventDefault();
            e.stopPropagation();
            state.selectedItems.clear();
            if (state.foldersOpen.has(f.id)) state.foldersOpen.delete(f.id);
            else state.foldersOpen.add(f.id);
            saveFoldersOpen();
            renderSidebar();
          }
        });
        // Make folders draggable
        row.draggable = true;
        row.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/folder-id", f.id);
          e.dataTransfer.effectAllowed = "move";
          row.classList.add("dragging");
        });
        row.addEventListener("dragend", () => {
          row.classList.remove("dragging");
        });
        row.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.stopPropagation();
          row.style.background = "var(--panel-2)";
        });
        row.addEventListener("dragleave", () => {
          row.style.background = "";
        });
        row.addEventListener("drop", (e) => {
          e.preventDefault();
          e.stopPropagation();
          row.style.background = "";

          // Handle multiple notes drop
          const multiNotes = e.dataTransfer.getData("text/multi-notes");
          if (multiNotes) {
            const noteIds = JSON.parse(multiNotes);
            noteIds.forEach((noteId) => {
              const note = getNote(noteId);
              if (note) {
                note.folderId = f.id;
                note.updatedAt = new Date().toISOString();
              }
            });
            state.selectedItems.clear();
            saveNotes();
            renderSidebar();
            noteIds.forEach((id) => refreshOpenTabs(id));
            return;
          }

          // Handle single note drop
          const noteId = e.dataTransfer.getData("text/note-id");
          if (noteId) {
            const note = getNote(noteId);
            if (!note) return;
            note.folderId = f.id;
            note.updatedAt = new Date().toISOString();
            saveNotes();
            renderSidebar();
            refreshOpenTabs(noteId);
            return;
          }

          // Handle folder drop (nesting)
          const folderId = e.dataTransfer.getData("text/folder-id");
          if (folderId && folderId !== f.id) {
            const draggedFolder = state.folders.find((x) => x.id === folderId);
            if (!draggedFolder) return;

            // Prevent circular nesting
            let checkParent = f.parentId;
            while (checkParent) {
              if (checkParent === folderId) {
                modalAlert("Cannot nest a folder inside its own subfolder!");
                return;
              }
              const parentFolder = state.folders.find(
                (x) => x.id === checkParent
              );
              checkParent = parentFolder?.parentId;
            }

            // Move folder to be a subfolder
            draggedFolder.parentId = f.id;
            state.foldersOpen.add(f.id); // Auto-expand target folder
            saveFolders();
            renderSidebar();
          }
        });
        el.noteList.appendChild(row);
        if (state.foldersOpen.has(f.id)) {
          const wrap = document.createElement("div");
          wrap.className = "folder-notes";
          wrap.style.marginLeft = (depth + 1) * 16 + "px";
          const arr = groups.get(f.id) || []; // keep original order
          arr.forEach((n) => wrap.appendChild(makeNoteBtn(n)));
          el.noteList.appendChild(wrap);
          // Render subfolders recursively
          renderFolderTree(f.id, depth + 1);
        }
      });
    };
    renderFolderTree(null, 0);
    // Uncategorized
    const noneArr = groups.get("__none") || [];
    if (noneArr.length) {
      const row = document.createElement("div");
      row.className = "folder-item";
      row.dataset.folderId = "";
      const caret = document.createElement("span");
      caret.className = "folder-caret";
      caret.textContent = state.foldersOpen.has("") ? "▾" : "▸";
      const icon = document.createElement("span");
      icon.className = "folder-icon";
      icon.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
      const name = document.createElement("span");
      name.textContent = "Uncategorized";
      row.appendChild(caret);
      row.appendChild(icon);
      row.appendChild(name);
      row.addEventListener("click", () => {
        if (state.foldersOpen.has("")) state.foldersOpen.delete("");
        else state.foldersOpen.add("");
        saveFoldersOpen();
        renderSidebar();
      });
      row.addEventListener("dragover", (e) => {
        e.preventDefault();
      });
      row.addEventListener("drop", (e) => {
        e.preventDefault();

        // Handle multiple notes drop
        const multiNotes = e.dataTransfer.getData("text/multi-notes");
        if (multiNotes) {
          const noteIds = JSON.parse(multiNotes);
          noteIds.forEach((noteId) => {
            const note = getNote(noteId);
            if (note) {
              note.folderId = null;
              note.updatedAt = new Date().toISOString();
            }
          });
          state.selectedItems.clear();
          saveNotes();
          renderSidebar();
          noteIds.forEach((id) => refreshOpenTabs(id));
          return;
        }

        // Handle single note drop
        const id = e.dataTransfer.getData("text/note-id");
        if (!id) return;
        const note = getNote(id);
        if (!note) return;
        note.folderId = null;
        note.updatedAt = new Date().toISOString();
        saveNotes();
        renderSidebar();
        refreshOpenTabs(id);
      });
      el.noteList.appendChild(row);
      if (state.foldersOpen.has("")) {
        const wrap = document.createElement("div");
        wrap.className = "folder-notes";
        noneArr.forEach((n) => wrap.appendChild(makeNoteBtn(n)));
        el.noteList.appendChild(wrap);
      }
    }

    // Show empty state message if searching and no results
    if (query && filteredNotes.length === 0 && filteredFolders.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.className = "sidebar-empty-state";
      emptyMsg.innerHTML = `
        <div class="sidebar-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>
        <div class="sidebar-empty-text">No results found</div>
        <div class="sidebar-empty-hint">Press <kbd>Enter</kbd> to show detailed results</div>
      `;
      el.noteList.appendChild(emptyMsg);
    }
  }

  // Tabs
  let isRestoringSession = false;
  function ensureTab(side, id) {
    const s = state[side];
    if (!s.tabs.includes(id)) s.tabs.push(id);
    s.active = id;
    renderTabs(side);
    renderPane(side);
    if (!isRestoringSession && typeof saveSessionState === "function")
      saveSessionState();
  }
  function closeTab(side, id) {
    const s = state[side];
    const idx = s.tabs.indexOf(id);
    if (idx >= 0) s.tabs.splice(idx, 1);
    if (s.active === id) s.active = s.tabs[idx] || s.tabs[idx - 1] || null;

    // Also remove from pinned tabs if it was pinned
    state.pinnedTabs.delete(id);

    renderTabs(side);
    renderPane(side);
    ensureSplitState(); // This will handle moving right to left if needed
    updateEmptyState();
    if (!isRestoringSession && typeof saveSessionState === "function")
      saveSessionState();
  }
  function renderTabs(side) {
    const tabsEl = side === "left" ? el.tabsLeft : el.tabsRight;
    const s = state[side];
    tabsEl.innerHTML = "";
    const ordered = s.tabs.slice().sort((a, b) => {
      const ap = state.pinnedTabs.has(a) ? -1 : 0;
      const bp = state.pinnedTabs.has(b) ? -1 : 0;
      if (ap !== bp) return ap - bp;
      return s.tabs.indexOf(a) - s.tabs.indexOf(b);
    });
    ordered.forEach((id) => {
      const n = getNote(id);
      if (!n) return;
      const tab = document.createElement("div");
      tab.className =
        "tab" +
        (s.active === id ? " active" : "") +
        (state.pinnedTabs.has(id) ? " pinned" : "");
      const title = document.createElement("span");
      title.className = "tab-text";
      title.textContent = n.title || "Untitled";
      // Add close button with spacing for pin icon
      const close = document.createElement("button");
      close.className = "close";
      close.textContent = "×";
      close.title = "Close tab";

      // Add pin indicator for pinned tabs
      if (state.pinnedTabs.has(id)) {
        const pinIndicator = document.createElement("span");
        pinIndicator.className = "pin-indicator";
        pinIndicator.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 17v5M8 17V3h8v14M5 17H3v2h18v-2h-2"></path>
          </svg>
        `;
        tab.appendChild(pinIndicator);
      }

      tab.appendChild(title);
      tab.appendChild(close);
      tab.addEventListener("click", (e) => {
        if (e.target !== close) {
          s.active = id;
          renderTabs(side);
          renderPane(side);
        }
      });
      tab.addEventListener("auxclick", (e) => {
        if (e.button === 1) {
          closeTab(side, id);
        }
      });
      tab.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const isPinned = state.pinnedTabs.has(id);
        showContextMenu(
          e.clientX,
          e.clientY,
          {
            tabId: id,
            onPinTab: () => {
              if (isPinned) {
                state.pinnedTabs.delete(id);
              } else {
                state.pinnedTabs.add(id);
              }
              renderTabs(side);
              saveSessionState();
            },
            onCloseTab: () => closeTab(side, id),
            onCloseOtherTabs: () => {
              const tabsToClose = s.tabs.filter((tabId) => tabId !== id);
              tabsToClose.forEach((tabId) => closeTab(side, tabId));
            },
            onCloseAllTabs: () => {
              const allTabs = [...s.tabs];
              allTabs.forEach((tabId) => closeTab(side, tabId));
            },
          },
          "tab"
        );
      });
      // Close button click handler
      close.addEventListener("click", (e) => {
        e.stopPropagation();
        closeTab(side, id);
      });
      // Tab DnD
      tab.draggable = true;
      tab.dataset.noteId = id;
      tab.dataset.side = side;
      tab.addEventListener("dragstart", (e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/tab-id", id);
        e.dataTransfer.setData("text/side", side);
        tab.style.opacity = "0.5";

        // Show split zones after a short delay
        setTimeout(() => {
          if (tab.style.opacity === "0.5") {
            showSplitZones(side);
          }
        }, 200);
      });
      tab.addEventListener("dragend", () => {
        tab.style.opacity = "1";
        hideSplitZones();
      });
      tab.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        tab.style.borderLeft = "3px solid var(--accent)";
      });
      tab.addEventListener("dragleave", () => {
        tab.style.borderLeft = "";
      });
      tab.addEventListener("drop", (e) => {
        e.preventDefault();
        tab.style.borderLeft = "";
        const dragId = e.dataTransfer.getData("text/tab-id");
        const dragSide = e.dataTransfer.getData("text/side");
        if (!dragId || dragId === id) return;

        // Reorder within same side; cross-pane move if different
        if (dragSide !== side) {
          const ds = state[dragSide];
          const ix = ds.tabs.indexOf(dragId);
          if (ix >= 0) ds.tabs.splice(ix, 1);

          // Insert before the target tab
          const targetIndex = state[side].tabs.indexOf(id);
          state[side].tabs.splice(targetIndex, 0, dragId);
          state[side].active = dragId;

          renderTabs(dragSide);
          renderPane(dragSide);
        } else {
          const arr = state[side].tabs;
          const from = arr.indexOf(dragId);
          const to = arr.indexOf(id);
          if (from >= 0 && to >= 0 && from !== to) {
            arr.splice(from, 1);
            arr.splice(to, 0, dragId);
          }
        }
        renderTabs(side);
        renderPane(side);
      });
      tabsEl.appendChild(tab);
    });
  }

  // Pane content
  function renderPane(side) {
    const paneEl = side === "left" ? el.paneLeft : el.paneRight;
    const s = state[side];
    paneEl.innerHTML = "";

    if (!s.active) {
      // If rendering right pane with no content, check if we should close split
      if (side === "right") {
        ensureSplitState();
      }
      return;
    }
    const note = getNote(s.active);
    if (!note) {
      // If note doesn't exist, check if we should close split
      if (side === "right") {
        ensureSplitState();
      }
      return;
    }
    const editorNode = buildEditor(note);
    paneEl.appendChild(editorNode);

    updateEmptyState();
  }

  function openInPane(id, side) {
    ensureTab(side, id);
  }

  // Editor
  function buildEditor(note) {
    const node = el.templates.editor.content.firstElementChild.cloneNode(true);
    node.dataset.noteId = note.id;
    const title = node.querySelector(".title");
    const titleStatus = node.querySelector(".title-status");
    const headerTags = node.querySelector(".header-tags");
    const content = node.querySelector(".content");
    const settingsBtn = node.querySelector('[data-action="settings"]');
    const settingsDropdown = node.querySelector(".settings-dropdown");
    const folderSel = node.querySelector(".folder-dropdown");
    const chipsWrap = node.querySelector(".tags-dropdown.chips");
    const tagInput = node.querySelector(".tag-input-dropdown");

    // Undo/Redo history
    if (!note.history) note.history = [];
    if (!note.historyIndex) note.historyIndex = -1;
    let isUndoRedo = false;

    // Helper to get cursor position
    function getCursorPosition() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return null;

      const range = sel.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(content);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      const caretOffset = preCaretRange.toString().length;

      return {
        offset: caretOffset,
        isCollapsed: range.collapsed,
      };
    }

    // Helper to restore cursor position
    function setCursorPosition(cursorPos) {
      if (!cursorPos || typeof cursorPos.offset !== "number") return;

      try {
        const sel = window.getSelection();
        const range = document.createRange();

        let currentOffset = 0;
        let found = false;

        function findOffset(node) {
          if (found) return;

          if (node.nodeType === Node.TEXT_NODE) {
            const nodeLength = node.textContent.length;
            if (currentOffset + nodeLength >= cursorPos.offset) {
              const localOffset = cursorPos.offset - currentOffset;
              range.setStart(node, Math.min(localOffset, nodeLength));
              range.setEnd(node, Math.min(localOffset, nodeLength));
              found = true;
              return;
            }
            currentOffset += nodeLength;
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            for (let i = 0; i < node.childNodes.length; i++) {
              findOffset(node.childNodes[i]);
              if (found) return;
            }
          }
        }

        findOffset(content);

        if (found) {
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          // Fallback: place cursor at the end if offset not found
          const lastTextNode = getLastTextNode(content);
          if (lastTextNode) {
            range.setStart(
              lastTextNode,
              Math.min(cursorPos.offset, lastTextNode.textContent.length)
            );
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      } catch (e) {
        console.warn("Cursor position restoration failed:", e);
      }
    }

    // Helper to find last text node
    function getLastTextNode(node) {
      if (node.nodeType === Node.TEXT_NODE) return node;
      const children = node.childNodes;
      for (let i = children.length - 1; i >= 0; i--) {
        const last = getLastTextNode(children[i]);
        if (last) return last;
      }
      return null;
    }

    function saveToHistory() {
      if (isUndoRedo) return;
      const currentState = {
        html: content.innerHTML,
        images: note.images ? JSON.parse(JSON.stringify(note.images)) : [],
        cursor: getCursorPosition(), // Save cursor position
      };
      // Remove any redo history
      note.history = note.history.slice(0, note.historyIndex + 1);
      note.history.push(currentState);
      // Limit history to 50 states
      if (note.history.length > 50) {
        note.history.shift();
      } else {
        note.historyIndex++;
      }
    }

    function syncDates() {
      // Update title status
      if (titleStatus) {
        titleStatus.textContent = note.updatedAt
          ? `${fmt(note.updatedAt)}`
          : note.createdAt
          ? `${fmt(note.createdAt)}`
          : "";
      }
    }

    title.value = note.title || "";
    // Load HTML content if present; fallback to escaped text
    if (note.contentHtml) {
      content.innerHTML = note.contentHtml;

      // Initialize existing tables with controls and event handlers
      // Use requestAnimationFrame to ensure DOM is ready and table-utils.js is loaded
      requestAnimationFrame(() => {
        initializeTables(content);
      });
    } else {
      content.textContent = note.content || "";
    }

    // Initialize history if empty
    if (note.history.length === 0) {
      saveToHistory();
    }

    // Ensure existing images are draggable
    content.querySelectorAll("img").forEach(setupImgDnD);

    // Initialize images array if missing (for imported notes)
    if (!note.images) {
      note.images = [];
    }

    // Restore image placeholder click handlers
    attachImagePlaceholderHandlers(content, note);

    // Clear the flag since we've restored handlers
    if (note._needsImageHandlerRestore) {
      delete note._needsImageHandlerRestore;
    }
    // folders
    renderFolderOptions(folderSel, note.folderId);
    // tags (chips UI)
    function renderChips() {
      chipsWrap.innerHTML = "";
      headerTags.innerHTML = "";
      (note.tags || []).forEach((t, idx) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.innerHTML = `<span>${escapeHtml(
          t
        )}</span><span class="x" title="Remove">×</span>`;
        chip.querySelector(".x").addEventListener("click", () => {
          note.tags.splice(idx, 1);
          saveNote();
          renderChips();
        });
        chipsWrap.appendChild(chip);

        // Also add to header
        const headerChip = document.createElement("span");
        headerChip.className = "header-tag";
        headerChip.textContent = t;
        headerTags.appendChild(headerChip);
      });
    }
    if (!Array.isArray(note.tags)) note.tags = [];
    renderChips();
    tagInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const v = tagInput.value.trim();
        if (!v) return;
        if (!note.tags.includes(v)) note.tags.push(v);
        tagInput.value = "";
        saveNote();
        renderChips();
      }
    });
    syncDates();

    // Manual save system to eliminate lag
    let hasUnsavedChanges = false;
    let autoSaveTimer = null;

    function updateSaveStatus(saved = false) {
      if (titleStatus) {
        if (saved) {
          titleStatus.textContent = "✓ Saved";
          titleStatus.style.color = "#4ade80";
          setTimeout(() => {
            titleStatus.textContent = note.updatedAt
              ? `${fmt(note.updatedAt)}`
              : "";
            titleStatus.style.color = "";
          }, 2000);
        } else {
          titleStatus.textContent = "● Unsaved";
          titleStatus.style.color = "#fbbf24";
        }
      }
    }

    function saveNote() {
      note.updatedAt = new Date().toISOString();
      saveNotes();
      syncDates();
      renderSidebar();
      refreshWindowTitle(note.id);
      refreshOpenTabs(note.id);
      hasUnsavedChanges = false;
      updateSaveStatus(true);
    }

    function markUnsaved() {
      if (!hasUnsavedChanges) {
        hasUnsavedChanges = true;
        updateSaveStatus(false);
      }

      // Auto-save if enabled
      if (state.settings.autoSave) {
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
          if (hasUnsavedChanges) {
            saveNote();
          }
        }, 3000); // Auto-save after 3 seconds of no typing
      }
    }

    // Simplified undo: only track content, don't trigger saves
    let historyTimer = null;
    let lastContentForHistory = content.innerHTML;
    let isTypingWord = false;

    function saveHistoryIfChanged() {
      if (content.innerHTML !== lastContentForHistory) {
        saveToHistory();
        lastContentForHistory = content.innerHTML;
        isTypingWord = false;
      }
    }

    function scheduleHistorySave() {
      if (historyTimer) clearTimeout(historyTimer);
      historyTimer = setTimeout(() => {
        saveHistoryIfChanged();
      }, 1500); // Save to history after 1.5s of no typing
    }

    title.addEventListener("input", () => {
      note.title = title.value;
      markUnsaved();
    });

    // Ctrl+S to save manually
    content.addEventListener("keydown", (e) => {
      // Manual save with Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasUnsavedChanges) {
          saveNote();
        }
        return;
      }

      // Simplified word boundary detection for undo
      const wordBoundaryKeys = [" ", "Enter", "Tab"];
      const punctuationKeys = [".", ",", "!", "?", ";", ":", "-"];

      if (wordBoundaryKeys.includes(e.key) || punctuationKeys.includes(e.key)) {
        if (isTypingWord) {
          setTimeout(() => saveHistoryIfChanged(), 0);
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        isTypingWord = true;
      }
    });

    content.addEventListener("input", (e) => {
      note.contentHtml = content.innerHTML;
      markUnsaved();

      // Save to history for undo/redo
      if (e.isFormatting) {
        saveHistoryIfChanged(); // Immediate for formatting
      } else {
        scheduleHistorySave(); // Delayed for typing
      }
    });
    content.addEventListener("paste", async (e) => {
      const clipboardData = e.clipboardData || window.clipboardData;
      const items = clipboardData.items;
      if (!items) return;

      // Check for custom image placeholder data first
      try {
        const customData = clipboardData.getData("application/x-image-data");
        if (customData) {
          const { id, data } = JSON.parse(customData);
          if (id && data) {
            e.preventDefault();
            insertImageAtSelection(content, data, note, id);
            note.contentHtml = content.innerHTML;
            saveToHistory();
            saveNote();
            return;
          }
        }
      } catch (e) {
        console.log("No custom image data found, trying HTML fallback");
      }

      // Fallback to HTML parsing if custom data not available
      try {
        const html = clipboardData.getData("text/html");
        if (html && html.includes("data-is-image-placeholder")) {
          e.preventDefault();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const placeholder = doc.querySelector("[data-is-image-placeholder]");

          if (placeholder) {
            const imgId = placeholder.dataset.imageId;
            // Try to find the image in the current note first
            let imgData = note.images.find((img) => img.id === imgId);

            // If not found, try to get it from the clipboard's custom data
            if (!imgData) {
              try {
                const customData = JSON.parse(
                  clipboardData.getData("application/x-image-data")
                );
                if (customData && customData.id === imgId) {
                  imgData = { id: imgId, data: customData.data };
                  if (!note.images.find((img) => img.id === imgId)) {
                    note.images.push(imgData);
                  }
                }
              } catch (e) {
                console.log("Could not load image data from clipboard");
              }
            }

            if (imgData) {
              insertImageAtSelection(content, imgData.data, note, imgId);
              note.contentHtml = content.innerHTML;
              saveToHistory();
              saveNote();
            }
          }
          return;
        }
      } catch (e) {
        console.error("Error processing HTML paste:", e);
      }

      // Check for text first (for table detection)
      const text = e.clipboardData.getData("text/plain");
      if (text) {
        const tableData = parsePastedTable(text);
        if (tableData && tableData.length > 0) {
          e.preventDefault();
          const table = createTableFromData
            ? createTableFromData(tableData)
            : null;
          if (table) {
            // Ensure table has proper attributes
            table.className = "note-table";
            table.contentEditable = "false";
            table.querySelectorAll("td, th").forEach((cell) => {
              cell.contentEditable = "true";
            });

            // Add table controls
            if (typeof addTableControls === "function") {
              addTableControls(table);
            }

            // Add input event listener
            table.addEventListener("input", (e) => {
              if (e.target.tagName === "TD" || e.target.tagName === "TH") {
                note.contentHtml = content.innerHTML;
                markUnsaved();
                scheduleHistorySave();
              }
            });

            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const range = sel.getRangeAt(0);
              range.deleteContents();
              range.insertNode(table);
              range.setStartAfter(table);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
            } else {
              content.appendChild(table);
            }

            // Initialize the pasted table
            setTimeout(() => initializeTables(content), 100);

            note.contentHtml = content.innerHTML;
            saveToHistory();
            saveNote();
            return;
          }
        }
      }

      // Handle images
      for (const it of items) {
        if (it.type && it.type.startsWith("image/")) {
          e.preventDefault();
          const file = it.getAsFile();
          if (!file) continue;
          const dataUrl = await fileToDataURL(file);
          insertImageAtSelection(content, dataUrl, note);
          note.contentHtml = content.innerHTML;
          saveToHistory();
          saveNote();
        }
      }
    });

    content.addEventListener("keydown", (e) => {
      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (note.historyIndex > 0) {
          note.historyIndex--;
          isUndoRedo = true;
          const prevState = note.history[note.historyIndex];
          content.innerHTML = prevState.html;
          note.images = JSON.parse(JSON.stringify(prevState.images));
          note.contentHtml = content.innerHTML;
          // Restore image click handlers
          attachImagePlaceholderHandlers(content, note);
          // Restore cursor position - wait for DOM to fully update
          if (prevState.cursor) {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setCursorPosition(prevState.cursor);
                content.focus();
              });
            });
          }
          // Don't save during undo
          setTimeout(() => {
            isUndoRedo = false;
          }, 50);
        }
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        if (note.historyIndex < note.history.length - 1) {
          note.historyIndex++;
          isUndoRedo = true;
          const nextState = note.history[note.historyIndex];
          content.innerHTML = nextState.html;
          note.images = JSON.parse(JSON.stringify(nextState.images));
          note.contentHtml = content.innerHTML;
          // Restore image click handlers
          attachImagePlaceholderHandlers(content, note);
          // Restore cursor position - wait for DOM to fully update
          if (nextState.cursor) {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setCursorPosition(nextState.cursor);
                content.focus();
              });
            });
          }
          // Don't save during redo
          setTimeout(() => {
            isUndoRedo = false;
          }, 50);
        }
      }

      // Ctrl+A: Select all content properly (fix glitchy behavior)
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        const range = document.createRange();
        range.selectNodeContents(content);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }

      // Ctrl+X: Cut current line (like VS Code)
      if ((e.ctrlKey || e.metaKey) && e.key === "x") {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
          e.preventDefault();
          const range = sel.getRangeAt(0);
          const node = range.startContainer;

          // Find the line element (could be P, DIV, LI, etc)
          let lineElement =
            node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
          while (
            lineElement &&
            lineElement !== content &&
            !["P", "DIV", "LI", "H1", "H2", "H3", "H4", "H5", "H6"].includes(
              lineElement.tagName
            )
          ) {
            lineElement = lineElement.parentElement;
          }

          if (lineElement && lineElement !== content) {
            // Copy line to clipboard
            const text = lineElement.textContent || "";
            navigator.clipboard.writeText(text).then(() => {
              // Delete the line
              lineElement.remove();
              note.contentHtml = content.innerHTML;
              saveToHistory();
              saveNote();
            });
          }
        }
      }
    });
    content.addEventListener("keydown", (e) => {
      // Rich text shortcuts
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (e.key.toLowerCase() === "b") {
          e.preventDefault();
          document.execCommand("bold");
          return;
        }
        if (e.key.toLowerCase() === "i") {
          e.preventDefault();
          document.execCommand("italic");
          return;
        }
        if (e.key.toLowerCase() === "u") {
          e.preventDefault();
          document.execCommand("underline");
          return;
        }
      }
      handleListKeys(e, content);
    });
    folderSel.addEventListener("change", () => {
      note.folderId = folderSel.value || null;
      saveNote();
    });

    // Settings dropdown toggle
    let settingsOpen = false;
    settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      settingsOpen = !settingsOpen;
      if (settingsOpen) {
        settingsDropdown.style.display = "block";
      } else {
        settingsDropdown.style.display = "none";
      }
    });

    // Close settings dropdown when clicking outside
    document.addEventListener("click", () => {
      if (settingsOpen) {
        settingsOpen = false;
        settingsDropdown.style.display = "none";
      }
    });

    settingsDropdown.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    // no plain input change; chips handle it

    // Highlighting handlers
    content.addEventListener("mouseup", () => {
      // Don't auto-highlight if note is locked
      if (!state.autoHighlight) return;
      if (content.getAttribute("contenteditable") === "false") return;
      
      applyHighlightToSelection(state.currentHighlightColor);
      note.contentHtml = content.innerHTML;
      saveHistoryIfChanged();
      markUnsaved();
    });
    // Table context menu
    content.addEventListener("contextmenu", (e) => {
      const target = e.target;
      if (
        target.tagName === "TD" ||
        target.tagName === "TH" ||
        target.tagName === "TR" ||
        target.tagName === "TABLE" ||
        target.closest("table")
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof showTableContextMenu === "function") {
          showTableContextMenu(e, target);
        }
      }
    });

    // Make sure tables stay properly formatted and draggable
    content.addEventListener("input", () => {
      const tables = content.querySelectorAll("table.note-table, table");
      tables.forEach((table) => {
        if (!table.classList.contains("note-table")) {
          table.classList.add("note-table");
        }
        table.contentEditable = "false";
        table.querySelectorAll("td, th").forEach((cell) => {
          if (cell.contentEditable !== "true") {
            cell.contentEditable = "true";
          }
        });

        if (
          !table.querySelector(".table-wrapper") &&
          typeof addTableControls === "function"
        ) {
          addTableControls(table);
        }
        if (!table.getAttribute("draggable")) {
          makeTableDraggable(table);
        }
      });
    });

    // Image tools: click image to show tools; hide on scroll/blur
    content.addEventListener("click", (e) => {
      const img = e.target && e.target.tagName === "IMG" ? e.target : null;
      if (img) {
        showImgToolsFor(img);
      } else {
        hideImgTools();
      }
    });
    // Image DnD within editor
    content.addEventListener("dragover", (e) => {
      if (draggedImg) {
        e.preventDefault();
        showEditorDropIndicator(content, e.clientX, e.clientY);
      }
    });
    content.addEventListener("drop", (e) => {
      if (draggedImg) {
        e.preventDefault();
        const r = caretRangeAtPoint(e.clientX, e.clientY);
        if (r) {
          r.insertNode(draggedImg);
        }
        removeEditorDropIndicator();
        draggedImg = null;
        note.contentHtml = content.innerHTML;
        saveHistoryIfChanged();
        markUnsaved();
      }
    });
    content.addEventListener("dragleave", (e) => {
      if (e.target === content) removeEditorDropIndicator();
    });
    content.addEventListener("scroll", hideImgTools);
    content.addEventListener("blur", hideImgTools, true);
    // Per-editor context is handled by global context menu

    // left/right open buttons removed in new split model
    node
      .querySelector('[data-action="open-window"]')
      .addEventListener("click", () => openWindow(note.id));

    // Split note button - opens note in right pane
    node
      .querySelector('[data-action="split-note"]')
      .addEventListener("click", () => {
        if (!state.splitMode) {
          enableSplit();
        }
        openInPane(note.id, "right");
      });

    return node;
  }

  function refreshOpenTabs(id) {
    ["left", "right"].forEach((side) => {
      if (state[side].tabs.includes(id)) renderTabs(side);
    });
  }

  // Windows
  function openWindow(id) {
    const note = getNote(id);
    if (!note) return;
    // Single window policy: close existing window if it's a different note
    const existingId = Object.keys(state.windows)[0];
    if (existingId && existingId !== id) closeWindow(existingId);
    if (state.windows[id]?.el && !state.windows[id].minimized) {
      bringToFront(state.windows[id].el);
      return;
    }
    const node = el.templates.window.content.firstElementChild.cloneNode(true);
    node.dataset.noteId = id;
    node.querySelector(".window-name").textContent = note.title || "Untitled";
    const body = node.querySelector(".window-body");
    body.appendChild(buildEditor(note));

    makeDraggable(node);

    const onMin = () => minimizeWindow(id);
    const onClose = () => closeWindow(id);
    node
      .querySelector('[data-action="minimize"]')
      .addEventListener("click", onMin);
    node
      .querySelector('[data-action="close"]')
      .addEventListener("click", onClose);

    el.floatLayer.appendChild(node);
    bringToFront(node);
    state.windows[id] = { el: node, minimized: false };
  }

  let zTop = 10;
  function bringToFront(win) {
    win.style.zIndex = ++zTop;
  }

  function makeDraggable(win) {
    const bar = win.querySelector(".window-title");
    let sx = 0,
      sy = 0,
      ox = 0,
      oy = 0,
      moving = false,
      lastPointerId = null;
    let raf = null;
    const onPointerDown = (e) => {
      // If clicking on window controls, do not start dragging
      if (e.target.closest(".window-controls")) return;
      moving = true;
      sx = e.clientX;
      sy = e.clientY;
      lastPointerId = e.pointerId;
      const rect = win.getBoundingClientRect();
      ox = rect.left;
      oy = rect.top;
      bringToFront(win);
      bar.classList.add("dragging");
      try {
        bar.setPointerCapture(e.pointerId);
      } catch {}
      e.preventDefault();
    };
    const onPointerMove = (ev) => {
      if (!moving) return;
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => moveTo(ox + dx, oy + dy));
    };
    const onPointerUp = () => {
      moving = false;
      bar.classList.remove("dragging");
      try {
        if (lastPointerId != null && bar.releasePointerCapture)
          bar.releasePointerCapture(lastPointerId);
      } catch {}
    };
    bar.addEventListener("pointerdown", onPointerDown);
    bar.addEventListener("pointermove", onPointerMove);
    bar.addEventListener("pointerup", onPointerUp);
    function moveTo(x, y) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rect = win.getBoundingClientRect();
      const minX = 0;
      const maxX = vw - rect.width;
      const minY = 0;
      const maxY = vh - rect.height;
      const nx = Math.min(Math.max(x, minX), Math.max(minX, maxX));
      const ny = Math.min(Math.max(y, minY), Math.max(minY, maxY));
      win.style.left = nx + "px";
      win.style.top = ny + "px";
    }

    // Make window resizable
    makeResizable(win);
  }

  function makeResizable(win) {
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "window-resize-handle";
    win.appendChild(resizeHandle);

    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    resizeHandle.addEventListener("mousedown", (e) => {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = win.getBoundingClientRect();
      startWidth = rect.width;
      startHeight = rect.height;
      bringToFront(win);
      e.stopPropagation();
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isResizing) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newWidth = Math.max(300, startWidth + dx);
      const newHeight = Math.max(200, startHeight + dy);
      win.style.width = newWidth + "px";
      win.style.height = newHeight + "px";
    });

    document.addEventListener("mouseup", () => {
      isResizing = false;
    });
  }

  function minimizeWindow(id) {
    const w = state.windows[id];
    if (!w) return;
    w.minimized = true;
    w.el.classList.add("hidden");
    const note = getNote(id);
    const chip = document.createElement("div");
    chip.className = "dock-item";
    chip.textContent = note.title || "Untitled";
    chip.title = "Restore window";
    chip.addEventListener("click", () => {
      w.minimized = false;
      w.el.classList.remove("hidden");
      chip.remove();
      bringToFront(w.el);
    });
    el.dock.appendChild(chip);
    updateEmptyState();
  }
  function closeWindow(id) {
    const w = state.windows[id];
    if (!w) return;
    w.el.remove();
    delete state.windows[id];
    updateEmptyState();
  }
  function refreshWindowTitle(id) {
    const w = state.windows[id];
    if (!w) return;
    const note = getNote(id);
    w.el.querySelector(".window-name").textContent = note.title || "Untitled";
  }

  // Track opened image viewers to prevent duplicates - in global scope
  window.openedImageWindows = window.openedImageWindows || new Map();
  const openedImageWindows = window.openedImageWindows;

  // Clean up any dead references in the map
  openedImageWindows.forEach((win, url) => {
    if (!document.body.contains(win)) {
      openedImageWindows.delete(url);
    }
  });

  // Image Viewer Window
  function openImageViewer(dataUrl) {
    // Check if this image is already open
    if (openedImageWindows.has(dataUrl)) {
      const existingWin = openedImageWindows.get(dataUrl);
      if (document.body.contains(existingWin)) {
        // Bring existing window to front
        bringToFront(existingWin);
        return;
      } else {
        // Clean up reference if window was closed manually
        openedImageWindows.delete(dataUrl);
      }
    }

    const win = document.createElement("div");
    win.className = "window image-viewer-window";
    win.style.left = "50px";
    win.style.top = "50px";
    win.style.width = "800px";
    win.style.height = "600px";
    win.style.height = "500px";
    win.dataset.imageUrl = dataUrl; // Store the data URL for reference

    let zoom = 1;
    let rotation = 0;
    let panX = 0;
    let panY = 0;

    win.innerHTML = `
      <div class="window-title">
        <span class="window-name">Image Viewer</span>
        <div class="window-controls">
          <button data-action="close" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span>Close</span>
          </button>
        </div>
      </div>
      <div class="window-body" style="display: flex; flex-direction: column; height: calc(100% - 40px); padding: 0; background: var(--bg);">
        <div class="image-viewer-content" style="flex: 1; display: flex; align-items: center; justify-content: center; overflow: auto; padding: 20px; box-sizing: border-box;">
          <img class="viewer-img" src="${dataUrl}" style="max-width: 100%; max-height: 100%; transform: translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg);">
        </div>
        <div class="image-viewer-footer" style="background: var(--panel); border-top: 1px solid var(--border); padding: 12px 20px; padding-bottom: 15px; display: flex; justify-content: center; align-items: center; gap: 12px; flex-shrink: 0;">
          <button data-action="zoom-in" style="background: transparent; border: 1px solid var(--border); color: var(--text); padding: 8px 16px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; height: 36px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35M11 8v6M8 11h6"></path>
            </svg>
            Zoom In
          </button>
          <button data-action="zoom-out" style="background: transparent; border: 1px solid var(--border); color: var(--text); padding: 8px 16px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; height: 36px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35M8 11h6"></path>
            </svg>
            Zoom Out
          </button>
          <button data-action="rotate" style="background: transparent; border: 1px solid var(--border); color: var(--text); padding: 8px 16px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; height: 36px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
            </svg>
            Rotate
          </button>
          <button data-action="reset" style="background: transparent; border: 1px solid var(--border); color: var(--text); padding: 8px 16px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; height: 36px;">
            Reset
          </button>
        </div>
      </div>
    `;

    const img = win.querySelector(".viewer-img");

    const updateTransform = () => {
      img.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg)`;
    };

    win
      .querySelector('[data-action="zoom-in"]')
      .addEventListener("click", () => {
        zoom = Math.min(zoom + 0.25, 5);
        updateTransform();
      });

    win
      .querySelector('[data-action="zoom-out"]')
      .addEventListener("click", () => {
        zoom = Math.max(zoom - 0.25, 0.25);
        updateTransform();
      });

    win
      .querySelector('[data-action="rotate"]')
      .addEventListener("click", () => {
        rotation = (rotation + 90) % 360;
        updateTransform();
      });

    win.querySelector('[data-action="reset"]').addEventListener("click", () => {
      zoom = 1;
      rotation = 0;
      panX = 0;
      panY = 0;
      updateTransform();
    });

    win.querySelector('[data-action="close"]').addEventListener("click", () => {
      const imgUrl = win.dataset.imageUrl;
      if (imgUrl && openedImageWindows.has(imgUrl)) {
        openedImageWindows.delete(imgUrl);
      }
      win.remove();
    });

    // Store reference to this window before adding event listeners
    openedImageWindows.set(dataUrl, win);

    // Pan/drag functionality for the image
    let isDragging = false;
    let startX = 0,
      startY = 0;
    const container = win.querySelector(".window-body");

    img.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        // Left click only
        isDragging = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        img.style.cursor = "grabbing";
        e.preventDefault();
      }
    });

    container.addEventListener("mousemove", (e) => {
      if (isDragging) {
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        updateTransform();
      }
    });

    container.addEventListener("mouseup", () => {
      isDragging = false;
      img.style.cursor = "grab";
    });

    container.addEventListener("mouseleave", () => {
      isDragging = false;
      img.style.cursor = "grab";
    });

    img.style.cursor = "grab";
    img.style.transition = "none";

    makeDraggable(win);
    el.floatLayer.appendChild(win);
    bringToFront(win);
  }

  // Actions
  function newNote() {
    const now = new Date().toISOString();
    const today = new Date();
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = String(today.getFullYear()).slice(-2);
    const defaultTitle = `${dayName} - ${day}/${month}/${year}`;
    const n = {
      id: uid(),
      title: defaultTitle,
      contentHtml: "",
      tags: [],
      folderId: null,
      createdAt: now,
      updatedAt: now,
    };
    state.notes.unshift(n);
    saveNotes();
    renderSidebar();
    openInPane(n.id, "left");
  }

  // Events
  el.newNoteBtn.addEventListener("click", newNote);

  // Search functionality
  el.searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    renderSidebar();
    // Toggle clear button visibility
    const searchContainer = el.searchInput.closest(".sidebar-search");
    if (state.searchQuery.trim()) {
      searchContainer.classList.add("has-search");
    } else {
      searchContainer.classList.remove("has-search");
    }
  });

  el.clearSearch.addEventListener("click", () => {
    state.searchQuery = "";
    el.searchInput.value = "";
    el.searchInput.closest(".sidebar-search").classList.remove("has-search");
    renderSidebar();
    el.searchInput.focus();
  });

  // Search results modal - Enter key to show results
  el.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const query = el.searchInput.value.trim();
      if (query) showSearchResults(query);
    }
  });

  function highlightText(text, query) {
    if (!query || !text) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const regex = new RegExp(
      `(${escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    return escaped.replace(regex, "<mark>$1</mark>");
  }

  function showSearchResults(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    // Search through all notes
    state.notes.forEach((note) => {
      const matches = [];
      const title = note.title || "Untitled";
      const content = note.contentHtml || note.content || "";
      const tags = note.tags || [];

      // Check title match
      if (title.toLowerCase().includes(lowerQuery)) {
        matches.push({
          type: "TITLE",
          text: title,
          highlight: highlightText(title, query),
        });
      }

      // Check tags match
      const matchingTags = tags.filter((tag) =>
        tag.toLowerCase().includes(lowerQuery)
      );
      if (matchingTags.length > 0) {
        matches.push({ type: "TAG", tags: matchingTags });
      }

      // Check folder match (including nested folders)
      if (note.folderId) {
        const folder = state.folders.find((f) => f.id === note.folderId);
        if (folder && folder.name.toLowerCase().includes(lowerQuery)) {
          matches.push({
            type: "FOLDER",
            text: folder.name,
            highlight: highlightText(folder.name, query),
          });
        }
      }

      // Check content match
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = content;
      const plainText = tempDiv.textContent || "";
      const matchIndex = plainText.toLowerCase().indexOf(lowerQuery);
      if (matchIndex >= 0) {
        // Extract context around the match
        const start = Math.max(0, matchIndex - 50);
        const end = Math.min(plainText.length, matchIndex + query.length + 50);
        let preview = plainText.substring(start, end);
        if (start > 0) preview = "..." + preview;
        if (end < plainText.length) preview = preview + "...";
        matches.push({
          type: "CONTENT",
          text: preview,
          highlight: highlightText(preview, query),
        });
      }

      if (matches.length > 0) {
        results.push({ note, matches });
      }
    });

    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "search-results-overlay";

    // Create and show modal
    const template = document.getElementById("search-results-template");
    const modal = template.content
      .cloneNode(true)
      .querySelector(".search-results-modal");

    const queryEl = modal.querySelector(".search-results-query");
    queryEl.innerHTML = `Found <strong>${results.length}</strong> result${
      results.length !== 1 ? "s" : ""
    } for "<strong>${escapeHtml(query)}</strong>"`;

    const contentEl = modal.querySelector(".search-results-content");

    const closeModal = () => {
      overlay.remove();
      modal.remove();
      document.removeEventListener("keydown", handleEsc);
    };

    if (results.length === 0) {
      contentEl.innerHTML =
        '<div class="no-results">No results found. Try a different search term.</div>';
    } else {
      results.forEach(({ note, matches }) => {
        const item = document.createElement("div");
        item.className = "search-result-item";

        // Get primary match type
        const primaryMatch = matches[0];
        const matchType = primaryMatch.type;

        const header = document.createElement("div");
        header.className = "search-result-header";
        header.innerHTML = `
          <span class="search-result-icon">📄</span>
          <span class="search-result-title">${highlightText(
            note.title || "Untitled",
            query
          )}</span>
          <span class="search-result-match-type">${matchType}</span>
        `;
        item.appendChild(header);

        // Show content preview if available
        const contentMatch = matches.find((m) => m.type === "CONTENT");
        if (contentMatch) {
          const preview = document.createElement("div");
          preview.className = "search-result-preview";
          preview.innerHTML = contentMatch.highlight;
          item.appendChild(preview);
        }

        // Show folder if it matches
        const folderMatch = matches.find((m) => m.type === "FOLDER");
        if (folderMatch) {
          const folderDiv = document.createElement("div");
          folderDiv.className = "search-result-folder";
          folderDiv.innerHTML = `📁 ${folderMatch.highlight}`;
          item.appendChild(folderDiv);
        }

        // Show tags if they match
        const tagMatch = matches.find((m) => m.type === "TAG");
        if (tagMatch) {
          const tagsDiv = document.createElement("div");
          tagsDiv.className = "search-result-tags";
          tagMatch.tags.forEach((tag) => {
            const tagSpan = document.createElement("span");
            tagSpan.className = "search-result-tag";
            tagSpan.innerHTML = "#" + highlightText(tag, query);
            tagsDiv.appendChild(tagSpan);
          });
          item.appendChild(tagsDiv);
        }

        // Click to open note and scroll to match
        item.addEventListener("click", () => {
          openInPane(note.id, "left");
          closeModal();

          // Wait for note to load, then scroll to match
          setTimeout(() => {
            const contentMatch = matches.find((m) => m.type === "CONTENT");
            if (contentMatch) {
              // Find and scroll to the matched text in the content
              const paneContent = document.querySelector(
                '[data-pane="left"] .pane-content'
              );
              if (paneContent) {
                const contentEditor =
                  paneContent.querySelector(".content.editable");
                if (contentEditor) {
                  // Create a walker to find text nodes
                  const walker = document.createTreeWalker(
                    contentEditor,
                    NodeFilter.SHOW_TEXT,
                    null
                  );

                  let node;
                  while ((node = walker.nextNode())) {
                    const text = node.textContent.toLowerCase();
                    const index = text.indexOf(lowerQuery);
                    if (index >= 0) {
                      const parent = node.parentElement;
                      if (parent) {
                        // Create a temporary highlight span for just the matched word
                        const range = document.createRange();
                        range.setStart(node, index);
                        range.setEnd(node, index + query.length);

                        const tempHighlight = document.createElement("span");
                        tempHighlight.style.cssText =
                          "background-color: #ffff00; transition: background-color 0.3s;";

                        try {
                          range.surroundContents(tempHighlight);
                          tempHighlight.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });

                          // Remove highlight after 2 seconds
                          setTimeout(() => {
                            const parent = tempHighlight.parentNode;
                            if (parent) {
                              parent.replaceChild(
                                document.createTextNode(
                                  tempHighlight.textContent
                                ),
                                tempHighlight
                              );
                              parent.normalize(); // Merge text nodes
                            }
                          }, 2000);
                        } catch (e) {
                          // Fallback: just scroll to the parent
                          parent.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                        }
                      }
                      break;
                    }
                  }
                }
              }
            }
          }, 300);
        });

        contentEl.appendChild(item);
      });
    }

    const closeBtn = modal.querySelector(".close-search-results");
    closeBtn.addEventListener("click", closeModal);

    overlay.addEventListener("click", closeModal);

    // Close on ESC key
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    document.addEventListener("keydown", handleEsc);

    document.body.appendChild(overlay);
    document.body.appendChild(modal);
  }

  // Trash window
  function showTrashWindow() {
    const overlay = document.createElement("div");
    overlay.className = "search-results-overlay";

    const modal = document.createElement("div");
    modal.className = "search-results-modal";
    modal.innerHTML = `
      <div class="search-results-header">
        <h2>Trash (${state.trash.length} items)</h2>
        <div class="trash-actions">
          <button class="empty-all-btn">Empty All</button>
          <button class="close-modal-btn">×</button>
        </div>
      </div>
      <div class="search-results-list" id="trashList" style="max-height: 300px; overflow-y: auto;"></div>
    `;

    const closeModal = () => {
      overlay.remove();
      modal.remove();
      document.removeEventListener("keydown", handleEsc);
    };

    // Empty all button
    modal
      .querySelector(".empty-all-btn")
      .addEventListener("click", async () => {
        const ok = await modalConfirm(
          `Permanently delete all ${state.trash.length} items in trash?\n\nThis action cannot be undone!`
        );
        if (ok) {
          state.trash = [];
          saveTrash();
          closeModal();
          renderSidebar();
        }
      });

    // Close button
    modal
      .querySelector(".close-modal-btn")
      .addEventListener("click", closeModal);
    overlay.addEventListener("click", closeModal);

    // Build trash list
    const list = modal.querySelector("#trashList");
    if (state.trash.length === 0) {
      list.innerHTML = '<div class="no-results">Trash is empty</div>';
    } else {
      state.trash
        .slice()
        .reverse()
        .forEach((item) => {
          const trashItem = document.createElement("div");
          trashItem.className = "search-result-item trash-result-item";

          const title = document.createElement("div");
          title.className = "search-result-title";
          title.style.cursor =
            item.type === "folder" && item.notes?.length > 0
              ? "pointer"
              : "default";

          // Add icon for folders
          if (item.type === "folder") {
            const noteCount = item.notes ? item.notes.length : 0;
            const expandIcon =
              noteCount > 0
                ? '<span class="folder-expand-icon" style="display: inline-block; margin-right: 4px; transition: transform 0.2s;">▶</span>'
                : "";
            title.innerHTML = `${expandIcon}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 6px; vertical-align: middle;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>${
              item.name || "Untitled Folder"
            }${
              noteCount > 0
                ? ` (${noteCount} note${noteCount !== 1 ? "s" : ""})`
                : ""
            }`;
          } else {
            title.textContent = item.title || "Untitled";
          }
          trashItem.appendChild(title);

          const meta = document.createElement("div");
          meta.className = "search-result-meta";
          meta.textContent = `${
            item.type === "folder" ? "Folder" : "Note"
          } • Deleted: ${fmt(item.deletedAt)}`;
          trashItem.appendChild(meta);

          const actions = document.createElement("div");
          actions.className = "trash-item-actions-inline";
          actions.innerHTML = `
          <button class="restore-btn-inline" data-id="${item.id}" data-type="${
            item.type || "note"
          }">Restore${
            item.type === "folder" && item.notes?.length > 0 ? " All" : ""
          }</button>
          <button class="delete-forever-btn-inline" data-id="${
            item.id
          }">Delete Forever</button>
        `;
          trashItem.appendChild(actions);

          // Add nested notes container for folders
          if (item.type === "folder" && item.notes && item.notes.length > 0) {
            const nestedContainer = document.createElement("div");
            nestedContainer.className = "nested-notes-container";
            nestedContainer.style.display = "none";
            nestedContainer.style.marginLeft = "24px";
            nestedContainer.style.marginTop = "8px";
            nestedContainer.style.paddingLeft = "12px";
            nestedContainer.style.borderLeft = "2px solid var(--border)";

            item.notes.forEach((note, noteIndex) => {
              const noteItem = document.createElement("div");
              noteItem.className = "nested-note-item";
              noteItem.style.padding = "8px";
              noteItem.style.marginBottom = "4px";
              noteItem.style.background = "var(--panel-2)";
              noteItem.style.borderRadius = "6px";

              noteItem.innerHTML = `
                <div style="font-weight: 500; margin-bottom: 4px;">${
                  note.title || "Untitled"
                }</div>
                <div style="display: flex; gap: 8px; margin-top: 6px;">
                  <button class="restore-note-btn" data-folder-id="${
                    item.id
                  }" data-note-index="${noteIndex}" style="padding: 4px 12px; font-size: 12px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer;">Restore</button>
                </div>
              `;

              nestedContainer.appendChild(noteItem);
            });

            trashItem.appendChild(nestedContainer);

            // Toggle expand/collapse on title click
            title.addEventListener("click", () => {
              const isExpanded = nestedContainer.style.display !== "none";
              nestedContainer.style.display = isExpanded ? "none" : "block";
              const expandIcon = title.querySelector(".folder-expand-icon");
              if (expandIcon) {
                expandIcon.style.transform = isExpanded
                  ? "rotate(0deg)"
                  : "rotate(90deg)";
              }
            });
          }

          list.appendChild(trashItem);
        });

      // Restore buttons
      list.querySelectorAll(".restore-btn-inline").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const item = state.trash.find((t) => t.id === id);
          if (item) {
            const { deletedAt, type, notes, subfolders, ...restored } = item;

            if (type === "folder") {
              // Restore folder
              state.folders.push(restored);
              saveFolders();

              // Restore all notes that were inside the folder
              if (notes && notes.length > 0) {
                notes.forEach((note) => {
                  state.notes.push(note);
                });
                saveNotes();
              }

              // Restore subfolders that were nested
              if (subfolders && subfolders.length > 0) {
                subfolders.forEach((subfolder) => {
                  state.folders.push(subfolder);
                });
                saveFolders();
              }
            } else {
              // Restore note
              state.notes.push(restored);
              saveNotes();
            }

            state.trash = state.trash.filter((t) => t.id !== id);
            saveTrash();
            closeModal();
            renderSidebar();
          }
        });
      });

      // Use event delegation for restore buttons (works for dynamically created elements)
      list.addEventListener("click", async (e) => {
        const restoreNoteBtn = e.target.closest(".restore-note-btn");
        if (restoreNoteBtn) {
          e.stopPropagation();
          const folderId = restoreNoteBtn.dataset.folderId;
          const noteIndex = parseInt(restoreNoteBtn.dataset.noteIndex);

          const folder = state.trash.find(
            (t) => t.id === folderId && t.type === "folder"
          );
          if (folder && folder.notes && folder.notes[noteIndex]) {
            const note = folder.notes[noteIndex];

            // Check if the folder still exists (not deleted)
            const folderExists = state.folders.some(
              (f) => f.id === note.folderId
            );

            // If folder doesn't exist, make note uncategorized
            if (!folderExists) {
              note.folderId = null;
            }

            // Restore the note
            state.notes.push(note);
            saveNotes();

            // Remove note from folder's notes array
            folder.notes.splice(noteIndex, 1);

            // If folder is now empty, update the display
            if (folder.notes.length === 0) {
              delete folder.notes;
            }

            saveTrash();
            closeModal();
            renderSidebar();
          }
        }
      });

      // Delete forever buttons
      list.querySelectorAll(".delete-forever-btn-inline").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const ok = await modalConfirm(
            "Permanently delete this item?\n\nThis cannot be undone!"
          );
          if (ok) {
            state.trash = state.trash.filter((t) => t.id !== id);
            saveTrash();
            // Update the modal count and remove item
            modal.querySelector(
              "h2"
            ).textContent = `Trash (${state.trash.length} items)`;
            btn.closest(".trash-result-item").remove();
            if (state.trash.length === 0) {
              list.innerHTML = '<div class="no-results">Trash is empty</div>';
            }
            renderSidebar();
          }
        });
      });
    }

    // Close on ESC key
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    document.addEventListener("keydown", handleEsc);

    document.body.appendChild(overlay);
    document.body.appendChild(modal);
  }

  // Split helper functions
  function enableSplit() {
    state.splitMode = true;
    el.workspace.classList.remove("split-off");
    el.workspace.style.gridTemplateColumns = "1fr 4px 1fr";
    updateEmptyState();
  }
  function disableSplit() {
    state.splitMode = false;
    el.workspace.classList.add("split-off");
    // Remove inline style and let CSS handle it
    el.workspace.style.gridTemplateColumns = "";
    updateEmptyState();
  }

  // Split zones for tab dragging
  let splitZones = null;
  let dragSourceSide = null;

  function showSplitZones(sourceSide) {
    if (splitZones) return;

    dragSourceSide = sourceSide;
    const targetSide = sourceSide === "left" ? "right" : "left";

    // Check if target side already has tabs
    const targetHasTabs = state[targetSide].tabs.length > 0;
    const actionText = targetHasTabs ? "Swipe" : "Split";

    splitZones = document.createElement("div");
    splitZones.className = "split-zones";

    // Only show the opposite side zone
    splitZones.innerHTML = `
      <div class="split-zone split-${targetSide}" data-target="${targetSide}">
        <div class="split-zone-content">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="18"></rect>
            <rect x="14" y="3" width="7" height="18"></rect>
          </svg>
          <span>${actionText} ${targetSide === "left" ? "Left" : "Right"}</span>
        </div>
      </div>
    `;

    // Append to workspace instead of body
    el.workspace.style.position = "relative";
    el.workspace.appendChild(splitZones);

    // Add event listeners for drop zones
    splitZones.querySelectorAll(".split-zone").forEach((zone) => {
      zone.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        zone.classList.add("active");
      });

      zone.addEventListener("dragleave", (e) => {
        // Only remove active if we're actually leaving the zone
        const rect = zone.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        if (
          x < rect.left ||
          x > rect.right ||
          y < rect.top ||
          y > rect.bottom
        ) {
          zone.classList.remove("active");
        }
      });

      zone.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove("active");

        const tabId = e.dataTransfer.getData("text/tab-id");
        const sourceSide = e.dataTransfer.getData("text/side");
        const targetSide = zone.dataset.target;

        if (tabId && sourceSide !== targetSide) {
          const sourceState = state[sourceSide];
          const targetState = state[targetSide];

          // Check if both sides have tabs (swap mode)
          const bothHaveTabs =
            sourceState.tabs.length > 0 && targetState.tabs.length > 0;

          if (bothHaveTabs) {
            // SWAP MODE: Exchange all tabs between panes
            const tempTabs = [...sourceState.tabs];
            const tempActive = sourceState.active;

            sourceState.tabs = [...targetState.tabs];
            sourceState.active = targetState.active;

            targetState.tabs = tempTabs;
            targetState.active = tempActive;
          } else {
            // MOVE MODE: Move single tab
            // Remove from source
            const sourceIndex = sourceState.tabs.indexOf(tabId);
            if (sourceIndex >= 0) {
              sourceState.tabs.splice(sourceIndex, 1);
            }

            // If source becomes empty, clear active
            if (sourceState.tabs.length === 0) {
              sourceState.active = null;
            } else if (sourceState.active === tabId) {
              // If active tab was moved, set new active
              sourceState.active = sourceState.tabs[0];
            }

            // Add to target
            targetState.tabs.push(tabId);
            targetState.active = tabId;

            // Always enable split when moving to opposite side
            if (!state.splitMode) {
              enableSplit();
            }
          }

          // Render both sides
          renderTabs(sourceSide);
          renderTabs(targetSide);
          renderPane(sourceSide);
          renderPane(targetSide);

          // Check if one side is now empty and handle accordingly
          ensureSplitState();

          // Update empty state
          updateEmptyState();
        }

        hideSplitZones();
      });
    });
  }

  function hideSplitZones() {
    if (splitZones) {
      splitZones.remove();
      splitZones = null;
    }
    dragSourceSide = null;
  }

  // Tools menu
  function toggleMenu(menuEl) {
    menuEl.classList.toggle("open");
  }
  function closeMenus() {
    if (el.toolsMenu) el.toolsMenu.classList.remove("open");
    el.settingsMenu.classList.remove("open");
  }
  if (el.toolsBtn) {
    el.toolsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu(el.toolsMenu);
      el.settingsMenu.classList.remove("open");
    });
  }
  el.settingsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu(el.settingsMenu);
    if (el.toolsMenu) el.toolsMenu.classList.remove("open");
  });
  document.addEventListener("click", (e) => {
    // Don't close menus if clicking inside them
    if ((el.toolsMenu && el.toolsMenu.contains(e.target)) || el.settingsMenu.contains(e.target)) {
      return;
    }
    closeMenus();
  });

  // Tools actions
  if (el.duplicateBtn) {
    el.duplicateBtn.addEventListener("click", () => {
      const src = getActive(state.right.active ? "right" : "left");
      if (!src) return;
      const now = new Date().toISOString();
      const copy = {
        ...src,
        id: uid(),
        title: src.title + " (copy)",
        createdAt: now,
        updatedAt: now,
      };
      state.notes.push(copy);
      saveNotes();
      renderSidebar();
      openInPane(copy.id, "left");
    });
  }
  if (el.trashBtn) {
    el.trashBtn.addEventListener("click", () => {
      showTrashWindow();
    });
  }
  if (el.deleteBtn) {
    el.deleteBtn.addEventListener("click", async () => {
      const activeSide = state.right.active ? "right" : "left";
      const id = state[activeSide].active;
      if (!id) return;
      const ok = await modalConfirm("Delete this note?");
      if (!ok) return;
      // move to trash
      const idx = state.notes.findIndex((n) => n.id === id);
      if (idx >= 0) {
        const [note] = state.notes.splice(idx, 1);
        state.trash.push({ ...note, deletedAt: new Date().toISOString() });
      }
      closeTab("left", id);
      closeTab("right", id);
      closeWindow(id);
      saveNotes();
      saveTrash();
      renderSidebar();
    });
  }
  if (el.exportBtn) {
    el.exportBtn.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state.notes, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "notes-export.json";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
  if (el.exportHtmlBtn) {
    el.exportHtmlBtn.addEventListener("click", () => {
      const n = getActive(state.right.active ? "right" : "left");
      if (!n) return modalAlert("No active note");
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
        n.title || "Note"
      )}</title></head><body><h1>${escapeHtml(n.title || "")}</h1>${
        n.contentHtml || ""
      }</body></html>`;
      const blob = new Blob([html], { type: "text/html" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (n.title || "note") + ".html";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
  if (el.exportPdfBtn) {
    el.exportPdfBtn.addEventListener("click", () => {
      const n = getActive(state.right.active ? "right" : "left");
      if (!n) return modalAlert("No active note");
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(
        `<!doctype html><html><head><meta charset=\"utf-8\"><title>${escapeHtml(
          n.title || "Note"
        )}</title><style>body{font-family:Segoe UI,Roboto,Arial; padding:24px;} h1{margin-top:0} img{max-width:100%;}</style></head><body><h1>${escapeHtml(
          n.title || ""
        )}</h1>${n.contentHtml || ""}</body></html>`
      );
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
      }, 250);
    });
  }
  // Insert Table
  if (el.insertTableBtn) {
    el.insertTableBtn.addEventListener("click", () => {
      insertTablePlaceholder();
    });
  }

  if (el.importBtn) {
    el.importBtn.addEventListener("click", () => el.importInput.click());
  }
  el.importInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error("Invalid file");

      // Create or find "Imported" folder
      const timestamp = new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const folderName = `Imported - ${timestamp}`;

      let importFolder = state.folders.find((f) => f.name === folderName);
      if (!importFolder) {
        importFolder = {
          id: uid(),
          name: folderName,
          parentId: null,
          createdAt: new Date().toISOString(),
        };
        state.folders.push(importFolder);
        state.foldersOpen.add(importFolder.id); // Auto-open the folder
      }

      // Add imported notes to the folder
      arr.forEach((n) => {
        const now = new Date().toISOString();
        state.notes.unshift({
          id: uid(),
          title: n.title || "Imported",
          contentHtml: n.contentHtml || n.content || "",
          tags: n.tags || [],
          folderId: importFolder.id, // Put in imported folder
          images: n.images || [], // IMPORTANT: Include images array
          history: n.history || [],
          historyIndex: n.historyIndex || -1,
          createdAt: n.createdAt || now,
          updatedAt: n.updatedAt || now,
        });
      });

      saveNotes();
      saveFolders();
      renderSidebar();

      modalAlert(
        `✓ Imported ${arr.length} note${
          arr.length !== 1 ? "s" : ""
        } into "${folderName}" folder`
      );
    } catch (err) {
      modalAlert("Import failed: " + err.message);
    }
    e.target.value = "";
  });

  // Settings actions
  function applyTheme(themeName) {
    // Remove all theme classes
    document.body.classList.remove(
      "theme-light",
      "theme-ocean",
      "theme-forest",
      "theme-sunset",
      "theme-purple",
      "theme-nord"
    );

    // Apply new theme (dark is default, no class needed)
    if (themeName !== "dark") {
      document.body.classList.add(`theme-${themeName}`);
    }

    // Update active indicator
    el.themeOptions.forEach((btn) => {
      if (btn.dataset.theme === themeName) {
        btn.style.background = "var(--accent)";
        btn.style.color = "#fff";
      } else {
        btn.style.background = "";
        btn.style.color = "";
      }
    });

    state.settings.theme = themeName;
    Storage.saveSettings(state.settings);
  }

  // Theme selector
  el.themeOptions.forEach((btn) => {
    btn.addEventListener("click", () => {
      applyTheme(btn.dataset.theme);
    });
  });
  el.clearAllBtn.addEventListener("click", async () => {
    const ok = await modalConfirm("Clear ALL notes? This cannot be undone.");
    if (!ok) return;
    state.notes = [];
    state.left = { tabs: [], active: null };
    state.right = { tabs: [], active: null };
    Object.keys(state.windows).forEach(closeWindow);
    saveNotes();
    renderSidebar();
    ["left", "right"].forEach(renderPane);
  });

  // Auto Backup using File System Access API
  async function enableAutoBackup() {
    if (!window.showSaveFilePicker) {
      modalAlert(
        "Your browser does not support Auto Backup (requires Chromium-based browser). You can still use Export to save a file manually."
      );
      return;
    }
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: "notes-backup.json",
        types: [
          { description: "JSON", accept: { "application/json": [".json"] } },
        ],
      });
      state.backupHandle = handle;
      el.autoBackupBtn.textContent = "Auto Backup: ON";
      el.autoBackupBtn.classList.add("active");
      await writeBackup();
    } catch (err) {
      /* user canceled */
    }
  }
  async function writeBackup() {
    if (!state.backupHandle) return;
    const writable = await state.backupHandle.createWritable();
    await writable.write(
      new Blob([JSON.stringify(state.notes, null, 2)], {
        type: "application/json",
      })
    );
    await writable.close();
  }
  el.autoBackupBtn.addEventListener("click", enableAutoBackup);

  // About App button
  const aboutAppBtn = document.getElementById("aboutAppBtn");
  if (aboutAppBtn) {
    aboutAppBtn.addEventListener("click", () => {
      el.settingsMenu.classList.remove("open");
      showAboutModal();
    });
  }

  function showAboutModal() {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal about-modal">
        <div class="modal-header">
          <span class="modal-title">About My Notes</span>
          <button class="modal-x" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <div class="about-content">
            <div class="about-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
            </div>
            <h2>My Notes</h2>
            <div class="about-info">
              <p><strong>Version:</strong> 8.0</p>
              <p><strong>Build:</strong> 8</p>
              <p><strong>Last Updated:</strong> November 6, 2025</p>
              <p><strong>Created by:</strong> Momen</p>
            </div>
            <div class="about-description">
              <p>Built to show that anyone can create their own tools. Freedom is always an option to go for.</p>
              <p style="margin-top: 8px; font-style: italic; color: var(--muted);">A powerful note-taking application with markdown support, themes, and workspaces.</p>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn primary modal-close">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close handlers
    const closeBtn = modal.querySelector(".modal-x");
    const closeActionBtn = modal.querySelector(".modal-close");
    const overlay = modal;
    
    const closeModal = () => modal.remove();
    
    closeBtn.addEventListener("click", closeModal);
    closeActionBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  // Highlight palette & toggle
  if (el.hlPalette) {
    el.hlPalette.querySelectorAll("button[data-color]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        state.currentHighlightColor = btn.dataset.color;
        // Update active state
        el.hlPalette
          .querySelectorAll("button[data-color]")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        // Don't close menu - let user select multiple colors
      });
    });
    // Set initial active state
    const firstBtn = el.hlPalette.querySelector("button[data-color]");
    if (firstBtn) {
      firstBtn.classList.add("active");
      state.currentHighlightColor = firstBtn.dataset.color;
    }
  }
  if (el.autoHlToggle) {
    el.autoHlToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      state.autoHighlight = !state.autoHighlight;
      el.autoHlToggle.textContent =
        "Auto Highlight: " + (state.autoHighlight ? "ON" : "OFF");
    });
  }

  // Auto-save toggle
  if (el.autoSaveToggle) {
    el.autoSaveToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      state.settings.autoSave = !state.settings.autoSave;
      Storage.saveSettings(state.settings);
      el.autoSaveToggle.textContent =
        "Auto Save: " + (state.settings.autoSave ? "ON" : "OFF");
    });
    // Initialize text
    el.autoSaveToggle.textContent =
      "Auto Save: " + (state.settings.autoSave ? "ON" : "OFF");
  }

  // Folders
  if (el.newFolderBtn) {
    el.newFolderBtn.addEventListener("click", async () => {
      const name = await modalPrompt("New Folder", "Folder name");
      if (!name) return;
      const f = { id: uid(), name, parentId: null };
      state.folders.push(f);
      saveFolders();
      // refresh open editors' selects
      document.querySelectorAll("select.folder").forEach((sel) => {
        const current = sel.value;
        renderFolderOptions(sel, current);
      });
      renderSidebar();
    });
  }
  function renderFolderOptions(selectEl, selectedId) {
    selectEl.innerHTML = "";
    const optNone = document.createElement("option");
    optNone.value = "";
    optNone.textContent = "No Folder";
    selectEl.appendChild(optNone);

    // Render folders hierarchically in dropdown
    const renderFolderOptionsTree = (parentId, prefix = "") => {
      const children = state.folders
        .filter((f) => (f.parentId || null) === parentId)
        .sort((a, b) => a.name.localeCompare(b.name));
      children.forEach((f) => {
        const o = document.createElement("option");
        o.value = f.id;
        o.textContent = prefix + f.name;
        selectEl.appendChild(o);
        renderFolderOptionsTree(f.id, prefix + "  ");
      });
    };
    renderFolderOptionsTree(null, "");

    if (selectedId) selectEl.value = selectedId;
  }

  // Context menu helpers
  let ctxEl = null;
  function showContextMenu(x, y, handlers, scope) {
    hideContextMenu();
    if (!el.ctxTemplate) return;
    ctxEl = el.ctxTemplate.content.firstElementChild.cloneNode(true);
    const rect = document.body.getBoundingClientRect();
    ctxEl.style.left = Math.min(x, rect.width - 220) + "px";
    ctxEl.style.top = y + "px";
    // show only relevant sections
    ctxEl.querySelectorAll(".ctx-section").forEach((sec) => {
      const s = sec.getAttribute("data-scope");
      sec.style.display = s === scope ? "grid" : "none";
    });

    document.body.appendChild(ctxEl);
    const btnH = ctxEl.querySelector('[data-cmd="highlight"]');
    if (btnH)
      btnH.addEventListener("click", () => {
        handlers.onHighlight && handlers.onHighlight();
        hideContextMenu();
      });
    const bSN = ctxEl.querySelector('[data-cmd="new-note"]');
    if (bSN)
      bSN.addEventListener("click", async () => {
        await handlers.onNewNote?.();
        hideContextMenu();
      });
    const bSF = ctxEl.querySelector('[data-cmd="new-folder"]');
    if (bSF)
      bSF.addEventListener("click", async () => {
        await handlers.onNewFolder?.();
        hideContextMenu();
      });
    const bOL = ctxEl.querySelector('[data-cmd="open-left"]');
    if (bOL)
      bOL.addEventListener("click", () => {
        handlers.onOpenLeft && handlers.onOpenLeft();
        hideContextMenu();
      });
    const bOR = ctxEl.querySelector('[data-cmd="open-right"]');
    if (bOR)
      bOR.addEventListener("click", () => {
        handlers.onOpenRight && handlers.onOpenRight();
        hideContextMenu();
      });
    const bOW = ctxEl.querySelector('[data-cmd="open-window"]');
    if (bOW)
      bOW.addEventListener("click", () => {
        handlers.onOpenWindow && handlers.onOpenWindow();
        hideContextMenu();
      });
    const bDN = ctxEl.querySelector('[data-cmd="delete-note"]');
    if (bDN)
      bDN.addEventListener("click", async () => {
        await handlers.onDeleteNote?.();
        hideContextMenu();
      });
    const bNSF = ctxEl.querySelector('[data-cmd="new-subfolder"]');
    if (bNSF)
      bNSF.addEventListener("click", async () => {
        await handlers.onNewSubfolder?.();
        hideContextMenu();
      });
    const bRF = ctxEl.querySelector('[data-cmd="rename-folder"]');
    if (bRF)
      bRF.addEventListener("click", async () => {
        await handlers.onRenameFolder?.();
        hideContextMenu();
      });
    const bRN = ctxEl.querySelector('[data-cmd="rename-note"]');
    if (bRN)
      bRN.addEventListener("click", async () => {
        await handlers.onRenameNote?.();
        hideContextMenu();
      });
    const bDF = ctxEl.querySelector('[data-cmd="delete-folder"]');
    if (bDF)
      bDF.addEventListener("click", async () => {
        await handlers.onDeleteFolder?.();
        hideContextMenu();
      });
    const bCT = ctxEl.querySelector('[data-cmd="close-tab"]');
    if (bCT)
      bCT.addEventListener("click", async () => {
        await handlers.onCloseTab?.();
        hideContextMenu();
      });
    const bCOT = ctxEl.querySelector('[data-cmd="close-other-tabs"]');
    if (bCOT)
      bCOT.addEventListener("click", async () => {
        await handlers.onCloseOtherTabs?.();
        hideContextMenu();
      });
    const bCAT = ctxEl.querySelector('[data-cmd="close-all-tabs"]');
    if (bCAT)
      bCAT.addEventListener("click", async () => {
        await handlers.onCloseAllTabs?.();
        hideContextMenu();
      });
    const bPT = ctxEl.querySelector('[data-cmd="pin-tab"]');
    if (bPT) {
      // Update button text and icon based on pin state
      const isPinned = handlers.tabId && state.pinnedTabs.has(handlers.tabId);
      
      // Clear button content first
      bPT.innerHTML = '';
      
      // Create SVG
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '14');
      svg.setAttribute('height', '14');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      
      if (isPinned) {
        // Unpin icon (pin with slash)
        svg.innerHTML = `
          <path d="M12 17v5"></path>
          <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"></path>
          <line x1="2" y1="2" x2="22" y2="22"></line>
        `;
      } else {
        // Pin icon (normal)
        svg.innerHTML = `
          <path d="M12 17v5"></path>
          <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"></path>
        `;
      }
      
      // Add SVG and text
      bPT.appendChild(svg);
      bPT.appendChild(document.createTextNode(isPinned ? 'Unpin Tab' : 'Pin Tab'));
      
      bPT.addEventListener("click", async () => {
        await handlers.onPinTab?.();
        hideContextMenu();
      });
    }
    setTimeout(() => {
      document.addEventListener("click", hideContextMenu, { once: true });
    });
  }
  function hideContextMenu() {
    if (ctxEl) {
      ctxEl.remove();
      ctxEl = null;
    }
  }

  // Handle click on highlighted text
  function handleHighlightClick(e) {
    const target = e.target;
    if (target.classList.contains("hl")) {
      // Don't remove highlight if note is locked
      const content = target.closest(".content.editable");
      if (content && content.getAttribute("contenteditable") === "false") {
        // Prevent any action when locked
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      // Create a text node with the same content
      const text = document.createTextNode(target.textContent);
      // Replace the highlight span with just the text
      target.parentNode.replaceChild(text, target);
      // Update the note content
      if (content && content.closest(".pane").querySelector(".editor.active")) {
        const noteId = content.closest(".pane").querySelector(".editor.active")
          .dataset.id;
        const note = getNote(noteId);
        if (note) {
          note.contentHtml = content.innerHTML;
          saveNotes();
        }
      }
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // Add click handler for highlights
  document.addEventListener("click", handleHighlightClick, true);

  // Selection highlight
  function applyHighlightToSelection(color) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    
    // Don't allow highlighting if note is locked
    const editableContent = range.commonAncestorContainer.nodeType === 3 
      ? range.commonAncestorContainer.parentElement.closest('.content.editable')
      : range.commonAncestorContainer.closest('.content.editable');
    if (editableContent && editableContent.getAttribute("contenteditable") === "false") {
      return;
    }

    // Create highlight span
    const highlightSpan = document.createElement("span");
    highlightSpan.className = "hl";
    highlightSpan.style.backgroundColor = color || "#ffff00";
    highlightSpan.style.cursor = "pointer";

    // Try to wrap the selection
    try {
      range.surroundContents(highlightSpan);
    } catch (e) {
      // If surroundContents fails (e.g., selection spans multiple nodes), extract and wrap
      const contents = range.extractContents();
      highlightSpan.appendChild(contents);
      range.insertNode(highlightSpan);
    }

    // Save the note content
    const content = document.querySelector(".content.editable");
    if (content && content.closest(".pane").querySelector(".editor.active")) {
      const noteId = content.closest(".pane").querySelector(".editor.active")
        .dataset.id;
      const note = getNote(noteId);
      if (note) {
        note.contentHtml = content.innerHTML;
        saveNotes();
      }
    }

    // Clear the selection
    sel.removeAllRanges();
  }

  // Image tools overlay inside editor
  function createImgTools() {
    const wrap = document.createElement("div");
    wrap.className = "img-tools";
    wrap.style.display = "none";
    const range = document.createElement("input");
    range.type = "range";
    range.min = "10";
    range.max = "100";
    range.value = "100";
    const btnUp = document.createElement("button");
    btnUp.className = "btn";
    btnUp.textContent = "Up";
    const btnDown = document.createElement("button");
    btnDown.className = "btn";
    btnDown.textContent = "Down";
    wrap.appendChild(range);
    wrap.appendChild(btnUp);
    wrap.appendChild(btnDown);
    document.body.appendChild(wrap);
    return { wrap, range, btnUp, btnDown };
  }
  const imgTools = createImgTools();
  function showImgToolsFor(img) {
    const rect = img.getBoundingClientRect();
    imgTools.wrap.style.display = "flex";
    imgTools.wrap.style.left = rect.left + 8 + "px";
    imgTools.wrap.style.top = rect.bottom + 8 + "px";
    const currentW = img.style.width
      ? parseInt(img.style.width)
      : Math.min(
          100,
          Math.round((rect.width / Math.max(1, img.naturalWidth)) * 100)
        );
    imgTools.range.value = isFinite(currentW) ? currentW : 100;
    imgTools.range.oninput = () => {
      img.style.width = imgTools.range.value + "%";
    };
    imgTools.btnUp.onclick = () => {
      const p = img.closest(".content") || img.parentNode;
      if (img.previousSibling) p.insertBefore(img, img.previousSibling);
    };
    imgTools.btnDown.onclick = () => {
      const p = img.closest(".content") || img.parentNode;
      if (img.nextSibling) p.insertBefore(img.nextSibling, img);
    };
  }
  function hideImgTools() {
    imgTools.wrap.style.display = "none";
  }

  // Helpers
  function escapeHtml(s) {
    return String(s).replace(
      /[&<>\"]{1}/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );
  }

  // Save session state
  function saveSessionState() {
    state.settings.sessionState = {
      leftActive: state.left.active,
      rightActive: state.right.active,
      leftTabs: state.left.tabs,
      rightTabs: state.right.tabs,
      splitMode: state.splitMode,
    };
    Storage.saveSettings(state.settings);
  }

  // Restore session state
  async function restoreSessionState() {
    if (state.settings.sessionState) {
      isRestoringSession = true;
      const session = state.settings.sessionState;

      // Restore left pane
      if (session.leftActive && getNote(session.leftActive)) {
        state.left.tabs = session.leftTabs || [session.leftActive];
        state.left.active = session.leftActive;
        openInPane(session.leftActive, "left");
      }

      // Restore right pane and split
      if (session.rightActive && getNote(session.rightActive)) {
        state.right.tabs = session.rightTabs || [session.rightActive];
        state.right.active = session.rightActive;
        enableSplit();
        openInPane(session.rightActive, "right");
      }

      isRestoringSession = false;
    }
  }

  // Boot
  await initializeData();
  renderSidebar();
  ["left", "right"].forEach(renderPane);

  // Initialize tables in both panes after a short delay to ensure everything is loaded
  setTimeout(() => {
    const leftContent = el.paneLeft?.querySelector(".content");
    const rightContent = el.paneRight?.querySelector(".content");
    if (leftContent) initializeTables(leftContent);
    if (rightContent) initializeTables(rightContent);
  }, 500);

  // Restore previous session if user had notes open
  await restoreSessionState();

  // start with split off
  el.workspace.style.gridTemplateColumns = state.splitMode
    ? "1fr 4px 1fr"
    : "1fr 0fr";
  if (!state.splitMode) el.workspace.classList.add("split-off");
  updateEmptyState();

  // Show data directory in Electron
  if (Storage.isElectron) {
    const dataDir = await window.electronAPI.getDataDir();
  }
  function updateEmptyState() {
    const anyPane = !!(state.left.active || state.right.active);
    const anyWindow = Object.values(state.windows).some((w) => !w.minimized);
    if (el.emptyState) {
      el.emptyState.classList.toggle("hidden", anyPane || anyWindow);

      // Update marquee with tasks status
      if (!anyPane && !anyWindow) {
        const marqueeContent = document.getElementById("marquee-content");
        if (marqueeContent) {
          // Get todos from settings
          const allTodos = state.settings.todos || [];

          if (allTodos.length > 0) {
            const completed = allTodos.filter((t) => t.completed).length;
            const pending = allTodos.length - completed;

            const items = [];

            // Show pending tasks
            if (pending > 0) {
              items.push(
                `<span>${pending} task${
                  pending > 1 ? "s" : ""
                } remaining</span>`
              );
            }

            // Show completed count
            if (completed > 0) {
              items.push(
                `<span>${completed} task${
                  completed > 1 ? "s" : ""
                } completed</span>`
              );
            }

            // Show recent tasks
            const recentTodos = [...allTodos]
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 5);

            recentTodos.forEach((todo) => {
              const status = todo.completed ? "✓" : "○";
              items.push(`<span>${status} ${todo.text}</span>`);
            });

            // Duplicate for seamless loop
            marqueeContent.innerHTML = items.join("") + items.join("");
          } else {
            marqueeContent.innerHTML =
              "<span>No tasks yet - Add your first task below</span><span>No tasks yet - Add your first task below</span>";
          }
        }
      }
    }
  }

  function formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  }

  // Show selection toolbar on selection in an editor
  let selToolsEl = null;
  function getSelTools() {
    if (selToolsEl) return selToolsEl;
    const div = document.createElement("div");
    div.className = "sel-tools";
    div.innerHTML =
      '<button data-t="b">B</button><button data-t="i">I</button><button data-t="u">U</button><button data-t="ul">•</button><button data-t="ol">1.</button><button data-t="hl">HL</button>';
    document.body.appendChild(div);
    selToolsEl = div;
    return div;
  }
  function hideSelTools() {
    if (selToolsEl) selToolsEl.style.display = "none";
  }
  document.addEventListener("mouseup", () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      hideSelTools();
      return;
    }
    const anchor = sel.anchorNode;
    const content = (
      anchor && (anchor.nodeType === 1 ? anchor : anchor.parentElement)
    )?.closest(".content.editable");
    if (!content) {
      hideSelTools();
      return;
    }
    const r = sel.getRangeAt(0);
    const rect = r.getBoundingClientRect();
    const tools = getSelTools();
    tools.style.left = Math.min(rect.left, window.innerWidth - 220) + "px";
    tools.style.top = Math.max(8, rect.top - 40) + "px";
    tools.style.display = "flex";
    tools.onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const t = b.dataset.t;
      if (t === "b") document.execCommand("bold");
      else if (t === "i") document.execCommand("italic");
      else if (t === "u") document.execCommand("underline");
      else if (t === "ul") document.execCommand("insertUnorderedList");
      else if (t === "ol") document.execCommand("insertOrderedList");
      else if (t === "hl")
        applyHighlightToSelection(state.currentHighlightColor);
      else if (t === "table") {
        insertTablePlaceholder();
        hideSelTools();
        return;
      }

      // Trigger input event with formatting flag for immediate history save
      const inputEvent = new Event("input", { bubbles: true });
      inputEvent.isFormatting = true;
      content.dispatchEvent(inputEvent);

      hideSelTools();
    };
  });

  function insertTablePlaceholder() {
    const side = state.right.active ? "right" : "left";
    const paneEl = side === "left" ? el.paneLeft : el.paneRight;
    const content = paneEl.querySelector(".content.editable");
    if (!content) return;

    const note = getNote(state[side].active);
    if (!note) return;

    // Open table editor to create a new table
    openTableEditor((tableHtml) => {
      if (!tableHtml) return;

      const sel = window.getSelection();
      const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;

      // Create a temporary div to hold the table HTML
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = tableHtml;
      const table = tempDiv.firstChild;

      if (table && table.tagName === "TABLE") {
        // Add necessary classes and attributes
        table.className = "note-table";
        table.contentEditable = "false";

        // Make cells editable
        table.querySelectorAll("td, th").forEach((cell) => {
          cell.contentEditable = "true";
        });

        // Add table controls
        if (typeof addTableControls === "function") {
          addTableControls(table);
        }

        // Insert the table
        if (range) {
          range.deleteContents();
          range.insertNode(table);
          range.collapse(false);
        } else {
          content.appendChild(table);
        }

        // Add a line break after the table
        const br = document.createElement("br");
        if (range) {
          range.insertNode(br);
          range.collapse(false);
        } else {
          content.appendChild(br);
        }

        // Initialize the newly inserted table
        setTimeout(() => initializeTables(content), 100);

        // Trigger input event for undo support and save
        note.contentHtml = content.innerHTML;
        content.dispatchEvent(new Event("input", { bubbles: true }));
        saveNotes();
      }
    });
  }

  // Make tables draggable like images
  function makeTableDraggable(table) {
    table.setAttribute("draggable", "true");

    table.addEventListener("dragstart", (e) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/html", table.outerHTML);
      table.style.opacity = "0.5";
    });

    table.addEventListener("dragend", (e) => {
      table.style.opacity = "1";
    });
  }

  // Resizer drag behavior for split
  if (el.resizer) {
    let dragging = false,
      startX = 0,
      startW = 0;
    const onDown = (e) => {
      dragging = true;
      startX = e.clientX;
      const rect = el.workspace.getBoundingClientRect();
      startW = rect.width;
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const total = startW;
      let leftPx = total / 2 + dx;
      let rightPx = total - leftPx - 4;
      if (leftPx < 200) leftPx = 200;
      if (rightPx < 200) rightPx = 200;
      if (rightPx < 100) {
        // Dragged too far, close right pane
        disableSplit();
        dragging = false; // Stop dragging
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      } else {
        enableSplit();
        el.workspace.style.gridTemplateColumns = `${leftPx}px 4px ${rightPx}px`;
      }
    };
    const onUp = () => {
      if (dragging) {
        dragging = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }
      updateEmptyState();
    };
    el.resizer.addEventListener("mousedown", onDown);
  }

  // Delete selected items function
  async function deleteSelectedItems() {
    if (state.selectedItems.size === 0) return;

    const selectedNotes = Array.from(state.selectedItems)
      .filter((id) => id.startsWith("note-"))
      .map((id) => id.replace("note-", ""));
    const selectedFolders = Array.from(state.selectedItems)
      .filter((id) => id.startsWith("folder-"))
      .map((id) => id.replace("folder-", ""));

    const totalCount = selectedNotes.length + selectedFolders.length;
    const confirmed = await modalConfirm(
      `Delete ${totalCount} selected item${totalCount > 1 ? "s" : ""}?`
    );

    if (!confirmed) return;

    // Delete selected notes
    selectedNotes.forEach((noteId) => {
      const note = getNote(noteId);
      if (note) {
        state.notes = state.notes.filter((n) => n.id !== noteId);
        state.trash.push({ ...note, deletedAt: new Date().toISOString() });
        closeTab("left", noteId);
        closeTab("right", noteId);
        closeWindow(noteId);
      }
    });

    // Delete selected folders
    selectedFolders.forEach((folderId) => {
      const folder = state.folders.find((f) => f.id === folderId);
      if (folder) {
        // Move notes in this folder to trash
        state.notes
          .filter((n) => n.folderId === folderId)
          .forEach((note) => {
            state.trash.push({ ...note, deletedAt: new Date().toISOString() });
            closeTab("left", note.id);
            closeTab("right", note.id);
            closeWindow(note.id);
          });
        state.notes = state.notes.filter((n) => n.folderId !== folderId);

        // Remove the folder
        state.folders = state.folders.filter((f) => f.id !== folderId);

        // Remove child folders recursively
        const removeChildFolders = (parentId) => {
          const children = state.folders.filter((f) => f.parentId === parentId);
          children.forEach((child) => {
            state.folders = state.folders.filter((f) => f.id !== child.id);
            removeChildFolders(child.id);
          });
        };
        removeChildFolders(folderId);
      }
    });

    // Clear selection
    state.selectedItems.clear();

    saveNotes();
    saveFolders();
    saveTrash();
    renderSidebar();
  }

  // Table Editor Window

  function openTableEditor(callback, existingData = null) {
    const win = document.createElement("div");
    win.className = "window table-editor-window";
    win.style.left = "100px";
    win.style.top = "100px";
    win.style.width = "700px";
    win.style.height = "500px";

    let tableData = existingData || [
      [
        { content: "", style: "" },
        { content: "", style: "" },
      ],
      [
        { content: "", style: "" },
        { content: "", style: "" },
      ],
    ];

    win.innerHTML = `
      <div class="window-title">
        <span class="window-name">Table Editor</span>
        <div class="window-controls">
          <button data-action="close" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span>Close</span>
          </button>
        </div>
      </div>
      <div class="window-body table-editor-body">
        <div class="table-editor-toolbar">
          <button class="table-btn" data-action="add-row">+ Row</button>
          <button class="table-btn" data-action="add-col">+ Column</button>
          <button class="table-btn" data-action="insert-table">Insert to Note</button>
        </div>
        <div class="table-editor-content"></div>
      </div>
    `;

    const renderTable = () => {
      const container = win.querySelector(".table-editor-content");
      const table = document.createElement("table");
      table.className = "note-table editor-table";

      const tbody = document.createElement("tbody");
      tableData.forEach((row, i) => {
        const tr = document.createElement("tr");
        row.forEach((cell, j) => {
          const td = document.createElement("td");
          td.contentEditable = "true";
          td.innerHTML = cell.content || "&nbsp;";
          if (cell.style) td.setAttribute("style", cell.style);

          td.addEventListener("input", () => {
            tableData[i][j].content = td.innerHTML;
          });

          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      container.innerHTML = "";
      container.appendChild(table);

      // Add context menu
      table.addEventListener("contextmenu", (e) => {
        showTableContextMenu(e, e.target);
      });
    };

    win
      .querySelector('[data-action="add-row"]')
      .addEventListener("click", () => {
        const cols = tableData[0]?.length || 1;
        const newRow = Array(cols)
          .fill(null)
          .map(() => ({ content: "", style: "" }));
        tableData.push(newRow);
        renderTable();
      });

    win
      .querySelector('[data-action="add-col"]')
      .addEventListener("click", () => {
        tableData.forEach((row) => {
          row.push({ content: "", style: "" });
        });
        renderTable();
      });

    win
      .querySelector('[data-action="insert-table"]')
      .addEventListener("click", () => {
        // Return the table HTML via callback
        if (callback) {
          const table = document.createElement("table");
          table.className = "note-table";
          table.contentEditable = "false";

          const tbody = document.createElement("tbody");
          tableData.forEach((row) => {
            const tr = document.createElement("tr");
            row.forEach((cell) => {
              const td = document.createElement("td");
              td.contentEditable = "true";
              td.innerHTML = cell.content || "&nbsp;";
              if (cell.style) {
                td.setAttribute("style", cell.style);
              }
              // Restore color attributes
              if (cell.bgcolor) {
                td.setAttribute("data-bgcolor", cell.bgcolor);
                td.style.backgroundColor = cell.bgcolor;
              }
              if (cell.color) {
                td.setAttribute("data-color", cell.color);
                td.style.color = cell.color;
              }
              tr.appendChild(td);
            });
            tbody.appendChild(tr);
          });

          table.appendChild(tbody);
          callback(table.outerHTML);
        }

        win.remove();
      });

    win.querySelector('[data-action="close"]').addEventListener("click", () => {
      if (callback) {
        callback(null); // User cancelled
      }
      win.remove();
    });

    renderTable();
    document.body.appendChild(win);
    makeDraggable(win);
    makeResizable(win);
    bringToFront(win);

    // Store reference to this window
    openedImageWindows.set(dataUrl, win);
  }

  // Make functions available globally for table-utils.js
  window.openTableEditorWindow = (data, callback) => {
    openTableEditor(callback, data);
  };
  window.initializeTables = initializeTables;

  // Save all data - used when closing app
  window.saveAllData = async function () {
    try {
      // Save all notes
      await Storage.saveNotes(state.notes);

      // Save folders
      await Storage.saveFolders(state.folders);

      // Save settings (including folders open state and todos)
      state.settings.foldersOpen = Array.from(state.foldersOpen);
      await Storage.saveSettings(state.settings);

      // Save trash
      await Storage.saveTrash(state.trash);

      // If backup is enabled, write backup
      if (state.backupHandle) {
        await writeBackup();
      }

      return true;
    } catch (error) {
      console.error("Error saving data:", error);
      return false;
    }
  };

  // Expose state for custom features
  window.state = state;
  window.enableSplit = enableSplit;
  window.openInPane = openInPane;

  // Toggle note lock (view mode) - locks only the active/focused note
  function toggleNoteLock() {
    // Find which editor has focus or is active
    let targetPane = null;
    let targetSide = null;

    // Check if left pane has focus
    const leftContent = el.paneLeft?.querySelector(".content.editable");
    if (
      leftContent &&
      (document.activeElement === leftContent ||
        leftContent.contains(document.activeElement))
    ) {
      targetPane = el.paneLeft;
      targetSide = "left";
    }

    // Check if right pane has focus
    const rightContent = el.paneRight?.querySelector(".content.editable");
    if (
      !targetPane &&
      rightContent &&
      (document.activeElement === rightContent ||
        rightContent.contains(document.activeElement))
    ) {
      targetPane = el.paneRight;
      targetSide = "right";
    }

    // If no focus, use active side
    if (!targetPane) {
      targetSide = state.right.active ? "right" : "left";
      targetPane = targetSide === "left" ? el.paneLeft : el.paneRight;
    }

    const content = targetPane.querySelector(".content.editable");
    const header = targetPane.querySelector(".editor-header");

    if (!content || !header) return;

    const isLocked = content.getAttribute("contenteditable") === "false";

    // Remove existing lock icon if any
    const existingLock = header.querySelector(".lock-icon");
    if (existingLock) existingLock.remove();

    if (isLocked) {
      // Unlock
      content.setAttribute("contenteditable", "true");
      content.style.opacity = "1";
    } else {
      // Lock
      content.setAttribute("contenteditable", "false");
      content.style.opacity = "0.9";

      // Add lock icon
      const lockIcon = document.createElement("span");
      lockIcon.className = "lock-icon";
      lockIcon.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      `;

      const titleContainer = header.querySelector(".title-with-tags");
      if (titleContainer) {
        titleContainer.insertBefore(lockIcon, titleContainer.firstChild);
      }
    }
  }

  // Expose toggleNoteLock to window for use in custom-features.js
  window.toggleNoteLock = toggleNoteLock;

  // Add copy handler for images
  document.addEventListener("copy", (e) => {
    console.log("Copy event triggered");
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      console.log("No selection range");
      return;
    }

    const range = selection.getRangeAt(0);
    if (!range) {
      console.log("No valid range in selection");
      return;
    }

    // Get the common ancestor container (works better with contenteditable)
    const ancestor = range.commonAncestorContainer;
    if (!ancestor) {
      console.log("No common ancestor found");
      return;
    }

    // Find the closest content editable container
    const container =
      ancestor.nodeType === Node.ELEMENT_NODE
        ? ancestor.closest(".content.editable")
        : ancestor.parentElement?.closest(".content.editable");

    if (!container) {
      console.log("No editable container found");
      return;
    }

    // Helper function to find an image in a range
    const findImageInRange = (range) => {
      // Check if the range contains an image container
      let imgContainer =
        range.commonAncestorContainer.closest?.(".image-container");
      let img = imgContainer?.querySelector("img");

      // If no container found, try to find an image directly
      if (!img) {
        // Create a document fragment from the range
        const fragment = range.cloneContents();
        const tempDiv = document.createElement("div");
        tempDiv.appendChild(fragment.cloneNode(true));

        // Look for image in the fragment
        img = tempDiv.querySelector("img");
        if (img) {
          imgContainer = img.closest(".image-container") || img.parentElement;
        } else {
          // Check if the selection is within an image
          const startNode = range.startContainer;
          const endNode = range.endContainer;

          const findImageInNode = (node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.matches("img")) return node;
              return node.querySelector("img");
            } else if (node.parentNode) {
              return findImageInNode(node.parentNode);
            }
            return null;
          };

          img = findImageInNode(startNode) || findImageInNode(endNode);
          if (img) {
            imgContainer = img.closest(".image-container") || img.parentElement;
          }
        }
      }

      return { img, imgContainer };
    };

    // Try to find an image in the selection
    const { img, imgContainer } = findImageInRange(range);

    if (!img || !imgContainer) {
      console.log("No image found in selection");
      return;
    }

    console.log("Found image to copy:", img);

    // Get the image source (try data-src or src)
    let imgSrc = img.getAttribute("data-src") || img.src;
    const imgId = img.getAttribute("data-image-id") || `img-${Date.now()}`;

    // If we don't have a data URL, try to get it from the note's images
    if (!imgSrc.startsWith("data:")) {
      const side = container.closest(".pane")?.dataset.side;
      if (side) {
        const currentNote = getActive(side);
        if (currentNote?.images) {
          const imgData = currentNote.images.find((img) => img.id === imgId);
          if (imgData?.data) {
            imgSrc = imgData.data;
          }
        }
      }
    }

    if (!imgSrc) {
      console.error("No image source found");
      return;
    }

    console.log("Copying image with src:", imgSrc.substring(0, 50) + "...");

    // Create a clean copy of the image with all necessary data
    const imgHtml = `
      <div class="image-container" data-image-id="${imgId}" style="position: relative; display: inline-block; max-width: 100%;">
        <img src="${imgSrc}" data-image-id="${imgId}" style="max-width: 100%; height: auto; display: block; margin: 10px 0;">
      </div>`;

    // Add both HTML and plain text representations to clipboard
    e.clipboardData.setData("text/html", imgHtml);
    e.clipboardData.setData("text/plain", `[Image]`);

    // Store the full image data in a custom format for internal use
    const imageData = {
      type: "image/container",
      id: imgId,
      src: imgSrc,
      dataUrl: imgSrc.startsWith("data:") ? imgSrc : null,
    };

    try {
      e.clipboardData.setData(
        "application/x-note-app-image",
        JSON.stringify(imageData)
      );
      console.log("Custom image data set in clipboard");
    } catch (err) {
      console.error("Failed to set custom image data:", err);
    }

    e.preventDefault();
    console.log("Copy operation completed");
  });

  // Add paste handler to handle image data
  document.addEventListener("paste", async (e) => {
    console.log("Paste event detected");
    console.log("Clipboard types:", [...e.clipboardData.types]);

    // Get the active pane and container
    const activePane = document.querySelector(".pane.active");
    if (!activePane) {
      console.log("No active pane found");
      return;
    }

    const container = activePane.querySelector(".content.editable");
    if (!container || !container.contains(document.activeElement)) {
      console.log("No editable container or active element not in container");
      return;
    }

    // Get the current note
    const side = container.closest(".pane")?.dataset.side;
    if (!side) {
      console.log("Could not determine which side (left/right) the pane is on");
      return;
    }

    const currentNote = getActive(side);
    if (!currentNote) {
      console.log("No active note found in the current pane");
      return;
    }

    // Check for our custom image data first
    try {
      const customImageData = e.clipboardData.getData(
        "application/x-note-app-image"
      );
      console.log(
        "Custom image data in clipboard:",
        customImageData ? "exists" : "not found"
      );

      if (customImageData) {
        try {
          const imageData = JSON.parse(customImageData);
          console.log("Parsed image data:", imageData);

          if (
            imageData.type &&
            (imageData.type.includes("image/") ||
              imageData.type === "image/container" ||
              imageData.type === "image/placeholder")
          ) {
            e.preventDefault();
            console.log("Processing custom image data");

            // Use the dataUrl if available, otherwise use src
            const imageSource = imageData.dataUrl || imageData.src;
            if (imageSource) {
              console.log("Inserting image from custom data");
              const result = insertImageAtSelection(
                container,
                imageSource,
                currentNote,
                imageData.id || undefined
              );
              if (!result) {
                console.error("Failed to insert image from custom data");
              }
            } else {
              console.error("No valid image source found in custom data");
            }
            return;
          }
        } catch (parseError) {
          console.error("Error parsing custom image data:", parseError);
        }
      }
    } catch (err) {
      console.error("Error accessing clipboard data:", err);
    }

    // Check for HTML content with images
    if (e.clipboardData.types.includes("text/html")) {
      try {
        const html = e.clipboardData.getData("text/html");
        console.log("HTML content in clipboard");

        // Check if HTML contains an image
        if (html.includes("<img") || html.includes("<IMG")) {
          console.log("Found image in HTML content");
          e.preventDefault();

          // Create a temporary div to parse the HTML
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = html;

          // Find all images in the pasted content
          const images = tempDiv.querySelectorAll("img");
          if (images.length > 0) {
            console.log(`Found ${images.length} images in HTML`);

            // Process each image
            for (const img of images) {
              let imgSrc = img.src || img.getAttribute("data-src");
              if (imgSrc) {
                console.log("Inserting image from HTML");
                const result = insertImageAtSelection(
                  container,
                  imgSrc,
                  currentNote
                );
                if (!result) {
                  console.error("Failed to insert image from HTML");
                }
              }
            }
            return;
          }
        }
      } catch (htmlError) {
        console.error("Error processing HTML content:", htmlError);
      }
    }

    // Handle HTML content with images
    if (e.clipboardData.types.includes("text/html")) {
      try {
        const html = e.clipboardData.getData("text/html");
        console.log("HTML content in clipboard");

        // Check if HTML contains an image
        if (html.includes("<img") || html.includes("<IMG")) {
          console.log("Found image in HTML content");
          e.preventDefault();

          // Create a temporary div to parse the HTML
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = html;

          // Find all images in the pasted content
          const images = tempDiv.querySelectorAll("img");
          if (images.length > 0) {
            console.log(`Found ${images.length} images in HTML`);
            const side = container.closest(".pane").dataset.side;
            const currentNote = getActive(side);

            if (!currentNote) {
              console.error("No active note found");
              return;
            }

            // Process each image
            for (const img of images) {
              const imgSrc = img.src || img.getAttribute("data-src");
              if (imgSrc) {
                console.log("Inserting image from HTML");
                insertImageAtSelection(container, imgSrc, currentNote);
              }
            }
            return;
          }
        }
      } catch (htmlError) {
        console.error("Error processing HTML content:", htmlError);
      }
    }

    // Handle regular image files
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      console.log(`Found ${e.clipboardData.files.length} files in clipboard`);
      const files = Array.from(e.clipboardData.files);
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));

      if (imageFiles.length > 0) {
        e.preventDefault();
        console.log(`Processing ${imageFiles.length} image files`);

        const side = container.closest(".pane").dataset.side;
        const currentNote = getActive(side);

        if (!currentNote) {
          console.error("No active note found");
          return;
        }

        // Process each image file
        for (const file of imageFiles) {
          try {
            console.log("Processing image file:", file.name, file.type);
            const dataUrl = await fileToDataURL(file);
            insertImageAtSelection(container, dataUrl, currentNote);
          } catch (error) {
            console.error("Error processing image file:", error);
          }
        }
        return;
      }
    }

    console.log("No image data found in clipboard");
  });

  // Global keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    const isTyping =
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.isContentEditable;

    // Ctrl+N: Create new note
    if ((e.ctrlKey || e.metaKey) && e.key === "n" && !isTyping) {
      e.preventDefault();
      el.newNoteBtn.click();
    }

    // Ctrl+F: Toggle search bar
    if ((e.ctrlKey || e.metaKey) && e.key === "f") {
      e.preventDefault();

      const activeEl = document.activeElement;

      // If search is already focused, blur it
      if (activeEl === el.searchInput) {
        el.searchInput.blur();
        return;
      }

      // If sidebar is collapsed, expand it first
      const sidebar = el.sidebar;
      const isCollapsed = sidebar.classList.contains("collapsed");
      if (isCollapsed) {
        sidebar.style.width = (state.settings.sidebarWidth || 280) + "px";
        sidebar.classList.remove("collapsed");
        sidebar.classList.remove("narrow");
        state.settings.sidebarCollapsed = false;
        el.toggleSidebarBtn.title = "Hide sidebar";
        Storage.saveSettings(state.settings);
      }

      // Then focus search
      el.searchInput.focus();
      el.searchInput.select();
    }

    // Ctrl+P: Close all tabs
    if ((e.ctrlKey || e.metaKey) && e.key === "p" && !isTyping) {
      e.preventDefault();
      const allTabs = [...state.left.tabs, ...state.right.tabs];
      allTabs.forEach((tabId) => {
        if (state.left.tabs.includes(tabId)) closeTab("left", tabId);
        if (state.right.tabs.includes(tabId)) closeTab("right", tabId);
      });
    }

    // Ctrl+O: Close current tab
    if ((e.ctrlKey || e.metaKey) && e.key === "o" && !isTyping) {
      e.preventDefault();
      if (state.left.active) {
        closeTab("left", state.left.active);
      } else if (state.right.active) {
        closeTab("right", state.right.active);
      }
    }

    // Ctrl+I: Split current note to right pane
    if ((e.ctrlKey || e.metaKey) && e.key === "i" && !isTyping) {
      e.preventDefault();
      if (state.left.active && !state.splitMode) {
        openInPane(state.left.active, "right");
        enableSplit();
      }
    }

    // Ctrl+H: Toggle Auto Highlight
    if ((e.ctrlKey || e.metaKey) && e.key === "h" && !isTyping) {
      e.preventDefault();
      state.autoHighlight = !state.autoHighlight;
      if (el.autoHlToggle) {
        el.autoHlToggle.textContent =
          "Auto Highlight: " + (state.autoHighlight ? "ON" : "OFF");
      }
      // Update all editor menu labels
      document.querySelectorAll('.auto-hl-label').forEach(label => {
        label.textContent = "Auto Highlight: " + (state.autoHighlight ? "ON" : "OFF");
      });
    }

    // Ctrl+T: Insert Table (works even while typing in editor)
    if ((e.ctrlKey || e.metaKey) && e.key === "t") {
      e.preventDefault();
      insertTablePlaceholder();
    }

    // Ctrl+L: Toggle note lock (works globally)
    if ((e.ctrlKey || e.metaKey) && e.key === "l") {
      e.preventDefault();
      toggleNoteLock();
    }

    // Ctrl+.: Toggle sidebar (works globally, even while typing)
    if ((e.ctrlKey || e.metaKey) && e.key === ".") {
      e.preventDefault();
      el.toggleSidebarBtn.click();
    }

    // Delete key: Delete selected items
    if (e.key === "Delete" && !isTyping && state.selectedItems.size > 0) {
      e.preventDefault();
      deleteSelectedItems();
    }
  });

  // Sound Effects using Web Audio API - Professional, subtle sounds
  const AudioFX = {
    context: null,

    init() {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    },

    playClick() {
      if (!this.context) this.init();
      // Soft, professional click - like a pen click
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      const filter = this.context.createBiquadFilter();

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.context.destination);

      osc.frequency.value = 1200;
      osc.type = "sine";
      filter.type = "lowpass";
      filter.frequency.value = 2000;

      gain.gain.setValueAtTime(0.05, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.context.currentTime + 0.05
      );

      osc.start(this.context.currentTime);
      osc.stop(this.context.currentTime + 0.05);
    },

    playComplete() {
      if (!this.context) this.init();
      // Professional success sound - like a soft notification
      const osc1 = this.context.createOscillator();
      const osc2 = this.context.createOscillator();
      const gain = this.context.createGain();
      const filter = this.context.createBiquadFilter();

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.context.destination);

      filter.type = "lowpass";
      filter.frequency.value = 3000;

      osc1.type = "sine";
      osc2.type = "sine";

      // Pleasant two-tone chime
      osc1.frequency.setValueAtTime(659, this.context.currentTime); // E
      osc2.frequency.setValueAtTime(523, this.context.currentTime); // C

      gain.gain.setValueAtTime(0.08, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.context.currentTime + 0.3
      );

      osc1.start(this.context.currentTime);
      osc1.stop(this.context.currentTime + 0.3);
      osc2.start(this.context.currentTime);
      osc2.stop(this.context.currentTime + 0.3);
    },

    playDelete() {
      if (!this.context) this.init();
      // Subtle descending tone - professional and gentle
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      const filter = this.context.createBiquadFilter();

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.context.destination);

      osc.type = "sine";
      filter.type = "lowpass";
      filter.frequency.value = 1500;

      osc.frequency.setValueAtTime(400, this.context.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        200,
        this.context.currentTime + 0.15
      );

      gain.gain.setValueAtTime(0.04, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.context.currentTime + 0.15
      );

      osc.start(this.context.currentTime);
      osc.stop(this.context.currentTime + 0.15);
    },
  };

  // To-Do List Management
  {
    const addTaskBtn = document.getElementById("addTaskBtn");
    const todoList = document.getElementById("todoList");
    const todoInput = document.getElementById("todoInput");
    const taskInput = document.getElementById("taskInput");
    const saveTodoBtn = document.getElementById("saveTodoBtn");
    const cancelTodoBtn = document.getElementById("cancelTodoBtn");

    let todos = [];

    // Load todos from storage
    async function loadTodos() {
      // Use already loaded settings from state (Electron saves todos in settings.json)
      if (Storage.isElectron) {
        todos = state.settings.todos || [];
      } else {
        // Browser fallback
        const saved = localStorage.getItem("todos");
        todos = saved ? JSON.parse(saved) : [];
      }
      renderTodos();
      updateEmptyState(); // Update marquee on load
    }

    async function saveTodos() {
      state.settings.todos = todos;
      if (Storage.isElectron) {
        await window.electronAPI.writeSettings(state.settings);
      } else {
        localStorage.setItem("todos", JSON.stringify(todos));
      }
      // Update marquee to reflect changes
      updateEmptyState();
    }

    function updateProgress() {
      const progressBar = document.getElementById("progressBar");
      const progressText = document.getElementById("progressText");
      const progressStats = document.getElementById("progressStats");

      if (!progressBar || !progressText || !progressStats) return;

      const total = todos.length;
      const completed = todos.filter((t) => t.completed).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Update progress bar width
      progressBar.style.width = percentage + "%";

      // Update text
      progressText.textContent = `${percentage}% Complete`;
      progressStats.textContent = `${completed} of ${total} task${
        total !== 1 ? "s" : ""
      }`;

      // Change color based on progress
      if (percentage === 100) {
        progressBar.style.background =
          "linear-gradient(90deg, #22c55e, #16a34a)";
      } else if (percentage >= 50) {
        progressBar.style.background =
          "linear-gradient(90deg, #3b82f6, #2563eb)";
      } else {
        progressBar.style.background =
          "linear-gradient(90deg, #f59e0b, #d97706)";
      }
    }

    function renderTodos() {
      todoList.innerHTML = "";
      if (todos.length === 0) {
        todoList.innerHTML =
          '<div style="text-align: center; color: var(--muted); padding: 20px;">No tasks yet. Add your first task!</div>';
        updateProgress();
        return;
      }

      todos.forEach((todo, index) => {
        const item = document.createElement("div");
        item.className = "todo-item" + (todo.completed ? " completed" : "");
        item.innerHTML = `
          <div class="todo-checkbox ${
            todo.completed ? "checked" : ""
          }" data-index="${index}"></div>
          <div class="todo-text">${escapeHtml(todo.text)}</div>
          <button class="todo-delete" data-index="${index}">×</button>
        `;
        todoList.appendChild(item);
      });

      // Add event listeners
      todoList.querySelectorAll(".todo-checkbox").forEach((cb) => {
        cb.addEventListener("click", (e) => {
          const index = parseInt(e.target.dataset.index);
          toggleTodo(index);
        });
      });

      todoList.querySelectorAll(".todo-delete").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const index = parseInt(e.target.dataset.index);
          deleteTodo(index);
        });
      });

      // Update progress bar
      updateProgress();
    }

    function toggleTodo(index) {
      const todo = todos[index];
      todo.completed = !todo.completed;

      if (todo.completed) {
        AudioFX.playComplete();
        const item = todoList.children[index];
        item.classList.add("completing");
        setTimeout(() => {
          saveTodos();
          renderTodos();
        }, 600);
      } else {
        AudioFX.playClick();
        saveTodos();
        renderTodos();
      }
    }

    function deleteTodo(index) {
      AudioFX.playDelete();
      todos.splice(index, 1);
      saveTodos();
      renderTodos();
    }

    function addTodo() {
      const text = taskInput.value.trim();
      if (!text) return;

      AudioFX.playClick();
      todos.push({
        text,
        completed: false,
        createdAt: new Date().toISOString(),
      });
      saveTodos();
      renderTodos();
      taskInput.value = "";
      todoInput.classList.add("hidden");
    }

    addTaskBtn.addEventListener("click", () => {
      AudioFX.playClick();
      todoInput.classList.remove("hidden");
      taskInput.focus();
    });

    cancelTodoBtn.addEventListener("click", () => {
      AudioFX.playClick();
      todoInput.classList.add("hidden");
      taskInput.value = "";
    });

    saveTodoBtn.addEventListener("click", addTodo);

    taskInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTodo();
      } else if (e.key === "Escape") {
        todoInput.classList.add("hidden");
        taskInput.value = "";
      }
    });

    // Load todos on startup
    loadTodos();
  }

  // Sidebar resizer with smart collapse
  {
    const sidebarResizer = document.getElementById("sidebarResizer");
    const sidebar = document.getElementById("sidebar");
    let resizing = false;
    let startX = 0;
    let startWidth = 0;
    const collapseThreshold = 100;
    const collapsedWidth = 40;
    const minWidth = 150;
    const maxWidth = 600;

    const onMouseDown = (e) => {
      resizing = true;
      startX = e.clientX;
      startWidth = sidebar.offsetWidth;
      sidebarResizer.classList.add("resizing");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!resizing) return;
      const deltaX = e.clientX - startX;
      let newWidth = startWidth + deltaX;

      // If dragging to collapse
      if (newWidth < collapseThreshold) {
        sidebar.classList.add("collapsed");
        sidebar.classList.remove("narrow");
      } else {
        // Normal resize range
        newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        sidebar.style.width = newWidth + "px";
        sidebar.classList.remove("collapsed");

        // Add narrow class when width is between minWidth and 150px
        if (newWidth <= 150) {
          sidebar.classList.add("narrow");
        } else {
          sidebar.classList.remove("narrow");
        }
      }
    };

    const onMouseUp = () => {
      if (!resizing) return;
      resizing = false;
      sidebarResizer.classList.remove("resizing");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      // Save sidebar state
      const isCollapsed = sidebar.classList.contains("collapsed");
      const width = parseInt(sidebar.style.width) || 280;
      state.settings.sidebarWidth = isCollapsed ? 280 : width;
      state.settings.sidebarCollapsed = isCollapsed;
      Storage.saveSettings(state.settings);
    };

    sidebarResizer.addEventListener("mousedown", onMouseDown);
  }

  // Sidebar drop zone for moving folders to root
  el.noteList.addEventListener("dragover", (e) => {
    const folderId = e.dataTransfer.types.includes("text/folder-id");
    if (folderId && !e.target.closest(".folder-item")) {
      e.preventDefault();
    }
  });
  el.noteList.addEventListener("drop", (e) => {
    const folderId = e.dataTransfer.getData("text/folder-id");
    if (folderId && !e.target.closest(".folder-item")) {
      e.preventDefault();
      const folder = state.folders.find((f) => f.id === folderId);
      if (folder && folder.parentId !== null) {
        folder.parentId = null;
        saveFolders();
        renderSidebar();
      }
    }
  });

  // Home button - close all tabs and show welcome pane
  el.homeBtn.addEventListener("click", () => {
    // Close all tabs in both panes
    state.left.tabs = [];
    state.left.active = null;
    state.right.tabs = [];
    state.right.active = null;

    // Disable split mode
    if (state.splitMode) {
      disableSplit();
    }

    // Re-render to show welcome pane
    renderTabs("left");
    renderPane("left");
    renderTabs("right");
    renderPane("right");
    updateEmptyState();

    // Save session state
    if (typeof saveSessionState === "function") {
      saveSessionState();
    }
  });

  // Toggle sidebar button
  el.toggleSidebarBtn.addEventListener("click", () => {
    const sidebar = el.sidebar;
    const isCollapsed = sidebar.classList.contains("collapsed");

    if (isCollapsed) {
      // Expand
      sidebar.style.width = (state.settings.sidebarWidth || 280) + "px";
      sidebar.classList.remove("collapsed");
      sidebar.classList.remove("narrow");
      state.settings.sidebarCollapsed = false;
      el.toggleSidebarBtn.title = "Hide sidebar";
    } else {
      // Collapse - sidebar will be hidden via display:none
      sidebar.classList.add("collapsed");
      sidebar.classList.remove("narrow");
      state.settings.sidebarCollapsed = true;
      el.toggleSidebarBtn.title = "Show sidebar";
    }

    Storage.saveSettings(state.settings);
  });
})();
