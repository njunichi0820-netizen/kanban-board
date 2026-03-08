import { useState, useCallback, useRef, useEffect } from 'react';

const GITHUB_API = 'https://api.github.com';

export function useCloudSync(tasks, setTasks) {
  const [gistId, setGistId] = useState(() => localStorage.getItem('kanban-gist-id') || '');
  const [token, setToken] = useState(() => localStorage.getItem('kanban-gh-token') || '');
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [error, setError] = useState(null);
  const debounceTimer = useRef(null);
  const skipNextAutoSync = useRef(false);
  const initialFetchDone = useRef(false);

  const isConfigured = !!(gistId && token);

  // Save to localStorage
  useEffect(() => {
    if (gistId) localStorage.setItem('kanban-gist-id', gistId);
    if (token) localStorage.setItem('kanban-gh-token', token);
  }, [gistId, token]);

  // Download tasks from Gist
  const downloadTasks = useCallback(async (gId, tk) => {
    const useGistId = gId || gistId;
    const useToken = tk || token;
    if (!useGistId || !useToken) return false;
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch(`${GITHUB_API}/gists/${useGistId}`, {
        headers: { 'Authorization': `Bearer ${useToken}` },
      });
      if (res.status === 401) throw new Error('トークンが無効です');
      if (res.status === 404) throw new Error('Gist IDが見つかりません');
      if (!res.ok) throw new Error(`取得失敗: ${res.status}`);
      const gist = await res.json();
      const file = gist.files?.['kanban-data.json'];
      if (!file) throw new Error('kanban-data.json が見つかりません');
      const data = JSON.parse(file.content);
      if (data?.tasks && Array.isArray(data.tasks)) {
        skipNextAutoSync.current = true;
        setTasks(data.tasks);
        setLastSynced(new Date());
        return true;
      }
      return false;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setSyncing(false);
    }
  }, [gistId, token, setTasks]);

  // Upload tasks to Gist
  const uploadTasks = useCallback(async (data) => {
    if (!isConfigured) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch(`${GITHUB_API}/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            'kanban-data.json': {
              content: JSON.stringify({ tasks: data, updatedAt: Date.now() }),
            },
          },
        }),
      });
      if (res.status === 401) throw new Error('トークンが無効です');
      if (res.status === 404) throw new Error('Gist IDが見つかりません');
      if (!res.ok) throw new Error(`送信失敗: ${res.status}`);
      setLastSynced(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  }, [gistId, token, isConfigured]);

  // AUTO-FETCH on app load when sync is configured
  useEffect(() => {
    if (isConfigured && !initialFetchDone.current) {
      initialFetchDone.current = true;
      downloadTasks();
    }
  }, [isConfigured, downloadTasks]);

  // Auto-upload when tasks change (debounced)
  useEffect(() => {
    if (!isConfigured) return;
    if (skipNextAutoSync.current) {
      skipNextAutoSync.current = false;
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      uploadTasks(tasks);
    }, 3000);
    return () => clearTimeout(debounceTimer.current);
  }, [tasks, isConfigured, uploadTasks]);

  // Create new Gist
  const createGist = useCallback(async (ghToken) => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch(`${GITHUB_API}/gists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ghToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: 'Kanban Board Sync Data',
          public: false,
          files: {
            'kanban-data.json': {
              content: JSON.stringify({ tasks, updatedAt: Date.now() }),
            },
          },
        }),
      });
      if (res.status === 401) throw new Error('トークンが無効です。gistスコープを確認してください');
      if (!res.ok) throw new Error(`作成失敗: ${res.status}`);
      const gist = await res.json();
      setToken(ghToken);
      setGistId(gist.id);
      initialFetchDone.current = true;
      setLastSynced(new Date());
      return gist.id;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setSyncing(false);
    }
  }, [tasks]);

  // Setup with existing Gist + immediately download
  const setupSync = useCallback(async (ghToken, existingGistId) => {
    setToken(ghToken);
    setGistId(existingGistId);
    initialFetchDone.current = true;
    // Immediately download from the gist
    await downloadTasks(existingGistId, ghToken);
  }, [downloadTasks]);

  // Export tasks as JSON string
  const exportData = useCallback(() => {
    return JSON.stringify({ tasks, exportedAt: Date.now() }, null, 2);
  }, [tasks]);

  // Import tasks from JSON string
  const importData = useCallback((jsonStr) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data?.tasks && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [setTasks]);

  return {
    gistId,
    token,
    isConfigured,
    syncing,
    lastSynced,
    error,
    createGist,
    setupSync,
    syncNow: () => downloadTasks(),
    pushNow: () => uploadTasks(tasks),
    exportData,
    importData,
    clearSync: () => {
      setGistId('');
      setToken('');
      localStorage.removeItem('kanban-gist-id');
      localStorage.removeItem('kanban-gh-token');
      setLastSynced(null);
      setError(null);
      initialFetchDone.current = false;
    },
  };
}
