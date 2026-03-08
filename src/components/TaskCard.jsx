import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, ChevronDown, ChevronRight, Plus, Check, Clock } from 'lucide-react';
import { COLUMNS } from '../constants';

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function TaskCard({ task, columnId, onEdit, onDelete, onMove, onUpdateTask, tags = [] }) {
  const isDone = columnId === 'done';
  const [expanded, setExpanded] = useState(false);
  const [subtasksOpen, setSubtasksOpen] = useState(true);
  const [newSubtask, setNewSubtask] = useState('');
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

  const subtasks = task.subtasks || [];
  const doneCount = subtasks.filter(s => s.done).length;
  const taskTags = (task.tags || []).map(tid => tags.find(t => t.id === tid)).filter(Boolean);

  const handleCardClick = (e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    setExpanded(v => !v);
  };

  const toggleSubtask = (idx) => {
    const updated = subtasks.map((s, i) => i === idx ? { ...s, done: !s.done } : s);
    onUpdateTask?.({ ...task, subtasks: updated });
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    const updated = [...subtasks, { text: newSubtask.trim(), done: false }];
    onUpdateTask?.({ ...task, subtasks: updated });
    setNewSubtask('');
  };

  const removeSubtask = (idx) => {
    onUpdateTask?.({ ...task, subtasks: subtasks.filter((_, i) => i !== idx) });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative bg-white rounded-2xl transition-all duration-200 overflow-hidden
        ${isDragging ? 'opacity-50 shadow-xl z-50' : 'shadow-sm hover:shadow-md'}
        ${isDone ? 'opacity-50' : ''}
        ${expanded ? 'shadow-lg ring-1 ring-black/5' : ''}
      `}
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-2 p-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 touch-none text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical size={14} />
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-semibold break-words leading-snug ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {task.title}
          </p>

          {/* Tags */}
          {taskTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {taskTags.map(tag => (
                <span
                  key={tag.id}
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: tag.color + '20', color: tag.color }}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}

          {/* Date + subtask progress */}
          <div className="flex items-center gap-2 mt-1.5">
            {task.createdAt && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                <Clock size={10} />
                {formatDate(task.createdAt)}
              </span>
            )}
            {subtasks.length > 0 && (
              <span className="text-[10px] text-gray-400">
                <Check size={10} className="inline" /> {doneCount}/{subtasks.length}
              </span>
            )}
          </div>

          {task.description && (
            <p className={`mt-1 text-xs break-words leading-relaxed ${isDone ? 'line-through text-gray-300' : 'text-gray-500'}`}>
              {task.description}
            </p>
          )}
        </div>

        <div className="flex gap-0.5 shrink-0">
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Subtasks */}
          {subtasks.length > 0 && (
            <div>
              <button
                onClick={(e) => { e.stopPropagation(); setSubtasksOpen(v => !v); }}
                className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 mb-1"
              >
                {subtasksOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                サブタスク ({doneCount}/{subtasks.length})
              </button>
              {subtasksOpen && (
                <div className="space-y-1 ml-1">
                  {subtasks.map((st, idx) => (
                    <div key={idx} className="flex items-center gap-2 group/st">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSubtask(idx); }}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          st.done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-indigo-400'
                        }`}
                      >
                        {st.done && <Check size={10} className="text-white" />}
                      </button>
                      <span className={`text-xs flex-1 ${st.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {st.text}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeSubtask(idx); }}
                        className="p-0.5 text-gray-300 hover:text-red-400 opacity-0 group-hover/st:opacity-100 transition-opacity"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Add subtask inline */}
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <Plus size={12} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={newSubtask}
              onChange={e => setNewSubtask(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
              placeholder="サブタスクを追加..."
              className="flex-1 text-xs py-1 px-2 bg-gray-50 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </div>

          {/* Move buttons - pill style */}
          {onMove && (
            <div className="flex gap-1.5 pt-1">
              {COLUMNS.map(c => {
                const isCurrent = c.id === columnId;
                return (
                  <button
                    key={c.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isCurrent) { onMove(task.id, c.id); setExpanded(false); }
                    }}
                    disabled={isCurrent}
                    className={`flex-1 text-[11px] py-2 rounded-xl font-semibold transition-all ${
                      isCurrent
                        ? `${c.lightBg} ${c.lightText} ring-1 ${c.ring}`
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 active:scale-95'
                    }`}
                  >
                    {c.title}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
