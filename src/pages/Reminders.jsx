import React, { useState } from 'react';
import { ArrowLeft, Plus, Bell, Trash2, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext'; // 1. Import Context

const Reminders = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage(); // 2. Get Language

  // 3. Translation Dictionary
  const t = {
    title: lang === 'en' ? 'Medication' : 'మందుల రిమైండర్లు',
    addNew: lang === 'en' ? 'Add New' : 'కొత్తది జోడించు',
    emptyTitle: lang === 'en' ? 'No reminders set' : 'రిమైండర్‌లు సెట్ చేయబడలేదు',
    emptySub: lang === 'en' ? 'Add your medicines to get alerts' : 'అలర్ట్‌లు పొందడానికి మీ మందులను జోడించు',
    medName: lang === 'en' ? 'Medicine Name' : 'మందు పేరు',
    time: lang === 'en' ? 'Time' : 'సమయం',
    dosage: lang === 'en' ? 'Dosage (e.g., 1 tablet)' : 'మోతాదు (ఉదా. 1 టాబ్లెట్)',
    save: lang === 'en' ? 'Save Reminder' : 'సేవ్ చేయండి',
    cancel: lang === 'en' ? 'Cancel' : 'రద్దు చేయండి',
    delete: lang === 'en' ? 'Delete' : 'తొలగించు'
  };

  const [reminders, setReminders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', time: '', dosage: '' });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    setReminders([...reminders, { ...formData, id: Date.now() }]);
    setShowModal(false);
    setFormData({ name: '', time: '', dosage: '' });
  };

  const handleDelete = (id) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-purple-600 p-6 pb-12 text-white relative shadow-lg">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
             <button onClick={() => navigate('/')} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
                <ArrowLeft size={20}/>
             </button>
             <h1 className="text-xl font-bold">{t.title}</h1>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-white text-purple-600 px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 hover:bg-purple-50 transition">
             <Plus size={16}/> {t.addNew}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-w-2xl mx-auto px-6 -mt-6">
        {reminders.length === 0 ? (
           <div className="bg-white p-8 rounded-3xl shadow-sm text-center border border-slate-100">
              <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-400">
                 <Bell size={32}/>
              </div>
              <h3 className="text-slate-800 font-bold">{t.emptyTitle}</h3>
              <p className="text-slate-400 text-sm mt-1">{t.emptySub}</p>
           </div>
        ) : (
           <div className="space-y-3">
              {reminders.map(rem => (
                 <div key={rem.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                       <div className="bg-purple-50 p-3 rounded-xl text-purple-600"><Clock size={20}/></div>
                       <div>
                          <h3 className="font-bold text-slate-800">{rem.name}</h3>
                          <p className="text-xs text-slate-500 font-medium">{rem.time} • {rem.dosage}</p>
                       </div>
                    </div>
                    <button onClick={() => handleDelete(rem.id)} className="text-slate-300 hover:text-red-500 p-2 transition">
                       <Trash2 size={18}/>
                    </button>
                 </div>
              ))}
           </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200">
               <h2 className="text-lg font-bold text-slate-800 mb-4">{t.addNew}</h2>
               <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-400 uppercase">{t.medName}</label>
                     <input type="text" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl mt-1 font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} autoFocus/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">{t.time}</label>
                        <input type="time" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl mt-1 font-bold" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})}/>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">{t.dosage}</label>
                        <input type="text" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl mt-1 font-bold" value={formData.dosage} onChange={e => setFormData({...formData, dosage: e.target.value})}/>
                     </div>
                  </div>
                  <div className="flex gap-3 mt-2">
                     <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold">{t.cancel}</button>
                     <button type="submit" className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-purple-200">{t.save}</button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default Reminders;