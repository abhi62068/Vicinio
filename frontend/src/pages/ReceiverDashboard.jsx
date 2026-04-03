import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import {
  Search, MapPin, Wrench, Zap, Droplets, LogOut, Loader2, Star, Clock, 
  IndianRupee, BellRing, History as HistoryIcon, XCircle, Navigation, SlidersHorizontal, 
  Map, Activity, Phone, AlertCircle, UserCircle, LifeBuoy, Shield, Flame, Building2,
  Sparkles, Sprout, Hammer, Paintbrush, Wind, Bug, Settings, Sun, Moon, Send, MessageCircle
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal'; 
import { API_BASE_URL, API_WS_BASE_URL } from "../config/api";

const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  map.setView(center, zoom || map.getZoom());
  return null;
};

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
  
  const [providers, setProviders] = useState([]);
  const [emergencyServices, setEmergencyServices] = useState([]);
  const [liveBookings, setLiveBookings] = useState([]);
  const [history, setHistory] = useState([]);
  
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(true);
  const [selectedProviderMap, setSelectedProviderMap] = useState(null); 
  
  // Navigation layout state
  const [view, setView] = useState('home'); // 'home', 'profile', 'emergency', 'history'
  const [emCategory, setEmCategory] = useState("Police"); // for Emergency tab sub-menu
  
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [filters, setFilters] = useState({ radius: 15, minRating: 0, minExperience: 0, maxCharge: 2000 });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // Phase 2: Chat & Rating & Theme
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [activeChat, setActiveChat] = useState(null); // { request_id, provider_id, provider_name }
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [ratingModal, setRatingModal] = useState({ isOpen: false, provider_id: '', request_id: '', provider_name: '' });

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) navigate("/login");
    else setUserData(JSON.parse(savedUser));

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLocation([pos.coords.latitude, pos.coords.longitude]); setIsLocating(false); },
        () => setIsLocating(false)
      );
    }
    
    // Apply theme
    document.documentElement.setAttribute('data-theme', theme);
  }, [navigate, theme]);

  useEffect(() => {
    if (!userData || !userLocation) return;
    const fetchData = async () => {
      try {
        const geoUrl = `${API_BASE_URL}/location/nearby?lat=${userLocation[0]}&lng=${userLocation[1]}&radius_km=${filters.radius}`;
        const pRes = await fetch(geoUrl);
        if (pRes.ok) setProviders(await pRes.json());

        const emUrl = `${API_BASE_URL}/location/emergency-services?lat=${userLocation[0]}&lng=${userLocation[1]}&radius_km=${filters.radius}&category=${emCategory}`;
        const emRes = await fetch(emUrl);
        if (emRes.ok) setEmergencyServices(await emRes.json());

        const activeRes = await fetch(`${API_BASE_URL}/location/active-requests/${String(userData.id)}?role=receiver`);
        if (activeRes.ok) setLiveBookings(await activeRes.json());

        const hRes = await fetch(`${API_BASE_URL}/location/history/${String(userData.id)}?role=receiver`);
        if (hRes.ok) setHistory(await hRes.json());
      } catch (error) { console.error("Sync error:", error); }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [userData, userLocation, filters.radius, emCategory]);

  // WebSocket for Live Chat & Status
  useEffect(() => {
    if (!userData) return;
    const socket = new WebSocket(`${API_WS_BASE_URL}/ws/${userData.id}`);
    
    socket.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (payload.type === "STATUS_UPDATE") {
            const { request_id, status, message } = payload;
            toast.success(message);
            setLiveBookings(prev => prev.map(b => b._id === request_id ? { ...b, status } : b));
            
            if (status === "completed") {
                const req = liveBookings.find(b => b._id === request_id);
                if (req) {
                    setRatingModal({
                        isOpen: true,
                        provider_id: req.provider_id,
                        request_id: req._id,
                        provider_name: "Service Provider"
                    });
                }
            }
        } else if (payload.type === "NEW_CHAT_MESSAGE") {
            if (activeChat && activeChat.request_id === payload.data.request_id) {
                setChatMessages(prev => [...prev, payload.data]);
            } else {
                toast(`New message from ${payload.data.sender_name}`, { icon: '💬' });
            }
        }
    };
    return () => socket.close();
  }, [userData, activeChat, liveBookings]);

  useEffect(() => {
    if (activeChat) {
        fetch(`${API_BASE_URL}/location/chat/history/${activeChat.request_id}`)
            .then(res => res.json())
            .then(data => setChatMessages(data));
    }
  }, [activeChat]);

  const handleLogout = () => { localStorage.removeItem("user"); navigate("/login"); };

  const handleRecenter = () => {
    setSelectedProviderMap(null); 
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition((pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]));
  };

  const handleSOS = async () => {
    toast((t) => (
      <div className="flex flex-col items-center p-2 text-center">
        <AlertCircle className="text-red-600 mb-2" size={32}/>
        <b className="text-red-600 text-lg">SOS Triggered</b>
        <p className="text-sm font-bold mt-2">Your Location:</p>
        <p className="bg-red-50 text-red-900 px-3 py-1 rounded font-mono text-xs mt-1">Lat: {userLocation[0].toFixed(5)}, Lng: {userLocation[1].toFixed(5)}</p>
        <p className="text-[10px] text-gray-500 mt-2">Read coordinates to the operator.</p>
      </div>
    ), { duration: 10000 });
    window.location.href = "tel:112";
    try {
      await fetch(`${API_BASE_URL}/location/sos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: String(userData.id), user_name: String(userData.name), lat: userLocation[0], lng: userLocation[1] })
      });
    } catch (e) { console.error(e); }
  };

  const handleRequestService = async (provider) => {
    const payload = {
      receiver_id: String(userData.id), receiver_name: String(userData.name),
      provider_id: String(provider.provider_id), service_name: String(provider.category), price: Number(provider.charge),
    };
    const toastId = toast.loading(`Contacting ${provider.name}...`);
    try {
      const res = await fetch(`${API_BASE_URL}/location/request`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (res.ok) toast.success(`Request sent to ${provider.name}!`, { id: toastId });
      else { const err = await res.json(); toast.error(err.detail || "Failed to send request", { id: toastId }); }
    } catch (error) { toast.error("Network error. Could not send request.", { id: toastId }); }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const msgPayload = {
      request_id: activeChat.request_id,
      sender_id: String(userData.id),
      sender_name: String(userData.name),
      receiver_id: activeChat.provider_id,
      message: newMessage
    };

    try {
      const res = await fetch(`${API_BASE_URL}/location/chat/send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msgPayload)
      });
      if (res.ok) {
        setChatMessages(prev => [...prev, { ...msgPayload, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        setNewMessage("");
      }
    } catch (e) { console.error(e); }
  };

  const handleSubmitReview = async (rating, comment) => {
     const payload = {
         request_id: ratingModal.request_id,
         provider_id: ratingModal.provider_id,
         receiver_id: String(userData.id),
         rating,
         comment
     };
     try {
         const res = await fetch(`${API_BASE_URL}/location/review`, {
             method: "POST", headers: { "Content-Type": "application/json" },
             body: JSON.stringify(payload)
         });
         if (res.ok) {
             toast.success("Thank you for your feedback!");
             setRatingModal({ ...ratingModal, isOpen: false });
             setLiveBookings(prev => prev.filter(b => b._id !== ratingModal.request_id));
         }
     } catch (e) { console.error(e); }
  };

  const toggleTheme = () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      localStorage.setItem('theme', newTheme);
  };

  const handleWithdraw = (requestId) => {
    setConfirmModal({
      isOpen: true, title: "Withdraw Request", message: "Are you sure you want to withdraw this service request?",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        const toastId = toast.loading('Withdrawing request...');
        try {
          const res = await fetch(`${API_BASE_URL}/location/request/${String(requestId)}`, { method: "DELETE" });
          if (res.ok) { setLiveBookings((prev) => prev.filter((b) => b._id !== requestId)); toast.success("Request withdrawn.", { id: toastId }); } 
          else { toast.error("Failed to withdraw request.", { id: toastId }); }
        } catch (error) { toast.error("Error withdrawing request.", { id: toastId }); }
      }
    });
  };

  const filteredProviders = providers.filter((p) => {
    if (activeCategory !== "All" && p.category !== activeCategory) return false;
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (p.rating < filters.minRating || p.experience < filters.minExperience || p.charge > filters.maxCharge) return false;
    return true;
  });

  const emsData = emergencyServices;

  if (!userData || !userLocation) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-blue-600" size={40} /><span className="ml-3 font-bold text-gray-600">Acquiring Location...</span>
    </div>
  );

  return (
    <>
      <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })} />
      <div className="flex h-screen w-full bg-gray-50 overflow-hidden font-sans">
        
        {/* NEW DARK SIDEBAR (Main Nav) */}
        <div className="w-[85px] bg-[#1d2333] shadow-[4px_0_24px_rgba(0,0,0,0.15)] z-[1005] flex flex-col items-center py-6 justify-between select-none shrink-0 relative">
          <div className="w-full flex flex-col items-center space-y-6">
            <button onClick={() => setView('profile')} className="flex flex-col items-center group relative mb-2" title="Profile">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${view === 'profile' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-[#2a3041] text-gray-300 group-hover:bg-[#343b4f] group-hover:text-white'}`}>
                <UserCircle size={24} />
              </div>
              <span className={`text-[9px] font-bold mt-1.5 uppercase tracking-widest ${view === 'profile' ? 'text-blue-400' : 'text-gray-500'}`}>Profile</span>
            </button>

            <button onClick={() => setView('home')} className="flex flex-col items-center group relative w-full" title="Home">
              {view === 'home' && <span className="absolute left-0 top-[14px] h-5 w-1 bg-white rounded-r-md"></span>}
              <div className={`w-12 h-12 flex flex-col items-center justify-center transition-all duration-300 ${view === 'home' ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                <Map size={24} className="mb-0.5" />
                <span className="text-[9px] font-bold uppercase tracking-widest mt-1">Map</span>
              </div>
            </button>

            <button onClick={() => setView('emergency')} className="flex flex-col items-center group relative w-full mt-2" title="Emergency">
              {view === 'emergency' && <span className="absolute left-0 top-[14px] h-5 w-1 bg-red-500 rounded-r-md shadow-[0_0_10px_rgba(239,68,68,1)]"></span>}
              <div className={`w-12 h-12 flex flex-col items-center justify-center transition-all duration-300 ${view === 'emergency' ? 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'text-red-400/50 group-hover:text-red-400 group-hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}>
                <LifeBuoy size={28} className={view !== 'emergency' ? "animate-pulse" : ""} />
                <span className="text-[9px] font-bold uppercase tracking-widest mt-1">SOS</span>
              </div>
            </button>

            <button onClick={() => setView('history')} className="flex flex-col items-center group relative w-full mt-2" title="History">
              {view === 'history' && <span className="absolute left-0 top-[14px] h-5 w-1 bg-white rounded-r-md"></span>}
              <div className={`w-12 h-12 flex flex-col items-center justify-center transition-all duration-300 ${view === 'history' ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                <Clock size={24} className="mb-0.5" />
                <span className="text-[9px] font-bold uppercase tracking-widest mt-1">History</span>
              </div>
            </button>
          </div>

          <button onClick={toggleTheme} className="flex flex-col items-center group text-gray-500 hover:text-blue-500 transition-all mb-6" title="Toggle Theme">
            {theme === 'light' ? <Moon size={22} className="mb-1" /> : <Sun size={22} className="mb-1" />}
            <span className="text-[9px] font-bold uppercase tracking-widest">{theme === 'light' ? 'Night' : 'Day'}</span>
          </button>

          <button onClick={handleLogout} className="flex flex-col items-center group text-gray-500 hover:text-red-400 transition-all" title="Exit">
            <LogOut size={22} className="mb-1" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Exit</span>
          </button>
        </div>

        {/* SECONDARY PANEL */}
        <div className="w-full md:w-1/3 lg:w-[400px] bg-white shadow-xl z-[1001] flex flex-col relative shrink-0">
          
          <div className="p-6 border-b border-gray-100 bg-white">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Geolocate</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">User ID: {userData.id.substring(0, 8).toUpperCase()}</p>
          </div>

          {liveBookings.length > 0 && view !== 'history' && view !== 'profile' && (
            <div className="p-4 bg-blue-50/50 border-b border-blue-100 shrink-0">
              <h3 className="text-[10px] font-bold text-blue-600 uppercase mb-2 flex items-center tracking-widest"><BellRing size={12} className="mr-2 animate-pulse" /> Active Service Tracking</h3>
              {liveBookings.map((b) => (
                <div key={b._id} className="bg-white p-3 rounded-xl shadow-sm border border-blue-100 mb-2 flex justify-between items-center group/card">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800">{b.service_name}</p>
                    <p className={`text-[10px] font-bold uppercase mt-0.5 ${b.status === "accepted" ? "text-green-600" : "text-orange-500"}`}>{b.status === "accepted" ? `Accepted` : "Awaiting response..."}</p>
                  </div>
                  <div className="flex gap-1">
                    {b.status === "accepted" && (
                        <button onClick={() => setActiveChat({ request_id: b._id, provider_id: b.provider_id, provider_name: b.provider_name || "Provider" })} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Chat"><MessageCircle size={18} /></button>
                    )}
                    <button onClick={() => handleWithdraw(b._id)} className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all"><XCircle size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'history' && (
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center tracking-tight"><HistoryIcon size={18} className="mr-2 text-blue-600"/> Service History</h3>
              <div className="space-y-4">
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
            </div>
          )}

          {view === 'profile' && (
             <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
               <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
                 <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-full flex items-center justify-center text-white mx-auto mb-4 shadow-[0_10px_20px_rgba(37,99,235,0.3)]">
                   <UserCircle size={48} />
                 </div>
                 <h2 className="text-2xl font-black text-gray-900 tracking-tight">{userData.name}</h2>
                 <p className="text-sm font-bold text-gray-400 mt-1">{userData.email || 'Receiver Account'}</p>
                 <div className="mt-6 flex justify-center">
                    <span className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase">Member Since 2026</span>
                 </div>
               </div>
             </div>
          )}

          {view === 'emergency' && (
            <div className="flex flex-col flex-1 overflow-hidden bg-red-50/10">
               <div className="p-5 bg-white border-b border-gray-100 z-10">
                 <h2 className="text-sm font-black text-gray-800 tracking-tight flex items-center mb-4"><AlertCircle size={18} className="mr-2 text-red-500"/> Select Emergency Service</h2>
                 
                 <div className="grid grid-cols-2 gap-3">
                   <button onClick={() => setEmCategory('Police')} className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-sm border ${emCategory === 'Police' ? 'bg-blue-600 border-blue-600 text-white shadow-blue-600/30 ring-4 ring-blue-600/10' : 'bg-white border-gray-100 text-gray-600 hover:border-gray-300'}`}>
                     <Shield size={24} className="mb-2" />
                     <span className="text-[11px] font-black tracking-widest uppercase">Police</span>
                   </button>
                   <button onClick={() => setEmCategory('Ambulance')} className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-sm border ${emCategory === 'Ambulance' ? 'bg-red-600 border-red-600 text-white shadow-red-600/30 ring-4 ring-red-600/10' : 'bg-white border-gray-100 text-gray-600 hover:border-gray-300'}`}>
                     <Activity size={24} className="mb-2" />
                     <span className="text-[11px] font-black tracking-widest uppercase">Ambulance</span>
                   </button>
                   <button onClick={() => setEmCategory('Fire')} className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-sm border ${emCategory === 'Fire' ? 'bg-orange-500 border-orange-500 text-white shadow-orange-500/30 ring-4 ring-orange-500/10' : 'bg-white border-gray-100 text-gray-600 hover:border-gray-300'}`}>
                     <Flame size={24} className="mb-2" />
                     <span className="text-[11px] font-black tracking-widest uppercase">Fire Station</span>
                   </button>
                   <button onClick={() => setEmCategory('Hospital')} className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-sm border ${emCategory === 'Hospital' ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-600/30 ring-4 ring-emerald-600/10' : 'bg-white border-gray-100 text-gray-600 hover:border-gray-300'}`}>
                     <Building2 size={24} className="mb-2" />
                     <span className="text-[11px] font-black tracking-widest uppercase">Hospitals</span>
                   </button>
                 </div>
               </div>

               <div className="flex-1 overflow-y-auto p-4 space-y-4">
                 <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase px-1 text-center bg-gray-100 py-1.5 rounded-lg border border-gray-200">
                   {emsData.length} Units Found  &bull; {filters.radius}km Radius
                 </p>
                 {emsData.map((e, idx) => (
                     <div key={idx} className="p-4 rounded-2xl border border-gray-100 bg-white shadow-[0_4px_15px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-black text-gray-900 leading-tight text-[15px]">{e.name}</h3>
                            <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest mt-1">{e.category}</p>
                          </div>
                          <div className="flex items-center text-[10px] text-gray-700 font-bold bg-gray-100 px-2.5 py-1.5 rounded-lg">
                            <MapPin size={12} className="mr-1 text-slate-800" /> {e.distance ? e.distance.toFixed(1) : 0} km
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button onClick={() => setSelectedProviderMap({ ...e })} className="flex-1 py-2.5 rounded-xl font-bold transition-all bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center justify-center border border-gray-200 text-xs">
                            <Map size={14} className="mr-1.5"/> Locate
                          </button>
                          <a href={`tel:${e.phone}`} className="flex-1 py-2.5 rounded-xl font-bold transition-all bg-slate-900 text-white hover:bg-black flex items-center justify-center text-xs shadow-md">
                            <Phone size={14} className="mr-1.5"/> Call Unit
                          </a>
                        </div>
                      </div>
                 ))}
                 {emsData.length === 0 && (
                   <div className="text-center py-10 opacity-70">
                     <AlertCircle size={32} className="mx-auto text-gray-300 mb-3"/>
                     <p className="text-sm font-bold text-gray-500">No facilities found nearby.</p>
                   </div>
                 )}
               </div>
            </div>
          )}

          {view === 'home' && (
            <div className="flex flex-col flex-1 overflow-hidden bg-gray-50/30">
              <div className="p-5 bg-white border-b border-gray-100 space-y-4 z-10 shrink-0">
                <div className="relative">
                  <input type="text" placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"/>
                  <Search className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                  <button onClick={() => setShowFilters(!showFilters)} className={`absolute right-2 top-2 p-1.5 rounded-lg transition-all ${showFilters ? 'bg-slate-900 text-white' : 'bg-white text-gray-500 shadow-sm border border-gray-200 hover:bg-gray-50'}`}><SlidersHorizontal size={16} /></button>
                </div>

                {showFilters && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-800 uppercase tracking-widest mb-2 flex items-center justify-between">
                        <span>Search Radius</span><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">{filters.radius} km</span>
                      </label>
                      <input type="range" min="1" max="50" value={filters.radius} onChange={(e) => setFilters({...filters, radius: e.target.value})} className="w-full accent-blue-600" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Max Fee: ₹{filters.maxCharge}</label>
                      <input type="range" min="100" max="5000" step="100" value={filters.maxCharge} onChange={(e) => setFilters({...filters, maxCharge: e.target.value})} className="w-full accent-blue-600" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Min Rating</label>
                      <select value={filters.minRating} onChange={(e) => setFilters({...filters, minRating: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm font-bold outline-none text-gray-700 shadow-sm">
                        <option value="0">Any</option><option value="3.5">3.5+</option><option value="4.0">4.0+</option><option value="4.5">4.5+</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar shrink-0">
                  {[
                    { name: "All", icon: <MapPin size={16} /> }, 
                    { name: "Plumber", icon: <Droplets size={16} /> }, 
                    { name: "Electrician", icon: <Zap size={16} /> }, 
                    { name: "Mechanic", icon: <Wrench size={16} /> },
                    { name: "Cleaner", icon: <Sparkles size={16} /> },
                    { name: "Gardener", icon: <Sprout size={16} /> },
                    { name: "Carpenter", icon: <Hammer size={16} /> },
                    { name: "Painter", icon: <Paintbrush size={16} /> },
                    { name: "AC Technician", icon: <Wind size={16} /> },
                    { name: "Pest Control", icon: <Bug size={16} /> },
                    { name: "Handyman", icon: <Settings size={16} /> }
                  ].map((cat) => (
                    <button key={cat.name} onClick={() => setActiveCategory(cat.name)} className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeCategory === cat.name ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-800"}`}>
                      <span className="mr-2">{cat.icon}</span>{cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {liveBookings.length > 0 && activeCategory === "All" && !searchTerm && (
                  <div className="mb-6 space-y-3">
                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest px-1">Ongoing Services</h3>
                    {liveBookings.map((b) => (
                      <div key={b._id} className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-[2rem] text-white shadow-xl shadow-blue-200 relative overflow-hidden group">
                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Active Request</p>
                              <h4 className="text-xl font-black italic">{b.service_name}</h4>
                            </div>
                            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">{b.status}</span>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2">
                             <div className="flex-1">
                               <p className="text-xs font-bold opacity-80">Provider: <span className="text-white">{b.provider_name || "Assigned"}</span></p>
                               <div className="flex items-center mt-1 text-[10px] font-bold opacity-60"><Clock size={10} className="mr-1"/> Started at {b.accepted_at || "Just now"}</div>
                             </div>
                             <div className="flex gap-2">
                               {b.status === "accepted" && (
                                 <button onClick={() => setActiveChat({ request_id: b._id, provider_id: b.provider_id, provider_name: b.provider_name || "Provider" })} className="p-3 bg-white text-blue-600 rounded-xl hover:scale-105 transition-all shadow-lg shadow-blue-900/20"><MessageCircle size={20} /></button>
                               )}
                               <button onClick={() => handleWithdraw(b._id)} className="p-3 bg-red-500/20 text-white border border-white/20 rounded-xl hover:bg-red-500/40 transition-all"><XCircle size={20} /></button>
                             </div>
                          </div>
                        </div>
                        <Activity className="absolute bottom-[-20px] right-[-20px] text-white/5" size={120} />
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] tracking-widest text-gray-400 font-black uppercase px-1 text-center">Found {filteredProviders.length} providers &bull; {filters.radius}km</p>
                {filteredProviders.map((p) => {
                  const isRequested = liveBookings.some((b) => String(b.provider_id) === String(p.provider_id));
                  const distance = getDistanceKM(userLocation[0], userLocation[1], p.lat, p.lng).toFixed(1);

                  return (
                    <div key={p.id} className="p-5 rounded-3xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-black text-gray-900 text-[17px] tracking-tight">{p.name}</h3>
                          <p className="text-blue-600 text-[10px] uppercase tracking-widest font-black mt-0.5">{p.category}</p>
                        </div>
                        <div className="flex items-center bg-yellow-50 px-2 py-1.5 rounded-lg border border-yellow-100">
                          <Star size={12} className="text-yellow-500 fill-yellow-500 mr-1" /><span className="text-xs font-bold text-yellow-700">{p.rating}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 font-medium bg-gray-50 p-3 rounded-2xl border border-gray-100 mb-4">
                        <span className="flex items-center"><Clock size={14} className="mr-2 text-blue-500" /> {p.experience} Years</span>
                        <span className="flex items-center"><MapPin size={14} className="mr-2 text-red-400" /> {distance} km away</span>
                        <span className="flex items-center col-span-2 text-emerald-700 font-black tracking-wide mt-1"><IndianRupee size={14} className="mr-1" /> Base Fee: ₹{p.charge}</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedProviderMap({ ...p })} className="flex-1 py-3 rounded-xl font-bold transition-all bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center justify-center border border-blue-100"><Map size={16} className="mr-2"/> Locate</button>
                        <button onClick={() => handleRequestService(p)} disabled={isRequested} className={`flex-1 py-3 rounded-xl font-bold transition-all shadow-sm ${isRequested ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed" : "bg-slate-900 text-white hover:bg-blue-600 shadow-xl shadow-slate-900/10"}`}>{isRequested ? "Requested" : "Book"}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MAP AREA */}
        <div className="hidden lg:block flex-1 bg-gray-100 relative z-0">
          {isLocating && <div className="absolute inset-0 z-[1002] bg-white/60 backdrop-blur-sm flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>}
          
          <button onClick={handleRecenter} className="absolute top-6 right-6 z-[1002] bg-white p-4 rounded-2xl shadow-xl text-blue-600 hover:bg-blue-50 transition-all border border-blue-100 group" title="Recenter to My Location">
            <Navigation size={24} className="group-active:scale-90 transition-transform"/>
          </button>

          <button onClick={handleSOS} className="absolute bottom-10 right-10 z-[1002] bg-red-600 p-4 rounded-full shadow-[0_10px_30px_rgba(220,38,38,0.5)] text-white hover:bg-red-700 hover:scale-105 transition-all group animate-[pulse_2s_infinite] hover:animate-none flex items-center h-20 w-20 justify-center" title="EMERGENCY SOS">
            <AlertCircle size={40} className="mr-0 drop-shadow-md" />
          </button>

          <MapContainer center={userLocation} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl={false}>
            <ChangeView center={selectedProviderMap ? [selectedProviderMap.lat, selectedProviderMap.lng] : userLocation} zoom={selectedProviderMap ? 15 : 13} />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="map-tiles" />
            
            {selectedProviderMap && (
              <Marker position={[selectedProviderMap.lat, selectedProviderMap.lng]}>
                <Popup className="custom-popup">
                  <div className="p-2 min-w-[120px]">
                    <h4 className="font-black text-sm text-gray-900">{selectedProviderMap.name}</h4>
                    <p className="text-[10px] uppercase tracking-widest font-black text-blue-600 mb-2 mt-0.5">{selectedProviderMap.category}</p>
                    {selectedProviderMap.charge && <p className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded inline-block">₹{selectedProviderMap.charge}</p>}
                  </div>
                </Popup>
              </Marker>
            )}

            <Marker position={userLocation} icon={redIcon}>
              <Popup><div className="font-bold p-1 text-sm">Your Location</div></Popup>
            </Marker>
          </MapContainer>
        </div>

        {/* FLOATING UI OVERLAYS */}
        {activeChat && (
          <ChatWindow 
            activeChat={activeChat} 
            messages={chatMessages} 
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            onSend={handleSendChat}
            onClose={() => setActiveChat(null)}
            userId={userData.id}
          />
        )}

        <RatingModal 
          isOpen={ratingModal.isOpen}
          providerName={ratingModal.provider_name}
          onSubmit={handleSubmitReview}
        />
      </div>
    </>
  );
};

// --- CHAT WINDOW COMPONENT ---
const ChatWindow = ({ activeChat, messages, newMessage, setNewMessage, onSend, onClose, userId }) => {
    const scrollRef = React.useRef();
    useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

    return (
        <div className="absolute bottom-4 left-4 w-80 bg-white shadow-2xl rounded-2xl z-[1010] border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                <div>
                    <h4 className="text-sm font-black tracking-tight">{activeChat.provider_name}</h4>
                    <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest">Active Chat</p>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg"><XCircle size={20} /></button>
            </div>
            <div ref={scrollRef} className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${String(m.sender_id) === String(userId) ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-xs shadow-sm ${String(m.sender_id) === String(userId) ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}`}>
                            {m.message}
                            <div className={`text-[8px] mt-1 opacity-60 ${String(m.sender_id) === String(userId) ? 'text-right' : ''}`}>{m.timestamp}</div>
                        </div>
                    </div>
                ))}
            </div>
            <form onSubmit={onSend} className="p-3 border-t bg-white flex gap-2">
                <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="submit" className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700"><Send size={16} /></button>
            </form>
        </div>
    );
};

// --- RATING MODAL COMPONENT ---
const RatingModal = ({ isOpen, providerName, onSubmit }) => {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 to-orange-500"></div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight text-center mb-2">Service Completed!</h3>
                <p className="text-gray-500 text-center text-sm font-medium mb-6">How was your experience with {providerName}?</p>
                
                <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} onClick={() => setRating(s)} className={`p-2 transition-all ${rating >= s ? 'text-yellow-500 animate-in zoom-in-50' : 'text-gray-200'}`}><Star size={32} fill={rating >= s ? 'currentColor' : 'none'} /></button>
                    ))}
                </div>

                <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write your feedback here..." className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24 mb-6" />

                <button onClick={() => onSubmit(rating, comment)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl shadow-slate-900/20 hover:bg-blue-600 transition-all uppercase tracking-widest text-xs">Submit Feedback</button>
            </div>
        </div>
    );
};

export default ReceiverDashboard;