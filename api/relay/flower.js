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
    const msg = {
      notification: { title: `${senderName} sent you ${flowerType}`, body: "Open app" },
      data: { action: "UPDATE_PARTNER_FLOWER", flowerType, flowerId, senderName, targetUid: toUid },
      tokens
    };
    const result = await admin.messaging().sendEachForMulticast(msg);
    return res.json({ ok: true, sent: result.successCount });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
