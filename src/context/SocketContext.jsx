import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import axios from 'axios';

const SocketContext = createContext();
const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [userAppointments, setUserAppointments] = useState([]);
  const [doctorBreak, setDoctorBreak] = useState(() => {
    try {
      const saved = localStorage.getItem('active_doctor_break');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Check if break is still active
        if (new Date(parsed.breakEndTime) > new Date()) {
          return parsed;
        }
        localStorage.removeItem('active_doctor_break');
      }
      return null;
    } catch { return null; }
  });
  const [doctorDelay, setDoctorDelay] = useState(() => {
    try {
      const saved = localStorage.getItem('active_doctor_delay');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (new Date(parsed.delayEndTime) > new Date()) {
          return parsed;
        }
        localStorage.removeItem('active_doctor_delay');
      }
      return null;
    } catch { return null; }
  });
  const [emergencyAlert, setEmergencyAlert] = useState(() => {
    try {
      const saved = localStorage.getItem('active_emergency_alert');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (new Date(parsed.alertEndTime) > new Date()) {
          return parsed;
        }
        localStorage.removeItem('active_emergency_alert');
      }
      return null;
    } catch { return null; }
  });
  const [reminders, setReminders] = useState(() => {
    try {
      const saved = localStorage.getItem('patient_reminders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist reminders to localStorage
  useEffect(() => {
    localStorage.setItem('patient_reminders', JSON.stringify(reminders));
  }, [reminders]);

  // Fetch user appointments to check hospital matches
  const fetchUserAppointments = async () => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    if (!token || userRole === 'HOSPITAL') return;

    try {
      const res = await axios.get(`${API}/api/appointments`, {
        headers: { 'x-auth-token': token }
      });
      if (res.data) {
        const activeAppts = res.data.filter(appt =>
          !['COMPLETED', 'REJECTED', 'NO_SHOW'].includes(appt.status)
        );
        setUserAppointments(activeAppts);
      }
    } catch (err) {
      console.error('Failed to fetch user appointments in SocketContext:', err);
    }
  };

  // Check if user has an appointment at the affected hospital
  const hasAppointmentAtHospital = (hospitalId) => {
    if (!hospitalId || !userAppointments || userAppointments.length === 0) return false;
    return userAppointments.some(appt =>
      appt.hospitalId && appt.hospitalId.toString() === hospitalId.toString()
    );
  };

  // Persist doctor break to localStorage and auto-clear when it expires
  useEffect(() => {
    if (doctorBreak) {
      localStorage.setItem('active_doctor_break', JSON.stringify(doctorBreak));
      const remaining = new Date(doctorBreak.breakEndTime) - new Date();
      if (remaining > 0) {
        const timer = setTimeout(() => {
          setDoctorBreak(null);
          localStorage.removeItem('active_doctor_break');
        }, remaining);
        return () => clearTimeout(timer);
      } else {
        setTimeout(() => {
          setDoctorBreak(null);
          localStorage.removeItem('active_doctor_break');
        }, 0);
      }
    } else {
      localStorage.removeItem('active_doctor_break');
    }
  }, [doctorBreak]);

  // Persist doctor delay to localStorage and auto-clear when it expires
  useEffect(() => {
    if (doctorDelay) {
      localStorage.setItem('active_doctor_delay', JSON.stringify(doctorDelay));
      const remaining = new Date(doctorDelay.delayEndTime) - new Date();
      if (remaining > 0) {
        const timer = setTimeout(() => {
          setDoctorDelay(null);
          localStorage.removeItem('active_doctor_delay');
        }, remaining);
        return () => clearTimeout(timer);
      } else {
        setTimeout(() => {
          setDoctorDelay(null);
          localStorage.removeItem('active_doctor_delay');
        }, 0);
      }
    } else {
      localStorage.removeItem('active_doctor_delay');
    }
  }, [doctorDelay]);

  // Persist emergency alert to localStorage and auto-clear when it expires
  useEffect(() => {
    if (emergencyAlert) {
      localStorage.setItem('active_emergency_alert', JSON.stringify(emergencyAlert));
      const remaining = new Date(emergencyAlert.alertEndTime) - new Date();
      if (remaining > 0) {
        const timer = setTimeout(() => {
          setEmergencyAlert(null);
          localStorage.removeItem('active_emergency_alert');
        }, remaining);
        return () => clearTimeout(timer);
      } else {
        setTimeout(() => {
          setEmergencyAlert(null);
          localStorage.removeItem('active_emergency_alert');
        }, 0);
      }
    } else {
      localStorage.removeItem('active_emergency_alert');
    }
  }, [emergencyAlert]);

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
    const newSocket = io(API_URL, { transports: ['websocket', 'polling'] });

    // Fetch user appointments when socket connects
    fetchUserAppointments();

    // Refresh appointments every 30 seconds to stay updated
    const appointmentRefreshInterval = setInterval(() => {
      fetchUserAppointments();
    }, 30000);

    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userId = payload.id || payload.userId;
          console.log('🔑 User ID from token:', userId);
          if (userId) {
            console.log('📡 Joining room:', `user_${userId}`);
            newSocket.emit('join', `user_${userId}`);
          }
        } catch (e) { console.error('Token parse error', e); }
      }
    });

    newSocket.on('notification', (data) => {
      console.log('📩 Notification received:', data);
      setNotifications(prev => [data, ...prev]);
      toast.success(data.message, { duration: 5000, icon: '🔔' });

      // If appointment is completed, auto-clear related reminders
      if (data.status === 'COMPLETED' && data.apptId) {
        console.log('🧹 Auto-clearing reminders for completed appointment:', data.apptId);
        setReminders(prev => prev.filter(r => r.apptId !== data.apptId));
      }

      // Refresh appointments when notification received (might be a new booking or completion)
      fetchUserAppointments();
    });

    newSocket.on('reminder', (data) => {
      console.log('🔔 REMINDER EVENT RECEIVED IN SOCKET CONTEXT:', data);
      const reminderItem = {
        ...data,
        id: Date.now(),
        timestamp: new Date().toISOString(),
        read: false
      };
      setReminders(prev => [reminderItem, ...prev]);
      toast.success(data.message, { duration: 10000, icon: '🔔', position: 'top-center' });
      // Refresh appointments when reminder received
      fetchUserAppointments();
    });

    // Listen for queue updates (break, emergency, delay) - show toasts for patients
    newSocket.on('queueUpdated', (data) => {
      console.log('📊 Queue update received in SocketContext:', data);
      const userRole = localStorage.getItem('userRole');
      // Only show toasts to patients, not to hospital staff (they already see their own toasts)
      if (userRole === 'HOSPITAL') return;

      // Check if user has appointment at this hospital before showing toast
      const affectedHospitalId = data.doctorId; // doctorId is actually hospitalId
      const hasAppt = hasAppointmentAtHospital(affectedHospitalId);

      if (data.type === 'DOCTOR_BREAK') {
        console.log('☕ DOCTOR_BREAK event received:', data);
        // Store break info persistently so it shows as a banner until it ends
        const breakData = {
          hospitalId: data.doctorId, // doctorId is actually hospitalId
          breakDurationMinutes: data.breakDurationMinutes,
          breakStartTime: data.breakStartTime,
          breakEndTime: data.breakEndTime,
          timestamp: new Date().toISOString()
        };
        console.log('☕ Storing doctor break in state:', breakData);
        setDoctorBreak(breakData);
        // Only show toast if user has appointment at this hospital
        if (hasAppt) {
          console.log('✅ User has appointment at this hospital, showing toast');
          toast(
            `☕ Doctor is taking a ${data.breakDurationMinutes}-minute break. Your wait time has been updated.`,
            { duration: 6000, icon: '☕', position: 'top-center' }
          );
        } else {
          console.log('ℹ️ User does not have appointment at this hospital, skipping toast');
        }
      } else if (data.type === 'EMERGENCY_INSERTED') {
        // Store emergency alert persistently — estimated ~20 min for emergency case
        const estimatedDuration = data.estimatedDuration || 20;
        const alertEndTime = new Date(Date.now() + estimatedDuration * 60 * 1000).toISOString();
        setEmergencyAlert({
          hospitalId: data.doctorId, // doctorId is actually hospitalId
          estimatedDuration,
          affectedPatients: data.affectedPatients || 0,
          emergencyQueueNumber: data.emergencyQueueNumber,
          alertStartTime: new Date().toISOString(),
          alertEndTime,
          timestamp: new Date().toISOString()
        });
        // Only show toast if user has appointment at this hospital
        if (hasAppt) {
          toast(
            `🚨 Emergency case added to the queue. Your wait time may increase by ~${estimatedDuration} mins.`,
            { duration: 8000, icon: '🚨', position: 'top-center' }
          );
        }
      } else if (data.type === 'DELAY_BROADCAST') {
        // Store delay info persistently so it shows as a banner until it ends
        const delayEndTime = new Date(Date.now() + data.delayMinutes * 60 * 1000).toISOString();
        setDoctorDelay({
          hospitalId: data.doctorId, // doctorId is actually hospitalId
          delayMinutes: data.delayMinutes,
          delayReason: data.delayReason || '',
          delayStartTime: new Date().toISOString(),
          delayEndTime,
          timestamp: new Date().toISOString()
        });
        // Only show toast if user has appointment at this hospital
        if (hasAppt) {
          toast(
            `⏰ Doctor delayed by ${data.delayMinutes} minutes${data.delayReason ? ': ' + data.delayReason : ''}`,
            { duration: 6000, icon: '⏰', position: 'top-center' }
          );
        }
      } else if (data.type === 'CONSULTATION_ENDED') {
        // Auto-clear reminders for the completed appointment
        if (data.apptId) {
          console.log('🧹 Auto-clearing reminders for completed consultation:', data.apptId);
          setReminders(prev => prev.filter(r => r.apptId !== data.apptId));
        }
        // Refresh appointments to update user's active appointment list
        fetchUserAppointments();
      }
    });

    newSocket.on('disconnect', () => console.log('❌ Socket disconnected'));

    setSocket(newSocket);
    return () => {
      clearInterval(appointmentRefreshInterval);
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, notifications, setNotifications, reminders, setReminders, doctorBreak, setDoctorBreak, doctorDelay, setDoctorDelay, emergencyAlert, setEmergencyAlert }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
