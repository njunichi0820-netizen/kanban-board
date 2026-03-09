import { useState, useRef } from 'react';
import { Cloud, CloudOff, RefreshCw, Copy, Check, Unlink, Download, Upload, Key, Sparkles, Trash2 } from 'lucide-react';

export default function SyncPanel({ sync, onClose }) {
  const {
    gistId, isConfigured, syncing, lastSynced, error,
    createGist, setupSync, syncNow, pushNow, exportData, importData, clearSync,
  } = sync;

  const [tab, setTab] = useState(isConfigured ? 'sync' : 'setup');
  const [tokenInput, setTokenInput] = useState('');
  const [gistInput, setGistInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef(null);

  // Gemini API key state
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('kanban-gemini-key') || '');
  const [geminiInput, setGeminiInput] = useState('');
  const [geminiSaved, setGeminiSaved] = useState(false);

  const handleCreate = async () => {
    if (!tokenInput.trim()) return;
    const id = await createGist(tokenInput.trim());
    if (id) {
      setTab('sync');
      setTokenInput('');
    }
  };

  const handleJoin = () => {
    if (!tokenInput.trim() || !gistInput.trim()) return;
    setupSync(tokenInput.trim(), gistInput.trim());
    setTab('sync');
    setTokenInput('');
    setGistInput('');
    setTimeout(() => syncNow(), 300);
  };

  const handleCopyGistId = () => {
    navigator.clipboard.writeText(gistId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kanban-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const ok = importData(ev.target.result);
      setImportMsg(ok ? 'インポート成功!' : 'データ形式が正しくありません');
      setTimeout(() => setImportMsg(''), 3000);
    };
    reader.readAsText(file);
  };

  const handleSaveGeminiKey = () => {
    if (!geminiInput.trim()) return;
    localStorage.setItem('kanban-gemini-key', geminiInput.trim());
    setGeminiKey(geminiInput.trim());
    setGeminiInput('');
    setGeminiSaved(true);
    setTimeout(() => setGeminiSaved(false), 2000);
  };

  const handleDeleteGeminiKey = () => {
    localStorage.removeItem('kanban-gemini-key');
    setGeminiKey('');
    setGeminiInput('');
  };

  const handleImportText = () => {
    if (!importText.trim()) return;
    const ok = importData(importText.trim());
    setImportMsg(ok ? 'インポート成功!' : 'データ形式が正しくありません');
    if (ok) setImportText('');
    setTimeout(() => setImportMsg(''), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b">
          {isConfigured ? <Cloud size={20} className="text-indigo-500" /> : <CloudOff size={20} className="text-gray-400" />}
          <h3 className="font-bold text-gray-800">デバイス同期</h3>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b">
          {['setup', 'export', 'gemini'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t === 'setup' && isConfigured ? 'sync' : t)}
              className={`flex-1 py-2.5 text-xs font-bold tracking-wide transition-colors ${
                (tab === t || (t === 'setup' && tab === 'sync'))
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t === 'setup' ? (isConfigured ? 'GitHub同期' : 'セットアップ') : t === 'gemini' ? 'Gemini AI' : 'エクスポート'}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {/* === Sync configured === */}
          {tab === 'sync' && isConfigured && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Gist ID</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-xs font-mono text-gray-600 truncate">
                    {gistId}
                  </code>
                  <button onClick={handleCopyGistId} className="p-2 bg-gray-100 rounded-lg text-gray-500 hover:text-indigo-500">
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-gray-400">別デバイスでこのGist IDとトークンを入力</p>
              </div>

              {lastSynced && (
                <p className="text-xs text-gray-400">最終同期: {lastSynced.toLocaleTimeString('ja-JP')}</p>
              )}
              {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <div className="flex gap-2">
                <button onClick={syncNow} disabled={syncing}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 text-sm font-bold bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50">
                  <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> 取得
                </button>
                <button onClick={pushNow} disabled={syncing}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 text-sm font-bold bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50">
                  <Cloud size={14} /> 送信
                </button>
              </div>

              <button onClick={() => { clearSync(); setTab('setup'); }}
                className="flex items-center justify-center gap-1 w-full px-3 py-2 text-sm text-red-500 bg-red-50 rounded-xl hover:bg-red-100 font-bold">
                <Unlink size={14} /> 同期解除
              </button>
            </>
          )}

          {/* === Setup === */}
          {tab === 'setup' && !isConfigured && (
            <>
              <div className="bg-indigo-50 rounded-xl p-3 text-xs text-indigo-700 leading-relaxed">
                <p className="font-bold mb-1">GitHub Gistで同期</p>
                <p>Personal Access Token(classic)が必要です。</p>
                <p className="mt-1">GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token</p>
                <p className="mt-1 font-semibold">スコープ: <code className="bg-indigo-100 px-1 rounded">gist</code> のみチェック</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  <Key size={12} className="inline mr-1" />GitHub Token
                </label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <button onClick={handleCreate} disabled={!tokenInput.trim() || syncing}
                className="w-full px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-30">
                {syncing ? '作成中...' : '新しい同期を開始'}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-xs"><span className="px-2 bg-white text-gray-400">既存の同期に参加</span></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Gist ID</label>
                <input
                  type="text"
                  value={gistInput}
                  onChange={(e) => setGistInput(e.target.value)}
                  placeholder="abc123def456..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <button onClick={handleJoin} disabled={!tokenInput.trim() || !gistInput.trim()}
                className="w-full px-4 py-2.5 text-sm font-bold text-white bg-gray-700 rounded-xl hover:bg-gray-800 disabled:opacity-30">
                参加して取得
              </button>

              {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </>
          )}

          {/* === Export/Import === */}
          {tab === 'export' && (
            <>
              <button onClick={handleExport}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">
                <Download size={16} /> JSONファイルをダウンロード
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-xs"><span className="px-2 bg-white text-gray-400">インポート</span></div>
              </div>

              <button onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">
                <Upload size={16} /> JSONファイルを選択
              </button>
              <input ref={fileRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-xs"><span className="px-2 bg-white text-gray-400">またはテキスト貼り付け</span></div>
              </div>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={3}
                placeholder='{"tasks":[...]}'
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
              <button onClick={handleImportText} disabled={!importText.trim()}
                className="w-full px-4 py-2 text-sm font-bold text-white bg-gray-700 rounded-xl hover:bg-gray-800 disabled:opacity-30">
                テキストからインポート
              </button>

              {importMsg && (
                <p className={`text-xs text-center font-bold ${importMsg.includes('成功') ? 'text-green-600' : 'text-red-500'}`}>
                  {importMsg}
                </p>
              )}
            </>
          )}

          {/* === Gemini API === */}
          {tab === 'gemini' && (
            <>
              <div className="bg-purple-50 rounded-xl p-3 text-xs text-purple-700 leading-relaxed">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles size={14} />
                  <p className="font-bold">Gemini AI 音声タスク</p>
                </div>
                <p>音声入力したテキストをGemini AIが解析し、タスクを自動分割・カラム振り分けします。</p>
                <p className="mt-1">Google AI Studio でAPIキーを取得してください。</p>
              </div>

              {geminiKey ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">APIキー</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-xs font-mono text-gray-600 truncate">
                        {geminiKey.slice(0, 8)}{'•'.repeat(20)}
                      </code>
                      {geminiSaved && <Check size={16} className="text-green-500" />}
                    </div>
                    <p className="mt-1 text-[10px] text-green-600 font-semibold">設定済み — 音声入力が使えます</p>
                  </div>
                  <button
                    onClick={handleDeleteGeminiKey}
                    className="flex items-center justify-center gap-1 w-full px-3 py-2 text-sm text-red-500 bg-red-50 rounded-xl hover:bg-red-100 font-bold"
                  >
                    <Trash2 size={14} /> APIキーを削除
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      <Key size={12} className="inline mr-1" />Gemini APIキー
                    </label>
                    <input
                      type="password"
                      value={geminiInput}
                      onChange={(e) => setGeminiInput(e.target.value)}
                      placeholder="AIza..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                  <button
                    onClick={handleSaveGeminiKey}
                    disabled={!geminiInput.trim()}
                    className="w-full px-4 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-30"
                  >
                    保存
                  </button>
                </>
              )}
            </>
          )}
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
