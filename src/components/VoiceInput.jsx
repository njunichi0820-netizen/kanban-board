import { Mic, MicOff, Loader2, X, Trash2, Sparkles, AlertTriangle } from 'lucide-react';

const COLUMN_LABELS = { idea: 'アイデア', todo: 'TODO', doing: '進行中' };

export default function VoiceInput({ voice, onAddTasks, size = 20 }) {
  const { status, transcript, parsedTasks, setParsedTasks, errorMessage, startListening, stopListening, reset } = voice;

  const handleToggle = () => {
    if (status === 'listening') {
      stopListening();
    } else if (status === 'idle' || status === 'error') {
      startListening();
    }
  };

  const handleRemoveTask = (index) => {
    setParsedTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditTitle = (index, newTitle) => {
    setParsedTasks((prev) => prev.map((t, i) => (i === index ? { ...t, title: newTitle } : t)));
  };

  const handleEditColumn = (index, newColumn) => {
    setParsedTasks((prev) => prev.map((t, i) => (i === index ? { ...t, column: newColumn } : t)));
  };

  const handleTogglePriority = (index) => {
    setParsedTasks((prev) => prev.map((t, i) => (i === index ? { ...t, priority: !t.priority } : t)));
  };

  const handleAddAll = () => {
    if (parsedTasks.length > 0) {
      onAddTasks(parsedTasks);
      reset();
    }
  };

  const showSheet = status === 'processing' || status === 'done' || (status === 'error' && transcript);

  return (
    <>
      {/* Mic button */}
      <button
        onClick={handleToggle}
        className={`p-2 rounded-xl transition-all ${
          status === 'listening'
            ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200'
            : 'text-gray-400 hover:bg-gray-100'
        }`}
        aria-label="音声入力"
      >
        {status === 'listening' ? <MicOff size={size} /> : <Mic size={size} />}
      </button>

      {/* Bottom sheet overlay */}
      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={reset}>
          <div
            className="bg-white w-full max-w-lg rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-500" />
                <h3 className="font-bold text-gray-800">音声タスク追加</h3>
              </div>
              <button onClick={reset} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Transcript */}
              {transcript && (
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-bold text-gray-400 mb-1">認識テキスト</p>
                  <p className="text-sm text-gray-700">{transcript}</p>
                </div>
              )}

              {/* Processing */}
              {status === 'processing' && (
                <div className="flex items-center justify-center gap-2 py-8 text-indigo-500">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-sm font-semibold">Geminiで解析中...</span>
                </div>
              )}

              {/* Error */}
              {status === 'error' && (
                <div className="flex items-start gap-2 bg-red-50 rounded-xl px-4 py-3">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-600">{errorMessage}</p>
                </div>
              )}

              {/* Task list */}
              {status === 'done' && parsedTasks.length > 0 && (
                <>
                  <p className="text-xs font-bold text-gray-500">{parsedTasks.length}件のタスクを検出</p>
                  <div className="space-y-2">
                    {parsedTasks.map((task, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl px-4 py-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => handleEditTitle(i, e.target.value)}
                            className="flex-1 text-sm font-medium bg-transparent border-b border-transparent focus:border-indigo-300 focus:outline-none py-0.5"
                          />
                          <button onClick={() => handleRemoveTask(i)} className="p-1 text-gray-300 hover:text-red-500 shrink-0">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={task.column}
                            onChange={(e) => handleEditColumn(i, e.target.value)}
                            className="text-[11px] font-semibold bg-white border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                          >
                            {Object.entries(COLUMN_LABELS).map(([id, label]) => (
                              <option key={id} value={id}>{label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleTogglePriority(i)}
                            className={`text-[11px] font-bold px-2 py-1 rounded-lg transition-colors ${
                              task.priority
                                ? 'bg-red-100 text-red-600'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {task.priority ? '重要' : '通常'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={reset}
                      className="flex-1 px-4 py-3 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleAddAll}
                      className="flex-1 px-4 py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
                    >
                      すべて追加 ({parsedTasks.length})
                    </button>
                  </div>
                </>
              )}

              {status === 'done' && parsedTasks.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm">
                  タスクが検出されませんでした
                </div>
              )}

              {/* Retry for errors */}
              {status === 'error' && (
                <div className="flex gap-2">
                  <button onClick={reset} className="flex-1 px-4 py-3 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">
                    閉じる
                  </button>
                  <button onClick={startListening} className="flex-1 px-4 py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">
                    もう一度
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Slide-up animation */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
