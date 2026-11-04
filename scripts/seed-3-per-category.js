const { DatabaseSync } = require('node:sqlite');
const mysql = require('mysql2/promise');
const path = require('node:path');

// 14 target categories with 3 rich curated business definitions for each
const CATEGORY_BUSINESSES = {
  "restaurants": [
    {
      name: "Chutneys Vegetarian & South Indian Delicacies",
      desc: "Iconic South Indian culinary institution famous for Babai Idli, Guntur Dosa, and 7 varieties of freshly ground chutneys in a hygienic family atmosphere.",
      citySlug: "hyderabad",
      localityName: "Banjara Hills",
      pincode: "500034",
      phone: "+91 98480 33111",
      coverImage: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80",
      rating: 4.8,
      reviews: 142
    },
    {
      name: "Bawarchi Royal Hyderabadi Dum Biryani",
      desc: "Authentic coal-fired Hyderabadi Dum Biryani, spicy Haleem, and signature Mirchi Ka Salan loved by generations of food connoisseurs across Telangana.",
      citySlug: "hyderabad",
      localityName: "RTC Cross Roads",
      pincode: "500020",
      phone: "+91 98480 33222",
      coverImage: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80",
      rating: 4.9,
      reviews: 280
    },
    {
      name: "Minerva Grand Blue Fox Multi-Cuisine Bar & Dining",
      desc: "Fine dining multi-cuisine restaurant serving traditional Andhra thalis, Continental sizzlers, and Tandoori specialties with premier banquet facilities.",
      citySlug: "vijayawada",
      localityName: "Benz Circle",
      pincode: "520010",
      phone: "+91 98480 33333",
      coverImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80",
      rating: 4.7,
      reviews: 95
    }
  ],
  "hotels": [
    {
      name: "Novotel Varun Hotel & Suites",
      desc: "Luxury 5-star business and leisure hotel featuring panoramic river views, rooftop infinity pool, 24/7 fitness club, and premium corporate event halls.",
      citySlug: "vijayawada",
      localityName: "Benz Circle",
      pincode: "520010",
      phone: "+91 98480 44111",
      coverImage: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80",
      rating: 4.9,
      reviews: 168
    },
    {
      name: "ITC Kohenur Luxury Business Resort",
      desc: "Premier 5-star luxury hotel in Hitec City offering lake views, award-winning specialty restaurants, sustainable architecture, and royal wellness spa.",
      citySlug: "hyderabad",
      localityName: "Hitec City",
      pincode: "500081",
      phone: "+91 98480 44222",
      coverImage: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&auto=format&fit=crop&q=80",
      rating: 4.9,
      reviews: 210
    },
    {
      name: "Taj Gateway Krishna Riverside Hotel",
      desc: "Upscale business hotel with contemporary guest rooms, banquet suites, complimentary airport transfers, and authentic coastal Andhra delicacies.",
      citySlug: "vijayawada",
      localityName: "MG Road",
      pincode: "520002",
      phone: "+91 98480 44333",
      coverImage: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&auto=format&fit=crop&q=80",
      rating: 4.8,
      reviews: 134
    }
  ],
  "beauty-spa": [
    {
      name: "Lotus Ayurvedic Spa & Bridal Studio",
      desc: "Holistic herbal rejuvenation, Swedish therapeutic massages, destination bridal makeovers, and organic salon packages certified by expert cosmetologists.",
      citySlug: "vijayawada",
      localityName: "Benz Circle",
      pincode: "520010",
      phone: "+91 98480 55111",
      coverImage: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80",
      rating: 4.8,
      reviews: 88
    },
    {
      name: "Naturals Signature Salon & Hair Aesthetics",
      desc: "Premium unisex salon offering keratin botox hair rituals, crystal manicure-pedicure, skin lightening therapies, and pre-wedding makeup packages.",
      citySlug: "hyderabad",
      localityName: "Madhapur",
      pincode: "500081",
      phone: "+91 98480 55222",
      coverImage: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80",
      rating: 4.7,
      reviews: 112
    },
    {
      name: "Aura Luxury Wellness & Thai Aromatherapy",
      desc: "Exclusive thermal sauna, authentic Balinese body scrub, couple massage suites, and deep relaxation treatments in a tranquil aroma-infused ambience.",
      citySlug: "hyderabad",
      localityName: "Jubilee Hills",
      pincode: "500033",
      phone: "+91 98480 55333",
      coverImage: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&auto=format&fit=crop&q=80",
      rating: 4.9,
      reviews: 94
    }
  ],
  "home-decor": [
    {
      name: "Urban Living Modular Kitchens & Furnishings",
      desc: "Custom factory-finished acrylic modular kitchens, ergonomic space-saving wardrobes, Italian marble dining tables, and full home 3D interior design.",
      citySlug: "vijayawada",
      localityName: "Labbipet",
      pincode: "520010",
      phone: "+91 98480 66111",
      coverImage: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&auto=format&fit=crop&q=80",
      rating: 4.8,
      reviews: 76
    },
    {
      name: "DecoCraft Wooden Furnishings & Wall Accents",
      desc: "Solid teakwood handcrafted sofas, designer accent chairs, imported lighting fixtures, motorized blinds, and customized wallpaper installations.",
      citySlug: "hyderabad",
      localityName: "Gachibowli",
      pincode: "500032",
      phone: "+91 98480 66222",
      coverImage: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80",
      rating: 4.9,
      reviews: 105
    },
    {
      name: "Elite Glass & Aluminum Architectural Interiors",
      desc: "Frameless toughened shower cubicles, acoustic soundproof UPVC windows, sliding glass partitions, and designer mirror work for modern residences.",
      citySlug: "hyderabad",
      localityName: "Kukatpally",
      pincode: "500072",
      phone: "+91 98480 66333",
      coverImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80",
      rating: 4.7,
      reviews: 64
    }
  ],
  "ask-astro": [
    {
      name: "Sri Gayatri Vedic Jyothishya & Vastu Kendra",
      desc: "Accurate planetary horoscope analysis, gemological gemstone guidance, career matchmaking kundali, and commercial Vastu corrections by hereditary scholars.",
      citySlug: "guntur",
      localityName: "Arundelpet",
      pincode: "522002",
      phone: "+91 98480 77111",
      coverImage: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=80",
      rating: 4.9,
      reviews: 120
    },
    {
      name: "Nakshatra Astro Divine Solutions & Numerology",
      desc: "Scientific birth chart readings, corporate business name numerology, dosha nivarana pujas, and astrological gemstone certification with online video consults.",
      citySlug: "hyderabad",
      localityName: "Ameerpet",
      pincode: "500016",
      phone: "+91 98480 77222",
      coverImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
      rating: 4.8,
      reviews: 84
    },
    {
      name: "Maharshi Vastu & Prashna Shastra Ashram",
      desc: "Ancient Prashna astrology, factory land energy auditing, residential directional vastu without demolition, and auspicious muhurtham determination.",
      citySlug: "vijayawada",
      localityName: "Governorpet",
      pincode: "520002",
      phone: "+91 98480 77333",
      coverImage: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80",
      rating: 4.9,
      reviews: 92
    }
  ],
  "wedding-planning": [
    {
      name: "Royal Mandapam Grand Weddings & Events",
      desc: "Turnkey luxury destination wedding management, royal theme stage decorations, LED dance floors, live acoustic bands, and custom bridal entries.",
      citySlug: "hyderabad",
      localityName: "Banjara Hills",
      pincode: "500034",
      phone: "+91 98480 88111",
      coverImage: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80",
      rating: 4.9,
      reviews: 110
    },
    {
      name: "Kalyanam Traditional Andhra Wedding Planners",
      desc: "Specialists in Vedic rituals, authentic south Indian brass decor, flower shamianas, shehnai artists, and 5-tier traditional wedding catering.",
      citySlug: "vijayawada",
      localityName: "Moghalrajpuram",
      pincode: "520010",
      phone: "+91 98480 88222",
      coverImage: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&auto=format&fit=crop&q=80",
      rating: 4.8,
      reviews: 78
    },
    {
      name: "Bliss Cinematic Wedding Photography & Films",
      desc: "Candid bridal photography, 4K aerial cinematic drone videos, pre-wedding destination shoots, and personalized handcrafted storybook albums.",
      citySlug: "hyderabad",
      localityName: "Jubilee Hills",
      pincode: "500033",
      phone: "+91 98480 88333",
      coverImage: "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800&auto=format&fit=crop&q=80",
      rating: 4.9,
      reviews: 135
    }
  ],
  "education": [
    {
      name: "Sri Chaitanya Techno Junior College & IIT Academy",
      desc: "Pioneering STEM education, JEE Advanced top national rank preparation, NEET medical coaching, and modern air-conditioned digital smart classrooms.",
      citySlug: "vijayawada",
      localityName: "Benz Circle",
      pincode: "520010",
      phone: "+91 98480 99111",
      coverImage: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80",
      rating: 4.8,
      reviews: 165
    },
    {
      name: "Oakridge International STEM Day School",
      desc: "IB and CBSE curriculum, robotics innovation labs, Olympic-size sports arenas, foreign language training, and global university placement mentorship.",
      citySlug: "hyderabad",
      localityName: "Gachibowli",
      pincode: "500032",
      phone: "+91 98480 99222",
      coverImage: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&auto=format&fit=crop&q=80",
      rating: 4.9,
      reviews: 140
    },
    {
      name: "Time Institute CAT & Bank Exam Training Hub",
      desc: "India's premier MBA entrance coaching center, CAT percentile strategy, campus recruitment training, and national level all-India mock tests.",
      citySlug: "hyderabad",
      localityName: "Madhapur",
      pincode: "500081",
      phone: "+91 98480 99333",
      coverImage: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80",
      rating: 4.7,
      reviews: 96
    }
  ],
  "rent-hire": [
    {
      name: "Srinivasa Intercity Packers & Logistics",
      desc: "Household relocation, multi-layer waterproof furniture packing, enclosed GPS car carrier transit, and corporate office shifting with zero transit damage.",
      citySlug: "vijayawada",
      localityName: "Governorpet",
      pincode: "520002",
      phone: "+91 98480 12111",
      coverImage: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80",
      rating: 4.8,
      reviews: 115
    },
    {
      name: "DriveSafe Self-Drive Car & SUV Rentals",
      desc: "Fleet of sanitised automatic SUVs, Thar 4x4, luxury sedans, unlimited kilometer options, zero security deposit, and 24/7 roadside assistance.",
      citySlug: "hyderabad",
      localityName: "Hitec City",
      pincode: "500081",
      phone: "+91 98480 12222",
      coverImage: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80",
      rating: 4.9,
      reviews: 142
    },
    {
      name: "MegaPower Silent DG Generator & Construction Rentals",
      desc: "Industrial diesel generator sets from 15kVA to 500kVA for wedding events, IT data centers, hospital backups, and hydraulic crane hiring.",
      citySlug: "hyderabad",
      localityName: "Kukatpally",
      pincode: "500072",
      phone: "+91 98480 12333",
      coverImage: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80",
      rating: 4.7,
      reviews: 68
    }
  ],
  "hospitals": [
    {
      name: "Kamineni Multispeciality & Cardiac Super Hospital",
      desc: "24/7 Level-1 trauma care, advanced cath lab, robotic joint replacements, liver transplant program, and dedicated pediatric ICU with NABH accreditation.",
      citySlug: "vijayawada",
      localityName: "Kanuru",
      pincode: "520007",
      phone: "+91 98480 13111",
      coverImage: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&auto=format&fit=crop&q=80",
      rating: 4.9,
      reviews: 180
    },
    {
      name: "AIG Institute of Gastroenterology & Liver Sciences",
      desc: "Global center of excellence in digestive diseases, laparoscopic robotic oncology, modern endoscopy suites, and comprehensive health checkup packages.",
      citySlug: "hyderabad",
      localityName: "Gachibowli",
      pincode: "500032",
      phone: "+91 98480 13222",
      coverImage: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80",
      rating: 4.9,
      reviews: 240
    },
    {
      name: "Rainbow Children's Hospital & BirthRight Centre",
      desc: "India's premier perinatal healthcare center, advanced NICU, fetal medicine, pediatric cardiology, and painless delivery maternity suites.",
      citySlug: "hyderabad",
      localityName: "Banjara Hills",
      pincode: "500034",
      phone: "+91 98480 13333",
      coverImage: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80",
      rating: 4.8,
      reviews: 155
    }
  ],
  "contractors": [
    {
      name: "BuildTech Structural Civil Engineers & Builders",
      desc: "Turnkey residential villa construction, commercial RCC building framework, municipal layout plan sanctions, and seismic resistant structural engineering.",
      citySlug: "vijayawada",
      localityName: "Labbipet",
      pincode: "520010",
      phone: "+91 98480 14111",
      coverImage: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80",
      rating: 4.8,
      reviews: 72
    },
    {
      name: "ProPlumb & Electrics Commercial Engineering",
      desc: "Licensed electrical grade-A contracting, automated fire suppression sprinkler installation, sewage water treatment plants, and smart lighting wiring.",
      citySlug: "hyderabad",
      localityName: "Madhapur",
      pincode: "500081",
      phone: "+91 98480 14222",
      coverImage: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80",
      rating: 4.7,
      reviews: 65
    },
    {
      name: "WaterSeal Polyurethane Roof Waterproofing",
      desc: "10-year guaranteed crystalline roof slab waterproofing, expansion joint caulking, basement damp proofing, and heat reflective cooling roof paints.",
      citySlug: "hyderabad",
      localityName: "Kukatpally",
      pincode: "500072",
      phone: "+91 98480 14333",
      coverImage: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80",
      rating: 4.8,
      reviews: 82
    }
  ],
  "pet-shops": [
    {
      name: "Paws & Claws Complete Pet Clinic & Spa",
      desc: "Vaccination and wellness vet clinic, climate-controlled boarding suites, breed-specific grooming hydrobaths, and Royal Canin nutritional food hub.",
      citySlug: "hyderabad",
      localityName: "Banjara Hills",
      pincode: "500034",
      phone: "+91 98480 15111",
      coverImage: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=800&auto=format&fit=crop&q=80",
      rating: 4.9,
      reviews: 118
    },
    {
      name: "Krishna Aquarium World & Exotic Pet Supplies",
      desc: "Custom imported planted fish tanks, marine reef aquariums, pet accessories, hypoallergenic dog biscuits, and orthopedic sleeping beds.",
      citySlug: "vijayawada",
      localityName: "Governorpet",
      pincode: "520002",
      phone: "+91 98480 15222",
      coverImage: "https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=800&auto=format&fit=crop&q=80",
      rating: 4.7,
      reviews: 74
    },
    {
      name: "Happy Tails Certified Dog Training & Puppy Nursery",
      desc: "Positive reinforcement obedience training, agility obstacle courses, socialization day camps, and purebred KCI certified pedigree pet guidance.",
      citySlug: "hyderabad",
      localityName: "Gachibowli",
      pincode: "500032",
      phone: "+91 98480 15333",
      coverImage: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&auto=format&fit=crop&q=80",
      rating: 4.8,
      reviews: 90
    }
  ],
  "pg-hostels": [
    {
      name: "Zolo Stays Luxury Executive Co-Living PG",
      desc: "Fully furnished air-conditioned single and twin sharing suites, high-speed 300 Mbps Wi-Fi, daily housekeeping, 3-time buffet meals, and biometric security.",
      citySlug: "hyderabad",
      localityName: "Madhapur",
      pincode: "500081",
      phone: "+91 98480 16111",
      coverImage: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&auto=format&fit=crop&q=80",
      rating: 4.8,
      reviews: 125
    },
    {
      name: "Sri Sai Ram Women's Safe Luxury Hostel",
      desc: "CCTV monitored safe girls hostel, attached hygienic bathrooms, RO mineral water, North and South Indian fresh mess, and 100% power backup.",
      citySlug: "vijayawada",
      localityName: "Benz Circle",
      pincode: "520010",
      phone: "+91 98480 16222",
      coverImage: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&auto=format&fit=crop&q=80",
      rating: 4.7,
      reviews: 86
    },
    {
      name: "Hitec Urban Pods Techie Co-Living Spaces",
      desc: "Modern Scandinavian style co-living spaces with gaming lounges, co-working workstations, gym, terrace cafe, and laundry facilities next to IT corridor.",
      citySlug: "hyderabad",
      localityName: "Hitec City",
      pincode: "500081",
      phone: "+91 98480 16333",
      coverImage: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=80",
      rating: 4.9,
      reviews: 110
    }
  ],
  "estate-agent": [
    {
      name: "Prime Estates & Luxury Villa Advisory",
      desc: "RERA-registered real estate brokerage, gated community luxury villas, commercial IT office spaces, and agricultural farm land investments in Amaravati & Hyd.",
      citySlug: "hyderabad",
      localityName: "Jubilee Hills",
      pincode: "500033",
      phone: "+91 98480 17111",
      coverImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80",
      rating: 4.9,
      reviews: 130
    },
    {
      name: "Capital City Realtors & Property Managers",
      desc: "Verified residential flats for rent and sale, clear title DTCP approved open plots, property valuation, legal documentation, and bank loan clearance.",
      citySlug: "vijayawada",
      localityName: "MG Road",
      pincode: "520002",
      phone: "+91 98480 17222",
      coverImage: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80",
      rating: 4.8,
      reviews: 98
    },
    {
      name: "Nexus Commercial Office Space Specialists",
      desc: "Plug-and-play furnished tech park floors, high-street retail showrooms, warehouse logistics leases, and institutional real estate tenant representation.",
      citySlug: "hyderabad",
      localityName: "Gachibowli",
      pincode: "500032",
      phone: "+91 98480 17333",
      coverImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80",
      rating: 4.8,
      reviews: 75
    }
  ],
  "dentists": [
    {
      name: "Siri Multispeciality Dental Hospital & Implant Center",
      desc: "Painless root canal treatment, 3D intraoral dental scanners, titanium dental implants, clear invisible teeth aligners, and cosmetic smile designing.",
      citySlug: "vijayawada",
      localityName: "Benz Circle",
      pincode: "520010",
      phone: "+91 98480 18111",
      coverImage: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=80",
      rating: 4.9,
      reviews: 145
    },
    {
      name: "Apollo Dental Clinic & Laser Aesthetics",
      desc: "Laser gum surgery, pediatric child dentistry, wisdom tooth painless extractions, zirconia crowns, and European CE certified sterilisation protocols.",
      citySlug: "hyderabad",
      localityName: "Banjara Hills",
      pincode: "500034",
      phone: "+91 98480 18222",
      coverImage: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&auto=format&fit=crop&q=80",
      rating: 4.9,
      reviews: 160
    },
    {
      name: "FMS Super Dental Hospital & Maxillofacial Care",
      desc: "NABH-accredited dental hospital, full mouth rehabilitation, CAD-CAM digital crowns in 1 hour, teeth whitening, and jaw fracture trauma surgery.",
      citySlug: "hyderabad",
      localityName: "Madhapur",
      pincode: "500081",
      phone: "+91 98480 18333",
      coverImage: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80",
      rating: 4.8,
      reviews: 122
    }
  ]
};

function formatDateTime(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

async function seedThreePerCategory() {
  const dbPath = path.resolve(__dirname, '../data/hello_dev.db');
  const sqlite = new DatabaseSync(dbPath);

  const mysqlConn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    database: 'hello_db'
  });

  console.log('Connected to SQLite and XAMPP MySQL.');
  sqlite.exec('PRAGMA foreign_keys = OFF;');
  await mysqlConn.execute('SET FOREIGN_KEY_CHECKS = 0');

  let totalAdded = 0;

  for (const [catSlug, listings] of Object.entries(CATEGORY_BUSINESSES)) {
    // 1. Resolve Category ID
    let catRow = sqlite.prepare("SELECT id, name, slug FROM categories WHERE slug = ? OR id = ?").get(catSlug, `cat-${catSlug}`);
    if (!catRow) {
      const catId = `cat-${catSlug}`;
      const name = catSlug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
      sqlite.prepare("INSERT OR REPLACE INTO categories (id, name, slug, sort_order) VALUES (?, ?, ?, 10)").run(catId, name, catSlug);
      await mysqlConn.execute(
        "INSERT INTO categories (id, name, slug, sort_order) VALUES (?, ?, ?, 10) ON DUPLICATE KEY UPDATE name=VALUES(name)",
        [catId, name, catSlug]
      );
      catRow = { id: catId, name, slug: catSlug };
    }

    console.log(`\nProcessing category: [${catRow.name}] (${catSlug})...`);

    for (let i = 0; i < listings.length; i++) {
      const item = listings[i];
      const baseSlug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const uniqueSuffix = (i + 1) * 11;
      const slug = `${baseSlug}-${uniqueSuffix}`;

      // Check if business with slug or name exists
      let existingBiz = sqlite.prepare("SELECT id FROM businesses WHERE slug = ? OR name = ?").get(slug, item.name);
      
      const bizId = existingBiz ? existingBiz.id : `biz_${catSlug}_${i + 1}`;
      const nowIso = new Date().toISOString();
      const nowMysql = formatDateTime(nowIso);

      // 1. Insert or update business in SQLite
      if (!existingBiz) {
        sqlite.prepare(`
          INSERT INTO businesses (
            id, name, legal_name, slug, description, primary_phone, whatsapp_number, support_email,
            cover_image_url, status, is_verified, verified_at, is_featured, average_rating,
            total_reviews, total_enquiries, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', 1, ?, 1, ?, ?, 0, ?, ?)
        `).run(
          bizId, item.name, item.name, slug, item.desc, item.phone, item.phone,
          `contact@${baseSlug.slice(0, 15)}.in`, item.coverImage, nowIso, item.rating, item.reviews, nowIso, nowIso
        );
        totalAdded++;
      }

      // 2. Insert or update in MySQL hello_db
      await mysqlConn.execute(`
        INSERT INTO businesses (
          id, name, legal_name, slug, description, primary_phone, whatsapp_number, support_email,
          cover_image_url, status, is_verified, verified_at, is_featured, average_rating,
          total_reviews, total_enquiries, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', 1, ?, 1, ?, ?, 0, ?, ?)
        ON DUPLICATE KEY UPDATE
          cover_image_url = VALUES(cover_image_url),
          description = VALUES(description),
          average_rating = VALUES(average_rating),
          total_reviews = VALUES(total_reviews),
          status = 'APPROVED',
          is_verified = 1
      `, [
        bizId, item.name, item.name, slug, item.desc, item.phone, item.phone,
        `contact@${baseSlug.slice(0, 15)}.in`, item.coverImage, nowMysql, item.rating, item.reviews, nowMysql, nowMysql
      ]);

      // 3. Resolve City
      let cityRow = sqlite.prepare("SELECT id, name, slug, latitude, longitude FROM cities WHERE slug = ?").get(item.citySlug);
      if (!cityRow) {
        cityRow = { id: 'city-hyd', name: 'Hyderabad', slug: 'hyderabad', latitude: 17.4435, longitude: 78.3772 };
      }

      // 4. Resolve Locality
      const locSlug = item.localityName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      let locRow = sqlite.prepare("SELECT id FROM localities WHERE city_id = ? AND (LOWER(name) = LOWER(?) OR slug = ?)").get(cityRow.id, item.localityName, locSlug);
      const locId = locRow ? locRow.id : `loc_${locSlug}`;
      if (!locRow) {
        sqlite.prepare("INSERT OR REPLACE INTO localities (id, city_id, name, slug, pincode, latitude, longitude, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)").run(
          locId, cityRow.id, item.localityName, locSlug, item.pincode, cityRow.latitude + 0.01, cityRow.longitude + 0.01
        );
        await mysqlConn.execute(
          "INSERT INTO localities (id, city_id, name, slug, pincode, latitude, longitude, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE name=VALUES(name)",
          [locId, cityRow.id, item.localityName, locSlug, item.pincode, cityRow.latitude + 0.01, cityRow.longitude + 0.01]
        );
      }

      // 5. Business Location
      const locMappingId = `bloc_${bizId}`;
      sqlite.prepare(`
        INSERT OR REPLACE INTO business_locations (id, business_id, city_id, locality_id, address_line1, pincode, latitude, longitude, is_primary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        locMappingId, bizId, cityRow.id, locId, `${item.localityName}, ${cityRow.name}`, item.pincode, cityRow.latitude + 0.01, cityRow.longitude + 0.01
      );

      await mysqlConn.execute(`
        INSERT INTO business_locations (id, business_id, city_id, locality_id, address_line1, pincode, latitude, longitude, is_primary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE address_line1 = VALUES(address_line1)
      `, [
        locMappingId, bizId, cityRow.id, locId, `${item.localityName}, ${cityRow.name}`, item.pincode, cityRow.latitude + 0.01, cityRow.longitude + 0.01
      ]);

      // 6. Category Mapping
      const catMappingId = `bcat_${bizId}_${catRow.id}`;
      sqlite.prepare(`
        INSERT OR REPLACE INTO business_categories (id, business_id, category_id, is_primary)
        VALUES (?, ?, ?, 1)
      `).run(catMappingId, bizId, catRow.id);

      await mysqlConn.execute(`
        INSERT INTO business_categories (id, business_id, category_id, is_primary)
        VALUES (?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE is_primary = 1
      `, [catMappingId, bizId, catRow.id]);

      // 7. Business Hours (Mon-Sun open 09:00 - 21:00)
      for (let day = 0; day <= 6; day++) {
        const hourId = `bhour_${bizId}_${day}`;
        sqlite.prepare(`
          INSERT OR REPLACE INTO business_hours (id, business_id, day_of_week, opens_at, closes_at, is_closed)
          VALUES (?, ?, ?, '09:00', '21:00', 0)
        `).run(hourId, bizId, day);

        await mysqlConn.execute(`
          INSERT INTO business_hours (id, business_id, day_of_week, opens_at, closes_at, is_closed)
          VALUES (?, ?, ?, '09:00', '21:00', 0)
          ON DUPLICATE KEY UPDATE opens_at='09:00', closes_at='21:00'
        `, [hourId, bizId, day]);
      }

      console.log(`  ✓ ${item.name} (${item.localityName}, ${cityRow.name}) -> Saved in DB!`);
    }
  }

  await mysqlConn.execute('SET FOREIGN_KEY_CHECKS = 1');
  await mysqlConn.end();

  console.log(`\n======================================================`);
  console.log(`SUCCESS: All 14 categories now have at least 3 businesses!`);
  console.log(`Total new businesses added: ${totalAdded}`);
  console.log(`All records are persisted in MySQL (hello_db) & SQLite.`);
  console.log(`======================================================`);
}

seedThreePerCategory().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
