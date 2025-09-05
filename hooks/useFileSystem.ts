import { useState, useMemo, useCallback } from 'react';
import { FileSystemItem, ItemType, Folder, Document } from '../types';

export { FileSystemItem, Document, Folder };

export const useFileSystem = (initialItems: FileSystemItem[]) => {
  const [allItems, setAllItems] = useState<FileSystemItem[]>(initialItems);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');

  const items = useMemo(() => {
    return allItems.filter(item => item.parentId === currentFolderId);
  }, [allItems, currentFolderId]);
  
  const currentPath = useMemo(() => {
    const path: (Folder | { id: 'root', name: 'My Drive'})[] = [];
    let currentId: string | null = currentFolderId;
    while(currentId) {
        if(currentId === 'root') {
            path.unshift({id: 'root', name: 'My Drive'});
            break;
        }
        const folder = allItems.find(item => item.id === currentId && item.type === ItemType.FOLDER);
        if(folder) {
            path.unshift(folder as Folder);
            currentId = folder.parentId;
        } else {
            // Path broken, reset to root
            setCurrentFolderId('root');
            break;
        }
    }
    return path;
  }, [allItems, currentFolderId]);


  const navigate = useCallback((folderId: string) => {
    setCurrentFolderId(folderId);
  }, []);

  const goBack = useCallback(() => {
    const currentFolder = allItems.find(item => item.id === currentFolderId);
    if (currentFolder && currentFolder.parentId) {
      setCurrentFolderId(currentFolder.parentId);
    }
  }, [allItems, currentFolderId]);

  const addItem = useCallback((item: Omit<FileSystemItem, 'id'>) => {
    const newItem = { ...item, id: `item_${Date.now()}` } as FileSystemItem;
    setAllItems(prev => [...prev, newItem]);
  }, []);

  const deleteItem = useCallback((itemId: string) => {
    // This is a simplified delete, it doesn't handle children of folders.
    setAllItems(prev => prev.filter(item => item.id !== itemId));
  }, []);
  
  const updateItem = useCallback((itemId: string, updates: Partial<FileSystemItem>) => {
    // Fix: Cast the updated item object to FileSystemItem to resolve a TypeScript type inference issue with discriminated unions.
    setAllItems(prev => prev.map(item => item.id === itemId ? { ...item, ...updates } as FileSystemItem : item));
  }, []);

  return { items: allItems, currentPath, currentFolderId, navigate, goBack, addItem, deleteItem, updateItem };
};