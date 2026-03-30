#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const MOBILE_PKG_PATH = path.resolve(__dirname, '../packages/mobile/package.json');
const OUTPUT_PATH = path.resolve(__dirname, '../packages/mobile/src/data/licenses.json');

const mobilePkg = JSON.parse(fs.readFileSync(MOBILE_PKG_PATH, 'utf8'));
const allDeps = Object.keys({
  ...mobilePkg.dependencies,
  ...mobilePkg.devDependencies,
});

const LICENSE_FILE_NAMES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md', 'license.txt', 'License.md'];

function findLicenseText(pkgDir) {
  for (const name of LICENSE_FILE_NAMES) {
    const filePath = path.join(pkgDir, name);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8').trim();
    }
  }
  return null;
}

const licenses = [];

for (const depName of allDeps) {
  const candidates = [
    path.resolve(__dirname, '../packages/mobile/node_modules', depName),
    path.resolve(__dirname, '../node_modules', depName),
  ];

  let pkgDir = null;
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'package.json'))) {
      pkgDir = candidate;
      break;
    }
  }

  if (!pkgDir) {
    console.warn(`  Skipping ${depName} — not found in node_modules`);
    continue;
  }

  const depPkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));

  let author = '';
  if (typeof depPkg.author === 'string') {
    author = depPkg.author;
  } else if (depPkg.author?.name) {
    author = depPkg.author.name;
  }

  const licenseText = findLicenseText(pkgDir);

  licenses.push({
    name: depPkg.name || depName,
    version: depPkg.version || '',
    license: depPkg.license || 'Unknown',
    author,
    licenseText: licenseText || '',
  });
}

licenses.sort((a, b) => a.name.localeCompare(b.name));

const outputDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(licenses, null, 2));
console.log(`Generated ${licenses.length} license entries → ${OUTPUT_PATH}`);
