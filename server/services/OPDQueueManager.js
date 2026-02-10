/**
 * Smart OPD Queue Management System
 * Comprehensive real-time queue management for hospital appointments
 * 
 * @author Senior Backend Architect
 * @version 1.0.0
 */

const { EventEmitter } = require('events');

class OPDQueueManager extends EventEmitter {
  constructor() {
    super();
    
    // In-memory storage (In production, replace with Redis/MongoDB)
    this.appointments = new Map(); // tokenNumber -> appointment object
    this.doctorQueues = new Map(); // doctorId -> array of tokenNumbers
    this.tokenCounter = 0;
    this.consultationHistory = new Map(); // doctorId -> array of consultation times
    this.doctorStats = new Map(); // doctorId -> { treated: 0, lastBreak: null }
    this.bookingLock = new Map(); // doctorId+time -> lock flag
    
    // Configuration
    this.config = {
      defaultConsultationTime: 15, // minutes
      followUpConsultationTime: 5, // minutes
      emergencyConsultationTime: 20, // minutes
      peakHourThreshold: 15, // max appointments per hour
      fatigueThreshold: 20, // continuous patients before break
      breakDuration: 15, // minutes
      callBufferTime: 15, // minutes before appointment
      avgCitySpeed: 20, // km/h
      avgHighwaySpeed: 40, // km/h
      cityDistanceThreshold: 10 // km
    };
  }

  // =====================================================
  // PART 1: SMART SCHEDULING & TOKENS
  // =====================================================

  /**
   * FEATURE 1: Smart Appointment Scheduling with Mutex Lock
   * Ensures unique serial numbers even for concurrent bookings
   * 
   * @param {Object} patient - Patient details
   * @param {String} doctorId - Doctor ID
   * @param {Date} time - Appointment time
   * @returns {Object} Appointment with serial number
   */
  async bookAppointment(patient, doctorId, time) {
    const lockKey = `${doctorId}_${time.toISOString()}`;
    
    // MUTEX LOCK: Wait if another booking is in progress for same slot
    while (this.bookingLock.get(lockKey)) {
      await this._sleep(10); // Wait 10ms
    }
    
    try {
      // Acquire lock
      this.bookingLock.set(lockKey, true);
      
      // Generate unique token
      this.tokenCounter++;
      const tokenNumber = this.tokenCounter;
      
      // Get or initialize doctor's queue
      if (!this.doctorQueues.has(doctorId)) {
        this.doctorQueues.set(doctorId, []);
      }
      
      const queue = this.doctorQueues.get(doctorId);
      const serialNumber = queue.length + 1;
      
      // Create appointment object
      const appointment = {
        tokenNumber,
        serialNumber,
        patient,
        doctorId,
        scheduledTime: time,
        status: 'SCHEDULED',
        type: 'REGULAR',
        estimatedDuration: this.config.defaultConsultationTime,
        bookedAt: new Date(),
        checkInTime: null,
        consultationStartTime: null,
        consultationEndTime: null
      };
      
      // Store appointment
      this.appointments.set(tokenNumber, appointment);
      queue.push(tokenNumber);
      
      // Emit event
      this.emit('appointmentBooked', appointment);
      
      return {
        success: true,
        tokenNumber,
        serialNumber,
        message: `Appointment booked successfully. Your Queue Number: ${serialNumber}`,
        appointment
      };
      
    } finally {
      // Release lock
      this.bookingLock.delete(lockKey);
    }
  }

  /**
   * FEATURE 2: Walk-in Digital Token Generation
   * Allows offline patients to join the digital queue
   * 
   * @param {String} patientName - Walk-in patient name
   * @param {String} doctorId - Doctor ID
   * @returns {Object} Digital token details
   */
  generateOfflineToken(patientName, doctorId) {
    this.tokenCounter++;
    const tokenNumber = this.tokenCounter;
    
    if (!this.doctorQueues.has(doctorId)) {
      this.doctorQueues.set(doctorId, []);
    }
    
    const queue = this.doctorQueues.get(doctorId);
    const serialNumber = queue.length + 1;
    
    const appointment = {
      tokenNumber,
      serialNumber,
      patient: {
        name: patientName,
        type: 'WALK_IN',
        phone: null
      },
      doctorId,
      scheduledTime: new Date(),
      status: 'CHECKED_IN',
      type: 'WALK_IN',
      estimatedDuration: this.config.defaultConsultationTime,
      bookedAt: new Date(),
      checkInTime: new Date()
    };
    
    this.appointments.set(tokenNumber, appointment);
    queue.push(tokenNumber);
    
    this.emit('walkInAdded', appointment);
    
    return {
      success: true,
      tokenNumber,
      serialNumber,
      message: `Walk-in token generated. Digital Queue Number: ${serialNumber}`,
      qrCode: this._generateQRData(tokenNumber), // Can be used to generate QR code
      appointment
    };
  }

  /**
   * FEATURE 11: Peak Hour Detection
   * Restricts booking if time slot is at capacity
   * 
   * @param {String} doctorId - Doctor ID
   * @param {Date} timeSlot - Requested time slot
   * @returns {Object} Peak hour status
   */
  checkPeakHour(doctorId, timeSlot) {
    const hourStart = new Date(timeSlot);
    hourStart.setMinutes(0, 0, 0);
    
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hourEnd.getHours() + 1);
    
    // Count appointments in this hour
    const queue = this.doctorQueues.get(doctorId) || [];
    let countInHour = 0;
    
    for (const tokenNumber of queue) {
      const appt = this.appointments.get(tokenNumber);
      if (appt && appt.scheduledTime >= hourStart && appt.scheduledTime < hourEnd) {
        countInHour++;
      }
    }
    
    const isPeak = countInHour >= this.config.peakHourThreshold;
    
    return {
      isPeak,
      currentCount: countInHour,
      maxCapacity: this.config.peakHourThreshold,
      canBook: !isPeak,
      message: isPeak 
        ? `⚠️ PEAK HOUR: This slot has ${countInHour} appointments. Please choose another time.`
        : `✅ Available: ${countInHour}/${this.config.peakHourThreshold} slots filled.`,
      suggestedSlots: isPeak ? this._getSuggestedSlots(doctorId, timeSlot) : []
    };
  }

  /**
   * FEATURE 13: Auto Patient Redistribution
   * Balances load across doctors in same department
   * 
   * @param {String} departmentId - Department ID
   * @param {Array} doctorIds - List of doctor IDs in department
   * @returns {Object} Load balancing recommendation
   */
  balanceDoctorLoad(departmentId, doctorIds) {
    const loadMap = new Map();
    
    // Calculate load for each doctor
    for (const doctorId of doctorIds) {
      const queue = this.doctorQueues.get(doctorId) || [];
      const activeCount = queue.filter(tokenNumber => {
        const appt = this.appointments.get(tokenNumber);
        return appt && ['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS'].includes(appt.status);
      }).length;
      
      loadMap.set(doctorId, activeCount);
    }
    
    // Find max and min loaded doctors
    let maxLoad = 0, minLoad = Infinity;
    let maxDoctor = null, minDoctor = null;
    
    for (const [doctorId, load] of loadMap.entries()) {
      if (load > maxLoad) {
        maxLoad = load;
        maxDoctor = doctorId;
      }
      if (load < minLoad) {
        minLoad = load;
        minDoctor = doctorId;
      }
    }
    
    const isImbalanced = maxLoad - minLoad > 5; // Threshold: 5 patients difference
    
    return {
      departmentId,
      isImbalanced,
      loadDistribution: Object.fromEntries(loadMap),
      recommendation: isImbalanced ? {
        action: 'REDISTRIBUTE',
        from: maxDoctor,
        to: minDoctor,
        maxLoad,
        minLoad,
        message: `⚖️ Load imbalance detected. Doctor ${maxDoctor} has ${maxLoad} patients while Doctor ${minDoctor} has ${minLoad}. Suggest routing new patients to Doctor ${minDoctor}.`
      } : {
        action: 'NONE',
        message: '✅ Load is balanced across all doctors.'
      }
    };
  }

  // =====================================================
  // PART 2: REAL-TIME QUEUE LOGIC
  // =====================================================

  /**
   * FEATURE 3: Real-Time Queue Tracking
   * Returns patient's current position in queue
   * 
   * @param {Number} tokenNumber - Patient's token number
   * @returns {Object} Live queue status
   */
  getLiveQueueStatus(tokenNumber) {
    const appointment = this.appointments.get(tokenNumber);
    
    if (!appointment) {
      return {
        success: false,
        message: 'Invalid token number'
      };
    }
    
    const queue = this.doctorQueues.get(appointment.doctorId) || [];
    const position = queue.indexOf(tokenNumber) + 1;
    
    // Find currently serving patient
    let currentlyServing = null;
    for (const token of queue) {
      const appt = this.appointments.get(token);
      if (appt && appt.status === 'IN_PROGRESS') {
        currentlyServing = appt;
        break;
      }
    }
    
    // Count patients ahead
    const patientsAhead = queue.slice(0, queue.indexOf(tokenNumber)).filter(token => {
      const appt = this.appointments.get(token);
      return appt && appt.status !== 'COMPLETED' && appt.status !== 'CANCELLED' && appt.status !== 'NO_SHOW';
    }).length;
    
    return {
      success: true,
      tokenNumber,
      serialNumber: appointment.serialNumber,
      position,
      patientsAhead,
      currentlyServing: currentlyServing ? currentlyServing.serialNumber : 0,
      status: appointment.status,
      yourStatus: this._getPatientStatusMessage(appointment, patientsAhead),
      totalInQueue: queue.length,
      estimatedTimeRemaining: this.calculateETR(tokenNumber).estimatedMinutes
    };
  }

  /**
   * FEATURE 4: Live Waiting Time Display
   * Calculates Estimated Time Remaining (ETR)
   * 
   * @param {Number} tokenNumber - Patient's token number
   * @returns {Object} ETR calculation
   */
  calculateETR(tokenNumber) {
    const appointment = this.appointments.get(tokenNumber);
    
    if (!appointment) {
      return { success: false, message: 'Invalid token number' };
    }
    
    const queue = this.doctorQueues.get(appointment.doctorId) || [];
    const position = queue.indexOf(tokenNumber);
    
    // Get average consultation time for this doctor
    const avgTime = this._getAverageConsultationTime(appointment.doctorId);
    
    // Count patients ahead with their estimated durations
    let totalWaitTime = 0;
    for (let i = 0; i < position; i++) {
      const appt = this.appointments.get(queue[i]);
      if (appt && appt.status !== 'COMPLETED' && appt.status !== 'CANCELLED' && appt.status !== 'NO_SHOW') {
        totalWaitTime += appt.estimatedDuration || avgTime;
      }
    }
    
    return {
      success: true,
      tokenNumber,
      estimatedMinutes: Math.ceil(totalWaitTime),
      estimatedTime: this._formatDuration(totalWaitTime),
      basedOn: {
        patientsAhead: position,
        avgConsultationTime: avgTime
      },
      expectedCallTime: new Date(Date.now() + totalWaitTime * 60000).toLocaleTimeString()
    };
  }

  /**
   * FEATURE 5: Automatic Queue Reordering
   * Adjusts all subsequent appointments for delays
   * 
   * @param {String} doctorId - Doctor ID
   * @param {Number} delayMinutes - Delay in minutes
   * @returns {Object} Adjustment result
   */
  adjustQueueForDelay(doctorId, delayMinutes) {
    const queue = this.doctorQueues.get(doctorId) || [];
    let adjustedCount = 0;
    const adjustedAppointments = [];
    
    for (const tokenNumber of queue) {
      const appt = this.appointments.get(tokenNumber);
      
      // Only adjust future/pending appointments
      if (appt && ['SCHEDULED', 'CHECKED_IN'].includes(appt.status)) {
        appt.scheduledTime = new Date(appt.scheduledTime.getTime() + delayMinutes * 60000);
        appt.delayed = true;
        appt.delayReason = `Doctor delay: ${delayMinutes} minutes`;
        
        adjustedCount++;
        adjustedAppointments.push({
          tokenNumber: appt.tokenNumber,
          serialNumber: appt.serialNumber,
          oldTime: new Date(appt.scheduledTime.getTime() - delayMinutes * 60000),
          newTime: appt.scheduledTime
        });
      }
    }
    
    this.emit('queueAdjusted', {
      doctorId,
      delayMinutes,
      adjustedCount,
      appointments: adjustedAppointments
    });
    
    return {
      success: true,
      doctorId,
      delayMinutes,
      adjustedCount,
      message: `⏰ Queue adjusted: ${adjustedCount} appointments shifted by ${delayMinutes} minutes`,
      adjustedAppointments
    };
  }

  /**
   * FEATURE 6: Emergency Priority Override
   * Injects emergency patient at position 2 (after current)
   * 
   * @param {Object} patient - Emergency patient details
   * @param {String} doctorId - Doctor ID
   * @returns {Object} Emergency insertion result
   */
  insertEmergencyPatient(patient, doctorId) {
    this.tokenCounter++;
    const tokenNumber = this.tokenCounter;
    
    if (!this.doctorQueues.has(doctorId)) {
      this.doctorQueues.set(doctorId, []);
    }
    
    const queue = this.doctorQueues.get(doctorId);
    
    // Find current serving patient index
    let insertIndex = 0;
    for (let i = 0; i < queue.length; i++) {
      const appt = this.appointments.get(queue[i]);
      if (appt && appt.status === 'IN_PROGRESS') {
        insertIndex = i + 1; // Insert after current
        break;
      }
    }
    
    // Create emergency appointment
    const appointment = {
      tokenNumber,
      serialNumber: insertIndex + 1, // Will be next
      patient,
      doctorId,
      scheduledTime: new Date(),
      status: 'EMERGENCY',
      type: 'EMERGENCY',
      priority: 'HIGH',
      estimatedDuration: this.config.emergencyConsultationTime,
      bookedAt: new Date(),
      checkInTime: new Date()
    };
    
    // Insert into queue
    this.appointments.set(tokenNumber, appointment);
    queue.splice(insertIndex, 0, tokenNumber);
    
    // Update serial numbers for all following patients
    const affectedPatients = [];
    for (let i = insertIndex + 1; i < queue.length; i++) {
      const appt = this.appointments.get(queue[i]);
      if (appt) {
        const oldSerial = appt.serialNumber;
        appt.serialNumber = i + 1;
        affectedPatients.push({
          tokenNumber: appt.tokenNumber,
          oldSerial,
          newSerial: appt.serialNumber,
          patientName: appt.patient.name
        });
      }
    }
    
    this.emit('emergencyInserted', {
      appointment,
      affectedPatients
    });
    
    return {
      success: true,
      message: '🚨 EMERGENCY: Patient inserted at priority position',
      tokenNumber,
      serialNumber: appointment.serialNumber,
      position: insertIndex + 1,
      affectedPatients,
      appointment
    };
  }

  /**
   * FEATURE 7: Follow-up & Quick Visits
   * Assigns shorter duration for follow-up appointments
   * 
   * @param {Object} patient - Patient details
   * @param {String} doctorId - Doctor ID
   * @param {Date} time - Appointment time
   * @returns {Object} Follow-up appointment
   */
  async addFollowUp(patient, doctorId, time) {
    const result = await this.bookAppointment(patient, doctorId, time);
    
    if (result.success) {
      const appointment = this.appointments.get(result.tokenNumber);
      
      // Mark as follow-up with reduced duration
      appointment.type = 'FOLLOW_UP';
      appointment.estimatedDuration = this.config.followUpConsultationTime;
      appointment.isQuickVisit = true;
      
      this.emit('followUpBooked', appointment);
      
      return {
        ...result,
        type: 'FOLLOW_UP',
        estimatedDuration: this.config.followUpConsultationTime,
        message: `✅ Follow-up appointment booked (Quick Visit - ${this.config.followUpConsultationTime} mins)`
      };
    }
    
    return result;
  }

  /**
   * FEATURE 8: No-Show Handling
   * Removes absent patient and pulls queue forward
   * 
   * @param {Number} tokenNumber - Patient's token number
   * @returns {Object} No-show handling result
   */
  handleNoShow(tokenNumber) {
    const appointment = this.appointments.get(tokenNumber);
    
    if (!appointment) {
      return { success: false, message: 'Invalid token number' };
    }
    
    // Mark as no-show
    appointment.status = 'NO_SHOW';
    appointment.noShowTime = new Date();
    
    const queue = this.doctorQueues.get(appointment.doctorId);
    const position = queue.indexOf(tokenNumber);
    
    // Remove from active queue
    queue.splice(position, 1);
    
    // Pull everyone forward - update serial numbers
    const pulledForward = [];
    for (let i = position; i < queue.length; i++) {
      const appt = this.appointments.get(queue[i]);
      if (appt) {
        const oldSerial = appt.serialNumber;
        appt.serialNumber = i + 1;
        pulledForward.push({
          tokenNumber: appt.tokenNumber,
          patientName: appt.patient.name,
          oldSerial,
          newSerial: appt.serialNumber,
          timeSaved: appointment.estimatedDuration
        });
      }
    }
    
    this.emit('noShowHandled', {
      noShowAppointment: appointment,
      pulledForward
    });
    
    return {
      success: true,
      message: `❌ Patient marked as NO-SHOW. Queue pulled forward.`,
      tokenNumber,
      timeSaved: appointment.estimatedDuration,
      affectedPatients: pulledForward.length,
      pulledForward
    };
  }

  // =====================================================
  // PART 3: PREDICTION & OPTIMIZATION
  // =====================================================

  /**
   * FEATURE 12: Doctor Load & Auto-Break
   * Monitors doctor fatigue and schedules breaks
   * 
   * @param {String} doctorId - Doctor ID
   * @returns {Object} Fatigue monitoring result
   */
  monitorFatigue(doctorId) {
    if (!this.doctorStats.has(doctorId)) {
      this.doctorStats.set(doctorId, {
        treatedToday: 0,
        continuousTreated: 0,
        lastBreak: null,
        isOnBreak: false
      });
    }
    
    const stats = this.doctorStats.get(doctorId);
    
    // Check if break is needed
    if (stats.continuousTreated >= this.config.fatigueThreshold && !stats.isOnBreak) {
      return this.scheduleBreak(doctorId);
    }
    
    return {
      doctorId,
      needsBreak: false,
      continuousTreated: stats.continuousTreated,
      threshold: this.config.fatigueThreshold,
      untilBreak: this.config.fatigueThreshold - stats.continuousTreated,
      message: `✅ Doctor load normal: ${stats.continuousTreated}/${this.config.fatigueThreshold} patients`
    };
  }

  /**
   * Schedules mandatory break for doctor
   * 
   * @param {String} doctorId - Doctor ID
   * @returns {Object} Break schedule result
   */
  scheduleBreak(doctorId) {
    const stats = this.doctorStats.get(doctorId);
    stats.isOnBreak = true;
    stats.lastBreak = new Date();
    
    const breakEndTime = new Date(Date.now() + this.config.breakDuration * 60000);
    
    // Pause queue temporarily
    const queue = this.doctorQueues.get(doctorId) || [];
    const affectedPatients = [];
    
    for (const tokenNumber of queue) {
      const appt = this.appointments.get(tokenNumber);
      if (appt && appt.status === 'SCHEDULED') {
        affectedPatients.push({
          tokenNumber: appt.tokenNumber,
          serialNumber: appt.serialNumber,
          patientName: appt.patient.name
        });
      }
    }
    
    // Adjust queue for break duration
    this.adjustQueueForDelay(doctorId, this.config.breakDuration);
    
    // Schedule auto-resume
    setTimeout(() => {
      stats.isOnBreak = false;
      stats.continuousTreated = 0; // Reset counter
      this.emit('breakEnded', { doctorId });
    }, this.config.breakDuration * 60000);
    
    this.emit('breakScheduled', {
      doctorId,
      breakDuration: this.config.breakDuration,
      affectedPatients
    });
    
    return {
      success: true,
      message: `☕ MANDATORY BREAK: Doctor has treated ${stats.continuousTreated} patients continuously. ${this.config.breakDuration}-minute break scheduled.`,
      doctorId,
      breakDuration: this.config.breakDuration,
      breakEndTime,
      affectedPatients: affectedPatients.length,
      patientNotifications: affectedPatients
    };
  }

  // =====================================================
  // PART 4: NOTIFICATIONS & ALERTS
  // =====================================================

  /**
   * FEATURE 9: Mobile Queue Sync
   * Returns React Native friendly JSON format
   * 
   * @param {Number} tokenNumber - Patient's token number
   * @returns {Object} Mobile-friendly queue status
   */
  getMobileQueueStatus(tokenNumber) {
    const status = this.getLiveQueueStatus(tokenNumber);
    const etr = this.calculateETR(tokenNumber);
    
    if (!status.success) {
      return status;
    }
    
    const appointment = this.appointments.get(tokenNumber);
    
    // Mobile-optimized JSON structure
    return {
      status: 'success',
      data: {
        queue: {
          tokenNumber: status.tokenNumber,
          queueNumber: status.serialNumber,
          position: status.position,
          patientsAhead: status.patientsAhead,
          totalInQueue: status.totalInQueue
        },
        timing: {
          estimatedWaitMinutes: etr.estimatedMinutes,
          estimatedWaitTime: etr.estimatedTime,
          expectedCallTime: etr.expectedCallTime,
          scheduledTime: appointment.scheduledTime
        },
        status: {
          current: appointment.status,
          message: status.yourStatus,
          currentlyServing: status.currentlyServing,
          isYourTurn: status.patientsAhead === 0 && appointment.status !== 'IN_PROGRESS'
        },
        doctor: {
          id: appointment.doctorId
        },
        patient: {
          name: appointment.patient.name,
          type: appointment.type
        },
        notifications: {
          showAlert: status.patientsAhead <= 2,
          alertMessage: status.patientsAhead <= 2 ? '⚠️ Your turn is approaching!' : null
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * FEATURE 10: Delay Notifications
   * Broadcasts delay to all waiting patients
   * 
   * @param {String} doctorId - Doctor ID
   * @param {String} delayReason - Reason for delay
   * @param {Number} delayMinutes - Delay duration
   * @returns {Object} Broadcast result
   */
  broadcastDelay(doctorId, delayReason, delayMinutes) {
    const queue = this.doctorQueues.get(doctorId) || [];
    const notifications = [];
    
    for (const tokenNumber of queue) {
      const appt = this.appointments.get(tokenNumber);
      
      if (appt && ['SCHEDULED', 'CHECKED_IN'].includes(appt.status)) {
        const notification = {
          tokenNumber: appt.tokenNumber,
          serialNumber: appt.serialNumber,
          patientName: appt.patient.name,
          patientPhone: appt.patient.phone,
          message: {
            title: '⏰ Delay Notification',
            body: `Doctor is delayed by ${delayMinutes} minutes due to ${delayReason}.`,
            priority: 'high',
            data: {
              type: 'DELAY',
              doctorId,
              delayMinutes,
              reason: delayReason,
              newEstimatedTime: new Date(Date.now() + this.calculateETR(tokenNumber).estimatedMinutes * 60000 + delayMinutes * 60000).toLocaleTimeString()
            }
          },
          channels: ['push', 'sms', 'app'] // Multi-channel notification
        };
        
        notifications.push(notification);
        
        // Emit for push notification service
        this.emit('sendNotification', notification);
      }
    }
    
    // Adjust queue times
    this.adjustQueueForDelay(doctorId, delayMinutes);
    
    return {
      success: true,
      message: `📢 Delay broadcast sent to ${notifications.length} patients`,
      doctorId,
      delayReason,
      delayMinutes,
      notificationsSent: notifications.length,
      notifications
    };
  }

  /**
   * FEATURE 14: Geo-Fenced Call Alerts
   * Calculates if patient should be called based on location
   * 
   * @param {Object} patientLocation - { latitude, longitude }
   * @param {Object} hospitalLocation - { latitude, longitude }
   * @param {Date} appointmentTime - Scheduled appointment time
   * @returns {Object} Call trigger decision
   */
  shouldTriggerCall(patientLocation, hospitalLocation, appointmentTime) {
    // Haversine formula for distance calculation
    const distance = this._calculateDistance(
      patientLocation.latitude,
      patientLocation.longitude,
      hospitalLocation.latitude,
      hospitalLocation.longitude
    );
    
    // Traffic-aware speed calculation
    const avgSpeed = distance <= this.config.cityDistanceThreshold 
      ? this.config.avgCitySpeed 
      : this.config.avgHighwaySpeed;
    
    // Calculate travel time
    const travelTimeMinutes = (distance / avgSpeed) * 60;
    
    // Add buffer time
    const totalTimeNeeded = travelTimeMinutes + this.config.callBufferTime;
    
    // Calculate time until appointment
    const now = new Date();
    const timeUntilAppointment = (appointmentTime - now) / 60000; // minutes
    
    // Trigger if patient needs to leave now
    const shouldTrigger = timeUntilAppointment <= totalTimeNeeded;
    
    return {
      shouldTrigger,
      distance: Math.round(distance * 100) / 100, // km, 2 decimals
      travelTime: Math.ceil(travelTimeMinutes),
      bufferTime: this.config.callBufferTime,
      totalTimeNeeded: Math.ceil(totalTimeNeeded),
      timeUntilAppointment: Math.ceil(timeUntilAppointment),
      speedUsed: avgSpeed,
      distanceType: distance <= this.config.cityDistanceThreshold ? 'CITY' : 'HIGHWAY',
      message: shouldTrigger 
        ? `🚨 ALERT: Leave now! ${Math.ceil(travelTimeMinutes)} min travel + ${this.config.callBufferTime} min buffer needed.`
        : `✅ No rush. You have ${Math.ceil(timeUntilAppointment - totalTimeNeeded)} minutes before you need to leave.`,
      recommendation: shouldTrigger 
        ? 'CALL_PATIENT_NOW' 
        : 'WAIT',
      suggestedDepartureTime: new Date(appointmentTime.getTime() - totalTimeNeeded * 60000)
    };
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Haversine formula for calculating distance between two GPS coordinates
   */
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this._toRad(lat2 - lat1);
    const dLon = this._toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  _toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _generateQRData(tokenNumber) {
    return `OPD_TOKEN_${tokenNumber}_${Date.now()}`;
  }

  _getAverageConsultationTime(doctorId) {
    const history = this.consultationHistory.get(doctorId) || [];
    if (history.length === 0) return this.config.defaultConsultationTime;
    
    const avg = history.reduce((sum, time) => sum + time, 0) / history.length;
    return Math.ceil(avg);
  }

  _formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.ceil(minutes % 60);
    
    if (hours === 0) return `${mins} minutes`;
    return `${hours}h ${mins}m`;
  }

  _getPatientStatusMessage(appointment, patientsAhead) {
    switch (appointment.status) {
      case 'IN_PROGRESS':
        return '🎯 Your consultation is in progress';
      case 'COMPLETED':
        return '✅ Consultation completed';
      case 'EMERGENCY':
        return '🚨 Emergency - You will be seen immediately after current patient';
      default:
        if (patientsAhead === 0) return '⏰ You are next!';
        if (patientsAhead === 1) return '⚠️ Almost your turn! 1 patient ahead';
        return `⏳ Please wait. ${patientsAhead} patients ahead of you`;
    }
  }

  _getSuggestedSlots(doctorId, currentSlot) {
    const suggestions = [];
    const baseTime = new Date(currentSlot);
    
    // Suggest next 3 available hours
    for (let i = 1; i <= 3; i++) {
      const suggestedTime = new Date(baseTime);
      suggestedTime.setHours(suggestedTime.getHours() + i);
      
      const check = this.checkPeakHour(doctorId, suggestedTime);
      if (check.canBook) {
        suggestions.push({
          time: suggestedTime,
          availableSlots: this.config.peakHourThreshold - check.currentCount
        });
      }
    }
    
    return suggestions;
  }

  /**
   * Record consultation completion (for average time calculation)
   */
  recordConsultation(doctorId, durationMinutes) {
    if (!this.consultationHistory.has(doctorId)) {
      this.consultationHistory.set(doctorId, []);
    }
    
    const history = this.consultationHistory.get(doctorId);
    history.push(durationMinutes);
    
    // Keep only last 50 consultations
    if (history.length > 50) {
      history.shift();
    }
    
    // Update doctor stats
    if (this.doctorStats.has(doctorId)) {
      const stats = this.doctorStats.get(doctorId);
      stats.treatedToday++;
      stats.continuousTreated++;
    }
  }

  /**
   * Start consultation
   */
  startConsultation(tokenNumber) {
    const appointment = this.appointments.get(tokenNumber);
    if (appointment) {
      appointment.status = 'IN_PROGRESS';
      appointment.consultationStartTime = new Date();
      this.emit('consultationStarted', appointment);
    }
  }

  /**
   * End consultation
   */
  endConsultation(tokenNumber) {
    const appointment = this.appointments.get(tokenNumber);
    if (appointment) {
      appointment.status = 'COMPLETED';
      appointment.consultationEndTime = new Date();
      
      const duration = (appointment.consultationEndTime - appointment.consultationStartTime) / 60000;
      this.recordConsultation(appointment.doctorId, duration);
      
      this.emit('consultationCompleted', appointment);
      
      // Check fatigue after each consultation
      this.monitorFatigue(appointment.doctorId);
    }
  }

  /**
   * Get all appointments for a doctor
   */
  getDoctorQueue(doctorId) {
    const queue = this.doctorQueues.get(doctorId) || [];
    return queue.map(tokenNumber => this.appointments.get(tokenNumber));
  }

  /**
   * Get statistics
   */
  getStatistics(doctorId) {
    const queue = this.getDoctorQueue(doctorId);
    
    return {
      total: queue.length,
      scheduled: queue.filter(a => a.status === 'SCHEDULED').length,
      checkedIn: queue.filter(a => a.status === 'CHECKED_IN').length,
      inProgress: queue.filter(a => a.status === 'IN_PROGRESS').length,
      completed: queue.filter(a => a.status === 'COMPLETED').length,
      noShows: queue.filter(a => a.status === 'NO_SHOW').length,
      emergencies: queue.filter(a => a.type === 'EMERGENCY').length,
      walkIns: queue.filter(a => a.type === 'WALK_IN').length,
      followUps: queue.filter(a => a.type === 'FOLLOW_UP').length,
      avgConsultationTime: this._getAverageConsultationTime(doctorId),
      doctorStats: this.doctorStats.get(doctorId)
    };
  }
}

// Export the class
module.exports = OPDQueueManager;

/**
 * USAGE EXAMPLE:
 * 
 * const queueManager = new OPDQueueManager();
 * 
 * // Feature 1: Book appointment
 * const booking = await queueManager.bookAppointment(
 *   { name: 'John Doe', phone: '1234567890' },
 *   'doctor123',
 *   new Date('2026-02-08T10:00:00')
 * );
 * 
 * // Feature 3: Check queue status
 * const status = queueManager.getLiveQueueStatus(booking.tokenNumber);
 * 
 * // Feature 6: Insert emergency
 * const emergency = queueManager.insertEmergencyPatient(
 *   { name: 'Emergency Patient', phone: '9999999999' },
 *   'doctor123'
 * );
 * 
 * // Feature 14: Geo-fenced alerts
 * const callAlert = queueManager.shouldTriggerCall(
 *   { latitude: 17.385, longitude: 78.486 }, // Patient location
 *   { latitude: 17.400, longitude: 78.500 }, // Hospital location
 *   new Date('2026-02-08T15:00:00')
 * );
 * 
 * // Listen to events
 * queueManager.on('appointmentBooked', (appointment) => {
 *   console.log('New appointment:', appointment);
 * });
 */
