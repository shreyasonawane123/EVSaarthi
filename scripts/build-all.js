const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const FRONTEND_DIR = path.join(ROOT, "frontend");
const PUBLIC_DIR = path.join(ROOT, "public");

const APPS = [
  { name: "shell-app",     dest: "."         },
  { name: "auth-app",      dest: "auth"      },
  { name: "dashboard-app", dest: "dashboard" },
  { name: "booking-app",   dest: "booking"   },
  { name: "map-app",       dest: "map"       },
  { name: "profile-app",   dest: "profile"   },
  { name: "admin-app",     dest: "admin"     },
];

const sharedEnvPath = path.join(FRONTEND_DIR, ".env");

if (!fs.existsSync(sharedEnvPath)) {
  console.error("❌ frontend/.env not found!");
  process.exit(1);
}

const sharedEnv = fs.readFileSync(sharedEnvPath, "utf-8");

for (const app of APPS) {
  const appDir = path.join(FRONTEND_DIR, app.name);
  const appEnvPath = path.join(appDir, ".env");

  console.log(`\n🔧 [${app.name}] Injecting .env...`);
  fs.writeFileSync(appEnvPath, sharedEnv);

  console.log(`🏗️  [${app.name}] Building...`);
  execSync("npm run build", {
    cwd: appDir,
    stdio: "inherit"
  });

  const sourceDir = path.join(appDir, "build");
  const destDir = path.join(PUBLIC_DIR, app.dest);

  fs.mkdirSync(destDir, { recursive: true });

  fs.cpSync(sourceDir, destDir, {
    recursive: true,
    force: true
  });

  fs.unlinkSync(appEnvPath);

  console.log(`✅ [${app.name}] Done`);
}

console.log("\n🎉 All apps built!");
