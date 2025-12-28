import React from 'react';

interface NotesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  notes: string[];
  levelTitle: string;
}

const NotesSidebar: React.FC<NotesSidebarProps> = ({ isOpen, onClose, notes, levelTitle }) => {
  return (
    <div className={`fixed inset-y-0 right-0 w-80 bg-white/95 backdrop-blur-md shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="h-full flex flex-col p-4 text-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-slate-500">Lesson Notes</div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 text-sm">Close</button>
        </div>
        <div className="font-bold text-sky-700 text-sm mb-2 truncate" title={levelTitle}>{levelTitle}</div>
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {notes.length === 0 && (
            <div className="text-slate-400 text-sm">Pop balloons to collect notes.</div>
          )}
          {notes.map((note, idx) => (
            <div key={idx} className="border border-sky-100 bg-sky-50 rounded-lg p-2 text-sm text-slate-700">
              {note.split('\n').map((line, i) => (
                <div key={i} className="leading-snug">• {line}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotesSidebar;

