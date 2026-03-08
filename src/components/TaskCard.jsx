import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { PRIORITY_COLORS, COLUMNS } from '../constants';

export default function TaskCard({ task, columnId, onEdit, onDelete, onMove }) {
  const isDone = columnId === 'done';
  const [showMoveButtons, setShowMoveButtons] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { columnId } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleCardClick = (e) => {
    if (e.target.closest('button')) return;
    setShowMoveButtons((v) => !v);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative bg-white rounded-lg shadow-sm border-l-4
        ${PRIORITY_COLORS[task.priority]}
        ${isDragging ? 'opacity-50 shadow-lg z-50' : ''}
        ${isDone ? 'opacity-60' : ''}
      `}
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-1 p-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 touch-none text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
          aria-label="ドラッグ"
        >
          <GripVertical size={16} />
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium text-gray-800 break-words ${isDone ? 'line-through text-gray-400' : ''}`}>
            {task.title}
          </p>
          {task.description && (
            <p className={`mt-1 text-xs text-gray-500 break-words ${isDone ? 'line-through' : ''}`}>
              {task.description}
            </p>
          )}
        </div>

        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-100 sm:group-hover:opacity-100">
          <button
            onClick={() => onEdit(task)}
            className="p-1 text-gray-400 hover:text-blue-500"
            aria-label="編集"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 text-gray-400 hover:text-red-500"
            aria-label="削除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Move buttons */}
      {showMoveButtons && onMove && (
        <div className="flex items-center justify-between px-2 pb-2 gap-1">
          {COLUMNS.map((col) => (
            <button
              key={col.id}
              onClick={(e) => {
                e.stopPropagation();
                if (col.id !== columnId) {
                  onMove(task.id, col.id);
                  setShowMoveButtons(false);
                }
              }}
              disabled={col.id === columnId}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                col.id === columnId
                  ? 'bg-gray-200 text-gray-400 cursor-default'
                  : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 active:bg-blue-200'
              }`}
            >
              {col.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
