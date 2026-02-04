import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Trash2, Clock, Bell, Phone, User } from 'lucide-react';
import toast from 'react-hot-toast';

const MedicineReminders = () => {
  const { lang } = useLanguage();
  const [reminders, setReminders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  const [formData, setFormData] = useState({
    medicineName: '',
    dosage: '',
    frequency: 'twice',
    timings: ['09:00', '21:00'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    beforeFood: false,
    afterFood: false,
    withWater: true,
    notes: '',
    enablePush: true,
    enableSMS: false,
    enableVoice: true,
    language: lang,
    familyContacts: []
  });

  const [familyContact, setFamilyContact] = useState({ name: '', phone: '', relation: '' });

  const t = {
    en: {
      title: 'Medicine Reminders',
      addNew: 'Add New Reminder',
      medicineName: 'Medicine Name',
      dosage: 'Dosage',
      frequency: 'Frequency',
      once: 'Once daily',
      twice: 'Twice daily',
      thrice: 'Three times daily',
      fourTimes: 'Four times daily',
      timings: 'Reminder Times',
      startDate: 'Start Date',
      endDate: 'End Date',
      instructions: 'Instructions',
      beforeFood: 'Before Food',
      afterFood: 'After Food',
      withWater: 'With Water',
      notes: 'Additional Notes',
      notifications: 'Notification Settings',
      pushNotif: 'Push Notifications (App)',
      smsNotif: 'SMS Notifications',
      voiceNotif: 'Voice Notifications (Telugu)',
      familyAlerts: 'Family Alerts',
      addFamily: 'Add Family Contact',
      familyName: 'Name',
      familyPhone: 'Phone',
      familyRelation: 'Relation',
      save: 'Save Reminder',
      cancel: 'Cancel',
      delete: 'Delete',
      active: 'Active',
      completed: 'Completed',
      noReminders: 'No active reminders',
      enablePush: 'Enable Push Notifications',
      pushEnabled: 'Push notifications enabled!',
      pushBlocked: 'Please allow notifications in browser settings'
    },
    te: {
      title: 'మందుల రిమైండర్లు',
      addNew: 'కొత్త రిమైండర్ జోడించండి',
      medicineName: 'మందు పేరు',
      dosage: 'మోతాదు',
      frequency: 'ఫ్రీక్వెన్సీ',
      once: 'రోజుకు ఒకసారి',
      twice: 'రోజుకు రెండుసార్లు',
      thrice: 'రోజుకు మూడుసార్లు',
      fourTimes: 'రోజుకు నాలుగుసార్లు',
      timings: 'రిమైండర్ సమయాలు',
      startDate: 'ప్రారంభ తేదీ',
      endDate: 'ముగింపు తేదీ',
      instructions: 'సూచనలు',
      beforeFood: 'భోజనానికి ముందు',
      afterFood: 'భోజనం తర్వాత',
      withWater: 'నీటితో',
      notes: 'అదనపు గమనికలు',
      notifications: 'నోటిఫికేషన్ సెట్టింగ్స్',
      pushNotif: 'పుష్ నోటిఫికేషన్స్ (యాప్)',
      smsNotif: 'SMS నోటిఫికేషన్స్',
      voiceNotif: 'వాయిస్ నోటిఫికేషన్స్ (తెలుగు)',
      familyAlerts: 'కుటుంబ హెచ్చరికలు',
      addFamily: 'కుటుంబ సభ్యుని జోడించండి',
      familyName: 'పేరు',
      familyPhone: 'ఫోన్',
      familyRelation: 'సంబంధం',
      save: 'రిమైండర్ సేవ్ చేయండి',
      cancel: 'రద్దు',
      delete: 'తొలగించు',
      active: 'యాక్టివ్',
      completed: 'పూర్తయింది',
      noReminders: 'యాక్టివ్ రిమైండర్లు లేవు',
      enablePush: 'పుష్ నోటిఫికేషన్స్ ప్రారంభించండి',
      pushEnabled: 'పుష్ నోటిఫికేషన్స్ ప్రారంభించబడ్డాయి!',
      pushBlocked: 'దయచేసి బ్రౌజర్ సెట్టింగ్స్లో నోటిఫికేషన్లను అనుమతించండి'
    }
  }[lang];

  useEffect(() => {
    fetchReminders();
    checkPushPermission();
  }, []);

  useEffect(() => {
    updateTimingsBasedOnFrequency(formData.frequency);
  }, [formData.frequency]);

  const checkPushPermission = async () => {
    if ('Notification' in window) {
      setPushEnabled(Notification.permission === 'granted');
    }
  };

  const requestPushPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushEnabled(true);
        toast.success(t.pushEnabled);
        
        // Register service worker and subscribe to push
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY
        });

        // Send subscription to backend
        await fetch(`${import.meta.env.VITE_API_BASE}/api/reminders/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ subscription })
        });
      } else {
        toast.error(t.pushBlocked);
      }
    } catch (error) {
      console.error('Push permission error:', error);
      toast.error('Failed to enable notifications');
    }
  };

  const fetchReminders = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/reminders`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setReminders(data);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  const updateTimingsBasedOnFrequency = (frequency) => {
    const timingMap = {
      'once': ['09:00'],
      'twice': ['09:00', '21:00'],
      'thrice': ['09:00', '14:00', '21:00'],
      'four-times': ['08:00', '12:00', '16:00', '21:00']
    };
    setFormData(prev => ({ ...prev, timings: timingMap[frequency] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const reminderData = {
        medicineName: formData.medicineName,
        dosage: formData.dosage,
        frequency: formData.frequency,
        timings: formData.timings,
        duration: {
          startDate: formData.startDate,
          endDate: formData.endDate
        },
        instructions: {
          beforeFood: formData.beforeFood,
          afterFood: formData.afterFood,
          withWater: formData.withWater,
          notes: formData.notes
        },
        notifications: {
          push: formData.enablePush,
          sms: formData.enableSMS,
          voice: formData.enableVoice,
          language: formData.language
        },
        familyContacts: formData.familyContacts
      };

      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(reminderData)
      });

      if (response.ok) {
        toast.success(lang === 'en' ? 'Reminder created!' : 'రిమైండర్ సృష్టించబడింది!');
        setShowForm(false);
        fetchReminders();
        resetForm();
      }
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast.error('Failed to create reminder');
    } finally {
      setLoading(false);
    }
  };

  const deleteReminder = async (id) => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE}/api/reminders/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success(lang === 'en' ? 'Reminder deleted' : 'రిమైండర్ తొలగించబడింది');
      fetchReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  const addFamilyContact = () => {
    if (familyContact.name && familyContact.phone) {
      setFormData(prev => ({
        ...prev,
        familyContacts: [...prev.familyContacts, familyContact]
      }));
      setFamilyContact({ name: '', phone: '', relation: '' });
    }
  };

  const removeFamilyContact = (index) => {
    setFormData(prev => ({
      ...prev,
      familyContacts: prev.familyContacts.filter((_, i) => i !== index)
    }));
  };

  const resetForm = () => {
    setFormData({
      medicineName: '',
      dosage: '',
      frequency: 'twice',
      timings: ['09:00', '21:00'],
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      beforeFood: false,
      afterFood: false,
      withWater: true,
      notes: '',
      enablePush: true,
      enableSMS: false,
      enableVoice: true,
      language: lang,
      familyContacts: []
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-emerald-800">{t.title}</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
          >
            <Plus size={20} />
            {t.addNew}
          </button>
        </div>

        {/* Push Notification Enable Button */}
        {!pushEnabled && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="text-yellow-600" size={24} />
                <p className="text-yellow-800">{t.enablePush}</p>
              </div>
              <button
                onClick={requestPushPermission}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
              >
                {lang === 'en' ? 'Enable Now' : 'ఇప్పుడే ప్రారంభించండి'}
              </button>
            </div>
          </div>
        )}

        {/* Add Reminder Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Medicine Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.medicineName}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.medicineName}
                    onChange={(e) => setFormData({ ...formData, medicineName: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder={lang === 'en' ? 'e.g., Paracetamol' : 'ఉదా: పారాసెటమాల్'}
                  />
                </div>

                {/* Dosage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.dosage}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder={lang === 'en' ? 'e.g., 500mg' : 'ఉదా: 500mg'}
                  />
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.frequency}
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="once">{t.once}</option>
                    <option value="twice">{t.twice}</option>
                    <option value="thrice">{t.thrice}</option>
                    <option value="four-times">{t.fourTimes}</option>
                  </select>
                </div>

                {/* Timings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.timings}
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {formData.timings.map((time, index) => (
                      <input
                        key={index}
                        type="time"
                        value={time}
                        onChange={(e) => {
                          const newTimings = [...formData.timings];
                          newTimings[index] = e.target.value;
                          setFormData({ ...formData, timings: newTimings });
                        }}
                        className="p-2 border rounded-lg"
                      />
                    ))}
                  </div>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.startDate}
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.endDate}
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.instructions}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.beforeFood}
                      onChange={(e) => setFormData({ ...formData, beforeFood: e.target.checked, afterFood: false })}
                    />
                    {t.beforeFood}
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.afterFood}
                      onChange={(e) => setFormData({ ...formData, afterFood: e.target.checked, beforeFood: false })}
                    />
                    {t.afterFood}
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.withWater}
                      onChange={(e) => setFormData({ ...formData, withWater: e.target.checked })}
                    />
                    {t.withWater}
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.notes}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  rows="2"
                />
              </div>

              {/* Notification Settings */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.notifications}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.enablePush}
                      onChange={(e) => setFormData({ ...formData, enablePush: e.target.checked })}
                    />
                    {t.pushNotif}
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.enableVoice}
                      onChange={(e) => setFormData({ ...formData, enableVoice: e.target.checked })}
                    />
                    {t.voiceNotif}
                  </label>
                </div>
              </div>

              {/* Family Contacts */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.familyAlerts}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder={t.familyName}
                    value={familyContact.name}
                    onChange={(e) => setFamilyContact({ ...familyContact, name: e.target.value })}
                    className="p-2 border rounded-lg"
                  />
                  <input
                    type="tel"
                    placeholder={t.familyPhone}
                    value={familyContact.phone}
                    onChange={(e) => setFamilyContact({ ...familyContact, phone: e.target.value })}
                    className="p-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder={t.familyRelation}
                    value={familyContact.relation}
                    onChange={(e) => setFamilyContact({ ...familyContact, relation: e.target.value })}
                    className="p-2 border rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={addFamilyContact}
                    className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-200"
                  >
                    {t.addFamily}
                  </button>
                </div>

                {/* Display added family contacts */}
                {formData.familyContacts.map((contact, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg mb-2">
                    <div className="flex items-center gap-2">
                      <User size={16} />
                      <span>{contact.name} - {contact.phone} ({contact.relation})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFamilyContact(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? (lang === 'en' ? 'Saving...' : 'సేవ్ చేస్తోంది...') : t.save}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reminders List */}
        <div className="space-y-4">
          {reminders.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              <Clock size={48} className="mx-auto mb-4 text-gray-300" />
              <p>{t.noReminders}</p>
            </div>
          ) : (
            reminders.map((reminder) => (
              <div key={reminder._id} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-emerald-800">{reminder.medicineName}</h3>
                    <p className="text-gray-600">{reminder.dosage}</p>
                    
                    <div className="mt-2 flex flex-wrap gap-2">
                      {reminder.timings.map((time, index) => (
                        <span key={index} className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm">
                          <Clock size={14} className="inline mr-1" />
                          {time}
                        </span>
                      ))}
                    </div>

                    {reminder.instructions.notes && (
                      <p className="mt-2 text-sm text-gray-600">📝 {reminder.instructions.notes}</p>
                    )}

                    <div className="mt-2 text-sm text-gray-500">
                      {new Date(reminder.duration.startDate).toLocaleDateString()} - {new Date(reminder.duration.endDate).toLocaleDateString()}
                    </div>

                    {reminder.familyContacts && reminder.familyContacts.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          <Phone size={14} className="inline mr-1" />
                          Family alerts: {reminder.familyContacts.map(c => c.name).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => deleteReminder(reminder._id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MedicineReminders;
