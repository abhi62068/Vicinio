import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // CHANGED: Admin IDs must be strings now so they don't break string-based logic
    const superAdmins = [
      { 
        email: "abhishek912.naman@gmail.com", 
        password: "admin-a", 
        user: { id: "admin_101", name: "Abhishek Naman", role: "admin", email: "abhishek912.naman@gmail.com" } 
      },
      { 
        email: "ps@gmail.com", 
        password: "admin-p", 
        user: { id: "admin_102", name: "Priyavart Singh", role: "admin", email: "ps@gmail.com" } 
      }
    ];

    const adminMatch = superAdmins.find(admin => 
      admin.email === formData.email && admin.password === formData.password
    );

    if (adminMatch) {
      setIsLoading(false);
      localStorage.setItem("user", JSON.stringify(adminMatch.user));
      toast.success(`Welcome, Super Admin ${adminMatch.user.name}!`, { icon: '🛡️' });
      navigate('/admin'); 
      return; 
    }

    try {
      const response = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setIsLoading(false);
        
        // CHANGED: Defensive mapping to guarantee the ID is saved as a string
        const userToSave = {
            ...data.user,
            id: String(data.user.id) 
        };
        
        localStorage.setItem("user", JSON.stringify(userToSave));
        toast.success(`Welcome back, ${data.user.name}!`);

        if (data.user.role === 'provider') {
          navigate('/provider');
        } else {
          navigate('/receiver');
        }
      } else {
        setIsLoading(false);
        toast.error("Login Failed: " + (data.detail || "Invalid credentials"));
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Login connection error:", error);
      toast.error("Could not connect to the server. Is your backend running?");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        <div className="bg-blue-600 px-6 py-10 text-center relative overflow-hidden">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 relative z-10">
            <LogIn className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight relative z-10">Welcome Back</h1>
          <p className="text-blue-100 mt-2 relative z-10 font-medium">Sign in to your Geolocate account</p>
          <div className="absolute top-2 right-2 opacity-20 text-white">
            <ShieldCheck size={24} />
          </div>
        </div>

        <div className="px-8 py-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                  placeholder="name@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg text-white font-bold text-lg shadow-md transition-all ${
                isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
              }`}
            >
              {isLoading ? 'Verifying...' : 'Login'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-500 font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-800 font-bold transition-colors">
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;