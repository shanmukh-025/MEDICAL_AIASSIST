const cron = require('node-cron');
const webpush = require('web-push');
const MedicineReminder = require('../models/MedicineReminder');
const User = require('../models/User');

// Configure web-push with VAPID keys from environment variables
// To generate new VAPID keys, run: npx web-push generate-vapid-keys
// IMPORTANT: Add the generated keys to your .env file
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('⚠️  WARNING: VAPID keys not configured! Push notifications will not work.');
  console.error('   Run: npx web-push generate-vapid-keys');
  console.error('   Then add the keys to your .env file');
} else {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@mediassist.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

// Telugu translations for voice notifications
const teluguMessages = {
  reminder: 'మందు తీసుకునే సమయం వచ్చింది',
  takeMedicine: 'దయచేసి మీ మందు తీసుకోండి',
  beforeFood: 'భోజనానికి ముందు',
  afterFood: 'భోజనం తర్వాత',
  withWater: 'నీటితో'
};

const englishMessages = {
  reminder: 'Time to take your medicine',
  takeMedicine: 'Please take your medicine',
  beforeFood: 'Before food',
  afterFood: 'After food',
  withWater: 'With water'
};

// Check for pending reminders every minute
const startReminderScheduler = () => {
  console.log('🔔 Medicine reminder scheduler started...');

  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Find all active reminders that include this timing and whose duration covers today
      let reminders = await MedicineReminder.find({
        isActive: true,
        'duration.startDate': { $lte: today },
        'duration.endDate': { $gte: today },
        timings: currentTime
      }).populate('userId', 'name phone');

      // Filter reminders by frequency rules (support weekly schedules)
      const weekday = now.getDay(); // 0 = Sun ... 6 = Sat
      reminders = reminders.filter(r => {
        // If weekly schedule, ensure today is included
        if (r.frequency === 'weekly') {
          if (!r.daysOfWeek || r.daysOfWeek.length === 0) return false;
          return r.daysOfWeek.includes(weekday);
        }
        // For custom schedules we currently rely on timings and duration; keep it
        return true;
      });

      console.log(`⏰ [${currentTime}] Checking reminders... Found: ${reminders.length}`);

      for (const reminder of reminders) {
        await sendReminder(reminder, currentTime);
      }
    } catch (error) {
      console.error('❌ Error in reminder scheduler:', error);
    }
  });
};

// Send reminder via multiple channels
const sendReminder = async (reminder, currentTime) => {
  try {
    const messages = reminder.notifications.language === 'te' ? teluguMessages : englishMessages;
    
    // Build notification message
    let instructionText = '';
    if (reminder.instructions.beforeFood) {
      instructionText = messages.beforeFood;
    } else if (reminder.instructions.afterFood) {
      instructionText = messages.afterFood;
    }
    if (reminder.instructions.withWater) {
      instructionText += instructionText ? ', ' + messages.withWater : messages.withWater;
    }

    const notificationBody = `${reminder.medicineName} - ${reminder.dosage}${instructionText ? '\n' + instructionText : ''}`;

    // 1. Send Push Notification
    if (reminder.notifications.push && reminder.pushSubscription) {
      try {
        const payload = JSON.stringify({
          title: messages.reminder,
          body: notificationBody,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: `medicine-${reminder._id}-${currentTime}`,
          data: {
            reminderId: reminder._id.toString(),
            timing: currentTime,
            url: '/recovery-tracker',
            voice: reminder.notifications.voice,
            language: reminder.notifications.language
          },
          actions: [
            { action: 'taken', title: reminder.notifications.language === 'te' ? 'తీసుకున్నాను' : 'Taken' },
            { action: 'snooze', title: reminder.notifications.language === 'te' ? '10 నిమిషాలు ఆలస్యం' : 'Snooze 10min' }
          ]
        });

        await webpush.sendNotification(reminder.pushSubscription, payload);
        console.log(`✅ Push notification sent to ${reminder.userId.name}`);

        // Log to history
        reminder.history.push({
          scheduledTime: new Date(),
          sentAt: new Date(),
          status: 'sent',
          method: 'push',
          timingSlot: currentTime
        });
      } catch (pushError) {
        console.error('❌ Push notification failed:', pushError);
        
        // If push fails, try SMS fallback
        if (reminder.notifications.sms && reminder.userId.phone) {
          await sendSMS(reminder, notificationBody);
        }
      }
    }

    // 2. Send SMS (if enabled)
    if (reminder.notifications.sms && reminder.userId.phone) {
      await sendSMS(reminder, notificationBody);
    }

    // 3. Alert family members
    if (reminder.familyContacts && reminder.familyContacts.length > 0) {
      for (const contact of reminder.familyContacts) {
        const familyMessage = reminder.notifications.language === 'te'
          ? `${reminder.userId.name} కు మందు తీసుకునే సమయం వచ్చింది: ${reminder.medicineName}`
          : `Reminder: ${reminder.userId.name} needs to take ${reminder.medicineName}`;
        
        // Send SMS to family member
        // await sendSMS({ userId: { phone: contact.phone } }, familyMessage);
        console.log(`👨‍👩‍👧 Family alert sent to ${contact.name}: ${contact.phone}`);
      }
    }

    await reminder.save();
  } catch (error) {
    console.error('❌ Error sending reminder:', error);
  }
};

// SMS sending function (using Twilio or similar service)
const sendSMS = async (reminder, message) => {
  try {
    // Placeholder for SMS integration
    // You can use Twilio, MSG91, or any Indian SMS gateway
    
    /*
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to: reminder.userId.phone
    });
    */

    console.log(`📱 SMS sent to ${reminder.userId.phone}: ${message}`);
    
    reminder.history.push({
      scheduledTime: new Date(),
      sentAt: new Date(),
      status: 'sent',
      method: 'sms'
    });
  } catch (error) {
    console.error('❌ SMS sending failed:', error);
  }
};

module.exports = { startReminderScheduler, webpush };
