#!/bin/bash

# TutoriAI Start Script
# This script starts both backend and frontend servers

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting TutoriAI servers...${NC}"

# Start backend server in background
echo -e "${BLUE}[INFO]${NC} Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend server in background
echo -e "${BLUE}[INFO]${NC} Starting frontend server..."
npm start &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}✅ Both servers are starting up!${NC}"
echo ""
echo "🌐 The application will be available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5001"
echo ""
echo "📝 Sample credentials:"
echo "   Teacher: teacher@example.com (password: demo123)"
echo "   Student: student1@example.com (password: demo123)"
echo ""
echo "🛑 To stop the servers, press Ctrl+C"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${BLUE}[INFO]${NC} Stopping servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}✅ Servers stopped${NC}"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
