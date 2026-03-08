import { useState, useEffect, useRef } from 'react';
import { X, Flame } from 'lucide-react';
import { COLUMNS } from '../constants';

export default function TaskModal({ isOpen, task, defaultColumn, tags = [], onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [column, setColumn] = useState('idea');
  const [selectedTags, setSelectedTags] = useState([]);
  const [priority, setPriority] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setTitle(task.title);
        setDescription(task.description || '');
        setColumn(task.column);
        setSelectedTags(task.tags || []);
        setPriority(task.priority || false);
      } else {
        setTitle('');
        setDescription('');
        setColumn(defaultColumn || 'idea');
        setSelectedTags([]);
        setPriority(false);
      }
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [isOpen, task, defaultColumn]);

  if (!isOpen) return null;

  const toggleTag = (tagId) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      id: task?.id || crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      tags: selectedTags,
      priority,
      column,
      subtasks: task?.subtasks || [],
      createdAt: task?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold text-gray-800">
            {task ? 'タスク編集' : 'タスク追加'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">タイトル</label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              placeholder="タスク名を入力"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">説明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
              placeholder="詳細（任意）"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">タグ</label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => {
                const selected = selectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                      selected
                        ? 'text-white shadow-sm scale-105'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    style={selected ? { backgroundColor: tag.color } : {}}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">重要度</label>
            <button
              type="button"
              onClick={() => setPriority(v => !v)}
              className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl transition-all ${
                priority
                  ? 'bg-orange-50 text-orange-600 ring-1 ring-orange-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <Flame size={14} />
              {priority ? '重要' : '通常'}
            </button>
          </div>

          {/* Column */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">カラム</label>
            <div className="flex gap-1.5">
              {COLUMNS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColumn(c.id)}
                  className={`flex-1 text-xs font-semibold py-2 rounded-xl transition-all ${
                    column === c.id
                      ? `${c.lightBg} ${c.lightText} ring-1 ${c.ring}`
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
            >
              {task ? '更新' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
