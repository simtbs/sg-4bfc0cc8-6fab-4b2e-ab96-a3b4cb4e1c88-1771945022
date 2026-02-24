import React from 'react';
import { Search, Cable, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';

const Header = ({
  searchTerm,
  setSearchTerm,
  showSearch = false
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    try {
      logout();
    } finally {
      navigate('/login');
    }
  };
  return (
    <header className="bg-white shadow-sm sticky top-0 z-40 safe-area-top">
      <div className="container mx-auto px-4 py-3 md:py-4 max-w-7xl relative">
        {/* mobile logout (absolute top-right) */}
        <button
          type="button"
          onClick={handleLogout}
          className="md:hidden absolute right-4 top-3 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-gray-200 text-gray-700"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-[#0062FF] rounded-lg flex items-center justify-center flex-shrink-0">
              <Cable className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">
                TELCO.IA
              </h1>
              <p className="text-xs md:text-sm text-gray-500">
                Gestione cantieri TLC
              </p>
            </div>
          </div>

          {/* RIGHT CONTROLS: search (optional) + logout */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {showSearch && (
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Cerca codice cavo..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 md:h-10 bg-gray-50 border-gray-200 focus:border-[#0062FF] focus:ring-[#0062FF] transition-all text-base shadow-sm"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Logout</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;