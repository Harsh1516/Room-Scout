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

async function cleanAndSeparate() {
  try {
    console.log('Connecting to Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    // 1. Find all hosts currently in users collection
    const hostDocsInUsers = await db.collection('users').find({ role: 'host' }).toArray();
    console.log(`Found ${hostDocsInUsers.length} host accounts inside 'users' collection.`);

    // 2. Make sure they exist in 'hosts' collection
    for (const h of hostDocsInUsers) {
      const existingHost = await db.collection('hosts').findOne({ email: h.email.toLowerCase() });
      if (!existingHost) {
        await db.collection('hosts').insertOne({
          name: h.name,
          email: h.email.toLowerCase(),
          password: h.password,
          phone: h.phone || '',
          avatar: h.avatar || 'HO',
          role: 'host',
          propertyName: '',
          status: 'Active',
          createdAt: h.createdAt || new Date(),
          updatedAt: new Date(),
        });
        console.log(`Migrated host ${h.email} to 'hosts' collection.`);
      } else {
        await db.collection('hosts').updateOne(
          { email: h.email.toLowerCase() },
          { $set: { role: 'host', password: h.password || existingHost.password } }
        );
        console.log(`Updated host ${h.email} in 'hosts' collection.`);
      }
    }

    // 3. Delete role: 'host' from 'users' collection
    const deleteResult = await db.collection('users').deleteMany({ role: 'host' });
    console.log(`🗑️ Removed ${deleteResult.deletedCount} host accounts from 'users' collection!`);

    // 4. Update local JSON stores
    if (fs.existsSync(USERS_FILE)) {
      const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8') || '[]');
      const filteredUsers = users.filter((u) => u.role !== 'host');
      fs.writeFileSync(USERS_FILE, JSON.stringify(filteredUsers, null, 2), 'utf-8');
      console.log(`Cleaned users_store.json: ${filteredUsers.length} guest users remain.`);
    }

    // 5. Verification
    const remainingUsers = await db.collection('users').find({}).toArray();
    const remainingHosts = await db.collection('hosts').find({}).toArray();

    console.log('\n--- VERIFIED MONGODB ATLAS COLLECTIONS ---');
    console.log(`📁 users (${remainingUsers.length} documents):`);
    remainingUsers.forEach((u) => console.log(`   • ${u.name} (${u.email}) - role: ${u.role}`));

    console.log(`📁 hosts (${remainingHosts.length} documents):`);
    remainingHosts.forEach((h) => console.log(`   • ${h.name} (${h.email}) - role: ${h.role}`));

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
}

cleanAndSeparate();
