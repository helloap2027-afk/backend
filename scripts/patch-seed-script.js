const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, 'seed-3-per-category.js');
let c = fs.readFileSync(target, 'utf8');
const isCRLF = c.includes('\r\n');
let norm = c.replace(/\r\n/g, '\n');

norm = norm.replace(
  'sqlite.prepare("INSERT INTO localities (id, city_id, name, slug, pincode, latitude, longitude, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)").run(',
  'sqlite.prepare("INSERT OR REPLACE INTO localities (id, city_id, name, slug, pincode, latitude, longitude, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)").run('
);

fs.writeFileSync(target, isCRLF ? norm.replace(/\n/g, '\r\n') : norm, 'utf8');
console.log('PATCHED_LOCALITY_INSERT');

