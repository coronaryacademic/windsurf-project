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
    _floatingDropdown: null,
    _floatingDropdownId: null,
    _categoryContextMenu: null,
    _rightClickedCategory: null,
    _draggingCategory: null,

    init() {
        this.cacheElements();
        this._initFloatingDropdown();
        this._initCategoryContextMenu();
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
        this.el.categoryBar  = document.querySelector('.html-category-bar');
        this.el.searchInput  = document.getElementById('htmlSearchInput');
        this.el.clearSearch  = document.getElementById('htmlClearSearch');
        this.el.sortSelect   = document.getElementById('htmlSortSelect');
        this.el.importBtn    = document.getElementById('htmlImportBtn');
        this.el.emptyImport  = document.getElementById('htmlEmptyImportBtn');
        this.el.closeBtn     = document.getElementById('htmlCloseBtn');
        // Reader
        this.el.readerTitle        = document.getElementById('htmlReaderTitle');
        this.el.readerCategory     = document.getElementById('htmlReaderCategoryBadge');
        this.el.readerBackBtn      = document.getElementById('htmlReaderBackBtn');
        this.el.readerRename       = document.getElementById('htmlReaderRenameBtn');
        this.el.readerCategory_btn = document.getElementById('htmlReaderCategoryBtn');
        this.el.readerDelete       = document.getElementById('htmlReaderDeleteBtn');
        this.el.frame              = document.getElementById('htmlViewerFrame');
    },

    // ── Singleton floating dropdown (avoids clipping from overflow containers) ──
    _initFloatingDropdown() {
        const d = document.createElement('div');
        d.id = 'htmlFloatingDropdown';
        d.className = 'html-card-dropdown hidden';
        d.innerHTML = `
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
        `;
        document.body.appendChild(d);
        this._floatingDropdown = d;

        d.querySelectorAll('.html-dropdown-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._hideDropdown();
                const action = btn.dataset.action;
                const id = this._floatingDropdownId;
                if (action === 'open')       this.showReader(id);
                if (action === 'rename')     this.renameMaterial(id);
                if (action === 'categorize') this.recategorizeMaterial(id);
                if (action === 'delete')     this.deleteMaterial(id);
            });
        });
    },

    _initCategoryContextMenu() {
        const d = document.createElement('div');
        d.id = 'htmlCategoryContextMenu';
        d.className = 'html-card-dropdown hidden';
        d.innerHTML = `
            <button class="html-dropdown-item danger" data-action="delete-cat">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Delete Category
            </button>
        `;
        document.body.appendChild(d);
        this._categoryContextMenu = d;

        d.querySelector('.html-dropdown-item').addEventListener('click', (e) => {
            e.stopPropagation();
            this._hideCategoryContextMenu();
            this._deleteCategory(this._rightClickedCategory);
        });
    },

    _showCategoryContextMenu(cat, mouseEvent) {
        const d = this._categoryContextMenu;
        if (!d) return;
        this._rightClickedCategory = cat;
        d.classList.remove('hidden');

        const dW = d.offsetWidth || 150;
        const dH = d.offsetHeight || 44;

        let top = mouseEvent.clientY;
        let left = mouseEvent.clientX;

        if (left + dW > window.innerWidth - 6) left = window.innerWidth - dW - 6;
        if (top + dH > window.innerHeight - 8) top = window.innerHeight - dH - 8;

        d.style.top  = top + 'px';
        d.style.left = left + 'px';
    },

    _hideCategoryContextMenu() {
        if (this._categoryContextMenu) {
            this._categoryContextMenu.classList.add('hidden');
        }
        this._rightClickedCategory = null;
    },

    async _deleteCategory(cat) {
        if (window.electronAPI && typeof window.electronAPI.log === 'function') {
            window.electronAPI.log(`[_deleteCategory] Called for: ${cat}`);
        }
        if (!cat || cat === 'All' || cat === 'Uncategorized') return;

        const confirmed = await this._showConfirmDialog(
            `Delete Category "${cat}"?`,
            `Note: Materials currently in "${cat}" will be moved to "Uncategorized".`
        );
        if (window.electronAPI && typeof window.electronAPI.log === 'function') {
            window.electronAPI.log(`[_deleteCategory] Confirmation: ${confirmed}`);
        }
        if (!confirmed) return;

        try {
            // Remove from user categories list in localStorage
            let userCats = this._getUserCategories();
            userCats = userCats.filter(c => c !== cat);
            localStorage.setItem('html-viewer-user-categories', JSON.stringify(userCats));

            // Remove from order list in localStorage
            let order = this._getCategoryOrder();
            order = order.filter(c => c !== cat);
            this._saveCategoryOrder(order);

            // Find all materials in this category and move them to 'Uncategorized'
            const toUpdate = this.state.materials.filter(m => (m.category || 'Uncategorized') === cat);
            
            if (toUpdate.length > 0) {
                if (typeof showToast === 'function') showToast(`Updating ${toUpdate.length} materials...`, 'info', 2000);
                
                for (const item of toUpdate) {
                    await window.electronAPI.htmlSetCategory(item.id, 'Uncategorized');
                }
            }

            // Reset active category if it was the one deleted
            if (this.state.activeCategory === cat) {
                this.state.activeCategory = 'All';
            }

            // Reload data from backend to ensure state.materials is in sync
            await this.loadData();
            
            if (typeof showToast === 'function') showToast(`Category "${cat}" deleted.`, 'success');
        } catch (err) {
            console.error('[HTMLViewer] Delete category error:', err);
            if (typeof showToast === 'function') showToast(`Failed to delete category: ${err.message}`, 'error');
        }
    },

    _reorderCategories(draggedCat, targetCat) {
        const categories = this._getCategories().filter(c => c !== 'All');
        
        const draggedIndex = categories.indexOf(draggedCat);
        const targetIndex = categories.indexOf(targetCat);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
            categories.splice(draggedIndex, 1);
            categories.splice(targetIndex, 0, draggedCat);
            
            this._saveCategoryOrder(categories);
            this.renderLibrary();
        }
    },

    _showDropdown(id, buttonEl) {
        const d = this._floatingDropdown;
        if (!d) return;
        this._floatingDropdownId = id;
        d.classList.remove('hidden');

        // Force layout to measure dimensions
        const rect = buttonEl.getBoundingClientRect();
        const dW = d.offsetWidth || 170;
        const dH = d.offsetHeight || 160;
        const vW = window.innerWidth;
        const vH = window.innerHeight;

        let top = rect.bottom + 4;
        let left = rect.right - dW;

        // Clamp within viewport
        if (left < 6) left = 6;
        if (left + dW > vW - 6) left = vW - dW - 6;
        if (top + dH > vH - 8) top = rect.top - dH - 4;

        d.style.top  = top + 'px';
        d.style.left = left + 'px';
    },

    _hideDropdown() {
        if (this._floatingDropdown) {
            this._floatingDropdown.classList.add('hidden');
        }
        this._floatingDropdownId = null;
    },

    bindEvents() {
        if (this.el.closeBtn)    this.el.closeBtn.addEventListener('click', () => this.close());
        if (this.el.importBtn)   this.el.importBtn.addEventListener('click', () => this.importMaterial());
        if (this.el.emptyImport) this.el.emptyImport.addEventListener('click', () => this.importMaterial());
        if (this.el.readerBackBtn)      this.el.readerBackBtn.addEventListener('click', () => this.showHub());
        if (this.el.readerRename)       this.el.readerRename.addEventListener('click', () => this.renameMaterial(this.state.activeId));
        if (this.el.readerCategory_btn) this.el.readerCategory_btn.addEventListener('click', () => this.recategorizeMaterial(this.state.activeId));
        if (this.el.readerDelete)       this.el.readerDelete.addEventListener('click', () => this.deleteMaterial(this.state.activeId));

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

        // Close floating dropdown and category context menu on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.html-card-options-btn') && !e.target.closest('#htmlFloatingDropdown')) {
                this._hideDropdown();
            }
            if (!e.target.closest('.html-chip') && !e.target.closest('#htmlCategoryContextMenu')) {
                this._hideCategoryContextMenu();
            }
        });

        // Horizontal scroll for category bar using mouse wheel
        if (this.el.categoryBar) {
            this.el.categoryBar.addEventListener('wheel', (e) => {
                if (e.deltaY !== 0) {
                    this.el.categoryBar.scrollLeft += e.deltaY;
                    e.preventDefault();
                }
            }, { passive: false });
        }

        // Keyboard: Escape closes reader → hub, or hub → close
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
        this._hideDropdown();
        if (this.el.frame) this.el.frame.removeAttribute('srcdoc');
    },

    showHub() {
        this.el.hub.classList.remove('hidden');
        this.el.reader.classList.add('hidden');
        this._hideDropdown();
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
            if (this.el.frame) this.el.frame.srcdoc = content;
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

    // ── Category helpers using localStorage for user-created categories ──
    _getUserCategories() {
        try {
            return JSON.parse(localStorage.getItem('html-viewer-user-categories') || '[]');
        } catch { return []; }
    },

    _saveUserCategory(name) {
        const cats = this._getUserCategories();
        if (!cats.includes(name)) {
            cats.push(name);
            localStorage.setItem('html-viewer-user-categories', JSON.stringify(cats));
        }
    },

    _getCategoryOrder() {
        try {
            return JSON.parse(localStorage.getItem('html-viewer-category-order') || '[]');
        } catch { return []; }
    },

    _saveCategoryOrder(order) {
        localStorage.setItem('html-viewer-category-order', JSON.stringify(order));
    },

    _getCategories() {
        // Merge user-created categories + categories from materials
        const cats = new Set(this._getUserCategories());
        this.state.materials.forEach(m => cats.add(m.category || 'Uncategorized'));
        
        // Remove 'All' if it's there
        cats.delete('All');
        
        const catsArray = Array.from(cats);
        const order = this._getCategoryOrder();

        catsArray.sort((a, b) => {
            const idxA = order.indexOf(a);
            const idxB = order.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });

        return ['All', ...catsArray];
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

            // Right-click category to delete (disable for 'All' and 'Uncategorized')
            if (cat !== 'All' && cat !== 'Uncategorized') {
                chip.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this._showCategoryContextMenu(cat, e);
                });
            }

            // Drag and drop for reordering (disable for 'All')
            if (cat !== 'All') {
                chip.draggable = true;
                
                chip.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', cat);
                    chip.classList.add('dragging');
                    this._draggingCategory = cat;
                });
                
                chip.addEventListener('dragend', () => {
                    chip.classList.remove('dragging');
                    this._draggingCategory = null;
                    document.querySelectorAll('.html-chip').forEach(c => c.classList.remove('drag-over'));
                });
                
                chip.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    if (this._draggingCategory && this._draggingCategory !== cat) {
                        chip.classList.add('drag-over');
                    }
                });
                
                chip.addEventListener('dragleave', () => {
                    chip.classList.remove('drag-over');
                });
                
                chip.addEventListener('drop', (e) => {
                    e.preventDefault();
                    chip.classList.remove('drag-over');
                    const draggedCat = this._draggingCategory;
                    if (draggedCat && draggedCat !== cat) {
                        this._reorderCategories(draggedCat, cat);
                    }
                });
            }

            row.appendChild(chip);
        });

        // "+" Add Category chip
        const addChip = document.createElement('button');
        addChip.className = 'html-chip add-category-chip';
        addChip.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Category`;
        addChip.addEventListener('click', () => this._promptAddCategory());
        
        // Add Category drop zone too so elements can be dragged to the end
        addChip.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (this._draggingCategory) {
                addChip.classList.add('drag-over');
            }
        });
        
        addChip.addEventListener('dragleave', () => {
            addChip.classList.remove('drag-over');
        });
        
        addChip.addEventListener('drop', (e) => {
            e.preventDefault();
            addChip.classList.remove('drag-over');
            const draggedCat = this._draggingCategory;
            if (draggedCat) {
                const categories = this._getCategories().filter(c => c !== 'All' && c !== draggedCat);
                categories.push(draggedCat);
                this._saveCategoryOrder(categories);
                this.renderLibrary();
            }
        });

        row.appendChild(addChip);
    },

    _getSortedFiltered() {
        let items = [...this.state.materials];

        if (this.state.activeCategory !== 'All') {
            items = items.filter(m => (m.category || 'Uncategorized') === this.state.activeCategory);
        }

        const q = this.state.searchQuery.toLowerCase().trim();
        if (q) {
            items = items.filter(m =>
                m.title.toLowerCase().includes(q) ||
                (m.category || '').toLowerCase().includes(q)
            );
        }

        switch (this.state.sortOrder) {
            case 'oldest': items.sort((a, b) => new Date(a.importedAt) - new Date(b.importedAt)); break;
            case 'az':     items.sort((a, b) => a.title.localeCompare(b.title)); break;
            case 'za':     items.sort((a, b) => b.title.localeCompare(a.title)); break;
            default:       items.sort((a, b) => new Date(b.importedAt) - new Date(a.importedAt)); break;
        }

        return items;
    },

    _renderGrid() {
        const grid       = this.el.grid;
        const emptyState = this.el.emptyState;
        if (!grid) return;

        grid.innerHTML = '';

        const totalMaterials = this.state.materials.length;
        const items          = this._getSortedFiltered();
        const isSearching    = this.state.searchQuery.trim().length > 0;

        // Case 1: No files imported at all
        if (totalMaterials === 0) {
            this._setEmptyState(
                'No Study Materials Yet',
                'Import your single-file HTML study guides to view and organize them in Qnex.',
                true  // show import button
            );
            emptyState && emptyState.classList.add('visible');
            return;
        }

        // Case 2: Active category is empty (and not a search query)
        if (items.length === 0 && !isSearching && this.state.activeCategory !== 'All') {
            this._setEmptyState(
                `"${this.state.activeCategory}" is empty`,
                'No materials have been assigned to this category yet. Use Move to Category on any card to add files here.',
                false // no import button — they already have files
            );
            emptyState && emptyState.classList.add('visible');
            return;
        }

        // Case 3: Search returned nothing
        if (items.length === 0 && isSearching) {
            this._setEmptyState(
                'No Results Found',
                `No materials match "${this.state.searchQuery}". Try a different search term.`,
                false
            );
            emptyState && emptyState.classList.add('visible');
            return;
        }

        // Normal case: render cards
        emptyState && emptyState.classList.remove('visible');
        items.forEach(item => grid.appendChild(this._buildCard(item)));
    },

    _setEmptyState(title, description, showImportBtn) {
        const emptyState = this.el.emptyState;
        if (!emptyState) return;
        emptyState.innerHTML = `
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <h3>${this._escapeHtml(title)}</h3>
            <p>${this._escapeHtml(description)}</p>
            ${showImportBtn ? `
            <button id="htmlEmptyImportBtn" class="primary-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Import HTML File
            </button>` : ''}
        `;
        // Re-bind import button since innerHTML was replaced
        const btn = emptyState.querySelector('#htmlEmptyImportBtn');
        if (btn) btn.addEventListener('click', () => this.importMaterial());
    },

    _buildCard(item) {
        const card = document.createElement('div');
        card.className = 'html-material-card';
        card.dataset.id = item.id;

        const date = item.importedAt
            ? new Date(item.importedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            : '';

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
                    <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
                </svg>
            </button>
        `;

        // Open reader on card click (not on the options button)
        card.addEventListener('click', (e) => {
            if (e.target.closest('.html-card-options-btn')) return;
            this.showReader(item.id);
        });

        // Options button — show floating dropdown
        const optBtn = card.querySelector('.html-card-options-btn');
        optBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this._floatingDropdownId === item.id && !this._floatingDropdown.classList.contains('hidden')) {
                this._hideDropdown();
            } else {
                this._showDropdown(item.id, optBtn);
            }
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
        if (window.electronAPI && typeof window.electronAPI.log === 'function') {
            window.electronAPI.log(`[deleteMaterial] Called for ID: ${id}`);
        }
        if (!id) return;
        const item = this.state.materials.find(m => m.id === id);
        if (window.electronAPI && typeof window.electronAPI.log === 'function') {
            window.electronAPI.log(`[deleteMaterial] Found item: ${item ? item.title : 'null'}`);
        }
        if (!item) return;

        const confirmed = await this._showConfirmDialog(`Delete "${item.title}"?`, 'This action cannot be undone.');
        if (window.electronAPI && typeof window.electronAPI.log === 'function') {
            window.electronAPI.log(`[deleteMaterial] Confirmation result: ${confirmed}`);
        }
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

        // Merge user-created + material categories for the dialog list
        const existingCategories = [...new Set([
            ...this._getUserCategories(),
            ...this.state.materials.map(m => m.category || 'Uncategorized')
        ])].sort();

        const selectedCat = await this._showCategoryDialog(item.category || 'Uncategorized', existingCategories);
        if (selectedCat === null) return;

        // If it's a brand new category name, persist it to user categories
        if (!existingCategories.includes(selectedCat)) {
            this._saveUserCategory(selectedCat);
        }

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
            const trimmed = name.trim();
            // Save to localStorage so it persists even if no materials are in it yet
            this._saveUserCategory(trimmed);
            // Switch active filter to the newly created category
            this.state.activeCategory = trimmed;
            this.renderLibrary();
            if (typeof showToast === 'function') showToast(`Category "${trimmed}" created!`, 'success');
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
            const input      = overlay.querySelector('.html-dialog-input');
            const cancelBtn  = overlay.querySelector('.html-dialog-cancel');
            const confirmBtn = overlay.querySelector('.html-dialog-confirm');
            setTimeout(() => { input.focus(); input.select(); }, 50);

            const finish = (val) => { overlay.remove(); resolve(val); };
            cancelBtn.addEventListener('click',  () => finish(null));
            confirmBtn.addEventListener('click', () => finish(input.value));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter')  finish(input.value);
                if (e.key === 'Escape') finish(null);
            });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(null); });
        });
    },

    _showConfirmDialog(title, message) {
        if (window.electronAPI && typeof window.electronAPI.log === 'function') {
            window.electronAPI.log(`[CONFIRM DIALOG] Showing: ${title}`);
        }
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
            const cancelBtn  = overlay.querySelector('.html-dialog-cancel');
            const confirmBtn = overlay.querySelector('.html-dialog-confirm');
            const finish = (val) => {
                if (window.electronAPI && typeof window.electronAPI.log === 'function') {
                    window.electronAPI.log(`[CONFIRM DIALOG] Resolved with: ${val}`);
                }
                overlay.remove();
                resolve(val);
            };
            cancelBtn.addEventListener('click',  () => finish(false));
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
            const input      = overlay.querySelector('.html-dialog-input');
            const cancelBtn  = overlay.querySelector('.html-dialog-cancel');
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
            cancelBtn.addEventListener('click',  () => finish(null));
            confirmBtn.addEventListener('click', () => {
                const newCat = input.value.trim();
                finish(newCat || selectedCat);
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') finish(input.value.trim() || selectedCat);
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
