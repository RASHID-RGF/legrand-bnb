// ============================================================
// LeGrand — Seed data
// 4 flagship stays (KIBOKO, SOKWE, DIGIDIGI, MAMBA) — all in
// Siaya Town. DIGIDIGI, MAMBA and KIBOKO sit near Siaya Hotel,
// while SOKWE is located near Siaya Prisons.
// Seeded automatically on first run.
// ============================================================
const bcrypt = require('bcryptjs');

const img = (id, w = 1600) =>
  `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`;

const propertyImages = {
  cottage: [
    'photo-1600596542815-ffad4c1539a9',
    'photo-1512917774080-9991f1c4c750',
    'photo-1580587771525-78b9dba3b914',
  ],
  villa: [
    'photo-1613490493576-7fde63acd811',
    'photo-1600585154340-be6161a56a0c',
    'photo-1600566753190-17f0baa2a6c3',
  ],
  lodge: [
    'photo-1564013799919-ab600027ffc6',
    'photo-1510798831971-661eb04b3739',
    'photo-1540541338287-41700207dee6',
  ],
  bungalow: [
    'photo-1568605114967-8130f3a36994',
    'photo-1560448204-e02f11c3d0e2',
    'photo-1554995207-c18c203602cb',
  ],
};

const amenities = {
  town: ['WiFi', 'Free Parking', 'Kitchen', 'Hot Water', 'Smart TV'],
  luxury: ['WiFi', 'Free Parking', 'Air Conditioning', 'Pool', 'Housekeeping', 'Smart TV', 'Hot Water'],
  family: ['WiFi', 'Free Parking', 'Kitchen', 'Children Friendly', 'Hot Water'],
};

const props = [
  {
    title: 'KIBOKO',
    propertyType: 'Cottage',
    category: 'Family',
    description:
      'KIBOKO is a warm, self-contained cottage tucked into the heart of Siaya Town, only minutes from Siaya Hotel and a short walk from the county offices, banks, and the lively Siaya market. The stay offers a private compound, a shaded veranda for sundowners, and a fully equipped kitchen that makes longer stays feel easy and comfortable. Whether you are visiting for business, a weekend escape, or a quiet stopover, KIBOKO gives you privacy, convenience, and a true home-away-from-home feel.',
    pricePerNight: 1500,
    location: 'Siaya Town',
    subCounty: 'Siaya Town',
    county: 'Siaya',
    bedrooms: 2,
    bathrooms: 1,
    guests: 2,
    phone: '+254 723 865 139',
    phone2: '+254 725 317 246',
    whatsapp: '254723865139',
    whatsapp2: '254725317246',
    email: 'stay@kiboko.co.ke',
    instagram: 'https://instagram.com/legrandstays',
    tiktok: 'https://www.tiktok.com/@legrandstays',
    facebook: 'https://facebook.com/legrandstays',
    images: propertyImages.cottage,
    amenities: [...amenities.town, 'Balcony', 'Security', 'Self Check-in'],
    checkIn: 'Based on client time',
    checkOut: '11:00 AM',
    houseRules: [
      'Check-in time based on client request',
      'Check-out by 11:00 AM',
      'Sleeps 2 guests — for more, consult the owner',
      'No smoking indoors',
      'No loud parties or events',
      'Pets welcome on request',
    ],
    highlights: [
      '2-min walk to Siaya Hotel',
      'Gated private compound',
      'Fully equipped kitchen',
      'Shaded veranda for sundowners',
    ],
    featured: true,
    lat: 0.0562,
    lng: 34.3018,
    rating: 4.9,
    reviews: 128,
  },
  {
    title: 'SOKWE',
    propertyType: 'Villa',
    category: 'Luxury',
    description:
      'SOKWE is a refined villa experience near Siaya Prisons, designed for guests who want spacious comfort and polished hospitality in one place. The home combines contemporary architecture with warm Kenyan hospitality — en-suite bedrooms, a gourmet kitchen, manicured gardens, and a private pool that make it ideal for family celebrations, executive retreats, or simply unwinding in style. Located just minutes from Siaya Town centre, SOKWE lets you enjoy privacy without sacrificing access to restaurants, business districts, and local landmarks.',
    pricePerNight: 2000,
    location: 'Siaya Town',
    subCounty: 'Siaya Town',
    county: 'Siaya',
    bedrooms: 5,
    bathrooms: 4,
    guests: 2,
    phone: '+254 725 317 246',
    phone2: '+254 723 865 139',
    whatsapp: '254725317246',
    whatsapp2: '254723865139',
    email: 'stay@sokwe.co.ke',
    instagram: 'https://instagram.com/legrandstays',
    tiktok: 'https://www.tiktok.com/@legrandstays',
    facebook: 'https://facebook.com/legrandstays',
    images: propertyImages.villa,
    amenities: [...amenities.luxury, 'Balcony', 'Security'],
    checkIn: 'Based on client time',
    checkOut: '11:00 AM',
    houseRules: [
      'Check-in time based on client request',
      'Check-out by 11:00 AM',
      'Sleeps 2 guests — for more, consult the owner',
      'No smoking indoors',
      'Quiet hours from 10 PM',
      'Pool rules apply',
    ],
    highlights: [
      'Private swimming pool',
      'En-suite bedrooms',
      'Gourmet kitchen',
      'Minutes from Siaya Town centre',
    ],
    featured: true,
    lat: 0.0608,
    lng: 34.2885,
    rating: 4.8,
    reviews: 64,
  },
  {
    title: 'DIGIDIGI',
    propertyType: 'Lodge',
    category: 'Family',
    description:
      'DIGIDIGI is built for connection, laughter, and memorable stays in the middle of Siaya Town. With generous green lawns, a treehouse kids will love, bonfire evenings under the stars, and a kitchen fully stocked for home-cooked meals, this lodge is ideal for family get-togethers, birthdays, and slow weekends away. It is close to Siaya Hotel and easy to reach from the market and county landmarks, making it a practical base for both adventure and relaxation.',
    pricePerNight: 1800,
    location: 'Siaya Town',
    subCounty: 'Siaya Town',
    county: 'Siaya',
    bedrooms: 4,
    bathrooms: 3,
    guests: 2,
    phone: '+254 723 865 139',
    phone2: '+254 725 317 246',
    whatsapp: '254723865139',
    whatsapp2: '254725317246',
    email: 'stay@digidigi.co.ke',
    instagram: 'https://instagram.com/legrandstays',
    tiktok: 'https://www.tiktok.com/@legrandstays',
    facebook: 'https://facebook.com/legrandstays',
    images: propertyImages.lodge,
    amenities: [...amenities.family, 'Smart TV', 'Security', 'Fireplace'],
    checkIn: 'Based on client time',
    checkOut: '11:00 AM',
    houseRules: [
      'Check-in time based on client request',
      'Check-out by 11:00 AM',
      'Sleeps 2 guests — for more, consult the owner',
      'No smoking indoors',
      'Children to be supervised',
      'Bonfire nights by arrangement',
    ],
    highlights: [
      "Green lawns & kids' treehouse",
      'Bonfire evenings under the stars',
      'Fully stocked kitchen',
      'Ideal for family get-togethers',
    ],
    featured: true,
    lat: 0.0565,
    lng: 34.3022,
    rating: 4.7,
    reviews: 201,
  },
  {
    title: 'MAMBA',
    propertyType: 'Bungalow',
    category: 'Budget',
    description:
      'MAMBA is a breezy, fully furnished bungalow beside Siaya Hotel in Siaya Town, offering a quiet, secure compound and an easy, walkable location for guests who want convenience without the stress. The open-plan living area, deck, and outdoor shower create a relaxed, comfortable atmosphere, while the compact layout keeps everything simple and accessible. It is a strong option for short stays, working travellers, and anyone who wants a practical, well-located base to enjoy Siaya Town on foot.',
    pricePerNight: 1500,
    location: 'Siaya Town',
    subCounty: 'Siaya Town',
    county: 'Siaya',
    bedrooms: 2,
    bathrooms: 1,
    guests: 2,
    phone: '+254 725 317 246',
    phone2: '+254 723 865 139',
    whatsapp: '254725317246',
    whatsapp2: '254723865139',
    email: 'stay@mamba.co.ke',
    instagram: 'https://instagram.com/legrandstays',
    tiktok: 'https://www.tiktok.com/@legrandstays',
    facebook: 'https://facebook.com/legrandstays',
    images: propertyImages.bungalow,
    amenities: [...amenities.town, 'Security Lights', 'Security', 'Self Check-in', 'Balcony'],
    checkIn: 'Based on client time',
    checkOut: '11:00 AM',
    houseRules: [
      'Check-in time based on client request',
      'Check-out by 11:00 AM',
      'Sleeps 2 guests — for more, consult the owner',
      'No smoking indoors',
      'Quiet hours from 10 PM',
      'No pets',
    ],
    highlights: [
      'Breezy open-plan living',
      'Outdoor deck & shower',
      'Walkable to everything in town',
      'Secure compound',
    ],
    featured: true,
    lat: 0.0558,
    lng: 34.3015,
    rating: 4.8,
    reviews: 167,
  },
];

// Map categories: properties reference named categories, ensure they exist
const CATEGORIES = ['Family', 'Luxury', 'Budget'];

const TESTIMONIALS = [
  {
    name: 'Achieng Otieno',
    role: 'Tourist — Nairobi',
    quote:
      'LeGrand made it effortless to find a lovely cottage in Siaya Town. The photos were honest, the owner was on WhatsApp within minutes, and our weekend at KIBOKO was magical.',
    rating: 5,
  },
  {
    name: 'Brian Wafula',
    role: 'Business Traveller',
    quote:
      'I needed a quick stay in Siaya Town for work. The search was instant, SOKWE was exactly as described, and I loved dealing directly with the owner. No middlemen, no drama.',
    rating: 5,
  },
  {
    name: 'Faith Adhiambo',
    role: 'Family Holiday',
    quote:
      'We booked DIGIDIGI for my mother’s 60th birthday. The listing gave us everything we needed to plan, and the team even helped arrange the bonfire night. Highly recommended!',
    rating: 5,
  },
  {
    name: 'Collins Ouma',
    role: 'Weekend Getaway',
    quote:
      'Beautiful platform and easy to use. The map view showed me exactly where MAMBA sits, and the WhatsApp button meant I could confirm everything in one chat.',
    rating: 4,
  },
];

const TEAM = [
  {
    name: 'Samuel Ochieng',
    role: 'Founder & CEO',
    bio: 'Born and raised in Bondo, Samuel founded LeGrand to put Siaya’s hidden gems on the map.',
  },
  {
    name: 'Grace Auma',
    role: 'Head of Host Relations',
    bio: 'Grace works with every host personally to keep listings verified and photos honest.',
  },
  {
    name: 'Dennis Omondi',
    role: 'Experience Manager',
    bio: 'Dennis designs the guest experience, from first search to final WhatsApp goodbye.',
  },
  {
    name: 'Janet Nyambura',
    role: 'Community & Growth',
    bio: 'Janet champions local tourism and connects LeGrand with communities across the county.',
  },
];

const DESTINATIONS = [
  { name: 'Siaya Town', tag: 'County capital', count: 4 },
];

const crypto = require('crypto');

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

function seedDatabase() {
  const usedSlugs = new Set();
  const properties = props.map((p) => {
    let slug = slugify(p.title);
    let n = 2;
    while (usedSlugs.has(slug)) slug = `${slugify(p.title)}-${n++}`;
    usedSlugs.add(slug);
    return {
      ...p,
      id: crypto.randomBytes(8).toString('hex'),
      slug,
      images: p.images.map((photoId) => img(photoId)),
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 90) * 86400000).toISOString(),
    };
  });
  return {
    properties,
    users: [],
    categories: CATEGORIES,
    enquiries: [],
    testimonials: TESTIMONIALS,
    team: TEAM,
    destinations: DESTINATIONS,
    settings: {
      contactPhone: '+254 723 865 139',
      contactPhone2: '+254 725 317 246',
      contactEmail: 'hello@legrandstays.co.ke',
      whatsapp: '254723865139',
      whatsapp2: '254725317246',
      address: 'Oginga Odinga Road, Siaya Town, Siaya County, Kenya',
      social: {
        facebook: 'https://facebook.com/legrandstays',
        instagram: 'https://instagram.com/legrandstays',
        tiktok: 'https://www.tiktok.com/@legrandstays',
        twitter: 'https://x.com',
        youtube: 'https://youtube.com',
      },
    },
  };
}

// Allow `npm run seed` to force a fresh reseed into MongoDB
if (require.main === module) {
  require('dotenv').config();
  const db = require('../config/db');
  (async () => {
    await db.connect();
    await db.seedAll(seedDatabase());
    console.log('✅ Seeded LeGrand MongoDB database.');
    process.exit(0);
  })().catch((err) => {
    console.error('✖ Seeding failed:', err.message);
    process.exit(1);
  });
}

module.exports = { seedDatabase };
