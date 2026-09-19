import mongoose from 'mongoose';

// Disable command buffering so queries fail immediately if MongoDB is not connected
mongoose.set('bufferCommands', false);

export async function connectDB(retries = 3, delay = 2000) {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mal_practice';

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return true;
    } catch (error) {
      console.error(`MongoDB Connection Attempt ${attempt} failed: ${error.message}`);
      if (attempt < retries) {
        console.log(`Retrying MongoDB connection in ${delay / 1000}s...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        console.error(`MongoDB Connection Error: All ${retries} attempts failed: ${error.message}`);
        process.exit(1);
      }
    }
  }
}
