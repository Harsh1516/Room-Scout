import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, '../data/users_store.json');
const HOSTS_FILE = path.join(__dirname, '../data/hosts_store.json');

async function sync() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    // 1. Sync Hosts
    if (fs.existsSync(HOSTS_FILE)) {
      const hostsData = JSON.parse(fs.readFileSync(HOSTS_FILE, 'utf-8') || '[]');
      for (const h of hostsData) {
        const cleanEmail = h.email.toLowerCase().trim();
        const existing = await db.collection('hosts').findOne({ email: cleanEmail });
        const doc = {
          ...h,
          role: 'host',
          email: cleanEmail,
          status: 'Approved',
          updatedAt: new Date(),
        };

        if (existing) {
          await db.collection('hosts').updateOne({ email: cleanEmail }, { $set: doc });
        } else {
          await db.collection('hosts').insertOne(doc);
        }
      }
    }

    // 2. Publish Approved Hosts to Stays Collection
    const approvedHosts = await db.collection('hosts').find({ status: 'Approved' }).toArray();
    for (const h of approvedHosts) {
      if (h.propertyName) {
        const basePrice =
          parseInt(String(h.roomRates?.[0]?.price || '3500').replace(/[^0-9]/g, '')) || 3500;

        const stayDoc = {
          title: h.propertyName,
          type: h.propertyType || 'PG',
          genderType: h.genderType || 'Boys',
          location: h.location || 'Bhowali, Uttarakhand',
          address: h.address || h.location,
          roadArea: h.roadArea || 'Lewasal',
          city: h.city || 'Bhowali',
          state: h.state || 'Uttarakhand',
          pincode: h.pincode || '263136',
          latitude: Number(h.latitude) || 29.374868,
          longitude: Number(h.longitude) || 79.527833,
          price: basePrice,
          rating: h.rating || 4.8,
          badge: 'VERIFIED HOST',
          tags: h.amenities || ['High-Speed WiFi', 'Attached Bathroom', 'Air Conditioning'],
          roomRates: h.roomRates || [],
          availableRooms: Number(h.availableRooms) || 10,
          totalRooms: Number(h.totalRooms) || 10,
          image: h.image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800',
          images: Array.isArray(h.images) && h.images.length > 0 ? h.images : [h.image],
          videos: h.videos || [],
          instagramVideoUrl: h.instagramVideoUrl || '',
          description: h.description || `Verified ${h.propertyType || 'PG'} located in ${h.location}.`,
          hostId: h._id?.toString() || h.id,
          hostName: h.name,
          hostEmail: h.email.toLowerCase(),
          hostPhone: h.phone,
          updatedAt: new Date(),
        };

        const existingStay = await db.collection('stays').findOne({ hostEmail: h.email.toLowerCase() });
        if (existingStay) {
          await db.collection('stays').updateOne({ hostEmail: h.email.toLowerCase() }, { $set: stayDoc });
          console.log(`Updated published stay in Atlas: "${stayDoc.title}" (${stayDoc.location})`);
        } else {
          stayDoc.createdAt = new Date();
          await db.collection('stays').insertOne(stayDoc);
          console.log(`Published new stay to Atlas: "${stayDoc.title}" (${stayDoc.location})`);
        }
      }
    }

    const totalStays = await db.collection('stays').countDocuments();
    const totalHosts = await db.collection('hosts').countDocuments();
    console.log(`\n✅ Finished! Atlas 'hosts': ${totalHosts}, Atlas 'stays': ${totalStays}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error during Atlas sync:', err);
    process.exit(1);
  }
}

sync();
