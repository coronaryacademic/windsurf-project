import { FaEdit, FaTrash } from 'react-icons/fa';
import { format } from 'date-fns';

const NoteItem = ({ note, onDelete, onEdit }) => {
  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this note?')) {
      onDelete(note.id);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(note);
  };

  return (
    <div className="note-card cursor-pointer hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <h3 className="note-title">{note.title}</h3>
        <div className="flex space-x-2">
          <button 
            onClick={handleEdit}
            className="text-blue-600 hover:text-blue-800 p-1"
            aria-label="Edit note"
          >
            <FaEdit />
          </button>
          <button 
            onClick={handleDelete}
            className="text-red-600 hover:text-red-800 p-1"
            aria-label="Delete note"
          >
            <FaTrash />
          </button>
        </div>
      </div>
      
      <p className="note-content whitespace-pre-line">{note.content}</p>
      
      <div className="text-xs text-gray-500 mt-2">
        {note.updatedAt && (
          <span>
            Last updated: {format(new Date(note.updatedAt), 'MMM d, yyyy h:mm a')}
          </span>
        )}
      </div>
    </div>
  );
};

export default NoteItem;
