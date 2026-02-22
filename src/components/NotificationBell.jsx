import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bell, X } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const NotificationBell = () => {
  const { notifications } = useSocket();
  const [dbNotifications, setDbNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const token = localStorage.getItem('token');

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API}/api/notifications`, { headers: { 'x-auth-token': token } });
      setDbNotifications(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markRead = async (id) => {
    try {
      await axios.put(`${API}/api/notifications/${id}/read`, {}, { headers: { 'x-auth-token': token } });
      setDbNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) { console.error(err); }
  };

  const unreadCount = dbNotifications.filter(n => !n.isRead).length + notifications.length;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-bold">Notifications</h3>
            <button onClick={() => setOpen(false)}><X size={18} /></button>
          </div>
          <div className="divide-y">
            {[...notifications, ...dbNotifications].map((n, i) => (
              <div key={n._id || i} className={`p-3 ${!n.isRead ? 'bg-blue-50' : ''} hover:bg-gray-50`} onClick={() => n._id && markRead(n._id)}>
                <p className="text-sm">{n.message}</p>
                <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
            ))}
            {[...notifications, ...dbNotifications].length === 0 && (
              <div className="p-6 text-center text-gray-400">No notifications</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
