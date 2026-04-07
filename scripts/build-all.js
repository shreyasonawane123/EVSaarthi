// scripts/build-all.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const apps = [
  { name: 'admin-app', folder: 'admin-app', target: 'admin' },
  { name: 'auth-app', folder: 'auth-app', target: 'auth' },
  { name: 'booking-app', folder: 'booking-app', target: 'booking' },
  { name: 'dashboard-app', folder: 'dashboard-app', target: 'dashboard' },
  { name: 'map-app', folder: 'map-app', target: 'map' },
  { name: 'profile-app', folder: 'profile-app', target: 'profile' },
  { name: 'shell-app', folder: 'shell-app', target: '' } // shell app is root
];

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

console.log('🚀 Starting Universal Frontend Build...');

// 1. Clean public directory
if (fs.existsSync(publicDir)) {
  console.log('🧹 Cleaning old public directory...');
  fs.rmSync(publicDir, { recursive: true, force: true });
}
fs.mkdirSync(publicDir);

// 2. Build each app
apps.forEach(app => {
  const appPath = path.join(rootDir, 'frontend', app.folder);
  if (!fs.existsSync(appPath)) {
    console.warn(`[!] Skipping ${app.name} (Folder not found in frontend/)`);
    return;
  }

  console.log(`\n📦 Building ${app.name}...`);
  try {
    // Run npm install (first time) and npm run build
    execSync('npm install --no-audit --no-fund', { cwd: appPath, stdio: 'inherit' });
    execSync('npm run build', { cwd: appPath, stdio: 'inherit' });

    const buildPath = path.join(appPath, 'build');
    const targetPath = app.target ? path.join(publicDir, app.target) : publicDir;

    if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });

    console.log(`🚚 Moving build to public/${app.target}...`);
    
    // Copy build files to target
    copyRecursiveSync(buildPath, targetPath);

  } catch (err) {
    console.error(`❌ Build failed for ${app.name}:`, err.message);
    process.exit(1);
  }
});

console.log('\n✅ All Apps Built Successfully!');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest);
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}
