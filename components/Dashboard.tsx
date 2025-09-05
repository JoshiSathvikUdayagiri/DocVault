import React, { useState, useRef, useEffect } from 'react';
import { FileSystemItem, ItemType, Document, Folder } from '../types';
import Icon from './ui/Icon';

interface DashboardProps {
  items: FileSystemItem[];
  currentPath: (Folder | { id: 'root', name: 'My Drive' })[];
  onFileSelect: (file: Document) => void;
  onFolderSelect: (folderId: string) => void;
  onPathNavigate: (folderId: string) => void;
  onGoBack: () => void;
  onAddItem: (item: Omit<FileSystemItem, 'id'>) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, updates: Partial<FileSystemItem>) => void;
}

const ContextMenu: React.FC<{
    targetItem: FileSystemItem;
    x: number;
    y: number;
    onClose: () => void;
    onUpdateItem: (itemId: string, updates: Partial<FileSystemItem>) => void;
}> = ({ targetItem, x, y, onClose, onUpdateItem }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    if (targetItem.type !== ItemType.FOLDER) return null;

    const handleLockToggle = () => {
        onUpdateItem(targetItem.id, { isLocked: !targetItem.isLocked });
        onClose();
    };

    return (
        <div
            ref={menuRef}
            style={{ top: y, left: x }}
            className="absolute z-10 w-48 bg-light-surface dark:bg-dark-surface rounded-lg shadow-xl border border-light-outline/20 dark:border-dark-outline/20 p-2"
        >
            <button
                onClick={handleLockToggle}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-light-surfaceVariant dark:hover:bg-dark-surfaceVariant"
            >
                <Icon name={targetItem.isLocked ? "unlock" : "lock"} size={16} />
                <span>{targetItem.isLocked ? "Unlock Folder" : "Lock Folder"}</span>
            </button>
        </div>
    );
};


const FileSystemGridItem: React.FC<{ 
    item: FileSystemItem; 
    onDoubleClick: () => void; 
    onClick: () => void; 
    onContextMenu: (event: React.MouseEvent) => void;
    selected: boolean 
}> = ({ item, onDoubleClick, onClick, onContextMenu, selected }) => {
  const getIconName = () => {
    if (item.type === ItemType.FOLDER) return 'folder';
    const doc = item as Document;
    if (doc.fileType.startsWith('image/')) return 'image';
    if (doc.fileType === 'text/plain') return 'text';
    if (doc.fileType === 'application/pdf') return 'pdf';
    if (doc.fileType === 'application/epub+zip') return 'book';
    return 'file';
  };

  const isLocked = item.isLocked;

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={`relative flex flex-col items-center justify-center p-4 rounded-2xl cursor-pointer transition-all duration-200
        ${selected ? 'bg-light-primaryContainer/50 dark:bg-dark-primaryContainer/50 ring-2 ring-light-primary dark:ring-dark-primary' : 'bg-light-surfaceVariant dark:bg-dark-surfaceVariant hover:bg-light-primaryContainer/30 dark:hover:bg-dark-primaryContainer/30'}`}
    >
      <div className="flex items-center justify-center text-light-primary dark:text-dark-primary">
        <Icon name={getIconName()} size={48} />
      </div>
      <p className="mt-2 text-sm text-center truncate w-full text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">{item.name}</p>
      {isLocked && (
        <div className="absolute top-2 right-2 p-1 bg-light-surface dark:bg-dark-surface rounded-full">
            <Icon name="lock" size={14} className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant" />
        </div>
      )}
    </div>
  );
};


const Dashboard: React.FC<DashboardProps> = ({ items, currentPath, onFileSelect, onFolderSelect, onPathNavigate, onGoBack, onAddItem, onDeleteItem, onUpdateItem }) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: FileSystemItem } | null>(null);


  const handleItemClick = (item: FileSystemItem) => {
    setSelectedItemId(item.id);
    setContextMenu(null);
  }

  const handleItemDoubleClick = (item: FileSystemItem) => {
    if (item.isLocked) return; // Prevent opening locked folders/files
    if (item.type === ItemType.FOLDER) {
      onFolderSelect(item.id);
    } else {
      onFileSelect(item as Document);
    }
  };

  const handleContextMenu = (event: React.MouseEvent, item: FileSystemItem) => {
    event.preventDefault();
    setSelectedItemId(item.id);
    setContextMenu({ x: event.clientX, y: event.clientY, item });
  };
  
  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
        const file = event.target.files[0];
        const reader = new FileReader();
        
        const isTextFile = file.type.startsWith('text/') || file.type === 'application/json';

        reader.onload = (e) => {
            const result = e.target?.result;
            if (typeof result !== 'string') return;
            
            // For data URLs, content is after the comma. For text, it's the whole result.
            const content = result.includes(',') ? result.split(',')[1] : result;

            const newDoc: Omit<Document, 'id'> = {
                name: file.name,
                type: ItemType.DOCUMENT,
                parentId: currentPath[currentPath.length - 1].id,
                isLocked: false,
                isEncrypted: false,
                fileType: file.type,
                content: content,
                size: file.size,
                createdAt: new Date().toISOString(),
                annotations: []
            };
            onAddItem(newDoc);
        };
        
        if (isTextFile) {
            reader.readAsText(file);
        } else {
            reader.readAsDataURL(file);
        }
    }
  };

  const Breadcrumbs: React.FC = () => (
    <nav className="flex items-center text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
        <button onClick={() => onPathNavigate('root')} className="hover:underline">My Drive</button>
        {currentPath.slice(1).map((p, i) => (
            <React.Fragment key={p.id}>
                <Icon name="chevronRight" size={16} className="mx-1" />
                <button onClick={() => onPathNavigate(p.id)} className="hover:underline">{p.name}</button>
            </React.Fragment>
        ))}
    </nav>
  );

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto" onClick={() => setContextMenu(null)}>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-light-onBackground dark:text-dark-onBackground">My Drive</h2>
          <Breadcrumbs/>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Icon name="search" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant" />
            <input type="text" placeholder="Search in drive" className="pl-10 pr-4 py-2 w-64 rounded-full bg-light-surfaceVariant dark:bg-dark-surfaceVariant focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary" />
          </div>
          <label htmlFor="file-upload" className="flex items-center gap-2 px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary cursor-pointer hover:opacity-90 transition-opacity">
              <Icon name="upload" size={18}/>
              <span>Upload</span>
          </label>
          <input id="file-upload" type="file" className="hidden" onChange={handleUpload}/>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {items.map(item => (
          <FileSystemGridItem 
            key={item.id} 
            item={item}
            onClick={() => handleItemClick(item)}
            onDoubleClick={() => handleItemDoubleClick(item)}
            onContextMenu={(e) => handleContextMenu(e, item)}
            selected={selectedItemId === item.id}
          />
        ))}
      </div>
      {contextMenu && (
        <ContextMenu 
            targetItem={contextMenu.item}
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onUpdateItem={onUpdateItem}
        />
      )}
    </div>
  );
};

export default Dashboard;