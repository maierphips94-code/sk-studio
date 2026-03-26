const fs   = require('fs');
const path = require('path');

const imagesBase = path.join(__dirname, '..', 'assets', 'images');

// Liest Bilddimensionen aus JPEG-Headern (SOF-Marker) – ohne externe Abhängigkeiten
function getImageSize(filePath) {
  try {
    const buf = Buffer.alloc(65536);
    const fd  = fs.openSync(filePath, 'r');
    const n   = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);

    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.jpg' || ext === '.jpeg') {
      // JPEG: SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2) Marker suchen
      for (let i = 2; i < n - 8; i++) {
        if (buf[i] === 0xFF && (buf[i+1] === 0xC0 || buf[i+1] === 0xC1 || buf[i+1] === 0xC2)) {
          return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        }
      }
    } else if (ext === '.png') {
      // PNG: IHDR-Chunk beginnt nach 8 Bytes Signatur + 4 Bytes Länge + 4 Bytes "IHDR"
      if (buf.toString('ascii', 12, 16) === 'IHDR') {
        return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
      }
    }
  } catch {}
  return null;
}

// Mapping: manifest-key → Ordner(s) im Dateisystem
const categoryFolders = {
  automobil:  ['Automobil'],
  people:     ['People'],
  industrie:  ['Industrie'],
  referenzen: ['Referenzen'],
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
      .map(f => {
        const fullPath  = path.join(folderPath, f);
        const size      = getImageSize(fullPath);
        const portrait  = size ? size.height > size.width : false;
        return { folder, file: f, portrait };
      });
    files.push(...items);
  }
  manifest[key] = files;
}

const outPath = path.join(__dirname, '..', 'assets', 'manifest.json');
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));

console.log('✓ manifest.json generiert:');
for (const [key, items] of Object.entries(manifest)) {
  const portraits = items.filter(i => i.portrait).length;
  const info      = portraits > 0 ? ` (${portraits} hochkant)` : '';
  console.log(`  ${key}: ${items.length} Bilder${info}`);
}
