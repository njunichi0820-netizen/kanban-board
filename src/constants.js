export const COLUMNS = [
  { id: 'idea', title: 'アイデア', color: 'bg-yellow-500', lightBg: 'bg-yellow-50', lightText: 'text-yellow-600', ring: 'ring-yellow-200', icon: 'Lightbulb' },
  { id: 'todo', title: '未着手', color: 'bg-purple-500', lightBg: 'bg-purple-50', lightText: 'text-purple-600', ring: 'ring-purple-200', icon: 'ClipboardList' },
  { id: 'doing', title: '進行中', color: 'bg-blue-500', lightBg: 'bg-blue-50', lightText: 'text-blue-600', ring: 'ring-blue-200', icon: 'Zap' },
  { id: 'done', title: '完了', color: 'bg-emerald-500', lightBg: 'bg-emerald-50', lightText: 'text-emerald-600', ring: 'ring-emerald-200', icon: 'PartyPopper' },
];

export const EMPTY_MESSAGES = {
  idea: { icon: '💡', message: 'アイデアを追加しましょう' },
  todo: { icon: '📋', message: 'タスクを計画しましょう' },
  doing: { icon: '🔥', message: '作業を始めましょう' },
  done: { icon: '🎉', message: '完了タスクがここに表示されます' },
};

export const POINT_RULES = [
  { action: 'タスク完了', points: '+10 pt', description: 'タスクを完了カラムに移動' },
  { action: 'サブタスク完了', points: '+3 pt', description: 'サブタスクをチェック' },
];

export const LEVEL_TABLE = [
  { name: 'ビギナー', min: 0 },
  { name: 'ルーキー', min: 30 },
  { name: 'レギュラー', min: 100 },
  { name: 'エキスパート', min: 300 },
  { name: 'マスター', min: 600 },
  { name: 'レジェンド', min: 1000 },
];

export const DEFAULT_TAGS = [
  { id: 'project', label: 'Project', color: '#6366f1' },
  { id: 'purchase', label: 'Purchase', color: '#f59e0b' },
  { id: 'travel', label: 'Travel', color: '#06b6d4' },
  { id: 'health', label: 'Health', color: '#10b981' },
  { id: 'study', label: 'Study', color: '#8b5cf6' },
  { id: 'work', label: 'Work', color: '#3b82f6' },
  { id: 'personal', label: 'Personal', color: '#ec4899' },
  { id: 'finance', label: 'Finance', color: '#14b8a6' },
];
