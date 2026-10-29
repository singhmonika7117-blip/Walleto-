const User = require('../models/User');
const Wallet = require('../models/Wallet');

/**
 * Automatically seeds default demo users if the database is empty
 */
const seedDemoUsers = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.log('ℹ️ Demo accounts are disabled in production.');
    return;
  }
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return; // Database already contains users
    }

    console.log('🌱 Database is empty. Seeding default demo accounts...');

    const demoUsers = [
      {
        name: 'Alex Mercer',
        email: 'alex@example.com',
        password: 'password123',
        phone: '+91 98765 43210',
        defaultCurrency: 'INR'
      },
      {
        name: 'Sam Taylor',
        email: 'sam@example.com',
        password: 'password123',
        phone: '+91 98765 43211',
        defaultCurrency: 'INR'
      },
      {
        name: 'Jordan Lee',
        email: 'jordan@example.com',
        password: 'password123',
        phone: '+91 98765 43212',
        defaultCurrency: 'INR'
      }
    ];

    for (const userData of demoUsers) {
      const user = await User.create(userData);

      // Create personal wallet with ₹2,000 demo funds
      await Wallet.create({
        userId: user._id,
        totalBalance: 2000,
        currency: user.defaultCurrency || 'INR'
      });

      console.log(`👤 Seeded demo user: ${user.email} (Password: password123)`);
    }

    console.log('✅ Demo accounts seeded successfully!\n');
  } catch (error) {
    console.warn('⚠️ Demo seeding skipped or encountered error:', error.message);
  }
};

module.exports = seedDemoUsers;
