import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, '../data/users_store.json');
const HOSTS_FILE = path.join(__dirname, '../data/hosts_store.json');

// Disable command buffering so queries fail immediately if MongoDB is not connected
mongoose.set('bufferCommands', false);

async function autoSyncLocalToAtlas(db) {
  try {
    // 1. Sync guest users into 'users' collection exclusively
    if (fs.existsSync(USERS_FILE)) {
      const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8') || '[]');
      for (const u of users) {
        if (u.role === 'host') continue; // Skip host records in users file
        const email = u.email.toLowerCase().trim();
        const exists = await db.collection('users').findOne({ email });
        if (!exists) {
          await db.collection('users').insertOne({
            name: u.name,
            email,
            password: u.password,
            avatar: u.avatar || u.name.slice(0, 2).toUpperCase(),
            role: 'user',
            phone: u.phone || '',
            createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    // 2. Sync host accounts into 'hosts' collection exclusively
    if (fs.existsSync(HOSTS_FILE)) {
      const hosts = JSON.parse(fs.readFileSync(HOSTS_FILE, 'utf-8') || '[]');
      for (const h of hosts) {
        const email = h.email.toLowerCase().trim();
        const exists = await db.collection('hosts').findOne({ email });
        if (!exists) {
          await db.collection('hosts').insertOne({
            ...h,
            role: 'host',
            email,
            updatedAt: new Date(),
          });
        }
      }
    }

    // 3. Publish any Approved hosts to 'stays' collection
    const approvedHosts = await db.collection('hosts').find({ status: 'Approved' }).toArray();
    for (const h of approvedHosts) {
      if (h.propertyName) {
        const basePrice =
          parseInt(String(h.roomRates?.[0]?.price || '3500').replace(/[^0-9]/g, '')) || 3500;

        const stayDoc = {
          title: h.propertyName,
          type: h.propertyType || 'PG',
          genderType: h.genderType || 'Both',
          location: h.location || 'Nainital, Uttarakhand',
          address: h.address || h.location,
          roadArea: h.roadArea || '',
          city: h.city || '',
          state: h.state || '',
          pincode: h.pincode || '',
          latitude: Number(h.latitude) || 29.3919,
          longitude: Number(h.longitude) || 79.4542,
          price: basePrice,
          rating: h.rating || 4.8,
          badge: 'VERIFIED HOST',
          tags: h.amenities || ['WiFi', 'Attached Bath', 'Security'],
          roomRates: h.roomRates || [],
          availableRooms: h.availableRooms || 1,
          totalRooms: h.totalRooms || 1,
          image: h.image || (h.images && h.images[0]) || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
          images: Array.isArray(h.images) && h.images.length > 0 ? h.images : [h.image],
          videos: h.videos || [],
          instagramVideoUrl: h.instagramVideoUrl || '',
          description: h.description || h.bio || `${h.propertyName} located in ${h.location}. Verified Host Property.`,
          hostId: h._id?.toString() || h.id,
          hostName: h.name,
          hostEmail: h.email.toLowerCase(),
          hostPhone: h.phone,
          updatedAt: new Date(),
        };

        const existingStay = await db.collection('stays').findOne({ hostEmail: h.email.toLowerCase() });
        if (existingStay) {
          await db.collection('stays').updateOne({ hostEmail: h.email.toLowerCase() }, { $set: stayDoc });
        } else {
          stayDoc.createdAt = new Date();
          await db.collection('stays').insertOne(stayDoc);
        }
      }
    }
  } catch (err) {
    console.warn('Auto-sync notice:', err.message);
  }
}

export async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mal_practice', {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await autoSyncLocalToAtlas(conn.connection.db);
    return true;
  } catch (error) {
    console.warn(`MongoDB Connection Warning: ${error.message}`);
    console.warn(`Operating with in-memory persistence fallback if MongoDB daemon is not running.`);
    return false;
  }
}
