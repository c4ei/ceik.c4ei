/* push_key.js */
const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Public VAPID Key:', vapidKeys.publicKey);
console.log('Private VAPID Key:', vapidKeys.privateKey);
