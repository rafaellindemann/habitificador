import { useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'habit_week_app_state_v3';

const DEFAULT_STATE = {
  viewMode: 'week',
  anchorDate: isoToday(),
  editMode: false,
  showPending: true,
  showCompleted: true,
  selectedCategoryId: 'all',
  settingsOpen: false,
  taskModalOpen: false,
  editingTaskId: null,
  categories: [
    { id: 1, name: 'Estudo' },
    { id: 2, name: 'Fit' },
    { id: 3, name: 'Trabalho' },
  ],
  colors: [
    { id: 1, name: 'Vermelho', hex: '#ef4444' },
    { id: 2, name: 'Verde', hex: '#22c55e' },
    { id: 3, name: 'Azul', hex: '#3b82f6' },
    { id: 4, name: 'Amarelo', hex: '#eab308' },
    { id: 5, name: 'Roxo', hex: '#a855f7' },
  ],
  tasks: [
    {
      id: 1001,
      title: 'Academia',
      type: 'goal',
      period: 'week',
      target: 3,
      colorId: 2,
      categoryId: 2,
    },
    {
      id: 1002,
      title: 'Leitura técnica',
      type: 'goal',
      period: 'month',
      target: 12,
      colorId: 4,
      categoryId: 1,
    },
    {
      id: 1003,
      title: 'Aula React',
      type: 'weekly',
      daysOfWeek: [1, 3, 5],
      colorId: 3,
      categoryId: 1,
    },
    {
      id: 1004,
      title: 'Reunião cliente',
      type: 'one_off',
      date: addDaysISO(isoToday(), 2),
      colorId: 1,
      categoryId: 3,
    },
  ],
  completions: {},
};

const EMPTY_FORM = {
  title: '',
  type: 'weekly',
  date: isoToday(),
  daysOfWeek: [1],
  period: 'week',
  target: 1,
  colorId: 1,
  categoryId: 1,
};

function isoToday() {
  return toISODate(new Date());
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toISODate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addDaysISO(iso, days) {
  return toISODate(addDays(parseISODate(iso), days));
}

function startOfWeekSunday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function endOfWeekSunday(date) {
  return addDays(startOfWeekSunday(date), 6);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfYear(date) {
  return new Date(date.getFullYear(), 0, 1);
}

function endOfYear(date) {
  return new Date(date.getFullYear(), 11, 31);
}

function daysInMonth(date) {
  return endOfMonth(date).getDate();
}

function daysInYear(date) {
  const year = date.getFullYear();
  const leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
  return leap ? 366 : 365;
}

function getGoalBounds(period, anchorDate) {
  if (period == 'week') return [startOfWeekSunday(anchorDate), endOfWeekSunday(anchorDate)];
  if (period == 'month') return [startOfMonth(anchorDate), endOfMonth(anchorDate)];
  return [startOfYear(anchorDate), endOfYear(anchorDate)];
}

function inRange(date, start, end) {
  const t = parseISODate(toISODate(date)).getTime();
  return t >= parseISODate(toISODate(start)).getTime() && t <= parseISODate(toISODate(end)).getTime();
}

function getMaxTarget(period, anchorDate) {
  if (period == 'week') return 7;
  if (period == 'month') return daysInMonth(anchorDate);
  return daysInYear(anchorDate);
}

function sanitizeTarget(period, target, anchorDate) {
  const max = getMaxTarget(period, anchorDate);
  const n = Number(target) || 1;
  return Math.min(Math.max(1, n), max);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      categories: parsed.categories?.length ? parsed.categories : DEFAULT_STATE.categories,
      colors: parsed.colors?.length ? parsed.colors : DEFAULT_STATE.colors,
      tasks: parsed.tasks?.length ? parsed.tasks : DEFAULT_STATE.tasks,
      completions: parsed.completions || {},
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function getDayLabel(date) {
  return ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][date.getDay()];
}

function getShortPeriod(period) {
  if (period == 'week') return 's';
  if (period == 'month') return 'm';
  return 'a';
}

function countCompletions(taskId, start, end, completions) {
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const iso = toISODate(cursor);
    if (completions[iso]?.[taskId]) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function getTaskDoneOnDate(taskId, iso, completions) {
  return !!completions[iso]?.[taskId];
}

function taskAppliesToDate(task, date, anchorDate) {
  const iso = toISODate(date);

  if (task.type == 'one_off') return task.date == iso;
  if (task.type == 'weekly') return task.daysOfWeek.includes(date.getDay());

  const [start, end] = getGoalBounds(task.period, anchorDate);
  return inRange(date, start, end);
}

function getGoalStats(task, completions, anchorDate) {
  const [start, end] = getGoalBounds(task.period, anchorDate);
  const done = countCompletions(task.id, start, end, completions);
  return {
    done,
    target: task.target,
    completed: done >= task.target,
    label: `[${done}/${task.target}:${getShortPeriod(task.period)}]`,
  };
}

function getColorById(colors, colorId) {
  return colors.find((color) => color.id == colorId) || colors[0];
}

function getCategoryById(categories, categoryId) {
  return categories.find((category) => category.id == categoryId) || null;
}

function getInitialForm(state) {
  return {
    ...EMPTY_FORM,
    colorId: state.colors[0]?.id || 1,
    categoryId: state.categories[0]?.id || 1,
    target: 1,
  };
}

function buildMonthGrid(anchorDate) {
  const monthStart = startOfMonth(anchorDate);
  const gridStart = startOfWeekSunday(monthStart);
  const days = [];
  for (let i = 0; i < 42; i += 1) {
    days.push(addDays(gridStart, i));
  }
  return days;
}

function useFullscreen(containerRef) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  function toggle() {
    const node = containerRef.current;
    if (!node) return;

    if (!document.fullscreenElement) {
      node.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  return { isFullscreen, toggle };
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [taskForm, setTaskForm] = useState(getInitialForm(loadState()));
  const [colorForm, setColorForm] = useState({ name: '', hex: '#22c55e' });
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const shellRef = useRef(null);
  const { isFullscreen, toggle } = useFullscreen(shellRef);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const anchorDate = useMemo(() => parseISODate(state.anchorDate), [state.anchorDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfWeekSunday(anchorDate), index)), [anchorDate]);
  const monthDays = useMemo(() => buildMonthGrid(anchorDate), [anchorDate]);

  useEffect(() => {
    setTaskForm((prev) => ({
      ...prev,
      colorId: state.colors.some((c) => c.id == prev.colorId) ? prev.colorId : (state.colors[0]?.id || 1),
      categoryId: state.categories.some((c) => c.id == prev.categoryId) ? prev.categoryId : (state.categories[0]?.id || 1),
      target: sanitizeTarget(prev.period, prev.target, anchorDate),
    }));
  }, [state.colors, state.categories, anchorDate]);

  function patchState(partial) {
    setState((current) => ({ ...current, ...partial }));
  }

  function openNewTaskModal() {
    setTaskForm(getInitialForm(state));
    patchState({ taskModalOpen: true, editingTaskId: null });
  }

  function openEditTaskModal(task) {
    setTaskForm({
      title: task.title,
      type: task.type,
      date: task.date || state.anchorDate,
      daysOfWeek: task.daysOfWeek || [0],
      period: task.period || 'week',
      target: task.target || 1,
      colorId: task.colorId,
      categoryId: task.categoryId,
    });
    patchState({ taskModalOpen: true, editingTaskId: task.id });
  }

  function closeTaskModal() {
    patchState({ taskModalOpen: false, editingTaskId: null });
  }

  function toggleCompletion(task, iso) {
    setState((current) => {
      const day = { ...(current.completions[iso] || {}) };
      if (day[task.id]) {
        delete day[task.id];
      } else {
        day[task.id] = true;
      }
      const completions = { ...current.completions };
      if (Object.keys(day).length) completions[iso] = day;
      else delete completions[iso];
      return { ...current, completions };
    });
  }

  function handleTaskClick(task, iso) {
    if (state.editMode) {
      openEditTaskModal(task);
      return;
    }
    toggleCompletion(task, iso);
  }

  function handleTaskFormSubmit(event) {
    event.preventDefault();

    const trimmedTitle = taskForm.title.trim();
    if (!trimmedTitle) return;
    if (!state.categories.length || !state.colors.length) return;

    const normalized = {
      title: trimmedTitle,
      type: taskForm.type,
      colorId: Number(taskForm.colorId),
      categoryId: Number(taskForm.categoryId),
      ...(taskForm.type == 'one_off' ? { date: taskForm.date } : {}),
      ...(taskForm.type == 'weekly' ? { daysOfWeek: [...taskForm.daysOfWeek].sort((a, b) => a - b) } : {}),
      ...(taskForm.type == 'goal'
        ? {
            period: taskForm.period,
            target: sanitizeTarget(taskForm.period, taskForm.target, anchorDate),
          }
        : {}),
    };

    setState((current) => {
      const editingTaskId = current.editingTaskId;
      const tasks = editingTaskId
        ? current.tasks.map((task) => (task.id == editingTaskId ? { ...task, ...normalized } : task))
        : [...current.tasks, { id: Date.now(), ...normalized }];
      return {
        ...current,
        tasks,
        taskModalOpen: false,
        editingTaskId: null,
      };
    });
  }

  function deleteTask(taskId) {
    setState((current) => {
      const tasks = current.tasks.filter((task) => task.id != taskId);
      const completions = Object.fromEntries(
        Object.entries(current.completions)
          .map(([date, dayMap]) => [
            date,
            Object.fromEntries(Object.entries(dayMap).filter(([id]) => Number(id) != taskId)),
          ])
          .filter(([, dayMap]) => Object.keys(dayMap).length)
      );

      return {
        ...current,
        tasks,
        completions,
        taskModalOpen: current.editingTaskId == taskId ? false : current.taskModalOpen,
        editingTaskId: current.editingTaskId == taskId ? null : current.editingTaskId,
      };
    });
  }

  function addColor(event) {
    event.preventDefault();
    const name = colorForm.name.trim();
    const hex = colorForm.hex.trim();
    if (!name || !/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    setState((current) => ({
      ...current,
      colors: [...current.colors, { id: Date.now(), name, hex }],
    }));
    setColorForm({ name: '', hex: '#22c55e' });
  }

  function removeColor(colorId) {
    setState((current) => {
      if (current.colors.length <= 1) return current;
      const fallbackId = current.colors.find((color) => color.id != colorId)?.id;
      return {
        ...current,
        colors: current.colors.filter((color) => color.id != colorId),
        tasks: current.tasks.map((task) => ({
          ...task,
          colorId: task.colorId == colorId ? fallbackId : task.colorId,
        })),
      };
    });
  }

  function addCategory(event) {
    event.preventDefault();
    const name = categoryForm.name.trim();
    if (!name) return;
    setState((current) => ({
      ...current,
      categories: [...current.categories, { id: Date.now(), name }],
    }));
    setCategoryForm({ name: '' });
  }

  function removeCategory(categoryId) {
    setState((current) => {
      if (current.categories.length <= 1) return current;
      const fallbackId = current.categories.find((category) => category.id != categoryId)?.id;
      return {
        ...current,
        categories: current.categories.filter((category) => category.id != categoryId),
        tasks: current.tasks.map((task) => ({
          ...task,
          categoryId: task.categoryId == categoryId ? fallbackId : task.categoryId,
        })),
        selectedCategoryId: current.selectedCategoryId == String(categoryId) ? 'all' : current.selectedCategoryId,
      };
    });
  }

  function shiftPeriod(direction) {
    const base = parseISODate(state.anchorDate);
    let next;
    if (state.viewMode == 'week') next = addDays(base, direction * 7);
    else next = new Date(base.getFullYear(), base.getMonth() + direction, 1);
    patchState({ anchorDate: toISODate(next) });
  }

  function visibleTasksForDate(date) {
    const iso = toISODate(date);
    return state.tasks
      .filter((task) => taskAppliesToDate(task, date, anchorDate))
      .filter((task) => {
        if (state.selectedCategoryId == 'all') return true;
        return String(task.categoryId) == state.selectedCategoryId;
      })
      .filter((task) => {
        const doneToday = getTaskDoneOnDate(task.id, iso, state.completions);
        const goalCompleted = task.type == 'goal' ? getGoalStats(task, state.completions, anchorDate).completed : false;
        const isCompleted = doneToday || goalCompleted;
        if (!state.showCompleted && isCompleted) return false;
        if (!state.showPending && !isCompleted) return false;
        return true;
      })
      .sort((a, b) => {
        const order = { one_off: 1, weekly: 2, goal: 3 };
        return order[a.type] - order[b.type] || a.title.localeCompare(b.title, 'pt-BR');
      });
  }

  function renderTaskChip(task, date) {
    const iso = toISODate(date);
    const color = getColorById(state.colors, task.colorId);
    const category = getCategoryById(state.categories, task.categoryId);
    const doneToday = getTaskDoneOnDate(task.id, iso, state.completions);
    const goalStats = task.type == 'goal' ? getGoalStats(task, state.completions, anchorDate) : null;
    const goalCompleted = !!goalStats?.completed;

    return (
      <button
        key={`${iso}-${task.id}`}
        className={`taskChip ${doneToday ? 'doneDay' : ''} ${goalCompleted ? 'goalCompleted' : ''}`}
        onClick={() => handleTaskClick(task, iso)}
        style={{ '--task-color': color?.hex || '#3b82f6' }}
        title={state.editMode ? 'Editar tarefa' : 'Marcar/desmarcar'}
      >
        <span className="taskTopline">
          {task.type == 'goal' && <span className="goalBadge">{goalStats.label}</span>}
          {doneToday && <span className="doneMark">✓</span>}
          <span className="taskCategory">{category?.name || 'Sem categoria'}</span>
        </span>
        <span className="taskTitle">{task.title}</span>
      </button>
    );
  }

  const currentTitle =
    state.viewMode == 'week'
      ? `${toISODate(startOfWeekSunday(anchorDate))} → ${toISODate(endOfWeekSunday(anchorDate))}`
      : anchorDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className={`appShell ${isFullscreen ? 'isFullscreen' : ''}`} ref={shellRef}>
      <header className="topbar">
        <div>
          <h1>Habit Calendar</h1>
          <p>{currentTitle}</p>
        </div>

        <div className="toolbarGroup">
          <button onClick={() => shiftPeriod(-1)}>◀</button>
          <button onClick={() => patchState({ anchorDate: isoToday() })}>Hoje</button>
          <button onClick={() => shiftPeriod(1)}>▶</button>
          <button onClick={() => patchState({ viewMode: state.viewMode == 'week' ? 'month' : 'week' })}>
            {state.viewMode == 'week' ? 'Modo mês' : 'Modo semana'}
          </button>
          <button onClick={() => patchState({ editMode: !state.editMode })} className={state.editMode ? 'active' : ''}>
            {state.editMode ? 'Editando' : 'Modo edição'}
          </button>
          <button onClick={openNewTaskModal}>+ Nova tarefa</button>
          <button onClick={() => patchState({ settingsOpen: true })} aria-label="Configurações">⚙️</button>
          <button onClick={toggle}>{isFullscreen ? 'Sair tela cheia' : 'Tela cheia'}</button>
        </div>
      </header>

      <section className="filtersBar">
        <label className="checkItem">
          <input
            type="checkbox"
            checked={state.showPending}
            onChange={(event) => patchState({ showPending: event.target.checked })}
          />
          Mostrar pendentes
        </label>

        <label className="checkItem">
          <input
            type="checkbox"
            checked={state.showCompleted}
            onChange={(event) => patchState({ showCompleted: event.target.checked })}
          />
          Mostrar concluídos
        </label>

        <label className="selectWrap">
          Categoria
          <select
            value={state.selectedCategoryId}
            onChange={(event) => patchState({ selectedCategoryId: event.target.value })}
          >
            <option value="all">Todas</option>
            {state.categories.map((category) => (
              <option key={category.id} value={String(category.id)}>{category.name}</option>
            ))}
          </select>
        </label>
      </section>

      {state.viewMode == 'week' ? (
        <section className="calendarGrid weekView">
          {weekDays.map((date) => {
            const iso = toISODate(date);
            const items = visibleTasksForDate(date);
            return (
              <div className="dayCell" key={iso}>
                <div className="dayHeader">
                  <strong>{getDayLabel(date)}</strong>
                  <span>{date.getDate()}/{date.getMonth() + 1}</span>
                </div>
                <div className="dayItems">
                  {items.length ? items.map((task) => renderTaskChip(task, date)) : <span className="emptyState">—</span>}
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <section className="monthBoard">
          <div className="monthHead">
            {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((label) => (
              <div key={label} className="monthHeadCell">{label}</div>
            ))}
          </div>
          <div className="calendarGrid monthView">
            {monthDays.map((date) => {
              const iso = toISODate(date);
              const outside = date.getMonth() != anchorDate.getMonth();
              const items = visibleTasksForDate(date);
              return (
                <div className={`dayCell monthCell ${outside ? 'outsideMonth' : ''}`} key={iso}>
                  <div className="dayHeader monthDayHeader">
                    <strong>{date.getDate()}</strong>
                    <span>{getDayLabel(date)}</span>
                  </div>
                  <div className="dayItems compactItems">
                    {items.length ? items.map((task) => renderTaskChip(task, date)) : <span className="emptyState">—</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {state.taskModalOpen && (
        <div className="modalBackdrop" onClick={closeTaskModal}>
          <div className="modalCard" onClick={(event) => event.stopPropagation()}>
            <div className="modalHeader">
              <h2>{state.editingTaskId ? 'Editar tarefa' : 'Nova tarefa'}</h2>
              <button onClick={closeTaskModal}>✕</button>
            </div>

            <form className="formGrid" onSubmit={handleTaskFormSubmit}>
              <label>
                Título
                <input
                  value={taskForm.title}
                  onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Ex: Academia"
                />
              </label>

              <label>
                Tipo
                <select
                  value={taskForm.type}
                  onChange={(event) => setTaskForm((prev) => ({ ...prev, type: event.target.value }))}
                >
                  <option value="one_off">Pontual</option>
                  <option value="weekly">Recorrente semanal</option>
                  <option value="goal">Meta por período</option>
                </select>
              </label>

              {taskForm.type == 'one_off' && (
                <label>
                  Data
                  <input
                    type="date"
                    value={taskForm.date}
                    onChange={(event) => setTaskForm((prev) => ({ ...prev, date: event.target.value }))}
                  />
                </label>
              )}

              {taskForm.type == 'weekly' && (
                <div className="weekdaySelector">
                  <span>Dias da semana</span>
                  <div className="weekdayButtons">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((label, index) => {
                      const active = taskForm.daysOfWeek.includes(index);
                      return (
                        <button
                          key={`${label}-${index}`}
                          type="button"
                          className={active ? 'weekdayActive' : ''}
                          onClick={() => {
                            setTaskForm((prev) => {
                              const exists = prev.daysOfWeek.includes(index);
                              const daysOfWeek = exists
                                ? prev.daysOfWeek.filter((day) => day != index)
                                : [...prev.daysOfWeek, index];
                              return { ...prev, daysOfWeek: daysOfWeek.length ? daysOfWeek : [index] };
                            });
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {taskForm.type == 'goal' && (
                <>
                  <label>
                    Período
                    <select
                      value={taskForm.period}
                      onChange={(event) => {
                        const period = event.target.value;
                        setTaskForm((prev) => ({
                          ...prev,
                          period,
                          target: sanitizeTarget(period, prev.target, anchorDate),
                        }));
                      }}
                    >
                      <option value="week">Semanal</option>
                      <option value="month">Mensal</option>
                      <option value="year">Anual</option>
                    </select>
                  </label>

                  <label>
                    Meta
                    <input
                      type="number"
                      min="1"
                      max={getMaxTarget(taskForm.period, anchorDate)}
                      value={taskForm.target}
                      onChange={(event) => {
                        const value = sanitizeTarget(taskForm.period, event.target.value, anchorDate);
                        setTaskForm((prev) => ({ ...prev, target: value }));
                      }}
                    />
                    <small>Máximo atual: {getMaxTarget(taskForm.period, anchorDate)}</small>
                  </label>
                </>
              )}

              <label>
                Categoria
                <select
                  value={taskForm.categoryId}
                  onChange={(event) => setTaskForm((prev) => ({ ...prev, categoryId: Number(event.target.value) }))}
                >
                  {state.categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Cor
                <select
                  value={taskForm.colorId}
                  onChange={(event) => setTaskForm((prev) => ({ ...prev, colorId: Number(event.target.value) }))}
                >
                  {state.colors.map((color) => (
                    <option key={color.id} value={color.id}>{color.name}</option>
                  ))}
                </select>
              </label>

              <div className="formActions">
                {state.editingTaskId && (
                  <button type="button" className="danger" onClick={() => deleteTask(state.editingTaskId)}>
                    Excluir
                  </button>
                )}
                <button type="submit">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {state.settingsOpen && (
        <div className="modalBackdrop" onClick={() => patchState({ settingsOpen: false })}>
          <div className="modalCard settingsCard" onClick={(event) => event.stopPropagation()}>
            <div className="modalHeader">
              <h2>Configurações</h2>
              <button onClick={() => patchState({ settingsOpen: false })}>✕</button>
            </div>

            <div className="settingsGrid">
              <section>
                <h3>Cores</h3>
                <form className="inlineForm" onSubmit={addColor}>
                  <input
                    value={colorForm.name}
                    onChange={(event) => setColorForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Nome"
                  />
                  <input
                    type="color"
                    value={colorForm.hex}
                    onChange={(event) => setColorForm((prev) => ({ ...prev, hex: event.target.value }))}
                  />
                  <button type="submit">Adicionar</button>
                </form>
                <div className="listBox">
                  {state.colors.map((color) => (
                    <div className="listRow" key={color.id}>
                      <span className="colorSwatch" style={{ backgroundColor: color.hex }} />
                      <span>{color.name}</span>
                      <code>{color.hex}</code>
                      <button type="button" onClick={() => removeColor(color.id)}>Remover</button>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3>Categorias</h3>
                <form className="inlineForm" onSubmit={addCategory}>
                  <input
                    value={categoryForm.name}
                    onChange={(event) => setCategoryForm({ name: event.target.value })}
                    placeholder="Nome da categoria"
                  />
                  <button type="submit">Adicionar</button>
                </form>
                <div className="listBox">
                  {state.categories.map((category) => (
                    <div className="listRow" key={category.id}>
                      <span>{category.name}</span>
                      <button type="button" onClick={() => removeCategory(category.id)}>Remover</button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
