// Fix: Added a consolidated global type declaration for `window.google` and `window.gapi` to resolve declaration conflicts.
declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

export enum ItemType {
  FOLDER = 'FOLDER',
  DOCUMENT = 'DOCUMENT',
}

export enum AnnotationType {
  NOTE = 'NOTE',
  HIGHLIGHT = 'HIGHLIGHT',
}

export interface Annotation {
  id: string;
  type: AnnotationType;
  text: string; // The selected text content
  startIndex: number;
  endIndex: number;
  note?: string; // The note content for NOTE type
}

interface BaseItem {
  id: string;
  name: string;
  parentId: string | null;
  isLocked: boolean;
  isEncrypted: boolean;
}

export interface Folder extends BaseItem {
  type: ItemType.FOLDER;
}

export interface Document extends BaseItem {
  type: ItemType.DOCUMENT;
  fileType: string; // e.g., 'image/png', 'text/plain'
  content: string; // e.g., base64 string for images, text content for txt
  size: number; // in bytes
  createdAt: string;
  annotations: Annotation[];
}

export type FileSystemItem = Folder | Document;

export enum Page {
  HOME = 'HOME',
  DASHBOARD = 'DASHBOARD',
  LIBRARY = 'LIBRARY',
  SETTINGS = 'SETTINGS',
  VIEWER = 'VIEWER',
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

export interface UserProfile {
  email: string;
  family_name?: string;
  given_name?: string;
  name: string;
  picture?: string;
  sub: string; // Google's unique ID
}