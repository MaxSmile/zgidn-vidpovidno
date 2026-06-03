#!/bin/bash

set -e

echo "🚀 Starting deployment process..."

echo "📦 Installing dependencies..."
npm ci

echo "🔨 Building project..."
npm run build

echo "🔥 Deploying to Firebase Hosting..."
firebase deploy

echo "✅ Deployment completed successfully!"
