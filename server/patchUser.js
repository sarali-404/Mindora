require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const result = await User.updateOne(
    { email: 'newman@example.com' },
    {
      $set: {
        registrationStep: 4,
        isEmailVerified: true,
        verificationStatus: 'email_verified',
        isActive: true,
        'profile.idPhoto.verified': true,
        'profile.idPhoto.url': 'https://example.com/id.jpg',
        'profile.idPhoto.uploadedAt': new Date()
      }
    }
  );
  console.log('User patched:', result.modifiedCount, 'document(s)');
  mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});