require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const r = await User.updateOne(
    { email: 'newman@example.com' },
    {
      $set: {
        'profile.idPhoto.verified': true,
        'profile.idPhoto.url': 'https://example.com/id.jpg',
        'profile.idPhoto.uploadedAt': new Date()
      }
    }
  );
  console.log('Updated:', r.modifiedCount, 'doc(s)');
  mongoose.disconnect();
}).catch(e => { console.error(e); process.exit(1); });
