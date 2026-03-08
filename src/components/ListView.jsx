import { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { COLUMNS, PRIORITIES, PRIORITY_COLORS } from '../constants';

export default function ListView({ tasks, onEditTask, onDeleteTask, onMoveTask }) {
  const [sortBy, setSortBy] = useState('column');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterColumn, setFilterColumn] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortAsc((v) => !v);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  const colOrder = { idea: 0, todo: 1, doing: 2, done: 3 };
  const priOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

  let filtered = tasks;
  if (filterColumn !== 'all') {
    filtered = filtered.filter((t) => t.column === filterColumn);
  }
  if (filterPriority !== 'all') {
    filtered = filtered.filter((t) => t.priority === filterPriority);
  }

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'column') {
      cmp = colOrder[a.column] - colOrder[b.column];
    } else if (sortBy === 'priority') {
      cmp = priOrder[a.priority] - priOrder[b.priority];
    } else if (sortBy === 'title') {
      cmp = a.title.localeCompare(b.title, 'ja');
    } else if (sortBy === 'date') {
      cmp = (a.createdAt || 0) - (b.createdAt || 0);
    }
    return sortAsc ? cmp : -cmp;
  });

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const colMap = Object.fromEntries(COLUMNS.map((c) => [c.id, c]));
  const priMap = Object.fromEntries(PRIORITIES.map((p) => [p.value, p]));

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 px-4 py-3 bg-white border-b shrink-0">
        <select
          value={filterColumn}
          onChange={(e) => setFilterColumn(e.target.value)}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="all">全カラム</option>
          {COLUMNS.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="all">全優先度</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400 self-center ml-auto">
          {sorted.length}件
        </span>
      </div>

      {/* Table header */}
      <div className="hidden md:grid grid-cols-[1fr_100px_100px_120px_80px] gap-2 px-4 py-2 bg-gray-50 border-b text-xs font-medium text-gray-500 shrink-0">
        <button onClick={() => toggleSort('title')} className="flex items-center gap-1 text-left hover:text-gray-700">
          タイトル <SortIcon field="title" />
        </button>
        <button onClick={() => toggleSort('column')} className="flex items-center gap-1 text-left hover:text-gray-700">
          カラム <SortIcon field="column" />
        </button>
        <button onClick={() => toggleSort('priority')} className="flex items-center gap-1 text-left hover:text-gray-700">
          優先度 <SortIcon field="priority" />
        </button>
        <button onClick={() => toggleSort('date')} className="flex items-center gap-1 text-left hover:text-gray-700">
          作成日 <SortIcon field="date" />
        </button>
        <span>操作</span>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-12">タスクがありません</div>
        )}
        {sorted.map((task) => (
          <ListRow
            key={task.id}
            task={task}
            colMap={colMap}
            priMap={priMap}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            onMove={onMoveTask}
          />
        ))}
      </div>
    </div>
  );
}

function ListRow({ task, colMap, priMap, onEdit, onDelete, onMove }) {
  const [showMove, setShowMove] = useState(false);
  const col = colMap[task.column];
  const pri = priMap[task.priority];
  const isDone = task.column === 'done';
  const dateStr = task.createdAt
    ? new Date(task.createdAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
    : '-';

  return (
    <div className={`border-b border-gray-100 ${isDone ? 'opacity-50' : ''}`}>
      {/* Desktop row */}
      <div
        className="hidden md:grid grid-cols-[1fr_100px_100px_120px_80px] gap-2 px-4 py-3 items-center hover:bg-gray-50 cursor-pointer"
        onClick={() => setShowMove((v) => !v)}
      >
        <div className={`text-sm ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          <span className="font-medium">{task.title}</span>
          {task.description && (
            <span className="text-xs text-gray-400 ml-2">{task.description}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${col?.color}`} />
          <span className="text-xs text-gray-600">{col?.title}</span>
        </div>
        <div>
          <span className={`text-xs px-2 py-0.5 rounded-full text-white ${pri?.color}`}>
            {pri?.label}
          </span>
        </div>
        <span className="text-xs text-gray-500">{dateStr}</span>
        <div className="flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="p-1 text-gray-400 hover:text-blue-500">
            <Pencil size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="p-1 text-gray-400 hover:text-red-500">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Mobile row */}
      <div
        className="md:hidden px-4 py-3 active:bg-gray-50 cursor-pointer"
        onClick={() => setShowMove((v) => !v)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
              {task.title}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white ${pri?.color}`}>
              {pri?.label}
            </span>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${col?.color}`} />
              <span className="text-[10px] text-gray-500">{col?.title}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          {task.description && (
            <p className="text-xs text-gray-400 truncate flex-1">{task.description}</p>
          )}
          <div className="flex gap-1 shrink-0 ml-2">
            <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="p-1 text-gray-400">
              <Pencil size={13} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="p-1 text-gray-400">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Move buttons (shared) */}
      {showMove && (
        <div className="flex gap-1 px-4 pb-3">
          {COLUMNS.map((c) => (
            <button
              key={c.id}
              onClick={(e) => {
                e.stopPropagation();
                if (c.id !== task.column) {
                  onMove(task.id, c.id);
                  setShowMove(false);
                }
              }}
              disabled={c.id === task.column}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                c.id === task.column
                  ? 'bg-gray-200 text-gray-400 cursor-default'
                  : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 active:bg-blue-200'
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
