
import React, { useEffect, useRef } from 'react';
import { Theme, UserProfile } from '../types';
import Icon from './ui/Icon';

const GOOGLE_CLIENT_ID = "170103889263-8466jrib2n15r2tc9v49en8sl4a3qcuo.apps.googleusercontent.com";

interface SettingsProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  user: UserProfile | null;
  onLogout: () => void;
  onLoginSuccess: (response: any) => void;
}

const Settings: React.FC<SettingsProps> = ({ theme, setTheme, user, onLogout, onLoginSuccess }) => {
  const signInButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user && window.google && signInButtonRef.current) {
      if (signInButtonRef.current.childElementCount === 0) { // Render only if button not already there
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: onLoginSuccess,
        });
        window.google.accounts.id.renderButton(
          signInButtonRef.current,
          { theme: 'filled_blue', size: 'large', type: 'standard', text: 'signin_with' }
        );
      }
    }
  }, [user, onLoginSuccess]);


  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <h1 className="text-3xl font-bold mb-8 text-light-onBackground dark:text-dark-onBackground">Settings</h1>
      
      <div className="max-w-md space-y-8">
        {/* Appearance settings are available to all users */}
        <div className="p-6 rounded-2xl bg-light-surfaceVariant dark:bg-dark-surfaceVariant">
          <h2 className="text-lg font-medium mb-4 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Appearance</h2>
          <div className="flex items-center justify-between">
            <span className="text-light-onSurface dark:text-dark-onSurface">Theme</span>
            <div className="flex items-center gap-2 p-1 rounded-full bg-light-surface dark:bg-dark-surface">
              <button 
                onClick={() => setTheme(Theme.LIGHT)}
                className={`p-2 rounded-full transition-colors ${theme === Theme.LIGHT ? 'bg-light-primaryContainer text-light-onPrimaryContainer' : 'text-light-onSurfaceVariant'}`}
              >
                <Icon name="sun" size={20} />
              </button>
              <button 
                onClick={() => setTheme(Theme.DARK)}
                className={`p-2 rounded-full transition-colors ${theme === Theme.DARK ? 'bg-dark-primaryContainer text-dark-onPrimaryContainer' : 'text-dark-onSurfaceVariant'}`}
              >
                <Icon name="moon" size={20} />
              </button>
            </div>
          </div>
        </div>

        {user ? (
          <div className="p-6 rounded-2xl bg-light-surfaceVariant dark:bg-dark-surfaceVariant">
              <h2 className="text-lg font-medium mb-4 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Account</h2>
              <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {user.picture ? (
                      <img src={user.picture} alt="Your avatar" className="w-12 h-12 rounded-full" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-light-primaryContainer dark:bg-dark-primaryContainer flex items-center justify-center">
                        <span className="text-xl font-bold text-light-onPrimaryContainer dark:text-dark-onPrimaryContainer">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                        <p className="font-semibold text-light-onSurface dark:text-dark-onSurface">{user.name}</p>
                        <p className="text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">{user.email}</p>
                    </div>
                  </div>
                  <p className="text-sm text-light-onSurface dark:text-dark-onSurface pt-2">Plan: Free Tier</p>
                  <button className="w-full text-left px-4 py-2.5 rounded-lg text-light-primary dark:text-dark-primary hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 transition-colors">
                      Manage Subscription
                  </button>
                  <button onClick={onLogout} className="w-full text-left px-4 py-2.5 rounded-lg text-light-error dark:text-dark-error hover:bg-light-error/10 dark:hover:bg-dark-error/10 transition-colors">
                      Sign Out
                  </button>
              </div>
          </div>
        ) : (
          <div className="p-8 bg-light-surface dark:bg-dark-surface rounded-2xl shadow-lg border border-light-outline/10 dark:border-dark-outline/10 text-center">
              <h2 className="text-xl font-medium mb-4">Sign In to AetherVault</h2>
              <p className="text-sm mb-6 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Access your document hub and AI features by signing in with your Google account.</p>
              <div ref={signInButtonRef} className="flex justify-center"></div>
          </div>
        )}
        
        <div className="p-6 rounded-2xl bg-light-surfaceVariant/60 dark:bg-dark-surfaceVariant/60">
            <h2 className="text-lg font-medium mb-4 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">OAuth Configuration for Developers</h2>
            <div className="space-y-3 text-sm">
                <p className="text-light-onSurface dark:text-dark-onSurface">To enable Google Sign-In, add the following URL to your Google Cloud project's OAuth 2.0 Client ID settings.</p>
                <div>
                    <label className="font-medium text-xs text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant uppercase tracking-wider">Authorized JavaScript origins</label>
                    <div className="mt-1 p-2 bg-light-surface dark:bg-dark-surface rounded-md font-mono text-xs break-all">
                        {typeof window !== 'undefined' ? window.location.origin : 'Loading...'}
                    </div>
                </div>
                <a 
                    href="https://console.cloud.google.com/auth/clients/170103889263-8466jrib2n15r2tc9v49en8sl4a3qcuo.apps.googleusercontent.com?project=drive-app-272001" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-light-primary dark:text-dark-primary hover:underline pt-2"
                >
                    <span>Configure in Google Cloud Console</span>
                    <Icon name="externalLink" size={14} />
                </a>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
