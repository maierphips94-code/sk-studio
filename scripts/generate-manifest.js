const fs   = require('fs');
const path = require('path');

const imagesBase = path.join(__dirname, '..', 'assets', 'images');

// Mapping: manifest-key → ordner(s) im Dateisystem
const categoryFolders = {
  automobil: ['Automobil'],
  people:    ['Portrait', 'Event'],
  industrie: ['Industrie'],
};

const manifest = {};

for (const [key, folders] of Object.entries(categoryFolders)) {
  const files = [];
  for (const folder of folders) {
    const folderPath = path.join(imagesBase, folder);
    if (!fs.existsSync(folderPath)) {
      console.warn(`  ⚠ Ordner nicht gefunden: ${folder}`);
      continue;
    }
    const items = fs.readdirSync(folderPath)
      .filter(f => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .sort()
      .map(f => ({ folder, file: f }));
    files.push(...items);
  }
  manifest[key] = files;
}

const outPath = path.join(__dirname, '..', 'assets', 'manifest.json');
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));

console.log('✓ manifest.json generiert:');
for (const [key, items] of Object.entries(manifest)) {
  console.log(`  ${key}: ${items.length} Bilder`);
}
