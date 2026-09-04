import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { Stay } from './models/Stay.js';
import { SAMPLE_STAYS } from './data/mockStays.js';

dotenv.config();

async function seedData() {
  const connected = await connectDB();
  if (!connected) {
    console.log('Could not connect to MongoDB for seeding.');
    process.exit(1);
  }

  try {
    await Stay.deleteMany({});
    console.log('Existing stay properties cleared.');

    const staysToInsert = SAMPLE_STAYS.map((s) => ({
      stayId: s.id,
      title: s.title,
      type: s.type,
      location: s.location,
      price: s.price,
      rating: s.rating,
      badge: s.badge,
      tags: s.tags,
      image: s.image,
      description: `Located in ${s.location}, ${s.title} offers premier ${s.type} accommodations equipped with modern amenities and 24/7 security.`,
    }));

    await Stay.insertMany(staysToInsert);
    console.log(`Successfully seeded ${staysToInsert.length} properties into MongoDB!`);
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seedData();
