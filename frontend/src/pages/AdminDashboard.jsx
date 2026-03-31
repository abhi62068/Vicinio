import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, ShieldAlert, Database, Zap, 
  Trash2, Search, RefreshCcw, Star, DollarSign, Clock, TrendingUp, Download, Calendar, Activity, Award, MapPin, Bell, Filter, MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal'; // Ensure this path matches your folder structure
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
  
  // NEW: Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const fetchAllData = async () => {
    try {
      const statsRes = await fetch(`${API_BASE_URL}/admin/stats`);
      if (statsRes.ok) setSystemStats(await statsRes.json());

      const revRes = await fetch(`${API_BASE_URL}/admin/revenue-analytics`);
      if (revRes.ok) setRevenueData(await revRes.json());

      const dailyRes = await fetch(`${API_BASE_URL}/admin/daily-report`);
      if (dailyRes.ok) setDailyData(await dailyRes.json());

      const activityRes = await fetch(`${API_BASE_URL}/admin/recent-activity`);
      if (activityRes.ok) setRecentActivity(await activityRes.json());

      if (activeTab === 'god-mode') {
        const listRes = await fetch(`${API_BASE_URL}/admin/providers`);
        if (listRes.ok) setProvidersList(await listRes.json());
      }

      if (activeTab === 'users') {
        const usersRes = await fetch(`${API_BASE_URL}/auth/users`);
        if (usersRes.ok) setSqlUsers(await usersRes.json());
      }
    } catch (e) { 
      console.error("Data sync failed", e); 
    }
  };

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
      isOpen: true,
      title: "Wipe Entire Map",
      message: "GOD MODE: This will wipe ALL markers from MongoDB. Are you sure you want to continue?",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        const toastId = toast.loading('Wiping map...');
        try {
          const res = await fetch(`${API_BASE_URL}/admin/clear-map`, { method: 'DELETE' });
          if (res.ok) {
            toast.success("Map wiped successfully.", { id: toastId });
            fetchAllData();
          } else {
            toast.error("Failed to wipe map.", { id: toastId });
          }
        } catch (e) { 
          console.error(e); 
          toast.error("Error wiping map.", { id: toastId });
        }
      }
    });
  };

  const handleDeleteProvider = (pid) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Provider",
      message: `Are you sure you want to delete Provider ID: ${pid} from the map?`,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        const toastId = toast.loading('Deleting provider...');
        try {
          const res = await fetch(`${API_BASE_URL}/admin/provider/${pid}`, { method: 'DELETE' });
          if (res.ok) {
            toast.success(`Provider ${pid} deleted.`, { id: toastId });
            fetchAllData();
          } else {
            toast.error("Failed to delete provider.", { id: toastId });
          }
        } catch (e) { 
          console.error(e); 
          toast.error("Error deleting provider.", { id: toastId });
        }
      }
    });
  };

  const handleDeleteSqlUser = (userId) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete SQL User",
      message: `Are you sure you want to PERMANENTLY delete User ID: ${userId}?`,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        const toastId = toast.loading('Deleting user account...');
        try {
          const res = await fetch(`${API_BASE_URL}/auth/user/${userId}`, { method: 'DELETE' });
          if (res.ok) {
            toast.success("User account deleted.", { id: toastId });
            fetchAllData();
          } else {
            toast.error("Failed to delete user.", { id: toastId });
          }
        } catch (e) {
          console.error("Delete failed", e);
          toast.error("Error deleting user.", { id: toastId });
        }
      }
    });
  };

  const downloadReport = () => {
    if (dailyData.length === 0) {
      toast.error("No completed jobs data available to download.");
      return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Jobs Completed,Daily Revenue (INR)\n";
    
    dailyData.forEach(row => {
      csvContent += `${row.date},${row.jobs},${row.revenue}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `Geolocate_Daily_Report_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download started!");
  };

  const filteredProviders = providersList.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = revenueData.reduce(
    (acc, curr) => acc + Number(curr.revenue || 0),
    0
  );
  const totalCompletedJobs = revenueData.reduce(
    (acc, curr) => acc + Number(curr.jobs || 0),
    0
  );
  const averageOrderValue = totalCompletedJobs > 0 ? Math.round(totalRevenue / totalCompletedJobs) : 0;
  const maxCategoryRevenue = revenueData.length > 0 ? Math.max(...revenueData.map(d => Number(d.revenue || 0))) : 1;
  const topCategoryObj = revenueData.length > 0 ? revenueData.reduce((prev, current) => (Number(prev.revenue || 0) > Number(current.revenue || 0)) ? prev : current) : null;
  const maxDailyRevenue = dailyData.length > 0 ? Math.max(...dailyData.map(d => Number(d.revenue || 0))) : 1;

  return (
    <>
      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        title={confirmModal.title} 
        message={confirmModal.message} 
        onConfirm={confirmModal.onConfirm} 
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
      />
      
      <div className="flex h-screen bg-gray-50 font-sans text-slate-900">
        
        {/* SIDEBAR */}
        <div className="w-64 bg-slate-900 text-slate-300 hidden lg:flex flex-col shadow-2xl z-10">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-2xl font-bold text-white tracking-tight text-center">Geolocate <span className="text-blue-500">Admin</span></h2>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center p-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
              <LayoutDashboard size={20} className="mr-3" /> Overview
            </button>
            <button onClick={() => setActiveTab('god-mode')} className={`w-full flex items-center p-3 rounded-xl transition-all ${activeTab === 'god-mode' ? 'bg-red-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
              <ShieldAlert size={20} className="mr-3" /> System Control
            </button>
            <button onClick={() => setActiveTab('users')} className={`w-full flex items-center p-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}>
              <Users size={20} className="mr-3" /> Users (SQL)
            </button>
          </nav>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white shadow-sm border-b p-4 lg:px-8 flex justify-between items-center">
            <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">
              {activeTab === 'users' ? 'User Management' : activeTab === 'god-mode' ? 'Platform Control' : 'Platform Analytics'}
            </h1>
            <button onClick={fetchAllData} className="p-2 hover:bg-gray-100 rounded-full text-blue-600 transition-transform active:rotate-180" title="Force Refresh">
              <RefreshCcw size={20} />
            </button>
          </header>

          <main className="flex-1 overflow-y-auto p-4 lg:p-8">
            
            {/* STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                <p className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center"><MapPin size={14} className="mr-1"/> Live Providers</p>
                <h3 className="text-3xl font-black text-gray-800 mt-auto">{systemStats.online_providers}</h3>
                <div className="absolute right-0 bottom-0 p-4 opacity-5 text-gray-900"><MapPin size={60} /></div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                <p className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center"><Bell size={14} className="mr-1"/> Total Requests</p>
                <h3 className="text-3xl font-black text-gray-800 mt-auto">{systemStats.total_requests}</h3>
                <div className="absolute right-0 bottom-0 p-4 opacity-5 text-gray-900"><Bell size={60} /></div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                <p className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center"><Activity size={14} className="mr-1"/> Avg Order Value</p>
                <h3 className="text-3xl font-black text-emerald-600 mt-auto">₹{averageOrderValue.toLocaleString()}</h3>
                <div className="absolute right-0 bottom-0 p-4 opacity-5 text-emerald-900"><Activity size={60} /></div>
              </div>
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 rounded-3xl shadow-lg text-white flex flex-col relative overflow-hidden">
                <p className="text-blue-100 text-xs font-bold uppercase mb-1 z-10 flex items-center"><TrendingUp size={14} className="mr-1"/> Gross Volume</p>
                <h3 className="text-4xl font-black mt-auto z-10">₹{totalRevenue.toLocaleString()}</h3>
                <DollarSign className="absolute right-[-10px] bottom-[-10px] text-white opacity-10" size={100} />
              </div>
            </div>

            {/* OVERVIEW / ANALYTICS TAB */}
            {activeTab === 'dashboard' && (
              <div className="animate-in fade-in duration-500">
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Left Column: Category Chart */}
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h3 className="text-xl font-black text-gray-800 flex items-center mb-1">
                          <TrendingUp className="mr-2 text-blue-600"/> Revenue Distribution
                        </h3>
                        <p className="text-xs text-gray-500 font-bold">Platform earnings grouped by service category</p>
                      </div>
                      {topCategoryObj && (
                        <div className="text-right">
                            <span className="bg-yellow-50 text-yellow-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border border-yellow-100 flex items-center justify-end">
                              <Award size={12} className="mr-1"/> Top Category
                            </span>
                            <p className="text-sm font-bold text-gray-800 mt-1">{topCategoryObj.category}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-6 flex-1 flex flex-col justify-center">
                      {revenueData.map((item, idx) => {
                        const revenueNum = Number(item.revenue || 0);
                        const widthPercent = (revenueNum / maxCategoryRevenue) * 100;
                        return (
                          <div key={idx} className="group">
                            <div className="flex justify-between text-sm font-bold text-gray-700 mb-2">
                              <span className="flex items-center">
                                <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                                {item.category} <span className="ml-2 text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">{Number(item.jobs || 0)} Jobs</span>
                              </span>
                              <span className="text-gray-900">₹{revenueNum.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden relative">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-5 rounded-full transition-all duration-1000 ease-out group-hover:opacity-80" 
                                style={{ width: `${widthPercent}%` }}
                              ></div>
                            </div>
                          </div>
                        )
                      })}
                      {revenueData.length === 0 && (
                        <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl m-auto w-full">
                          <TrendingUp size={40} className="mx-auto text-gray-300 mb-3" />
                          <p className="text-gray-400 font-bold">No completed services to track yet.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Daily Trend & Export */}
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h3 className="text-xl font-black text-gray-800 flex items-center mb-1">
                          <Calendar className="mr-2 text-emerald-500"/> Daily Performance
                        </h3>
                        <p className="text-xs text-gray-500 font-bold">Revenue generated over recent days</p>
                      </div>
                      <button 
                        onClick={downloadReport}
                        className="flex items-center text-sm font-bold bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-all shadow-md group"
                      >
                        <Download size={16} className="mr-2 group-hover:-translate-y-1 transition-transform"/> Export CSV
                      </button>
                    </div>

                    {/* Graphical Vertical Bar Chart */}
                    {dailyData.length > 0 ? (
                      <div className="flex-1 flex flex-col justify-end mt-4">
                        <div className="flex items-end h-64 space-x-3 w-full border-b border-gray-100 pb-2">
                            {dailyData.slice(0, 7).reverse().map((day, idx) => {
                              const revenueNum = Number(day.revenue || 0);
                              const heightPercent = Math.max((revenueNum / maxDailyRevenue) * 100, 5); 
                              const dateObj = new Date(day.date);
                              return (
                                  <div key={idx} className="flex-1 flex flex-col items-center group cursor-pointer h-full justify-end relative">
                                    <div className="absolute -top-12 bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                                        ₹{revenueNum.toLocaleString()} <br/> <span className="text-gray-400">{Number(day.jobs || 0)} Jobs</span>
                                    </div>
                                    <div 
                                        className="w-full bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t-lg transition-all duration-500 ease-out group-hover:brightness-110" 
                                        style={{ height: `${heightPercent}%` }}
                                    ></div>
                                    <span className="text-[10px] text-gray-400 font-bold mt-3 text-center uppercase tracking-widest block w-full truncate">
                                        {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                                    </span>
                                  </div>
                              )
                            })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-3xl m-auto w-full">
                        <div className="text-center">
                          <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
                          <p className="text-gray-400 font-bold">Waiting for daily job data...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* NEW: LIVE RECENT ACTIVITY TABLE */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-black text-gray-800">Recent Platform Activity</h3>
                      <p className="text-sm text-gray-500 mt-1 font-medium">Live feed of global service requests</p>
                    </div>
                    <button className="flex items-center text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-colors">
                      <Filter size={16} className="mr-2" /> Live Feed
                    </button>
                  </div>
                  <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                        <tr className="text-gray-400 text-[10px] uppercase tracking-widest font-black">
                          <th className="p-6">Job ID</th>
                          <th className="p-6">Customer</th>
                          <th className="p-6">Provider ID</th>
                          <th className="p-6">Service</th>
                          <th className="p-6">Status</th>
                          <th className="p-6">Amount</th>
                          <th className="p-6 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {recentActivity.map((booking, index) => (
                          <tr key={index} className="hover:bg-gray-50 transition-colors">
                            <td className="p-6 text-xs font-mono font-bold text-blue-600">#{booking.id.toUpperCase()}</td>
                            <td className="p-6 text-sm font-bold text-gray-900">{booking.customer}</td>
                            <td className="p-6 text-xs text-gray-500 font-mono">Prov_{booking.provider_id}</td>
                            <td className="p-6 text-sm font-bold text-gray-700">{booking.service}</td>
                            <td className="p-6">
                              <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider ${
                                booking.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                                booking.status === 'accepted' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 
                                booking.status === 'declined' ? 'bg-red-100 text-red-800 border border-red-200' : 
                                'bg-orange-100 text-orange-800 border border-orange-200'
                              }`}>
                                {booking.status}
                              </span>
                            </td>
                            <td className="p-6 text-sm font-black text-gray-900">₹{Number(booking.amount || 0).toLocaleString()}</td>
                            <td className="p-6 text-right text-xs font-bold text-gray-400">{booking.date}</td>
                          </tr>
                        ))}
                        {recentActivity.length === 0 && (
                          <tr><td colSpan="7" className="p-10 text-center text-gray-400 italic font-medium">No recent activity detected.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* GOD MODE TAB */}
            {activeTab === 'god-mode' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                  <div className="relative z-10">
                    <h2 className="text-3xl font-black mb-2 flex items-center italic text-yellow-400">
                      <Zap className="mr-3" fill="currentColor"/> BULK MANUAL OVERRIDES
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                      <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-widest text-center">Inject Fake Data</label>
                        <div className="flex items-center space-x-4">
                          <input type="number" value={seedCount} onChange={(e) => setSeedCount(e.target.value)} className="bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white font-bold w-28 outline-none focus:ring-2 focus:ring-blue-500 text-center" />
                          <button onClick={() => handleSeedData(seedCount)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-blue-900/50">SEED MAP</button>
                        </div>
                      </div>
                      <div className="bg-red-950/20 p-6 rounded-3xl border border-red-900/50 flex items-center justify-center">
                        <button onClick={handleClearMap} className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl transition-all shadow-lg flex items-center justify-center">
                          <Trash2 size={18} className="mr-2"/> WIPE ENTIRE MAP
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="text-lg font-black text-gray-800 flex items-center">
                      <Database size={18} className="mr-2 text-blue-600"/> Live Provider Registry (MongoDB)
                    </h3>
                    <div className="relative w-full md:w-80">
                      <input type="text" placeholder="Search providers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium" />
                      <Search className="absolute left-4 top-3.5 text-gray-400" size={16} />
                    </div>
                  </div>
                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                        <tr className="text-gray-400 text-[10px] uppercase tracking-widest font-black">
                          <th className="p-5">Provider Details</th>
                          <th className="p-5">Category</th>
                          <th className="p-5">Fee</th>
                          <th className="p-5 text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredProviders.map((p) => (
                          <tr key={p.mongo_id} className="hover:bg-blue-50/20 transition-colors">
                            <td className="p-5">
                              <p className="text-sm font-black text-gray-900">{p.name}</p>
                              <p className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {p.id}</p>
                            </td>
                            <td className="p-5 text-xs text-gray-600 font-bold">{p.category}</td>
                            <td className="p-5 text-xs font-black text-emerald-600">₹{p.charge}</td>
                            <td className="p-5 text-right">
                              <button onClick={() => handleDeleteProvider(p.id)} className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* USERS (SQL) TAB */}
            {activeTab === 'users' && (
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-bottom duration-500">
                <div className="p-8 border-b border-gray-100">
                  <h3 className="text-xl font-black text-gray-800 flex items-center">
                    <Users size={24} className="mr-3 text-blue-600"/> Registered Platform Users (PostgreSQL)
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 font-medium">Direct management of permanent account data.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                      <tr className="text-gray-400 text-[10px] uppercase tracking-widest font-black">
                        <th className="p-6">User Info</th>
                        <th className="p-6">Email Address</th>
                        <th className="p-6">Account Role</th>
                        <th className="p-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sqlUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-6 font-black text-gray-900 text-sm">{user.name}</td>
                          <td className="p-6 text-sm text-gray-600 font-medium">{user.email}</td>
                          <td className="p-6">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${user.role === 'provider' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="p-6 text-right">
                            <button 
                              onClick={() => handleDeleteSqlUser(user.id)}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete User"
                            >
                                <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {sqlUsers.length === 0 && (
                        <tr>
                          <td colSpan="4" className="p-20 text-center text-gray-400 italic font-medium">No user data found in SQL database.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;