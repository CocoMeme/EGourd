require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function checkAdmins() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const User = require('../src/models/User');
    
    // Find all admin users
    const admins = await User.find({ role: 'admin' }).select('email firstName lastName role isActive');
    
    if (admins.length === 0) {
      console.log('\n❌ No admin users found in the database!');
      console.log('\nTo create an admin user, you can:');
      console.log('1. Register a normal user first via the mobile app or API');
      console.log('2. Then run: node scripts/set-admin.js <email>');
    } else {
      console.log(`\n✅ Found ${admins.length} admin user(s):\n`);
      admins.forEach((admin, i) => {
        console.log(`${i + 1}. ${admin.email}`);
        console.log(`   Name: ${admin.firstName} ${admin.lastName}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   Active: ${admin.isActive}`);
        console.log('');
      });
    }
    
    // Also show total users
    const totalUsers = await User.countDocuments();
    console.log(`📊 Total users in database: ${totalUsers}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkAdmins();
