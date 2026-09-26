import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  ShieldCheck,
  Wifi,
  Sparkles,
  ArrowRight,
  Database,
  CheckCircle,
  AlertTriangle,
  LogIn,
  UserPlus
} from 'lucide-react';
import Logo from './Logo';
import GoogleAuthModal from './GoogleAuthModal';
import { PACKAGES } from './Home';

interface LoginViewProps {
  onLoginSuccess: (userData: any) => void;
  onNavigateToSubscribe: () => void;
  companyName: string;
  themeColor?: string;
}

export default function LoginView({
  onLoginSuccess,
  onNavigateToSubscribe,
  companyName,
}: LoginViewProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'customer' | 'admin' | 'developer'>('customer');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Quick register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPackageId, setRegPackageId] = useState(PACKAGES[0].id);

  // Statuses
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Google Modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          isAdmin: role === 'admin',
        }),
      });

      const data = await response.json();
      if (response.ok && data.status === 'success') {
        onLoginSuccess(data.user);
      } else {
        setErrorMessage(data.message || 'Login gagal. Periksa kembali email dan password Anda.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Terjadi kendala jaringan saat menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!regName.trim() || !regEmail.trim() || !regPhone.trim() || !regPassword.trim()) {
      setErrorMessage('Harap lengkapi semua isian formulir pendaftaran.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          phone: regPhone.trim(),
          password: regPassword,
          address: 'Alamat dalam proses konfirmasi pemasangan',
          coordinates: [-6.2088, 106.8456],
          packageId: regPackageId,
          rentStb: false,
          ktpImageBase64: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
        }),
      });

      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setSuccessMessage('Pendaftaran berhasil & data tersimpan di Supabase! Mengalihkan ke portal Anda...');
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 1000);
      } else {
        setErrorMessage(data.message || 'Pendaftaran gagal. Periksa kembali data Anda.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Gagal menghubungi server pendaftaran.');
    } finally {
      setLoading(false);
    }
  };

  const autofillCredential = (targetRole: 'customer' | 'admin' | 'developer') => {
    setRole(targetRole);
    setAuthMode('login');
    setErrorMessage('');
    if (targetRole === 'customer') {
      setEmail('budi@gmail.com');
      setPassword('user123');
    } else if (targetRole === 'admin') {
      setEmail('admin@taranet.id');
      setPassword('admin');
    } else {
      setEmail('ajayrostaman@gmail.com');
      setPassword('pengelola123');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 font-sans text-slate-100">
      <div className="max-w-md w-full relative z-10">
        {/* Glow ambient background effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-emerald-500 to-indigo-600 rounded-3xl blur-xl opacity-30 pointer-events-none" />

        <div className="relative bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Header & Logo */}
          <div className="text-center space-y-2">
            <div className="inline-block p-1 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
              <Logo companyName={companyName} />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              {authMode === 'login' ? 'Portal Masuk Layanan' : 'Daftar Pelanggan Baru'}
            </h2>
            <p className="text-xs text-slate-400">
              {authMode === 'login'
                ? `Kelola tagihan, cek paket, dan jaringan ${companyName}`
                : `Daftar cepat WiFi dan nikmati koneksi internet unlimited`}
            </p>
          </div>

          {/* Mode Switcher: Masuk vs Daftar Baru */}
          <div className="p-1 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMessage('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                authMode === 'login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk Portal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setRole('customer');
                setErrorMessage('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                authMode === 'register'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Daftar Baru</span>
            </button>
          </div>

          {/* GOOGLE ONE-CLICK AUTH BUTTON */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowGoogleModal(true)}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-3 shadow-md hover:shadow-lg active:scale-98 group border border-slate-200"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="font-extrabold tracking-tight">
                {authMode === 'login' ? 'Masuk dengan Akun Google' : 'Daftar Cepat dengan Google'}
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full ml-auto">
                Sync Supabase
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold shrink-0">
              atau gunakan email & password
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          {/* Error & Success Messages */}
          {errorMessage && (
            <div className="p-3.5 bg-red-950/50 border border-red-800/80 rounded-2xl flex items-center gap-2.5 text-xs text-red-200">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3.5 bg-emerald-950/50 border border-emerald-800/80 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-200">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {authMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              {/* Role Picker Pills */}
              <div className="p-1 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setRole('customer');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-1.5 rounded-xl font-bold transition ${
                    role === 'customer'
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pelanggan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole('admin');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-1.5 rounded-xl font-bold transition ${
                    role === 'admin'
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Admin WiFi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole('developer');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-1.5 rounded-xl font-bold transition ${
                    role === 'developer'
                      ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Developer
                </button>
              </div>

              {/* Email Field */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Alamat Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      role === 'admin'
                        ? 'admin@taranet.id'
                        : role === 'developer'
                        ? 'ajayrostaman@gmail.com'
                        : 'budi@gmail.com'
                    }
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none text-white font-mono text-xs"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Kata Sandi *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none text-white text-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* QUICK REGISTER FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Nama Lengkap *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Nama calon pelanggan"
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Alamat Email *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="email@anda.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 text-white font-mono text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    No. WhatsApp *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="08123456789"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 text-white font-mono text-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Pilih Paket WiFi
                </label>
                <select
                  value={regPackageId}
                  onChange={(e) => setRegPackageId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                >
                  {PACKAGES.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.speed}) - Rp {pkg.price.toLocaleString('id-ID')}/bln
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Buat Kata Sandi Akun *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Mendaftarkan ke Supabase...</span>
                  </>
                ) : (
                  <>
                    <span>Daftar Sekarang & Masuk Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={onNavigateToSubscribe}
                  className="text-[11px] text-blue-400 hover:underline font-bold"
                >
                  Gunakan Formulir Lengkap (Pilih Pin Peta GPS & Upload KTP) &rarr;
                </button>
              </div>
            </form>
          )}

          {/* Quick Demo Credentials Autofill Chips */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Akses Cepat Pengujian (1-Click Autofill):</span>
              <span className="text-blue-400 font-normal lowercase">klik untuk isi otomatis</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => autofillCredential('customer')}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 rounded-xl text-left transition group"
              >
                <span className="block text-[9px] font-bold text-blue-400 uppercase">Pelanggan</span>
                <span className="block text-[10px] font-mono text-slate-300 truncate">budi@...</span>
              </button>

              <button
                type="button"
                onClick={() => autofillCredential('admin')}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition group"
              >
                <span className="block text-[9px] font-bold text-indigo-400 uppercase">Admin WiFi</span>
                <span className="block text-[10px] font-mono text-slate-300 truncate">admin@...</span>
              </button>

              <button
                type="button"
                onClick={() => autofillCredential('developer')}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl text-left transition group"
              >
                <span className="block text-[9px] font-bold text-amber-400 uppercase">Developer</span>
                <span className="block text-[10px] font-mono text-slate-300 truncate">ajayrost...</span>
              </button>
            </div>
          </div>

          {/* Database Footer Status */}
          <div className="pt-2 text-center flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
            <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Tersambung langsung ke PostgreSQL & Supabase Database</span>
          </div>
        </div>
      </div>

      {/* Google Auth Modal */}
      <GoogleAuthModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSuccess={(user) => onLoginSuccess(user)}
        isRegistrationOnly={authMode === 'register'}
      />
    </div>
  );
}
