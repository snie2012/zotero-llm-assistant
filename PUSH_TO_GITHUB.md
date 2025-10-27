# How to Push to GitHub

## Current Status

✅ The plugin files are ready and the `.xpi` has been built.
⚠️ Git is installed but Xcode command line tools need to be configured.

## Quick Instructions

### Option 1: Use the Setup Script (Recommended)

1. **Install Xcode Command Line Tools** (if not already installed):
   ```bash
   xcode-select --install
   ```
   This will open a dialog - click "Install" and wait for it to complete.

2. **Run the setup script**:
   ```bash
   cd /Users/shaoliangnie/Projects/zotero-llm-assistant
   chmod +x setup-git.sh
   ./setup-git.sh
   ```

3. **Create the GitHub repository**:
   - Go to https://github.com/snie2012
   - Click "New repository"
   - Name it: `zotero-llm-assistant`
   - Do NOT initialize with README (we already have one)
   - Click "Create repository"

4. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/snie2012/zotero-llm-assistant.git
   git branch -M main
   git push -u origin main
   ```

### Option 2: Manual Setup

If you prefer to do it manually:

```bash
cd /Users/shaoliangnie/Projects/zotero-llm-assistant

# Initialize git
git init

# Add files
git add .

# Create initial commit
git commit -m "Initial commit: Minimal Zotero 7+ plugin structure"

# Add remote (create repo on GitHub first!)
git remote add origin https://github.com/snie2012/zotero-llm-assistant.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Option 3: Use GitHub CLI (if installed)

```bash
cd /Users/shaoliangnie/Projects/zotero-llm-assistant

# Initialize and commit
git init
git add .
git commit -m "Initial commit: Minimal Zotero 7+ plugin structure"

# Create repo and push
gh repo create zotero-llm-assistant --public --source=. --remote=origin --push
```

## What Will Be Pushed

- ✅ All source code in `addon/`
- ✅ Build scripts
- ✅ Documentation (README, QUICKSTART, etc.)
- ✅ Build output (`.xpi` file)
- ❌ `node_modules/` (excluded by .gitignore)
- ❌ System files like `.DS_Store` (excluded by .gitignore)

## After Pushing

Once pushed to GitHub, you can:

1. **Share the repository**: https://github.com/snie2012/zotero-llm-assistant

2. **Add releases**: When you create new versions, tag them:
   ```bash
   git tag -a v0.0.1 -m "Initial release"
   git push --tags
   ```

3. **Update the manifest**: You already updated `manifest.json` with your info. After the first release, update the `update_url` in the manifest to point to your releases.

## Troubleshooting

**If git commands fail:**
- Make sure Xcode command line tools are installed: `xcode-select --install`
- Check if git is working: `git --version`

**If you get authentication errors:**
- Set up GitHub authentication: https://docs.github.com/en/get-started/getting-started-with-git/set-up-git
- Or use GitHub CLI: `gh auth login`

**If you need to update the .xpi:**
```bash
cd addon
rm -f ../dist/zotero-llm-assistant.xpi
zip -r ../dist/zotero-llm-assistant.xpi .
cd ..
git add dist/zotero-llm-assistant.xpi
git commit -m "Update XPI build"
git push
```

