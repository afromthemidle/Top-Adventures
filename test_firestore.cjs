const admin = require('firebase-admin');
const config = require('./firebase-applet-config.json');

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: config.projectId,
    clientEmail: "test@test.com",
    privateKey: "-----BEGIN PRIVATE KEY-----\n..."
  })
});
// wait, we can't do this easily.
