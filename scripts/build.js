/**
 * Build script to create XPI file for Zotero LLM Assistant plugin
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, '..', 'dist');
const addonDir = path.join(__dirname, '..', 'addon');
const xpiName = 'zotero-llm-assistant.xpi';

// Create dist directory if it doesn't exist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const xpiPath = path.join(distDir, xpiName);

// Remove old XPI if it exists
if (fs.existsSync(xpiPath)) {
  fs.unlinkSync(xpiPath);
}

// Create XPI file
console.log('Building XPI file...');
const cwd = process.cwd();
process.chdir(addonDir);
try {
  execSync(`zip -r ${xpiPath} .`, { stdio: 'inherit' });
  console.log(`XPI file created: ${xpiPath}`);
} catch (error) {
  console.error('Error building XPI:', error);
  process.exit(1);
} finally {
  process.chdir(cwd);
}


