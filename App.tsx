import React, { useState, useEffect, useCallback } from 'react';
import { useFileSystem, Document } from './hooks/useFileSystem';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import Home from './components/Home';
import Library from './components/Library';
import DocumentViewer from './components/DocumentViewer';
import BookReader from './components/BookReader';
import { Page, Theme, UserProfile, ItemType } from './types';
import { DUMMY_FILES } from './constants';
import { authorizeGoogleDrive, syncFilesToDrive, clearDriveToken } from './services/googleDriveService';

// --- JWT Decoder ---
function decodeJwt(token: string): UserProfile | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Essential fields from Google's JWT
    if (!payload.sub || !payload.email) {
      console.error("Decoded JWT is missing essential 'sub' or 'email' fields", payload);
      return null;
    }
    
    // Construct a robust UserProfile object with fallbacks
    const userProfile: UserProfile = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name || payload.given_name || payload.email.split('@')[0], // Use name, or given_name, or derive from email
      picture: payload.picture, // Can be undefined
      given_name: payload.given_name, // Can be undefined
      family_name: payload.family_name, // Can be undefined
    };

    return userProfile;

  } catch (e) {
    console.error("Failed to decode JWT", e);
    return null;
  }
}

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(Theme.LIGHT);
  const [currentPage, setCurrentPage] = useState<Page>(Page.HOME);
  const [selectedFile, setSelectedFile] = useState<Document | null>(null);
  const [selectedBook, setSelectedBook] = useState<Document | null>(null);
  const [driveStatus, setDriveStatus] = useState<'idle' | 'authorizing' | 'syncing' | 'synced' | 'error'>('idle');
  
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const savedUser = localStorage.getItem('aether-user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const {
    items: allItems,
    currentPath,
    addItem,
    deleteItem,
    updateItem,
    navigate,
    goBack,
  } = useFileSystem(DUMMY_FILES);

  useEffect(() => {
    const livePreviewUrl = window.location.origin;
    console.log("============================================================");
    console.log("✅ AetherVault Developer Info");
    console.log("IMPORTANT: Your current Live Preview URL is:");
    console.log(`-> ${livePreviewUrl}`);
    console.log("You MUST add this exact URL to the 'Authorized JavaScript origins' in your Google Cloud Console to enable Sign-In.");
    console.log("============================================================");
  }, []);

  const syncWithDrive = useCallback(async () => {
    setDriveStatus('authorizing');
    try {
      // Step 1: Get user consent and the auth token. This will trigger the popup.
      const token = await authorizeGoogleDrive();

      // Step 2: Once authorized, update status and sync files.
      setDriveStatus('syncing');
      const documentsToUpload = allItems.filter(item => item.type === ItemType.DOCUMENT) as Document[];
      await syncFilesToDrive(documentsToUpload, token);
      
      setDriveStatus('synced');
    } catch (err) {
      console.error("Google Drive sync failed:", err);
      // Handle user closing the popup or denying access
      if (err instanceof Error && (err.message.includes('popup_closed_by_user') || err.message.includes('access_denied'))) {
        setDriveStatus('idle'); // Revert to idle if user cancels
      } else {
        setDriveStatus('error');
      }
    }
  }, [allItems]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === Theme.DARK) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('aether-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('aether-user');
    }
  }, [user]);

  const handleLoginSuccess = (response: any) => {
    const userProfile = decodeJwt(response.credential);
    if (userProfile) {
      setUser(userProfile);
      setCurrentPage(Page.HOME);
      // Automatically trigger sync after login.
      // This is non-blocking, so the UI remains responsive.
      syncWithDrive();
    }
  };

  const handleLogout = () => {
    if (window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
    clearDriveToken(); // Revoke and clear the stored access token
    setUser(null);
    setDriveStatus('idle'); // Reset drive status on logout
    setCurrentPage(Page.HOME);
  };

  const handleFileSelect = (file: Document) => {
    if (file.fileType === 'application/epub+zip') {
      setSelectedBook(file);
    } else {
      setSelectedFile(file);
    }
  };

  const handleCloseViewer = useCallback(() => {
    setSelectedFile(null);
  }, []);
  
  const handleCloseBookReader = useCallback(() => {
    setSelectedBook(null);
  }, []);

  const updateDocument = (updatedDoc: Document) => {
    updateItem(updatedDoc.id, updatedDoc);
    if(selectedFile && selectedFile.id === updatedDoc.id) {
      setSelectedFile(updatedDoc);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case Page.HOME:
        return <Home allItems={allItems} onFileSelect={handleFileSelect} driveStatus={driveStatus} user={user} onSync={syncWithDrive} />;
      case Page.DASHBOARD:
        return (
          <Dashboard
            items={allItems.filter(i => i.parentId === currentPath[currentPath.length - 1].id)}
            currentPath={currentPath}
            onFileSelect={handleFileSelect}
            onFolderSelect={(folderId) => navigate(folderId)}
            onPathNavigate={navigate}
            onGoBack={goBack}
            onAddItem={addItem}
            onDeleteItem={deleteItem}
            onUpdateItem={updateItem}
          />
        );
      case Page.LIBRARY:
        return <Library allItems={allItems} onBookSelect={handleFileSelect} />;
      case Page.SETTINGS:
        return <Settings theme={theme} setTheme={setTheme} user={user} onLogout={handleLogout} onLoginSuccess={handleLoginSuccess} />;
      default:
        return <Home allItems={allItems} onFileSelect={handleFileSelect} driveStatus={driveStatus} user={user} onSync={syncWithDrive} />;
    }
  };

  return (
    <div className="flex h-screen bg-light-background dark:bg-dark-background font-sans text-light-onSurface dark:text-dark-onSurface">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} user={user} onLogout={handleLogout} />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {renderPage()}
        {selectedFile && <div className="absolute inset-0 bg-light-background dark:bg-dark-background z-20"><DocumentViewer document={selectedFile} onClose={handleCloseViewer} onUpdateDocument={updateDocument} onAddItem={addItem} /></div>}
        {selectedBook && <div className="absolute inset-0 bg-light-background dark:bg-dark-background z-20"><BookReader document={selectedBook} onClose={handleCloseBookReader} theme={theme} /></div>}
      </main>
    </div>
  );
};

export default App;
