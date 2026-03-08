import { useState } from 'react';
import { X, Plus, Palette } from 'lucide-react';

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#14b8a6',
  '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#8b5cf6',
  '#64748b', '#84cc16',
];

export default function TagManager({ tags, onUpdateTags, onClose }) {
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('');

  const addTag = () => {
    if (!newLabel.trim()) return;
    const id = newLabel.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
    onUpdateTags([...tags, { id, label: newLabel.trim(), color: newColor }]);
    setNewLabel('');
  };

  const removeTag = (id) => {
    onUpdateTags(tags.filter(t => t.id !== id));
  };

  const startEdit = (tag) => {
    setEditingId(tag.id);
    setEditLabel(tag.label);
    setEditColor(tag.color);
  };

  const saveEdit = () => {
    if (!editLabel.trim()) return;
    onUpdateTags(tags.map(t => t.id === editingId ? { ...t, label: editLabel.trim(), color: editColor } : t));
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <Palette size={18} className="text-indigo-500" />
            <h3 className="font-bold text-gray-800">タグ管理</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Existing tags */}
          <div className="space-y-2">
            {tags.map(tag => (
              <div key={tag.id}>
                {editingId === tag.id ? (
                  <div className="space-y-2 p-3 bg-gray-50 rounded-xl">
                    <input
                      type="text"
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className={`w-6 h-6 rounded-full transition-transform ${editColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingId(null)} className="flex-1 text-xs py-1.5 bg-gray-200 rounded-lg font-semibold text-gray-600">キャンセル</button>
                      <button onClick={saveEdit} className="flex-1 text-xs py-1.5 bg-indigo-600 text-white rounded-lg font-semibold">保存</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-1.5">
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                    <span className="flex-1 text-sm font-medium text-gray-700">{tag.label}</span>
                    <button onClick={() => startEdit(tag)} className="text-xs text-gray-400 hover:text-indigo-500 font-semibold px-2">
                      編集
                    </button>
                    <button onClick={() => removeTag(tag.id)} className="text-xs text-gray-400 hover:text-red-500 font-semibold px-2">
                      削除
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add new tag */}
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">新しいタグ</p>
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="タグ名"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              onClick={addTag}
              disabled={!newLabel.trim()}
              className="flex items-center justify-center gap-1 w-full px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-30"
            >
              <Plus size={14} /> 追加
            </button>
          </div>
        </div>

        <div className="px-5 pb-4">
          <button onClick={onClose} className="w-full px-4 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
