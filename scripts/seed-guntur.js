const { DatabaseSync } = require('node:sqlite');
const mysql = require('mysql2/promise');
const path = require('node:path');

const GUNTUR_BUSINESSES = {
  "restaurants": [
    { name: "Subani Dum Biryani & Kebabs", desc: "Authentic Guntur spicy dum biryani, mutton fry and chicken kebabs prepared with traditional Andhra spices.", locality: "Arundelpet", pincode: "522002", phone: "+91 98480 91001", rating: 4.8, reviews: 180 },
    { name: "Sri Saravana Grand Vegetarian", desc: "Pure vegetarian family dining specializing in Guntur Ghee Karam Dosa, Pesarattu and traditional South Indian thalis.", locality: "Brodipet", pincode: "522002", phone: "+91 98480 91002", rating: 4.7, reviews: 135 }
  ],
  "hotels": [
    { name: "The Guntur Grand Business Hotel", desc: "Premier 4-star corporate hotel with central air conditioning, multi-cuisine dining, conference halls and valet parking.", locality: "Brodipet", pincode: "522002", phone: "+91 98480 91003", rating: 4.8, reviews: 110 }
  ],
  "beauty-spa": [
    { name: "Kaya Skin Clinic & Laser Studio", desc: "Advanced dermatology, laser hair reduction, bridal makeovers and anti-aging skin therapy.", locality: "Arundelpet", pincode: "522002", phone: "+91 98480 91004", rating: 4.8, reviews: 85 }
  ],
  "home-decor": [
    { name: "Sree Balaji Modular Furnishings", desc: "Custom kitchen cabinets, wardrobe designs, PVC wall panels and premium Italian marble fittings.", locality: "Brodipet", pincode: "522002", phone: "+91 98480 91005", rating: 4.7, reviews: 62 }
  ],
  "wedding-planning": [
    { name: "Venkateswara Kalyana Mandapam & Events", desc: "Spacious central AC wedding convention hall accommodating up to 1500 guests with dining and decor services.", locality: "Arundelpet", pincode: "522002", phone: "+91 98480 91006", rating: 4.9, reviews: 140 }
  ],
  "education": [
    { name: "Vignana Bharathi IIT-JEE & Medical Academy", desc: "Comprehensive coaching for JEE Advanced, NEET and EAMCET with specialized faculty and hostel facilities.", locality: "Brodipet", pincode: "522002", phone: "+91 98480 91007", rating: 4.8, reviews: 210 }
  ],
  "hospitals": [
    { name: "Ramesh Cardiac & Multispeciality Hospital", desc: "NABH accredited super-speciality hospital offering 24/7 emergency trauma, cardiology, neurology and ICU services.", locality: "Arundelpet", pincode: "522002", phone: "+91 98480 91008", rating: 4.9, reviews: 290 }
  ],
  "contractors": [
    { name: "Amaravathi Civil Builders & Waterproofing", desc: "Residential construction, architectural layout design, waterproofing and structural civil engineering.", locality: "Brodipet", pincode: "522002", phone: "+91 98480 91009", rating: 4.7, reviews: 75 }
  ],
  "pet-shops": [
    { name: "Royal Pets Clinic & Grooming Parlour", desc: "Veterinary consultation, vaccinations, pet food, imported accessories and puppy care grooming.", locality: "Arundelpet", pincode: "522002", phone: "+91 98480 91010", rating: 4.8, reviews: 95 }
  ],
  "pg-hostels": [
    { name: "Sri Sai Residency Executive Gents PG", desc: "Furnished single and sharing AC rooms with high-speed WiFi, 3 meals daily, laundry and CCTV security.", locality: "Brodipet", pincode: "522002", phone: "+91 98480 91011", rating: 4.6, reviews: 68 }
  ],
  "estate-agent": [
    { name: "Guntur Urban Realty & Commercial Leasing", desc: "Verified open plots, gated communities, commercial retail shop spaces and rental management.", locality: "Arundelpet", pincode: "522002", phone: "+91 98480 91012", rating: 4.8, reviews: 120 }
  ],
  "dentists": [
    { name: "SmileCare Multispeciality Dental & Implants", desc: "Painless root canal treatment, invisible aligners, dental implants and cosmetic teeth whitening.", locality: "Brodipet", pincode: "522002", phone: "+91 98480 91013", rating: 4.9, reviews: 160 }
  ]
};

async function seedGuntur() {
  const sqliteDbPath = path.resolve(__dirname, '../data/hello_dev.db');
  const sqlite = new DatabaseSync(sqliteDbPath);

  let mysqlConn = null;
  try {
    mysqlConn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      database: 'hello_db'
    });
    console.log('Connected to MySQL and SQLite for Guntur seeding.');
  } catch(e) {
    console.warn('MySQL connection failed, seeding SQLite only:', e.message);
  }

  // Ensure Guntur city exists in both
  const gunturCityId = 'city-gun';
  try {
    sqlite.prepare(`
      INSERT OR IGNORE INTO cities (id, state_id, name, slug, tier, latitude, longitude, is_active)
      VALUES (?, 'ap', 'Guntur', 'guntur', 'TIER_2', 16.3067, 80.4365, 1)
    `).run(gunturCityId);

    if (mysqlConn) {
      await mysqlConn.execute(`
        INSERT IGNORE INTO cities (id, state_id, name, slug, tier, latitude, longitude, is_active)
        VALUES (?, 'ap', 'Guntur', 'guntur', 'TIER_2', 16.3067, 80.4365, 1)
      `, [gunturCityId]);
    }
  } catch(e) {}

  for (const [catSlug, listings] of Object.entries(GUNTUR_BUSINESSES)) {
    // find category id in sqlite
    const catRow = sqlite.prepare(`
      SELECT id, name, slug FROM categories 
      WHERE slug = ? OR slug LIKE ? OR id = ?
      LIMIT 1
    `).get(catSlug, `%${catSlug}%`, `cat-${catSlug}`);

    if (!catRow) continue;

    for (const b of listings) {
      const slug = b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existing = sqlite.prepare('SELECT id FROM businesses WHERE slug = ?').get(slug);
      if (existing) continue;

      const bizId = `biz_gun_${Date.now()}_${Math.floor(Math.random() * 900)}`;
      const now = new Date().toISOString();

      // Insert into SQLite
      sqlite.prepare(`
        INSERT INTO businesses (
          id, name, legal_name, slug, description, primary_phone, whatsapp_number,
          cover_image_url, logo_url, status, is_verified, verified_at, is_featured,
          average_rating, total_reviews, total_enquiries, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', 1, ?, 1, ?, ?, 0, ?, ?)
      `).run(
        bizId, b.name, b.name, slug, b.desc, b.phone, b.phone,
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
        now, b.rating, b.reviews, now, now
      );

      // Location
      sqlite.prepare(`
        INSERT INTO business_locations (
          id, business_id, city_id, address_line1, pincode, latitude, longitude, is_primary
        ) VALUES (?, ?, ?, ?, ?, 16.3067, 80.4365, 1)
      `).run(`bloc_${bizId}`, bizId, gunturCityId, `${b.locality}, Guntur`, b.pincode);

      // Category
      sqlite.prepare(`
        INSERT INTO business_categories (id, business_id, category_id, is_primary)
        VALUES (?, ?, ?, 1)
      `).run(`bcat_${bizId}`, bizId, catRow.id);

      // MySQL mirror
      if (mysqlConn) {
        try {
          await mysqlConn.execute(`
            INSERT IGNORE INTO businesses (
              id, name, legal_name, slug, description, primary_phone, whatsapp_number,
              cover_image_url, logo_url, status, is_verified, verified_at, is_featured,
              average_rating, total_reviews, total_enquiries, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', 1, ?, 1, ?, ?, 0, ?, ?)
          `, [
            bizId, b.name, b.name, slug, b.desc, b.phone, b.phone,
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
            now, b.rating, b.reviews, now, now
          ]);

          await mysqlConn.execute(`
            INSERT IGNORE INTO business_locations (
              id, business_id, city_id, address_line1, pincode, latitude, longitude, is_primary
            ) VALUES (?, ?, ?, ?, ?, 16.3067, 80.4365, 1)
          `, [`bloc_${bizId}`, bizId, gunturCityId, `${b.locality}, Guntur`, b.pincode]);

          await mysqlConn.execute(`
            INSERT IGNORE INTO business_categories (id, business_id, category_id, is_primary)
            VALUES (?, ?, ?, 1)
          `, [`bcat_${bizId}`, bizId, catRow.id]);
        } catch(e) {}
      }

      console.log(`  ✓ ${b.name} (${b.locality}, Guntur) -> Seeded!`);
    }
  }

  if (mysqlConn) await mysqlConn.end();
  console.log('Finished seeding Guntur businesses!');
}

seedGuntur();
