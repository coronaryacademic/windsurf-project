import { useState, useEffect } from 'react';
import NoteForm from './components/NoteForm';
import NoteList from './components/NoteList';
import axios from 'axios';

const API_URL = 'http://localhost:3001/notes';

function App() {
  const [notes, setNotes] = useState([]);
  const [editingNote, setEditingNote] = useState(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const response = await axios.get(API_URL);
      setNotes(response.data);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const addNote = async (newNote) => {
    try {
      const response = await axios.post(API_URL, newNote);
      setNotes([...notes, response.data]);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const updateNote = async (id, updatedNote) => {
    try {
      const response = await axios.put(`${API_URL}/${id}`, updatedNote);
      setNotes(notes.map(note => (note.id === id ? response.data : note)));
      setEditingNote(null);
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const deleteNote = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      setNotes(notes.filter(note => note.id !== id));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleEdit = (note) => {
    setEditingNote(note);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Note Taking App</h1>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <NoteForm 
              addNote={addNote} 
              updateNote={updateNote} 
              editingNote={editingNote}
              setEditingNote={setEditingNote}
            />
          </div>
          <div className="md:col-span-2">
            <NoteList 
              notes={notes} 
              onDelete={deleteNote} 
              onEdit={handleEdit} 
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
