import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { AlertTriangle, Clock, MapPin, Search, Sun, Moon, Flame } from "lucide-react";
import toast from "react-hot-toast";
import "leaflet/dist/leaflet.css";
import { API_BASE_URL, API_WS_BASE_URL } from "../config/api";

// Custom Icon for Emergencies
const emergencyIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Helper component to handle map movement
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
};

// --- HEATMAP OVERLAY ---
const HeatmapOverlay = ({ points }) => {
    const map = useMap();
    useEffect(() => {
        try {
            if (!points || !Array.isArray(points) || points.length === 0 || !window.L || !window.L.heatLayer) {
                return;
            }
            // Ensure points are [lat, lng]
            const validPoints = points.filter(p => Array.isArray(p) && p.length >= 2);
            if (validPoints.length === 0) return;

            const heat = window.L.heatLayer(validPoints, { 
                radius: 35, 
                blur: 20, 
                maxZoom: 17,
                gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
            }).addTo(map);
            return () => {
                if (map && heat) map.removeLayer(heat);
            };
        } catch (err) {
            console.error("Heatmap Overlay Error:", err);
        }
    }, [points, map]);
    return null;
};

const DispatchDashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [showHeatmap, setShowHeatmap] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    
    // Fetch initial heatmap data
    const fetchHeatmap = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/location/heatmap-data`);
            if (res.ok) {
                const data = await res.json();
                setHeatmapPoints(data || []);
            }
        } catch (e) {
            console.error("Failed to fetch heatmap:", e);
        }
    };
    fetchHeatmap();

    // Connect to WebSocket using the unified WS URL
    const wsUrl = `${API_WS_BASE_URL}/ws/dispatch`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("Connected to Dispatch WebSocket:", wsUrl);
      setIsConnected(true);
      toast.success("Dispatch Center Online");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "sos_alert") {
          toast.error(`EMERGENCY: SOS received from ${data.user_name}`, { duration: 5000 });
          setAlerts((prev) => [data, ...prev]);
          setSelectedAlert(data); 
          if (data.location) {
            setHeatmapPoints(prev => [...prev, data.location]); 
          }
        }
      } catch (err) {
        console.error("Failed to parse dispatch message:", err);
      }
    };

    socket.onclose = () => {
      console.log("Disconnected from Dispatch WebSocket");
      setIsConnected(false);
      toast.error("Dispatch Center Offline.");
    };

    socket.onerror = (err) => {
        console.error("WebSocket Error:", err);
        setIsConnected(false);
    };

    return () => socket.close();
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
  };

  const hasActiveAlerts = alerts.length > 0;

  return (
    <div className="flex h-screen w-full bg-gray-900 text-white overflow-hidden relative font-sans">
      
      {/* RED FLASHING OVERLAY ON ACTIVE ALERT */}
      {hasActiveAlerts && (
        <div className="absolute inset-0 pointer-events-none border-[10px] border-red-600 animate-pulse z-[1000] shadow-[inset_0_0_50px_rgba(255,0,0,0.5)]"></div>
      )}

      {/* SIDEBAR */}
      <div className="w-full md:w-1/3 lg:w-96 bg-gray-900 border-r border-gray-800 shadow-2xl z-[1001] flex flex-col">
        {/* HEADER */}
        <div className="p-6 border-b border-gray-800 bg-gray-900 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-black text-red-500 tracking-tight flex items-center">
              <AlertTriangle className="mr-2" /> DISPATCH
            </h1>
            <div className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {isConnected ? "System Online" : "Offline / Connecting"}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-medium">Real-time Emergency Response Center</p>
            <div className="flex gap-2">
                <button onClick={() => setShowHeatmap(!showHeatmap)} className={`p-1.5 rounded-lg border transition-all ${showHeatmap ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-gray-800 text-gray-500 border-gray-700'}`} title="Toggle Heatmap"><Flame size={16} /></button>
                <button onClick={toggleTheme} className="p-1.5 bg-gray-800 text-gray-400 hover:text-white rounded-lg border border-gray-700 transition-all" title="Toggle Theme">{theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</button>
            </div>
          </div>
        </div>

        {/* ALERTS LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 mb-2">
            Active SOS Signals ({alerts.length})
          </h2>
          
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-600">
              <Search size={32} className="mb-2 opacity-50" />
              <p className="text-sm font-medium italic">No active emergencies found.</p>
            </div>
          ) : (
            alerts.map((alert, idx) => (
              <div 
                key={idx} 
                onClick={() => setSelectedAlert(alert)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedAlert === alert 
                  ? "bg-red-900/40 border-red-500" 
                  : "bg-gray-800 border-gray-700 hover:border-red-500/50 hover:bg-gray-800/80"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-red-400 text-lg tracking-tight">{alert.user_name}</h3>
                  <span className="flex items-center text-[10px] bg-red-500/20 text-red-300 px-2 py-1 rounded font-black tracking-widest">
                    <Clock size={10} className="mr-1" /> {alert.created_at}
                  </span>
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  {alert.location && Array.isArray(alert.location) && (
                    <>
                      <p className="flex items-center">
                        <MapPin size={12} className="mr-1.5" /> 
                        Lat: {alert.location[0]?.toFixed(6)}
                      </p>
                      <p className="flex items-center">
                        <span className="w-3 mr-1.5" /> 
                        Lng: {alert.location[1]?.toFixed(6)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MAP AREA */}
      <div className="hidden md:block flex-1 bg-gray-800 relative z-0">
        <MapContainer 
          center={[28.6139, 77.2090]} // default center (Delhi)
          zoom={11} 
          style={{ height: "100%", width: "100%" }}
          className="map-tiles"
        >
          {selectedAlert && <ChangeView center={selectedAlert.location} zoom={16} />}
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {showHeatmap && <HeatmapOverlay points={heatmapPoints} />}
          
          {alerts.map((alert, idx) => (
            alert.location && (
              <Marker key={idx} position={alert.location} icon={emergencyIcon}>
                <Popup>
                  <div className="p-1 min-w-[120px] text-slate-900">
                    <h4 className="font-bold text-red-600 mb-1 leading-none">{alert.user_name} (SOS)</h4>
                    <p className="text-[10px] text-gray-400 m-0 font-medium tracking-tight mt-1">{alert.created_at}</p>
                  </div>
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>
      </div>

    </div>
  );
};

export default DispatchDashboard;
