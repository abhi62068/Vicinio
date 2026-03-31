import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config/api';

const Register = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('receiver'); 
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    serviceCategory: 'Plumber' 
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const payload = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: role, 
      service_category: role === 'provider' ? formData.serviceCategory : null 
    };

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setIsLoading(false);
        toast.success(`Account created successfully for ${data.name}!`);
        
        if (role === 'provider') {
          navigate('/provider');
        } else {
          navigate('/receiver');
        }
      } else {
        setIsLoading(false);
        toast.error("Registration Error: " + (data.detail || "Something went wrong"));
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Connection failed:", error);
      toast.error("Could not connect to the server.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        <div className="bg-blue-600 px-6 py-8 text-center">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Join Geolocate</h1>
          <p className="text-blue-100 mt-2 text-sm">Create an account to get started.</p>
        </div>

        <div className="px-8 py-8">
          
          <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => setRole('receiver')}
              className={`flex-1 flex justify-center items-center py-2 px-4 rounded-md text-sm font-medium transition-all ${
                role === 'receiver' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User size={16} className="mr-2" />
              Looking for Service
            </button>
            <button
              type="button"
              onClick={() => setRole('provider')}
              className={`flex-1 flex justify-center items-center py-2 px-4 rounded-md text-sm font-medium transition-all ${
                role === 'provider' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Briefcase size={16} className="mr-2" />
              Providing Service
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="••••••••"
              />
            </div>

            {role === 'provider' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Category</label>
                <select
                  name="serviceCategory"
                  value={formData.serviceCategory}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700"
                >
                  <option value="Plumber">Plumber</option>
                  <option value="Electrician">Electrician</option>
                  <option value="Mechanic">Mechanic</option>
                  <option value="Cleaner">Cleaner</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 mt-2 rounded-lg text-white font-bold text-lg shadow-md transition-all ${
                isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
              }`}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-800 font-semibold transition-colors">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;