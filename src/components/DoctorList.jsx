import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { MapPin, Calendar, User, Loader2, X, Navigation, Search } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import toast from 'react-hot-toast';

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

// --- MOCK DOCTOR DATA (Extended List) ---
const DOCTOR_NAMES = [
  "Dr. A. Sharma", "Dr. P. Gupta", "Dr. K. Reddy", "Dr. S. Verma", 
  "Dr. R. Iyer", "Dr. M. Singh", "Dr. L. Patel", "Dr. J. Thomas",
  "Dr. B. Das", "Dr. N. Rao"
];
const SPECIALTIES = ["General Physician", "Cardiologist", "Pediatrician", "Dermatologist", "Orthopedic"];
const TIME_SLOTS = ["09:00 AM", "10:00 AM", "11:00 AM", "04:00 PM", "05:00 PM", "06:00 PM"];

// --- HELPER: Map Controller to handle movements ---
const MapController = ({ center, onMove }) => {
  const map = useMap();
  
  // Fly to new center when GPS changes
  useEffect(() => {
    if (center) map.flyTo(center, 13);
  }, [center, map]);

  // Listen for drag events
  useMapEvents({
    moveend: () => onMove(map.getCenter()),
  });

  return null;
};

const DoctorList = ({ onClose }) => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState({ lat: 20.5937, lng: 78.9629 }); // Default India
  const [mapCenter, setMapCenter] = useState(null);
  
  // Booking States
  const [bookingHospital, setBookingHospital] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [step, setStep] = useState('form'); // form | loading | success

  // --- 1. INITIAL GPS LOAD ---
  useEffect(() => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const loc = { lat: latitude, lng: longitude };
          setUserLocation(loc);
          setMapCenter(loc);
          fetchNearbyHospitals(latitude, longitude);
        },
        (err) => {
          console.error(err);
          toast.error("Location denied. Showing default map.");
          setLoading(false);
        }
      );
    }
  }, []);

  // --- 2. FETCH HOSPITALS (Real API) ---
  const fetchNearbyHospitals = async (lat, lng) => {
    setLoading(true);
    try {
      // Overpass API Query for hospitals & clinics
      const query = `[out:json];(node["amenity"="hospital"](around:5000,${lat},${lng});node["amenity"="clinic"](around:5000,${lat},${lng}););out body;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.elements.length === 0) {
        toast("No hospitals found in this area. Try moving the map.");
      }

      const realHospitals = data.elements.map((place, index) => {
        // --- SMART ASSIGNMENT LOGIC ---
        // Use the Hospital ID to pick a consistent doctor/specialty
        // This ensures "City Hospital" always has "Dr. Sharma" (not random every refresh)
        const nameHash = (place.id % DOCTOR_NAMES.length);
        const specHash = (place.id % SPECIALTIES.length);
        
        return {
            id: place.id,
            name: place.tags.name || "Local Health Center",
            lat: place.lat,
            lng: place.lon,
            doctor: DOCTOR_NAMES[nameHash],
            specialty: SPECIALTIES[specHash],
            distance: (Math.random() * 5).toFixed(1) + " km" // Distance is still mock for speed
        };
      }).slice(0, 15); // Limit to 15 results

      setHospitals(realHospitals);
    } catch (err) {
      toast.error("Failed to load map data.");
    } finally {
      setLoading(false);
    }
  };

  // --- 3. HANDLE BOOKING ---
  const handleBooking = async (e) => {
    e.preventDefault();
    if (!bookTime) return toast.error("Select a time");
    
    setStep('loading');
    const token = localStorage.getItem('token');

    try {
        if (!token) throw new Error("Please login first");

        const res = await fetch('http://localhost:5000/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify({
                doctor: bookingHospital.doctor,
                hospital: bookingHospital.name,
                specialty: bookingHospital.specialty,
                date: bookDate,
                time: bookTime
            })
        });

        if (res.ok) {
            setStep('success');
            toast.success("Appointment Confirmed!");
        } else {
            throw new Error("Booking failed");
        }
    } catch (err) {
        toast.error(err.message);
        setStep('form');
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col font-sans">
      
      {/* HEADER */}
      <div className="bg-white p-4 shadow-sm z-20 flex justify-between items-center border-b">
        <div>
            <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <MapPin className="text-emerald-600" size={20} /> 
                Find Nearby Doctors
            </h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                {hospitals.length} Centers Found
            </p>
        </div>
        <button onClick={onClose} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition"><X size={20}/></button>
      </div>

      {/* MAP AREA */}
      <div className="h-[45vh] w-full relative z-0 group">
        <MapContainer center={[userLocation.lat, userLocation.lng]} zoom={13} className="h-full w-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
            
            {/* User Marker */}
            <Marker position={[userLocation.lat, userLocation.lng]}>
                <Popup>You are here</Popup>
            </Marker>

            {/* Hospital Markers */}
            {hospitals.map(h => (
                <Marker key={h.id} position={[h.lat, h.lng]} eventHandlers={{ click: () => setBookingHospital(h) }}>
                    <Popup>
                        <div className="text-center">
                            <b className="text-emerald-700">{h.name}</b><br/>
                            <span className="text-xs text-gray-500">{h.doctor}</span>
                        </div>
                    </Popup>
                </Marker>
            ))}

            <MapController center={userLocation} onMove={setMapCenter} />
        </MapContainer>

        {/* SEARCH HERE BUTTON (Appears over map) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[400]">
             <button 
                onClick={() => fetchNearbyHospitals(mapCenter.lat, mapCenter.lng)}
                className="bg-gray-900 text-white px-6 py-3 rounded-full font-bold text-xs shadow-xl flex items-center gap-2 hover:scale-105 transition"
             >
                {loading ? <Loader2 className="animate-spin" size={14}/> : <Search size={14}/>}
                Search In This Area
             </button>
        </div>
      </div>
      
      {/* LIST AREA */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-3 pb-20">
        {hospitals.length === 0 && !loading && (
            <div className="text-center py-10 text-gray-400 text-sm">
                <Navigation size={48} className="mx-auto mb-2 opacity-20"/>
                <p>Move the map to your village/city<br/>and click "Search In This Area"</p>
            </div>
        )}

        {hospitals.map(h => (
            <div key={h.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group hover:border-emerald-200 transition">
                <div>
                    <h3 className="font-bold text-gray-800 text-sm">{h.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <User size={12} className="text-emerald-500"/> {h.doctor}
                    </p>
                    <span className="inline-block mt-2 text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100 font-bold">
                        {h.specialty}
                    </span>
                </div>
                <button 
                    onClick={() => setBookingHospital(h)} 
                    className="bg-gray-100 text-gray-600 p-3 rounded-xl hover:bg-emerald-600 hover:text-white transition shadow-sm"
                >
                    <Calendar size={18}/>
                </button>
            </div>
        ))}
      </div>

      {/* BOOKING MODAL */}
      {bookingHospital && (
        <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-gray-900">Book Appointment</h3>
                    <button onClick={() => {setBookingHospital(null); setStep('form');}} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button>
                </div>

                {step === 'form' && (
                    <form onSubmit={handleBooking} className="space-y-4">
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                            <p className="text-sm font-bold text-emerald-900">{bookingHospital.doctor}</p>
                            <p className="text-xs text-emerald-700">{bookingHospital.name} • {bookingHospital.specialty}</p>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Patient Name</label>
                            <input required type="text" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-bold text-gray-800 outline-none" value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Full Name"/>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Date</label>
                                <input required type="date" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-bold text-gray-800 outline-none" value={bookDate} onChange={e => setBookDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Time</label>
                                <select required className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-bold text-gray-800 outline-none" value={bookTime} onChange={e => setBookTime(e.target.value)}>
                                    <option value="">Select</option>
                                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 mt-2">
                            Confirm Booking
                        </button>
                        <p className="text-[10px] text-center text-gray-400 mt-2">* Doctor names are simulated for demo purpose</p>
                    </form>
                )}

                {step === 'loading' && (
                    <div className="py-12 text-center">
                        <Loader2 className="animate-spin mx-auto text-emerald-600 mb-4" size={48}/>
                        <p className="font-bold text-gray-600">Processing Booking...</p>
                    </div>
                )}

                {step === 'success' && (
                    <div className="text-center py-8">
                        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar size={40} className="text-green-600"/>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Success!</h2>
                        <p className="text-gray-500 text-sm mb-6">Appointment booked successfully.</p>
                        <button onClick={() => {setBookingHospital(null); onClose();}} className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl">Back to Map</button>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default DoctorList;