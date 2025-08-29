#!/bin/bash

echo "🚀 Starting deployment process..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not a git repository. Please run 'git init' first."
    exit 1
fi

# Check if GROQ_API_KEY is set
if [ -z "$GROQ_API_KEY" ]; then
    echo "⚠️  GROQ_API_KEY not found in environment"
    echo "Please set it with: export GROQ_API_KEY=your_key_here"
    read -p "Enter your GROQ API key: " GROQ_API_KEY
    export GROQ_API_KEY
fi

# Add all changes
echo "📦 Adding files to git..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')"

# Push to GitHub
echo "⬆️  Pushing to GitHub..."
git push origin main

echo "✅ Code pushed to GitHub successfully!"
echo ""
echo "🌐 Next steps:"
echo "1. Go to https://dashboard.render.com/"
echo "2. Click 'New +' → 'Web Service'"
echo "3. Connect your GitHub repo"
echo "4. Use these settings:"
echo "   - Build Command: npm install"
echo "   - Start Command: npm start"
echo "   - Environment Variables:"
echo "     * GROQ_API_KEY = $GROQ_API_KEY"
echo "     * NODE_ENV = production"
echo ""
echo "🎯 Your API will be live at: https://your-service-name.onrender.com"