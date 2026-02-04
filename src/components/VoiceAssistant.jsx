import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

const VoiceAssistant = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang } = useLanguage();
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  
  // Hide Vani on first-aid page (MediBot has its own voice)
  if (location.pathname === '/firstaid' || location.pathname === '/first-aid') {
    return null;
  }

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      // Update language based on app language
      const langCode = lang === 'en' ? 'en-US' : 'te-IN';
      recognitionRef.current.lang = langCode;

      recognitionRef.current.onresult = (event) => {
        const speechResult = event.results[0][0].transcript;
        setTranscript(speechResult);
        handleVoiceCommand(speechResult);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        speak(lang === 'en' ? 'Sorry, I could not understand' : 'క్షమించండి, నేను అర్థం చేసుకోలేకపోయాను');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [lang]); // Re-initialize when language changes

  // Text-to-speech function
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'en' ? 'en-US' : 'te-IN';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // Start listening
  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript('');
      
      // Update language before starting to ensure correct recognition
      const langCode = lang === 'en' ? 'en-US' : 'te-IN';
      recognitionRef.current.lang = langCode;
      
      setIsListening(true);
      setIsExpanded(true);
      recognitionRef.current.start();
      
      const greeting = lang === 'en' 
        ? 'Hello! How can I help you?' 
        : 'నమస్కారం! నేను మీకు ఎలా సహాయం చేయగలను?';
      speak(greeting);
    } else {
      toast.error('Voice recognition is not supported in your browser');
    }
  };

  // Stop listening
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Handle action commands (add, delete, book, etc.)
  const handleActionCommand = (command) => {
    console.log('🎤 Vani checking action command:', command);
    
    // ===== Complex Appointment Booking with Hospital, Date, and Time (Check FIRST) =====
    // Handles: "book visit to", "visit to", "appointment at", "schedule at"
    if ((command.includes('visit') || command.includes('appointment')) && 
        (command.includes('to') || command.includes('at')) &&
        !command.includes('severity') && !command.includes('level')) {
      
      console.log('🏥 Detected potential appointment booking command');
      
      let hospitalName = '';
      let appointmentDate = '';
      let appointmentTime = '';
      
      // Extract hospital name - more flexible patterns
      // Handles: "to Sai hospitals", "at SaiHospitals", "visit to Apollo"
      const hospitalPatterns = [
        /(?:to|at|visit)\s+([A-Za-z]+\s*[Hh]ospitals?)/i,
        /(?:to|at)\s+([A-Z][a-z]+(?:\s+[A-Za-z]+)?)/i,
        /([A-Z][a-z]+\s*[Hh]ospitals?)/i
      ];
      
      for (const pattern of hospitalPatterns) {
        const match = command.match(pattern);
        if (match && match[1]) {
          hospitalName = match[1].trim();
          // Capitalize first letter of each word
          hospitalName = hospitalName.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
          console.log('Extracted hospital:', hospitalName);
          break;
        }
      }
      
      // Extract date - handles "3rd february", "on 5th march", etc.
      const datePatterns = [
        /on\s+(\d+(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december))/i,
        /(\d+(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december))/i,
        /(tomorrow|today|day after tomorrow)/i
      ];
      
      for (const pattern of datePatterns) {
        const match = command.match(pattern);
        if (match) {
          appointmentDate = match[1];
          console.log('Extracted date:', appointmentDate);
          break;
        }
      }
      
      // Extract time - handles "10 pm", "10:00 pm", "10:00 p.m.", "9:30 am"
      const timePatterns = [
        /(?:at\s+)?(\d{1,2}):(\d{2})\s*(?:p\.?m\.?|a\.?m\.?)/i,
        /(?:at\s+)?(\d{1,2})\s*(?:p\.?m\.?|a\.?m\.?)/i
      ];
      
      for (const pattern of timePatterns) {
        const match = command.match(pattern);
        if (match) {
          let hour = parseInt(match[1]);
          const minute = match[2] || '00';
          const meridiemMatch = command.match(/p\.?m\.?|a\.?m\.?/i);
          
          if (meridiemMatch) {
            const meridiem = meridiemMatch[0].toLowerCase();
            if (meridiem.startsWith('p') && hour < 12) hour += 12;
            if (meridiem.startsWith('a') && hour === 12) hour = 0;
          }
          
          appointmentTime = `${hour.toString().padStart(2, '0')}:${minute}`;
          console.log('Extracted time:', appointmentTime);
          break;
        }
      }
      
      console.log('📋 Appointment details:', { hospitalName, appointmentDate, appointmentTime });
      
      if (hospitalName || appointmentDate || appointmentTime) {
        // Store appointment details in localStorage for doctors page
        const appointmentDetails = {
          hospitalName: hospitalName,
          appointmentDate: appointmentDate,
          appointmentTime: appointmentTime,
          fromVani: true,
          timestamp: Date.now()
        };
        
        localStorage.setItem('vani_appointment_booking', JSON.stringify(appointmentDetails));
        
        let msg = lang === 'en' ? 'Booking appointment' : 'అపాయింట్మెంట్ బుక్ చేస్తున్నాను';
        
        if (hospitalName) msg += ` ${lang === 'en' ? 'at' : ''} ${hospitalName}`;
        if (appointmentDate) msg += ` ${lang === 'en' ? 'on' : ''} ${appointmentDate}`;
        if (appointmentTime) msg += ` ${lang === 'en' ? 'at' : ''} ${appointmentTime}`;
        
        msg += lang === 'en' ? '. Opening doctors page to complete booking.' : '. బుకింగ్ పూర్తి చేయడానికి డాక్టర్ల పేజీ తెరుస్తున్నాను.';
        
        speak(msg);
        toast.success(msg, { duration: 2000 });
        
        // Navigate to DOCTORS page IMMEDIATELY (not appointments)
        console.log('🚀 [BOOKING CODE] Navigating to /doctors page NOW');
        navigate('/doctors');
        return true;
      }
    }
    
    // ===== Symptom Tracker Commands =====
    // More specific severity detection to avoid conflicts with appointment times
    const severityKeywords = ['severity', 'level', 'rating', 'scale', 'score'];
    const hasSeverityKeyword = severityKeywords.some(keyword => command.includes(keyword));
    const hasNumber = /\b(\d+)\b/.test(command);
    const hasActionWord = /\b(set|make|change|update)\b/i.test(command);
    
    // Exclude if it looks like an appointment (has hospital/date/time patterns)
    const hasHospitalKeyword = /hospitals?/i.test(command);
    const hasDatePattern = /(january|february|march|april|may|june|july|august|september|october|november|december|tomorrow|today)/i.test(command);
    const hasTimePattern = /(p\.?m\.?|a\.?m\.?|:\d{2})/i.test(command);
    const looksLikeAppointment = hasHospitalKeyword || hasDatePattern || hasTimePattern;
    
    // Only match if has severity keyword OR (fever/cough AND number AND action word)
    // AND doesn't look like an appointment booking
    const isSeverityCommand = !looksLikeAppointment && 
                               ((hasSeverityKeyword && hasNumber) || 
                                ((command.includes('fever') || command.includes('cough')) && hasNumber && hasActionWord));
    
    console.log('Severity check:', { hasSeverityKeyword, hasNumber, hasActionWord, looksLikeAppointment, isSeverityCommand });
    
    if (isSeverityCommand) {
      
      console.log('✅ Matched severity command!');
      
      // Extract severity level (1-10)
      const severityMatch = command.match(/\b(\d+)\b/);
      
      if (severityMatch) {
        const severityLevel = parseInt(severityMatch[1]);
        
        if (severityLevel >= 1 && severityLevel <= 10) {
          console.log('Setting severity to:', severityLevel);
          
          // Dispatch custom event to update tracker page
          window.dispatchEvent(new CustomEvent('vani-set-severity', { 
            detail: { severity: severityLevel } 
          }));
          
          const msg = lang === 'en'
            ? `Severity set to ${severityLevel} out of 10`
            : `తీవ్రత ${severityLevel} కు సెట్ చేయబడింది`;
          speak(msg);
          toast.success(msg);
          return true;
        }
      }
      
      const msg = lang === 'en'
        ? 'Please say a number between 1 and 10. For example: set severity to 8'
        : 'దయచేసి 1 నుండి 10 మధ్య సంఖ్యను చెప్పండి';
      speak(msg);
      toast.info(msg);
      return true;
    }

    // Change symptom type
    if ((command.includes('change') || command.includes('select') || command.includes('switch')) && 
        (command.includes('symptom') || command.includes('fever') || command.includes('cough') || 
         command.includes('headache') || command.includes('fatigue') || command.includes('nausea'))) {
      
      let symptomType = '';
      
      if (command.includes('fever')) symptomType = 'Fever';
      else if (command.includes('cough')) symptomType = 'Cough';
      else if (command.includes('headache') || command.includes('head ache')) symptomType = 'Headache';
      else if (command.includes('fatigue') || command.includes('tired')) symptomType = 'Fatigue';
      else if (command.includes('nausea') || command.includes('vomit')) symptomType = 'Nausea';
      else if (command.includes('body pain') || command.includes('pain')) symptomType = 'Body Pain';
      
      if (symptomType) {
        window.dispatchEvent(new CustomEvent('vani-set-symptom', { 
          detail: { symptom: symptomType } 
        }));
        
        const msg = lang === 'en'
          ? `Symptom changed to ${symptomType}`
          : `లక్షణం ${symptomType} కు మార్చబడింది`;
        speak(msg);
        toast.success(msg);
        return true;
      }
    }

    // Record/Save symptom log
    if ((command.includes('record') || command.includes('save') || command.includes('log')) && 
        (command.includes('symptom') || command.includes('tracker') || command.includes('entry'))) {
      
      window.dispatchEvent(new CustomEvent('vani-save-log'));
      
      const msg = lang === 'en'
        ? 'Recording symptom log...'
        : 'లక్షణ లాగ్ రికార్డ్ చేస్తున్నాను...';
      speak(msg);
      return true;
    }

    // ===== Wellness Page Commands =====
    // Add water/hydration
    if ((command.includes('add') || command.includes('drink') || command.includes('log')) && 
        (command.includes('water') || command.includes('cup') || command.includes('hydration'))) {
      
      window.dispatchEvent(new CustomEvent('vani-add-water'));
      
      const msg = lang === 'en'
        ? 'Added one cup of water to your hydration tracker'
        : 'మీ హైడ్రేషన్ ట్రాకర్‌కు ఒక కప్పు నీరు జోడించబడింది';
      speak(msg);
      toast.success(msg);
      return true;
    }

    // Set mood
    if ((command.includes('set') || command.includes('log') || command.includes('my')) && 
        (command.includes('mood') || command.includes('feeling'))) {
      
      let moodType = '';
      if (command.includes('happy') || command.includes('good') || command.includes('great')) moodType = 'happy';
      else if (command.includes('okay') || command.includes('fine') || command.includes('neutral')) moodType = 'neutral';
      else if (command.includes('sad') || command.includes('bad') || command.includes('down')) moodType = 'sad';
      
      if (moodType) {
        window.dispatchEvent(new CustomEvent('vani-set-mood', { detail: { mood: moodType } }));
        const msg = lang === 'en'
          ? `Mood logged as ${moodType}`
          : `మానసిక స్థితి ${moodType} గా లాగ్ చేయబడింది`;
        speak(msg);
        toast.success(msg);
        return true;
      }
    }

    // Switch tabs on wellness page
    if ((command.includes('open') || command.includes('show') || command.includes('switch to')) && 
        (command.includes('diet') || command.includes('habits') || command.includes('bmi') || command.includes('assess'))) {
      
      let tab = '';
      if (command.includes('diet') || command.includes('meal') || command.includes('food')) tab = 'diet';
      else if (command.includes('habit') || command.includes('water') || command.includes('mood')) tab = 'habits';
      else if (command.includes('bmi') || command.includes('assess') || command.includes('calculator')) tab = 'assess';
      
      if (tab) {
        window.dispatchEvent(new CustomEvent('vani-switch-tab', { detail: { tab } }));
        const msg = lang === 'en'
          ? `Switching to ${tab} tab`
          : `${tab} ట్యాబ్‌కు మారుతోంది`;
        speak(msg);
        return true;
      }
    }
    
    // ===== COMPLEX: Add Family Member with Details =====
    if ((command.includes('add') || command.includes('create')) && 
        (command.includes('family member') || command.includes('family') || command.includes('కుటుంబ సభ్యుడు'))) {
      
      // Extract name and age from command
      let memberName = '';
      let memberAge = '';
      
      // Patterns: "add family member named John age 25" or "add a family member whose name is John and age is 25"
      const namePattern1 = /(?:named|name is|called)\s+(\w+(?:\s+\w+)?)/i;
      const namePattern2 = /member\s+(\w+(?:\s+\w+)?)\s+(?:age|of age)/i;
      const agePattern = /age\s+(?:is\s+)?(\d+)/i;
      
      const nameMatch = command.match(namePattern1) || command.match(namePattern2);
      const ageMatch = command.match(agePattern);
      
      if (nameMatch) {
        memberName = nameMatch[1].trim();
      }
      if (ageMatch) {
        memberAge = ageMatch[1];
      }
      
      if (memberName && memberAge) {
        // Create family member with extracted data
        const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
        
        if (!navigator.onLine) {
          const msg = lang === 'en' 
            ? 'Cannot add family member offline. Please connect to internet.'
            : 'ఆఫ్‌లైన్‌లో కుటుంబ సభ్యుడిని జోడించలేము. దయచేసి ఇంటర్నెట్‌కు కనెక్ట్ అవ్వండి.';
          speak(msg);
          toast.error(msg);
          return true;
        }
        
        const payload = {
          name: memberName.charAt(0).toUpperCase() + memberName.slice(1),
          age: parseInt(memberAge),
          relationship: 'Other', // Default
          gender: 'Male', // Default
          allergies: [],
          chronicConditions: []
        };
        
        const token = localStorage.getItem('token');
        
        if (!token) {
          const msg = lang === 'en' 
            ? 'Please log in first to add family members.'
            : 'కుటుంబ సభ్యులను జోడించడానికి దయచేసి మొదట లాగిన్ అవ్వండి.';
          speak(msg);
          toast.error(msg);
          return true;
        }
        
        speak(lang === 'en' 
          ? `Adding family member ${memberName}, age ${memberAge}. Please wait...`
          : `కుటుంబ సభ్యుడు ${memberName}, వయస్సు ${memberAge} జోడిస్తున్నాను. దయచేసి వేచి ఉండండి...`);
        
        toast.loading('Creating family member...', { id: 'family-create' });
        
        // Use the exact same method as FamilyProfile.jsx
        fetch(`${API}/api/family`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token
          },
          body: JSON.stringify(payload)
        })
        .then(async res => {
          const data = await res.json();
          
          if (!res.ok) {
            // Server returned an error
            throw new Error(data.msg || data.message || `HTTP error! status: ${res.status}`);
          }
          
          return data;
        })
        .then(data => {
          toast.dismiss('family-create');
          
          const successMsg = lang === 'en'
            ? `Family member ${memberName} added successfully! Refreshing page...`
            : `కుటుంబ సభ్యుడు ${memberName} విజయవంతంగా జోడించబడింది!`;
          speak(successMsg);
          toast.success(successMsg);
          
          // Reload the page to show the new member
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        })
        .catch(err => {
          toast.dismiss('family-create');
          console.error('Family member creation error:', err);
          const errorMsg = lang === 'en'
            ? `Could not add family member: ${err.message}. Please check your login and try again.`
            : `కుటుంబ సభ్యుడిని జోడించలేకపోయింది. దయచేసి మీ లాగిన్ చెక్ చేసి మళ్ళీ ప్రయత్నించండి.`;
          speak(errorMsg);
          toast.error(errorMsg);
        });
        
        return true;
      } else {
        // Missing information
        const msg = lang === 'en'
          ? `Please say the name and age. For example: add family member named John age 25`
          : `దయచేసి పేరు మరియు వయస్సు చెప్పండి. ఉదాహరణ: జాన్ అనే కుటుంబ సభ్యుడిని జోడించండి వయస్సు 25`;
        speak(msg);
        toast.info(msg);
        return true;
      }
    }

    // ===== Add Medicine Commands with Dosage and Time =====
    if (command.includes('add') && (command.includes('medicine') || command.includes('మందు'))) {
      
      // Extract medicine name, dosage, and time
      let medicineName = '';
      let dosage = '1';
      let time = '08:00';
      
      // Extract medicine name
      const medicineIndex = command.indexOf('medicine');
      if (medicineIndex !== -1) {
        let afterMedicine = command.substring(medicineIndex + 8).trim();
        afterMedicine = afterMedicine.replace(/^(named |called |name |is )/i, '').trim();
        
        // Extract dosage if mentioned: "2 tablets", "3 times", "twice"
        const dosageMatch = afterMedicine.match(/(\d+)\s*(?:tablet|pill|time|dose)/i);
        if (dosageMatch) {
          dosage = dosageMatch[1];
          afterMedicine = afterMedicine.replace(dosageMatch[0], '').trim();
        }
        
        // Handle "twice", "thrice"
        if (afterMedicine.includes('twice')) {
          dosage = '2';
          afterMedicine = afterMedicine.replace(/twice/i, '').trim();
        }
        if (afterMedicine.includes('thrice') || afterMedicine.includes('three times')) {
          dosage = '3';
          afterMedicine = afterMedicine.replace(/thrice|three times/i, '').trim();
        }
        
        // Extract time if mentioned: "at 9 am", "at 8:30", "in the morning"
        const timeMatch = afterMedicine.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        if (timeMatch) {
          let hour = parseInt(timeMatch[1]);
          const minute = timeMatch[2] || '00';
          const meridiem = timeMatch[3]?.toLowerCase();
          
          if (meridiem === 'pm' && hour < 12) hour += 12;
          if (meridiem === 'am' && hour === 12) hour = 0;
          
          time = `${hour.toString().padStart(2, '0')}:${minute}`;
          afterMedicine = afterMedicine.replace(timeMatch[0], '').trim();
        }
        
        // Handle phrases like "in the morning", "at night"
        if (afterMedicine.includes('morning')) {
          time = '08:00';
          afterMedicine = afterMedicine.replace(/in the morning|morning/i, '').trim();
        } else if (afterMedicine.includes('night') || afterMedicine.includes('evening')) {
          time = '20:00';
          afterMedicine = afterMedicine.replace(/at night|night|evening/i, '').trim();
        } else if (afterMedicine.includes('afternoon')) {
          time = '14:00';
          afterMedicine = afterMedicine.replace(/afternoon/i, '').trim();
        }
        
        // Clean up remaining text to get medicine name
        afterMedicine = afterMedicine.replace(/(\s+to the list|\s+to list|\s+please|\s+thanks|\s+and|\s+with)$/i, '').trim();
        medicineName = afterMedicine;
      }
      
      // Telugu pattern
      if (!medicineName && command.includes('మందు')) {
        const teluguMatch = command.match(/మందు జోడించు (.+)/i);
        if (teluguMatch) {
          medicineName = teluguMatch[1].trim();
        }
      }
      
      if (medicineName && medicineName.length > 0) {
        // Add to localStorage
        const existingReminders = JSON.parse(localStorage.getItem('med_reminders') || '[]');
        const newReminder = {
          id: Date.now(),
          name: medicineName.charAt(0).toUpperCase() + medicineName.slice(1),
          medicine: medicineName.charAt(0).toUpperCase() + medicineName.slice(1),
          dosage: dosage,
          time: time,
          frequency: 'daily',
          active: true,
          createdAt: new Date().toISOString()
        };
        
        existingReminders.push(newReminder);
        localStorage.setItem('med_reminders', JSON.stringify(existingReminders));
        
        const successMsg = lang === 'en' 
          ? `Medicine ${medicineName} added! Dosage: ${dosage} tablet${dosage > 1 ? 's' : ''}, Time: ${time}. You can edit other details on the medicines page.`
          : `${medicineName} మందు జోడించబడింది! మోతాదు: ${dosage}, సమయం: ${time}. మీరు మందుల పేజీలో ఇతర వివరాలను సవరించవచ్చు.`;
        
        speak(successMsg);
        toast.success(successMsg);
        
        // Navigate to reminders page to show the new medicine
        setTimeout(() => navigate('/reminders'), 1500);
        return true;
      } else {
        // Could not extract medicine name
        const errorMsg = lang === 'en' 
          ? 'Please say the medicine name. For example: add medicine paracetamol'
          : 'దయచేసి మందు పేరు చెప్పండి. ఉదాహరణ: పారాసిటమాల్ మందు జోడించు';
        speak(errorMsg);
        toast.error(errorMsg);
        return true;
      }
    }

    // ===== Complex Appointment Booking with Hospital, Date, and Time =====
    // Handles: "book visit to", "visit to", "appointment at", "schedule at"
    if ((command.includes('visit') || command.includes('appointment')) && 
        (command.includes('to') || command.includes('at'))) {
      
      console.log('🏥 Detected potential appointment booking command');
      
      let hospitalName = '';
      let appointmentDate = '';
      let appointmentTime = '';
      
      // Extract hospital name - more flexible patterns
      // Handles: "to Sai hospitals", "at SaiHospitals", "visit to Apollo"
      const hospitalPatterns = [
        /(?:to|at|visit)\s+([A-Za-z]+\s*[Hh]ospitals?)/i,
        /(?:to|at)\s+([A-Z][a-z]+(?:\s+[A-Za-z]+)?)/i,
        /([A-Z][a-z]+\s*[Hh]ospitals?)/i
      ];
      
      for (const pattern of hospitalPatterns) {
        const match = command.match(pattern);
        if (match && match[1]) {
          hospitalName = match[1].trim();
          // Capitalize first letter of each word
          hospitalName = hospitalName.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
          console.log('Extracted hospital:', hospitalName);
          break;
        }
      }
      
      // Extract date - handles "3rd february", "on 5th march", etc.
      const datePatterns = [
        /on\s+(\d+(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december))/i,
        /(\d+(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december))/i,
        /(tomorrow|today|day after tomorrow)/i
      ];
      
      for (const pattern of datePatterns) {
        const match = command.match(pattern);
        if (match) {
          appointmentDate = match[1];
          console.log('Extracted date:', appointmentDate);
          break;
        }
      }
      
      // Extract time - handles "10 pm", "10:00 pm", "10:00 p.m.", "9:30 am"
      const timePatterns = [
        /(?:at\s+)?(\d{1,2}):(\d{2})\s*(?:p\.?m\.?|a\.?m\.?)/i,
        /(?:at\s+)?(\d{1,2})\s*(?:p\.?m\.?|a\.?m\.?)/i
      ];
      
      for (const pattern of timePatterns) {
        const match = command.match(pattern);
        if (match) {
          let hour = parseInt(match[1]);
          const minute = match[2] || '00';
          const meridiemMatch = command.match(/p\.?m\.?|a\.?m\.?/i);
          
          if (meridiemMatch) {
            const meridiem = meridiemMatch[0].toLowerCase();
            if (meridiem.startsWith('p') && hour < 12) hour += 12;
            if (meridiem.startsWith('a') && hour === 12) hour = 0;
          }
          
          appointmentTime = `${hour.toString().padStart(2, '0')}:${minute}`;
          console.log('Extracted time:', appointmentTime);
          break;
        }
      }
      
      console.log('📋 Appointment details:', { hospitalName, appointmentDate, appointmentTime });
      
      if (hospitalName || appointmentDate || appointmentTime) {
        // Dispatch event to book appointment with details
        window.dispatchEvent(new CustomEvent('vani-book-appointment', {
          detail: {
            hospital: hospitalName,
            date: appointmentDate,
            time: appointmentTime
          }
        }));
        
        let msg = lang === 'en' ? 'Booking appointment' : 'అపాయింట్మెంట్ బుక్ చేస్తున్నాను';
        
        if (hospitalName) msg += ` ${lang === 'en' ? 'at' : ''} ${hospitalName}`;
        if (appointmentDate) msg += ` ${lang === 'en' ? 'on' : ''} ${appointmentDate}`;
        if (appointmentTime) msg += ` ${lang === 'en' ? 'at' : ''} ${appointmentTime}`;
        
        msg += lang === 'en' ? '. Opening booking form...' : '. బుకింగ్ ఫారమ్ తెరుస్తున్నాను...';
        
        speak(msg);
        toast.success(msg);
        
        // Navigate to doctors page (not appointments) after a brief delay
        setTimeout(() => navigate('/doctors'), 1000);
        return true;
      }
    }

    // ===== COMPLEX: Book Appointment with Details =====
    // Check if this is a booking command with hospital name, date, or time details
    const hasVisitKeyword = command.includes('visit');
    const hasBookKeyword = command.includes('book');
    const hasHospitalMention = command.includes('hospital') || command.includes('clinic') || command.includes('doctor');
    const hasDateTimeInfo = /(?:on|at|in|for|tomorrow|today|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}:\d{2}|a\.?m\.?|p\.?m\.?)/i.test(command);
    
    const isComplexBooking = ((hasVisitKeyword || hasBookKeyword) && hasHospitalMention) || 
                             (hasHospitalMention && hasDateTimeInfo);
    
    console.log('Appointment detection:', { hasVisitKeyword, hasBookKeyword, hasHospitalMention, hasDateTimeInfo, isComplexBooking });
    
    if (isComplexBooking) {
      console.log('✅ Complex appointment booking triggered!');
      
      // Extract hospital/doctor name, date, and time
      let hospitalName = '';
      let appointmentDate = '';
      let appointmentTime = '';
      
      // Extract hospital/doctor name - try multiple patterns
      // Pattern 1: "visit to [NAME] on/at"
      const hospitalPattern1 = /(?:visit to|visit|go to|book at|appointment at|appointment with|with)\s+([\w\s]+?)(?:\s+on\s|\s+at\s|\s+for\s|\s+in\s)/i;
      // Pattern 2: "[NAME] hospital(s)" or "[NAME] clinic"
      const hospitalPattern2 = /([\w\s]+?)\s+(?:hospital|hospitals|clinic|clinics)/i;
      // Pattern 3: Just grab text between "to" and date keywords
      const hospitalPattern3 = /to\s+([\w\s]+?)(?:\s+on|\s+tomorrow|\s+today|\s+january|\s+february|\s+march|\s+april|\s+may|\s+june|\s+july|\s+august|\s+september|\s+october|\s+november|\s+december)/i;
      
      let hospitalMatch = command.match(hospitalPattern1) || command.match(hospitalPattern2) || command.match(hospitalPattern3);
      
      if (hospitalMatch) {
        hospitalName = hospitalMatch[1].trim();
        console.log('Extracted hospital name:', hospitalName);
      }
      
      // Extract date - month and day
      const datePattern = /(?:on|for)?\s*(january|february|march|april|may|june|july|august|september|october|november|december|tomorrow|today)?\s*(\d{1,2})?/i;
      const dateMatch = command.match(datePattern);
      
      if (dateMatch) {
        const month = dateMatch[1];
        const day = dateMatch[2];
        
        if (month && day) {
          const monthMap = {
            'january': '01', 'february': '02', 'march': '03', 'april': '04',
            'may': '05', 'june': '06', 'july': '07', 'august': '08',
            'september': '09', 'october': '10', 'november': '11', 'december': '12'
          };
          const monthNum = monthMap[month.toLowerCase()];
          const currentYear = new Date().getFullYear();
          appointmentDate = `${currentYear}-${monthNum}-${day.padStart(2, '0')}`;
        } else if (month === 'today') {
          const today = new Date();
          appointmentDate = today.toISOString().split('T')[0];
        } else if (month === 'tomorrow') {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          appointmentDate = tomorrow.toISOString().split('T')[0];
        }
      }
      
      // Extract time - handle "10:00 am/pm", "10 am", etc.
      const timePattern = /(?:at)?\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i;
      const timeMatch = command.match(timePattern);
      
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const minute = timeMatch[2] || '00';
        const meridiem = timeMatch[3].replace(/\./g, '').toLowerCase();
        
        if (meridiem === 'pm' && hour < 12) hour += 12;
        if (meridiem === 'am' && hour === 12) hour = 0;
        
        appointmentTime = `${hour.toString().padStart(2, '0')}:${minute}`;
      }
      
      console.log('Appointment extraction:', { hospitalName, appointmentDate, appointmentTime });
      
      // If we have at least hospital name, proceed
      if (hospitalName && hospitalName.length > 0) {
        console.log('✅ Hospital name found, proceeding to book:', hospitalName);
        // Use current date/time if not provided
        if (!appointmentDate) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          appointmentDate = tomorrow.toISOString().split('T')[0];
        }
        if (!appointmentTime) {
          appointmentTime = '10:00';
        }
        
        // Store appointment details in localStorage for doctors page to use
        const appointmentDetails = {
          hospitalName: hospitalName.charAt(0).toUpperCase() + hospitalName.slice(1),
          appointmentDate: appointmentDate,
          appointmentTime: appointmentTime,
          fromVani: true,
          timestamp: Date.now()
        };
        
        localStorage.setItem('vani_appointment_booking', JSON.stringify(appointmentDetails));
        
        const msg = lang === 'en'
          ? `Opening doctors page to book your appointment at ${hospitalName} on ${appointmentDate} at ${appointmentTime}`
          : `${hospitalName} వద్ద ${appointmentDate} తేదీన ${appointmentTime} కు మీ అపాయింట్మెంట్ బుక్ చేయడానికి డాక్టర్ల పేజీ తెరుస్తున్నాను`;
        
        speak(msg);
        toast.success(msg);
        
        // Navigate to doctors page where booking will happen
        console.log('🚀 Navigating to /doctors page with booking data');
        navigate('/doctors');
        
        return true;
      } else {
        // Missing hospital name - show error
        console.log('❌ Hospital name not found or empty. Hospitalname:', hospitalName);
        const msg = lang === 'en'
          ? 'Please say the hospital name, date, and time. For example: visit Sai hospital on February 5 at 10 am'
          : 'దయచేసి హాస్పిటల్ పేరు, తేదీ మరియు సమయం చెప్పండి. ఉదాహరణ: ఫిబ్రవరి 5 న ఉదయం 10 గంటలకు సాయి హాస్పిటల్ సందర్శించండి';
        speak(msg);
        toast.info(msg);
        // Don't navigate to appointments, stay on current page
        return true;
      }
    }

    // Book Appointment Commands (Simple - fallback)
    if (command.includes('book appointment') || command.includes('book doctor') ||
        command.includes('schedule appointment') || command.includes('make appointment') ||
        command.includes('book an appointment') || command.includes('అపాయింట్మెంట్ బుక్')) {
      
      navigate('/appointments');
      const msg = lang === 'en'
        ? 'Opening appointments page. You can book an appointment there.'
        : 'అపాయింట్మెంట్ పేజీ తెరుస్తున్నాను. మీరు అక్కడ బుక్ చేసుకోవచ్చు.';
      speak(msg);
      return true;
    }

    // Delete/Remove Medicine Commands
    if (command.includes('delete medicine') || command.includes('remove medicine') ||
        command.includes('మందు తొలగించు')) {
      
      const msg = lang === 'en'
        ? 'Opening your medicines list. You can delete any medicine from there.'
        : 'మీ మందుల జాబితా తెరుస్తున్నాను. మీరు అక్కడ నుండి ఏదైనా మందు తొలగించవచ్చు.';
      speak(msg);
      navigate('/reminders');
      return true;
    }

    // Read medicines list
    if (command.includes('read my medicines') || command.includes('what medicines') ||
        command.includes('my medicines') || command.includes('show medicines') ||
        command.includes('నా మందులు చదవండి') || command.includes('ఏ మందులు')) {
      
      const reminders = JSON.parse(localStorage.getItem('med_reminders') || '[]');
      
      if (reminders.length === 0) {
        const msg = lang === 'en'
          ? 'You have no medicines in your reminders'
          : 'మీ రిమైండర్లలో మందులు లేవు';
        speak(msg);
      } else {
        // Use 'name' field if available, fallback to 'medicine'
        const medicineNames = reminders.map(r => r.name || r.medicine).filter(Boolean).join(', ');
        const msg = lang === 'en'
          ? `You have ${reminders.length} medicine${reminders.length > 1 ? 's' : ''}: ${medicineNames}`
          : `మీకు ${reminders.length} మందులు ఉన్నాయి: ${medicineNames}`;
        speak(msg);
      }
      return true;
    }

    // Read latest report
    if (command.includes('read latest report') || command.includes('read my report') ||
        command.includes('చివరి రిపోర్ట్ చదవండి')) {
      
      const records = JSON.parse(localStorage.getItem('health_records') || '[]');
      
      if (records.length === 0) {
        const msg = lang === 'en'
          ? 'You have no health records'
          : 'మీకు ఆరోగ్య రికార్డులు లేవు';
        speak(msg);
      } else {
        const latestRecord = records[records.length - 1];
        const msg = lang === 'en'
          ? `Your latest report is ${latestRecord.title} from ${new Date(latestRecord.date).toLocaleDateString()}`
          : `మీ చివరి రిపోర్ట్ ${latestRecord.title}, తేదీ ${new Date(latestRecord.date).toLocaleDateString()}`;
        speak(msg);
      }
      return true;
    }

    // Add Health Record Commands
    if (command.includes('add record') || command.includes('add health record') || 
        command.includes('add new record') || command.includes('add report') ||
        command.includes('create record') || command.includes('new record') ||
        command.includes('రికార్డ్ జోడించు') || command.includes('రిపోర్ట్ జోడించు')) {
      
      navigate('/records');
      const msg = lang === 'en'
        ? 'Opening health records page. You can add a new record there by clicking the plus button.'
        : 'ఆరోగ్య రికార్డుల పేజీ తెరుస్తున్నాను. మీరు అక్కడ ప్లస్ బటన్ నొక్కి కొత్త రికార్డ్ జోడించవచ్చు.';
      speak(msg);
      toast.info(msg);
      return true;
    }

    // Count/Read all records
    if (command.includes('how many records') || command.includes('count records') ||
        command.includes('ఎన్ని రికార్డులు') || command.includes('రికార్డుల సంఖ్య')) {
      
      const records = JSON.parse(localStorage.getItem('health_records') || '[]');
      const msg = lang === 'en'
        ? `You have ${records.length} health records`
        : `మీకు ${records.length} ఆరోగ్య రికార్డులు ఉన్నాయి`;
      speak(msg);
      return true;
    }

    // Check appointments
    if (command.includes('check appointments') || command.includes('my appointments') ||
        command.includes('నా అపాయింట్మెంట్లు చెక్ చేయండి')) {
      
      navigate('/patient-appointments');
      const msg = lang === 'en'
        ? 'Opening your appointments'
        : 'మీ అపాయింట్మెంట్లు తెరుస్తున్నాను';
      speak(msg);
      return true;
    }

    // Find Hospitals/Health Centers Near Me
    if (command.includes('find hospital') || command.includes('hospital near') || 
        command.includes('hospitals near me') || command.includes('nearby hospital') ||
        command.includes('health center') || command.includes('find health center') ||
        command.includes('హాస్పిటల్ కనుగొనండి') || command.includes('దగ్గర హాస్పిటల్') ||
        command.includes('ఆరోగ్య కేంద్రం')) {
      
      const msg = lang === 'en'
        ? 'Getting your location to find nearby hospitals...'
        : 'దగ్గరి హాస్పిటల్లను కనుగొనడానికి మీ స్థానాన్ని పొందుతున్నాను...';
      speak(msg);
      toast.loading(msg, { id: 'location' });

      // Get user's location
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            
            // Save location to localStorage for doctors page to use
            localStorage.setItem('user_location', JSON.stringify({
              lat: latitude,
              lng: longitude,
              timestamp: new Date().toISOString()
            }));

            toast.dismiss('location');
            const successMsg = lang === 'en'
              ? 'Location found! Searching for nearby hospitals...'
              : 'స్థానం దొరికింది! దగ్గరి హాస్పిటల్లను వెతుకుతున్నాను...';
            speak(successMsg);
            toast.success(successMsg);

            // Navigate to doctors page
            navigate('/doctors');
          },
          (error) => {
            console.error('Geolocation error:', error);
            toast.dismiss('location');
            const errorMsg = lang === 'en'
              ? 'Could not get your location. Please enable location services and try again.'
              : 'మీ స్థానం పొందలేకపోయింది. దయచేసి లొకేషన్ సర్వీసులను ఎనేబుల్ చేసి మళ్ళీ ప్రయత్నించండి.';
            speak(errorMsg);
            toast.error(errorMsg);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        toast.dismiss('location');
        const errorMsg = lang === 'en'
          ? 'Location services are not available on this device'
          : 'ఈ పరికరంలో లొకేషన్ సేవలు అందుబాటులో లేవు';
        speak(errorMsg);
        toast.error(errorMsg);
      }
      
      return true;
    }

    // ===== COMPLEX: Navigate and Add Health Record =====
    // Example: "open analytics page and record fever", "go to records and add headache report"
    // Only trigger if we have both action AND condition mentioned
    const hasHealthCondition = command.includes('fever') || command.includes('headache') || 
                                command.includes('cold') || command.includes('cough') || 
                                command.includes('pain') || command.includes('flu') || 
                                command.includes('diabetes') || command.includes('blood pressure') || 
                                command.includes('stomach ache');
    
    if ((command.includes('record') || command.includes('add')) && 
        hasHealthCondition && command.length > 10) { // Ensure command has substance
      
      // Extract symptom/condition name
      let conditionName = '';
      
      // Common health conditions
      const conditions = ['fever', 'headache', 'cold', 'cough', 'pain', 'flu', 'diabetes', 'blood pressure', 'stomach ache'];
      for (const condition of conditions) {
        if (command.includes(condition)) {
          conditionName = condition.charAt(0).toUpperCase() + condition.slice(1);
          break;
        }
      }
      
      // If no predefined condition, try to extract after "record" or "add"
      if (!conditionName) {
        const recordMatch = command.match(/(?:record|add)\s+(?:a\s+)?(?:new\s+)?(\w+(?:\s+\w+)?)\s*(?:report|symptom)?/i);
        if (recordMatch && recordMatch[1]) {
          conditionName = recordMatch[1].charAt(0).toUpperCase() + recordMatch[1].slice(1);
        }
      }
      
      if (conditionName) {
        // First, determine if user wants to navigate to a specific page
        let shouldNavigate = false;
        let targetPage = '';
        
        // Extract additional details like severity, intensity, temperature
        let additionalDetails = '';
        
        // Extract severity/intensity (e.g., "severity of 10", "level 8", "high severity")
        const severityMatch = command.match(/(?:severity|level|intensity)\s+(?:of\s+)?(\d+|high|medium|low|have)/i);
        if (severityMatch) {
          const severityValue = severityMatch[1] === 'have' ? 'high' : severityMatch[1];
          additionalDetails += `Severity: ${severityValue}. `;
        }
        
        // Extract temperature (e.g., "temperature 102", "fever of 103")
        const tempMatch = command.match(/(?:temperature|temp|fever\s+of)\s+(\d+\.?\d*)\s*(?:degrees|°|f)?/i);
        if (tempMatch) {
          additionalDetails += `Temperature: ${tempMatch[1]}°F. `;
        }
        
        // Extract duration (e.g., "for 3 days", "since yesterday")
        const durationMatch = command.match(/(?:for|since)\s+(\d+\s+\w+|yesterday|today)/i);
        if (durationMatch) {
          additionalDetails += `Duration: ${durationMatch[1]}. `;
        }
        
        // Check for explicit page navigation keywords - ONLY navigate if mentioned
        if (command.includes('open analytics') || command.includes('go to analytics') || 
            command.includes('show analytics')) {
          shouldNavigate = true;
          targetPage = '/analytics';
        } else if (command.includes('open wellness') || command.includes('go to wellness')) {
          shouldNavigate = true;
          targetPage = '/wellness';
        } else if (command.includes('open records') || command.includes('go to records')) {
          shouldNavigate = true;
          targetPage = '/records';
        } else if (command.includes('open family') || command.includes('go to family')) {
          shouldNavigate = true;
          targetPage = '/family';
        } else if (command.includes('go home') || command.includes('open home')) {
          shouldNavigate = true;
          targetPage = '/';
        }
        
        // Create a new health record
        const newRecord = {
          id: Date.now(),
          title: conditionName,
          date: new Date().toISOString(),
          doctor: 'Self Reported',
          description: additionalDetails || `Added via voice command`,
          prescription: '',
          findings: additionalDetails,
          hasImage: false,
          createdAt: new Date().toISOString()
        };
        
        const existingRecords = JSON.parse(localStorage.getItem('health_records') || '[]');
        existingRecords.push(newRecord);
        localStorage.setItem('health_records', JSON.stringify(existingRecords));
        
        // Build detailed success message
        let detailsMsg = '';
        if (additionalDetails) {
          detailsMsg = ` with ${additionalDetails.trim()}`;
        }
        
        const pageMsg = shouldNavigate ? (
          targetPage === '/analytics' ? ' Opening analytics page.' : 
          targetPage === '/wellness' ? ' Opening wellness page.' :
          targetPage === '/family' ? ' Opening family page.' :
          targetPage === '/' ? ' Opening home page.' :
          targetPage === '/records' ? ' Opening records page.' : ''
        ) : ' Staying on current page.';
        
        const successMsg = lang === 'en'
          ? `Health record for ${conditionName}${detailsMsg} has been added.${pageMsg}`
          : `${conditionName} కోసం ఆరోగ్య రికార్డు జోడించబడింది.`;
        
        speak(successMsg);
        toast.success(successMsg);
        
        // Navigate to the appropriate page ONLY if explicitly requested
        if (shouldNavigate) {
          console.log('Vani: Navigating to', targetPage, 'for command:', command);
          setTimeout(() => navigate(targetPage), 1500);
        } else {
          console.log('Vani: Staying on current page, no navigation requested');
        }
        
        return true;
      }
    }

    return false; // No action command matched
  };

  // Handle voice commands
  const handleVoiceCommand = (command) => {
    const lowerCommand = command.toLowerCase();
    
    // Check for action commands first
    if (handleActionCommand(lowerCommand)) {
      return; // Action handled
    }
    
    // Command mappings for English and Telugu (navigation commands)
    const commands = {
      home: {
        en: ['home', 'go home', 'main page', 'dashboard', 'home page', 'open home', 'show home', 'back home', 'return home'],
        te: ['హోమ్', 'ముఖ్య పేజీ', 'మొదటి పేజీ'],
        action: () => {
          navigate('/');
          speak(lang === 'en' ? 'Opening home page' : 'హోమ్ పేజీ తెరుస్తున్నాను');
        }
      },
      medicines: {
        en: ['medicine', 'medicines', 'reminders', 'my medicines', 'show medicines', 'open medicine list', 'medication', 'medications', 'pills', 'my pills', 'medicine reminder', 'med reminder'],
        te: ['మందులు', 'రిమైండర్లు', 'నా మందులు', 'మందుల జాబితా'],
        action: () => {
          navigate('/reminders');
          speak(lang === 'en' ? 'Opening your medicine list' : 'మీ మందుల జాబితా తెరుస్తున్నాను');
        }
      },
      records: {
        en: ['records', 'health records', 'my records', 'medical records', 'reports', 'health report', 'medical report', 'show records', 'open records', 'my health data'],
        te: ['రికార్డులు', 'ఆరోగ్య రికార్డులు', 'నా రికార్డులు', 'రిపోర్టులు'],
        action: () => {
          navigate('/records');
          speak(lang === 'en' ? 'Opening your health records' : 'మీ ఆరోగ్య రికార్డులు తెరుస్తున్నాను');
        }
      },
      appointments: {
        en: ['appointment', 'appointments', 'my appointments', 'book appointment', 'schedule appointment', 'doctor appointment', 'show appointments', 'open appointments', 'bookings'],
        te: ['అపాయింట్మెంట్', 'నా అపాయింట్మెంట్లు', 'అపాయింట్మెంట్ బుక్ చేయండి'],
        action: () => {
          navigate('/appointments');
          speak(lang === 'en' ? 'Opening appointments' : 'అపాయింట్మెంట్లు తెరుస్తున్నాను');
        }
      },
      doctors: {
        en: ['doctor', 'doctors', 'find doctor', 'search doctor', 'show doctors', 'doctor list', 'find hospital', 'hospitals', 'nearby doctors', 'nearby hospitals'],
        te: ['డాక్టర్', 'డాక్టర్లు', 'డాక్టర్ కనుగొనండి'],
        action: () => {
          navigate('/doctors');
          speak(lang === 'en' ? 'Opening doctors list' : 'డాక్టర్ల జాబితా తెరుస్తున్నాను');
        }
      },
      wellness: {
        en: ['wellness', 'health tips', 'yoga', 'exercise', 'diet', 'nutrition', 'wellness tips', 'fitness', 'healthy living', 'diet tips', 'diet plan', 'bmi', 'body mass index', 'weight tracker'],
        te: ['వెల్నెస్', 'ఆరోగ్య చిట్కాలు', 'యోగా', 'వ్యాయామం', 'ఆహారం', 'పోషకాహారం'],
        action: () => {
          navigate('/wellness');
          speak(lang === 'en' ? 'Opening wellness and diet tips' : 'వెల్నెస్ మరియు ఆహార చిట్కాలు తెరుస్తున్నాను');
        }
      },
      scan: {
        en: ['scan medicine', 'scan', 'check medicine', 'identify medicine', 'what is this medicine', 'medicine scanner', 'open scanner', 'scan drug', 'identify pill', 'what pill', 'medicine checker'],
        te: ['మందు స్కాన్ చేయండి', 'స్కాన్', 'మందు చెక్ చేయండి', 'ఈ మందు ఏమిటి'],
        action: () => {
          navigate('/scan');
          speak(lang === 'en' ? 'Opening medicine scanner. Point your camera at the medicine.' : 'మందు స్కానర్ తెరుస్తున్నాను. మీ కెమెరాను మందు వైపు చూపించండి.');
        }
      },
      healthqr: {
        en: ['health qr', 'health passport', 'qr code', 'my qr', 'show qr', 'health code', 'my health qr', 'open qr', 'show health qr', 'passport'],
        te: ['హెల్త్ క్యూఆర్', 'హెల్త్ పాస్‌పోర్ట్', 'క్యూఆర్ కోడ్', 'నా క్యూఆర్'],
        action: () => {
          navigate('/health-passport');
          speak(lang === 'en' ? 'Opening health QR code' : 'హెల్త్ క్యూఆర్ కోడ్ తెరుస్తున్నాను');
        }
      },
      firstaid: {
        en: ['first aid', 'emergency', 'help', 'urgent', 'medibot', 'medi bot', 'medi boat', 'medic bot', 'medic boat', 'open medibot', 'open medi bot', 'open medi boat', 'medical bot', 'ai assistant', 'health bot', 'chat bot', 'ask doctor'],
        te: ['ప్రథమ చికిత్స', 'అత్యవసర', 'సహాయం', 'మెడిబాట్', 'AI అసిస్టెంట్'],
        action: () => {
          navigate('/firstaid');
          speak(lang === 'en' ? 'Opening MediBot AI assistant' : 'మెడిబాట్ AI అసిస్టెంట్ తెరుస్తున్నాను');
        }
      },
      family: {
        en: ['family', 'family page', 'family profile', 'open family', 'my family', 'family members', 'family health'],
        te: ['కుటుంబం', 'కుటుంబ పేజీ', 'కుటుంబ సభ్యులు', 'నా కుటుంబం'],
        action: () => {
          navigate('/family');
          speak(lang === 'en' ? 'Opening family profile page' : 'కుటుంబ పేజీ తెరుస్తున్నాను');
        }
      },
      analytics: {
        en: ['analytics', 'tracker', 'health tracker', 'my analytics', 'show analytics', 'health analytics', 'statistics', 'stats'],
        te: ['అనలిటిక్స్', 'ట్రాకర్', 'ఆరోగ్య ట్రాకర్', 'గణాంకాలు'],
        action: () => {
          navigate('/analytics');
          speak(lang === 'en' ? 'Opening health analytics' : 'ఆరోగ్య అనలిటిక్స్ తెరుస్తున్నాను');
        }
      },
      language: {
        en: ['change language', 'switch language', 'language', 'telugu', 'english'],
        te: ['భాష మార్చు', 'తెలుగు', 'ఇంగ్లీష్'],
        action: () => {
          const newLang = lang === 'en' ? 'te' : 'en';
          setLang(newLang);
          speak(newLang === 'en' ? 'Language changed to English' : 'భాష తెలుగుకు మార్చబడింది');
        }
      }
    };

    // Find matching command - ONLY if command is substantial (not empty or too short)
    let commandFound = false;
    
    if (lowerCommand.length > 3) { // Ignore very short/empty commands
      for (const [key, cmd] of Object.entries(commands)) {
        const keywords = [...cmd.en, ...cmd.te];
        // Check if any keyword matches as a WHOLE WORD or substantial phrase
        const hasMatch = keywords.some(keyword => {
          // For single words, check word boundaries
          if (!keyword.includes(' ')) {
            const wordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
            return wordRegex.test(lowerCommand);
          }
          // For phrases, check if it's included
          return lowerCommand.includes(keyword.toLowerCase());
        });
        
        if (hasMatch) {
          cmd.action();
          commandFound = true;
          break;
        }
      }
    }

    if (!commandFound && lowerCommand.length > 3) {
      const message = lang === 'en' 
        ? 'Sorry, I did not understand that command. Try saying: open medicines, show records, or go home.'
        : 'క్షమించండి, ఆ ఆదేశం నాకు అర్థం కాలేదు. ప్రయత్నించండి: మందులు తెరవండి, రికార్డులు చూపించు, లేదా హోమ్ కు వెళ్ళు.';
      speak(message);
    }
  };

  // Quick command buttons
  const quickCommands = [
    { 
      label: lang === 'en' ? 'Add Medicine' : 'మందు జోడించు', 
      command: lang === 'en' ? 'add medicine paracetamol' : 'పారాసెటమాల్ మందు జోడించు',
      icon: '➕'
    },
    { 
      label: lang === 'en' ? 'Find Hospitals' : 'హాస్పిటల్లు కనుగొనండి', 
      command: lang === 'en' ? 'find hospitals near me' : 'దగ్గర హాస్పిటల్లు కనుగొనండి',
      icon: '🏥'
    },
    { 
      label: lang === 'en' ? 'Read Medicines' : 'మందులు చదవండి', 
      command: lang === 'en' ? 'read my medicines' : 'నా మందులు చదవండి',
      icon: '💊'
    },
    { 
      label: lang === 'en' ? 'My Records' : 'నా రికార్డులు', 
      command: lang === 'en' ? 'show records' : 'రికార్డులు చూపించు',
      icon: '📋'
    }
  ];

  return (
    <>
      {/* Floating Voice Button */}
      {!isExpanded && (
        <button
          onClick={startListening}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all hover:scale-110 z-50 flex items-center justify-center"
          aria-label="Voice Assistant"
        >
          {isSpeaking ? (
            <Volume2 size={28} className="animate-pulse" />
          ) : (
            <Mic size={28} />
          )}
        </button>
      )}

      {/* Expanded Voice Assistant Panel */}
      {isExpanded && (
        <div className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl z-50 border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic size={24} />
              <div>
                <h3 className="font-bold text-lg">Vani</h3>
                <p className="text-xs text-purple-100">
                  {lang === 'en' ? 'Voice Assistant' : 'వాయిస్ అసిస్టెంట్'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsExpanded(false);
                stopListening();
              }}
              className="p-1 hover:bg-white/20 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Listening Indicator */}
            {isListening && (
              <div className="mb-4 flex items-center justify-center gap-2 text-purple-600">
                <div className="w-3 h-3 bg-purple-600 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold">
                  {lang === 'en' ? 'Listening...' : 'వింటున్నాను...'}
                </span>
              </div>
            )}

            {/* Transcript */}
            {transcript && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{lang === 'en' ? 'You said:' : 'మీరు చెప్పారు:'}</span> {transcript}
                </p>
              </div>
            )}

            {/* Mic Button */}
            <div className="flex justify-center mb-4">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:scale-110'
                } text-white`}
              >
                {isListening ? <MicOff size={32} /> : <Mic size={32} />}
              </button>
            </div>

            {/* Quick Commands */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600 mb-2">
                {lang === 'en' ? 'Quick Commands:' : 'త్వరిత ఆదేశాలు:'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickCommands.map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleVoiceCommand(cmd.command)}
                    className="p-2 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 rounded-lg border border-purple-200 transition text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{cmd.icon}</span>
                      <span className="text-sm font-semibold text-gray-700">{cmd.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Help Text */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                {lang === 'en' 
                  ? '💡 Try: "Scan medicine", "Diet tips", "Find hospitals", "Add medicine aspirin"'
                  : '💡 ప్రయత్నించండి: "మందు స్కాన్ చేయండి", "ఆహార చిట్కాలు", "హాస్పిటల్లు కనుగొనండి", "మందు జోడించు"'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceAssistant;
