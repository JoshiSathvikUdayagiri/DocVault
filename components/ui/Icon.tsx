
import React from 'react';
import {
  Folder,
  FileText,
  FileImage,
  File,
  Settings,
  LayoutGrid,
  Lock,
  Unlock,
  Plus,
  ArrowLeft,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  X,
  Sun,
  Moon,
  Shield,
  UploadCloud,
  ChevronRight,
  ChevronLeft,
  Clipboard,
  FileJson,
  BookText,
  Type,
  FileCog,
  Highlighter,
  MessageSquare,
  Home,
  Library,
  BookOpen,
  ZoomIn,
  ZoomOut,
  Download,
  ExternalLink,
  SearchCheck,
  Check,
  LogOut,
  LogIn
} from 'lucide-react';

interface IconProps {
  name: string;
  className?: string;
  size?: number;
}

const iconMap: { [key: string]: React.ElementType } = {
  folder: Folder,
  text: FileText,
  image: FileImage,
  pdf: FileText,
  book: BookOpen,
  file: File,
  settings: Settings,
  dashboard: LayoutGrid,
  lock: Lock,
  unlock: Unlock,
  plus: Plus,
  arrowLeft: ArrowLeft,
  search: Search,
  more: MoreVertical,
  delete: Trash2,
  edit: Edit,
  close: X,
  sun: Sun,
  moon: Moon,
  shield: Shield,
  upload: UploadCloud,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  ocr: Type,
  summarize: BookText,
  json: FileJson,
  clipboard: Clipboard,
  check: Check,
  convert: FileCog,
  highlight: Highlighter,
  note: MessageSquare,
  home: Home,
  library: Library,
  zoomIn: ZoomIn,
  zoomOut: ZoomOut,
  download: Download,
  externalLink: ExternalLink,
  searchCheck: SearchCheck,
  dictionary: BookText,
  logout: LogOut,
  login: LogIn,
};

const Icon: React.FC<IconProps> = ({ name, className, size = 24 }) => {
  const LucideIcon = iconMap[name];
  if (!LucideIcon) {
    return <File className={className} size={size} />;
  }
  return <LucideIcon className={className} size={size} />;
};

export default Icon;
