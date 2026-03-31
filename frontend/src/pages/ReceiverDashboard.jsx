import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import {
  Search, MapPin, Wrench, Zap, Droplets, LogOut, Loader2, Star, Clock, 
  DollarSign, BellRing, History as HistoryIcon, XCircle, Navigation, SlidersHorizontal, Map
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal'; 
import { API_BASE_URL } from "../config/api";

// Stable CDN for the User (Red) Marker
const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Fix for default blue markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Helper component to handle map movement
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  map.setView(center, zoom || map.getZoom());
  return null;
};

// Calculates distance in KM between two coordinates for UI display
const getDistanceKM = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
};

const ReceiverDashboard = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  
  // Data States
  const [providers, setProviders] = useState([]);
  const [liveBookings, setLiveBookings] = useState([]);
  const [history, setHistory] = useState([]);
  
  // UI & Map States
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedProviderMap, setSelectedProviderMap] = useState(null); 
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [filters, setFilters] = useState({
    radius: 15, 
    minRating: 0,
    minExperience: 0,
    maxCharge: 2000
  });

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) navigate("/login");
    else setUserData(JSON.parse(savedUser));

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          setIsLocating(false);
        },
        () => setIsLocating(false)
      );
    }
  }, [navigate]);

  useEffect(() => {
    if (!userData || !userLocation) return;
    
    const fetchData = async () => {
      try {
        const geoUrl = `${API_BASE_URL}/location/nearby?lat=${userLocation[0]}&lng=${userLocation[1]}&radius_km=${filters.radius}`;
        const pRes = await fetch(geoUrl);
        if (pRes.ok) setProviders(await pRes.json());

        // Active bookings (pending/accepted) for live tracking
        const activeRes = await fetch(
          `${API_BASE_URL}/location/active-requests/${String(userData.id)}?role=receiver`
        );
        if (activeRes.ok) setLiveBookings(await activeRes.json());

        // Completed/declined history
        const hRes = await fetch(
          `${API_BASE_URL}/location/history/${String(userData.id)}?role=receiver`
        );
        if (hRes.ok) setHistory(await hRes.json());
      } catch (error) { console.error("Sync error:", error); }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [userData, userLocation, filters.radius]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleRecenter = () => {
    setSelectedProviderMap(null); 
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  };

  const handleRequestService = async (provider) => {
    // Ensure payload types perfectly match MongoDB string requirements
    const payload = {
      receiver_id: String(userData.id),
      receiver_name: String(userData.name),
      // Use provider_id (the provider's user ID) returned from the API,
      // not the Mongo document _id, to keep it consistent with backend lookups.
      provider_id: String(provider.provider_id),
      service_name: String(provider.category),
      price: Number(provider.charge),
    };
    
    const toastId = toast.loading(`Contacting ${provider.name}...`);
    try {
      const res = await fetch(`${API_BASE_URL}/location/request`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(`Request sent to ${provider.name}!`, { id: toastId });
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to send request", { id: toastId });
      }
    } catch (error) { 
      console.error("Request failed:", error); 
      toast.error("Network error. Could not send request.", { id: toastId });
    }
  };

  const handleWithdraw = (requestId) => {
    setConfirmModal({
      isOpen: true,
      title: "Withdraw Request",
      message: "Are you sure you want to withdraw this service request?",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        const toastId = toast.loading('Withdrawing request...');
        try {
          // CHANGED: Ensure requestId is passed securely as string
          const res = await fetch(`${API_BASE_URL}/location/request/${String(requestId)}`, { method: "DELETE" });
          if (res.ok) {
            setLiveBookings((prev) => prev.filter((b) => b._id !== requestId));
            toast.success("Request withdrawn successfully.", { id: toastId });
          } else {
            toast.error("Failed to withdraw request.", { id: toastId });
          }
        } catch (error) { 
          console.error("Withdrawal failed:", error); 
          toast.error("Error withdrawing request.", { id: toastId });
        }
      }
    });
  };

  const filteredProviders = providers.filter((p) => {
    if (activeCategory !== "All" && p.category !== activeCategory) return false;
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (p.rating < filters.minRating) return false;
    if (p.experience < filters.minExperience) return false;
    if (p.charge > filters.maxCharge) return false;
    return true;
  });

  const categories = [
    { name: "All", icon: <MapPin size={16} /> },
    { name: "Plumber", icon: <Droplets size={16} /> },
    { name: "Electrician", icon: <Zap size={16} /> },
    { name: "Mechanic", icon: <Wrench size={16} /> },
  ];

  if (!userData || !userLocation) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <span className="ml-3 font-bold text-gray-600">Acquiring Location...</span>
    </div>
  );

  return (
    <>
      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        title={confirmModal.title} 
        message={confirmModal.message} 
        onConfirm={confirmModal.onConfirm} 
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
      />
      <div className="flex h-screen w-full bg-gray-50 overflow-hidden font-sans">
        
        {/* SIDEBAR */}
        <div className="w-full md:w-1/3 lg:w-400px bg-white shadow-xl z-1001 flex flex-col relative border-r border-gray-200">
          
          {/* HEADER */}
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
            <div>
              <h1 className="text-2xl font-bold text-blue-600 tracking-tight">Geolocate</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{userData.name}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowHistory(!showHistory)} className={`p-2 rounded-xl transition-all ${showHistory ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:bg-gray-100"}`}>
                <HistoryIcon size={20} />
              </button>
              <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all"><LogOut size={20} /></button>
            </div>
          </div>

          {/* ACTIVE BOOKINGS */}
          {liveBookings.length > 0 && !showHistory && (
            <div className="p-4 bg-blue-50/50 border-b border-blue-100">
              <h3 className="text-[10px] font-bold text-blue-600 uppercase mb-2 flex items-center tracking-widest">
                <BellRing size={12} className="mr-2 animate-pulse" /> Active Service Tracking
              </h3>
              {liveBookings.map((b) => (
                <div key={b._id} className="bg-white p-3 rounded-xl shadow-sm border border-blue-100 mb-2 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{b.service_name}</p>
                    <p className={`text-[10px] font-bold uppercase mt-0.5 ${b.status === "accepted" ? "text-green-600" : "text-orange-500"}`}>
                      {b.status === "accepted" ? `Accepted @ ${b.accepted_at}` : "Awaiting response..."}
                    </p>
                  </div>
                  <button onClick={() => handleWithdraw(b._id)} className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all"><XCircle size={18} /></button>
                </div>
              ))}
            </div>
          )}

          {showHistory ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center"><HistoryIcon size={18} className="mr-2"/> Service History</h3>
              {history.map((h) => (
                <div key={h._id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm text-gray-900">{h.service_name}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-medium mt-1">{h.completed_at || h.declined_at || h.status}</p>
                  </div>
                  <p className={`text-sm font-bold ${h.status === "completed" ? "text-green-600" : "text-red-500"}`}>₹{Number(h.price || 0).toLocaleString()}</p>
                </div>
              ))}
              {history.length === 0 && <p className="text-center text-gray-400 text-sm mt-10 italic">No past services found.</p>}
            </div>
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden bg-gray-50/30">
              
              {/* FILTERS */}
              <div className="p-4 bg-white border-b border-gray-100 space-y-3 z-10 shadow-sm">
                <div className="relative">
                  <input 
                    type="text" placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-100 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`absolute right-2 top-2 p-1.5 rounded-lg transition-all ${showFilters ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 shadow-sm border border-gray-200 hover:bg-gray-50'}`}
                  >
                    <SlidersHorizontal size={16} />
                  </button>
                </div>

                {showFilters && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Search Radius</span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">{filters.radius} km</span>
                      </label>
                      <input type="range" min="1" max="50" value={filters.radius} onChange={(e) => setFilters({...filters, radius: e.target.value})} className="w-full accent-blue-600" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Max Fee: ₹{filters.maxCharge}</label>
                      <input type="range" min="100" max="5000" step="100" value={filters.maxCharge} onChange={(e) => setFilters({...filters, maxCharge: e.target.value})} className="w-full accent-blue-600" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Min Rating</label>
                      <select value={filters.minRating} onChange={(e) => setFilters({...filters, minRating: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-sm outline-none">
                        <option value="0">Any</option><option value="3.5">3.5+</option><option value="4.0">4.0+</option><option value="4.5">4.5+</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
                  {categories.map((cat) => (
                    <button key={cat.name} onClick={() => setActiveCategory(cat.name)} className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeCategory === cat.name ? "bg-slate-900 text-white shadow-md" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
                      <span className="mr-2">{cat.icon}</span>{cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* PROVIDER LIST */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <p className="text-xs text-gray-400 font-medium px-1">Found {filteredProviders.length} providers within {filters.radius}km</p>
                
                {filteredProviders.map((p) => {
                  // Match active requests against the provider's user ID
                  const isRequested = liveBookings.some(
                    (b) => String(b.provider_id) === String(p.provider_id)
                  );
                  const distance = getDistanceKM(userLocation[0], userLocation[1], p.lat, p.lng).toFixed(1);

                  return (
                    <div key={p.id} className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-black text-gray-900 text-lg">{p.name}</h3>
                          <p className="text-blue-600 text-xs font-bold">{p.category}</p>
                        </div>
                        <div className="flex items-center bg-yellow-50 px-2 py-1.5 rounded-lg border border-yellow-100">
                          <Star size={12} className="text-yellow-500 fill-yellow-500 mr-1" />
                          <span className="text-xs font-bold text-yellow-700">{p.rating}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 font-medium bg-gray-50 p-3 rounded-xl mb-4 border border-gray-100">
                        <span className="flex items-center"><Clock size={14} className="mr-2 text-blue-500" /> {p.experience} Years</span>
                        <span className="flex items-center"><MapPin size={14} className="mr-2 text-red-400" /> {distance} km away</span>
                        <span className="flex items-center col-span-2 text-green-700 font-bold mt-1">
                          <DollarSign size={14} className="mr-1" /> Base Fee: ₹{p.charge}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setSelectedProviderMap({ ...p })}
                          className="flex-1 py-3 rounded-xl font-bold transition-all bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center justify-center border border-blue-100"
                        >
                          <Map size={16} className="mr-2"/> Locate
                        </button>
                        <button 
                          onClick={() => handleRequestService(p)} 
                          disabled={isRequested} 
                          className={`flex-1 py-3 rounded-xl font-bold transition-all shadow-sm ${isRequested ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-slate-900 text-white hover:bg-blue-600"}`}
                        >
                          {isRequested ? "Requested" : "Book"}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filteredProviders.length === 0 && (
                  <div className="text-center py-10">
                    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Search className="text-gray-400" size={24}/></div>
                    <h3 className="text-gray-900 font-bold">No providers found</h3>
                    <p className="text-gray-500 text-sm mt-1">Try expanding your search radius or filters.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MAP AREA */}
        <div className="hidden md:block flex-1 bg-gray-200 relative z-0">
          {isLocating && <div className="absolute inset-0 z-1002 bg-white/60 backdrop-blur-sm flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>}
          
          <button 
            onClick={handleRecenter}
            className="absolute top-6 right-6 z-1002 bg-white p-4 rounded-2xl shadow-xl text-blue-600 hover:bg-blue-50 transition-all border border-blue-100 group"
            title="Recenter to My Location"
          >
            <Navigation size={24} className="group-active:scale-90 transition-transform"/>
          </button>

          <MapContainer center={userLocation} zoom={13} style={{ height: "100%", width: "100%" }}>
            <ChangeView center={selectedProviderMap ? [selectedProviderMap.lat, selectedProviderMap.lng] : userLocation} zoom={selectedProviderMap ? 15 : 13} />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            
            {selectedProviderMap && (
              <Marker position={[selectedProviderMap.lat, selectedProviderMap.lng]}>
                <Popup>
                  <div className="p-2 min-w-120px">
                    <h4 className="font-black text-sm text-gray-900">{selectedProviderMap.name}</h4>
                    <p className="text-xs font-bold text-blue-600 mb-2">{selectedProviderMap.category}</p>
                    <p className="text-xs font-black text-green-600 bg-green-50 p-1.5 rounded-lg inline-block">₹{selectedProviderMap.charge}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            <Marker position={userLocation} icon={redIcon}>
              <Popup><div className="font-bold p-1">Your Location</div></Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>
    </>
  );
};

export default ReceiverDashboard;