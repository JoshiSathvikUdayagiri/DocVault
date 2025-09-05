import React from 'react';
import { FileSystemItem, Document, ItemType, UserProfile } from '../types';
import Icon from './ui/Icon';

interface HomeProps {
    allItems: FileSystemItem[];
    onFileSelect: (file: Document) => void;
    driveStatus: 'idle' | 'authorizing' | 'syncing' | 'synced' | 'error';
    user: UserProfile | null;
    onSync: () => void;
}

const FileCard: React.FC<{ item: Document, onFileSelect: (file: Document) => void }> = ({ item, onFileSelect }) => {
    const getIconName = () => {
        if (item.fileType.startsWith('image/')) return 'image';
        if (item.fileType === 'text/plain') return 'text';
        if (item.fileType === 'application/pdf') return 'pdf';
        if (item.fileType === 'application/epub+zip') return 'book';
        return 'file';
    };

    return (
        <div onClick={() => onFileSelect(item)} className="bg-light-surface dark:bg-dark-surface p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-light-surfaceVariant dark:hover:bg-dark-surfaceVariant transition-colors">
            <Icon name={getIconName()} size={24} className="text-light-primary dark:text-dark-primary flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate text-light-onSurface dark:text-dark-onSurface">{item.name}</p>
                <p className="text-xs text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">{(item.size / 1024).toFixed(2)} KB</p>
            </div>
        </div>
    );
};

const DriveStatusIndicator: React.FC<{ status: HomeProps['driveStatus'] }> = ({ status }) => {
    let icon = 'upload';
    let message = '';
    let bgColor = 'bg-light-secondaryContainer/70 dark:bg-dark-secondaryContainer/70';
    let textColor = 'text-light-onSecondaryContainer dark:text-dark-onSecondaryContainer';
    let spin = false;

    switch (status) {
        case 'authorizing':
            message = 'Connecting to Google Drive... Please follow the prompts to grant permission.';
            spin = true;
            break;
        case 'syncing':
            message = 'Syncing your documents to your "AetherVault" folder in Google Drive...';
            spin = true;
            break;
        case 'synced':
            icon = 'check';
            message = 'Your documents are synced with Google Drive.';
            bgColor = 'bg-green-100 dark:bg-green-900/50';
            textColor = 'text-green-800 dark:text-green-200';
            break;
        case 'error':
            icon = 'shield'; // Using shield as an alert icon
            message = 'Could not sync with Google Drive. Please check console for details or try again.';
            bgColor = 'bg-light-errorContainer/70 dark:bg-dark-errorContainer/70';
            textColor = 'text-light-onErrorContainer dark:text-dark-onErrorContainer';
            break;
        default:
            return null;
    }

    return (
        <div className={`p-4 rounded-2xl mb-8 flex items-center gap-4 ${bgColor} ${textColor} transition-all`}>
            <Icon name={icon} className={spin ? "animate-spin" : ""} />
            <p className="text-sm font-medium">{message}</p>
        </div>
    );
};


const Home: React.FC<HomeProps> = ({ allItems, onFileSelect, driveStatus, user, onSync }) => {

    const recentFiles = allItems
        .filter(item => item.type === ItemType.DOCUMENT)
        .sort((a, b) => new Date((b as Document).createdAt).getTime() - new Date((a as Document).createdAt).getTime())
        .slice(0, 5) as Document[];

    return (
        <div className="flex-1 p-8 overflow-y-auto">
            {user && driveStatus !== 'idle' && <DriveStatusIndicator status={driveStatus} />}
            
            <h1 className="text-3xl font-bold text-light-onBackground dark:text-dark-onBackground mb-2">Welcome to AetherVault</h1>
            <p className="text-md text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Your futuristic document hub, powered by AI.</p>
        
            {/* This card appears if the user is logged in but hasn't synced yet, or if a sync failed. */}
            {user && (driveStatus === 'idle' || driveStatus === 'error') && (
                 <div className="mt-8 p-6 rounded-2xl bg-light-primaryContainer/60 dark:bg-dark-primaryContainer/60 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-light-onPrimaryContainer dark:text-dark-onPrimaryContainer">Sync with Google Drive</h3>
                        <p className="text-sm text-light-onPrimaryContainer/80 dark:text-dark-onPrimaryContainer/80 mt-1">
                            {driveStatus === 'error'
                                ? 'There was an error during the last sync attempt. Please try again.'
                                : 'Securely back up your documents by connecting your Google Drive account.'}
                        </p>
                    </div>
                    <button 
                        onClick={onSync}
                        className="bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary px-5 py-2.5 rounded-full font-medium text-sm whitespace-nowrap hover:opacity-90 transition-opacity flex-shrink-0"
                    >
                        {driveStatus === 'error' ? 'Retry Sync' : 'Connect & Sync'}
                    </button>
                </div>
            )}

            <div className="mt-10">
                <h2 className="text-xl font-bold mb-4">Recent Files</h2>
                {recentFiles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recentFiles.map(file => (
                            <FileCard key={file.id} item={file} onFileSelect={onFileSelect} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-light-surfaceVariant dark:bg-dark-surfaceVariant rounded-2xl">
                        <p className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">No recent files found.</p>
                        <p className="text-sm text-light-onSurfaceVariant/70 dark:text-dark-onSurfaceVariant/70 mt-1">Upload a file to get started!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
