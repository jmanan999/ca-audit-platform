#!/bin/bash

# CA Audit Platform - Setup Script
# This script sets up the entire development environment

set -e

echo "================================"
echo "CA Audit Platform - Setup Script"
echo "================================"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.10+"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Setup Backend
echo "📦 Setting up FastAPI Backend..."
cd fastapi_backend

# Create virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Virtual environment created"
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -q -r requirements.txt
echo "✅ Backend dependencies installed"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Created .env file - please update with your configuration"
fi

cd ..

# Setup Web Dashboard
echo ""
echo "🌐 Setting up Next.js Web Dashboard..."
cd nextjs_dashboard

# Install dependencies
npm install -q
echo "✅ Web dashboard dependencies installed"

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    cp .env.local.example .env.local
    echo "✅ Created .env.local file - please update with your configuration"
fi

cd ..

# Setup Mobile App
echo ""
echo "📱 Setting up Flutter Mobile App..."
cd flutter_app

# Get Flutter dependencies
flutter pub get > /dev/null 2>&1
echo "✅ Mobile app dependencies installed"

cd ..

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Backend:"
echo "   cd fastapi_backend"
echo "   source venv/bin/activate"
echo "   Update .env with your configuration"
echo "   uvicorn main:app --reload"
echo ""
echo "2. Web Dashboard:"
echo "   cd nextjs_dashboard"
echo "   npm run dev"
echo ""
echo "3. Mobile App:"
echo "   cd flutter_app"
echo "   flutter run"
echo ""
echo "For more information, see docs/DEVELOPMENT.md"
