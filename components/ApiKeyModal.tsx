import React, { useState } from 'react';
import Icon from './ui/Icon';

interface ApiKeyModalProps {
  isOpen: boolean;
  onKeySubmit: (key: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onKeySubmit }) => {
  const [keyInput, setKeyInput] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyInput.trim()) {
      onKeySubmit(keyInput.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl p-8 w-full max-w-md m-4 text-center">
        <div className="flex justify-center mb-4">
            <div className="p-3 bg-light-primaryContainer dark:bg-dark-primaryContainer rounded-full">
                <Icon name="shield" className="text-light-onPrimaryContainer dark:text-dark-onPrimaryContainer" size={28} />
            </div>
        </div>
        <h2 className="text-xl font-bold mb-3 text-light-onSurface dark:text-dark-onSurface">Enter Gemini API Key</h2>
        <p className="text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-6">
          To enable AI features, please enter your Google Gemini API key. The key will be saved in your browser's local storage and will not be shared.
        </p>
        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder="Enter your API key here"
          className="w-full px-4 py-2 text-sm text-center rounded-lg bg-light-surfaceVariant dark:bg-dark-surfaceVariant border border-light-outline dark:border-dark-outline focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:outline-none"
        />
        <button
          type="submit"
          className="mt-6 w-full px-4 py-2.5 rounded-full bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary hover:opacity-90 transition-opacity disabled:opacity-50"
          disabled={!keyInput.trim()}
        >
          Save and Continue
        </button>
      </form>
    </div>
  );
};

export default ApiKeyModal;