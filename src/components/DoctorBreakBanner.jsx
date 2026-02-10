import React, { useState, useEffect } from 'react';
import { Coffee, Clock } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const DoctorBreakBanner = () => {
  const { doctorBreak } = useSocket();
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!doctorBreak) return;

    const updateRemaining = () => {
      const endTime = new Date(doctorBreak.breakEndTime);
      const now = new Date();
      const diff = Math.max(0, Math.floor((endTime - now) / 1000));
      setRemainingSeconds(diff);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [doctorBreak]);

  // Don't render anything if no break or break ended
  if (!doctorBreak || remainingSeconds <= 0) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const breakEndTime = new Date(doctorBreak.breakEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const progressPercent = Math.max(0, (remainingSeconds / (doctorBreak.breakDurationMinutes * 60)) * 100);

  return (
    <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-5 py-4 rounded-2xl shadow-lg border border-purple-400/30 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-white/20 p-2.5 rounded-full">
          <Coffee size={20} className="animate-pulse" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm">Doctor on {doctorBreak.breakDurationMinutes}-minute Break</h4>
          <p className="text-xs text-purple-200 mt-0.5">
            Break ends at <strong>{breakEndTime}</strong>
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-xl">
            <Clock size={14} />
            <span className="font-mono font-bold text-lg tabular-nums">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
          <p className="text-[10px] text-purple-200 mt-1">remaining</p>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
        <div 
          className="bg-white/80 h-full rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      
      <p className="text-xs text-purple-200 mt-2">
        ℹ️ Your estimated wait time includes this break. You'll be notified when the doctor resumes.
      </p>
    </div>
  );
};

export default DoctorBreakBanner;
