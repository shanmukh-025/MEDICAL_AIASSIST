import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, FileText, Calendar, User, Upload, X, Loader2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

const HealthRecords = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);

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
    saving: lang === 'en' ? 'Saving...' : 'సేవ్ చేస్తోంది...'
  };

  const [formData, setFormData] = useState({ title: '', doctor: '', date: '', type: 'Prescription', image: '' });

  // Fetch Records
  const fetchRecords = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/records', {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      const data = await res.json();
      if (res.ok) setRecords(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchRecords(); }, []);

  // Handle File Upload (Base64)
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, image: reader.result });
      reader.readAsDataURL(file);
    }
  };

  // Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success(lang === 'en' ? 'Record Added!' : 'రికార్డ్ జోడించబడింది!');
        setShowModal(false);
        fetchRecords();
        setFormData({ title: '', doctor: '', date: '', type: 'Prescription', image: '' });
      } else {
        toast.error("Failed");
      }
    } catch (err) { toast.error("Error"); }
    finally { setLoading(false); }
  };

  // Delete Record
  const handleDelete = async (id) => {
      if(!window.confirm(lang === 'en' ? "Delete this record?" : "ఈ రికార్డును తొలగించాలా?")) return;
      try {
          await fetch(`http://localhost:5000/api/records/${id}`, {
             method: 'DELETE',
             headers: { 'x-auth-token': localStorage.getItem('token') }
          });
          setRecords(records.filter(r => r._id !== id));
          toast.success("Deleted");
      } catch(e) { toast.error("Error"); }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
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

      {/* Records Grid */}
      <div className="grid gap-4">
        {records.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
             <FileText size={48} className="mx-auto mb-4 opacity-20"/>
             <p>{t.noRecords}</p>
          </div>
        ) : (
          records.map((rec) => (
            <div key={rec._id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 group">
               <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                  {rec.image ? <img src={rec.image} className="w-full h-full object-cover" alt="doc"/> : <FileText className="m-auto mt-4 text-slate-300"/>}
               </div>
               <div className="flex-1">
                  <h3 className="font-bold text-slate-800">{rec.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                     <span className="flex items-center gap-1"><User size={12}/> {rec.doctor}</span>
                     <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(rec.date).toLocaleDateString()}</span>
                  </div>
                  <span className="inline-block mt-2 bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">{rec.type}</span>
               </div>
               <button onClick={() => handleDelete(rec._id)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={18}/></button>
            </div>
          ))
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-slate-800">{t.modalTitle}</h2>
                 <button onClick={() => setShowModal(false)}><X className="text-slate-400 hover:text-red-500"/></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">{t.labelTitle}</label>
                    <input type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1 outline-none focus:ring-2 focus:ring-emerald-500" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}/>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">{t.labelDoc}</label>
                        <input type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1" required value={formData.doctor} onChange={e => setFormData({...formData, doctor: e.target.value})}/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">{t.labelDate}</label>
                        <input type="date" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}/>
                    </div>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">{t.labelType}</label>
                    <select className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                       <option>{t.types.pres}</option>
                       <option>{t.types.report}</option>
                       <option>{t.types.invoice}</option>
                    </select>
                 </div>
                 
                 <label className="block border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 hover:border-emerald-400 transition">
                    <input type="file" className="hidden" onChange={handleFile} accept="image/*"/>
                    <Upload className="mx-auto text-emerald-500 mb-2"/>
                    <span className="text-sm text-slate-500 font-medium">
                       {formData.image ? <span className="text-emerald-600 font-bold">File Selected ✅</span> : t.upload}
                    </span>
                 </label>

                 <button disabled={loading} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition flex justify-center">
                    {loading ? <Loader2 className="animate-spin"/> : t.save}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default HealthRecords;