// Navigation functionality
const navItems = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');

// Handle navigation clicks
navItems.forEach(item => {
    item.addEventListener('click', async () => {
        const target = item.dataset.target;
        
        // Skip if it's the logout item
        if (!target) return;
        
        // Update active states
        navItems.forEach(nav => nav.classList.remove('active'));
        contentSections.forEach(section => section.classList.remove('active'));
        
        item.classList.add('active');
        
        // Show target section
        const targetSection = document.getElementById(target);
        if (targetSection) {
            targetSection.classList.add('active');
            
            // Load section-specific content from backend
            await loadSectionContent(target);
        }
    });
});

// Load section-specific content from backend
async function loadSectionContent(section) {
    try {
        console.log(`Loading content for section: ${section}`);
        const response = await fetch(`http://localhost:3001/api/navigation/${section}`);
        const data = await response.json();
        
        if (data.success) {
            console.log(`${section} data loaded:`, data.data.message);
            
            // Handle specific section loading
            if (section === 'whiteboards') {
                console.log('Triggering whiteboard dashboard load...');
                // Trigger whiteboard list loading
                if (typeof loadWhiteboardDashboard === 'function') {
                    loadWhiteboardDashboard();
                } else {
                    console.log('loadWhiteboardDashboard function not found, loading script...');
                    // Load the script if not already loaded
                    const script = document.createElement('script');
                    script.src = 'features/whiteboard/whiteboard-list.js';
                    script.onload = () => {
                        if (typeof loadWhiteboardDashboard === 'function') {
                            loadWhiteboardDashboard();
                        }
                    };
                    document.head.appendChild(script);
                }
            }
        }
    } catch (error) {
        console.error(`Error loading ${section} content:`, error);
    }
}

// Handle logout
const logoutItem = document.querySelector('.nav-item.logout');
logoutItem.addEventListener('click', () => {
    // Add logout functionality here
    console.log('Logout clicked');
    alert('Logout functionality would be implemented here');
});

// Add hover effects for cards
const cards = document.querySelectorAll('.card');
cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-4px)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
    });
});

// Calendar navigation
const calendarNavArrows = document.querySelectorAll('.nav-arrow');
calendarNavArrows.forEach(arrow => {
    arrow.addEventListener('click', () => {
        // Add calendar navigation functionality here
        console.log('Calendar navigation clicked');
    });
});

// Meeting action buttons
const meetingButtons = document.querySelectorAll('.btn-secondary, .btn-tertiary');
meetingButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        const action = button.textContent;
        console.log(`${action} clicked`);
        // Add meeting action functionality here
    });
});

// Control buttons
const controlButtons = document.querySelectorAll('.control-btn');
controlButtons.forEach(button => {
    button.addEventListener('click', () => {
        const action = button.querySelector('span').textContent;
        console.log(`${action} clicked`);
        // Add control button functionality here
    });
});

// RSVP buttons
const rsvpButtons = document.querySelectorAll('.btn-primary');
rsvpButtons.forEach(button => {
    if (button.textContent === 'RSVP') {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('RSVP clicked');
            // Add RSVP functionality here
        });
    }
});

// Mobile menu toggle (for responsive design)
const createMobileMenuToggle = () => {
    const header = document.querySelector('.header');
    const sidebar = document.querySelector('.sidebar');
    
    // Create hamburger menu button
    const menuButton = document.createElement('button');
    menuButton.className = 'mobile-menu-toggle';
    menuButton.innerHTML = '<i class="fas fa-bars"></i>';
    menuButton.style.display = 'none';
    
    // Style the menu button
    menuButton.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.5rem;
        display: none;
    `;
    
    // Add to header
    header.querySelector('.header-left').appendChild(menuButton);
    
    // Toggle sidebar
    menuButton.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
    
    // Show/hide based on screen size
    const checkScreenSize = () => {
        if (window.innerWidth <= 768) {
            menuButton.style.display = 'block';
        } else {
            menuButton.style.display = 'none';
            sidebar.classList.remove('open');
        }
    };
    
    window.addEventListener('resize', checkScreenSize);
    checkScreenSize();
};

// Initialize mobile menu
createMobileMenuToggle();

// Add some interactive features
document.addEventListener('DOMContentLoaded', () => {
    // Animate cards on load
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
    
    // Add current time to greeting
    const greeting = document.querySelector('.greeting-card h2');
    if (greeting) {
        const hour = new Date().getHours();
        let timeGreeting = 'Good morning';
        
        if (hour >= 12 && hour < 17) {
            timeGreeting = 'Good afternoon';
        } else if (hour >= 17) {
            timeGreeting = 'Good evening';
        }
        
        greeting.textContent = `${timeGreeting}, John!`;
    }
    
    // Setup whiteboard navigation
    setupWhiteboardNavigation();
});

// Setup whiteboard navigation
function setupWhiteboardNavigation() {
    // Handle whiteboard navigation clicks
    const whiteboardNav = document.querySelector('[data-target="whiteboards"]');
    if (whiteboardNav) {
        whiteboardNav.addEventListener('click', () => {
            // Load whiteboard content when navigating to whiteboards
            if (window.loadWhiteboardContent) {
                window.loadWhiteboardContent();
            }
        });
    }
    
    // Load whiteboard list script when needed
    if (!window.whiteboardListLoaded) {
        const script = document.createElement('script');
        script.src = 'features/whiteboard/whiteboard-list.js';
        script.onload = () => {
            window.whiteboardListLoaded = true;
        };
        document.head.appendChild(script);
    }
    
    // Setup embedded whiteboard editor controls
    setupEmbeddedWhiteboardControls();
}

// Setup embedded whiteboard editor controls
function setupEmbeddedWhiteboardControls() {
    // Back button functionality
    const backBtn = document.getElementById('back-to-whiteboards');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            // Switch back to whiteboards list
            const navItems = document.querySelectorAll('.nav-item');
            const contentSections = document.querySelectorAll('.content-section');
            
            // Remove active states from all sections
            navItems.forEach(nav => nav.classList.remove('active'));
            contentSections.forEach(section => section.classList.remove('active'));
            
            // Show whiteboards section
            const whiteboardsSection = document.getElementById('whiteboards');
            const whiteboardsNav = document.querySelector('[data-target="whiteboards"]');
            if (whiteboardsSection && whiteboardsNav) {
                whiteboardsSection.classList.add('active');
                whiteboardsNav.classList.add('active');
                
                // Reload whiteboard list
                if (typeof loadWhiteboardDashboard === 'function') {
                    loadWhiteboardDashboard();
                }
            }
        });
    }
    
    // Share button functionality
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', function() {
            const shareUrl = window.location.href;
            navigator.clipboard.writeText(shareUrl).then(() => {
                alert('Share link copied to clipboard!');
            });
        });
    }
    
    // Present button functionality
    const presentBtn = document.getElementById('present-btn');
    if (presentBtn) {
        presentBtn.addEventListener('click', function() {
            // Enter fullscreen mode
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            }
        });
    }
}
