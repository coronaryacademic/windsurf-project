const Sidebar = ({ notes, isOpen, onToggle, onSelectNote, selectedIds = [] }) => {
  return (
    <div className={`border-r bg-white h-full transition-all duration-200 ${isOpen ? 'w-72' : 'w-12'}`}>
      <div className="flex items-center justify-between p-2 border-b">
        <button
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          onClick={onToggle}
          className="p-2 hover:bg-gray-100 rounded"
        >
          {isOpen ? '⟨' : '⟩'}
        </button>
        {isOpen && <div className="text-sm text-gray-500">All Notes ({notes.length})</div>}
      </div>

      {isOpen && (
        <div className="overflow-y-auto h-[calc(100%-44px)] p-2 space-y-1">
          {notes.length === 0 && (
            <div className="text-xs text-gray-500 p-2">No notes yet</div>
          )}
          {notes.map(n => (
            <button
              key={n.id}
              onClick={() => onSelectNote(n.id)}
              className={`w-full text-left p-2 rounded hover:bg-gray-100 ${selectedIds.includes(n.id) ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}
            >
              <div className="font-medium truncate">{n.title || 'Untitled'}</div>
              <div className="text-xs text-gray-500 truncate">{n._meta?.displayDate}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
