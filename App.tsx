import React, { useState, useEffect, useCallback } from 'react';
import { Page, Theme, UserProfile, Document, ItemType, FileSystemItem } from './types';
import { useFileSystem } from './hooks/useFileSystem';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DocumentViewer from './components/DocumentViewer';
import Settings from './components/Settings';
import Home from './components/Home';
import Library from './components/Library';
import BookReader from './components/BookReader';
import { authorizeGoogleDrive, syncFilesToDrive, clearDriveToken } from './services/googleDriveService';
import ApiKeyModal from './components/ApiKeyModal';
import { initializeAiClient } from './services/geminiService';

const App: React.FC = () => {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
    
    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('aether-theme');
        return (savedTheme === Theme.DARK || savedTheme === Theme.LIGHT) ? savedTheme : Theme.DARK;
    });

    const [user, setUser] = useState<UserProfile | null>(null);
    const [currentPage, setCurrentPage] = useState<Page>(Page.HOME);
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
    const [viewingMode, setViewingMode] = useState<'document' | 'book' | null>(null);
    const [driveStatus, setDriveStatus] = useState<'idle' | 'authorizing' | 'syncing' | 'synced' | 'error'>('idle');

    const { 
        allItems, 
        items, 
        currentPath, 
        addItem, 
        deleteItem, 
        updateItem, 
        navigateToFolder, 
        goBack 
    } = useFileSystem();

    useEffect(() => {
        const savedKey = localStorage.getItem('gemini-api-key');
        if (savedKey) {
            const success = initializeAiClient(savedKey);
            if (success) {
                setApiKey(savedKey);
            } else {
                localStorage.removeItem('gemini-api-key');
                setIsApiKeyModalOpen(true);
            }
        } else {
            setIsApiKeyModalOpen(true);
        }
    }, []);

    const handleApiKeySubmit = (key: string) => {
        const success = initializeAiClient(key);
        if (success) {
            localStorage.setItem('gemini-api-key', key);
            setApiKey(key);
            setIsApiKeyModalOpen(false);
        } else {
            alert("Invalid API Key. Please check the key and try again.");
        }
    };

    useEffect(() => {
        document.documentElement.className = theme;
        localStorage.setItem('aether-theme', theme);
    }, [theme]);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const handleLoginSuccess = useCallback((response: any) => {
        try {
            const credential = response.credential as string;
            const payloadBase64Url = credential.split('.')[1];
            const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
            const decoded: { name: string, email: string, picture: string } = JSON.parse(atob(payloadBase64));

            setUser({
                name: decoded.name,
                email: decoded.email,
                picture: decoded.picture,
            });
            setCurrentPage(Page.HOME);
        } catch (error) {
            console.error("Error decoding JWT:", error);
        }
    }, []);

    const handleLogout = useCallback(() => {
        setUser(null);
        clearDriveToken();
        setDriveStatus('idle');
        setCurrentPage(Page.HOME);
    }, []);
    
    const handleFileSelect = (doc: Document) => {
        if (doc.fileType === 'application/epub+zip') {
            setViewingMode('book');
        } else {
            setViewingMode('document');
        }
        setSelectedDocument(doc);
    };

    const handleCloseViewer = () => {
        setSelectedDocument(null);
        setViewingMode(null);
    };

    const handleUpdateDocument = (updatedDoc: Document) => {
        updateItem(updatedDoc.id, updatedDoc);
        setSelectedDocument(updatedDoc);
    };

    const handleSyncToDrive = async () => {
        if (!user) return;
        setDriveStatus('authorizing');
        try {
            const token = await authorizeGoogleDrive();
            setDriveStatus('syncing');
            const documentsToSync = allItems.filter(item => item.type === ItemType.DOCUMENT) as Document[];
            await syncFilesToDrive(documentsToSync, token);
            setDriveStatus('synced');
        } catch (error) {
            console.error('Google Drive sync failed:', error);
            setDriveStatus('error');
        }
    };
    
    const renderPage = () => {
        switch (currentPage) {
            case Page.HOME:
                return <Home allItems={allItems} onFileSelect={handleFileSelect} user={user} driveStatus={driveStatus} onSync={handleSyncToDrive}/>;
            case Page.DASHBOARD:
                return <Dashboard 
                    items={items}
                    currentPath={currentPath}
                    onFileSelect={handleFileSelect}
                    onFolderSelect={navigateToFolder}
                    onPathNavigate={navigateToFolder}
                    onGoBack={goBack}
                    onAddItem={addItem}
                    onDeleteItem={deleteItem}
                    onUpdateItem={updateItem}
                />;
            case Page.LIBRARY:
                return <Library allItems={allItems} onBookSelect={handleFileSelect} />;
            case Page.SETTINGS:
                return <Settings theme={theme} setTheme={setTheme} user={user} onLogout={handleLogout} onLoginSuccess={handleLoginSuccess} />;
            default:
                return <Home allItems={allItems} onFileSelect={handleFileSelect} user={user} driveStatus={driveStatus} onSync={handleSyncToDrive} />;
        }
    };

    if (!apiKey) {
        return <ApiKeyModal isOpen={isApiKeyModalOpen} onKeySubmit={handleApiKeySubmit} />;
    }

    if (selectedDocument) {
        if (viewingMode === 'document') {
            return <DocumentViewer document={selectedDocument} onClose={handleCloseViewer} onUpdateDocument={handleUpdateDocument} onAddItem={addItem}/>;
        }
        if (viewingMode === 'book') {
            return <BookReader document={selectedDocument} onClose={handleCloseViewer} theme={theme} />;
        }
    }

    return (
        <div className="flex h-screen bg-light-background dark:bg-dark-background text-light-onBackground dark:text-dark-onBackground font-sans">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} user={user} onLogout={handleLogout} />
            <main className="flex-1 flex flex-col overflow-hidden">
                {renderPage()}
            </main>
        </div>
    );
};

export default App;
