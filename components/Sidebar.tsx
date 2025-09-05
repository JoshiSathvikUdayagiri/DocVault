
import React from 'react';
import { Page, UserProfile } from '../types';
import Icon from './ui/Icon';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  user: UserProfile | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, user, onLogout }) => {
  const navItems = [
    { page: Page.HOME, icon: 'home', label: 'Home' },
    { page: Page.DASHBOARD, icon: 'dashboard', label: 'My Drive' },
    { page: Page.LIBRARY, icon: 'library', label: 'Library' },
    { page: Page.SETTINGS, icon: 'settings', label: 'Settings' },
  ];

  return (
    <div className="w-64 bg-light-surface dark:bg-dark-surface p-4 flex flex-col border-r border-light-surfaceVariant dark:border-dark-surfaceVariant">
      <div className="flex items-center gap-2 mb-8 p-2">
        <div className="p-2 bg-light-primaryContainer dark:bg-dark-primaryContainer rounded-full">
          <Icon name="shield" className="text-light-onPrimaryContainer dark:text-dark-onPrimaryContainer" size={24} />
        </div>
        <h1 className="text-xl font-bold text-light-onSurface dark:text-dark-onSurface">AetherVault</h1>
      </div>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <button
            key={item.page}
            onClick={() => setCurrentPage(item.page)}
            className={`flex items-center gap-4 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
              currentPage === item.page
                ? 'bg-light-secondaryContainer dark:bg-dark-secondaryContainer text-light-onSecondaryContainer dark:text-dark-onSecondaryContainer'
                : 'text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant hover:bg-light-surfaceVariant dark:hover:bg-dark-surfaceVariant'
            }`}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="mt-auto">
        {user ? (
          <div className="flex items-center gap-3 p-2 bg-light-surfaceVariant/50 dark:bg-dark-surfaceVariant/50 rounded-lg">
            {user.picture ? (
              <img src={user.picture} alt="User avatar" className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-light-primaryContainer dark:bg-dark-primaryContainer flex items-center justify-center">
                <span className="text-lg font-bold text-light-onPrimaryContainer dark:text-dark-onPrimaryContainer">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate" title={user.name}>{user.name}</p>
              <p className="text-xs truncate text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant" title={user.email}>{user.email}</p>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-2 rounded-full text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant hover:bg-light-surface dark:hover:bg-dark-surface"
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCurrentPage(Page.SETTINGS)}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-full bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary hover:opacity-90 transition-opacity"
          >
            <Icon name="login" size={18} />
            <span className="text-sm font-medium">Sign In</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
