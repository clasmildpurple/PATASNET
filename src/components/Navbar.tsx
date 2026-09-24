import { Wifi, LogIn, User, LayoutDashboard, LogOut, PhoneCall } from 'lucide-react';
import { CustomerUser } from '../types';
import Logo from './Logo';

interface NavbarProps {
  currentUser: CustomerUser | { isAdmin: boolean } | { isDeveloper: boolean } | null;
  onLogout: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
  companyName?: string;
  logoUrl?: string;
}

export default function Navbar({ currentUser, onLogout, onNavigate, currentPage, companyName, logoUrl }: NavbarProps) {
  const isAdmin = currentUser && 'isAdmin' in currentUser && (currentUser as any).isAdmin;
  const isDeveloper = currentUser && 'isDeveloper' in currentUser && (currentUser as any).isDeveloper;
  const isCustomer = currentUser && !('isAdmin' in currentUser) && !('isDeveloper' in currentUser);
  const customerUser = isCustomer ? (currentUser as CustomerUser) : null;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
      {/* Top Bar info */}
      <div className="bg-blue-900 text-white text-xs py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-1.5 font-medium">
          <div className="flex items-center gap-4 text-[11px] sm:text-xs">
            <span>AREA CAKUPAN: <strong className="text-yellow-400">9 Kota/Kabupaten, 81 Kecamatan, 123 Kelurahan</strong></span>
          </div>
          <div className="flex items-center gap-4 text-[11px] sm:text-xs">
            <span className="flex items-center gap-1.5">
              <PhoneCall className="w-3 h-3 text-yellow-400" /> LAYANAN KONSUMEN: <strong>+62 899-3299-977</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div
            onClick={() => onNavigate('home')}
            className="cursor-pointer"
          >
            <Logo companyName={companyName} logoUrl={logoUrl} />
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-7 text-sm font-semibold text-slate-600">
            <button
              onClick={() => onNavigate('home')}
              className={`hover:text-blue-600 transition-colors ${currentPage === 'home' ? 'text-blue-600 font-bold border-b-2 border-blue-600 pb-1' : ''}`}
            >
              Promosi
            </button>
            <button
              onClick={() => {
                onNavigate('home');
                setTimeout(() => {
                  document.getElementById('tentang-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="hover:text-blue-600 transition-colors"
            >
              Tentang
            </button>
            <button
              onClick={() => {
                onNavigate('home');
                setTimeout(() => {
                  document.getElementById('cakupan-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="hover:text-blue-600 transition-colors"
            >
              Area Cakupan
            </button>
            <button
              onClick={() => {
                onNavigate('home');
                setTimeout(() => {
                  document.getElementById('paket-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="hover:text-blue-600 transition-colors"
            >
              Produk
            </button>
            <button
              onClick={() => {
                onNavigate('home');
                setTimeout(() => {
                  document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="hover:text-blue-600 transition-colors"
            >
              FAQ
            </button>
            <button
              onClick={() => {
                onNavigate('home');
                setTimeout(() => {
                  document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="hover:text-blue-600 transition-colors"
            >
              Hubungi Kami
            </button>
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isDeveloper) onNavigate('developer-dashboard');
                    else if (isAdmin) onNavigate('admin-dashboard');
                    else onNavigate('customer-dashboard');
                  }}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all border border-blue-100"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  {isDeveloper ? 'Control Tower Dev' : isAdmin ? 'Dashboard Admin' : `Hi, ${customerUser?.name.split(' ')[0]}`}
                </button>
                <button
                  onClick={onLogout}
                  className="p-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-600 transition-all border border-slate-200"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('login-selection')}
                  className="flex items-center gap-1.5 px-3 py-2 text-slate-700 hover:text-blue-600 font-semibold text-xs transition-colors"
                >
                  <LogIn className="w-4 h-4 text-blue-600" />
                  My {companyName || 'Taranet'}
                </button>
                <button
                  onClick={() => onNavigate('subscribe')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/10 active:scale-95"
                >
                  Berlangganan
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
