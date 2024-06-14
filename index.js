const admin = require("firebase-admin");
const serviceAccount = require("./key/key.json"); // Your Firebase Admin SDK key
const express = require("express");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://chats-enthu.firebaseio.com" // Replace with your Firebase database URL
});

const db = admin.firestore();
const app = express();

app.use(express.json());

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

// Periodically check Firestore for new messages
setInterval(() => {
  db.collection('chat')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        console.log('No new messages');
        return;
      }

      // Process each new message
      snapshot.forEach(async (doc) => {
        const messageData = doc.data();

        // Construct notification payload
        const message = {
          notification: {
            title: "New Message",
            body: messageData.text,
          },
          data: {
            orderId: "123456",
            orderDate: "20-01-2002",
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
        userTokens.forEach(token => {
          sendNotification(token, message)
            .then(response => {
              console.log('Notification sent successfully:', response);
            })
            .catch(err => {
              console.error('Error sending notification:', err);
            });
        });
      });
    })
    .catch(err => {
      console.error('Error retrieving messages:', err);
    });
}, 30000); // Adjust interval as needed

// Other routes and server setup
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
