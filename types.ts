// Fix: Add global declaration for window.google to resolve TypeScript errors in components using Google's Identity Services library.
declare global {
  interface Window {
    google: any;
  }
}

export enum Page {
  HOME = 'home',
  DASHBOARD = 'dashboard',
  LIBRARY = 'library',
  SETTINGS = 'settings',
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

export enum ItemType {
  FOLDER = 'folder',
  DOCUMENT = 'document',
}

export enum AnnotationType {
  HIGHLIGHT = 'highlight',
  NOTE = 'note',
}

export interface Annotation {
  id: string;
  type: AnnotationType;
  text: string;
  startIndex: number;
  endIndex: number;
  note?: string;
}

interface BaseFileSystemItem {
  id: string;
  name: string;
  parentId: string | null;
  isLocked: boolean;
  isEncrypted: boolean;
}

export interface Folder extends BaseFileSystemItem {
  type: ItemType.FOLDER;
}

export interface Document extends BaseFileSystemItem {
  type: ItemType.DOCUMENT;
  fileType: string;
  content: string;
  size: number;
  createdAt: string;
  annotations: Annotation[];
}

export type FileSystemItem = Folder | Document;

export interface UserProfile {
  name: string;
  email: string;
  picture?: string;
}
