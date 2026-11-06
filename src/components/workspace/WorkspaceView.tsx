import React, { useState } from 'react';
import { WorkspaceTask, WorkspaceStage, CreativeDiscipline } from '../../types';
import { 
  Plus, 
  ArrowRight,
  FolderKanban,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  Sparkles,
  X
} from 'lucide-react';
import { CREATIVE_DISCIPLINES } from '../../data/mockData';
import { useLanguage } from '../../i18n/LanguageContext';

interface WorkspaceViewProps {
  tasks: WorkspaceTask[];
  onUpdateTasks: (tasks: WorkspaceTask[]) => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({ tasks, onUpdateTasks }) => {
  const { t, language } = useLanguage();
  const [selectedDiscipline, setSelectedDiscipline] = useState<CreativeDiscipline | 'all'>('all');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [mobileActiveStage, setMobileActiveStage] = useState<WorkspaceStage>('production');

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDiscipline, setNewTaskDiscipline] = useState<CreativeDiscipline>('3d');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');

  const stages: { id: WorkspaceStage; label: string; desc: string }[] = [
    { 
      id: 'concept', 
      label: t.workspace.stageConcept, 
      desc: language === 'ru' ? 'Бриф, референсы и идея' : 'Brief, mood references & idea' 
    },
    { 
      id: 'exploration', 
      label: t.workspace.stageFormFinding, 
      desc: language === 'ru' ? 'Пробы геометрии и шейдеров' : 'Geometry iterations & shaders' 
    },
    { 
      id: 'production', 
      label: t.workspace.stageProduction, 
      desc: language === 'ru' ? 'Сборка WebGL и рендер' : 'WebGL staging & rendering' 
    },
    { 
      id: 'polishing', 
      label: t.workspace.stagePolishing, 
      desc: language === 'ru' ? 'Тюнинг света и глубины' : 'Lighting tuning & tactile depth' 
    },
    { 
      id: 'delivered', 
      label: t.workspace.stageDelivery, 
      desc: language === 'ru' ? 'Финальный релиз в архив' : 'Final studio release' 
    },
  ];

  const handleAdvanceStage = (taskId: string) => {
    const stageFlow: WorkspaceStage[] = ['concept', 'exploration', 'production', 'polishing', 'delivered'];
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const currentIdx = stageFlow.indexOf(t.stage);
        const nextStage = stageFlow[Math.min(stageFlow.length - 1, currentIdx + 1)];
        return { 
          ...t, 
          stage: nextStage, 
          progress: nextStage === 'delivered' ? 100 : Math.min(95, t.progress + 25) 
        };
      }
      return t;
    });
    onUpdateTasks(updated);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: WorkspaceTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      discipline: newTaskDiscipline,
      stage: 'concept',
      assignee: {
        name: language === 'ru' ? 'Елена Ростова' : 'Elena Rostova',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      },
      dueDate: '2026',
      priority: newTaskPriority,
      assetCount: 4,
      progress: 15,
      description: language === 'ru' ? 'Инициализирован новый спринт ателье.' : 'New studio production sprint initialized.',
    };

    onUpdateTasks([newTask, ...tasks]);
    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  const filteredTasks = selectedDiscipline === 'all'
    ? tasks
    : tasks.filter((t) => t.discipline === selectedDiscipline);

  const getPriorityColor = (p: string) => {
    if (p === 'urgent') return 'text-rose-400 font-bold';
    if (p === 'high') return 'text-amber-400 font-semibold';
    if (p === 'medium') return 'text-ultramarine font-semibold';
    return 'text-zinc-500';
  };

  return (
    <section 
      id="frantos-workspace-atelier"
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 select-none"
      aria-label="Atelier Workspace & Sprints"
    >
      {/* Masthead Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-ultramarine animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-wider text-ultramarine font-semibold">
              {t.workspace.badge}
            </span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-display font-extrabold tracking-tight text-[#121316] dark:text-[#F5F3EF]">
            {t.workspace.title}
          </h2>
          <p className="text-xs sm:text-sm text-[#52555F] dark:text-[#A3A099] max-w-xl mt-1">
            {t.workspace.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            id="btn-add-sprint-task"
            type="button"
            onClick={() => setIsAddingTask(true)}
            className="min-h-[44px] px-5 py-2.5 rounded-full text-xs font-mono font-semibold bg-ultramarine hover:bg-blue-600 text-white transition-all flex items-center gap-2 shadow-md shadow-ultramarine/25 cursor-pointer touch-target"
          >
            <Plus className="w-4 h-4" />
            <span>{t.workspace.addTask}</span>
          </button>
        </div>
      </div>

      {/* Task Creation Modal */}
      {isAddingTask && (
        <div className="mb-6 p-4 sm:p-6 rounded-3xl bg-white dark:bg-[#0E1015] border border-ultramarine/30 shadow-2xl animate-in zoom-in-95 duration-200 text-[#121316] dark:text-[#F5F3EF]">
          <div className="flex items-center justify-between pb-3 border-b border-black/8 dark:border-white/8 mb-4">
            <h3 className="font-display font-bold text-sm sm:text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-ultramarine" />
              <span>{t.workspace.modalTitle}</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsAddingTask(false)}
              className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center cursor-pointer text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateTask} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-mono text-[#52555F] dark:text-zinc-400 mb-1 font-semibold">
                {t.modals.projectTitle}
              </label>
              <input
                type="text"
                placeholder={t.workspace.taskTitlePlaceholder}
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#121316] dark:text-white placeholder-zinc-500 focus:outline-none focus:border-ultramarine"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#52555F] dark:text-zinc-400 mb-1 font-semibold">
                {t.modals.disciplineLabel}
              </label>
              <select
                value={newTaskDiscipline}
                onChange={(e) => setNewTaskDiscipline(e.target.value as CreativeDiscipline)}
                className="w-full px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#121316] dark:text-white focus:outline-none focus:border-ultramarine font-mono cursor-pointer"
              >
                {CREATIVE_DISCIPLINES.map((d) => (
                  <option key={d.id} value={d.id} className="bg-white dark:bg-zinc-900 text-[#121316] dark:text-white">{d.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#52555F] dark:text-zinc-400 mb-1 font-semibold">
                {language === 'ru' ? 'Приоритет' : 'Priority'}
              </label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#121316] dark:text-white focus:outline-none focus:border-ultramarine font-mono cursor-pointer"
              >
                <option value="low" className="bg-white dark:bg-zinc-900 text-[#121316] dark:text-white">{t.workspace.priorityLow}</option>
                <option value="medium" className="bg-white dark:bg-zinc-900 text-[#121316] dark:text-white">{t.workspace.priorityMedium}</option>
                <option value="high" className="bg-white dark:bg-zinc-900 text-[#121316] dark:text-white">{t.workspace.priorityHigh}</option>
                <option value="urgent" className="bg-white dark:bg-zinc-900 text-[#121316] dark:text-white">{language === 'ru' ? 'Срочно (Urgent)' : 'Urgent'}</option>
              </select>
            </div>

            <div className="sm:col-span-2 md:col-span-4 flex justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white cursor-pointer touch-target"
              >
                {t.workspace.cancel}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-ultramarine hover:bg-blue-600 text-white font-mono font-bold text-xs cursor-pointer shadow-sm touch-target"
              >
                {t.workspace.createTask}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MOBILE STAGE SEGMENTED CONTROLLER (< md screens) */}
      <div className="md:hidden mb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {stages.map((stg) => {
            const count = filteredTasks.filter((t) => t.stage === stg.id).length;
            const isActive = mobileActiveStage === stg.id;
            return (
              <button
                key={stg.id}
                type="button"
                onClick={() => setMobileActiveStage(stg.id)}
                className={`min-h-[44px] px-3.5 py-2 rounded-full text-xs font-mono whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer touch-target ${
                  isActive
                    ? 'bg-ultramarine text-white font-bold shadow-md shadow-ultramarine/25'
                    : 'bg-black/5 dark:bg-white/5 text-[#52555F] dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                <span>{stg.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isActive ? 'bg-white/20 text-white font-bold' : 'bg-black/10 dark:bg-white/10 text-zinc-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KANBAN BOARD CONTAINER (Responsive: 1 column on mobile, 5 cols on lg) */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
        {stages.map((stg) => {
          const stageTasks = filteredTasks.filter((t) => t.stage === stg.id);
          const isMobileVisible = mobileActiveStage === stg.id;

          return (
            <div
              key={stg.id}
              className={`rounded-3xl p-4 bg-white/90 dark:bg-[#0E1015]/90 border border-black/8 dark:border-white/8 flex flex-col justify-between min-h-[360px] md:min-h-[520px] shadow-sm ${
                isMobileVisible ? 'block' : 'hidden md:flex'
              }`}
            >
              {/* Column Header */}
              <div className="border-b border-black/8 dark:border-white/8 pb-3 mb-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#121316] dark:text-[#F5F3EF]">
                    {stg.label}
                  </h4>
                  <span className="w-5 h-5 rounded-full bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono flex items-center justify-center font-bold">
                    {stageTasks.length}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-[#848792] dark:text-[#6B6861] mt-0.5 truncate">
                  {stg.desc}
                </p>
              </div>

              {/* Tasks List */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
                {stageTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-[#F7F6F2] dark:bg-[#141720] border border-black/8 dark:border-white/8 shadow-xs hover:border-ultramarine/50 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full uppercase bg-ultramarine/15 text-ultramarine font-semibold">
                        {t.discipline}
                      </span>
                      <span className={`text-[10px] font-mono uppercase ${getPriorityColor(t.priority)}`}>
                        {t.priority}
                      </span>
                    </div>

                    <h5 className="font-display font-bold text-xs sm:text-sm text-[#121316] dark:text-[#F5F3EF] leading-snug">
                      {t.title}
                    </h5>

                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-[#848792] dark:text-zinc-400 mb-1">
                        <span>{language === 'ru' ? 'Прогресс спринта' : 'Sprint Progress'}</span>
                        <span className="font-semibold">{t.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/8 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-ultramarine rounded-full transition-all"
                          style={{ width: `${t.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Assignee & Advance Stage */}
                    <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <img
                          src={t.assignee.avatar}
                          alt={t.assignee.name}
                          className="w-5 h-5 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/20"
                        />
                        <span className="text-[10px] text-[#52555F] dark:text-zinc-400 truncate max-w-[80px]">
                          {t.assignee.name.split(' ')[0]}
                        </span>
                      </div>

                      {stg.id !== 'delivered' && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceStage(t.id)}
                          className="min-h-[40px] px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-ultramarine hover:text-white text-zinc-700 dark:text-zinc-200 text-[10px] font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer touch-target"
                          title={language === 'ru' ? 'Продвинуть задачу на следующий этап' : 'Advance task to next stage'}
                        >
                          <span>{language === 'ru' ? 'Далее' : 'Next'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {stageTasks.length === 0 && (
                  <div className="h-28 rounded-2xl border border-dashed border-black/10 dark:border-white/10 flex items-center justify-center text-[11px] font-mono text-[#848792] dark:text-[#6B6861] text-center p-3">
                    {t.workspace.noTasks}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
