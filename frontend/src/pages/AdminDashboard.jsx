import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, ShieldAlert, Database, Zap, 
  Trash2, Search, RefreshCcw, Star, IndianRupee, Clock, TrendingUp, Download, Calendar, Activity, Award, MapPin, Bell, Filter, MoreVertical, Flame, Sun, Moon
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { API_BASE_URL } from '../config/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [systemStats, setSystemStats] = useState({ online_providers: 0, total_requests: 0 });
  const [providersList, setProvidersList] = useState([]);
  const [sqlUsers, setSqlUsers] = useState([]); 
  const [revenueData, setRevenueData] = useState([]); 
  const [dailyData, setDailyData] = useState([]); 
  const [recentActivity, setRecentActivity] = useState([]); 
  const [seedCount, setSeedCount] = useState(100);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Phase 2: Heatmap & Theme
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [heatmapData, setHeatmapData] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(true);
  
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const fetchAllData = async () => {
    try {
      // Core Stats (Always fetch)
      const statsRes = await fetch(`${API_BASE_URL}/admin/stats`);
      if (statsRes.ok) setSystemStats(await statsRes.json());

      const revRes = await fetch(`${API_BASE_URL}/admin/revenue-analytics`);
      if (revRes.ok) setRevenueData(await revRes.json());

      const dailyRes = await fetch(`${API_BASE_URL}/admin/daily-report`);
      if (dailyRes.ok) setDailyData(await dailyRes.json());

      const activityRes = await fetch(`${API_BASE_URL}/admin/recent-activity`);
      if (activityRes.ok) setRecentActivity(await activityRes.json());

      // Tab Specific Data
      if (activeTab === 'god-mode') {
        const listRes = await fetch(`${API_BASE_URL}/admin/providers`);
        if (listRes.ok) setProvidersList(await listRes.json());
      }

      if (activeTab === 'users') {
        const usersRes = await fetch(`${API_BASE_URL}/auth/users`);
        if (usersRes.ok) setSqlUsers(await usersRes.json());
      }

      if (activeTab === 'safety-map') {
        const heatRes = await fetch(`${API_BASE_URL}/location/heatmap-data`);
        if (heatRes.ok) setHeatmapData(await heatRes.json());
      }
    } catch (e) { 
      console.error("Data sync failed", e); 
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 10000); 
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleSeedData = async (count) => {
    const toastId = toast.loading('Seeding data...');
    try {
      const res = await fetch(`${API_BASE_URL}/admin/seed-providers/${count}`, { method: 'POST' });
      const data = await res.json();
      toast.success(data.message, { id: toastId });
      fetchAllData();
    } catch (e) { 
      toast.error("Seed failed: Backend unreachable.", { id: toastId }); 
    }
  };

  const handleClearMap = () => {
    setConfirmModal({
      isOpen: true, title: "Wipe Entire Map", message: "GOD MODE: This will wipe ALL markers from MongoDB. Are you sure you want to continue?",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        const toastId = toast.loading('Wiping map...');
        try {
          const res = await fetch(`${API_BASE_URL}/admin/clear-map`, { method: 'DELETE' });
          if (res.ok) { toast.success("Map wiped successfully.", { id: toastId }); fetchAllData(); }
          else { toast.error("Failed to wipe map.", { id: toastId }); }
        } catch (e) { console.error(e); toast.error("Error wiping map.", { id: toastId }); }
      }
    });
  };

  const handleDeleteProvider = (pid) => {
    setConfirmModal({
      isOpen: true, title: "Delete Provider", message: `Are you sure you want to delete Provider ID: ${pid}?`,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        const toastId = toast.loading('Deleting provider...');
        try {
          const res = await fetch(`${API_BASE_URL}/admin/provider/${pid}`, { method: 'DELETE' });
          if (res.ok) { toast.success(`Provider deactivated.`, { id: toastId }); fetchAllData(); }
          else { toast.error("Deletion failed.", { id: toastId }); }
        } catch (e) { console.error(e); toast.error("Error.", { id: toastId }); }
      }
    });
  };

  const handleDeleteSqlUser = (userId) => {
    setConfirmModal({
      isOpen: true, title: "Delete User", message: `Permanently delete User ID: ${userId}?`,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        const toastId = toast.loading('Deleting user...');
        try {
          const res = await fetch(`${API_BASE_URL}/auth/user/${userId}`, { method: 'DELETE' });
          if (res.ok) { toast.success("User deleted.", { id: toastId }); fetchAllData(); }
          else { toast.error("Failed.", { id: toastId }); }
        } catch (e) { console.error(e); toast.error("Error.", { id: toastId }); }
      }
    });
  };

  const downloadReport = () => {
    if (dailyData.length === 0) { toast.error("No data available."); return; }
    let csvContent = "data:text/csv;charset=utf-8,Date,Jobs Completed,Revenue (INR)\n";
    dailyData.forEach(row => { csvContent += `${row.date},${row.jobs},${row.revenue}\n`; });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Geolocate_Admin_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
  };

  const HeatmapOverlay = ({ points }) => {
    const map = useMap();
    useEffect(() => {
        if (!points || points.length === 0 || !window.L.heatLayer) return;
        const heat = window.L.heatLayer(points.map(p => [p[1], p[0]]), { radius: 30, blur: 15, maxZoom: 17 }).addTo(map);
        return () => map.removeLayer(heat);
    }, [points, map]);
    return null;
  };

  const filteredProviders = providersList.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalRevenue = revenueData.reduce((acc, curr) => acc + Number(curr.revenue || 0), 0);

  return (
    <>
      <ConfirmModal 
        isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} 
        onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
      />
      
      <div className="flex h-screen bg-gray-50 font-sans text-slate-900 transition-colors duration-500">
        <div className="w-64 bg-slate-900 text-slate-300 hidden lg:flex flex-col shadow-2xl z-10 transition-colors duration-500">
          <div className="p-6 border-b border-slate-800"><h2 className="text-xl font-black text-white italic">Geolocate <span className="text-blue-500">Admin</span></h2></div>
          <nav className="flex-1 p-4 space-y-1">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center p-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}><LayoutDashboard size={18} className="mr-3" /> Analytics</button>
            <button onClick={() => setActiveTab('safety-map')} className={`w-full flex items-center p-3 rounded-xl transition-all ${activeTab === 'safety-map' ? 'bg-red-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}><Flame size={18} className="mr-3" /> Safety Map</button>
            <button onClick={() => setActiveTab('god-mode')} className={`w-full flex items-center p-3 rounded-xl transition-all ${activeTab === 'god-mode' ? 'bg-amber-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}><ShieldAlert size={18} className="mr-3" /> System Control</button>
            <button onClick={() => setActiveTab('users')} className={`w-full flex items-center p-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}><Users size={18} className="mr-3" /> SQL Database</button>
          </nav>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white shadow-sm border-b p-4 lg:px-8 flex justify-between items-center transition-colors duration-500">
            <h1 className="text-xl font-black text-gray-800 uppercase tracking-tight">{activeTab.replace('-', ' ')} Control Center</h1>
            <div className="flex items-center gap-3">
                <button onClick={toggleTheme} className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 transition-all">{theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}</button>
                <button onClick={fetchAllData} className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-blue-600 hover:bg-gray-100 transition-all"><RefreshCcw size={20} /></button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-10">
            {activeTab === 'dashboard' && (
              <div className="space-y-8 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Providers Online</p>
                        <h3 className="text-3xl font-black">{systemStats.online_providers}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Total Requests</p>
                        <h3 className="text-3xl font-black">{systemStats.total_requests}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Platform Revenue</p>
                        <h3 className="text-3xl font-black text-emerald-600">₹{totalRevenue.toLocaleString()}</h3>
                    </div>
                    <button onClick={downloadReport} className="bg-slate-900 p-6 rounded-3xl shadow-xl text-white flex items-center justify-between group hover:bg-blue-600 transition-all">
                        <span className="font-black uppercase text-[10px] tracking-widest">Generate Report</span>
                        <Download className="group-hover:-translate-y-1 transition-transform" />
                    </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center"><TrendingUp size={20} className="mr-2 text-blue-600"/> Revenue Analytics</h3>
                        <div className="space-y-4">
                            {revenueData.map((d, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-xs font-bold mb-1"><span>{d.category}</span><span>₹{Number(d.revenue).toLocaleString()}</span></div>
                                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden"><div className="bg-blue-600 h-full rounded-full" style={{ width: `${(d.revenue / (totalRevenue || 1)) * 100}%` }}></div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                        <h3 className="text-lg font-black text-gray-800 mb-6">Recent Platform Events</h3>
                        <div className="space-y-4">
                            {recentActivity.slice(0, 5).map((a, i) => (
                                <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                                    <div><p className="text-sm font-bold">{a.service}</p><p className="text-[10px] text-gray-400 font-bold uppercase">{a.customer} &bull; {a.date}</p></div>
                                    <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${a.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{a.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
              </div>
            )}

            {activeTab === 'safety-map' && (
                <div className="h-[600px] rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl relative animate-in zoom-in">
                    <div className="absolute top-6 left-6 z-[1000] bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-gray-100">
                        <h3 className="text-lg font-black text-gray-800 flex items-center mb-1"><Flame className="text-red-500 mr-2" /> SOS Analytics</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">Regional Safety Density</p>
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold mb-2"><span>Points Logged:</span> <span className="text-red-600">{heatmapData.length}</span></div>
                            <button onClick={() => setShowHeatmap(!showHeatmap)} className={`w-full py-3 rounded-xl text-xs font-black uppercase transition-all ${showHeatmap ? 'bg-red-500 text-white shadow-lg' : 'bg-gray-200 text-gray-500'}`}>{showHeatmap ? 'Disable Overlay' : 'Enable Overlay'}</button>
                        </div>
                    </div>
                    <MapContainer center={[28.6139, 77.2090]} zoom={11} style={{ height: "100%", width: "100%" }} className="map-tiles">
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {showHeatmap && <HeatmapOverlay points={heatmapData} />}
                    </MapContainer>
                </div>
            )}

            {activeTab === 'god-mode' && (
                <div className="space-y-8 animate-in slide-in-from-bottom">
                    <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                        <div className="relative z-10 flex flex-col items-center text-center max-w-lg mx-auto">
                            <Zap className="text-amber-400 mb-4" size={48} />
                            <h2 className="text-3xl font-black italic tracking-tight mb-2 uppercase">Platform Override</h2>
                            <p className="text-slate-400 text-sm font-medium mb-8">Direct control over the global provider network in MongoDB.</p>
                            <div className="flex gap-4 w-full">
                                <input type="number" value={seedCount} onChange={(e) => setSeedCount(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white font-bold w-32 outline-none focus:ring-2 focus:ring-blue-500" />
                                <button onClick={() => handleSeedData(seedCount)} className="flex-1 bg-blue-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-900/50 hover:bg-blue-500 transition-all">Seed Network</button>
                                <button onClick={handleClearMap} className="bg-red-600 px-6 py-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-red-900/50 hover:bg-red-500 transition-all"><Trash2 /></button>
                            </div>
                        </div>
                        <Database className="absolute bottom-[-20px] right-[-20px] text-white opacity-5" size={200} />
                    </div>
                    <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                            <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest flex items-center"><Database size={16} className="mr-2 text-blue-600"/> Provider Registry</h3>
                            <div className="relative w-72">
                                <input placeholder="Search registry..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                                <Search size={14} className="absolute left-4 top-3 text-gray-400" />
                            </div>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-white border-b z-10">
                                    <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest"><th className="p-6">Provider</th><th className="p-6">Category</th><th className="p-6">Fee</th><th className="p-6 text-right">Action</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredProviders.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50 transition-all">
                                            <td className="p-6 font-bold text-sm">{p.name}</td>
                                            <td className="p-6 text-xs text-gray-500 font-bold">{p.category}</td>
                                            <td className="p-6 text-sm font-black text-emerald-600">₹{p.charge}</td>
                                            <td className="p-6 text-right"><button onClick={() => handleDeleteProvider(p.id)} className="p-2 text-red-300 hover:text-red-600 transition-all"><Trash2 size={18}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in">
                    <div className="p-10 border-b border-gray-50"><h3 className="text-xl font-black text-gray-800 flex items-center"><Users size={24} className="mr-3 text-indigo-500"/> Account Management</h3><p className="text-sm text-gray-400 font-medium">PostgreSQL User Directory</p></div>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50"><tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest"><th className="p-6">Name</th><th className="p-6">Email</th><th className="p-6">Role</th><th className="p-6 text-right">Delete</th></tr></thead>
                        <tbody className="divide-y divide-gray-100">
                            {sqlUsers.map(u => (
                                <tr key={u.id}>
                                    <td className="p-6 font-bold text-sm">{u.name}</td>
                                    <td className="p-6 text-sm text-gray-500 font-medium">{u.email}</td>
                                    <td className="p-6"><span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${u.role === 'provider' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>{u.role}</span></td>
                                    <td className="p-6 text-right"><button onClick={() => handleDeleteSqlUser(u.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18}/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;