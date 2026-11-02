const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbPath = path.resolve(__dirname, '../data/hello_dev.db');
const db = new DatabaseSync(dbPath);

console.log('SQL Database File Path:', dbPath);

console.log('\n--- 1. SQL TABLES IN DATABASE ---');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log(tables.map(t => t.name).join(', '));

console.log('\n--- 2. BUSINESSES STORED IN SQL (businesses table) ---');
const businesses = db.prepare(`
  SELECT b.id, b.name, b.slug, b.status, b.is_verified, b.average_rating, c.name as city, cat.name as category, b.created_at 
  FROM businesses b
  JOIN business_locations bl ON bl.business_id = b.id AND bl.is_primary = 1
  JOIN cities c ON c.id = bl.city_id
  JOIN business_categories bc ON bc.business_id = b.id AND bc.is_primary = 1
  JOIN categories cat ON cat.id = bc.category_id
  ORDER BY b.created_at DESC 
  LIMIT 6
`).all();
console.table(businesses);

console.log('\n--- 3. REGISTERED USERS IN SQL (users table) ---');
const users = db.prepare(`
  SELECT id, phone_number, full_name, email, status, preferred_language, created_at 
  FROM users 
  ORDER BY created_at DESC 
  LIMIT 6
`).all();
console.table(users);

console.log('\n--- 4. ENQUIRIES / LEADS IN SQL (enquiries table) ---');
const enquiries = db.prepare(`
  SELECT id, reference_no, business_id, customer_name, customer_phone, status, created_at
  FROM enquiries
  ORDER BY created_at DESC
  LIMIT 5
`).all();
console.table(enquiries);

console.log('\n--- 5. TOTAL ROW COUNTS ---');
console.log({
  businesses_count: db.prepare("SELECT count(*) as count FROM businesses").get().count,
  business_locations_count: db.prepare("SELECT count(*) as count FROM business_locations").get().count,
  business_categories_count: db.prepare("SELECT count(*) as count FROM business_categories").get().count,
  users_count: db.prepare("SELECT count(*) as count FROM users").get().count,
  enquiries_count: db.prepare("SELECT count(*) as count FROM enquiries").get().count,
  categories_count: db.prepare("SELECT count(*) as count FROM categories").get().count,
  cities_count: db.prepare("SELECT count(*) as count FROM cities").get().count,
  localities_count: db.prepare("SELECT count(*) as count FROM localities").get().count,
});
