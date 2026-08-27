import React, { useState } from 'react';
import { WorkspaceTask, WorkspaceStage, CreativeDiscipline } from '../../types';
import { 
  Plus, 
  ArrowRight
} from 'lucide-react';
import { CREATIVE_DISCIPLINES } from '../../data/mockData';

interface WorkspaceViewProps {
  tasks: WorkspaceTask[];
  onUpdateTasks: (tasks: WorkspaceTask[]) => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({ tasks, onUpdateTasks }) => {
  const [selectedDiscipline] = useState<CreativeDiscipline | 'all'>('all');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDiscipline, setNewTaskDiscipline] = useState<CreativeDiscipline>('3d');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');

  const stages: { id: WorkspaceStage; label: string; desc: string }[] = [
    { id: 'concept', label: 'Concept & Brief', desc: 'Ideation & Spatial Studies' },
    { id: 'exploration', label: 'Exploration', desc: 'Material & Geometry Tests' },
    { id: 'production', label: 'In Production', desc: 'WebGL Shader & Render Pipeline' },
    { id: 'polishing', label: 'Polishing', desc: 'Depth Tuning & Lighting' },
    { id: 'delivered', label: 'Archived / Delivered', desc: 'Shipped to Exhibit Stream' },
  ];

  const handleAdvanceStage = (taskId: string) => {
    const stageFlow: WorkspaceStage[] = ['concept', 'exploration', 'production', 'polishing', 'delivered'];
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const currentIdx = stageFlow.indexOf(t.stage);
        const nextStage = stageFlow[Math.min(stageFlow.length - 1, currentIdx + 1)];
        return { ...t, stage: nextStage, progress: nextStage === 'delivered' ? 100 : Math.min(95, t.progress + 25) };
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
        name: 'Elena Rostova',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      },
      dueDate: 'Sep 24, 2026',
      priority: newTaskPriority,
      assetCount: 4,
      progress: 10,
      description: 'Newly initialized spatial sprint artifact.',
    };

    onUpdateTasks([newTask, ...tasks]);
    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  const filteredTasks = selectedDiscipline === 'all'
    ? tasks
    : tasks.filter((t) => t.discipline === selectedDiscipline);

  return (
    <section 
      id="frantos-workspace-section"
      className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 animate-in fade-in duration-300"
      aria-label="FrantoS Private Studio Workspace"
    >
      {/* Studio Header & Telemetry */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
              Studio Environment // Sprint 08
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-[#111317] dark:text-[#F3F1EC]">
            PRIVATE STUDIO WORKSPACE
          </h2>
          <p className="text-xs sm:text-sm text-[#4A505C] dark:text-[#A0A6B2] max-w-xl mt-1">
            Manage live creative sprints, material pipelines, 3D shader benchmarks, and client deliveries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-add-sprint-task"
            onClick={() => setIsAddingTask(true)}
            className="px-4 py-2.5 rounded-full text-xs font-mono font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition-all flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Sprint Task</span>
          </button>
        </div>
      </div>

      {/* Task Creation Modal / Popover */}
      {isAddingTask && (
        <div className="mb-8 p-6 rounded-3xl bg-white dark:bg-[#11141A] border border-cyan-500/40 shadow-2xl animate-in zoom-in-95 duration-200 text-[#111317] dark:text-white">
          <h3 className="font-display font-bold text-base text-[#111317] dark:text-white mb-4">
            Initialize Studio Sprint Task
          </h3>
          <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-mono text-[#4A505C] dark:text-zinc-400 mb-1 font-semibold">Task Title</label>
              <input
                type="text"
                placeholder="e.g. Volumetric Caustics Shader v2.4..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#4A505C] dark:text-zinc-400 mb-1 font-semibold">Discipline</label>
              <select
                value={newTaskDiscipline}
                onChange={(e) => setNewTaskDiscipline(e.target.value as CreativeDiscipline)}
                className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white focus:outline-none focus:border-cyan-500"
              >
                {CREATIVE_DISCIPLINES.map((d) => (
                  <option key={d.id} value={d.id} className="bg-white dark:bg-zinc-900 text-[#111317] dark:text-white">{d.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#4A505C] dark:text-zinc-400 mb-1 font-semibold">Priority</label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')}
                className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="low" className="bg-white dark:bg-zinc-900 text-[#111317] dark:text-white">Low (Exploratory)</option>
                <option value="medium" className="bg-white dark:bg-zinc-900 text-[#111317] dark:text-white">Medium (Sprint Target)</option>
                <option value="high" className="bg-white dark:bg-zinc-900 text-[#111317] dark:text-white">High (Key Milestone)</option>
                <option value="urgent" className="bg-white dark:bg-zinc-900 text-[#111317] dark:text-white">Urgent (Release Blocker)</option>
              </select>
            </div>

            <div className="md:col-span-4 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="px-4 py-2 rounded-xl text-xs text-[#4A505C] dark:text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs cursor-pointer shadow-sm"
              >
                Add to Sprint
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Kanban Pipeline Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-6">
        {stages.map((stg) => {
          const stageTasks = filteredTasks.filter((t) => t.stage === stg.id);
          return (
            <div
              key={stg.id}
              className="rounded-3xl p-4 bg-[#EFECE6] dark:bg-[#0D1016]/80 border border-black/10 dark:border-white/10 flex flex-col justify-between min-h-[500px]"
            >
              {/* Column Header */}
              <div className="border-b border-black/10 dark:border-white/10 pb-3 mb-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#111317] dark:text-[#F3F1EC]">
                    {stg.label}
                  </h4>
                  <span className="w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 text-zinc-900 dark:text-zinc-300 text-[10px] font-mono flex items-center justify-center font-bold">
                    {stageTasks.length}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-[#4A505C] dark:text-zinc-400 mt-0.5 truncate">
                  {stg.desc}
                </p>
              </div>

              {/* Tasks List */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {stageTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 shadow-md hover:border-cyan-500/50 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full uppercase bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 font-semibold">
                        {t.discipline}
                      </span>
                      <span className={`text-[9px] font-mono uppercase font-bold ${
                        t.priority === 'urgent' ? 'text-rose-600 dark:text-rose-400' : t.priority === 'high' ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500 dark:text-zinc-400'
                      }`}>
                        {t.priority}
                      </span>
                    </div>

                    <h5 className="font-display font-semibold text-xs text-[#111317] dark:text-[#F3F1EC] leading-tight">
                      {t.title}
                    </h5>

                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-[#4A505C] dark:text-zinc-400 mb-1">
                        <span>Sprint Completion</span>
                        <span>{t.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-rose-500 rounded-full"
                          style={{ width: `${t.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Assignee & Advance Button */}
                    <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <img
                          src={t.assignee.avatar}
                          alt={t.assignee.name}
                          className="w-5 h-5 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/20"
                        />
                        <span className="text-[10px] text-[#4A505C] dark:text-zinc-400 truncate max-w-[80px]">
                          {t.assignee.name.split(' ')[0]}
                        </span>
                      </div>

                      {stg.id !== 'delivered' && (
                        <button
                          onClick={() => handleAdvanceStage(t.id)}
                          className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-cyan-500/20 text-zinc-700 dark:text-zinc-400 hover:text-cyan-700 dark:hover:text-cyan-300 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                          title="Advance stage"
                        >
                          <span>Advance</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {stageTasks.length === 0 && (
                  <div className="h-32 rounded-2xl border border-dashed border-black/15 dark:border-white/10 flex items-center justify-center text-[11px] font-mono text-[#4A505C] dark:text-zinc-500 text-center p-4">
                    No active sprint items in this stage
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
