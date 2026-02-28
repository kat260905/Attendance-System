import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, Eye, EyeOff, Shield, GraduationCap, UserCog } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin', icon: Shield, color: 'indigo', desc: 'Manage system & approvals' },
  { value: 'FACULTY', label: 'Faculty', icon: UserCog, color: 'emerald', desc: 'Mark attendance & reports' },
  { value: 'STUDENT', label: 'Student', icon: GraduationCap, color: 'amber', desc: 'View attendance & OD' },
];

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const { login, register, loading, error, setError } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError(null);
  };

  const selectRole = (role) => {
    setFormData({ ...formData, role });
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.role) {
      setError('Please select your role (Admin, Faculty, or Student)');
      return;
    }

    if (isLogin) {
      const result = await login(formData);
      if (result.success) {
        navigate('/', { replace: true });
      }
    } else {
      const result = await register({
        ...formData,
        name: formData.email.split('@')[0],
        role: formData.role
      });
      if (result.success) {
        navigate('/', { replace: true });
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isLogin ? 'Sign in to continue' : 'Create your account'}
          </p>
        </div>

        {/* User Type Selection - Premium Segmented Control */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Select your role</label>
          <div className="flex p-1 bg-gray-100 rounded-xl relative">
            {ROLE_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => selectRole(value)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg text-sm font-semibold relative z-10 transition-colors ${formData.role === value
                  ? 'text-blue-900 bg-white shadow-sm ring-1 ring-black/5'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                  }`}
              >
                <Icon
                  className={`w-4 h-4 ${formData.role === value ? 'text-blue-600' : 'text-gray-400'}`}
                  strokeWidth={formData.role === value ? 2.5 : 2}
                />
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <div className="relative">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent pl-11"
                placeholder="your@email.college.edu"
              />
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent pl-11 pr-11"
                placeholder="••••••••"
              />
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-800 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-blue-700 hover:text-blue-800 font-medium"
          >
            {/* {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'} */}
          </button>
        </div>

        {/* <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Demo Credentials:</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">Admin</span>
              <span>admin@college.edu</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">Faculty</span>
              <span>john.doe@college.edu</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">Student</span>
              <span>student@college.edu</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Password: any (demo mode)</p>
          </div>
        </div> */}
      </div>
    </div>
  );
}
