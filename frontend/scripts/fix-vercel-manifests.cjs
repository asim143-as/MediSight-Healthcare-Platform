const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..', '.next', 'server', 'app');

function ensureManifest(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
        const manifestPath = path.join(fullPath, 'page_client-reference-manifest.js');
        if (!fs.existsSync(manifestPath)) {
          fs.writeFileSync(manifestPath, 'module.exports = {};\n', 'utf8');
        }
      }

      ensureManifest(fullPath);
    }
  }
}

ensureManifest(appDir);
