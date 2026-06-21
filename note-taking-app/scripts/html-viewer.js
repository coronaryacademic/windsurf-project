// HTML Study Materials Viewer Module
console.log('[HTMLViewer] Script loaded!');

const HTMLViewer = {
    state: {
        materials: [],
        activeCategory: 'All',
        activeId: null,
        searchQuery: '',
        sortOrder: 'newest',
    },

    el: {},

    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadData();
        console.log('[HTMLViewer] Initialized.');
    },

    cacheElements() {
        this.el.base         = document.getElementById('htmlBase');
        this.el.hub          = document.getElementById('htmlLibraryHub');
        this.el.reader       = document.getElementById('htmlReaderView');
        this.el.grid         = document.getElementById('htmlGrid');
        this.el.emptyState   = document.getElementById('htmlEmptyState');
        this.el.categoryRow  = document.getElementById('htmlCategoryRow');
        this.el.searchInput  = document.getElementById('htmlSearchInput');
        this.el.clearSearch  = document.getElementById('htmlClearSearch');
        this.el.sortSelect   = document.getElementById('htmlSortSelect');
        this.el.importBtn    = document.getElementById('htmlImportBtn');
        this.el.emptyImport  = document.getElementById('htmlEmptyImportBtn');
        this.el.closeBtn     = document.getElementById('htmlCloseBtn');
        // Reader
        this.el.readerTitle    = document.getElementById('htmlReaderTitle');
        this.el.readerCategory = document.getElementById('htmlReaderCategoryBadge');
        this.el.readerBackBtn  = document.getElementById('htmlReaderBackBtn');
        this.el.readerRename   = document.getElementById('htmlReaderRenameBtn');
        this.el.readerCategory_btn = document.getElementById('htmlReaderCategoryBtn');
        this.el.readerDelete   = document.getElementById('htmlReaderDeleteBtn');
        this.el.frame          = document.getElementById('htmlViewerFrame');
    },

    bindEvents() {
        if (this.el.closeBtn)    this.el.closeBtn.addEventListener('click', () => this.close());
        if (this.el.importBtn)   this.el.importBtn.addEventListener('click', () => this.importMaterial());
        if (this.el.emptyImport) this.el.emptyImport.addEventListener('click', () => this.importMaterial());
        if (this.el.readerBackBtn) this.el.readerBackBtn.addEventListener('click', () => this.showHub());
        if (this.el.readerRename) this.el.readerRename.addEventListener('click', () => this.renameMaterial(this.state.activeId));
        if (this.el.readerCategory_btn) this.el.readerCategory_btn.addEventListener('click', () => this.recategorizeMaterial(this.state.activeId));
        if (this.el.readerDelete) this.el.readerDelete.addEventListener('click', () => this.deleteMaterial(this.state.activeId));

        if (this.el.searchInput) {
            this.el.searchInput.addEventListener('input', (e) => {
                this.state.searchQuery = e.target.value;
                this.el.clearSearch.style.display = e.target.value ? 'block' : 'none';
                this.renderLibrary();
            });
        }
        if (this.el.clearSearch) {
            this.el.clearSearch.addEventListener('click', () => {
                this.el.searchInput.value = '';
                this.state.searchQuery = '';
                this.el.clearSearch.style.display = 'none';
                this.renderLibrary();
            });
        }
        if (this.el.sortSelect) {
            this.el.sortSelect.addEventListener('change', (e) => {
                this.state.sortOrder = e.target.value;
                this.renderLibrary();
            });
        }

        // Close card dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.html-card-options-btn') && !e.target.closest('.html-card-dropdown')) {
                document.querySelectorAll('.html-card-dropdown').forEach(d => d.classList.add('hidden'));
            }
        });

        // Keyboard: Escape closes reader → hub, Escape on hub → close
        document.addEventListener('keydown', (e) => {
            if (!this.el.base || this.el.base.classList.contains('hidden')) return;
            if (e.key === 'Escape') {
                if (!this.el.reader.classList.contains('hidden')) {
                    this.showHub();
                } else {
                    this.close();
                }
            }
        });
    },

    open() {
        if (!this.el.base) return;
        this.el.base.classList.remove('hidden');
        // Close other base views
        document.querySelectorAll('.pdf-base, .question-base, .dungeon-base').forEach(el => el.classList.add('hidden'));
        this.showHub();
        this.loadData();
    },

    close() {
        if (!this.el.base) return;
        this.el.base.classList.add('hidden');
        // Clear iframe to stop any running scripts
        if (this.el.frame) this.el.frame.removeAttribute('srcdoc');
    },

    showHub() {
        this.el.hub.classList.remove('hidden');
        this.el.reader.classList.add('hidden');
        if (this.el.frame) this.el.frame.removeAttribute('srcdoc');
        this.state.activeId = null;
    },

    showReader(id) {
        this.el.hub.classList.add('hidden');
        this.el.reader.classList.remove('hidden');
        this.state.activeId = id;
        this._renderReaderInfo(id);
        this._loadFrame(id);
    },

    _renderReaderInfo(id) {
        const item = this.state.materials.find(m => m.id === id);
        if (!item) return;
        if (this.el.readerTitle)    this.el.readerTitle.textContent    = item.title;
        if (this.el.readerCategory) this.el.readerCategory.textContent = item.category || 'Uncategorized';
    },

    async _loadFrame(id) {
        try {
            const content = await window.electronAPI.htmlGetFile(id);
            if (this.el.frame) {
                this.el.frame.srcdoc = content;
            }
        } catch (err) {
            console.error('[HTMLViewer] Failed to load file content:', err);
            if (this.el.frame) this.el.frame.srcdoc = '<p style="padding:20px;font-family:sans-serif;color:red">Failed to load HTML material.</p>';
        }
    },

    async loadData() {
        try {
            if (!window.electronAPI || typeof window.electronAPI.htmlGetList !== 'function') {
                console.warn('[HTMLViewer] electronAPI.htmlGetList not available.');
                this.state.materials = [];
                this.renderLibrary();
                return;
            }
            const list = await window.electronAPI.htmlGetList();
            this.state.materials = Array.isArray(list) ? list : [];
            this.renderLibrary();
        } catch (err) {
            console.error('[HTMLViewer] loadData error:', err);
            this.state.materials = [];
            this.renderLibrary();
        }
    },

    renderLibrary() {
        this._renderCategoryChips();
        this._renderGrid();
    },

    _getCategories() {
        const cats = new Set();
        this.state.materials.forEach(m => cats.add(m.category || 'Uncategorized'));
        return ['All', ...Array.from(cats).sort()];
    },

    _renderCategoryChips() {
        const row = this.el.categoryRow;
        if (!row) return;
        const categories = this._getCategories();
        row.innerHTML = '';

        categories.forEach(cat => {
            const count = cat === 'All'
                ? this.state.materials.length
                : this.state.materials.filter(m => (m.category || 'Uncategorized') === cat).length;

            const chip = document.createElement('button');
            chip.className = 'html-chip' + (this.state.activeCategory === cat ? ' active' : '');
            chip.innerHTML = `${this._escapeHtml(cat)} <span class="html-chip-count">${count}</span>`;
            chip.addEventListener('click', () => {
                this.state.activeCategory = cat;
                this.renderLibrary();
            });
            row.appendChild(chip);
        });

        // "+" Add Category chip
        const addChip = document.createElement('button');
        addChip.className = 'html-chip add-category-chip';
        addChip.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Category`;
        addChip.addEventListener('click', () => this._promptAddCategory());
        row.appendChild(addChip);
    },

    _getSortedFiltered() {
        let items = [...this.state.materials];

        // Category filter
        if (this.state.activeCategory !== 'All') {
            items = items.filter(m => (m.category || 'Uncategorized') === this.state.activeCategory);
        }

        // Search filter
        const q = this.state.searchQuery.toLowerCase().trim();
        if (q) {
            items = items.filter(m =>
                m.title.toLowerCase().includes(q) ||
                (m.category || '').toLowerCase().includes(q)
            );
        }

        // Sort
        switch (this.state.sortOrder) {
            case 'oldest': items.sort((a, b) => new Date(a.importedAt) - new Date(b.importedAt)); break;
            case 'az':     items.sort((a, b) => a.title.localeCompare(b.title)); break;
            case 'za':     items.sort((a, b) => b.title.localeCompare(a.title)); break;
            default:       items.sort((a, b) => new Date(b.importedAt) - new Date(a.importedAt)); break;
        }

        return items;
    },

    _renderGrid() {
        const grid = this.el.grid;
        const emptyState = this.el.emptyState;
        if (!grid) return;

        const items = this._getSortedFiltered();
        grid.innerHTML = '';

        const totalMaterials = this.state.materials.length;

        if (totalMaterials === 0) {
            emptyState && emptyState.classList.add('visible');
            return;
        }

        emptyState && emptyState.classList.remove('visible');

        if (items.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--muted,#888);font-size:0.9rem;">No materials match your filters.</div>`;
            return;
        }

        items.forEach(item => {
            const card = this._buildCard(item);
            grid.appendChild(card);
        });
    },

    _buildCard(item) {
        const card = document.createElement('div');
        card.className = 'html-material-card';
        card.dataset.id = item.id;

        const date = item.importedAt ? new Date(item.importedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

        card.innerHTML = `
            <div class="html-card-strip"></div>
            <div class="html-card-body">
                <div class="html-card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                </div>
                <div class="html-card-title">${this._escapeHtml(item.title)}</div>
                <div class="html-card-meta">
                    <span class="html-card-category-badge">${this._escapeHtml(item.category || 'Uncategorized')}</span>
                    <span class="html-card-date">${date}</span>
                </div>
            </div>
            <button class="html-card-options-btn" title="Options">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/>
                </svg>
            </button>
            <div class="html-card-dropdown hidden">
                <button class="html-dropdown-item" data-action="open">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    Open
                </button>
                <button class="html-dropdown-item" data-action="rename">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Rename
                </button>
                <button class="html-dropdown-item" data-action="categorize">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    Move to Category
                </button>
                <div class="html-dropdown-divider"></div>
                <button class="html-dropdown-item danger" data-action="delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    Delete
                </button>
            </div>
        `;

        // Card click to open reader (not on options btn)
        card.addEventListener('click', (e) => {
            if (e.target.closest('.html-card-options-btn') || e.target.closest('.html-card-dropdown')) return;
            this.showReader(item.id);
        });

        // Options button
        const optBtn = card.querySelector('.html-card-options-btn');
        const dropdown = card.querySelector('.html-card-dropdown');
        optBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.html-card-dropdown').forEach(d => { if (d !== dropdown) d.classList.add('hidden'); });
            dropdown.classList.toggle('hidden');
        });

        // Dropdown actions
        dropdown.querySelectorAll('.html-dropdown-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.add('hidden');
                const action = btn.dataset.action;
                if (action === 'open')       this.showReader(item.id);
                if (action === 'rename')     this.renameMaterial(item.id);
                if (action === 'categorize') this.recategorizeMaterial(item.id);
                if (action === 'delete')     this.deleteMaterial(item.id);
            });
        });

        return card;
    },

    async importMaterial() {
        try {
            if (!window.electronAPI) { alert('Electron API not available.'); return; }
            const filePath = await window.electronAPI.htmlOpenDialog();
            if (!filePath) return;

            if (typeof showToast === 'function') showToast('Importing HTML file...', 'info', 2000);

            const result = await window.electronAPI.htmlImportFile(filePath);
            if (result && result.success) {
                this.state.materials = result.list;
                this.renderLibrary();
                if (typeof showToast === 'function') showToast('HTML material imported!', 'success');
            } else {
                if (typeof showToast === 'function') showToast('Import failed: ' + (result.error || 'Unknown error'), 'error');
            }
        } catch (err) {
            console.error('[HTMLViewer] Import error:', err);
            if (typeof showToast === 'function') showToast('Import error: ' + err.message, 'error');
        }
    },

    async deleteMaterial(id) {
        if (!id) return;
        const item = this.state.materials.find(m => m.id === id);
        if (!item) return;

        const confirmed = await this._showConfirmDialog(`Delete "${item.title}"?`, 'This action cannot be undone.');
        if (!confirmed) return;

        try {
            const result = await window.electronAPI.htmlDeleteFile(id);
            if (result && result.success) {
                this.state.materials = result.list;
                if (this.state.activeId === id) this.showHub();
                this.renderLibrary();
                if (typeof showToast === 'function') showToast('Material deleted.', 'info');
            }
        } catch (err) {
            console.error('[HTMLViewer] Delete error:', err);
        }
    },

    async renameMaterial(id) {
        if (!id) return;
        const item = this.state.materials.find(m => m.id === id);
        if (!item) return;

        const newTitle = await this._showInputDialog('Rename Material', 'Enter new title:', item.title);
        if (!newTitle || newTitle.trim() === item.title) return;

        try {
            const result = await window.electronAPI.htmlRenameFile(id, newTitle.trim());
            if (result && result.success) {
                this.state.materials = result.list;
                if (this.state.activeId === id) this._renderReaderInfo(id);
                this.renderLibrary();
                if (typeof showToast === 'function') showToast('Renamed successfully.', 'success');
            }
        } catch (err) {
            console.error('[HTMLViewer] Rename error:', err);
        }
    },

    async recategorizeMaterial(id) {
        if (!id) return;
        const item = this.state.materials.find(m => m.id === id);
        if (!item) return;

        const existingCategories = [...new Set(this.state.materials.map(m => m.category || 'Uncategorized'))].sort();
        const selectedCat = await this._showCategoryDialog(item.category || 'Uncategorized', existingCategories);
        if (selectedCat === null) return;

        try {
            const result = await window.electronAPI.htmlSetCategory(id, selectedCat);
            if (result && result.success) {
                this.state.materials = result.list;
                if (this.state.activeId === id) this._renderReaderInfo(id);
                this.renderLibrary();
                if (typeof showToast === 'function') showToast('Category updated.', 'success');
            }
        } catch (err) {
            console.error('[HTMLViewer] Re-categorize error:', err);
        }
    },

    _promptAddCategory() {
        this._showInputDialog('New Category', 'Enter category name:', '').then(name => {
            if (!name || !name.trim()) return;
            // Just switch the filter to this category (it'll appear when materials are moved there)
            this.state.activeCategory = name.trim();
            this.renderLibrary();
        });
    },

    // ── Utility Dialogs ──

    _showInputDialog(title, label, defaultValue = '') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'html-dialog-overlay';
            overlay.innerHTML = `
                <div class="html-dialog">
                    <h3>${this._escapeHtml(title)}</h3>
                    <input class="html-dialog-input" type="text" value="${this._escapeHtml(defaultValue)}" placeholder="${this._escapeHtml(label)}">
                    <div class="html-dialog-actions">
                        <button class="html-dialog-cancel">Cancel</button>
                        <button class="html-dialog-confirm">Confirm</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            const input = overlay.querySelector('.html-dialog-input');
            const cancelBtn = overlay.querySelector('.html-dialog-cancel');
            const confirmBtn = overlay.querySelector('.html-dialog-confirm');
            setTimeout(() => { input.focus(); input.select(); }, 50);

            const finish = (val) => { overlay.remove(); resolve(val); };
            cancelBtn.addEventListener('click', () => finish(null));
            confirmBtn.addEventListener('click', () => finish(input.value));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') finish(input.value);
                if (e.key === 'Escape') finish(null);
            });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(null); });
        });
    },

    _showConfirmDialog(title, message) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'html-dialog-overlay';
            overlay.innerHTML = `
                <div class="html-dialog">
                    <h3>${this._escapeHtml(title)}</h3>
                    <p style="font-size:0.875rem;color:var(--muted,#888);margin:0 0 16px;">${this._escapeHtml(message)}</p>
                    <div class="html-dialog-actions">
                        <button class="html-dialog-cancel">Cancel</button>
                        <button class="html-dialog-confirm" style="background:var(--danger,#ef4444);">Delete</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            const cancelBtn = overlay.querySelector('.html-dialog-cancel');
            const confirmBtn = overlay.querySelector('.html-dialog-confirm');
            const finish = (val) => { overlay.remove(); resolve(val); };
            cancelBtn.addEventListener('click', () => finish(false));
            confirmBtn.addEventListener('click', () => finish(true));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(false); });
        });
    },

    _showCategoryDialog(currentCategory, existingCategories) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'html-dialog-overlay';
            const listItems = existingCategories.map(cat => `
                <button class="html-category-list-item ${cat === currentCategory ? 'selected' : ''}" data-cat="${this._escapeHtml(cat)}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    ${this._escapeHtml(cat)}
                </button>`).join('');

            overlay.innerHTML = `
                <div class="html-dialog">
                    <h3>Move to Category</h3>
                    <div class="html-category-list">${listItems}</div>
                    <div class="html-or-divider">— or create new —</div>
                    <input class="html-dialog-input" type="text" placeholder="New category name...">
                    <div class="html-dialog-actions">
                        <button class="html-dialog-cancel">Cancel</button>
                        <button class="html-dialog-confirm">Apply</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            let selectedCat = currentCategory;
            const input = overlay.querySelector('.html-dialog-input');
            const cancelBtn = overlay.querySelector('.html-dialog-cancel');
            const confirmBtn = overlay.querySelector('.html-dialog-confirm');

            overlay.querySelectorAll('.html-category-list-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    overlay.querySelectorAll('.html-category-list-item').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedCat = btn.dataset.cat;
                    input.value = '';
                });
            });

            const finish = (val) => { overlay.remove(); resolve(val); };
            cancelBtn.addEventListener('click', () => finish(null));
            confirmBtn.addEventListener('click', () => {
                const newCat = input.value.trim();
                finish(newCat || selectedCat);
            });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(null); });
        });
    },

    _escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },
};

window.HTMLViewer = HTMLViewer;
