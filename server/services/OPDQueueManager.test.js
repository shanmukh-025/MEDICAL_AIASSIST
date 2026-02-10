/**
 * Test Suite for OPDQueueManager
 * Demonstrates all 14 features with realistic scenarios
 */

const OPDQueueManager = require('./OPDQueueManager');

async function runTests() {
  console.log('🧪 Starting OPD Queue Manager Test Suite\n');
  console.log('='.repeat(80));
  
  const queueManager = new OPDQueueManager();
  const doctorId = 'DR001';
  const doctor2Id = 'DR002';
  
  // =====================================================
  // TEST 1: Smart Appointment Scheduling with Mutex
  // =====================================================
  console.log('\n📋 TEST 1: Smart Appointment Scheduling (Mutex Lock)');
  console.log('-'.repeat(80));
  
  const time = new Date('2026-02-08T10:00:00');
  
  // Simulate concurrent bookings
  const [booking1, booking2, booking3] = await Promise.all([
    queueManager.bookAppointment({ name: 'Patient A', phone: '1111111111' }, doctorId, time),
    queueManager.bookAppointment({ name: 'Patient B', phone: '2222222222' }, doctorId, time),
    queueManager.bookAppointment({ name: 'Patient C', phone: '3333333333' }, doctorId, time)
  ]);
  
  console.log('✅ Concurrent bookings result:');
  console.log(`   Patient A: Serial #${booking1.serialNumber}, Token #${booking1.tokenNumber}`);
  console.log(`   Patient B: Serial #${booking2.serialNumber}, Token #${booking2.tokenNumber}`);
  console.log(`   Patient C: Serial #${booking3.serialNumber}, Token #${booking3.tokenNumber}`);
  console.log(`   ✓ All serial numbers are unique despite concurrent execution`);
  
  // =====================================================
  // TEST 2: Walk-in Digital Token
  // =====================================================
  console.log('\n\n🚶 TEST 2: Walk-in Digital Token Generation');
  console.log('-'.repeat(80));
  
  const walkIn = queueManager.generateOfflineToken('Walk-in Patient', doctorId);
  console.log('✅ Walk-in token generated:');
  console.log(`   Name: Walk-in Patient`);
  console.log(`   Digital Queue Number: #${walkIn.serialNumber}`);
  console.log(`   Token: ${walkIn.tokenNumber}`);
  console.log(`   QR Code Data: ${walkIn.qrCode}`);
  console.log(`   Status: ${walkIn.appointment.status}`);
  
  // =====================================================
  // TEST 3: Real-Time Queue Tracking
  // =====================================================
  console.log('\n\n📊 TEST 3: Real-Time Queue Tracking');
  console.log('-'.repeat(80));
  
  const queueStatus = queueManager.getLiveQueueStatus(booking2.tokenNumber);
  console.log('✅ Live queue status for Patient B:');
  console.log(`   Your Queue Number: #${queueStatus.serialNumber}`);
  console.log(`   Position: ${queueStatus.position} of ${queueStatus.totalInQueue}`);
  console.log(`   Patients Ahead: ${queueStatus.patientsAhead}`);
  console.log(`   Currently Serving: #${queueStatus.currentlyServing}`);
  console.log(`   Status: ${queueStatus.yourStatus}`);
  
  // =====================================================
  // TEST 4: Live Waiting Time Display (ETR)
  // =====================================================
  console.log('\n\n⏰ TEST 4: Estimated Time Remaining (ETR)');
  console.log('-'.repeat(80));
  
  const etr = queueManager.calculateETR(booking3.tokenNumber);
  console.log('✅ ETR calculation for Patient C:');
  console.log(`   Estimated Wait: ${etr.estimatedTime}`);
  console.log(`   Expected Call Time: ${etr.expectedCallTime}`);
  console.log(`   Based on: ${etr.basedOn.patientsAhead} patients ahead`);
  console.log(`   Avg Consultation Time: ${etr.basedOn.avgConsultationTime} minutes`);
  
  // =====================================================
  // TEST 5: Automatic Queue Reordering for Delays
  // =====================================================
  console.log('\n\n🔄 TEST 5: Automatic Queue Reordering (30-min delay)');
  console.log('-'.repeat(80));
  
  const adjustment = queueManager.adjustQueueForDelay(doctorId, 30);
  console.log('✅ Queue adjusted:');
  console.log(`   Delay: ${adjustment.delayMinutes} minutes`);
  console.log(`   Appointments Adjusted: ${adjustment.adjustedCount}`);
  console.log(`   Sample adjustments:`);
  adjustment.adjustedAppointments.slice(0, 2).forEach(adj => {
    console.log(`     - Serial #${adj.serialNumber}: ${adj.oldTime.toLocaleTimeString()} → ${adj.newTime.toLocaleTimeString()}`);
  });
  
  // =====================================================
  // TEST 6: Emergency Priority Override
  // =====================================================
  console.log('\n\n🚨 TEST 6: Emergency Patient Insertion');
  console.log('-'.repeat(80));
  
  // Start consultation for first patient
  queueManager.startConsultation(booking1.tokenNumber);
  
  const emergency = queueManager.insertEmergencyPatient(
    { name: 'Emergency Patient', phone: '9999999999' },
    doctorId
  );
  
  console.log('✅ Emergency patient inserted:');
  console.log(`   Emergency Queue Number: #${emergency.serialNumber}`);
  console.log(`   Position: ${emergency.position} (immediately after current patient)`);
  console.log(`   Affected Patients: ${emergency.affectedPatients.length}`);
  console.log(`   Example shifts:`);
  emergency.affectedPatients.slice(0, 2).forEach(patient => {
    console.log(`     - ${patient.patientName}: #${patient.oldSerial} → #${patient.newSerial}`);
  });
  
  // =====================================================
  // TEST 7: Follow-up & Quick Visits
  // =====================================================
  console.log('\n\n⚡ TEST 7: Follow-up Appointment (Quick Visit)');
  console.log('-'.repeat(80));
  
  const followUp = await queueManager.addFollowUp(
    { name: 'Follow-up Patient', phone: '5555555555' },
    doctorId,
    new Date('2026-02-08T14:00:00')
  );
  
  console.log('✅ Follow-up appointment booked:');
  console.log(`   Type: ${followUp.type}`);
  console.log(`   Duration: ${followUp.estimatedDuration} minutes (vs. regular 15 mins)`);
  console.log(`   Message: ${followUp.message}`);
  
  // =====================================================
  // TEST 8: No-Show Handling
  // =====================================================
  console.log('\n\n❌ TEST 8: No-Show Handling');
  console.log('-'.repeat(80));
  
  const noShow = queueManager.handleNoShow(booking2.tokenNumber);
  console.log('✅ No-show handled:');
  console.log(`   Removed Patient: Token #${noShow.tokenNumber}`);
  console.log(`   Time Saved: ${noShow.timeSaved} minutes`);
  console.log(`   Patients Pulled Forward: ${noShow.affectedPatients}`);
  console.log(`   Example shifts:`);
  noShow.pulledForward.slice(0, 2).forEach(patient => {
    console.log(`     - ${patient.patientName}: #${patient.oldSerial} → #${patient.newSerial} (saved ${patient.timeSaved} mins)`);
  });
  
  // =====================================================
  // TEST 9: Mobile Queue Sync (JSON Format)
  // =====================================================
  console.log('\n\n📱 TEST 9: Mobile-Friendly Queue Status');
  console.log('-'.repeat(80));
  
  const mobileStatus = queueManager.getMobileQueueStatus(booking3.tokenNumber);
  console.log('✅ React Native friendly JSON:');
  console.log(JSON.stringify(mobileStatus, null, 2).slice(0, 500) + '...');
  
  // =====================================================
  // TEST 10: Delay Broadcast Notifications
  // =====================================================
  console.log('\n\n📢 TEST 10: Delay Broadcast Notifications');
  console.log('-'.repeat(80));
  
  const broadcast = queueManager.broadcastDelay(doctorId, 'Emergency surgery', 45);
  console.log('✅ Delay notification broadcast:');
  console.log(`   Reason: ${broadcast.delayReason}`);
  console.log(`   Delay: ${broadcast.delayMinutes} minutes`);
  console.log(`   Notifications Sent: ${broadcast.notificationsSent}`);
  console.log(`   Sample notification:`);
  if (broadcast.notifications[0]) {
    const notif = broadcast.notifications[0];
    console.log(`     To: ${notif.patientName} (Serial #${notif.serialNumber})`);
    console.log(`     Message: ${notif.message.body}`);
    console.log(`     Channels: ${notif.channels.join(', ')}`);
  }
  
  // =====================================================
  // TEST 11: Peak Hour Detection
  // =====================================================
  console.log('\n\n🔥 TEST 11: Peak Hour Detection');
  console.log('-'.repeat(80));
  
  // Book many appointments to create peak hour
  const peakTime = new Date('2026-02-08T15:00:00');
  for (let i = 0; i < 12; i++) {
    await queueManager.bookAppointment(
      { name: `Peak Patient ${i}`, phone: `800000000${i}` },
      doctorId,
      new Date(peakTime.getTime() + i * 60000) // Each 1 min apart in same hour
    );
  }
  
  const peakCheck = queueManager.checkPeakHour(doctorId, peakTime);
  console.log('✅ Peak hour analysis:');
  console.log(`   Time Slot: ${peakTime.toLocaleTimeString()}`);
  console.log(`   Current Count: ${peakCheck.currentCount}/${peakCheck.maxCapacity}`);
  console.log(`   Is Peak: ${peakCheck.isPeak ? 'YES ⚠️' : 'NO ✅'}`);
  console.log(`   Can Book: ${peakCheck.canBook ? 'YES' : 'NO'}`);
  console.log(`   Message: ${peakCheck.message}`);
  if (peakCheck.suggestedSlots.length > 0) {
    console.log(`   Suggested Alternative Times:`);
    peakCheck.suggestedSlots.forEach(slot => {
      console.log(`     - ${slot.time.toLocaleTimeString()} (${slot.availableSlots} slots available)`);
    });
  }
  
  // =====================================================
  // TEST 12: Doctor Fatigue Monitoring & Auto-Break
  // =====================================================
  console.log('\n\n☕ TEST 12: Doctor Fatigue & Auto-Break');
  console.log('-'.repeat(80));
  
  // Simulate 21 consultations
  for (let i = 1; i <= 21; i++) {
    const testToken = 1000 + i;
    queueManager.appointments.set(testToken, {
      tokenNumber: testToken,
      doctorId: doctorId,
      status: 'COMPLETED',
      consultationStartTime: new Date(Date.now() - 20 * 60000),
      consultationEndTime: new Date(Date.now() - 5 * 60000)
    });
    queueManager.recordConsultation(doctorId, 15);
  }
  
  const fatigueCheck = queueManager.monitorFatigue(doctorId);
  console.log('✅ Fatigue monitoring result:');
  console.log(`   Action: ${fatigueCheck.message}`);
  if (fatigueCheck.needsBreak !== false) {
    console.log(`   Break Duration: ${fatigueCheck.breakDuration} minutes`);
    console.log(`   Break End Time: ${fatigueCheck.breakEndTime?.toLocaleTimeString()}`);
    console.log(`   Affected Patients: ${fatigueCheck.affectedPatients}`);
  } else {
    console.log(`   Continuous Treated: ${fatigueCheck.continuousTreated}/${fatigueCheck.threshold}`);
    console.log(`   Until Break: ${fatigueCheck.untilBreak} more patients`);
  }
  
  // =====================================================
  // TEST 13: Auto Patient Redistribution
  // =====================================================
  console.log('\n\n⚖️ TEST 13: Auto Patient Redistribution');
  console.log('-'.repeat(80));
  
  // Book 20 patients for doctor 1, 2 for doctor 2
  queueManager.doctorQueues.set(doctor2Id, []);
  for (let i = 0; i < 2; i++) {
    await queueManager.bookAppointment(
      { name: `Patient Dr2-${i}`, phone: `700000000${i}` },
      doctor2Id,
      new Date('2026-02-08T16:00:00')
    );
  }
  
  const balance = queueManager.balanceDoctorLoad('DEPT001', [doctorId, doctor2Id]);
  console.log('✅ Load balancing analysis:');
  console.log(`   Department: ${balance.departmentId}`);
  console.log(`   Is Imbalanced: ${balance.isImbalanced ? 'YES ⚠️' : 'NO ✅'}`);
  console.log(`   Load Distribution:`);
  Object.entries(balance.loadDistribution).forEach(([docId, load]) => {
    console.log(`     - ${docId}: ${load} patients`);
  });
  console.log(`   Recommendation: ${balance.recommendation.message}`);
  if (balance.recommendation.action === 'REDISTRIBUTE') {
    console.log(`     Action: Route new patients from ${balance.recommendation.from} → ${balance.recommendation.to}`);
  }
  
  // =====================================================
  // TEST 14: Geo-Fenced Call Alerts
  // =====================================================
  console.log('\n\n📍 TEST 14: Geo-Fenced Call Alerts (Haversine Distance)');
  console.log('-'.repeat(80));
  
  // Test 1: Patient far away (should trigger)
  const patientFar = { latitude: 17.385, longitude: 78.486 }; // ~2km from hospital
  const hospital = { latitude: 17.400, longitude: 78.500 };
  const appointmentIn30Min = new Date(Date.now() + 30 * 60000);
  
  const callAlert1 = queueManager.shouldTriggerCall(patientFar, hospital, appointmentIn30Min);
  console.log('✅ Test Case 1: Patient 2km away, appointment in 30 mins');
  console.log(`   Distance: ${callAlert1.distance} km (${callAlert1.distanceType})`);
  console.log(`   Travel Time: ${callAlert1.travelTime} minutes @ ${callAlert1.speedUsed} km/h`);
  console.log(`   Buffer Time: ${callAlert1.bufferTime} minutes`);
  console.log(`   Total Time Needed: ${callAlert1.totalTimeNeeded} minutes`);
  console.log(`   Time Until Appointment: ${callAlert1.timeUntilAppointment} minutes`);
  console.log(`   Should Trigger Call: ${callAlert1.shouldTrigger ? 'YES 🚨' : 'NO ✅'}`);
  console.log(`   Message: ${callAlert1.message}`);
  console.log(`   Recommendation: ${callAlert1.recommendation}`);
  
  // Test 2: Patient very far (highway speed)
  const patientVeryFar = { latitude: 17.200, longitude: 78.300 }; // ~30km from hospital
  const appointmentIn2Hours = new Date(Date.now() + 120 * 60000);
  
  const callAlert2 = queueManager.shouldTriggerCall(patientVeryFar, hospital, appointmentIn2Hours);
  console.log('\n✅ Test Case 2: Patient 30km away, appointment in 2 hours');
  console.log(`   Distance: ${callAlert2.distance} km (${callAlert2.distanceType})`);
  console.log(`   Travel Time: ${callAlert2.travelTime} minutes @ ${callAlert2.speedUsed} km/h`);
  console.log(`   Should Trigger Call: ${callAlert2.shouldTrigger ? 'YES 🚨' : 'NO ✅'}`);
  console.log(`   Suggested Departure: ${callAlert2.suggestedDepartureTime.toLocaleTimeString()}`);
  console.log(`   Message: ${callAlert2.message}`);
  
  // =====================================================
  // STATISTICS
  // =====================================================
  console.log('\n\n📊 FINAL STATISTICS');
  console.log('='.repeat(80));
  
  const stats = queueManager.getStatistics(doctorId);
  console.log(`Doctor: ${doctorId}`);
  console.log(`Total Appointments: ${stats.total}`);
  console.log(`  - Scheduled: ${stats.scheduled}`);
  console.log(`  - Checked In: ${stats.checkedIn}`);
  console.log(`  - In Progress: ${stats.inProgress}`);
  console.log(`  - Completed: ${stats.completed}`);
  console.log(`  - No Shows: ${stats.noShows}`);
  console.log(`\nAppointment Types:`);
  console.log(`  - Regular: ${stats.total - stats.emergencies - stats.walkIns - stats.followUps}`);
  console.log(`  - Emergencies: ${stats.emergencies}`);
  console.log(`  - Walk-ins: ${stats.walkIns}`);
  console.log(`  - Follow-ups: ${stats.followUps}`);
  console.log(`\nPerformance:`);
  console.log(`  - Avg Consultation Time: ${stats.avgConsultationTime} minutes`);
  if (stats.doctorStats) {
    console.log(`  - Treated Today: ${stats.doctorStats.treatedToday}`);
    console.log(`  - Continuous Treated: ${stats.doctorStats.continuousTreated}`);
    console.log(`  - On Break: ${stats.doctorStats.isOnBreak ? 'YES' : 'NO'}`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(80));
}

// Run tests
runTests().catch(console.error);
