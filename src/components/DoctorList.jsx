import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { MapPin, Calendar, User, Loader2, CheckCircle, X, Navigation, Clock } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], 13); }, [lat, lng]);
  return null;
};

const DOCTOR_NAMES = ["Dr. A. Sharma", "Dr. P. Gupta", "Dr. K. Reddy", "Dr. S. Verma"];
const SPECIALTIES = ["General Physician", "Cardiologist", "Pediatrician", "Dermatologist"];
const TIME_SLOTS = ["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "04:00 PM", "04:30 PM", "05:00 PM", "06:00 PM"];

const DoctorList = ({ onClose }) => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [error, setError] = useState(null);
  
  // Booking States
  const [bookingHospital, setBookingHospital] = useState(null);
  const [bookingStep, setBookingStep] = useState('form');
  const [patientName, setPatientName] = useState('');
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [patientAddress, setPatientAddress] = useState('');
  const [isLocatingUser, setIsLocatingUser] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported"); setLoading(false); return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        fetchNearbyHospitals(latitude, longitude);
      },
      () => { setError("Location access denied."); setLoading(false); }
    );
  }, []);

  const fetchNearbyHospitals = async (lat, lng) => {
    try {
      const query = `[out:json];(node["amenity"="hospital"](around:5000,${lat},${lng});node["amenity"="clinic"](around:5000,${lat},${lng}););out body;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();
      
      const realHospitals = data.elements.map(place => ({
        id: place.id,
        name: place.tags.name || "Local Clinic",
        lat: place.lat,
        lng: place.lon,
        doctor: DOCTOR_NAMES[Math.floor(Math.random() * DOCTOR_NAMES.length)],
        specialty: SPECIALTIES[Math.floor(Math.random() * SPECIALTIES.length)],
        distance: (Math.random() * 5).toFixed(1) + " km"
      })).slice(0, 10);

      setHospitals(realHospitals);
      setLoading(false);
    } catch (err) { setError("Failed to fetch data."); setLoading(false); }
  };

  const detectUserAddress = () => {
    setIsLocatingUser(true);
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setPatientAddress(`GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setIsLocatingUser(false);
    }, () => { alert("Could not get location."); setIsLocatingUser(false); });
  };

  // --- UPDATED: SEND TO BACKEND DATABASE ---
  const confirmBooking = async (e) => {
    e.preventDefault();
    if(!bookTime) { alert("Please select a time slot"); return; }
    
    setBookingStep('loading');

    // 1. Prepare Data for MongoDB
    const appointmentData = {
        doctor: bookingHospital.doctor,
        hospital: bookingHospital.name,
        specialty: bookingHospital.specialty,
        date: bookDate,
        time: bookTime
    };

    try {
        // 2. Get Token (Proof of Login)
        const token = localStorage.getItem('token');
        
        if (!token) {
            alert("You must be logged in to book appointments!");
            setBookingStep('form');
            return;
        }

        // 3. Send Request to Your Backend API
        const res = await fetch('http://localhost:5000/api/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token // Send token in header
            },
            body: JSON.stringify(appointmentData)
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.msg || 'Booking Failed');
        }

        // 4. Show Success UI
        setTimeout(() => setBookingStep('success'), 1000);

    } catch (err) {
        console.error(err);
        alert(err.message || "Failed to save booking. Check if backend is running.");
        setBookingStep('form');
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col font-sans">
      
      {/* HEADER */}
      <div className="bg-white p-4 shadow-sm z-20 flex justify-between items-center border-b">
        <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
            <MapPin className="text-emerald-600" size={20} /> 
            Nearby Doctors
        </h2>
        <button onClick={onClose} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition">✕</button>
      </div>

      {loading && <div className="flex-1 flex items-center justify-center flex-col gap-2"><Loader2 className="animate-spin text-emerald-600" size={32}/><p className="text-sm text-gray-500">Scanning GPS Location...</p></div>}
      {error && !loading && <div className="p-10 text-center text-red-500">{error}</div>}

      {!loading && !error && (
        <>
            {/* MAP SECTION */}
            <div className="h-[40vh] w-full relative z-0">
                <MapContainer center={[userLocation.lat, userLocation.lng]} zoom={13} className="h-full w-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
                    <Marker position={[userLocation.lat, userLocation.lng]}><Popup>You are here</Popup></Marker>
                    {hospitals.map(h => (
                        <Marker key={h.id} position={[h.lat, h.lng]}>
                            <Popup><b>{h.name}</b><br/>{h.specialty}</Popup>
                        </Marker>
                    ))}
                    <RecenterMap lat={userLocation.lat} lng={userLocation.lng}/>
                </MapContainer>
            </div>
            
            {/* LIST SECTION */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-3 pb-20">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{hospitals.length} Centers Found</p>
                {hospitals.map(h => (
                    <div key={h.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-gray-800 text-sm">{h.name}</h3>
                            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full font-bold">{h.distance}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-3 flex items-center gap-1"><User size={12}/> {h.doctor} • {h.specialty}</p>
                        
                        {/* Book Button (Full Width, No Phone Icon) */}
                        <button 
                            onClick={() => { setBookingHospital(h); setBookingStep('form'); }} 
                            className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-xs font-bold shadow-md active:scale-95 transition flex items-center justify-center gap-2"
                        >
                            <Calendar size={14}/> Book Appointment
                        </button>
                    </div>
                ))}
            </div>
        </>
      )}

      {/* --- BOOKING MODAL --- */}
      {bookingHospital && (
        <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-y-auto max-h-[90vh]">
                
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-bold text-xl text-gray-900">Book Visit</h3>
                        <p className="text-xs text-gray-500 mt-1">at {bookingHospital.name}</p>
                    </div>
                    <button onClick={() => setBookingHospital(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20}/></button>
                </div>
                
                {bookingStep === 'form' && (
                    <form onSubmit={confirmBooking} className="space-y-4">
                        
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
                            <div className="bg-white p-2 rounded-full text-emerald-600"><User size={20}/></div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-emerald-900">{bookingHospital.doctor}</p>
                                <p className="text-xs text-emerald-700">{bookingHospital.specialty}</p>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Patient Name</label>
                            <input required type="text" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-bold text-gray-800 focus:border-emerald-500 outline-none" placeholder="Enter full name" value={patientName} onChange={e => setPatientName(e.target.value)} />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Your Location</label>
                            <div className="flex gap-2">
                                <input required type="text" className="flex-1 bg-gray-50 border border-gray-200 p-3 rounded-xl font-bold text-gray-800 focus:border-emerald-500 outline-none" placeholder="Click Detect ->" value={patientAddress} onChange={e => setPatientAddress(e.target.value)} />
                                <button type="button" onClick={detectUserAddress} className="bg-emerald-100 text-emerald-700 px-4 rounded-xl font-bold text-xs flex flex-col items-center justify-center hover:bg-emerald-200 transition">
                                    {isLocatingUser ? <Loader2 className="animate-spin" size={18}/> : <Navigation size={18}/>}
                                    <span className="text-[9px] mt-0.5">DETECT</span>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Date</label>
                                <input required type="date" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-bold text-gray-800 outline-none" value={bookDate} onChange={e => setBookDate(e.target.value)} />
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Time Slot</label>
                                <div className="relative">
                                    <select 
                                        required 
                                        className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-bold text-gray-800 outline-none appearance-none"
                                        value={bookTime}
                                        onChange={e => setBookTime(e.target.value)}
                                    >
                                        <option value="">Select Time</option>
                                        {TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                                    </select>
                                    <Clock className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16}/>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition mt-2">
                            Confirm & Save
                        </button>
                    </form>
                )}

                {bookingStep === 'loading' && (
                    <div className="py-12 text-center">
                        <Loader2 className="animate-spin mx-auto text-emerald-600 mb-4" size={48}/>
                        <p className="font-bold text-gray-600">Securely Saving to Database...</p>
                    </div>
                )}
                
                {bookingStep === 'success' && (
                    <div className="text-center py-8">
                        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in">
                            <CheckCircle size={40} className="text-green-600"/>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Saved to Dashboard!</h2>
                        <p className="text-gray-500 text-sm mb-6">You can view this in "My Appointments"</p>
                        <button onClick={() => {setBookingHospital(null); onClose();}} className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl">Back to List</button>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default DoctorList;