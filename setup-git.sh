#!/bin/bash

# Setup script for pushing to GitHub

echo "Zotero LLM Assistant - Git Setup"
echo "================================"

# Initialize git repository
echo "1. Initializing git repository..."
git init

# Add all files
echo "2. Adding files to git..."
git add .

# Create initial commit
echo "3. Creating initial commit..."
git commit -m "Initial commit: Minimal Zotero 7+ plugin structure"

echo ""
echo "✅ Git repository initialized and initial commit created!"
echo ""
echo "Next steps:"
echo "1. Create a repository on GitHub named 'zotero-llm-assistant'"
echo "2. Run these commands:"
echo "   git remote add origin https://github.com/snie2012/zotero-llm-assistant.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "Or, if you want to run this all at once:"
echo "   git remote add origin https://github.com/snie2012/zotero-llm-assistant.git && git branch -M main && git push -u origin main"

