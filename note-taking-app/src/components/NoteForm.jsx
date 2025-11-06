import { useState, useEffect } from 'react';
import { FaSave, FaTimes } from 'react-icons/fa';

const NoteForm = ({ addNote, updateNote, editingNote, setEditingNote }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title || '');
      setContent(editingNote.content || '');
    } else {
      setTitle('');
      setContent('');
    }
  }, [editingNote]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) return;

    const noteData = {
      title: title.trim(),
      content: content.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingNote) {
      updateNote(editingNote.id, { ...noteData, id: editingNote.id });
    } else {
      addNote(noteData);
    }

    setTitle('');
    setContent('');
  };

  const handleCancel = () => {
    setEditingNote(null);
    setTitle('');
    setContent('');
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">
        {editingNote ? 'Edit Note' : 'Add New Note'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            placeholder="Note title"
            required
          />
        </div>
        
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Content
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="input-field min-h-[120px]"
            placeholder="Write your note here..."
            required
          />
        </div>
        
        <div className="flex space-x-2">
          <button type="submit" className="btn btn-primary flex items-center">
            <FaSave className="mr-2" />
            {editingNote ? 'Update' : 'Save'}
          </button>
          
          {editingNote && (
            <button 
              type="button" 
              onClick={handleCancel}
              className="btn bg-gray-300 text-gray-800 hover:bg-gray-400"
            >
              <FaTimes className="mr-2" />
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default NoteForm;
