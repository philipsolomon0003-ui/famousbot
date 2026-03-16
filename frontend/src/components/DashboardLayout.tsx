import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Send, Activity, LogOut, Bot, Palette, Type } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from './ThemeProvider';

function cx(...args: (string | undefined | null | false)[]) {
  return twMerge(clsx(args));
}

const navItems = [
  { name: 'Dashboard', icon: Home, path: '/' },
  { name: 'Groups', icon: Users, path: '/groups' },
  { name: 'Composer', icon: Send, path: '/composer' },
  { name: 'Activity Log', icon: Activity, path: '/activity' },
];

export default function DashboardLayout({ setAuth }: { setAuth: (val: boolean) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme, font, toggleFont } = useTheme();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAuth(false);
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-colors duration-200">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
          <Bot className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mr-3" />
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            Famous Bot
          </span>
        </div>
        
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cx(
                  'flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-150',
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                <Icon className={cx('mr-3 flex-shrink-0 h-5 w-5', isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500')} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors capitalize"
          >
            <Palette className="mr-3 h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            Theme: {theme}
          </button>
          
          <button
            onClick={toggleFont}
            className="flex w-full items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors capitalize"
          >
            <Type className="mr-3 h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            Font: {font}
          </button>

          <button
            onClick={handleLogout}
            className="flex w-full items-center px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 text-red-500 dark:text-red-400" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
