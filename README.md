# TutoriAI - Classroom Dashboard

A modern React-based classroom management web application built with TypeScript and Tailwind CSS.

## 🚀 Features

- **Modern React Architecture**: Built with React 18, TypeScript, and functional components
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Component-Based**: Reusable components for maintainable code
- **Interactive UI**: Smooth animations and transitions
- **Type Safety**: Full TypeScript support for better development experience

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── Button.tsx       # Customizable button component
│   ├── Header.tsx       # Application header with actions
│   ├── Sidebar.tsx      # Navigation sidebar
│   ├── Tabs.tsx         # Tab navigation component
│   ├── ClassCard.tsx    # Class display card
│   ├── Classes.tsx      # Classes page component
│   ├── TodoSidebar.tsx  # Todo management sidebar
│   └── index.ts         # Component exports
├── App.tsx              # Main application component
├── App.css              # Custom styles
├── index.css            # Global styles with Tailwind
└── index.tsx            # Application entry point
```

## 🧩 Components

### Core Components

- **Button**: Flexible button component with multiple variants and sizes
- **Header**: Application header with title, action buttons, and user profile
- **Sidebar**: Navigation sidebar with menu items and mobile support
- **Tabs**: Tab navigation component with different styling variants
- **ClassCard**: Card component for displaying class information
- **Classes**: Page component for managing and displaying classes
- **TodoSidebar**: Collapsible sidebar for todo management

### Component Features

#### Button Component
- Multiple variants: primary, secondary, outline, ghost
- Different sizes: sm, md, lg
- Icon support
- Disabled state
- Custom styling

#### Header Component
- Gradient background
- Dynamic title
- Action buttons (Add Class, Join Class)
- Notification bell
- User profile display

#### Sidebar Component
- Responsive design
- Mobile menu support
- Active state highlighting
- Smooth animations

#### Tabs Component
- Multiple variants: default, pills, underline
- Icon support
- Active state management
- Custom styling

#### ClassCard Component
- Class information display
- Student and assignment counts
- Action buttons (notifications, files)
- Hover effects

#### TodoSidebar Component
- Collapsible design
- Todo categorization (urgent, pending, completed)
- Interactive todo items
- Floating toggle button

## 🎨 Styling

- **Tailwind CSS**: Utility-first CSS framework
- **Custom CSS**: Additional styles for specific components
- **Responsive Design**: Mobile-first approach
- **Smooth Animations**: CSS transitions and transforms
- **Modern UI**: Clean, professional design

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd TutoriAI
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Available Scripts

- `npm start`: Runs the app in development mode
- `npm test`: Launches the test runner
- `npm run build`: Builds the app for production
- `npm run eject`: Ejects from Create React App (one-way operation)

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop (1024px and above)
- Tablet (768px - 1023px)
- Mobile (below 768px)

## 🔧 Customization

### Adding New Components

1. Create a new component file in `src/components/`
2. Export it from `src/components/index.ts`
3. Import and use in your application

### Styling

- Use Tailwind CSS classes for styling
- Add custom CSS in `src/App.css` for specific needs
- Follow the existing design patterns

### Data Management

- Currently using local state with React hooks
- Easy to integrate with external APIs or state management libraries
- Sample data provided in `App.tsx`

## 🎯 Future Enhancements

- [ ] Add more page components (Assignments, Archived, Overview, Settings)
- [ ] Implement state management (Redux, Zustand, or Context API)
- [ ] Add authentication and user management
- [ ] Integrate with backend APIs
- [ ] Add real-time features with WebSockets
- [ ] Implement dark mode
- [ ] Add unit and integration tests
- [ ] Performance optimizations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please open an issue in the repository.
