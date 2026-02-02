import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, User, Edit2, Trash2, Users, Heart, X, Save, Calendar, Phone, Droplet, AlertCircle, FileText, Upload, Download, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';
import api from '../utils/apiWrapper';

const FamilyProfile = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [members, setMembers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    relationship: 'Self',
    age: '',
    gender: 'Male',
    bloodGroup: '',
    allergies: '',
    chronicConditions: '',
    emergencyContact: '',
    dateOfBirth: ''
  });

  const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

  const t = {
    header: lang === 'en' ? 'Family Health Profile' : 'కుటుంబ ఆరోగ్య ప్రొఫైల్',
    subHeader: lang === 'en' ? 'Manage health records for your family' : 'మీ కుటుంబానికి ఆరోగ్య రికార్డులను నిర్వహించండి',
    addMember: lang === 'en' ? 'Add Family Member' : 'కుటుంబ సభ్యుడిని చేర్చండి',
    noMembers: lang === 'en' ? 'No family members added yet' : 'ఇంకా కుటుంబ సభ్యులు జోడించబడలేదు',
    name: lang === 'en' ? 'Name' : 'పేరు',
    relationship: lang === 'en' ? 'Relationship' : 'సంబంధం',
    age: lang === 'en' ? 'Age' : 'వయస్సు',
    gender: lang === 'en' ? 'Gender' : 'లింగం',
    bloodGroup: lang === 'en' ? 'Blood Group' : 'రక్త గ్రూపు',
    allergies: lang === 'en' ? 'Allergies' : 'అలెర్జీలు',
    chronicConditions: lang === 'en' ? 'Chronic Conditions' : 'దీర్ఘకాలిక పరిస్థితులు',
    emergencyContact: lang === 'en' ? 'Emergency Contact' : 'అత్యవసర సంప్రదింపు',
    dateOfBirth: lang === 'en' ? 'Date of Birth' : 'పుట్టిన తేదీ',
    save: lang === 'en' ? 'Save Member' : 'సభ్యుడిని సేవ్ చేయండి',
    edit: lang === 'en' ? 'Edit' : 'మార్చు',
    delete: lang === 'en' ? 'Delete' : 'తొలగించు',
    cancel: lang === 'en' ? 'Cancel' : 'రద్దు చేయి',
    viewRecords: lang === 'en' ? 'View Records' : 'రికార్డులు చూడండి',
    documents: lang === 'en' ? 'Medical Documents' : 'వైద్య పత్రాలు',
    uploadDocument: lang === 'en' ? 'Upload Document' : 'పత్రం అప్లోడ్ చేయండి'
  };

  const relationships = ['Self', 'Spouse', 'Child', 'Parent', 'Grandparent', 'Sibling', 'Other'];
  const genders = ['Male', 'Female', 'Other'];

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const result = await api.getFamilyMembers();
      setMembers(result.data);
      setIsFromCache(result.fromCache);
      
      if (result.fromCache) {
        toast('📦 Viewing offline family data', { icon: '📱', duration: 2000 });
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not load family members');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!navigator.onLine) {
      toast.error('Cannot add/edit family members offline. Please connect to internet.');
      return;
    }
    
    setLoading(true);

    try {
      const payload = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : null,
        allergies: formData.allergies ? formData.allergies.split(',').map(a => a.trim()) : [],
        chronicConditions: formData.chronicConditions ? formData.chronicConditions.split(',').map(c => c.trim()) : []
      };

      const url = editingMember 
        ? `${API}/api/family/${editingMember._id}`
        : `${API}/api/family`;
      
      const method = editingMember ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingMember ? '✅ Updated!' : '✅ Member Added!');
        setShowModal(false);
        setEditingMember(null);
        resetForm();
        fetchMembers();
      }
    } catch (error) {
      toast.error('Failed to save');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name || '',
      relationship: member.relationship || 'Self',
      age: member.age || '',
      gender: member.gender || 'Male',
      bloodGroup: member.bloodGroup || '',
      allergies: member.allergies?.join(', ') || '',
      chronicConditions: member.chronicConditions?.join(', ') || '',
      emergencyContact: member.emergencyContact || '',
      dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth).toISOString().split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(lang === 'en' ? 'Delete this member?' : 'ఈ సభ్యుడిని తొలగించాలా?')) return;
    
    try {
      await fetch(`${API}/api/family/${id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      toast.success('🗑️ Deleted');
      fetchMembers();
    } catch (error) {
      toast.error('Failed to delete');
      console.error(error);
    }
  };

  const handleFileUpload = async (e, memberId = null) => {
    const file = e.target.files[0];
    if (!file) return;

    const targetId = memberId || editingMember?._id;
    if (!targetId) {
      toast.error('Please save member first');
      return;
    }

    const formData = new FormData();
    formData.append('document', file);
    formData.append('name', file.name);

    try {
      const res = await fetch(`${API}/api/family/${targetId}/documents`, {
        method: 'POST',
        headers: { 'x-auth-token': localStorage.getItem('token') },
        body: formData
      });
      
      if (res.ok) {
        toast.success('📄 Document uploaded!');
        fetchMembers();
      }
    } catch (error) {
      toast.error('Failed to upload');
      console.error(error);
    }
  };

  const handleDeleteDocument = async (memberId, docId) => {
    if (!window.confirm('Delete this document?')) return;

    try {
      await fetch(`${API}/api/family/${memberId}/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      toast.success('Document deleted');
      fetchMembers();
    } catch (error) {
      toast.error('Failed to delete');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      relationship: 'Self',
      age: '',
      gender: 'Male',
      bloodGroup: '',
      allergies: '',
      chronicConditions: '',
      emergencyContact: '',
      dateOfBirth: ''
    });
  };

  const openAddModal = () => {
    setEditingMember(null);
    resetForm();
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 sticky top-0 bg-slate-50 z-10 py-2">
        <div>
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition mb-2">
            <ArrowLeft size={16}/> Back
          </button>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-emerald-600" size={28} />
            {t.header}
          </h1>
          <p className="text-slate-400 text-sm">{t.subHeader}</p>
          {isFromCache && (
            <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
              <WifiOff size={12} />
              <span>Viewing offline data</span>
            </div>
          )}
        </div>
        <button onClick={openAddModal} className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition flex items-center gap-2">
          <Plus size={20}/> <span className="hidden md:inline">{t.addMember}</span>
        </button>
      </div>

      {/* Members Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {members.length === 0 ? (
          <div className="col-span-full text-center py-20 text-slate-400">
            <Users size={48} className="mx-auto mb-4 opacity-20"/>
            <p>{t.noMembers}</p>
          </div>
        ) : (
          members.map((member) => (
            <div key={member._id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <User size={24} className="text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{member.name}</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {member.relationship}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(member)} className="p-2 hover:bg-slate-100 rounded-lg transition text-blue-600">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(member._id)} className="p-2 hover:bg-red-50 rounded-lg transition text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2 text-sm">
                {member.age && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar size={14} className="text-slate-400" />
                    <span>{member.age} years old</span>
                  </div>
                )}
                {member.gender && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <User size={14} className="text-slate-400" />
                    <span>{member.gender}</span>
                  </div>
                )}
                {member.bloodGroup && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Droplet size={14} className="text-red-400" />
                    <span className="font-bold text-red-600">{member.bloodGroup}</span>
                  </div>
                )}
                {member.allergies && member.allergies.length > 0 && (
                  <div className="flex items-start gap-2 text-slate-600">
                    <AlertCircle size={14} className="text-orange-400 mt-0.5" />
                    <span className="text-xs">Allergies: {member.allergies.join(', ')}</span>
                  </div>
                )}
                {member.emergencyContact && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone size={14} className="text-green-400" />
                    <span className="text-xs">{member.emergencyContact}</span>
                  </div>
                )}
                {member.documents && member.documents.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={14} className="text-blue-400" />
                      <span className="text-xs font-bold text-slate-700">{member.documents.length} Document(s)</span>
                    </div>
                    <div className="space-y-1">
                      {member.documents.map(doc => (
                        <div key={doc._id} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                          <a 
                            href={`${API}${doc.url}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 flex-1"
                          >
                            <Download size={12} />
                            {doc.name}
                          </a>
                          <button
                            onClick={() => handleDeleteDocument(member._id, doc._id)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Document Button */}
              <div className="mt-3">
                <label className="cursor-pointer w-full bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 px-3 rounded-xl font-bold text-xs transition border border-blue-200 hover:border-blue-300 flex items-center justify-center gap-2">
                  <Upload size={14} />
                  {t.uploadDocument}
                  <input 
                    type="file" 
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, member._id)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* View Records Button */}
              <button 
                onClick={() => navigate(`/records?member=${member._id}`)}
                className="mt-4 w-full bg-slate-50 hover:bg-emerald-50 text-emerald-600 py-2 rounded-xl font-bold text-sm transition border border-slate-200 hover:border-emerald-200"
              >
                {t.viewRecords}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {editingMember ? t.edit : t.addMember}
              </h2>
              <button onClick={() => { setShowModal(false); setEditingMember(null); }} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                <X size={20}/>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.name} *</label>
                <input type="text" required className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.relationship}</label>
                  <select className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200"
                    value={formData.relationship} onChange={e => setFormData({...formData, relationship: e.target.value})}>
                    {relationships.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.age}</label>
                  <input type="number" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200"
                    value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})}/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.gender}</label>
                  <select className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200"
                    value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                    {genders.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.bloodGroup}</label>
                  <input type="text" placeholder="e.g., O+, A-, B+" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200"
                    value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})}/>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.dateOfBirth}</label>
                <input type="date" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200"
                  value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})}/>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.allergies}</label>
                <input type="text" placeholder="Comma separated: Peanuts, Dust..." className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200"
                  value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})}/>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.chronicConditions}</label>
                <input type="text" placeholder="Comma separated: Diabetes, BP..." className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200"
                  value={formData.chronicConditions} onChange={e => setFormData({...formData, chronicConditions: e.target.value})}/>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.emergencyContact}</label>
                <input type="tel" placeholder="+91 98765 43210" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200"
                  value={formData.emergencyContact} onChange={e => setFormData({...formData, emergencyContact: e.target.value})}/>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t.documents}</label>
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
                <p className="text-xs text-slate-500 mt-1">Upload test reports, prescriptions, or medical documents</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={loading} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-2">
                  <Save size={18} /> {t.save}
                </button>
                <button type="button" onClick={() => { setShowModal(false); setEditingMember(null); }} className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-300 transition">
                  {t.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyProfile;
