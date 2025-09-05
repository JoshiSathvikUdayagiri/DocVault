
import React, { useState, useEffect, useCallback } from 'react';
import { DUMMY_FILES } from './constants';
import { useFileSystem, FileSystemItem, Document as Doc, Folder as Fldr } from './hooks/useFileSystem';
import { Page, Theme, UserProfile, ItemType } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DocumentViewer from './components/DocumentViewer';
import Settings from './components/Settings';
import ApiKeyModal from './components/ApiKeyModal';
// Fix: Use a named import for jwt-decode as the default export is deprecated.
import { jwtDecode } from "jwt-decode";
import Home from './components/Home';
import Library from './components/Library';
import BookReader from './components/BookReader';
import { authorizeGoogleDrive, syncFilesToDrive, clearDriveToken } from './services/googleDriveService';
import { initializeAiClient } from './services/geminiService';

type DriveStatus = 'idle' | 'authorizing' | 'syncing' | 'synced' | 'error';

const App: React.FC = () => {
    const [theme, setTheme] = useState<Theme>(() => {
        const storedTheme = localStorage.getItem('theme');
        return (storedTheme as Theme) || Theme.DARK;
    });
    const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem('gemini-api-key'));
    const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);
    const [currentPage, setCurrentPage] = useState<Page>(Page.HOME);
    const [selectedDocument, setSelectedDocument] = useState<Doc | null>(null);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [driveStatus, setDriveStatus] = useState<DriveStatus>('idle');

    const {
        items,
        currentPath,
        currentFolderId,
        navigate,
        goBack,
        addItem,
        deleteItem,
        updateItem
    } = useFileSystem(DUMMY_FILES);

    useEffect(() => {
        if (apiKey) {
            initializeAiClient(apiKey);
            setIsApiKeyMissing(false);
        } else {
            setIsApiKeyMissing(true);
        }
    }, [apiKey]);

    useEffect(() => {
        if (theme === Theme.DARK) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    const handleApiKeySubmit = (key: string) => {
        if (key && key.trim()) {
            const trimmedKey = key.trim();
            localStorage.setItem('gemini-api-key', trimmedKey);
            setApiKey(trimmedKey);
        }
    };

    const handleLoginSuccess = (response: any) => {
        const decoded: any = jwtDecode(response.credential);
        setUser({
            name: decoded.name,
            email: decoded.email,
            picture: decoded.picture,
        });
    };

    const handleLogout = () => {
        setUser(null);
        clearDriveToken();
        setDriveStatus('idle');
    };

    const handleFileSelect = (file: Doc) => {
        setSelectedDocument(file);
    };

    const handleCloseViewer = () => {
        setSelectedDocument(null);
    };

    const handleUpdateDocument = (updatedDoc: Doc) => {
        updateItem(updatedDoc.id, updatedDoc);
        if (selectedDocument && selectedDocument.id === updatedDoc.id) {
            setSelectedDocument(updatedDoc);
        }
    };
    
    const handleSync = useCallback(async () => {
        if (!user) {
            console.error("Cannot sync without a user.");
            return;
        }
        setDriveStatus('authorizing');
        try {
            const token = await authorizeGoogleDrive();
            setDriveStatus('syncing');
            const documentsToSync = items.filter(item => item.type === ItemType.DOCUMENT) as Doc[];
            await syncFilesToDrive(documentsToSync, token);
            setDriveStatus('synced');
        } catch (error) {
            console.error("Google Drive sync failed:", error);
            setDriveStatus('error');
        }
    }, [user, items]);


    const renderPage = () => {
        if (selectedDocument) {
             if (selectedDocument.fileType === 'application/epub+zip') {
                return <BookReader document={selectedDocument} onClose={handleCloseViewer} theme={theme} />;
             }
            return <DocumentViewer 
                document={selectedDocument} 
                onClose={handleCloseViewer}
                onUpdateDocument={handleUpdateDocument}
                onAddItem={addItem}
            />;
        }
        
        const currentFolderItems = items.filter(i => i.parentId === currentFolderId);

        switch (currentPage) {
            case Page.HOME:
                return <Home allItems={items} onFileSelect={handleFileSelect} user={user} driveStatus={driveStatus} onSync={handleSync} />;
            case Page.DASHBOARD:
                return <Dashboard
                    items={currentFolderItems}
                    currentPath={currentPath as (Fldr | {id: 'root', name: 'My Drive'})[]}
                    onFileSelect={handleFileSelect}
                    onFolderSelect={navigate}
                    onPathNavigate={navigate}
                    onGoBack={goBack}
                    onAddItem={addItem}
                    onDeleteItem={deleteItem}
                    onUpdateItem={updateItem}
                />;
            case Page.LIBRARY:
                return <Library allItems={items} onBookSelect={handleFileSelect} />;
            case Page.SETTINGS:
                return <Settings theme={theme} setTheme={setTheme} user={user} onLoginSuccess={handleLoginSuccess} onLogout={handleLogout} />;
            default:
                return <Home allItems={items} onFileSelect={handleFileSelect} user={user} driveStatus={driveStatus} onSync={handleSync} />;
        }
    };

    return (
        <div className={`${theme}`}>
            <div className="flex h-screen font-sans bg-light-background dark:bg-dark-background text-light-onBackground dark:text-dark-onBackground">
                <Sidebar
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    user={user}
                    onLogout={handleLogout}
                />
                <main className="flex-1 flex flex-col">
                    {renderPage()}
                </main>
                <ApiKeyModal 
                  isOpen={isApiKeyMissing} 
                  onKeySubmit={handleApiKeySubmit}
                />
            </div>
        </div>
    );
};

export default App;