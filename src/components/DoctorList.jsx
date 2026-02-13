import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { MapPin, Calendar, Clock, Loader2, X, Search, Crosshair, Navigation, CheckCircle, AlertTriangle, ShieldAlert, Phone, User } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';
import AudioCall from '../components/AudioCall';

// Fix Leaflet Icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- MAP CONTROLLER ---
const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
        map.flyTo(center, 14, { animate: true, duration: 1.5 });
    }
  }, [center, map]);
  return null;
};

// --- LOCATION SEARCH BAR ---
const LocationSearch = ({ onLocationSelect }) => {
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query) return;
        setSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data && data.length > 0) {
                const { lat, lon, display_name } = data[0];
                const locationName = display_name.split(',')[0];
                toast.success(`Moved to: ${locationName}`);
                onLocationSelect({ lat: parseFloat(lat), lng: parseFloat(lon) });
            } else {
                toast.error("Location not found");
            }
        } catch (err) {
            toast.error("Search failed");
        } finally {
            setSearching(false);
        }
    };

    return (
        <form onSubmit={handleSearch} className="absolute top-20 left-4 right-4 z-[400]">
            <div className="bg-white rounded-xl shadow-xl flex items-center p-1 border border-slate-200">
                <Search className="ml-3 text-slate-400" size={20}/>
                <input 
                    type="text" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search village/city..." 
                    className="flex-1 p-3 outline-none text-sm font-bold text-slate-700 placeholder:font-normal"
                />
                <button type="submit" disabled={searching} className="bg-slate-900 text-white p-2.5 rounded-lg transition hover:bg-slate-800">
                    {searching ? <Loader2 className="animate-spin" size={18}/> : "Go"}
                </button>
            </div>
        </form>
    );
}

const DoctorList = ({ onClose, familyMemberName = null, familyMemberId = null }) => {
  const { lang } = useLanguage();
  const { socket, emergencyAlert, doctorBreak, doctorDelay } = useSocket();
  const [emergencySeconds, setEmergencySeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [delaySeconds, setDelaySeconds] = useState(0);

  const t = {
    header: lang === 'en' ? 'Nearby Healthcare' : 'సమీప ఆసుపత్రులు',
    locateMe: lang === 'en' ? 'Locate Me' : 'నా స్థానం',
    searchArea: lang === 'en' ? 'Search This Area' : 'ఈ ప్రాంతంలో వెతకండి',
    bookBtn: lang === 'en' ? 'Book Visit' : 'బుక్ చేయండి',
    directions: lang === 'en' ? 'Directions' : 'దిశలు',
    dutyDoctor: lang === 'en' ? 'Duty Medical Officer' : 'డ్యూటీ డాక్టర్',
    opd: lang === 'en' ? 'General OPD' : 'సాధారణ చికిత్స',
    hours: lang === 'en' ? '09:00 AM - 09:00 PM' : 'ఉదయం 9 - రాత్రి 9',
    patientName: lang === 'en' ? 'Patient Name' : 'రోగి పేరు',
    date: lang === 'en' ? 'Date' : 'తేదీ',
    time: lang === 'en' ? 'Preferred Time' : 'సమయం',
    confirm: lang === 'en' ? 'Confirm Appointment' : 'అపాయింట్‌మెంట్ నిర్ధారించండి',
    processing: lang === 'en' ? 'Processing...' : 'ప్రాసెస్ చేస్తోంది...',
    successTitle: lang === 'en' ? 'Booking Confirmed' : 'బుకింగ్ ధృవీకరించబడింది',
    successMsg: lang === 'en' ? 'Your token has been generated.' : 'మీ టోకెన్ జనరేట్ చేయబడింది.',
    backMap: lang === 'en' ? 'Back to Map' : 'తిరిగి వెళ్లండి',
    locError: lang === 'en' ? 'GPS not available' : 'GPS అందుబాటులో లేదు',
    fallbackMsg: lang === 'en' ? 'Using Demo Data (No real hospitals found)' : 'డెమో డేటా (ఆసుపత్రులు లేవు)'
  };

  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 20.5937, lng: 78.9629 }); 
  const [dragCenter, setDragCenter] = useState(mapCenter); 
  
  // Booking States
  const [bookingHospital, setBookingHospital] = useState(null);
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [reason, setReason] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [step, setStep] = useState('form');
  const [showAudioCall, setShowAudioCall] = useState(false);

  // --- 1. SIMULATION ENGINE (The "Bulletproof" Fix) ---
  const generateMockHospitals = (lat, lng) => {
    const names = ["Community Health Center", "Sunrise Clinic", "LifeCare Hospital", "City General Hospital", "Village Wellness Center"];
    return names.map((name, i) => ({
        id: `mock-${i}`,
        name: lang === 'en' ? name : `${name} (Demo)`,
        lat: lat + (Math.random() - 0.5) * 0.04, // Random scatter nearby
        lng: lng + (Math.random() - 0.5) * 0.04,
        type: i % 2 === 0 ? (lang === 'en' ? 'Hospital' : 'ఆసుపత్రి') : (lang === 'en' ? 'Clinic' : 'క్లినిక్'),
        distance: "📍 Demo Location"
    }));
  };

  // --- 2. HANDLE GPS ---
  const handleLocateMe = () => {
    setLoading(true);
    if (!navigator.geolocation) {
        toast.error(t.locError);
        setLoading(false);
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setMapCenter(newLoc);    
            fetchNearbyHospitals(newLoc.lat, newLoc.lng); 
        },
        () => {
            toast.error(t.locError);
            setLoading(false);
        },
        { enableHighAccuracy: true }
    );
  };

  useEffect(() => { handleLocateMe(); }, []);

  // Emergency countdown timer
  useEffect(() => {
    if (!emergencyAlert) { setEmergencySeconds(0); return; }
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(emergencyAlert.alertEndTime) - new Date()) / 1000));
      setEmergencySeconds(diff);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [emergencyAlert]);

  // Doctor break countdown timer
  useEffect(() => {
    if (!doctorBreak) { setBreakSeconds(0); return; }
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(doctorBreak.breakEndTime) - new Date()) / 1000));
      setBreakSeconds(diff);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [doctorBreak]);

  // Doctor delay countdown timer
  useEffect(() => {
    if (!doctorDelay) { setDelaySeconds(0); return; }
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(doctorDelay.delayEndTime) - new Date()) / 1000));
      setDelaySeconds(diff);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [doctorDelay]);

  // Check if user's selected appointment time falls within emergency period
  const isAppointmentDuringEmergency = () => {
    if (!emergencyAlert || !bookingHospital || !bookDate || !bookTime) return false;
    
    // Check if the emergency is at the CURRENT booking hospital
    // Ensure we are comparing compatible ID formats
    // DB IDs start with 'db-' in this component, but real ID is after 'db-'
    const currentHospitalId = bookingHospital.id.toString();
    const alertHospitalId = emergencyAlert.hospitalId.toString();
    
    // Extract real ID if it has db- prefix
    const realBookingId = currentHospitalId.startsWith('db-') ? currentHospitalId.substring(3) : currentHospitalId;
    
    if (realBookingId !== alertHospitalId) {
      return false;
    }

    try {
      // Combine user's selected date and time
      const appointmentDateTime = new Date(`${bookDate}T${bookTime}`);
      const emergencyStart = new Date(emergencyAlert.alertStartTime);
      const emergencyEnd = new Date(emergencyAlert.alertEndTime);

      console.log('🚨 Checking Emergency Overlap:', {
        appt: appointmentDateTime.toISOString(),
        start: emergencyStart.toISOString(),
        end: emergencyEnd.toISOString(),
        isWithin: appointmentDateTime >= emergencyStart && appointmentDateTime <= emergencyEnd
      });
      
      // Check if appointment falls within emergency period
      return appointmentDateTime >= emergencyStart && appointmentDateTime <= emergencyEnd;
    } catch (e) {
      console.error('Error checking emergency overlap:', e);
      return false;
    }
  };

  // Check if user's selected appointment time falls within doctor break period
  const isAppointmentDuringBreak = () => {
    if (!doctorBreak || !bookingHospital || !bookDate || !bookTime) return false;
    
    // Check if the break is at the CURRENT booking hospital
    const currentHospitalId = bookingHospital.id.toString();
    const breakHospitalId = doctorBreak.hospitalId.toString();
    const realBookingId = currentHospitalId.startsWith('db-') ? currentHospitalId.substring(3) : currentHospitalId;
    
    if (realBookingId !== breakHospitalId) {
      return false;
    }

    try {
      const appointmentDateTime = new Date(`${bookDate}T${bookTime}`);
      const breakStart = new Date(doctorBreak.breakStartTime);
      const breakEnd = new Date(doctorBreak.breakEndTime);
      
      return appointmentDateTime >= breakStart && appointmentDateTime <= breakEnd;
    } catch (e) {
      console.error('Error checking break overlap:', e);
      return false;
    }
  };

  // Check if user's selected appointment time falls within delay period
  const isAppointmentDuringDelay = () => {
    if (!doctorDelay || !bookingHospital || !bookDate || !bookTime) return false;
    
    // Check if the delay is at the CURRENT booking hospital
    const currentHospitalId = bookingHospital.id.toString();
    const delayHospitalId = doctorDelay.hospitalId.toString();
    const realBookingId = currentHospitalId.startsWith('db-') ? currentHospitalId.substring(3) : currentHospitalId;
    
    if (realBookingId !== delayHospitalId) {
      return false;
    }

    try {
      const appointmentDateTime = new Date(`${bookDate}T${bookTime}`);
      const delayStart = new Date(doctorDelay.delayStartTime);
      const delayEnd = new Date(doctorDelay.delayEndTime);
      
      return appointmentDateTime >= delayStart && appointmentDateTime <= delayEnd;
    } catch (e) {
      console.error('Error checking delay overlap:', e);
      return false;
    }
  };

  // --- CHECK FOR VANI APPOINTMENT DATA ON LOAD ---
  useEffect(() => {
    const vaniBooking = localStorage.getItem('vani_appointment_booking');
    if (vaniBooking) {
      try {
        const data = JSON.parse(vaniBooking);
        // Check if data is recent (within last 10 seconds)
        if (Date.now() - data.timestamp < 10000) {
          console.log('🎤 Vani appointment data found:', data);
          
          // Find matching hospital by name
          setTimeout(() => {
            const matchedHospital = hospitals.find(h => 
              h.name.toLowerCase().includes(data.hospitalName.toLowerCase()) ||
              data.hospitalName.toLowerCase().includes(h.name.toLowerCase())
            );
            
            if (matchedHospital) {
              console.log('✅ Found matching hospital:', matchedHospital.name);
              setBookingHospital(matchedHospital);
              setBookDate(data.appointmentDate);
              setBookTime(data.appointmentTime); // Already in HH:MM format
              toast.success(`Opening booking form for ${matchedHospital.name}`, { duration: 3000 });
            } else {
              // If no exact match, open first hospital with a message
              if (hospitals.length > 0) {
                setBookingHospital(hospitals[0]);
                setBookDate(data.appointmentDate);
                setBookTime(data.appointmentTime); // Already in HH:MM format
                toast(`Requested: ${data.hospitalName}. Showing available hospital. You can select another.`, { 
                  icon: 'ℹ️', 
                  duration: 4000 
                });
              }
            }
          }, 500); // Wait for hospitals to load
        }
        
        // Clear the booking data
        localStorage.removeItem('vani_appointment_booking');
      } catch (e) {
        console.error('Error parsing Vani booking data:', e);
      }
    }
  }, [hospitals]);

  // --- VOICE ASSISTANT EVENT LISTENER ---
  useEffect(() => {
    const handleVoiceBooking = (event) => {
      console.log('🎤 Voice booking event received:', event.detail);
      const { hospital, date, time } = event.detail;
      
      // Find matching hospital by name (case-insensitive)
      if (hospital) {
        const matchedHospital = hospitals.find(h => 
          h.name.toLowerCase().includes(hospital.toLowerCase()) ||
          hospital.toLowerCase().includes(h.name.toLowerCase())
        );
        
        if (matchedHospital) {
          console.log('✅ Found matching hospital:', matchedHospital.name);
          setBookingHospital(matchedHospital);
          
          // Set date if provided
          if (date) {
            // Convert date like "3rd February" to YYYY-MM-DD format
            const parsedDate = parseVoiceDate(date);
            if (parsedDate) {
              setBookDate(parsedDate);
              console.log('📅 Set date:', parsedDate);
            }
          }
          
          // Set time if provided
          if (time) {
            // Time is already in 24-hour format (HH:MM)
            setBookTime(time);
            console.log('⏰ Set time:', time);
          }
          
          toast.success(`Opening booking form for ${matchedHospital.name}`);
        } else {
          console.log('❌ No matching hospital found for:', hospital);
          toast.error(`Could not find ${hospital}. Please select from the list.`);
        }
      }
    };
    
    window.addEventListener('vani-book-appointment', handleVoiceBooking);
    return () => window.removeEventListener('vani-book-appointment', handleVoiceBooking);
  }, [hospitals]);

  // Helper: Parse voice date to YYYY-MM-DD
  const parseVoiceDate = (voiceDate) => {
    const lower = voiceDate.toLowerCase();
    const today = new Date();
    
    if (lower === 'today') {
      return today.toISOString().split('T')[0];
    }
    
    if (lower === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    
    // Parse "3rd February", "5th March", etc.
    const match = voiceDate.match(/(\d+)(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i);
    if (match) {
      const day = parseInt(match[1]);
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      const month = monthNames.indexOf(match[2].toLowerCase()) + 1;
      const year = today.getFullYear();
      
      // Format as YYYY-MM-DD
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    
    return null;
  };

  // Helper: Format time from 24hr to 12hr with AM/PM
  const formatTime = (time24) => {
    // time24 is like "22:00"
    const [hours, minutes] = time24.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) return null;
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    
    return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  // --- 3. FETCH DATA (With Fallback) ---
  const fetchNearbyHospitals = async (lat, lng) => {
    setLoading(true);
    try {
      // Helper function to calculate distance between two points (Haversine formula)
      const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // Distance in km
        return distance;
      };

      // STEP 1: Fetch registered hospitals from database
      const dbRes = await fetch(`${import.meta.env.VITE_API_BASE}/api/hospitals/registered`);
      const registeredHospitals = dbRes.ok ? await dbRes.json() : [];
      
      console.log('📊 Fetched registered hospitals:', registeredHospitals);
      
      // Format registered hospitals WITH FULL PROFILE DATA and calculate distance
      const formattedRegistered = registeredHospitals.map(h => {
        // Construct logo URL properly
        let logoUrl = null;
        if (h.logo) {
          if (h.logo.startsWith('http://') || h.logo.startsWith('https://')) {
            logoUrl = h.logo;
          } else if (h.logo.startsWith('/')) {
            logoUrl = `${import.meta.env.VITE_API_BASE}${h.logo}`;
          } else {
            logoUrl = `${import.meta.env.VITE_API_BASE}/${h.logo}`;
          }
        }
        
        // Calculate distance from user's location
        const distanceKm = calculateDistance(lat, lng, h.location.latitude, h.location.longitude);
        
        console.log('🏥 Hospital:', h.name, '| Distance:', distanceKm.toFixed(2), 'km | Logo:', logoUrl);
        
        return {
          id: `db-${h._id}`,
          name: h.name,
          lat: h.location.latitude,
          lng: h.location.longitude,
          type: lang === 'en' ? '🏥 Registered Hospital' : '🏥 నమోదిత ఆసుపత్రి',
          distance: `${distanceKm.toFixed(1)} km`,
          distanceValue: distanceKm, // For filtering
          isRegistered: true,
          // Include full profile
          address: h.address,
          phone: h.phone,
          emergencyContact: h.emergencyContact,
          workingHours: h.workingHours || '09:00 AM - 09:00 PM',
          services: h.services || [],
          doctors: h.doctors || [],
          about: h.about,
          logo: logoUrl
        };
      })
      // Filter: Only show registered hospitals within 15km radius
      .filter(h => h.distanceValue <= 15)
      // Sort by distance (nearest first)
      .sort((a, b) => a.distanceValue - b.distanceValue);
      
      console.log(`✅ Filtered ${formattedRegistered.length} registered hospitals within 15km`);
      
      // STEP 2: Fetch nearby hospitals from OpenStreetMap
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="hospital"](around:15000,${lat},${lng});
          way["amenity"="hospital"](around:15000,${lat},${lng});
          node["amenity"="clinic"](around:15000,${lat},${lng});
        );
        out center;
      `;
      
      const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      const data = await res.json();
      
      let osmHospitals = [];
      if (data.elements && data.elements.length > 0) {
        osmHospitals = data.elements.map((place) => {
          const placeLat = place.lat || place.center.lat;
          const placeLng = place.lon || place.center.lon;
          const distanceKm = calculateDistance(lat, lng, placeLat, placeLng);
          
          return {
            id: place.id,
            name: place.tags.name || (lang === 'en' ? "Local Medical Center" : "స్థానిక వైద్య కేంద్రం"),
            lat: placeLat,
            lng: placeLng,
            type: (place.tags.amenity === 'hospital') ? (lang === 'en' ? 'Hospital' : 'ఆసుపత్రి') : (lang === 'en' ? 'Clinic' : 'క్లినిక్'),
            distance: `${distanceKm.toFixed(1)} km`,
            distanceValue: distanceKm,
            isRegistered: false
          };
        }).slice(0, 20);
      }
      
      // STEP 3: Combine registered + OSM hospitals and sort by distance (nearest first)
      const combinedHospitals = [...formattedRegistered, ...osmHospitals]
        .sort((a, b) => (a.distanceValue || 999) - (b.distanceValue || 999));
      
      if (combinedHospitals.length === 0) {
        toast(t.fallbackMsg, { icon: '⚠️' });
        setHospitals(generateMockHospitals(lat, lng));
      } else {
        setHospitals(combinedHospitals);
      }

    } catch (err) {
      console.warn("Map API Failed. Using Mock Data.");
      setHospitals(generateMockHospitals(lat, lng));
    } finally {
      setLoading(false);
    }
  };

  // --- 4. BOOKING LOGIC (New Appointment Workflow) ---
  const handleBooking = async (e) => {
    e.preventDefault();
    setStep('loading');
    const token = localStorage.getItem('token');

    try {
        if (!token) throw new Error("Login required");

        // Require doctor selection if hospital has doctors
        if (bookingHospital.doctors?.length > 0 && !selectedDoctor) {
            toast.error(lang === 'en' ? 'Please select a doctor' : 'దయచేసి డాక్టర్‌ను ఎంచుకోండి');
            setStep('form');
            return;
        }

        const doctorName = selectedDoctor || t.dutyDoctor;
        const appointmentData = {
            hospitalName: bookingHospital.name,
            doctor: doctorName,
            appointmentDate: bookDate,
            appointmentTime: bookTime,
            reason: reason || `${bookingHospital.type || t.opd} consultation`,
            ...(familyMemberName && { patientName: familyMemberName, familyMemberId })
        };

        const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify(appointmentData)
        });

        if (res.ok) {
            const responseData = await res.json();
            
            // Check if emergency warning was returned
            if (responseData.emergencyWarning && responseData.emergencyWarning.isEmergencyActive) {
                toast(
                    `⚠️ ${responseData.emergencyWarning.message}\nYour wait time will be significantly longer.`,
                    { duration: 8000, icon: '🚨', style: { background: '#FEF2F2', border: '2px solid #EF4444', color: '#991B1B' } }
                );
            }
            
            // Show warning if appointment is during break
            if (isAppointmentDuringBreak()) {
                toast(
                    `☕ Doctor has a ${doctorBreak.breakDurationMinutes}-min break during your appointment. Expect delays.`,
                    { duration: 6000, icon: '☕', style: { background: '#FEF3C7', border: '2px solid #F59E0B', color: '#92400E' } }
                );
            }
            
            // Show warning if appointment is during delay
            if (isAppointmentDuringDelay()) {
                toast(
                    `⏰ Doctor is delayed by ${doctorDelay.delayMinutes} minutes. Your consultation may be delayed.`,
                    { duration: 6000, icon: '⏰', style: { background: '#FED7AA', border: '2px solid #EA580C', color: '#7C2D12' } }
                );
            }
            
            setStep('success');
            toast.success(t.successTitle);
        } else {
            throw new Error("Failed");
        }
    } catch (err) {
        toast.error(err.message || "Error");
        setStep('form');
    }
  };

  const openGoogleMaps = (lat, lng) => {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  // Map Drag Listener
  const MapEvents = () => {
      useMapEvents({
          move: (e) => setDragCenter(e.target.getCenter()),
          moveend: (e) => setDragCenter(e.target.getCenter())
      });
      return null;
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col font-sans">
      
      {/* HEADER */}
      <div className="bg-white px-6 py-4 shadow-sm z-20 flex justify-between items-center border-b border-slate-200">
        <div>
            <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                <MapPin className="text-emerald-600 fill-emerald-100" size={24} /> 
                {t.header}
            </h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                {hospitals.length} Locations Verified
            </p>
        </div>
        <button onClick={onClose} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 transition text-slate-600"><X size={24}/></button>
      </div>

      {/* MAP AREA */}
      <div className="h-[50vh] w-full relative z-0 shadow-inner overflow-hidden">
        
        <LocationSearch onLocationSelect={(loc) => {
            setMapCenter(loc);
            setDragCenter(loc);
            fetchNearbyHospitals(loc.lat, loc.lng);
        }} />

        <MapContainer center={mapCenter} zoom={14} className="h-full w-full">
            <TileLayer 
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" 
                attribution='© OpenStreetMap'
            />
            
            {hospitals.map(h => (
                <Marker key={h.id} position={[h.lat, h.lng]} eventHandlers={{ click: () => { setSelectedDoctor(''); setStep('form'); setBookingHospital(h); } }}>
                    <Popup>
                        <div className="text-center p-1">
                            <b className="text-slate-800 text-sm">{h.name}</b><br/>
                            <span className="text-xs text-emerald-600 font-bold">{h.type}</span>
                        </div>
                    </Popup>
                </Marker>
            ))}

            <MapController center={mapCenter} />
            <MapEvents />
        </MapContainer>

        {/* CENTER CROSSHAIR */}
        <div className="absolute inset-0 pointer-events-none z-[400] flex items-center justify-center">
            <div className="relative -mt-8">
                <MapPin size={48} className="text-slate-900 fill-white drop-shadow-2xl" />
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-black/20 rounded-full blur-[2px]"></div>
            </div>
        </div>

        {/* FLOATING CONTROLS */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3 z-[400] px-4 pointer-events-none">
             <button 
                onClick={handleLocateMe}
                className="bg-white text-slate-700 px-4 py-3 rounded-xl font-bold text-xs shadow-xl flex items-center gap-2 hover:bg-slate-50 transition pointer-events-auto border border-slate-200 active:scale-95"
             >
                <Crosshair size={18} className="text-blue-500"/> {t.locateMe}
             </button>

             <button 
                onClick={() => {
                    setMapCenter(dragCenter); 
                    fetchNearbyHospitals(dragCenter.lat, dragCenter.lng);
                }}
                className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-xl flex items-center gap-2 hover:bg-slate-800 transition pointer-events-auto active:scale-95"
             >
                {loading ? <Loader2 className="animate-spin" size={16}/> : <Search size={16}/>}
                {t.searchArea}
             </button>
        </div>
      </div>
      
      {/* LIST AREA */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-3 pb-24">
        {hospitals.map(h => (
            <div key={h.id} className={`bg-white p-5 rounded-2xl shadow-sm border ${h.isRegistered ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-100'} flex flex-col gap-3 group hover:border-emerald-300 hover:shadow-md transition duration-300`}>
                <div className="flex justify-between items-start gap-3">
                    {/* Hospital Logo - Always show for registered hospitals */}
                    {h.isRegistered && (
                      <div className="shrink-0">
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-white border-2 border-emerald-300 flex items-center justify-center shadow-sm">
                          {h.logo ? (
                            <img 
                              src={h.logo} 
                              alt={`${h.name} logo`}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                console.error('Logo failed to load:', h.logo);
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = '<div class="text-3xl">🏥</div>';
                              }}
                            />
                          ) : (
                            <div className="text-3xl">🏥</div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-800 text-base leading-tight">{h.name}</h3>
                            {h.isRegistered && (
                                <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle size={10} /> VERIFIED
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-wide text-emerald-600 bg-emerald-50 inline-block px-2 py-0.5 rounded">{h.type}</p>
                        
                        {/* Show profile details for registered hospitals */}
                        {h.isRegistered && (
                          <div className="mt-3 space-y-2 text-xs text-slate-600">
                            {h.address && (
                              <div className="flex items-start gap-2">
                                <MapPin size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                                <span>{h.address}</span>
                              </div>
                            )}
                            {h.phone && (
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-600">📞</span>
                                <span>{h.phone}</span>
                              </div>
                            )}
                            {h.workingHours && (
                              <div className="flex items-center gap-2">
                                <Clock size={12} className="text-emerald-600" />
                                <span>{h.workingHours}</span>
                              </div>
                            )}
                            {h.about && (
                              <div className="bg-white p-2 rounded-lg border border-emerald-100 mt-2">
                                <p className="text-xs text-slate-600 italic">{h.about}</p>
                              </div>
                            )}
                            {h.doctors && h.doctors.length > 0 && (
                              <div className="mt-2 bg-white p-2 rounded-lg border border-emerald-100">
                                <p className="font-bold text-emerald-700 mb-1">👨‍⚕️ Doctors:</p>
                                {h.doctors.slice(0, 3).map((doc, i) => (
                                  <div key={i} className="text-[11px] ml-2 mb-1">
                                    • <span className="font-semibold">{doc.name}</span> - <span className="text-emerald-600">{doc.specialty}</span>
                                  </div>
                                ))}
                                {h.doctors.length > 3 && <p className="text-[10px] text-slate-400 ml-2">+{h.doctors.length - 3} more</p>}
                              </div>
                            )}
                            {h.services && h.services.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {h.services.slice(0, 4).map((service, i) => (
                                  <span key={i} className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-medium">
                                    {service}
                                  </span>
                                ))}
                                {h.services.length > 4 && <span className="text-[10px] text-slate-400">+{h.services.length - 4}</span>}
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                    <button 
                        onClick={() => openGoogleMaps(h.lat, h.lng)}
                        className="bg-slate-50 p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                    >
                        <Navigation size={20}/>
                    </button>
                </div>
                
                <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-1">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-400"/> {h.workingHours || t.hours}
                    </div>
                    <button 
                        onClick={() => { setSelectedDoctor(''); setStep('form'); setBookingHospital(h); }} 
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1 shadow-lg shadow-emerald-100"
                    >
                        <Calendar size={14}/> {t.bookBtn}
                    </button>
                </div>
            </div>
        ))}
        
        {hospitals.length === 0 && !loading && (
             <div className="text-center py-10 opacity-50">
                 <AlertTriangle className="mx-auto text-slate-400 mb-2" size={32}/>
                 <p className="text-sm font-bold text-slate-400">No data found.</p>
             </div>
        )}
      </div>

      {/* BOOKING MODAL - Hide during call */}
      {bookingHospital && !showAudioCall && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-slate-900">{lang === 'en' ? 'Book Appointment' : 'అపాయింట్‌మెంట్ బుక్ చేయండి'}</h3>
                    <div className="flex items-center gap-2">
                        {/* Phone Icon to Call Hospital - Only show for registered hospitals */}
                        {bookingHospital.isRegistered && (
                          <button 
                              onClick={() => {
                                if (!socket) {
                                  toast.error('Not connected. Please refresh the page.');
                                  return;
                                }
                                const hospitalId = bookingHospital.id.startsWith('db-') 
                                  ? bookingHospital.id.substring(3) 
                                  : bookingHospital.id;
                                const recipientRoom = `hospital_${hospitalId}`;
                                console.log('📞 Initiating call to hospital:');
                                console.log('  - Hospital Name:', bookingHospital.name);
                                console.log('  - Hospital ID:', hospitalId);
                                console.log('  - Calling Room:', recipientRoom);
                                console.log('  - Socket Connected:', socket.connected);
                                
                                // Show loading toast
                                toast.loading('Connecting call...', { id: 'call-connecting' });
                                
                                // Show call interface
                                setShowAudioCall(true);
                                
                                // Clear toast after 2 seconds
                                setTimeout(() => toast.dismiss('call-connecting'), 2000);
                              }} 
                              className="p-2 bg-emerald-100 rounded-full hover:bg-emerald-200 transition-colors group animate-pulse"
                              title={lang === 'en' ? 'Call Hospital Before Booking' : 'బుకింగ్ చేసే ముందు కాల్ చేయండి'}
                          >
                              <Phone size={20} className="text-emerald-600 group-hover:text-emerald-700" />
                          </button>
                        )}
                        <button onClick={() => {setBookingHospital(null); setStep('form'); setShowAudioCall(false);}} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={20}/></button>
                    </div>
                </div>

                {/* Emergency Warning Banner - only show if appointment time is during emergency */}
                {isAppointmentDuringEmergency() && (
                    <div className="mb-4 bg-gradient-to-r from-red-600 to-orange-600 text-white p-4 rounded-xl shadow-xl border-2 border-red-700">
                        <div className="flex items-center gap-3">
                            <ShieldAlert size={28} className="shrink-0 animate-bounce" />
                            <div className="flex-1">
                                <p className="font-bold text-sm mb-1">
                                    ⚠️ {lang === 'en' ? 'EMERGENCY CASE IN PROGRESS' : 'అత్యవసర కేసు జరుగుతోంది'}
                                </p>
                                <p className="text-xs opacity-90 leading-tight">
                                    {lang === 'en' 
                                        ? `An emergency is being handled. Your wait time will be significantly longer. Consider changing your appointment time.`
                                        : `అత్యవసర కేసు నిర్వహించబడుతోంది. మీ నిరీక్షణ సమయం చాలా ఎక్కువగా ఉంటుంది. మీ అపాయింట్‌మెంట్ సమయాన్ని మార్చడాన్ని పరిగణించండి.`}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="bg-white/20 px-2 py-1 rounded text-xs font-mono font-bold">
                                        {Math.floor(emergencySeconds / 60)}:{String(emergencySeconds % 60).padStart(2, '0')}
                                    </div>
                                    <span className="text-[10px] opacity-75">
                                        {lang === 'en' ? 'time remaining' : 'మిగిలిన సమయం'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Doctor Break Warning Banner */}
                {isAppointmentDuringBreak() && (
                    <div className="mb-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-xl shadow-xl border-2 border-amber-600">
                        <div className="flex items-center gap-3">
                            <div className="text-2xl">☕</div>
                            <div className="flex-1">
                                <p className="font-bold text-sm mb-1">
                                    {lang === 'en' ? 'Doctor Break Scheduled' : 'డాక్టర్ విరామ షెడ్యూల్'}
                                </p>
                                <p className="text-xs opacity-90 leading-tight">
                                    {lang === 'en' 
                                        ? `The doctor has a ${doctorBreak.breakDurationMinutes}-minute break during your appointment time. There will be a delay in consultation.`
                                        : `మీ అపాయింట్‌మెంట్ సమయంలో డాక్టర్‌కు ${doctorBreak.breakDurationMinutes}-నిమిషాల విరామం ఉంది. సంప్రదింపులో ఆలస్యం ఉంటుంది.`}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="bg-white/20 px-2 py-1 rounded text-xs font-mono font-bold">
                                        {Math.floor(breakSeconds / 60)}:{String(breakSeconds % 60).padStart(2, '0')}
                                    </div>
                                    <span className="text-[10px] opacity-75">
                                        {lang === 'en' ? 'break time remaining' : 'విరామ సమయం మిగిలింది'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Doctor Delay Warning Banner */}
                {isAppointmentDuringDelay() && (
                    <div className="mb-4 bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-xl shadow-xl border-2 border-orange-600">
                        <div className="flex items-center gap-3">
                            <div className="text-2xl">⏰</div>
                            <div className="flex-1">
                                <p className="font-bold text-sm mb-1">
                                    {lang === 'en' ? 'Doctor Delayed' : 'డాక్టర్ ఆలస్యం'}
                                </p>
                                <p className="text-xs opacity-90 leading-tight">
                                    {lang === 'en' 
                                        ? `Doctor is delayed by ${doctorDelay.delayMinutes} minutes${doctorDelay.delayReason ? ': ' + doctorDelay.delayReason : ''}. Your consultation may be delayed.`
                                        : `డాక్టర్ ${doctorDelay.delayMinutes} నిమిషాలు ఆలస్యం అయ్యారు${doctorDelay.delayReason ? ': ' + doctorDelay.delayReason : ''}. మీ సంప్రదింపు ఆలస్యం కావచ్చు.`}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="bg-white/20 px-2 py-1 rounded text-xs font-mono font-bold">
                                        {Math.floor(delaySeconds / 60)}:{String(delaySeconds % 60).padStart(2, '0')}
                                    </div>
                                    <span className="text-[10px] opacity-75">
                                        {lang === 'en' ? 'delay time remaining' : 'ఆలస్య సమయం మిగిలింది'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'form' && (
                    <form onSubmit={handleBooking} className="space-y-4">
                        {/* Family Member Banner */}
                        {familyMemberName && (
                          <div className="bg-blue-50 p-3 rounded-2xl border border-blue-200 flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-full">
                              <User size={16} className="text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs text-blue-500 font-bold uppercase tracking-wider">{lang === 'en' ? 'Booking For' : 'బుకింగ్ ఎవరి కోసం'}</p>
                              <p className="text-sm font-bold text-blue-900">{familyMemberName}</p>
                            </div>
                          </div>
                        )}
                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                            <p className="text-sm font-bold text-emerald-900">{bookingHospital.name}</p>
                            <div className="flex justify-between mt-2 text-xs text-emerald-700 font-medium">
                                <span>{selectedDoctor || t.dutyDoctor}</span>
                                <span>{t.opd}</span>
                            </div>
                        </div>

                        {/* Doctor Selection */}
                        {bookingHospital.doctors && bookingHospital.doctors.length > 0 && (
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                              {lang === 'en' ? 'SELECT DOCTOR' : 'డాక్టర్‌ను ఎంచుకోండి'}
                            </label>
                            <div className="space-y-2 mt-1">
                              {bookingHospital.doctors.map((doc, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setSelectedDoctor(doc.name)}
                                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                    selectedDoctor === doc.name
                                      ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200'
                                      : 'border-slate-200 bg-white hover:border-slate-300'
                                  }`}
                                >
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                                    selectedDoctor === doc.name ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {doc.name?.charAt(0)?.toUpperCase() || 'D'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-slate-800 truncate">{doc.name}</p>
                                    <p className="text-[11px] text-slate-500">{doc.specialty || t.opd}</p>
                                  </div>
                                  {selectedDoctor === doc.name && (
                                    <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{lang === 'en' ? 'REASON' : 'కారణం'}</label>
                            <input type="text" placeholder={lang === 'en' ? 'Optional' : 'ఐచ్ఛికం'} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 transition" value={reason} onChange={e => setReason(e.target.value)} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.date}</label>
                                <input required type="date" className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 transition" value={bookDate} onChange={e => setBookDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.time}</label>
                                <input 
                                    required 
                                    type="time" 
                                    className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 transition" 
                                    value={bookTime} 
                                    onChange={e => setBookTime(e.target.value)}
                                    placeholder="--:--"
                                />
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-xl shadow-emerald-200 mt-2 hover:bg-emerald-700 transition active:scale-95">
                            {t.confirm}
                        </button>
                    </form>
                )}

                {step === 'loading' && <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-emerald-600 mb-4" size={48}/><p className="font-bold text-slate-600">{t.processing}</p></div>}
                
                {step === 'success' && (
                    <div className="text-center py-8">
                        <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                            <CheckCircle size={40} className="text-emerald-600"/>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.successTitle}</h2>
                        <p className="text-slate-500 text-sm mb-6">{t.successMsg}</p>
                        <button onClick={() => {setBookingHospital(null); setShowAudioCall(false); onClose();}} className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition">{t.backMap}</button>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* AUDIO CALL TO HOSPITAL */}
      {showAudioCall && bookingHospital && socket && (
        <AudioCall
          recipientId={`hospital_${bookingHospital.id.startsWith('db-') ? bookingHospital.id.substring(3) : bookingHospital.id}`}
          recipientName={bookingHospital.name}
          isIncoming={false}
          socket={socket}
          onClose={() => {
            console.log('📞 Call ended');
            setShowAudioCall(false);
          }}
        />
      )}
    </div>
  );
};

export default DoctorList;