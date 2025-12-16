const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

// Firebase Admin: reads JSON from environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID
});

const db = admin.firestore();
const messaging = admin.messaging();

// This endpoint is called by your Android app
app.post('/relay/flower', async (req, res) => {
  try {
    const { toUid, flowerType, senderName, flowerId } = req.body;

    // Get partner's FCM tokens from Firestore
    const snap = await db
      .collection('users')
      .doc(toUid)
      .collection('fcmTokens')
      .get();

    const tokens = snap.docs.map(d => d.id);
    if (tokens.length === 0) {
      return res.status(404).json({ error: 'No tokens for partner' });
    }

    const message = {
      notification: {
        title: `${senderName} sent you ${flowerType} 🌸`,
        body: 'Tap to see your flower.'
      },
      data: {
        action: 'UPDATE_PARTNER_FLOWER',
        flowerType,
        flowerId,
        senderName,
        targetUid: toUid
      },
      tokens
    };

    const result = await messaging.sendMulticast(message);
    res.json({ success: true, sent: result.successCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Relay running on', PORT));
