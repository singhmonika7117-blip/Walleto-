const mongoose = require('mongoose');
const seedDemoUsers = require('./seedDemoUsers');

/**
 * Connect to MongoDB with graceful MONGO_URI fallback
 */
const connectDB = async () => {
  const mongoURI =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/split_app';

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);

    // Auto-seed demo accounts if database is empty
    await seedDemoUsers();
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.warn(
      `⚠️ Warning: Unable to connect to MongoDB at ${mongoURI}. Ensure MongoDB is running locally on port 27017 or provide a valid MONGO_URI in server/.env`
    );
    throw error;
  }
};

module.exports = connectDB;
