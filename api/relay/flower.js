import admin from "firebase-admin";

function init() {
  if (admin.apps.length) return;
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    init();
    const { toUid, flowerType, senderName, flowerId } = req.body;
    
    const snap = await admin.firestore()
      .collection("users").doc(toUid)
      .collection("fcmTokens").get();
      
    const tokens = snap.docs.map(d => d.id);
    if (!tokens.length) return res.status(404).json({ error: "No tokens" });

    // --- CHANGED SECTION START ---
    const msg = {
      // 1. REMOVED the "notification" block completely.
      
      // 2. Moved title/body into "data" so your Android app can use them if needed
      data: { 
        action: "UPDATE_PARTNER_FLOWER", 
        flowerType, 
        flowerId, 
        senderName, 
        targetUid: toUid,
        notificationTitle: `${senderName} sent you ${flowerType}`, // Optional: Use this in Android to build the notification
        notificationBody: "Check your widget!"
      },
      
      // 3. ADDED android priority to wake up the app
      android: {
        priority: "high"
      },
      
      tokens
    };
    // --- CHANGED SECTION END ---

    const result = await admin.messaging().sendEachForMulticast(msg);
    return res.json({ ok: true, sent: result.successCount });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
