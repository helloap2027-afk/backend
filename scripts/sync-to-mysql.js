const { DatabaseSync } = require('node:sqlite');
const mysql = require('mysql2/promise');
const path = require('node:path');

function formatDateTime(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

async function syncToMySQL() {
  const dbPath = path.resolve(__dirname, '../data/hello_dev.db');
  const sqlite = new DatabaseSync(dbPath);

  const mysqlConn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    database: 'hello_db',
  });

  console.log('Connected to MySQL hello_db successfully.');

  // Disable foreign keys temporarily during sync
  await mysqlConn.execute('SET FOREIGN_KEY_CHECKS = 0');

  // 1. Sync Users
  const users = sqlite.prepare('SELECT * FROM users').all();
  for (const u of users) {
    await mysqlConn.execute(
      `INSERT INTO users (id, phone_number, full_name, email, avatar_url, status, phone_verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         full_name = VALUES(full_name),
         email = VALUES(email),
         status = VALUES(status),
         updated_at = VALUES(updated_at)`,
      [
        u.id, u.phone_number, u.full_name, u.email, u.avatar_url,
        u.status || 'ACTIVE', formatDateTime(u.phone_verified_at),
        formatDateTime(u.created_at) || formatDateTime(new Date().toISOString()),
        formatDateTime(u.updated_at) || formatDateTime(new Date().toISOString())
      ]
    );
  }
  console.log(`Synced ${users.length} users to MySQL.`);

  // 2. Sync Localities
  const localities = sqlite.prepare('SELECT * FROM localities').all();
  for (const loc of localities) {
    await mysqlConn.execute(
      `INSERT INTO localities (id, city_id, name, slug, pincode, latitude, longitude, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), pincode = VALUES(pincode)`,
      [loc.id, loc.city_id, loc.name, loc.slug, loc.pincode, loc.latitude, loc.longitude, loc.is_active || 1]
    );
  }
  console.log(`Synced ${localities.length} localities to MySQL.`);

  // 3. Sync Businesses
  const businesses = sqlite.prepare('SELECT * FROM businesses').all();
  for (const b of businesses) {
    await mysqlConn.execute(
      `INSERT INTO businesses (id, name, legal_name, slug, description, primary_phone, whatsapp_number, support_email, logo_url, cover_image_url, status, is_verified, verified_at, is_featured, average_rating, total_reviews, total_enquiries, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         slug = VALUES(slug),
         description = VALUES(description),
         primary_phone = VALUES(primary_phone),
         status = VALUES(status),
         average_rating = VALUES(average_rating),
         total_reviews = VALUES(total_reviews),
         total_enquiries = VALUES(total_enquiries),
         updated_at = VALUES(updated_at)`,
      [
        b.id, b.name, b.legal_name || b.name, b.slug, b.description, b.primary_phone,
        b.whatsapp_number, b.support_email, b.logo_url || null, b.cover_image_url || null,
        b.status || 'APPROVED', b.is_verified ? 1 : 0, formatDateTime(b.verified_at),
        b.is_featured ? 1 : 0, b.average_rating || 4.5, b.total_reviews || 0,
        b.total_enquiries || 0,
        formatDateTime(b.created_at) || formatDateTime(new Date().toISOString()),
        formatDateTime(b.updated_at) || formatDateTime(new Date().toISOString())
      ]
    );
  }
  console.log(`Synced ${businesses.length} businesses to MySQL.`);

  // 4. Sync Business Locations
  const locations = sqlite.prepare('SELECT * FROM business_locations').all();
  for (const l of locations) {
    await mysqlConn.execute(
      `INSERT INTO business_locations (id, business_id, city_id, locality_id, address_line1, landmark, pincode, latitude, longitude, is_primary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         address_line1 = VALUES(address_line1),
         locality_id = VALUES(locality_id),
         pincode = VALUES(pincode)`,
      [
        l.id, l.business_id, l.city_id, l.locality_id, l.address_line1,
        l.landmark || null, l.pincode, l.latitude, l.longitude, l.is_primary ? 1 : 0
      ]
    );
  }
  console.log(`Synced ${locations.length} business locations to MySQL.`);

  // 5. Sync Business Categories
  const categories = sqlite.prepare('SELECT * FROM business_categories').all();
  for (const c of categories) {
    await mysqlConn.execute(
      `INSERT INTO business_categories (id, business_id, category_id, is_primary)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE is_primary = VALUES(is_primary)`,
      [c.id, c.business_id, c.category_id, c.is_primary ? 1 : 0]
    );
  }
  console.log(`Synced ${categories.length} business categories to MySQL.`);

  // 6. Sync Business Hours
  const hours = sqlite.prepare('SELECT * FROM business_hours').all();
  for (const h of hours) {
    await mysqlConn.execute(
      `INSERT INTO business_hours (id, business_id, day_of_week, opens_at, closes_at, is_closed)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE opens_at = VALUES(opens_at), closes_at = VALUES(closes_at)`,
      [h.id, h.business_id, h.day_of_week, h.opens_at, h.closes_at, h.is_closed ? 1 : 0]
    );
  }
  console.log(`Synced ${hours.length} business hours to MySQL.`);

  // 7. Sync Enquiries
  const enquiries = sqlite.prepare('SELECT * FROM enquiries').all();
  for (const e of enquiries) {
    await mysqlConn.execute(
      `INSERT INTO enquiries (id, reference_no, business_id, customer_id, customer_name, customer_phone, message, status, priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = VALUES(updated_at)`,
      [
        e.id, e.reference_no, e.business_id, e.customer_id, e.customer_name,
        e.customer_phone, e.message, e.status, e.priority || 'NORMAL',
        formatDateTime(e.created_at) || formatDateTime(new Date().toISOString()),
        formatDateTime(e.updated_at) || formatDateTime(new Date().toISOString())
      ]
    );
  }
  console.log(`Synced ${enquiries.length} enquiries to MySQL.`);

  await mysqlConn.execute('SET FOREIGN_KEY_CHECKS = 1');
  await mysqlConn.end();
  console.log('--- ALL RECORDS SYNCED TO MYSQL HELLO_DB IN XAMPP SUCCESSFULLY ---');
}

syncToMySQL().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
