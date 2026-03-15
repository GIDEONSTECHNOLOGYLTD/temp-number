#!/bin/bash

# Production deployment script for TempSMS Pro

set -e

echo "🚀 Starting TempSMS Pro deployment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
mkdir -p logs ssl

# Copy production environment file
if [ ! -f .env ]; then
    cp .env.production .env
    echo "📋 Created .env file from .env.production template"
    echo "⚠️  Please update the .env file with your actual credentials before proceeding"
    echo "   Required: Database passwords, SMS provider keys, JWT secret, etc."
    read -p "Press Enter after updating .env file..."
fi

# Build and start services
echo "🏗️  Building Docker images..."
docker-compose build

echo "🗄️  Starting database services..."
docker-compose up -d postgres redis

echo "⏳ Waiting for database to be ready..."
sleep 10

echo "🚀 Starting application..."
docker-compose up -d app

echo "🌐 Starting reverse proxy..."
docker-compose up -d nginx

echo "✅ Deployment complete!"
echo ""
echo "📱 TempSMS Pro is now running at:"
echo "   Local: http://localhost"
echo "   API:   http://localhost/api"
echo ""
echo "📊 Monitor logs with:"
echo "   docker-compose logs -f app"
echo ""
echo "🛠️  Manage services:"
echo "   docker-compose ps          # Check status"
echo "   docker-compose restart app # Restart app"
echo "   docker-compose down        # Stop all services"
echo ""
echo "🔧 For production setup:"
echo "   1. Configure SSL certificates in ./ssl/"
echo "   2. Update nginx.conf for your domain"
echo "   3. Set up SMS provider webhooks"
echo "   4. Configure payment processing"
echo "   5. Set up monitoring and alerts"
