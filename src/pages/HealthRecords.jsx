import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, FileText, Calendar, User, Upload, X, Loader2, Trash2, Eye, Image as ImageIcon, AlertCircle, Building2, Users, WifiOff } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';
import api from '../utils/apiWrapper';
import offlineStorage from '../utils/offlineStorage';

const HealthRecords = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [searchParams] = useSearchParams();
  const selectedMemberId = searchParams.get('member');
  
  // State
  const [showModal, setShowModal] = useState(false);
  const [viewFile, setViewFile] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);

  // --- TRANSLATIONS ---
  const t = {
    header: lang === 'en' ? 'Health Records' : 'ఆరోగ్య రికార్డులు',
    subHeader: lang === 'en' ? 'Your medical history' : 'మీ వైద్య చరిత్ర',
    addBtn: lang === 'en' ? 'Add Record' : 'రికార్డును జోడించు',
    noRecords: lang === 'en' ? 'No records found' : 'రికార్డులు కనుగొనబడలేదు',
    modalTitle: lang === 'en' ? 'Add Document' : 'పత్రం జోడించు',
    labelTitle: lang === 'en' ? 'Title' : 'శీర్షిక',
    labelDoc: lang === 'en' ? 'Doctor' : 'వైద్యుడు',
    labelDate: lang === 'en' ? 'Date' : 'తేదీ',
    labelType: lang === 'en' ? 'Type' : 'రకం',
    types: {
        pres: lang === 'en' ? 'Prescription' : 'మందుల చీటీ',
        report: lang === 'en' ? 'Lab Report' : 'ల్యాబ్ రిపోర్ట్',
        invoice: lang === 'en' ? 'Invoice' : 'బిల్లు'
    },
    upload: lang === 'en' ? 'Upload Image' : 'చిత్రం అప్‌లోడ్ చేయండి',
    save: lang === 'en' ? 'Save Record' : 'రికార్డును సేవ్ చేయండి',
    saving: lang === 'en' ? 'Saving...' : 'సేవ్ చేస్తోంది...',
    deleteConfirm: lang === 'en' ? "Delete this record?" : "ఈ రికార్డును తొలగించాలా?",
    deleted: lang === 'en' ? "Deleted" : "తొలగించబడింది",
    added: lang === 'en' ? 'Record Added!' : 'రికార్డ్ జోడించబడింది!',
    fileReady: lang === 'en' ? 'Image Ready' : 'చిత్రం సిద్ధంగా ఉంది'
  };

  const [formData, setFormData] = useState({ title: '', doctor: '', date: '', type: 'Prescription', image: '', familyMember: '' });
  const [isFromCache, setIsFromCache] = useState(false);

  // Fetch Records with offline support
  const fetchRecords = async () => {
    try {
      const result = await api.getRecords();
      setRecords(result.data);
      setIsFromCache(result.fromCache);
      
      if (result.fromCache) {
        toast('📦 Viewing offline data', { icon: '📱', duration: 2000 });
      }
    } catch (err) { 
      console.error('Error fetching records:', err);
      toast.error('Could not load records');
    }
  };

  // Fetch Family Members with offline support
  const fetchFamilyMembers = async () => {
    try {
      const result = await api.getFamilyMembers();
      setFamilyMembers(result.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { 
    fetchRecords(); 
    fetchFamilyMembers();
  }, []);

  // Set selected member from URL params
  useEffect(() => {
    if (selectedMemberId && familyMembers.length > 0) {
      const member = familyMembers.find(m => m._id === selectedMemberId);
      setSelectedMember(member || null);
    }
  }, [selectedMemberId, familyMembers]);

  // Handle File Upload (Robust Base64)
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 8000000) return toast.error("File too large (Max 8MB)");
      
      const reader = new FileReader();
      reader.onloadend = () => {
          setFormData(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Form with offline check
  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!formData.image) return toast.error("Please upload an image first");
    
    if (!navigator.onLine) {
      toast.error("Cannot add records offline. Please connect to internet.");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        ...formData,
        familyMember: formData.familyMember || null
      };

      await api.createRecord(payload);
      toast.success(t.added);
      setShowModal(false);
      fetchRecords();
      setFormData({ title: '', doctor: '', date: '', type: 'Prescription', image: '', familyMember: '' });
    } catch (err) { 
      toast.error(err.message || "Failed to save");
    }
    finally { setLoading(false); }
  };

  // Delete Record
  const handleDelete = async (id) => {
      if(!window.confirm(t.deleteConfirm)) return;
      try {
          await fetch(`${import.meta.env.VITE_API_BASE}/api/records/${id}`, {
             method: 'DELETE',
             headers: { 'x-auth-token': localStorage.getItem('token') }
          });
          setRecords(records.filter(r => r._id !== id));
          toast.success(t.deleted);
      } catch(e) { toast.error("Error"); }
  }

  // Filter records by selected member
  const filteredRecords = selectedMember 
    ? records.filter(r => r.familyMember?._id === selectedMember._id)
    : records.filter(r => !r.familyMember); // Show only user's own records if no member selected

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 sticky top-0 bg-slate-50 z-10 py-2">
        <div>
           <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition mb-2">
             <ArrowLeft size={16}/> Back
           </button>
           <h1 className="text-2xl font-bold text-slate-800">{t.header}</h1>
           <p className="text-slate-400 text-sm">{t.subHeader}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition flex items-center gap-2">
           <Plus size={20}/> <span className="hidden md:inline">{t.addBtn}</span>
        </button>
      </div>

      {/* Family Member Filter */}
      {familyMembers.length > 0 && (
        <div className="mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-700">
              {lang === 'en' ? 'View Records For:' : 'రికార్డులు చూడండి:'}
            </h3>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setSelectedMember(null); navigate('/records'); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                !selectedMember 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'en' ? 'My Records' : 'నా రికార్డులు'}
            </button>
            {familyMembers.map(member => (
              <button
                key={member._id}
                onClick={() => { setSelectedMember(member); navigate(`/records?member=${member._id}`); }}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                  selectedMember?._id === member._id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <User size={14} />
                {member.name}
                {member.relationship && (
                  <span className="text-xs opacity-75">({member.relationship})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Records Grid */}
      <div className="grid gap-4">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
              <FileText size={48} className="mx-auto mb-4 opacity-20"/>
              <p>{t.noRecords}</p>
          </div>
        ) : (
          filteredRecords.map((rec) => (
            <div key={rec._id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-md transition">
               
               {/* Thumbnail */}
               <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200">
                  {rec.image && rec.image.startsWith('data:image') ? (
                      <img src={rec.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" alt="doc"/>
                  ) : (
                      <FileText className="text-slate-300"/>
                  )}
               </div>

               {/* Info */}
               <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-800 truncate">{rec.title}</h3>
                    {rec.sentByHospital && (
                      <span className="flex items-center gap-1 bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-blue-200 shrink-0">
                        <Building2 size={10} /> Hospital
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1 truncate"><User size={10}/> {rec.doctor || 'N/A'}</span>
                      <span className="flex items-center gap-1 shrink-0"><Calendar size={10}/> {new Date(rec.date).toLocaleDateString()}</span>
                  </div>
                  {rec.hospitalName && (
                    <div className="text-xs text-blue-600 mt-1 font-medium">
                      From: {rec.hospitalName}
                    </div>
                  )}
                  <span className="inline-block mt-2 bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide border border-emerald-100">{rec.type}</span>
               </div>

               {/* Actions */}
               <div className="flex gap-2">
                   <button 
                       onClick={() => setViewFile(rec)} 
                       className="p-2 bg-slate-50 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition"
                       title="View"
                   >
                       <Eye size={18}/>
                   </button>
                   <button 
                       onClick={() => handleDelete(rec._id)} 
                       className="p-2 bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white rounded-lg transition"
                       title="Delete"
                   >
                       <Trash2 size={18}/>
                   </button>
               </div>
            </div>
          ))
        )}
      </div>

      {/* ADD MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-slate-800">{t.modalTitle}</h2>
                 <button onClick={() => setShowModal(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={20}/></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">{t.labelTitle}</label>
                    <input type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1 outline-none focus:ring-2 focus:ring-emerald-500 font-medium" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}/>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">{t.labelDoc}</label>
                        <input type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1 font-medium" required value={formData.doctor} onChange={e => setFormData({...formData, doctor: e.target.value})}/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">{t.labelDate}</label>
                        <input type="date" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1 font-medium" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}/>
                    </div>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">{t.labelType}</label>
                    <select className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1 font-medium" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                       <option>{t.types.pres}</option>
                       <option>{t.types.report}</option>
                       <option>{t.types.invoice}</option>
                    </select>
                 </div>

                 {/* Family Member Selection */}
                 {familyMembers.length > 0 && (
                   <div>
                     <label className="text-xs font-bold text-slate-400 uppercase">
                       {lang === 'en' ? 'Record For' : 'రికార్డు ఎవరికి'}
                     </label>
                     <select 
                       className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1 font-medium"
                       value={formData.familyMember}
                       onChange={e => setFormData({...formData, familyMember: e.target.value})}
                     >
                       <option value="">
                         {lang === 'en' ? 'Myself' : 'నాకు'}
                       </option>
                       {familyMembers.map(member => (
                         <option key={member._id} value={member._id}>
                           {member.name} ({member.relationship})
                         </option>
                       ))}
                     </select>
                   </div>
                 )}
                 
                 <label className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${formData.image ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="file" className="hidden" onChange={handleFile} accept="image/*"/>
                    {formData.image ? (
                        <div className="text-emerald-600 flex flex-col items-center">
                            <ImageIcon size={32} className="mb-2"/>
                            <span className="text-sm font-bold">{t.fileReady} ✅</span>
                        </div>
                    ) : (
                        <div className="text-slate-400 flex flex-col items-center">
                            <Upload size={32} className="mb-2"/>
                            <span className="text-sm font-medium">{t.upload}</span>
                        </div>
                    )}
                 </label>

                 <button disabled={loading} className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition flex justify-center items-center gap-2">
                    {loading ? <Loader2 className="animate-spin"/> : t.save}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* VIEW IMAGE MODAL (UPDATED WITH FALLBACK) */}
      {viewFile && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setViewFile(null)}>
            <div className="relative w-full max-w-4xl h-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <button 
                    onClick={() => setViewFile(null)} 
                    className="absolute top-4 right-4 bg-black/50 text-white p-3 rounded-full hover:bg-white/20 transition backdrop-blur-md z-10"
                >
                    <X size={24}/>
                </button>
                
                <div className="flex-1 flex items-center justify-center bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl p-4">
                    {/* Check if image exists and is a valid data URL */}
                    {viewFile.image && viewFile.image.length > 100 ? (
                        <img src={viewFile.image} alt="Full Record" className="max-w-full max-h-full object-contain" />
                    ) : (
                        <div className="text-center text-white/50 flex flex-col items-center">
                            <AlertCircle size={48} className="mb-2 opacity-50"/>
                            <p className="text-lg font-bold">Image Not Available</p>
                            <p className="text-xs text-white/30 mt-1">The file might be corrupted or wasn't saved correctly.</p>
                        </div>
                    )}
                </div>

                <div className="mt-4 text-center">
                    <h3 className="text-white text-lg font-bold">{viewFile.title}</h3>
                    <p className="text-white/60 text-sm">{viewFile.doctor} • {new Date(viewFile.date).toLocaleDateString()}</p>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default HealthRecords;