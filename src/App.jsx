import { useState, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { ChevronLeft, ChevronRight, Plus, LayoutGrid, List } from 'lucide-react';
import Column from './components/Column';
import TaskCard from './components/TaskCard';
import TaskModal from './components/TaskModal';
import ListView from './components/ListView';
import { useLocalStorage } from './hooks/useLocalStorage';
import { COLUMNS } from './constants';

function App() {
  const [tasks, setTasks] = useLocalStorage('kanban-tasks', []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [defaultColumn, setDefaultColumn] = useState('idea');
  const [activeColumnIndex, setActiveColumnIndex] = useState(0);
  const [activeTask, setActiveTask] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState('board'); // 'board' | 'list'

  // Swipe state
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const getColumnTasks = useCallback(
    (columnId) => tasks.filter((t) => t.column === columnId),
    [tasks]
  );

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
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, column: newColumnId, updatedAt: Date.now() } : t))
    );
  };

  const handleSaveTask = (task) => {
    setTasks((prev) => {
      const exists = prev.find((t) => t.id === task.id);
      if (exists) {
        return prev.map((t) => (t.id === task.id ? task : t));
      }
      return [...prev, task];
    });
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleDragStart = (event) => {
    dragging.current = true;
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overColumnId = over.data.current?.columnId || over.id;
    const activeColumnId = activeData?.columnId;

    if (activeColumnId && overColumnId && activeColumnId !== overColumnId) {
      setTasks((prev) =>
        prev.map((t) => (t.id === active.id ? { ...t, column: overColumnId } : t))
      );
    }
  };

  const handleDragEnd = (event) => {
    dragging.current = false;
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeColumnId = active.data.current?.columnId;
    const overColumnId = over.data.current?.columnId || over.id;

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

  // Mobile swipe handlers
  const handleTouchStart = (e) => {
    if (modalOpen || dragging.current) return;
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchDelta.current = 0;
    swiping.current = false;
  };

  const handleTouchMove = (e) => {
    if (!touchStart.current || modalOpen || dragging.current) return;
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

  const handleTouchEnd = () => {
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

  // Tab buttons component
  const ViewTabs = ({ className = '' }) => (
    <div className={`flex bg-gray-200 rounded-lg p-0.5 ${className}`}>
      <button
        onClick={() => setViewMode('board')}
        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
          viewMode === 'board' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <LayoutGrid size={14} />
        ボード
      </button>
      <button
        onClick={() => setViewMode('list')}
        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
          viewMode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <List size={14} />
        リスト
      </button>
    </div>
  );

  // Mobile view
  if (isMobile) {
    const col = COLUMNS[activeColumnIndex];
    return (
      <div className="flex flex-col h-dvh bg-slate-100 select-none">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <LayoutGrid size={20} className="text-blue-500" />
            <h1 className="text-lg font-bold text-gray-800">Kanban</h1>
          </div>
          <div className="flex items-center gap-2">
            <ViewTabs />
            <button
              onClick={() => handleAddTask(viewMode === 'board' ? col.id : 'idea')}
              className="p-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600"
              aria-label="タスク追加"
            >
              <Plus size={20} />
            </button>
          </div>
        </header>

        {viewMode === 'list' ? (
          <ListView
            tasks={tasks}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onMoveTask={handleMoveTask}
          />
        ) : (
          <div
            className="flex flex-col flex-1 min-h-0"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Column dots indicator */}
            <div className="flex items-center justify-center gap-2 py-2 shrink-0">
              {COLUMNS.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setActiveColumnIndex(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === activeColumnIndex ? c.color : 'bg-gray-300'
                  }`}
                  aria-label={c.title}
                />
              ))}
            </div>

            {/* Navigation + Column */}
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                >
                  <Column
                    column={col}
                    tasks={getColumnTasks(col.id)}
                    onAddTask={handleAddTask}
                    onEditTask={handleEditTask}
                    onDeleteTask={handleDeleteTask}
                    onMoveTask={handleMoveTask}
                  />
                  <DragOverlay>
                    {activeTask ? (
                      <div className="opacity-80">
                        <TaskCard task={activeTask} columnId={activeTask.column} onEdit={() => {}} onDelete={() => {}} />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>

              <button
                onClick={() => setActiveColumnIndex((i) => Math.min(COLUMNS.length - 1, i + 1))}
                disabled={activeColumnIndex === COLUMNS.length - 1}
                className="p-1 text-gray-400 disabled:opacity-20 shrink-0"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Column name */}
            <div className="text-center py-2 text-sm font-medium text-gray-500 shrink-0">
              {col.title}
            </div>
          </div>
        )}

        <TaskModal
          isOpen={modalOpen}
          task={editingTask}
          defaultColumn={defaultColumn}
          onSave={handleSaveTask}
          onClose={() => { setModalOpen(false); setEditingTask(null); }}
        />
      </div>
    );
  }

  // Desktop view
  return (
    <div className="flex flex-col h-dvh bg-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <LayoutGrid size={24} className="text-blue-500" />
          <h1 className="text-xl font-bold text-gray-800">Kanban Board</h1>
          <ViewTabs className="ml-4" />
        </div>
        <button
          onClick={() => handleAddTask('idea')}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600"
        >
          <Plus size={16} />
          タスク追加
        </button>
      </header>

      {viewMode === 'list' ? (
        <div className="flex-1 min-h-0 bg-white mx-4 my-4 rounded-xl shadow-sm overflow-hidden">
          <ListView
            tasks={tasks}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onMoveTask={handleMoveTask}
          />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
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
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? (
              <div className="opacity-80">
                <TaskCard task={activeTask} columnId={activeTask.column} onEdit={() => {}} onDelete={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <TaskModal
        isOpen={modalOpen}
        task={editingTask}
        defaultColumn={defaultColumn}
        onSave={handleSaveTask}
        onClose={() => { setModalOpen(false); setEditingTask(null); }}
      />
    </div>
  );
}

export default App;
