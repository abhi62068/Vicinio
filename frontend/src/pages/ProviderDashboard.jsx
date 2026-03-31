import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Power, CheckCircle, DollarSign, Star, Home, Bell, User, LogOut, Save, FileText, History, Edit3, ClipboardCheck, Clock, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL, API_WS_BASE_URL } from '../config/api';

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [userData, setUserData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [completedJobsCount, setCompletedJobsCount] = useState(0); 
  const [isEditing, setIsEditing] = useState(false);
  const [wsConnection, setWsConnection] = useState(false);

  const [profileData, setProfileData] = useState({ bio: "", experience_years: 0, base_charge: 0, service_category: "" });

  // 1. Initialize User Data
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) { navigate('/login'); } 
    else {
      const parsed = JSON.parse(savedUser);
      setUserData(parsed);
      setProfileData({ 
        bio: parsed.bio || "", 
        experience_years: Number(parsed.experience_years) || 0, 
        base_charge: Number(parsed.base_charge) || 0, 
        service_category: parsed.service_category || "General" 
      });
    }
  }, [navigate]);

  // 2. Sync provider online status + profile from MongoDB after refresh.
  useEffect(() => {
    if (!userData) return;

    const syncProvider = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/location/provider/${String(userData.id)}`);
        if (!res.ok) return;
        const p = await res.json();

        setIsOnline(Boolean(p.is_online));
        setProfileData({
          bio: p.bio || "",
          experience_years: Number(p.experience || 0),
          base_charge: Number(p.charge || 0),
          service_category: p.category || "General",
        });

        // Keep name/id/role from localStorage, but refresh rating if provided.
        setUserData((prev) => {
          const nextRating = Number(p.rating || prev?.rating || 5.0);
          const currentRating = Number(prev?.rating || 5.0);
          if (currentRating === nextRating) return prev;
          return { ...prev, rating: nextRating };
        });
      } catch (e) {
        console.error("Provider sync failed:", e);
      }
    };

    syncProvider();
  }, [userData]);

  // 3. LIVE WEBSOCKET CONNECTION
  useEffect(() => {
    if (!userData || !isOnline) return;

    // ALL URLs MUST USE LOCALHOST NOW
    const ws = new WebSocket(`${API_WS_BASE_URL}/ws/${String(userData.id)}`);

    ws.onopen = () => setWsConnection(true);
    
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "NEW_REQUEST") {
        setRequests(prev => [payload.data, ...prev]);
        toast.success("New Job Request Received!", { icon: '🔔' });
      } else if (payload.type === "STATUS_UPDATE") {
        const { request_id: requestId, status } = payload || {};
        // Keep the dashboard list clean: requests panel only shows pending/accepted.
        if (requestId && (status === "declined" || status === "completed")) {
          setRequests(prev => prev.filter(r => String(r._id) !== String(requestId)));
        }
      }
    };

    ws.onclose = () => setWsConnection(false);

    return () => ws.close();
  }, [userData, isOnline]);

  // 3. Initial Fetch (Sync state on load or tab change)
  useEffect(() => {
    if (!userData) return;
    const fetchData = async () => {
      try {
        if (isOnline) {
          const res = await fetch(`${API_BASE_URL}/location/my-requests/${userData.id}`); // CHANGED
          if (res.ok) setRequests(await res.json());
        }
        if (activeTab === 'earnings' || activeTab === 'home') {
          const res = await fetch(`${API_BASE_URL}/location/history/${userData.id}?role=provider`); // CHANGED
          if (res.ok) {
            const data = await res.json();
            setHistory(data);
            setCompletedJobsCount(data.filter(h => h.status === 'completed').length);
          }
        }
      } catch (e) { console.error("Sync error:", e); }
    };
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [userData, isOnline, activeTab]);

  const toggleStatus = async () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const payload = {
            provider_id: String(userData.id), 
            name: String(userData.name),
            category: String(profileData.service_category || "General"),
            coordinates: [Number(pos.coords.longitude) || 0.0, Number(pos.coords.latitude) || 0.0],
            is_online: Boolean(nextStatus),
            experience: Number(profileData.experience_years) || 0,
            charge: Number(profileData.base_charge) || 0.0,
            rating: Number(userData.rating) || 5.0,
            bio: String(profileData.bio || "Professional service provider")
          };

          const res = await fetch(`${API_BASE_URL}/location/update`, { // CHANGED
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            if (nextStatus) toast.success("You are now ONLINE");
            else toast("You are OFFLINE", { icon: '🌙' });
          } else {
            console.error("Failed to update status", await res.text());
            toast.error("Status update failed on server.");
            setIsOnline(!nextStatus); 
          }
        } catch (error) {
          console.error("Network error:", error);
          setIsOnline(!nextStatus); 
        }
      });
    } else {
      toast.error("Geolocation is not supported by your browser");
      setIsOnline(false);
    }
  };

  const handleLogout = async () => {
    if (isOnline && userData) {
      try {
        await fetch(`${API_BASE_URL}/location/update`, { // CHANGED
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider_id: String(userData.id),
            name: String(userData.name),
            category: String(profileData.service_category || "General"),
            coordinates: [0.0, 0.0],
            is_online: false, 
            experience: Number(profileData.experience_years) || 0,
            charge: Number(profileData.base_charge) || 0.0,
            rating: Number(userData.rating) || 5.0,
            bio: String(profileData.bio || "")
          })
        });
      } catch (e) { console.error("Offline sync failed during logout", e); }
    }
    localStorage.removeItem("user");
    navigate('/login');
  };

  const handleAction = async (requestId, status) => {
    const toastId = toast.loading('Updating status...');
    try {
      const res = await fetch(`${API_BASE_URL}/location/request/${requestId}?status=${status}`, {  // CHANGED
        method: 'PATCH' 
      });
      if (res.ok) {
        if (status === 'declined' || status === 'completed') {
          setRequests(prev => prev.filter(r => r._id !== requestId));
        } else {
          setRequests(prev => prev.map(r => r._id === requestId ? { ...r, status: 'accepted' } : r));
        }
        toast.success(`Service ${status} successfully!`, { id: toastId });
      } else {
        toast.error("Failed to update status", { id: toastId });
      }
    } catch (e) { 
      console.error("Update failed:", e);
      toast.error("Network error", { id: toastId });
    }
  };

  const handleUpdateProfile = () => {
    const updatedUser = { 
      ...userData, 
      ...profileData, 
      experience_years: Number(profileData.experience_years), 
      base_charge: Number(profileData.base_charge) 
    };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUserData(updatedUser);
    setIsEditing(false);
    toast.success("Profile updated successfully!");
  };

  if (!userData) return null;

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <div className="w-64 bg-gray-900 text-white hidden md:flex flex-col shadow-xl">
        <div className="p-6 border-b border-gray-800"><h2 className="text-2xl font-bold text-blue-400 tracking-tight">Geolocate</h2></div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('home')} className={`w-full flex items-center p-3 rounded-xl transition-all ${activeTab === 'home' ? 'bg-blue-600 shadow-md' : 'hover:bg-gray-800'}`}><Home size={20} className="mr-3"/> Dashboard</button>
          <button onClick={() => setActiveTab('earnings')} className={`w-full flex items-center p-3 rounded-xl transition-all ${activeTab === 'earnings' ? 'bg-blue-600 shadow-md' : 'hover:bg-gray-800'}`}><DollarSign size={20} className="mr-3"/> Earnings</button>
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center p-3 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-blue-600 shadow-md' : 'hover:bg-gray-800'}`}><User size={20} className="mr-3"/> Profile</button>
        </nav>
        <div className="p-4 border-t border-gray-800"><button onClick={handleLogout} className="w-full flex items-center p-3 text-gray-400 hover:text-white hover:bg-red-600/20 rounded-xl transition-all"><LogOut size={20} className="mr-3"/> Logout</button></div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b p-4 flex justify-between items-center px-8">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-800 capitalize mr-4">Welcome, {userData.name}!</h1>
            {isOnline && (
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase flex items-center ${wsConnection ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                <Zap size={10} className="mr-1"/> {wsConnection ? 'Live Sync Active' : 'Connecting...'}
              </span>
            )}
          </div>
          <button onClick={toggleStatus} className={`px-6 py-2 rounded-full font-bold transition-all shadow-md ${isOnline ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            <Power size={18} className="mr-2 inline" /> {isOnline ? 'ONLINE' : 'GO ONLINE'}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === 'home' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border flex items-center">
                    <div className="bg-blue-100 p-4 rounded-xl mr-4"><CheckCircle className="text-blue-600" size={24} /></div>
                    <div><p className="text-sm text-gray-500 font-medium">Jobs Completed</p><p className="text-2xl font-bold">{completedJobsCount}</p></div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-black text-gray-800 mb-4 flex items-center"><Bell className="mr-2 text-blue-600" /> Active Service Requests</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {requests.map((req) => (
                    <div key={req._id} className="bg-white rounded-3xl shadow-sm border-l-4 border-blue-500 p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                          <h4 className="text-xl font-black text-gray-900">{req.service_name}</h4>
                          <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${req.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{req.status}</span>
                      </div>
                      <p className="text-gray-500 mt-1 font-medium text-sm">Customer: <span className="text-gray-800">{req.receiver_name}</span></p>
                      {req.accepted_at && <p className="text-gray-400 text-xs mt-2 flex items-center font-bold bg-gray-50 inline-block px-2 py-1 rounded-md"><Clock size={12} className="mr-1"/> Started at {req.accepted_at}</p>}
                      
                      <div className="mt-6 flex gap-3">
                        {req.status === 'pending' ? (
                          <>
                            <button onClick={() => handleAction(req._id, 'accepted')} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-sm transition-all">Accept Service</button>
                            <button onClick={() => handleAction(req._id, 'declined')} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all">Decline</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleAction(req._id, 'completed')} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center hover:bg-green-700 shadow-sm transition-all">
                              <ClipboardCheck size={18} className="mr-2"/> Mark as Finished
                            </button>
                            <button onClick={() => handleAction(req._id, 'declined')} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all">
                              Cancel Booking
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {isOnline && requests.length === 0 && (
                    <div className="col-span-2 text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                      <Zap className="mx-auto text-yellow-400 mb-4" size={40} />
                      <p className="text-gray-500 font-bold">Listening for live requests in your area...</p>
                    </div>
                  )}
                  {!isOnline && (
                    <div className="col-span-2 text-center py-20 bg-gray-100 rounded-3xl border border-gray-200">
                      <Power className="mx-auto text-gray-400 mb-4" size={40} />
                      <p className="text-gray-500 font-bold">You are currently offline. Toggle your status to receive jobs.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'earnings' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-xl bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-slate-400 text-sm uppercase font-bold tracking-widest mb-2">Total Lifetime Revenue</p>
                  <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                    ₹{history
                      .filter(h => h.status === 'completed')
                      .reduce((acc, curr) => acc + Number(curr.price || 0), 0)
                      .toLocaleString()}
                  </h2>
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center"><History className="mr-2 text-blue-600"/> Detailed Service History</h3>
                <div className="space-y-3">
                  {history.map((h) => (
                    <div key={h._id} className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                      <div>
                          <p className="font-bold text-gray-900">{h.service_name}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-1">
                            {h.status === 'completed'
                              ? `Finished: ${h.completed_at}`
                              : `Declined: ${h.declined_at || h.created_at}`}
                          </p>
                      </div>
                      <p className={`font-black text-lg ${h.status === 'completed' ? 'text-emerald-600' : 'text-red-400'}`}>
                        {h.status === 'completed'
                          ? `+₹${Number(h.price || 0).toLocaleString()}`
                          : '₹0'}
                      </p>
                    </div>
                  ))}
                  {history.length === 0 && <p className="text-center text-gray-400 py-10 font-medium italic">No history available yet.</p>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-3xl animate-in fade-in">
              {!isEditing ? (
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center">
                      <div className="w-24 h-24 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white text-4xl font-black mr-6 uppercase shadow-lg">{userData.name.charAt(0)}</div>
                      <div><h2 className="text-3xl font-black text-gray-900 capitalize">{userData.name}</h2><p className="text-blue-600 font-bold mt-1 tracking-wide">{profileData.service_category}</p></div>
                    </div>
                    <button onClick={() => setIsEditing(true)} className="flex items-center px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-md"><Edit3 size={18} className="mr-2"/> Edit Profile</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 text-center">
                      <p className="text-gray-400 text-[10px] uppercase font-black mb-1 tracking-widest">Experience</p>
                      <p className="text-2xl font-black text-gray-800">{profileData.experience_years} <span className="text-sm">Yrs</span></p>
                    </div>
                    <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 text-center">
                      <p className="text-gray-400 text-[10px] uppercase font-black mb-1 tracking-widest">Base Charge</p>
                      <p className="text-2xl font-black text-emerald-600">₹{profileData.base_charge}</p>
                    </div>
                    <div className="p-5 bg-yellow-50 rounded-3xl border border-yellow-100 text-center">
                      <p className="text-yellow-600/70 text-[10px] uppercase font-black mb-1 tracking-widest">Rating</p>
                      <p className="text-2xl font-black text-yellow-600 flex items-center justify-center"><Star size={24} fill="currentColor" className="mr-1"/> {userData.rating || 5.0}</p>
                    </div>
                  </div>
                  <h4 className="font-black text-gray-900 mb-3 flex items-center text-lg"><FileText size={20} className="mr-2 text-blue-600"/> Professional Bio</h4>
                  <p className="text-gray-600 bg-gray-50 p-6 rounded-2xl font-medium border-l-4 border-blue-500 text-sm leading-relaxed">"{profileData.bio || 'Available for high-quality professional service.'}"</p>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                  <h2 className="text-2xl font-black mb-8 flex items-center text-gray-800"><User className="mr-3 text-blue-600"/> Update Professional Profile</h2>
                  <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Service Category</label>
                        <select value={profileData.service_category} onChange={(e) => setProfileData({...profileData, service_category: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-800">
                            <option value="Plumber">Plumber</option><option value="Electrician">Electrician</option><option value="Mechanic">Mechanic</option><option value="General Handyman">General Handyman</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Exp (Years)</label><input type="number" value={profileData.experience_years} onChange={(e) => setProfileData({...profileData, experience_years: parseInt(e.target.value) || 0})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"/></div>
                      <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Charge (₹)</label><input type="number" value={profileData.base_charge} onChange={(e) => setProfileData({...profileData, base_charge: parseFloat(e.target.value) || 0})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500"/></div>
                    </div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Bio</label><textarea rows="4" value={profileData.bio} onChange={(e) => setProfileData({...profileData, bio: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl resize-none outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-700"></textarea></div>
                    <div className="flex gap-4 pt-6 border-t border-gray-100">
                        <button onClick={handleUpdateProfile} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center"><Save className="mr-2" size={20}/> Save Changes</button>
                        <button onClick={() => setIsEditing(false)} className="px-8 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all">Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProviderDashboard;