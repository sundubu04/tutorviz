// Modern Whiteboard Editor with Backend Integration
class WhiteboardManager {
    constructor() {
        this.currentTool = 'select';
        this.zoomLevel = 100;
        this.isDrawing = false;
        this.currentWhiteboardId = null;
        this.canvas = document.getElementById('whiteboard-canvas');
        this.apiBaseUrl = 'http://localhost:3001/api';
        this.elements = [];
        this.undoStack = [];
        this.redoStack = [];
        this.init();
    }

    init() {
        this.setupToolbar();
        this.setupCanvas();
        this.setupZoomControls();
        this.setupAutoSave();
    }

    setupToolbar() {
        const toolButtons = document.querySelectorAll('.tool-btn[data-tool]');
        toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setActiveTool(btn.dataset.tool);
            });
        });
        // Action buttons
        document.querySelectorAll('.tool-btn[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleAction(btn.dataset.action);
            });
        });
    }

    setActiveTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`[data-tool="${tool}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        this.canvas.style.cursor = tool === 'pen' ? 'crosshair' : tool === 'text' ? 'text' : 'default';
    }

    handleAction(action) {
        if (action === 'undo') this.undo();
        if (action === 'redo') this.redo();
    }

    setupCanvas() {
        if (!this.canvas) return;
        this.canvas.addEventListener('mousedown', e => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', e => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', e => this.handleMouseUp(e));
        this.canvas.addEventListener('dblclick', e => this.handleDoubleClick(e));
    }

    // --- Whiteboard Loading ---
    async loadWhiteboard(whiteboardId) {
        this.currentWhiteboardId = whiteboardId;
        this.showLoading();
        try {
            const res = await fetch(`${this.apiBaseUrl}/whiteboards/${whiteboardId}?userId=1`);
            const data = await res.json();
            if (data.success) {
                this.elements = Array.isArray(data.data.content.elements) ? data.data.content.elements : [];
                this.updateTitle(data.data.title);
                this.renderCanvas();
            } else {
                this.showError('Failed to load whiteboard: ' + data.error);
            }
        } catch (err) {
            this.showError('Network error loading whiteboard');
        }
    }

    updateTitle(title) {
        const titleEl = document.getElementById('board-title');
        if (titleEl) titleEl.textContent = title;
    }

    showLoading() {
        this.canvas.innerHTML = '<div class="loading">Loading whiteboard...</div>';
    }

    showError(msg) {
        this.canvas.innerHTML = `<div class="error">${msg}</div>`;
    }

    // --- Canvas Rendering ---
    renderCanvas() {
        this.canvas.innerHTML = '';
        this.elements.forEach(el => {
            if (el.type === 'sticky') this.renderSticky(el);
            if (el.type === 'text') this.renderText(el);
            if (el.type === 'shape') this.renderShape(el);
            if (el.type === 'pen') this.renderPen(el);
        });
    }

    renderSticky(el) {
        const sticky = document.createElement('div');
        sticky.className = `canvas-sticky-note ${el.color || 'yellow'}`;
        sticky.style.position = 'absolute';
        sticky.style.left = (el.position?.x || 0) + 'px';
        sticky.style.top = (el.position?.y || 0) + 'px';
        sticky.style.width = '150px';
        sticky.style.height = '120px';
        sticky.style.padding = '1rem';
        sticky.style.background = this.getStickyColor(el.color);
        sticky.style.borderRadius = '4px';
        sticky.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        sticky.style.cursor = 'move';
        sticky.style.zIndex = '10';
        sticky.innerHTML = `<textarea>${el.content || ''}</textarea>`;
        this.makeDraggable(sticky, el);
        sticky.querySelector('textarea').addEventListener('input', e => {
            el.content = e.target.value;
            this.saveContent();
        });
        this.canvas.appendChild(sticky);
    }

    renderText(el) {
        const text = document.createElement('div');
        text.className = 'canvas-text';
        text.style.position = 'absolute';
        text.style.left = (el.position?.x || 0) + 'px';
        text.style.top = (el.position?.y || 0) + 'px';
        text.style.minWidth = '100px';
        text.style.padding = '0.5rem';
        text.style.background = 'white';
        text.style.border = '1px solid #ddd';
        text.style.borderRadius = '4px';
        text.style.cursor = 'text';
        text.style.zIndex = '10';
        text.innerHTML = `<input type="text" value="${el.content || ''}">`;
        this.makeDraggable(text, el);
        text.querySelector('input').addEventListener('input', e => {
            el.content = e.target.value;
            this.saveContent();
        });
        this.canvas.appendChild(text);
    }

    renderShape(el) {
        const shape = document.createElement('div');
        shape.className = 'canvas-shape';
        shape.style.position = 'absolute';
        shape.style.left = (el.position?.x || 0) + 'px';
        shape.style.top = (el.position?.y || 0) + 'px';
        shape.style.width = '100px';
        shape.style.height = '100px';
        shape.style.background = '#e3f2fd';
        shape.style.border = '2px solid #2196f3';
        shape.style.borderRadius = '4px';
        shape.style.cursor = 'move';
        shape.style.zIndex = '10';
        this.makeDraggable(shape, el);
        this.canvas.appendChild(shape);
    }

    renderPen(el) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '400');
        svg.setAttribute('height', '400');
        svg.style.position = 'absolute';
        svg.style.left = (el.position?.x || 0) + 'px';
        svg.style.top = (el.position?.y || 0) + 'px';
        svg.style.zIndex = '5';
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke', '#000');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('d', el.path || '');
        svg.appendChild(path);
        this.canvas.appendChild(svg);
    }

    // --- Drag & Edit ---
    makeDraggable(element, el) {
        let isDragging = false, offsetX, offsetY;
        element.addEventListener('mousedown', e => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            isDragging = true;
            offsetX = e.clientX - element.offsetLeft;
            offsetY = e.clientY - element.offsetTop;
            element.style.zIndex = '100';
        });
        document.addEventListener('mousemove', e => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            element.style.left = x + 'px';
            element.style.top = y + 'px';
            el.position = { x, y };
        });
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.zIndex = '10';
                this.saveContent();
            }
        });
    }

    // --- Zoom ---
    setupZoomControls() {
        const zoomBtns = document.querySelectorAll('.zoom-btn');
        zoomBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleZoom(btn.dataset.zoom);
            });
        });
        this.updateZoom();
    }
    handleZoom(direction) {
        if (direction === 'in') this.zoomLevel = Math.min(200, this.zoomLevel + 10);
        if (direction === 'out') this.zoomLevel = Math.max(20, this.zoomLevel - 10);
        this.updateZoom();
    }
    updateZoom() {
        this.canvas.style.transform = `scale(${this.zoomLevel / 100})`;
        document.querySelector('.zoom-level').textContent = `${this.zoomLevel}%`;
    }

    // --- Auto Save ---
    setupAutoSave() {
        setInterval(() => this.saveContent(), 5000);
    }

    async saveContent() {
        if (!this.currentWhiteboardId) return;
        try {
            await fetch(`${this.apiBaseUrl}/whiteboards/${this.currentWhiteboardId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: { elements: this.elements }, userId: 1 })
            });
        } catch (err) {
            // Optionally show save error
        }
    }

    // --- Undo/Redo ---
    undo() {
        if (this.elements.length === 0) return;
        this.redoStack.push(this.elements.pop());
        this.renderCanvas();
        this.saveContent();
    }
    redo() {
        if (this.redoStack.length === 0) return;
        this.elements.push(this.redoStack.pop());
        this.renderCanvas();
        this.saveContent();
    }

    // --- Tool Actions ---
    handleMouseDown(e) {
        if (this.currentTool === 'pen') {
            this.isDrawing = true;
            this.startDrawing(e);
        } else if (this.currentTool === 'sticky') {
            this.addSticky(e);
        } else if (this.currentTool === 'text') {
            this.addText(e);
        } else if (this.currentTool === 'shape') {
            this.addShape(e);
        }
    }
    handleMouseMove(e) {
        if (this.isDrawing && this.currentTool === 'pen') {
            this.continueDrawing(e);
        }
    }
    handleMouseUp(e) {
        if (this.isDrawing && this.currentTool === 'pen') {
            this.isDrawing = false;
            this.saveContent();
        }
    }
    handleDoubleClick(e) {
        if (this.currentTool === 'text') {
            this.addText(e);
        }
    }

    // --- Element Creation ---
    addSticky(e) {
        const { x, y } = this.getCanvasCoords(e);
        const sticky = { id: this.generateId(), type: 'sticky', content: '', color: 'yellow', position: { x, y } };
        this.elements.push(sticky);
        this.renderCanvas();
        this.saveContent();
    }
    addText(e) {
        const { x, y } = this.getCanvasCoords(e);
        const text = { id: this.generateId(), type: 'text', content: '', position: { x, y } };
        this.elements.push(text);
        this.renderCanvas();
        this.saveContent();
    }
    addShape(e) {
        const { x, y } = this.getCanvasCoords(e);
        const shape = { id: this.generateId(), type: 'shape', position: { x, y } };
        this.elements.push(shape);
        this.renderCanvas();
        this.saveContent();
    }
    startDrawing(e) {
        const { x, y } = this.getCanvasCoords(e);
        this.currentPath = { id: this.generateId(), type: 'pen', path: `M ${x} ${y}`, position: { x: 0, y: 0 } };
        this.elements.push(this.currentPath);
    }
    continueDrawing(e) {
        if (!this.currentPath) return;
        const { x, y } = this.getCanvasCoords(e);
        this.currentPath.path += ` L ${x} ${y}`;
        this.renderCanvas();
    }

    // --- Helpers ---
    getCanvasCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    getStickyColor(color) {
        if (color === 'yellow') return '#fff3cd';
        if (color === 'blue') return '#d1ecf1';
        if (color === 'green') return '#d4edda';
        if (color === 'red') return '#f8d7da';
        if (color === 'purple') return '#e2d9f3';
        return '#fff3cd';
    }
    generateId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Expose for HTML inline script
window.whiteboardManager = new WhiteboardManager();

// Dashboard whiteboard list functionality
function loadWhiteboardContent() {
    const whiteboardsContainer = document.getElementById('whiteboards');
    if (!whiteboardsContainer) return;
    
    // Load whiteboards from API
    loadWhiteboardsFromAPI();
    
    // Setup whiteboard card interactions
    setupWhiteboardCardInteractions();
}

async function loadWhiteboardsFromAPI() {
    try {
        const response = await fetch('http://localhost:3001/api/whiteboards?userId=1');
        const data = await response.json();
        
        if (data.success) {
            updateWhiteboardsList(data.data);
        } else {
            console.error('Failed to load whiteboards:', data.error);
        }
    } catch (error) {
        console.error('Error loading whiteboards:', error);
        // Fallback to static content
        showStaticWhiteboards();
    }
}

function updateWhiteboardsList(whiteboards) {
    const whiteboardsGrid = document.querySelector('.whiteboards-grid');
    if (!whiteboardsGrid) return;
    
    // Clear existing cards except the "Create New" card
    const existingCards = whiteboardsGrid.querySelectorAll('.whiteboard-card:not(.new-board)');
    existingCards.forEach(card => card.remove());
    
    // Add whiteboard cards
    whiteboards.forEach(whiteboard => {
        const card = createWhiteboardCard(whiteboard);
        whiteboardsGrid.insertBefore(card, whiteboardsGrid.querySelector('.new-board'));
    });
}

function createWhiteboardCard(whiteboard) {
    const card = document.createElement('div');
    card.className = 'whiteboard-card';
    card.dataset.boardId = whiteboard.id;
    
    const lastEdited = new Date(whiteboard.updated_at).toLocaleDateString();
    
    card.innerHTML = `
        <div class="whiteboard-preview">
            <div class="preview-content">
                ${generatePreviewContent(whiteboard.content)}
            </div>
        </div>
        <div class="whiteboard-info">
            <h3>${whiteboard.title}</h3>
            <p>Last edited ${lastEdited}</p>
            <div class="whiteboard-actions">
                <button class="btn-secondary open-whiteboard-btn">Open</button>
                <button class="btn-tertiary share-whiteboard-btn">Share</button>
            </div>
        </div>
    `;
    
    return card;
}

function generatePreviewContent(content) {
    if (!content || !content.elements) {
        return `
            <div class="preview-sticky yellow"></div>
            <div class="preview-sticky blue"></div>
        `;
    }
    
    let previewHTML = '';
    const elements = content.elements.slice(0, 3); // Show max 3 elements
    
    elements.forEach(element => {
        if (element.type === 'sticky') {
            previewHTML += `<div class="preview-sticky ${element.color || 'yellow'}"></div>`;
        }
    });
    
    return previewHTML || '<div class="preview-sticky yellow"></div>';
}

function showStaticWhiteboards() {
    // Fallback static content (existing implementation)
    console.log('Showing static whiteboards as fallback');
}

function setupWhiteboardCardInteractions() {
    // Open whiteboard button
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('open-whiteboard-btn')) {
            const card = e.target.closest('.whiteboard-card');
            const boardId = card.dataset.boardId;
            const title = card.querySelector('h3').textContent;
            
            // Navigate to whiteboard page
            window.location.href = `/whiteboard/${boardId}`;
        }
    });
    
    // Create new whiteboard
    document.addEventListener('click', (e) => {
        if (e.target.closest('#create-new-board') || e.target.classList.contains('create-whiteboard-btn')) {
            createNewWhiteboard();
        }
    });
}

async function createNewWhiteboard() {
    try {
        const response = await fetch('http://localhost:3001/api/whiteboards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: 'New Whiteboard',
                description: 'Created just now',
                ownerId: 1
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Navigate to the new whiteboard
            window.location.href = `/whiteboard/${data.data.id}`;
        } else {
            console.error('Failed to create whiteboard:', data.error);
            alert('Failed to create whiteboard');
        }
    } catch (error) {
        console.error('Error creating whiteboard:', error);
        alert('Error creating whiteboard');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadWhiteboardContent();
}); 