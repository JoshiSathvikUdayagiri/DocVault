import { useState, useCallback, useMemo } from 'react';
import { FileSystemItem, Folder, Document, ItemType } from '../types';
import { DUMMY_FILES } from '../constants';

export const useFileSystem = () => {
  const [items, setItems] = useState<FileSystemItem[]>(DUMMY_FILES);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');

  const currentFolder = useMemo(() => {
    if (currentFolderId === 'root') {
      return items.find(item => item.id === 'root') as Folder;
    }
    return items.find(item => item.id === currentFolderId && item.type === ItemType.FOLDER) as Folder | undefined;
  }, [items, currentFolderId]);

  const currentPath = useMemo(() => {
    const path: (Folder | { id: 'root', name: 'My Drive' })[] = [];
    if (!items.length) return [];
    
    let currentId: string | null = currentFolderId;

    while (currentId) {
        const folder = items.find(item => item.id === currentId);
        if (folder) {
            if (folder.id === 'root') {
                path.unshift({ id: 'root', name: 'My Drive' });
                currentId = null;
            } else {
                path.unshift(folder as Folder);
                currentId = folder.parentId;
            }
        } else {
            currentId = null;
        }
    }
    if (path.length === 0 && items.find(i => i.id === 'root')) {
        path.push({id: 'root', name: 'My Drive'});
    }
    
    return path;
  }, [items, currentFolderId]);

  const currentFolderItems = useMemo(() => {
    return items.filter(item => item.parentId === currentFolderId);
  }, [items, currentFolderId]);

  // FIX: Resolved a TypeScript error by adding a type assertion. When creating a new item
  // by spreading a generic `item` constrained by a discriminated union, TypeScript cannot
  // guarantee the resulting object is a valid member of that union. The `as FileSystemItem`
  // assertion informs the compiler that the object is correctly structured, which is safe
  // in this context.
  const addItem = useCallback(<T extends Omit<FileSystemItem, 'id'>>(item: T) => {
    const newItem = {
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    } as FileSystemItem;
    setItems(prevItems => [...prevItems, newItem]);
  }, []);

  const deleteItem = useCallback((itemId: string) => {
    setItems(prevItems => {
        // Simple delete for now. For a real app, you'd handle children of folders.
        return prevItems.filter(item => item.id !== itemId);
    });
  }, []);

  // Fix: Added a type assertion to the updated item object. Spreading a `Partial<FileSystemItem>` over a `FileSystemItem`
  // causes TypeScript to lose track of the discriminated union type. The assertion is safe given the current usages
  // and resolves the type compatibility error within the `map` function.
  const updateItem = useCallback((itemId: string, updates: Partial<FileSystemItem>) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? ({ ...item, ...updates } as FileSystemItem) : item
      )
    );
  }, []);

  const navigateToFolder = useCallback((folderId: string) => {
    setCurrentFolderId(folderId);
  }, []);
  
  const goBack = useCallback(() => {
      const parentId = currentFolder?.parentId;
      if (parentId) {
          setCurrentFolderId(parentId);
      }
  }, [currentFolder]);

  return {
    allItems: items,
    items: currentFolderItems,
    currentFolder,
    currentPath,
    addItem,
    deleteItem,
    updateItem,
    navigateToFolder,
    goBack,
  };
};