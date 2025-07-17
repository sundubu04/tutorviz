# Whiteboard Feature

This directory contains the whiteboard functionality for the TutoriAI application, now using a page-based architecture with backend integration.

## Architecture

The whiteboard feature has been restructured to use separate pages for better user experience and backend integration:

- **Dashboard List View**: Shows all user whiteboards with previews
- **Standalone Editor Page**: Individual whiteboard editing in dedicated pages
- **Backend Integration**: Full CRUD operations with PostgreSQL database

## Files

### `whiteboard.html`
Contains the whiteboard list view that appears in the main dashboard. This includes:
- Whiteboard cards with previews
- Create new whiteboard button
- Dynamic loading from backend API

### `whiteboard-list.js`
JavaScript functionality for the dashboard whiteboard list:
- Loads whiteboards from backend API
- Creates whiteboard cards dynamically
- Handles navigation to individual whiteboard pages
- Manages whiteboard creation

### `whiteboard.js`
**Note**: This file now contains only the WhiteboardManager class for the standalone editor page. The dashboard functionality has been moved to `whiteboard-list.js`.

### `whiteboard.css`
Styles for both the list view and editor interface.

## Usage

### Dashboard Integration
The whiteboard list is automatically loaded when users navigate to the "Whiteboards" section in the dashboard. Users can:
- View all their whiteboards with previews
- Create new whiteboards
- Open existing whiteboards in dedicated pages

### Standalone Editor
Individual whiteboards open in dedicated pages (`/whiteboard/:id`) with:
- Full editing capabilities
- Auto-save functionality
- Backend integration
- Share and present features

## Backend Integration

The whiteboard feature integrates with the Node.js backend:

### API Endpoints Used
- `GET /api/whiteboards` - Load user's whiteboards
- `POST /api/whiteboards` - Create new whiteboard
- `GET /api/whiteboards/:id` - Load specific whiteboard
- `PATCH /api/whiteboards/:id/content` - Save whiteboard content

### Data Flow
1. **Dashboard**: Loads whiteboard list from API
2. **Navigation**: Clicking "Open" navigates to `/whiteboard/:id`
3. **Editor**: Loads whiteboard content and saves changes automatically
4. **Persistence**: All changes are saved to PostgreSQL database

## Features

### List View Features
- ✅ Dynamic whiteboard loading from API
- ✅ Preview generation from whiteboard content
- ✅ Create new whiteboard functionality
- ✅ Navigation to individual whiteboard pages
- ✅ Responsive card layout

### Editor Features
- ✅ Multiple tools (select, text, sticky notes, shapes, pen)
- ✅ Real-time content saving
- ✅ Zoom controls
- ✅ Draggable elements
- ✅ Backend integration
- ✅ Share functionality

## Development

### Adding New Features
1. **List View**: Update `whiteboard-list.js` for dashboard functionality
2. **Editor**: Update `whiteboard.js` for editing features
3. **Styling**: Update `whiteboard.css` for visual changes
4. **Backend**: Add new API endpoints as needed

### Testing
- Test whiteboard list loading
- Test whiteboard creation
- Test navigation to editor pages
- Test content saving and loading
- Test all editor tools

## Integration Points

### Main Dashboard
- Loaded via `script.js` when navigating to whiteboards
- Uses `whiteboard-list.js` for functionality
- Displays in `#whiteboards` content section

### Standalone Pages
- Served by backend at `/whiteboard/:id`
- Uses `whiteboard.html` as template
- Loads `whiteboard.js` for editor functionality

## Dependencies

- **Frontend**: Font Awesome icons, main styles
- **Backend**: Node.js API server
- **Database**: PostgreSQL for data persistence
- **Browser**: Modern browser with ES6+ support 