import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DoctorList from '../components/DoctorList';

const Doctors = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const familyMemberName = location.state?.familyMemberName || null;
  const familyMemberId = location.state?.familyMemberId || null;

  return (
    <div className="h-screen w-screen bg-slate-50">
      <DoctorList 
        onClose={() => navigate('/')} 
        familyMemberName={familyMemberName}
        familyMemberId={familyMemberId}
      />
    </div>
  );
};

export default Doctors;