const cron = require('node-cron');
const TreatmentPlan = require('../models/TreatmentPlan');
const RecoveryLog = require('../models/RecoveryLog');
const Notification = require('../models/Notification');
const User = require('../models/User');

const startMonitoringScheduler = (io) => {
  console.log('📊 Patient monitoring scheduler started...');

  // Run every day at 9:00 AM - remind patients to log their symptoms
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('📊 Running daily recovery check-in reminders...');
      
      const activePlans = await TreatmentPlan.find({ status: 'ACTIVE' })
        .populate('patientId', 'name');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const plan of activePlans) {
        try {
          // Check if treatment has ended
          if (new Date() > new Date(plan.endDate)) {
            plan.status = 'FOLLOW_UP_NEEDED';
            await plan.save();

            // Notify patient about treatment completion
            const completionNotif = new Notification({
              userId: plan.patientId._id || plan.patientId,
              message: `Your treatment for "${plan.diagnosis}" is complete! ${plan.followUpRequired ? 'Please schedule a follow-up appointment with your doctor.' : 'Continue monitoring your health.'}`,
              type: 'TREATMENT_COMPLETE'
            });
            await completionNotif.save();

            // Notify hospital
            const hospitalNotif = new Notification({
              userId: plan.hospitalId,
              message: `Treatment plan for patient ${plan.patientId?.name || 'Unknown'} (${plan.diagnosis}) has completed. Follow-up may be needed.`,
              type: 'TREATMENT_COMPLETE'
            });
            await hospitalNotif.save();

            if (io) {
              io.to(`user_${plan.patientId._id || plan.patientId}`).emit('notification', {
                message: completionNotif.message,
                type: 'TREATMENT_COMPLETE'
              });
              io.to(`user_${plan.hospitalId}`).emit('notification', {
                message: hospitalNotif.message,
                type: 'TREATMENT_COMPLETE'
              });
            }
            continue;
          }

          // Calculate day number
          const start = new Date(plan.startDate);
          start.setHours(0, 0, 0, 0);
          const dayNumber = Math.max(1, Math.ceil((today - start) / (1000 * 60 * 60 * 24)) + 1);

          // Check if today's log exists
          const existingLog = await RecoveryLog.findOne({
            treatmentPlanId: plan._id,
            dayNumber
          });

          if (!existingLog) {
            // Send daily reminder
            const notification = new Notification({
              userId: plan.patientId._id || plan.patientId,
              message: `🩺 Day ${dayNumber} of your ${plan.diagnosis} treatment. How are you feeling today? Please log your symptoms and medicine intake.`,
              type: 'RECOVERY_CHECKIN'
            });
            await notification.save();

            if (io) {
              io.to(`user_${plan.patientId._id || plan.patientId}`).emit('notification', {
                message: notification.message,
                type: 'RECOVERY_CHECKIN'
              });
            }
          }
        } catch (planErr) {
          console.error(`Error processing plan ${plan._id}:`, planErr);
        }
      }
    } catch (err) {
      console.error('Monitoring scheduler error:', err);
    }
  });

  // Run every day at 8:00 PM - evening reminder for patients who haven't logged
  cron.schedule('0 20 * * *', async () => {
    try {
      console.log('📊 Running evening recovery reminder...');
      
      const activePlans = await TreatmentPlan.find({ status: 'ACTIVE' })
        .populate('patientId', 'name');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const plan of activePlans) {
        try {
          if (new Date() > new Date(plan.endDate)) continue;

          const start = new Date(plan.startDate);
          start.setHours(0, 0, 0, 0);
          const dayNumber = Math.max(1, Math.ceil((today - start) / (1000 * 60 * 60 * 24)) + 1);

          const existingLog = await RecoveryLog.findOne({
            treatmentPlanId: plan._id,
            dayNumber
          });

          if (!existingLog) {
            const notification = new Notification({
              userId: plan.patientId._id || plan.patientId,
              message: `⏰ Reminder: You haven't logged your recovery for today (Day ${dayNumber} of ${plan.diagnosis} treatment). Please update your symptoms before bed.`,
              type: 'RECOVERY_CHECKIN'
            });
            await notification.save();

            if (io) {
              io.to(`user_${plan.patientId._id || plan.patientId}`).emit('notification', {
                message: notification.message,
                type: 'RECOVERY_CHECKIN'
              });
            }
          }
        } catch (planErr) {
          console.error(`Error processing evening reminder for plan ${plan._id}:`, planErr);
        }
      }
    } catch (err) {
      console.error('Evening monitoring scheduler error:', err);
    }
  });

  // Run every day at 10:00 AM - check for follow-ups due soon
  cron.schedule('0 10 * * *', async () => {
    try {
      console.log('📊 Checking for upcoming follow-ups...');
      
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
      
      const upcomingFollowups = await TreatmentPlan.find({
        status: 'FOLLOW_UP_NEEDED',
        followUpRequired: true,
        followUpDate: { $lte: twoDaysFromNow, $gte: new Date() }
      }).populate('patientId', 'name');

      for (const plan of upcomingFollowups) {
        try {
          const daysUntil = Math.ceil((new Date(plan.followUpDate) - new Date()) / (1000 * 60 * 60 * 24));
          
          const notification = new Notification({
            userId: plan.patientId._id || plan.patientId,
            message: `📅 Reminder: Your follow-up visit for "${plan.diagnosis}" is ${daysUntil <= 0 ? 'today' : `in ${daysUntil} day(s)`}. Please book an appointment if you haven't already.`,
            type: 'FOLLOW_UP_REMINDER'
          });
          await notification.save();

          if (io) {
            io.to(`user_${plan.patientId._id || plan.patientId}`).emit('notification', {
              message: notification.message,
              type: 'FOLLOW_UP_REMINDER'
            });
          }
        } catch (planErr) {
          console.error(`Error sending follow-up reminder for plan ${plan._id}:`, planErr);
        }
      }
    } catch (err) {
      console.error('Follow-up scheduler error:', err);
    }
  });

  // Run every 6 hours - check for critical patients (worsening trend)
  cron.schedule('0 */6 * * *', async () => {
    try {
      console.log('📊 Checking for critical recovery alerts...');
      
      // Find recent logs where patients need attention but doctor hasn't been alerted
      const criticalLogs = await RecoveryLog.find({
        needsDoctorAttention: true,
        doctorAlerted: false,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).populate('patientId', 'name');

      for (const log of criticalLogs) {
        try {
          const plan = await TreatmentPlan.findById(log.treatmentPlanId);
          if (!plan) continue;

          const notification = new Notification({
            userId: plan.hospitalId,
            message: `🚨 CRITICAL: Patient ${log.patientId?.name || 'Unknown'} needs attention! Trend: ${log.trend}, Severity: ${log.overallSeverity}/10 (Day ${log.dayNumber} of "${plan.diagnosis}" treatment)`,
            type: 'CRITICAL_ALERT'
          });
          await notification.save();

          log.doctorAlerted = true;
          await log.save();

          if (io) {
            io.to(`user_${plan.hospitalId}`).emit('notification', {
              message: notification.message,
              type: 'CRITICAL_ALERT'
            });
          }
        } catch (logErr) {
          console.error(`Error alerting for log ${log._id}:`, logErr);
        }
      }
    } catch (err) {
      console.error('Critical alert scheduler error:', err);
    }
  });
};

module.exports = { startMonitoringScheduler };
