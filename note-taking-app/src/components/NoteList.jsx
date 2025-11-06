import { useState, useEffect } from 'react';
import NoteItem from './NoteItem';
import { FaSearch } from 'react-icons/fa';

const NoteList = ({ notes, onDelete, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredNotes, setFilteredNotes] = useState(notes);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredNotes(notes);
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = notes.filter(
        note =>
          note.title.toLowerCase().includes(searchLower) ||
          note.content.toLowerCase().includes(searchLower)
      );
      setFilteredNotes(filtered);
    }
  }, [searchTerm, notes]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FaSearch className="text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10 w-full"
        />
      </div>

      {filteredNotes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'No matching notes found.' : 'No notes yet. Add one to get started!'}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredNotes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NoteList;
