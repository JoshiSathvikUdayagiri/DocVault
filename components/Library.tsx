import React from 'react';
import { FileSystemItem, Document, ItemType } from '../types';
import Icon from './ui/Icon';

interface LibraryProps {
    allItems: FileSystemItem[];
    onBookSelect: (book: Document) => void;
}

const BookCard: React.FC<{ book: Document, onBookSelect: (book: Document) => void }> = ({ book, onBookSelect }) => {
    return (
        <div onClick={() => onBookSelect(book)} className="group relative aspect-[2/3] bg-light-tertiaryContainer dark:bg-dark-tertiaryContainer rounded-lg flex flex-col items-center justify-center p-4 cursor-pointer shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            <Icon name="book" size={48} className="text-light-onTertiaryContainer dark:text-dark-onTertiaryContainer opacity-50 group-hover:opacity-80 transition-opacity" />
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                 <p className="text-sm font-bold text-white text-center line-clamp-2">{book.name.replace('.epub', '')}</p>
            </div>
        </div>
    );
};


const Library: React.FC<LibraryProps> = ({ allItems, onBookSelect }) => {

    const ebooks = allItems.filter(item => item.type === ItemType.DOCUMENT && item.fileType === 'application/epub+zip') as Document[];

    return (
        <div className="flex-1 p-8 overflow-y-auto">
            <div className="flex items-center gap-3 mb-8">
                 <Icon name="library" size={32} className="text-light-onBackground dark:text-dark-onBackground" />
                 <h1 className="text-3xl font-bold text-light-onBackground dark:text-dark-onBackground">My E-Book Library</h1>
            </div>
        
            {ebooks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-6">
                    {ebooks.map(book => (
                        <BookCard key={book.id} book={book} onBookSelect={onBookSelect} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-10 bg-light-surfaceVariant dark:bg-dark-surfaceVariant rounded-2xl">
                    <Icon name="library" size={48} className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-4" />
                    <p className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Your library is empty.</p>
                    <p className="text-sm text-light-onSurfaceVariant/70 dark:text-dark-onSurfaceVariant/70 mt-1">Upload files with the .epub extension to add them here.</p>
                </div>
            )}
        </div>
    );
};

export default Library;
