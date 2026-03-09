import { useState, useCallback, useRef, useEffect, useMemo, Component } from 'react';
import {
  DndContext,
  pointerWithin,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { ChevronLeft, ChevronRight, Plus, LayoutGrid, List, Cloud, CloudOff, Kanban, Palette, Archive, BarChart3, HelpCircle, Mic } from 'lucide-react';
import Column from './components/Column';
import TaskCard from './components/TaskCard';
import TaskModal from './components/TaskModal';
import ListView from './components/ListView';
import SyncPanel from './components/SyncPanel';
import TagManager from './components/TagManager';
import BoardFilter from './components/BoardFilter';
import ArchivePanel from './components/ArchivePanel';
import StatsView from './components/StatsView';
import VoiceInput from './components/VoiceInput';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useCloudSync } from './hooks/useCloudSync';
import { useKarma } from './hooks/useKarma';
import { useVoiceTask } from './hooks/useVoiceTask';
import { COLUMNS, DEFAULT_TAGS } from './constants';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md">
            <h3 className="text-red-700 font-bold mb-2">エラーが発生しました</h3>
            <p className="text-red-600 text-sm font-mono break-all">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-3 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              再試行
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const VIEW_MODES = ['board', 'list', 'stats'];

function App() {
  const [tasks, setTasks] = useLocalStorage('kanban-tasks', []);
  const [archivedTasks, setArchivedTasks] = useLocalStorage('kanban-archived', []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [defaultColumn, setDefaultColumn] = useState('idea');
  const [activeColumnIndex, setActiveColumnIndex] = useState(0);
  const [activeTask, setActiveTask] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState('board');
  const [syncPanelOpen, setSyncPanelOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [archivePanelOpen, setArchivePanelOpen] = useState(false);
  const [tags, setTags] = useLocalStorage('kanban-tags', DEFAULT_TAGS);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const searchInputRef = useRef(null);

  const { points, setPoints, onTaskCreate, onTaskComplete, onSubtaskComplete, getLevel, getDailyData, getWeeklyData } = useKarma();
  const sync = useCloudSync(tasks, setTasks, archivedTasks, setArchivedTasks, points, setPoints);
  const voice = useVoiceTask();

  const handleVoiceTasks = useCallback((voiceTasks) => {
    const newTasks = voiceTasks.map((t) => ({
      id: crypto.randomUUID(),
      title: t.title,
      description: '',
      column: t.column,
      priority: t.priority,
      tags: [],
      subtasks: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
    setTasks((prev) => [...prev, ...newTasks]);
    newTasks.forEach(() => onTaskCreate());
  }, [setTasks, onTaskCreate]);

  // Track active column during drag for cross-column DnD fix
  const activeColumnRef = useRef(null);

  // Swipe state — used for both view switching and column switching on mobile
  const touchStart = useRef(null);
  const touchDelta = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swiping = useRef(false);
  const dragging = useRef(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        if (e.key === 'Escape') {
          e.target.blur();
        }
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleAddTask('idea');
      } else if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        if (modalOpen) {
          setModalOpen(false);
          setEditingTask(null);
        } else if (syncPanelOpen) {
          setSyncPanelOpen(false);
        } else if (tagManagerOpen) {
          setTagManagerOpen(false);
        } else if (archivePanelOpen) {
          setArchivePanelOpen(false);
        } else if (showShortcuts) {
          setShowShortcuts(false);
        }
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      } else if (e.key === '1') {
        setViewMode('board');
      } else if (e.key === '2') {
        setViewMode('list');
      } else if (e.key === '3') {
        setViewMode('stats');
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setArchivePanelOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, syncPanelOpen, tagManagerOpen, archivePanelOpen, showShortcuts]);

  // Desktop only: PointerSensor (no TouchSensor)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Custom collision detection: pointerWithin first, fallback to closestCorners
  const collisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return closestCorners(args);
  }, []);

  // Filter tasks for display
  const filterTasks = useCallback((taskList) => {
    let result = taskList;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
      );
    }
    if (selectedTags.length > 0) {
      result = result.filter((t) =>
        selectedTags.some((tagId) => (t.tags || []).includes(tagId))
      );
    }
    return result;
  }, [searchQuery, selectedTags]);

  const filteredTasks = useMemo(() => filterTasks(tasks), [tasks, filterTasks]);

  const getColumnTasks = useCallback(
    (columnId) => filteredTasks.filter((t) => t.column === columnId),
    [filteredTasks]
  );

  const handleToggleTag = (tagId) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleAddTask = (columnId) => {
    setEditingTask(null);
    setDefaultColumn(columnId);
    setModalOpen(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleDeleteTask = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleMoveTask = (taskId, newColumnId) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (task && task.column !== 'done' && newColumnId === 'done') {
        onTaskComplete();
      }
      return prev.map((t) => (t.id === taskId ? { ...t, column: newColumnId, updatedAt: Date.now() } : t));
    });
  };

  const handleSaveTask = (task) => {
    setTasks((prev) => {
      const exists = prev.find((t) => t.id === task.id);
      if (exists) {
        return prev.map((t) => (t.id === task.id ? task : t));
      }
      onTaskCreate();
      return [...prev, task];
    });
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleUpdateTask = (updatedTask) => {
    setTasks((prev) => {
      const oldTask = prev.find((t) => t.id === updatedTask.id);
      // Track subtask completions for karma
      if (oldTask?.subtasks && updatedTask.subtasks) {
        const oldDone = oldTask.subtasks.filter((s) => s.done).length;
        const newDone = updatedTask.subtasks.filter((s) => s.done).length;
        if (newDone > oldDone) {
          onSubtaskComplete();
        }
      }
      return prev.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    });
  };

  // Duplicate task
  const handleDuplicate = (task) => {
    const newTask = {
      ...task,
      id: crypto.randomUUID(),
      title: task.title + ' (コピー)',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      subtasks: (task.subtasks || []).map((s) => ({ ...s, done: false })),
    };
    setTasks((prev) => [...prev, newTask]);
  };

  // Archive task
  const handleArchive = (taskId) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (task) {
        setArchivedTasks((archived) => [...archived, { ...task, archivedAt: Date.now() }]);
      }
      return prev.filter((t) => t.id !== taskId);
    });
  };

  // Archive all done tasks
  const handleArchiveAllDone = () => {
    setTasks((prev) => {
      const doneTasks = prev.filter((t) => t.column === 'done');
      if (doneTasks.length > 0) {
        setArchivedTasks((archived) => [
          ...archived,
          ...doneTasks.map((t) => ({ ...t, archivedAt: Date.now() })),
        ]);
      }
      return prev.filter((t) => t.column !== 'done');
    });
  };

  // Restore from archive
  const handleRestoreArchived = (taskId) => {
    setArchivedTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (task) {
        const { archivedAt, ...restored } = task;
        setTasks((tasks) => [...tasks, restored]);
      }
      return prev.filter((t) => t.id !== taskId);
    });
  };

  // Delete from archive
  const handleDeleteArchived = (taskId) => {
    setArchivedTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleDragStart = (event) => {
    dragging.current = true;
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
    if (task) {
      activeColumnRef.current = task.column;
    }
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;
    const overColumnId = over.data.current?.columnId || over.id;
    const currentColumn = activeColumnRef.current;
    if (currentColumn && overColumnId && currentColumn !== overColumnId) {
      activeColumnRef.current = overColumnId;
      setTasks((prev) =>
        prev.map((t) => (t.id === active.id ? { ...t, column: overColumnId } : t))
      );
    }
  };

  const handleDragEnd = (event) => {
    dragging.current = false;
    const { active, over } = event;
    const draggedTask = tasks.find((t) => t.id === active.id);

    // Check if task moved to done column for karma
    if (activeTask && activeTask.column !== 'done' && draggedTask?.column === 'done') {
      onTaskComplete();
    }

    setActiveTask(null);
    activeColumnRef.current = null;
    if (!over) return;
    const overColumnId = over.data.current?.columnId || over.id;
    const activeColumnId = draggedTask?.column;
    if (!activeColumnId || !overColumnId) return;
    if (active.id !== over.id && activeColumnId === overColumnId) {
      setTasks((prev) => {
        const columnTasks = prev.filter((t) => t.column === overColumnId);
        const otherTasks = prev.filter((t) => t.column !== overColumnId);
        const oldIndex = columnTasks.findIndex((t) => t.id === active.id);
        const newIndex = columnTasks.findIndex((t) => t.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return [...otherTasks, ...arrayMove(columnTasks, oldIndex, newIndex)];
      });
    }
  };

  // Mobile swipe — switches views (board/list/stats) instantly
  const viewSwipeStart = useRef(null);
  const viewSwipeDelta = useRef(0);
  const viewSwiping = useRef(false);

  const handleViewTouchStart = (e) => {
    if (modalOpen) return;
    viewSwipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    viewSwipeDelta.current = 0;
    viewSwiping.current = false;
  };

  const handleViewTouchMove = (e) => {
    if (!viewSwipeStart.current || modalOpen) return;
    const dx = e.touches[0].clientX - viewSwipeStart.current.x;
    const dy = e.touches[0].clientY - viewSwipeStart.current.y;
    if (!viewSwiping.current) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        viewSwiping.current = true;
      } else if (Math.abs(dy) > 10) {
        viewSwipeStart.current = null;
        return;
      }
    }
    if (viewSwiping.current) {
      viewSwipeDelta.current = dx;
    }
  };

  const handleViewTouchEnd = () => {
    if (viewSwiping.current && Math.abs(viewSwipeDelta.current) > 50) {
      const currentIdx = VIEW_MODES.indexOf(viewMode);
      if (viewSwipeDelta.current < 0 && currentIdx < VIEW_MODES.length - 1) {
        setViewMode(VIEW_MODES[currentIdx + 1]);
      } else if (viewSwipeDelta.current > 0 && currentIdx > 0) {
        setViewMode(VIEW_MODES[currentIdx - 1]);
      }
    }
    viewSwipeStart.current = null;
    viewSwipeDelta.current = 0;
    viewSwiping.current = false;
  };

  // Board-only column swipe (within board view)
  const handleBoardTouchStart = (e) => {
    if (modalOpen) return;
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchDelta.current = 0;
    swiping.current = false;
  };

  const handleBoardTouchMove = (e) => {
    if (!touchStart.current || modalOpen) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;
    if (!swiping.current) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        swiping.current = true;
      } else if (Math.abs(dy) > 10) {
        touchStart.current = null;
        return;
      }
    }
    if (swiping.current) {
      e.preventDefault();
      touchDelta.current = dx;
      setSwipeOffset(dx * 0.3);
    }
  };

  const handleBoardTouchEnd = () => {
    if (swiping.current && Math.abs(touchDelta.current) > 60) {
      if (touchDelta.current < 0 && activeColumnIndex < COLUMNS.length - 1) {
        setActiveColumnIndex((i) => i + 1);
      } else if (touchDelta.current > 0 && activeColumnIndex > 0) {
        setActiveColumnIndex((i) => i - 1);
      }
    }
    touchStart.current = null;
    touchDelta.current = 0;
    swiping.current = false;
    setSwipeOffset(0);
  };

  // Logo component
  const Logo = ({ size = 'md' }) => (
    <div className="flex items-center gap-2.5">
      <div className={`flex items-center justify-center rounded-xl bg-indigo-600 text-white ${
        size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
      }`}>
        <Kanban size={size === 'sm' ? 18 : 22} />
      </div>
      <div>
        <h1 className={`font-black tracking-tight text-gray-900 leading-none ${
          size === 'sm' ? 'text-base' : 'text-xl'
        }`}>
          My Kanban
        </h1>
        <p className={`font-semibold tracking-widest text-indigo-500 uppercase leading-none ${
          size === 'sm' ? 'text-[9px] mt-0.5' : 'text-[10px] mt-0.5'
        }`}>
          Personal Workspace
        </p>
      </div>
    </div>
  );

  // Sync button
  const SyncButton = ({ size = 18 }) => (
    <button
      onClick={() => setSyncPanelOpen(true)}
      className={`p-2 rounded-lg transition-colors ${
        sync.isConfigured
          ? 'text-indigo-500 hover:bg-indigo-50'
          : 'text-gray-400 hover:bg-gray-100'
      } ${sync.syncing ? 'animate-pulse' : ''}`}
      aria-label="同期設定"
    >
      {sync.isConfigured ? <Cloud size={size} /> : <CloudOff size={size} />}
    </button>
  );

  // Tab config
  const VIEW_TABS = [
    { id: 'board', label: 'ボード', desc: 'カンバン形式でタスクを管理', icon: LayoutGrid },
    { id: 'list', label: 'リスト', desc: '一覧でタスクを検索・ソート', icon: List },
    { id: 'stats', label: '統計', desc: 'ポイントと進捗を確認', icon: BarChart3 },
  ];

  // Tab buttons — card style (image reference)
  const ViewTabs = ({ className = '', compact = false }) => (
    <div className={`flex gap-2 ${className}`}>
      {VIEW_TABS.map((tab) => {
        const Icon = tab.icon;
        const active = viewMode === tab.id;
        if (compact) {
          return (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                active
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        }
        return (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id)}
            className={`flex-1 rounded-2xl p-4 text-left transition-all ${
              active
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-1">
              <div className={`p-1.5 rounded-lg ${active ? 'bg-white/20' : 'bg-gray-200'}`}>
                <Icon size={16} className={active ? 'text-white' : 'text-gray-400'} />
              </div>
              <span className={`text-sm font-bold ${active ? 'text-white' : 'text-gray-600'}`}>{tab.label}</span>
            </div>
            <p className={`text-[11px] leading-snug ml-[38px] ${active ? 'text-blue-100' : 'text-gray-400'}`}>{tab.desc}</p>
          </button>
        );
      })}
    </div>
  );

  // Bar indicator for mobile columns
  const ColumnBarIndicator = () => (
    <div className="flex items-center gap-1.5 px-6 py-2 shrink-0">
      {COLUMNS.map((c, i) => (
        <button
          key={c.id}
          onClick={() => setActiveColumnIndex(i)}
          className={`h-1 rounded-full transition-all duration-300 ${
            i === activeColumnIndex
              ? `flex-[2] ${c.color}`
              : 'flex-1 bg-gray-300'
          }`}
          aria-label={c.title}
        />
      ))}
    </div>
  );

  // Keyboard shortcuts help modal
  const ShortcutsModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowShortcuts(false)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-gray-800 mb-4">キーボードショートカット</h2>
        <div className="space-y-2">
          {[
            ['N', '新規タスク作成'],
            ['/', '検索にフォーカス'],
            ['1', 'ボード表示'],
            ['2', 'リスト表示'],
            ['3', '統計表示'],
            ['A', 'アーカイブを開く'],
            ['Esc', 'パネル / モーダルを閉じる'],
            ['?', 'ショートカット一覧'],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-center gap-3">
              <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 rounded-lg border text-gray-600 min-w-[32px] text-center">
                {key}
              </kbd>
              <span className="text-sm text-gray-600">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Done tasks count for archive button
  const doneTasksCount = tasks.filter((t) => t.column === 'done').length;

  const hasActiveFilters = searchQuery.trim() !== '' || selectedTags.length > 0;

  // Mobile view
  if (isMobile) {
    const col = COLUMNS[activeColumnIndex];
    return (
      <div className="flex flex-col h-dvh bg-slate-50 select-none">
        {/* Header — swipe here to switch views from any mode */}
        <header
          className="px-4 pt-3 pb-2 bg-white shadow-sm shrink-0"
          onTouchStart={handleViewTouchStart}
          onTouchMove={handleViewTouchMove}
          onTouchEnd={handleViewTouchEnd}
        >
          <div className="flex items-center justify-between">
            <Logo size="sm" />
            <div className="flex items-center gap-1">
              <button
                onClick={() => setArchivePanelOpen(true)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors relative"
                aria-label="アーカイブ"
              >
                <Archive size={18} />
                {archivedTasks.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[9px] font-bold bg-amber-500 text-white rounded-full flex items-center justify-center">
                    {archivedTasks.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setTagManagerOpen(true)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="タグ管理"
              >
                <Palette size={18} />
              </button>
              <SyncButton size={18} />
              <VoiceInput voice={voice} onAddTasks={handleVoiceTasks} size={18} />
              <button
                onClick={() => handleAddTask(viewMode === 'board' ? col.id : 'idea')}
                className="p-2 text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
                aria-label="タスク追加"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
          {/* Tabs under header */}
          <div className="mt-2">
            <ViewTabs compact />
          </div>
        </header>

        {viewMode === 'stats' ? (
          <div
            className="flex-1 min-h-0"
            onTouchStart={handleViewTouchStart}
            onTouchMove={handleViewTouchMove}
            onTouchEnd={handleViewTouchEnd}
          >
            <ErrorBoundary>
              <StatsView tasks={tasks} tags={tags} points={points} getLevel={getLevel} getDailyData={getDailyData} getWeeklyData={getWeeklyData} />
            </ErrorBoundary>
          </div>
        ) : viewMode === 'list' ? (
          <div
            className="flex-1 min-h-0"
            onTouchStart={handleViewTouchStart}
            onTouchMove={handleViewTouchMove}
            onTouchEnd={handleViewTouchEnd}
          >
            <ListView
              tasks={tasks}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onMoveTask={handleMoveTask}
              onDuplicate={handleDuplicate}
              tags={tags}
            />
          </div>
        ) : (
          <>
            {/* Board filter */}
            <BoardFilter
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              tags={tags}
              selectedTags={selectedTags}
              onToggleTag={handleToggleTag}
              searchInputRef={searchInputRef}
            />

            {/* Archive all done button */}
            {doneTasksCount > 0 && activeColumnIndex === 3 && (
              <div className="px-4 py-1 shrink-0">
                <button
                  onClick={handleArchiveAllDone}
                  className="text-[11px] text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg font-semibold hover:bg-amber-100 transition-colors"
                >
                  完了タスクを一括アーカイブ ({doneTasksCount})
                </button>
              </div>
            )}

            <div
              className="flex flex-col flex-1 min-h-0"
              onTouchStart={handleBoardTouchStart}
              onTouchMove={handleBoardTouchMove}
              onTouchEnd={handleBoardTouchEnd}
            >
              {/* Bar indicator */}
              <ColumnBarIndicator />

              {/* Column title with count */}
              <div className="flex items-center justify-center gap-2 pb-1 shrink-0">
                <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                <span className="text-sm font-bold tracking-wide text-gray-700">{col.title}</span>
                <span className="text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5 font-semibold">
                  {getColumnTasks(col.id).length}
                </span>
              </div>

              {/* Navigation + Column — no DnD on mobile */}
              <div className="flex items-center flex-1 min-h-0 px-1">
                <button
                  onClick={() => setActiveColumnIndex((i) => Math.max(0, i - 1))}
                  disabled={activeColumnIndex === 0}
                  className="p-1 text-gray-400 disabled:opacity-20 shrink-0"
                >
                  <ChevronLeft size={24} />
                </button>

                <div
                  className="flex-1 h-full min-h-0 transition-transform duration-200"
                  style={{ transform: `translateX(${swipeOffset}px)` }}
                >
                  <Column
                    column={col}
                    tasks={getColumnTasks(col.id)}
                    onAddTask={handleAddTask}
                    onEditTask={handleEditTask}
                    onDeleteTask={handleDeleteTask}
                    onMoveTask={handleMoveTask}
                    onUpdateTask={handleUpdateTask}
                    onDuplicate={handleDuplicate}
                    onArchive={handleArchive}
                    tags={tags}
                  />
                </div>

                <button
                  onClick={() => setActiveColumnIndex((i) => Math.min(COLUMNS.length - 1, i + 1))}
                  disabled={activeColumnIndex === COLUMNS.length - 1}
                  className="p-1 text-gray-400 disabled:opacity-20 shrink-0"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>
          </>
        )}

        <TaskModal
          isOpen={modalOpen}
          task={editingTask}
          defaultColumn={defaultColumn}
          tags={tags}
          onSave={handleSaveTask}
          onClose={() => { setModalOpen(false); setEditingTask(null); }}
        />
        {syncPanelOpen && (
          <SyncPanel sync={sync} onClose={() => setSyncPanelOpen(false)} />
        )}
        {tagManagerOpen && (
          <TagManager tags={tags} onUpdateTags={setTags} onClose={() => setTagManagerOpen(false)} />
        )}
        {archivePanelOpen && (
          <ArchivePanel
            archivedTasks={archivedTasks}
            onRestore={handleRestoreArchived}
            onDelete={handleDeleteArchived}
            onClose={() => setArchivePanelOpen(false)}
          />
        )}
        {showShortcuts && <ShortcutsModal />}
      </div>
    );
  }

  // Desktop view
  return (
    <div className="flex flex-col h-dvh bg-slate-100">
      {/* Header */}
      <header className="px-6 py-3 bg-white shadow-sm shrink-0 space-y-3">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Logo />
        </div>
        <div className="flex items-center gap-3">
          {doneTasksCount > 0 && viewMode === 'board' && (
            <button
              onClick={handleArchiveAllDone}
              className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg font-semibold hover:bg-amber-100 transition-colors"
            >
              完了を一括アーカイブ ({doneTasksCount})
            </button>
          )}
          <button
            onClick={() => setArchivePanelOpen(true)}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors relative"
            aria-label="アーカイブ"
          >
            <Archive size={20} />
            {archivedTasks.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[9px] font-bold bg-amber-500 text-white rounded-full flex items-center justify-center">
                {archivedTasks.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTagManagerOpen(true)}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="タグ管理"
          >
            <Palette size={20} />
          </button>
          <button
            onClick={() => setShowShortcuts((v) => !v)}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="ショートカット"
          >
            <HelpCircle size={20} />
          </button>
          <SyncButton size={20} />
          <VoiceInput voice={voice} onAddTasks={handleVoiceTasks} size={20} />
          <button
            onClick={() => handleAddTask('idea')}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            タスク追加
          </button>
        </div>
        </div>
        <ViewTabs />
      </header>

      {viewMode === 'stats' ? (
        <ErrorBoundary>
          <StatsView tasks={tasks} tags={tags} points={points} getLevel={getLevel} getDailyData={getDailyData} getWeeklyData={getWeeklyData} />
        </ErrorBoundary>
      ) : viewMode === 'list' ? (
        <div className="flex-1 min-h-0 bg-white mx-4 my-4 rounded-xl shadow-sm overflow-hidden">
          <ListView
            tasks={tasks}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onMoveTask={handleMoveTask}
            onDuplicate={handleDuplicate}
            tags={tags}
          />
        </div>
      ) : (
        <>
          {/* Board filter bar */}
          <BoardFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            tags={tags}
            selectedTags={selectedTags}
            onToggleTag={handleToggleTag}
            searchInputRef={searchInputRef}
          />

          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex-1 grid grid-cols-4 gap-4 p-4 min-h-0 overflow-hidden">
              {COLUMNS.map((col) => (
                <Column
                  key={col.id}
                  column={col}
                  tasks={getColumnTasks(col.id)}
                  onAddTask={handleAddTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onMoveTask={handleMoveTask}
                  onUpdateTask={handleUpdateTask}
                  onDuplicate={handleDuplicate}
                  onArchive={handleArchive}
                  tags={tags}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? (
                <div className="opacity-80">
                  <TaskCard task={activeTask} columnId={activeTask.column} onEdit={() => {}} onDelete={() => {}} tags={tags} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </>
      )}

      <TaskModal
        isOpen={modalOpen}
        task={editingTask}
        defaultColumn={defaultColumn}
        tags={tags}
        onSave={handleSaveTask}
        onClose={() => { setModalOpen(false); setEditingTask(null); }}
      />
      {syncPanelOpen && (
        <SyncPanel sync={sync} onClose={() => setSyncPanelOpen(false)} />
      )}
      {tagManagerOpen && (
        <TagManager tags={tags} onUpdateTags={setTags} onClose={() => setTagManagerOpen(false)} />
      )}
      {archivePanelOpen && (
        <ArchivePanel
          archivedTasks={archivedTasks}
          onRestore={handleRestoreArchived}
          onDelete={handleDeleteArchived}
          onClose={() => setArchivePanelOpen(false)}
        />
      )}
      {showShortcuts && <ShortcutsModal />}
    </div>
  );
}

export default App;
