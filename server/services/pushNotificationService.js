const webpush = require('web-push');
const User = require('../models/User');

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_EMAIL || 'mailto:admin@mediassist.com',
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
    console.log('✅ Web Push configured with VAPID keys');
} else {
    console.warn('⚠️  VAPID keys not configured — push notifications will not work');
}

/**
 * Send a push notification to a specific user
 * @param {string} userId - User's MongoDB ID
 * @param {object} notification - { title, body, tag, url, actions, icon, badge }
 * @returns {Promise<boolean>} - Whether the notification was sent successfully
 */
const sendPushToUser = async (userId, notification) => {
    try {
        const user = await User.findById(userId).select('pushSubscription name');
        if (!user?.pushSubscription?.endpoint) {
            return false; // No subscription — user hasn't enabled push
        }

        const payload = JSON.stringify({
            title: notification.title || 'MediAssist AI',
            body: notification.body || '',
            icon: notification.icon || '/logo.png',
            badge: notification.badge || '/logo.png',
            tag: notification.tag || `mediassist-${Date.now()}`,
            requireInteraction: notification.requireInteraction !== false,
            data: {
                url: notification.url || '/',
                ...notification.data
            },
            actions: notification.actions || []
        });

        await webpush.sendNotification(user.pushSubscription, payload);
        console.log(`🔔 Push sent to ${user.name}: ${notification.title}`);
        return true;
    } catch (err) {
        console.error(`❌ Push failed for user ${userId}:`, err.message);

        // If subscription expired or invalid (status 410 Gone), remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
            await User.findByIdAndUpdate(userId, { $unset: { pushSubscription: 1 } });
            console.log(`🗑️  Removed expired push subscription for user ${userId}`);
        }
        return false;
    }
};

/**
 * Send push notification to multiple users
 * @param {string[]} userIds - Array of user IDs
 * @param {object} notification - Same as sendPushToUser
 */
const sendPushToUsers = async (userIds, notification) => {
    const results = await Promise.allSettled(
        userIds.map(id => sendPushToUser(id, notification))
    );
    const sent = results.filter(r => r.status === 'fulfilled' && r.value).length;
    console.log(`🔔 Push sent to ${sent}/${userIds.length} users`);
    return sent;
};

// ─── Notification Templates ──────────────────────────────────

/** Queue: Your turn is approaching */
const notifyQueueApproaching = (userId, { queueNumber, hospitalName, patientsAhead }) => {
    return sendPushToUser(userId, {
        title: '⏰ Your Turn is Approaching!',
        body: `Queue #${queueNumber} at ${hospitalName} — ${patientsAhead} patient${patientsAhead !== 1 ? 's' : ''} ahead. Please be ready!`,
        tag: `queue-approaching-${queueNumber}`,
        url: '/patient-queue',
        actions: [
            { action: 'view', title: 'View Queue' }
        ]
    });
};

/** Queue: You're being called in */
const notifyQueueCalledIn = (userId, { queueNumber, hospitalName }) => {
    return sendPushToUser(userId, {
        title: '🔔 It\'s Your Turn!',
        body: `Queue #${queueNumber} — You are being called in at ${hospitalName}. Please proceed to the consultation room.`,
        tag: `queue-called-${queueNumber}`,
        url: '/patient-queue',
        requireInteraction: true,
        actions: [
            { action: 'view', title: 'I\'m Coming' }
        ]
    });
};

/** Queue: Appointment confirmed with queue number */
const notifyQueueAssigned = (userId, { queueNumber, hospitalName, appointmentTime }) => {
    return sendPushToUser(userId, {
        title: '✅ Queue Number Assigned',
        body: `You are #${queueNumber} in queue at ${hospitalName}${appointmentTime ? ` for ${appointmentTime}` : ''}`,
        tag: `queue-assigned-${queueNumber}`,
        url: '/patient-queue'
    });
};

/** Medicine reminder */
const notifyMedicineReminder = (userId, { medicineName, dosage, instructions, reminderId, timing }) => {
    return sendPushToUser(userId, {
        title: '💊 Time to Take Your Medicine',
        body: `${medicineName} - ${dosage}${instructions ? '\n' + instructions : ''}`,
        tag: `medicine-${reminderId}-${timing}`,
        url: '/recovery-tracker',
        actions: [
            { action: 'taken', title: '✅ Taken' },
            { action: 'snooze', title: '⏰ Snooze 10min' }
        ],
        data: { reminderId, timing }
    });
};

/** Recovery plan update */
const notifyRecoveryUpdate = (userId, { title, message }) => {
    return sendPushToUser(userId, {
        title: title || '📋 Recovery Plan Update',
        body: message,
        tag: `recovery-${Date.now()}`,
        url: '/recovery-tracker'
    });
};

/** Appointment status change */
const notifyAppointmentUpdate = (userId, { status, hospitalName, appointmentTime }) => {
    const statusMessages = {
        CONFIRMED: `✅ Your appointment at ${hospitalName} has been confirmed${appointmentTime ? ` for ${appointmentTime}` : ''}`,
        CANCELLED: `❌ Your appointment at ${hospitalName} has been cancelled`,
        RESCHEDULED: `🔄 Your appointment at ${hospitalName} has been rescheduled`,
        COMPLETED: `✅ Your consultation at ${hospitalName} is complete`
    };

    return sendPushToUser(userId, {
        title: `Appointment ${status.charAt(0) + status.slice(1).toLowerCase()}`,
        body: statusMessages[status] || `Appointment update from ${hospitalName}`,
        tag: `appointment-${status}-${Date.now()}`,
        url: '/appointments'
    });
};

module.exports = {
    sendPushToUser,
    sendPushToUsers,
    notifyQueueApproaching,
    notifyQueueCalledIn,
    notifyQueueAssigned,
    notifyMedicineReminder,
    notifyRecoveryUpdate,
    notifyAppointmentUpdate,
    VAPID_PUBLIC_KEY
};
