const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbPath = path.resolve(__dirname, '../data/hello_dev.db');
const db = new DatabaseSync(dbPath);

console.log('Businesses sample:', db.prepare('SELECT id, name FROM businesses LIMIT 10').all());
console.log('Locations sample:', db.prepare('SELECT id, business_id FROM business_locations LIMIT 10').all());
