#!/bin/bash

# TutoriAI Startup Script
echo "🚀 Starting TutoriAI Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use"
        return 1
    fi
    return 0
}

# Check ports
check_port 3001 || echo "Backend port 3001 is already in use"
check_port 3000 || echo "Frontend port 3000 is already in use"

echo "📦 Installing backend dependencies..."
cd backend
npm install

echo "🗄️  Setting up database..."
npm run init-db

echo "🧪 Running tests..."
npm test

echo "🔧 Starting backend server..."
npm run dev &
BACKEND_PID=$!

echo "⏳ Waiting for backend to start..."
sleep 5

echo "🌐 Starting frontend server..."
cd ../frontend
python3 -m http.server 3000 &
FRONTEND_PID=$!

echo "✅ TutoriAI is starting up!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup SIGINT

# Wait for user to stop
wait 