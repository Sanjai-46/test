require('dotenv').config();
const admin = require("firebase-admin");
const express = require("express");

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    "type": "service_account",
    "project_id": process.env.GOOGLE_CLOUD_PROJECT_ID,
    "private_key_id": process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
    "private_key": process.env.GOOGLE_CLOUD_PRIVATE_KEY.replace(/\\n/g, '\n'),
    "client_email": process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    "client_id": process.env.GOOGLE_CLOUD_CLIENT_ID,
    "auth_uri": process.env.GOOGLE_CLOUD_AUTH_URI,
    "token_uri": process.env.GOOGLE_CLOUD_TOKEN_URI,
    "auth_provider_x509_cert_url": process.env.GOOGLE_CLOUD_AUTH_PROVIDER_X509_CERT_URL,
    "client_x509_cert_url": process.env.GOOGLE_CLOUD_CLIENT_X509_CERT_URL
  }),
  databaseURL: "https://chats-enthu.firebaseio.com" // Replace with your Firebase database URL
});

const db = admin.firestore();
const app = express();

app.use(express.json());

// Define a route for the root URL
app.get('/', (req, res) => {
  res.send('Welcome to the Notification Service');
});

// Function to send notifications
const sendNotification = (token, message) => {
  return admin.messaging().send({
    token: token,
    notification: {
      title: message.notification.title,
      body: message.notification.body,
    },
    data: message.data,
  });
};

// Endpoint to trigger sending notifications
app.post('/send-notification', async (req, res) => {
  try {
    const { title, body, orderId, orderDate } = req.body;

    // Construct notification payload
    const message = {
      notification: {
        title: title || "New Message",
        body: body || "This is a dummy notification",
      },
      data: {
        orderId: orderId || "123456",
        orderDate: orderDate || "20-01-2002",
      },
    };

    // Retrieve all FCM tokens from Firestore
    const userSnapshots = await db.collection('users').get();
    const userTokens = [];
    userSnapshots.forEach(userDoc => {
      const userData = userDoc.data();
      if (userData.fcmToken) {
        userTokens.push(userData.fcmToken);
      }
    });

    // Send notifications to all user tokens
    const promises = userTokens.map(token => sendNotification(token, message));
    const results = await Promise.allSettled(promises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`Notification sent successfully to token ${userTokens[index]}:`, result.value);
      } else {
        console.error(`Error sending notification to token ${userTokens[index]}:`, result.reason);
      }
    });

    res.status(200).send('Dummy notifications sent successfully');
  } catch (err) {
    console.error('Error sending notifications:', err);
    res.status(500).send('Error sending notifications');
  }
});

const PORT = process.env.X_ZOHO_CATALYST_LISTEN_PORT || 3000;
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});