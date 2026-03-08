export const COLUMNS = [
  { id: 'idea', title: 'Idea', color: 'bg-purple-500' },
  { id: 'todo', title: 'ToDo', color: 'bg-blue-500' },
  { id: 'doing', title: 'Doing', color: 'bg-yellow-500' },
  { id: 'done', title: 'Done', color: 'bg-green-500' },
];

export const PRIORITIES = [
  { value: 'low', label: '低', color: 'bg-slate-400' },
  { value: 'medium', label: '中', color: 'bg-blue-400' },
  { value: 'high', label: '高', color: 'bg-orange-400' },
  { value: 'urgent', label: '緊急', color: 'bg-red-500' },
];

export const PRIORITY_COLORS = {
  low: 'border-l-slate-400',
  medium: 'border-l-blue-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-500',
};
