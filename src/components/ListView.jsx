import { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp, Clock, Copy } from 'lucide-react';
import { COLUMNS } from '../constants';

function formatDate(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ListView({ tasks, onEditTask, onDeleteTask, onMoveTask, onDuplicate, tags = [] }) {
  const [sortBy, setSortBy] = useState('column');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterColumn, setFilterColumn] = useState('all');
  const [filterTag, setFilterTag] = useState('all');

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortAsc((v) => !v);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  const colOrder = { idea: 0, todo: 1, doing: 2, done: 3 };

  let filtered = tasks;
  if (filterColumn !== 'all') {
    filtered = filtered.filter((t) => t.column === filterColumn);
  }
  if (filterTag !== 'all') {
    filtered = filtered.filter((t) => (t.tags || []).includes(filterTag));
  }

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'column') {
      cmp = colOrder[a.column] - colOrder[b.column];
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

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 px-4 py-3 bg-white border-b shrink-0">
        <select
          value={filterColumn}
          onChange={(e) => setFilterColumn(e.target.value)}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="all">全カラム</option>
          {COLUMNS.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="all">全タグ</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400 self-center ml-auto">
          {sorted.length}件
        </span>
      </div>

      {/* Table header */}
      <div className="hidden md:grid grid-cols-[1fr_100px_140px_80px_80px] gap-2 px-4 py-2 bg-gray-50 border-b text-xs font-medium text-gray-500 shrink-0">
        <button onClick={() => toggleSort('title')} className="flex items-center gap-1 text-left hover:text-gray-700">
          タイトル <SortIcon field="title" />
        </button>
        <button onClick={() => toggleSort('column')} className="flex items-center gap-1 text-left hover:text-gray-700">
          カラム <SortIcon field="column" />
        </button>
        <span>タグ</span>
        <button onClick={() => toggleSort('date')} className="flex items-center gap-1 text-left hover:text-gray-700">
          作成日 <SortIcon field="date" />
        </button>
        <span>操作</span>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <div className="border-2 border-dashed border-gray-200 rounded-2xl px-8 py-6 text-center">
              <p className="text-sm text-gray-300 font-medium">タスクがありません</p>
            </div>
          </div>
        )}
        {sorted.map((task) => (
          <ListRow
            key={task.id}
            task={task}
            colMap={colMap}
            tags={tags}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            onMove={onMoveTask}
            onDuplicate={onDuplicate}
          />
        ))}
      </div>
    </div>
  );
}

function ListRow({ task, colMap, tags, onEdit, onDelete, onMove, onDuplicate }) {
  const [showMove, setShowMove] = useState(false);
  const col = colMap[task.column];
  const isDone = task.column === 'done';
  const taskTags = (task.tags || []).map(tid => tags.find(t => t.id === tid)).filter(Boolean);

  return (
    <div className={`border-b border-gray-100 ${isDone ? 'opacity-50' : ''}`}>
      {/* Desktop row */}
      <div
        className="hidden md:grid grid-cols-[1fr_100px_140px_80px_80px] gap-2 px-4 py-3 items-center hover:bg-gray-50 cursor-pointer"
        onClick={() => setShowMove((v) => !v)}
      >
        <div className={`text-sm ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          <span className="font-medium">{task.priority && <span className="mr-1">🔥</span>}{task.title}</span>
          {task.description && (
            <span className="text-xs text-gray-400 ml-2">{task.description}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${col?.color}`} />
          <span className="text-xs text-gray-600">{col?.title}</span>
        </div>
        <div className="flex flex-wrap gap-1">
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
        <span className="flex items-center gap-0.5 text-xs text-gray-500">
          <Clock size={10} />
          {formatDate(task.createdAt)}
        </span>
        <div className="flex gap-1">
          {onDuplicate && (
            <button onClick={(e) => { e.stopPropagation(); onDuplicate(task); }} className="p-1 text-gray-400 hover:text-blue-500" title="複製">
              <Copy size={14} />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="p-1 text-gray-400 hover:text-indigo-500">
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
              {task.priority && <span className="mr-1">🔥</span>}{task.title}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${col?.color}`} />
              <span className="text-[10px] text-gray-500">{col?.title}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {taskTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
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
            <span className="flex items-center gap-0.5 text-[10px] text-gray-400 shrink-0">
              <Clock size={10} />
              {formatDate(task.createdAt)}
            </span>
          </div>
          <div className="flex gap-1 shrink-0 ml-2">
            {onDuplicate && (
              <button onClick={(e) => { e.stopPropagation(); onDuplicate(task); }} className="p-1 text-gray-400" title="複製">
                <Copy size={13} />
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="p-1 text-gray-400">
              <Pencil size={13} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="p-1 text-gray-400">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Move buttons */}
      {showMove && (
        <div className="flex gap-1.5 px-4 pb-3">
          {COLUMNS.map((c) => {
            const isCurrent = c.id === task.column;
            return (
              <button
                key={c.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isCurrent) {
                    onMove(task.id, c.id);
                    setShowMove(false);
                  }
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
  );
}
