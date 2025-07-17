// Modern Whiteboard Dashboard/List View

// Auto-load when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only load if we're on the whiteboards section
    const whiteboardsSection = document.getElementById('whiteboards');
    if (whiteboardsSection && whiteboardsSection.classList.contains('active')) {
        loadWhiteboardDashboard();
    }
});

// Also expose the function globally for navigation
window.loadWhiteboardDashboard = loadWhiteboardDashboard;

async function loadWhiteboardDashboard() {
    const grid = document.querySelector('.whiteboards-grid');
    if (!grid) return;
    grid.innerHTML = '';
    showLoading(grid);
    try {
        const response = await fetch('http://localhost:3001/api/whiteboards?userId=1');
        const data = await response.json();
        grid.innerHTML = '';
        if (data.success && Array.isArray(data.data)) {
            data.data.forEach(whiteboard => {
                grid.appendChild(createWhiteboardCard(whiteboard));
            });
            grid.appendChild(createNewBoardCard());
        } else {
            showError(grid, data.error || 'Failed to load whiteboards');
        }
    } catch (err) {
        grid.innerHTML = '';
        showError(grid, 'Network error loading whiteboards');
    }
}

function showLoading(container) {
    container.innerHTML = '<div class="loading">Loading whiteboards...</div>';
}

function showError(container, message) {
    container.innerHTML = `<div class="error">${message}</div>`;
}

function createWhiteboardCard(whiteboard) {
    const card = document.createElement('div');
    card.className = 'whiteboard-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Open whiteboard: ${whiteboard.title}`);
    card.dataset.boardId = whiteboard.id;
    card.addEventListener('click', () => openWhiteboard(whiteboard.id));
    card.addEventListener('keydown', e => { if (e.key === 'Enter') openWhiteboard(whiteboard.id); });

    const lastEdited = new Date(whiteboard.updated_at).toLocaleString();
    card.innerHTML = `
        <div class="whiteboard-preview">
            <div class="preview-content">
                ${renderPreviewContent(whiteboard.content)}
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
    card.querySelector('.open-whiteboard-btn').addEventListener('click', e => {
        e.stopPropagation();
        openWhiteboard(whiteboard.id);
    });
    card.querySelector('.share-whiteboard-btn').addEventListener('click', e => {
        e.stopPropagation();
        navigator.clipboard.writeText(window.location.origin + '/whiteboard/' + whiteboard.id)
            .then(() => alert('Share link copied!'));
    });
    return card;
}

function renderPreviewContent(content) {
    if (!content || !Array.isArray(content.elements)) {
        return '<div class="preview-sticky yellow"></div>';
    }
    // Render up to 3 elements for preview
    return content.elements.slice(0, 3).map(el => {
        if (el.type === 'sticky') {
            return `<div class="preview-sticky ${el.color || 'yellow'}"></div>`;
        }
        if (el.type === 'text') {
            return `<div class="preview-text">${escapeHTML(el.content || '')}</div>`;
        }
        if (el.type === 'shape') {
            return `<div class="preview-shape"></div>`;
        }
        if (el.type === 'pen') {
            return `<svg class="preview-pen" width="60" height="60"><path d="${el.path || ''}" stroke="#333" stroke-width="2" fill="none"/></svg>`;
        }
        return '';
    }).join('');
}

function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, function (m) {
        return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'})[m];
    });
}

function createNewBoardCard() {
    const card = document.createElement('div');
    card.className = 'whiteboard-card new-board';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'Create new whiteboard');
    card.innerHTML = `
        <div class="new-board-content">
            <i class="fas fa-plus-circle"></i>
            <h3>Create New Whiteboard</h3>
            <p>Start collaborating with your team</p>
        </div>
    `;
    card.addEventListener('click', createNewWhiteboard);
    card.addEventListener('keydown', e => { if (e.key === 'Enter') createNewWhiteboard(); });
    return card;
}

async function createNewWhiteboard() {
    try {
        const response = await fetch('http://localhost:3001/api/whiteboards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'New Whiteboard', description: 'Created just now', ownerId: 1 })
        });
        const data = await response.json();
        if (data.success) {
            openWhiteboard(data.data.id);
        } else {
            alert('Failed to create whiteboard: ' + data.error);
        }
    } catch (err) {
        alert('Error creating whiteboard');
    }
}

function openWhiteboard(id) {
    console.log('Opening whiteboard with ID:', id);
    
    // Switch to the embedded whiteboard editor section
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    
    // Remove active states from all sections
    navItems.forEach(nav => nav.classList.remove('active'));
    contentSections.forEach(section => section.classList.remove('active'));
    
    // Show whiteboard editor section
    const whiteboardEditorSection = document.getElementById('whiteboard-editor');
    if (whiteboardEditorSection) {
        console.log('Found whiteboard editor section, switching to it...');
        whiteboardEditorSection.classList.add('active');
        
        // Initialize whiteboard manager if not already done
        if (!window.whiteboardManager) {
            console.log('Initializing WhiteboardManager...');
            window.whiteboardManager = new WhiteboardManager();
        }
        
        // Load the specific whiteboard
        console.log('Loading whiteboard content...');
        window.whiteboardManager.loadWhiteboard(id);
    } else {
        console.log('Whiteboard editor section not found, falling back to separate page...');
        // Fallback to separate page if embedded section doesn't exist
        window.location.href = `/whiteboard/${id}`;
    }
} 