import React, { useState, useEffect } from 'react';
import {
  Database,
  Save,
  RefreshCw,
  Sliders,
  Users,
  ShieldCheck,
  FileJson,
  Key,
  LogOut,
  Settings,
  AlertTriangle,
  Info,
  Copy,
  Check,
  CheckCircle,
  ExternalLink,
  Server,
  Layers,
  Table,
  Cpu,
  Activity,
  Link,
  Radio,
  Send,
  Zap,
  Eye
} from 'lucide-react';
import Logo from './Logo';
import ImagePreviewModal from './ImagePreviewModal';

interface DeveloperDashboardProps {
  onLogout: () => void;
  companyName: string;
}

export default function DeveloperDashboard({ onLogout, companyName }: DeveloperDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'connect_supabase' | 'supabase_tables' | 'settings_override'>('connect_supabase');
  const [dbData, setDbData] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeSupabaseTable, setActiveSupabaseTable] = useState<'customers' | 'payments' | 'packages' | 'coverage' | 'tickets'>('customers');

  // Supabase Connection Form State
  const [supabaseForm, setSupabaseForm] = useState({
    projectUrl: '',
    anonKey: '',
    serviceRoleKey: '',
    dbHost: '',
    dbPassword: '',
    dbUser: 'postgres',
    dbPort: 5432,
    dbName: 'postgres',
  });
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [syncingData, setSyncingData] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [testingRegistration, setTestingRegistration] = useState(false);
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    title: string;
    subtitle?: string;
  }>({
    isOpen: false,
    imageUrl: '',
    title: '',
    subtitle: '',
  });
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [sqlSchemaText, setSqlSchemaText] = useState('');

  // Simple form state for setting overrides
  const [overrideSettings, setOverrideSettings] = useState({
    name: '',
    address: '',
    logoText: '',
    themeColor: '#2563eb',
    logoUrl: ''
  });

  const fetchDatabase = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [resDb, resMetrics, resConfig, resSchema] = await Promise.all([
        fetch('/api/dev/db'),
        fetch('/api/dev/db/metrics'),
        fetch('/api/dev/supabase/config'),
        fetch('/api/dev/supabase/schema'),
      ]);

      if (resDb.ok) {
        const data = await resDb.json();
        setDbData(data);
        
        if (data.companySettings) {
          setOverrideSettings({
            name: data.companySettings.name || '',
            address: data.companySettings.address || '',
            logoText: data.companySettings.logoText || '',
            themeColor: data.companySettings.themeColor || '#2563eb',
            logoUrl: data.companySettings.logoUrl || ''
          });
        }
      }

      if (resMetrics.ok) {
        const m = await resMetrics.json();
        setMetrics(m.metrics);
      }

      if (resConfig.ok) {
        const cfgData = await resConfig.json();
        if (cfgData.config) {
          setSupabaseForm(prev => ({
            ...prev,
            projectUrl: cfgData.config.projectUrl || '',
            anonKey: cfgData.config.hasAnonKey ? cfgData.config.anonKey : '',
            dbHost: cfgData.config.dbHost || '',
            dbUser: cfgData.config.dbUser || 'postgres',
            dbPort: cfgData.config.dbPort || 5432,
            dbName: cfgData.config.dbName || 'postgres',
          }));
        }
      }

      if (resSchema.ok) {
        const sch = await resSchema.json();
        setSqlSchemaText(sch.schema || '');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Terjadi kesalahan memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabase();
  }, []);

  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch('/api/dev/supabase/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supabaseForm),
      });

      if (res.ok) {
        setSuccessMessage('Konfigurasi Project Supabase berhasil disimpan di server!');
        // Automatically test connection after saving
        handleTestConnection();
      } else {
        const errData = await res.json();
        setErrorMessage(errData.message || 'Gagal menyimpan konfigurasi Supabase.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal menyimpan konfigurasi.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingSupabase(true);
    setTestResult(null);
    setErrorMessage('');
    try {
      const res = await fetch('/api/dev/supabase/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supabaseForm),
      });
      const data = await res.json();
      setTestResult(data);
      if (res.ok && data.reachable) {
        setSuccessMessage(data.message);
      } else {
        setErrorMessage(data.message || 'Gagal menghubungi project Supabase.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Koneksi error: ${err.message}`);
    } finally {
      setTestingSupabase(false);
    }
  };

  const handleSyncDataToSupabase = async () => {
    setSyncingData(true);
    setSyncResult(null);
    setErrorMessage('');
    try {
      const res = await fetch('/api/dev/supabase/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(data.message);
        setSuccessMessage(data.message);
        await fetchDatabase();
      } else {
        setErrorMessage(data.message || 'Gagal sinkronisasi data ke Supabase.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Sinkronisasi gagal: ${err.message}`);
    } finally {
      setSyncingData(false);
    }
  };

  const handleTestRegistration = async () => {
    setTestingRegistration(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch('/api/dev/supabase/test-registration', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message);
        await fetchDatabase();
      } else {
        setErrorMessage(data.message || 'Gagal mengirim pendaftaran uji coba ke Supabase.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Uji pendaftaran error: ${err.message}`);
    } finally {
      setTestingRegistration(false);
    }
  };

  const handleCopySchema = () => {
    if (sqlSchemaText) {
      navigator.clipboard.writeText(sqlSchemaText);
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 3000);
    }
  };

  const handleSaveSettingsOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch('/api/settings/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrideSettings)
      });

      if (res.ok) {
        setSuccessMessage('Berhasil memperbarui identitas WiFi di database!');
        await fetchDatabase();
      } else {
        const errData = await res.json();
        setErrorMessage(errData.message || 'Gagal memperbarui konfigurasi.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Dev Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white tracking-wider text-sm">DEVELOPER TERMINAL</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold rounded-full border border-emerald-500/30">
                SUPABASE & POSTGRESQL
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Pengaturan Koneksi Project Supabase & Manajemen Data Relasional</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDatabase}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh DB</span>
          </button>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 border border-red-500/30"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6">
        {/* Status Notification */}
        {errorMessage && (
          <div className="p-4 bg-red-950/50 border border-red-800 rounded-2xl flex items-center gap-3 text-red-200 text-xs animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-4 bg-emerald-950/50 border border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-200 text-xs animate-in fade-in">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('connect_supabase')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'connect_supabase'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Link className="w-4 h-4" /> Hubungkan Project Supabase Anda
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" /> Status & Metrik Database
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('supabase_tables')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'supabase_tables'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Table className="w-4 h-4" /> Penjelajah Tabel Database
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings_override')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'settings_override'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" /> Konfigurasi Identitas WiFi
          </button>
        </div>

        {/* TAB 1: HUBUNGKAN PROJECT SUPABASE ANDA */}
        {activeTab === 'connect_supabase' && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/40">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">Hubungkan dengan Project Supabase Anda</h2>
                    <p className="text-xs text-slate-400">Masukkan Project URL dan Kunci API dari dashboard Supabase Anda.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-slate-700"
                  >
                    <span>Buka Supabase Dashboard</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Quick 3-Step Guide */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center font-mono text-xs">1</div>
                <h4 className="font-bold text-white">Buat Skema di Supabase</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Buka menu <strong>SQL Editor</strong> di project Supabase Anda, lalu klik tombol <em>"Salin Skrip SQL"</em> di bawah untuk membuat tabel-tabel secara otomatis.
                </p>
                <button
                  type="button"
                  onClick={handleCopySchema}
                  className="w-full mt-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-bold rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-700"
                >
                  {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSchema ? 'Skrip SQL Tersalin!' : 'Salin Skrip SQL Skema'}</span>
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center font-mono text-xs">2</div>
                <h4 className="font-bold text-white">Masukkan URL & Kunci API</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Buka <strong>Project Settings &gt; API</strong> di Supabase. Salin <strong>Project URL</strong> dan <strong>anon/public key</strong> atau <strong>service_role key</strong> ke formulir di bawah.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center font-mono text-xs">3</div>
                <h4 className="font-bold text-white">Uji & Migrasikan Data</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Klik <strong>"Uji Koneksi"</strong> untuk memastikan status terhubung, lalu klik <strong>"Sinkronkan Data"</strong> agar seluruh data pelanggan dan tagihan langsung masuk ke Supabase Anda.
                </p>
              </div>
            </div>

            {/* Connection Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-400" /> Kredensial Project Supabase Anda
                </h3>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-800">
                  Tersimpan di server (Aman)
                </span>
              </div>

              <form onSubmit={handleSaveSupabaseConfig} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-300 uppercase text-[10px]">
                      Project URL Supabase *
                    </label>
                    <input
                      type="url"
                      value={supabaseForm.projectUrl}
                      onChange={(e) => setSupabaseForm(prev => ({ ...prev, projectUrl: e.target.value }))}
                      placeholder="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 text-white font-mono text-xs"
                      required
                    />
                    <p className="text-[10px] text-slate-500">Temukan di: Project Settings &gt; API &gt; Project URL</p>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-300 uppercase text-[10px]">
                      API Key (Anon / Service Role Key) *
                    </label>
                    <input
                      type="password"
                      value={supabaseForm.anonKey}
                      onChange={(e) => setSupabaseForm(prev => ({ ...prev, anonKey: e.target.value }))}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 text-white font-mono text-xs"
                      required
                    />
                    <p className="text-[10px] text-slate-500">Temukan di: Project Settings &gt; API &gt; Project API keys</p>
                  </div>
                </div>

                {/* Optional direct PostgreSQL credentials */}
                <div className="pt-2 border-t border-slate-800">
                  <span className="block font-bold text-slate-400 uppercase text-[10px] mb-2">
                    Koneksi Direct PostgreSQL Pooler Supabase (Opsional)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-400">Database Host</label>
                      <input
                        type="text"
                        value={supabaseForm.dbHost}
                        onChange={(e) => setSupabaseForm(prev => ({ ...prev, dbHost: e.target.value }))}
                        placeholder="db.xxxx.supabase.co / pooler"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-[11px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-400">Database Password</label>
                      <input
                        type="password"
                        value={supabaseForm.dbPassword}
                        onChange={(e) => setSupabaseForm(prev => ({ ...prev, dbPassword: e.target.value }))}
                        placeholder="Password database Anda"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-[11px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-400">Port & Database</label>
                      <input
                        type="text"
                        disabled
                        value="5432 / postgres"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Auto-Sync Pendaftaran Baru ke Supabase: <span className="text-emerald-400">AKTIF</span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Setiap kali ada pelanggan yang mendaftar melalui form berlangganan, datanya otomatis langsung masuk ke Supabase.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestRegistration}
                    disabled={testingRegistration || !supabaseForm.projectUrl}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow shrink-0 disabled:opacity-50"
                  >
                    <Zap className={`w-3.5 h-3.5 ${testingRegistration ? 'animate-spin' : ''}`} />
                    <span>{testingRegistration ? 'Mengirim Uji Coba...' : 'Tes Simulasi Pendaftaran'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-md flex items-center gap-2 text-xs disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingSupabase || !supabaseForm.projectUrl}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition flex items-center gap-2 text-xs border border-slate-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingSupabase ? 'animate-spin' : ''}`} />
                    <span>{testingSupabase ? 'Menguji...' : 'Uji Koneksi Supabase'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncDataToSupabase}
                    disabled={syncingData || !supabaseForm.projectUrl}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition flex items-center gap-2 text-xs shadow-md disabled:opacity-50 ml-auto"
                  >
                    <Send className={`w-3.5 h-3.5 ${syncingData ? 'animate-spin' : ''}`} />
                    <span>{syncingData ? 'Menyinkronkan...' : 'Sinkronkan Data ke Supabase'}</span>
                  </button>
                </div>
              </form>

              {/* Test Connection Result Box */}
              {testResult && (
                <div className={`p-4 rounded-2xl border text-xs font-mono space-y-1.5 ${
                  testResult.reachable
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-red-950/40 border-red-500/40 text-red-200'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {testResult.reachable ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                    <span>{testResult.message}</span>
                  </div>
                  {testResult.latencyMs && (
                    <div className="text-[11px] text-slate-400">
                      Waktu respon: <strong className="text-white">{testResult.latencyMs} ms</strong> | Status Tabel: <strong className="text-emerald-300">{testResult.schemaReady ? 'Siap digunakan' : 'Perlu menjalankan SQL Skema'}</strong>
                    </div>
                  )}
                </div>
              )}

              {syncResult && (
                <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/40 text-blue-200 text-xs font-mono flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>{syncResult}</span>
                </div>
              )}
            </div>

            {/* SQL Script Viewer */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-emerald-400" /> Skrip SQL Skema untuk Supabase
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Salin teks ini dan jalankan di Supabase: <strong>Dashboard &gt; SQL Editor &gt; New Query &gt; Run</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopySchema}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-xs flex items-center gap-2 shrink-0"
                >
                  {copiedSchema ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSchema ? 'Tersalin ke Clipboard!' : 'Salin SQL Skrip'}</span>
                </button>
              </div>

              <textarea
                readOnly
                rows={12}
                value={sqlSchemaText}
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] font-mono text-emerald-300 focus:outline-none resize-none"
              />
            </div>
          </div>
        )}

        {/* TAB 2: OVERVIEW & LIVE METRICS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold border border-emerald-500/40 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    DATABASE ONLINE & ACTIVE
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    PostgreSQL / Supabase Database Backend
                  </h2>
                  <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                    Aplikasi ini menggunakan database relasional <strong>PostgreSQL / Supabase</strong> dengan Drizzle ORM terintegrasi. Seluruh data pelanggan, verifikasi bukti bayar, paket WiFi, dan tiket keluhan tersimpan secara langsung dan persisten pada database relasional tanpa bergantung pada Google Sheets maupun Google Drive.
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2 shrink-0 font-mono text-xs">
                  <div className="flex items-center justify-between gap-6 text-slate-400">
                    <span>Engine:</span>
                    <strong className="text-emerald-400">PostgreSQL 16</strong>
                  </div>
                  <div className="flex items-center justify-between gap-6 text-slate-400">
                    <span>Region:</span>
                    <strong className="text-white">{metrics?.region || 'asia-southeast1 (Singapore)'}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-6 text-slate-400">
                    <span>ORM:</span>
                    <strong className="text-white">Drizzle ORM</strong>
                  </div>
                  <div className="flex items-center justify-between gap-6 text-slate-400">
                    <span>Pool:</span>
                    <strong className="text-emerald-400">pg.Pool (Max 10)</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Tabel Pelanggan</span>
                <p className="text-2xl font-black text-white">{dbData?.customers?.length || 0}</p>
                <span className="text-[10px] text-emerald-400 font-mono">customers table</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Tabel Tagihan</span>
                <p className="text-2xl font-black text-white">
                  {(dbData?.customers || []).reduce((acc: number, c: any) => acc + (c.payments?.length || 0), 0)}
                </p>
                <span className="text-[10px] text-emerald-400 font-mono">payments table</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Paket WiFi</span>
                <p className="text-2xl font-black text-white">{dbData?.packages?.length || 0}</p>
                <span className="text-[10px] text-emerald-400 font-mono">wifi_packages table</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Tiket Keluhan</span>
                <p className="text-2xl font-black text-white">{dbData?.tickets?.length || 0}</p>
                <span className="text-[10px] text-emerald-400 font-mono">support_tickets table</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Kota Cakupan</span>
                <p className="text-2xl font-black text-white">{dbData?.coverageList?.length || 0}</p>
                <span className="text-[10px] text-emerald-400 font-mono">coverage_areas table</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TABLE EXPLORER */}
        {activeTab === 'supabase_tables' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                    <Table className="w-5 h-5 text-emerald-400" /> Penjelajah Tabel Database PostgreSQL
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Lihat data langsung dari tabel-tabel PostgreSQL / Supabase yang aktif di server.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(['customers', 'payments', 'packages', 'coverage', 'tickets'] as const).map((tbl) => (
                    <button
                      key={tbl}
                      type="button"
                      onClick={() => setActiveSupabaseTable(tbl)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition capitalize ${
                        activeSupabaseTable === tbl
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {tbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Data View */}
              {activeSupabaseTable === 'customers' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-3">ID Pelanggan</th>
                        <th className="p-3">Nama</th>
                        <th className="p-3">Foto KTP</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">No. HP</th>
                        <th className="p-3">Paket</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Terdaftar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {(dbData?.customers || []).map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-bold text-emerald-400">{c.id}</td>
                          <td className="p-3 font-sans text-white">{c.name}</td>
                          <td className="p-3 font-sans">
                            {c.ktpImageUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewModal({
                                    isOpen: true,
                                    imageUrl: c.ktpImageUrl,
                                    title: `KTP: ${c.name} (${c.id})`,
                                    subtitle: `Alamat: ${c.address}`,
                                  })
                                }
                                className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 hover:bg-slate-800 text-blue-400 rounded-lg text-[10px] font-bold border border-slate-700 transition"
                              >
                                <img
                                  src={c.ktpImageUrl}
                                  alt="KTP"
                                  className="w-5 h-4 object-cover rounded shrink-0 bg-slate-800"
                                />
                                <span>Buka KTP</span>
                              </button>
                            ) : (
                              <span className="text-slate-500 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-400">{c.email}</td>
                          <td className="p-3 text-slate-400">{c.phone}</td>
                          <td className="p-3">{c.packageId}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.status === 'active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">{c.createdAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeSupabaseTable === 'payments' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-3">ID Tagihan</th>
                        <th className="p-3">Pelanggan</th>
                        <th className="p-3">Jumlah</th>
                        <th className="p-3">Periode</th>
                        <th className="p-3">Metode</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Bukti Transfer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {(dbData?.customers || []).flatMap((c: any) =>
                        (c.payments || []).map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-800/40">
                            <td className="p-3 font-bold text-blue-400">{p.id}</td>
                            <td className="p-3 font-sans text-white">{c.name} ({c.id})</td>
                            <td className="p-3 text-emerald-400 font-bold">Rp {p.amount.toLocaleString('id-ID')}</td>
                            <td className="p-3 text-slate-300">{p.billingPeriod}</td>
                            <td className="p-3 uppercase">{p.method || '-'}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.status === 'paid' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : p.status === 'pending_verification' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-red-950 text-red-400 border border-red-800'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="p-3">
                              {p.proofOfPaymentUrl ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewModal({
                                      isOpen: true,
                                      imageUrl: p.proofOfPaymentUrl,
                                      title: `Bukti Transfer: ${c.name} - Periode ${p.billingPeriod}`,
                                      subtitle: `Nominal: Rp ${p.amount.toLocaleString('id-ID')} | Status: ${p.status.toUpperCase()}`,
                                    })
                                  }
                                  className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 hover:bg-slate-800 text-blue-400 rounded-lg text-[10px] font-bold border border-slate-700 transition"
                                >
                                  <img
                                    src={p.proofOfPaymentUrl}
                                    alt="Bukti"
                                    className="w-5 h-5 object-cover rounded shrink-0 bg-slate-800"
                                  />
                                  <span>Lihat Bukti</span>
                                </button>
                              ) : (
                                <span className="text-slate-500 text-[10px]">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeSupabaseTable === 'packages' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-3">ID Paket</th>
                        <th className="p-3">Nama Paket</th>
                        <th className="p-3">Kecepatan</th>
                        <th className="p-3">Harga</th>
                        <th className="p-3">Tipe</th>
                        <th className="p-3">Populer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {(dbData?.packages || []).map((pkg: any) => (
                        <tr key={pkg.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-bold text-amber-400">{pkg.id}</td>
                          <td className="p-3 font-sans text-white font-bold">{pkg.name}</td>
                          <td className="p-3 text-emerald-400">{pkg.speed}</td>
                          <td className="p-3">Rp {pkg.price.toLocaleString('id-ID')}</td>
                          <td className="p-3 uppercase text-[10px]">{pkg.type}</td>
                          <td className="p-3">{pkg.popular ? 'Ya' : 'Tidak'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeSupabaseTable === 'coverage' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-3">Kota / Kabupaten</th>
                        <th className="p-3">Jenis</th>
                        <th className="p-3">Jumlah Kecamatan</th>
                        <th className="p-3">Jumlah Kelurahan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {(dbData?.coverageList || []).map((cov: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="p-3 font-bold text-white">{cov.cityName}</td>
                          <td className="p-3 text-slate-400">{cov.regionType}</td>
                          <td className="p-3 text-emerald-400">{cov.totalKecamatan} Kecamatan</td>
                          <td className="p-3 text-blue-400">{cov.totalKelurahan} Kelurahan</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeSupabaseTable === 'tickets' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-3">ID Tiket</th>
                        <th className="p-3">Nama Pelapor</th>
                        <th className="p-3">Kontak</th>
                        <th className="p-3">Pesan Keluhan</th>
                        <th className="p-3">Waktu</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {(dbData?.tickets || []).map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-bold text-red-400">{t.id}</td>
                          <td className="p-3 font-sans text-white">{t.userName}</td>
                          <td className="p-3 text-slate-400">{t.phone}</td>
                          <td className="p-3 max-w-xs truncate font-sans text-slate-300">{t.message}</td>
                          <td className="p-3 text-slate-500">{t.date}</td>
                          <td className="p-3 uppercase text-[10px]">{t.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS OVERRIDE */}
        {activeTab === 'settings_override' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider pb-1 border-b border-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-500" /> Pengendalian Konfigurasi & Logo WiFi (Tersimpan di PostgreSQL)
              </h3>
              <p className="text-slate-400 text-xs mt-2">
                Ubah identitas visual, logo kustom, nama perusahaan, serta alamat langsung dari panel pengelola.
              </p>
            </div>

            <form onSubmit={handleSaveSettingsOverride} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-slate-400 uppercase text-[10px]">Nama Perusahaan WiFi</label>
                <input
                  type="text"
                  value={overrideSettings.name}
                  onChange={(e) => setOverrideSettings((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 text-white"
                  placeholder="Contoh: Patas Net WiFi"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-400 uppercase text-[10px]">Teks Logo Identitas Visual</label>
                <input
                  type="text"
                  value={overrideSettings.logoText}
                  onChange={(e) => setOverrideSettings((prev) => ({ ...prev, logoText: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 text-white"
                  placeholder="Contoh: PATAS NET"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-400 uppercase text-[10px]">Alamat Lengkap Perusahaan</label>
                <textarea
                  rows={3}
                  value={overrideSettings.address}
                  onChange={(e) => setOverrideSettings((prev) => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 text-white"
                  placeholder="Alamat kantor..."
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-400 uppercase text-[10px]">Upload / Atur Logo Kustom</label>
                <div className="flex items-center gap-4 p-4 border border-slate-800 rounded-xl bg-slate-950">
                  {overrideSettings.logoUrl ? (
                    <img src={overrideSettings.logoUrl} alt="Logo Preview" className="h-12 w-12 object-contain rounded border border-slate-800 bg-white p-1" />
                  ) : (
                    <div className="h-12 w-12 rounded border border-slate-800 bg-slate-900 flex items-center justify-center text-slate-500 text-xs font-bold font-sans">
                      LOGO
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setOverrideSettings((prev) => ({ ...prev, logoUrl: reader.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700"
                    />
                    <p className="text-[9px] text-slate-500 mt-1">Sistem menyandikan berkas gambar sebagai string Base64 yang disimpan di PostgreSQL.</p>
                  </div>
                  {overrideSettings.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setOverrideSettings((prev) => ({ ...prev, logoUrl: '' }))}
                      className="px-2.5 py-1 text-[10px] font-bold text-red-400 bg-red-950/40 hover:bg-red-900/40 rounded-lg transition"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-md flex items-center gap-2 text-xs"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke PostgreSQL...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan ke Database PostgreSQL</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
        {/* Lightbox Image Preview Modal */}
        <ImagePreviewModal
          isOpen={previewModal.isOpen}
          onClose={() => setPreviewModal((prev) => ({ ...prev, isOpen: false }))}
          imageUrl={previewModal.imageUrl}
          title={previewModal.title}
          subtitle={previewModal.subtitle}
        />
      </div>
    </div>
  );
}
