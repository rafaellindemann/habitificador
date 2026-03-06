import { useEffect, useMemo, useState } from "react";

const DEFAULT_TASKS = [
  {
    id: "aula-react",
    type: "weekly",
    title: "Aula React",
    daysOfWeek: [1, 3, 5],
    color: "green",
  },
  {
    id: "aula-node",
    type: "weekly",
    title: "Aula Node",
    daysOfWeek: [2],
    color: "green",
  },
  {
    id: "dentista",
    type: "one_off",
    title: "Dentista",
    date: "2026-03-06",
    color: "red",
  },
  {
    id: "academia",
    type: "goal",
    title: "Academia",
    period: "week",
    target: 3,
    shorthand: "s",
    color: "yellow",
  },
  {
    id: "bike",
    type: "goal",
    title: "Andar de bike",
    period: "month",
    target: 10,
    shorthand: "m",
    color: "blue",
  },
];

const LS_KEY_COMPLETIONS = "habit_week__completions_v2";
const LS_KEY_ANCHOR = "habit_week__anchorDate_v2";
const LS_KEY_EDIT_MODE = "habit_week__editMode_v2";
const LS_KEY_FILTERS = "habit_week__filters_v2";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toISODate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function startOfWeekSunday(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
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

function normalizeDate(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a, b) {
  return toISODate(a) === toISODate(b);
}

function isDateBetween(date, start, end) {
  const t = normalizeDate(date).getTime();
  const s = normalizeDate(start).getTime();
  const e = normalizeDate(end).getTime();
  return t >= s && t <= e;
}

function getPeriodBounds(period, anchorDate) {
  if (period == "week") {
    const start = startOfWeekSunday(anchorDate);
    return [start, addDays(start, 6)];
  }

  if (period == "month") {
    return [startOfMonth(anchorDate), endOfMonth(anchorDate)];
  }

  return [startOfYear(anchorDate), endOfYear(anchorDate)];
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function weekdayLabelPT(date) {
  const labels = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  return labels[date.getDay()];
}

function formatDayHeader(date) {
  return `${weekdayLabelPT(date)} ${date.getDate()}/${date.getMonth() + 1}`;
}

function countCompletionsInRange(completions, taskId, start, end) {
  let count = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    const iso = toISODate(cursor);
    if (completions?.[iso]?.[taskId]) count++;
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

function getGoalProgress(task, completions, anchorDate) {
  const [start, end] = getPeriodBounds(task.period, anchorDate);
  const done = countCompletionsInRange(completions, task.id, start, end);
  return {
    done,
    target: task.target,
    completed: done >= task.target,
  };
}

function getGoalLabel(task, completions, anchorDate) {
  const progress = getGoalProgress(task, completions, anchorDate);
  const suffix = task.shorthand || (task.period == "week" ? "s" : task.period == "month" ? "m" : "a");
  return `[${progress.done}/${progress.target}:${suffix}]`;
}

function taskAppliesToDate(task, date, anchorDate) {
  if (task.type == "one_off") {
    return task.date == toISODate(date);
  }

  if (task.type == "weekly") {
    return task.daysOfWeek.includes(date.getDay());
  }

  if (task.type == "goal") {
    const [start, end] = getPeriodBounds(task.period, anchorDate);
    return isDateBetween(date, start, end);
  }

  return false;
}

function getTaskSortWeight(task) {
  if (task.type == "one_off") return 1;
  if (task.type == "weekly") return 2;
  return 3;
}

function getTaskSubtitle(task) {
  if (task.type == "one_off") return "pontual";
  if (task.type == "weekly") return "recorrente";
  if (task.period == "week") return "meta semanal";
  if (task.period == "month") return "meta mensal";
  return "meta anual";
}

function createEmptyDraft() {
  return {
    id: "",
    title: "",
    type: "weekly",
    color: "green",
    date: toISODate(new Date()),
    daysOfWeek: [1],
    period: "week",
    target: 3,
    shorthand: "s",
  };
}

function buildDraftFromTask(task) {
  return {
    id: task.id,
    title: task.title,
    type: task.type,
    color: task.color || "green",
    date: task.date || toISODate(new Date()),
    daysOfWeek: task.daysOfWeek || [1],
    period: task.period || "week",
    target: task.target || 1,
    shorthand: task.shorthand || (task.period == "month" ? "m" : task.period == "year" ? "a" : "s"),
  };
}

function buildTaskFromDraft(draft, originalId) {
  const base = {
    id: draft.id.trim() || originalId || crypto.randomUUID(),
    title: draft.title.trim() || "Sem título",
    type: draft.type,
    color: draft.color,
  };

  if (draft.type == "one_off") {
    return {
      ...base,
      date: draft.date,
    };
  }

  if (draft.type == "weekly") {
    return {
      ...base,
      daysOfWeek: draft.daysOfWeek.sort((a, b) => a - b),
    };
  }

  return {
    ...base,
    period: draft.period,
    target: Math.max(1, Number(draft.target) || 1),
    shorthand: draft.shorthand || (draft.period == "month" ? "m" : draft.period == "year" ? "a" : "s"),
  };
}

export default function App() {
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [completions, setCompletions] = useState(() => loadJSON(LS_KEY_COMPLETIONS, {}));
  const [anchorDate, setAnchorDate] = useState(() => {
    const saved = localStorage.getItem(LS_KEY_ANCHOR);
    return saved ? parseISODate(saved) : new Date();
  });
  const [editMode, setEditMode] = useState(() => loadJSON(LS_KEY_EDIT_MODE, false));
  const [filters, setFilters] = useState(() =>
    loadJSON(LS_KEY_FILTERS, {
      showPending: true,
      showCompleted: true,
    })
  );
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [draft, setDraft] = useState(createEmptyDraft());

  useEffect(() => {
    saveJSON(LS_KEY_COMPLETIONS, completions);
  }, [completions]);

  useEffect(() => {
    localStorage.setItem(LS_KEY_ANCHOR, toISODate(anchorDate));
  }, [anchorDate]);

  useEffect(() => {
    saveJSON(LS_KEY_EDIT_MODE, editMode);
  }, [editMode]);

  useEffect(() => {
    saveJSON(LS_KEY_FILTERS, filters);
  }, [filters]);

  const weekStart = useMemo(() => startOfWeekSunday(anchorDate), [anchorDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);

  function isDone(dateISO, taskId) {
    return !!completions?.[dateISO]?.[taskId];
  }

  function toggleDone(dateISO, task) {
    setCompletions((prev) => {
      const next = { ...prev };
      const day = { ...(next[dateISO] || {}) };
      const progress = task.type == "goal" ? getGoalProgress(task, prev, anchorDate) : null;
      const alreadyDone = !!day[task.id];

      if (alreadyDone) {
        delete day[task.id];
      } else {
        if (task.type == "goal" && progress.completed) {
          return prev;
        }
        day[task.id] = true;
      }

      if (Object.keys(day).length == 0) delete next[dateISO];
      else next[dateISO] = day;

      return next;
    });
  }

  function openCreate() {
    setEditingTaskId("__new__");
    setDraft(createEmptyDraft());
    setEditMode(true);
  }

  function openEdit(task) {
    setEditingTaskId(task.id);
    setDraft(buildDraftFromTask(task));
  }

  function closeEditor() {
    setEditingTaskId(null);
    setDraft(createEmptyDraft());
  }

  function saveTask() {
    const newTask = buildTaskFromDraft(draft, editingTaskId == "__new__" ? undefined : editingTaskId);

    setTasks((prev) => {
      const exists = prev.some((task) => task.id == editingTaskId && editingTaskId != "__new__");

      if (exists) {
        return prev.map((task) => (task.id == editingTaskId ? newTask : task));
      }

      return [...prev, newTask];
    });

    if (editingTaskId && editingTaskId != "__new__" && editingTaskId != newTask.id) {
      setCompletions((prev) => {
        const next = {};

        for (const dateISO of Object.keys(prev)) {
          const day = { ...prev[dateISO] };
          if (day[editingTaskId]) {
            day[newTask.id] = day[editingTaskId];
            delete day[editingTaskId];
          }
          if (Object.keys(day).length > 0) next[dateISO] = day;
        }

        return next;
      });
    }

    closeEditor();
  }

  function deleteTask(taskId) {
    setTasks((prev) => prev.filter((task) => task.id != taskId));
    setCompletions((prev) => {
      const next = {};
      for (const dateISO of Object.keys(prev)) {
        const day = { ...prev[dateISO] };
        delete day[taskId];
        if (Object.keys(day).length > 0) next[dateISO] = day;
      }
      return next;
    });
    closeEditor();
  }

  function toggleWeekday(dayIndex) {
    setDraft((prev) => {
      const exists = prev.daysOfWeek.includes(dayIndex);
      const nextDays = exists
        ? prev.daysOfWeek.filter((day) => day != dayIndex)
        : [...prev.daysOfWeek, dayIndex];

      return {
        ...prev,
        daysOfWeek: nextDays.length ? nextDays : [dayIndex],
      };
    });
  }

  function handleItemClick(dateISO, task) {
    if (editMode) {
      openEdit(task);
      return;
    }

    toggleDone(dateISO, task);
  }

  function goPrevWeek() {
    setAnchorDate((prev) => addDays(prev, -7));
  }

  function goNextWeek() {
    setAnchorDate((prev) => addDays(prev, 7));
  }

  function goToday() {
    setAnchorDate(new Date());
  }

  function clearChecks() {
    setCompletions({});
  }

  return (
    <div className="appShell">
      <header className="topbar">
        <div>
          <h1>Habit week</h1>
          <p className="subtitle">Semana começando em domingo • clique marca, modo edição altera</p>
        </div>

        <div className="topActions">
          <button onClick={goPrevWeek}>◀</button>
          <button onClick={goToday}>Hoje</button>
          <button onClick={goNextWeek}>▶</button>
          <button className={editMode ? "accent" : ""} onClick={() => setEditMode((prev) => !prev)}>
            {editMode ? "Sair edição" : "Modo edição"}
          </button>
          <button onClick={openCreate}>Nova tarefa</button>
          <button className="danger" onClick={clearChecks}>Limpar checks</button>
        </div>
      </header>

      <section className="filtersBar">
        <label>
          <input
            type="checkbox"
            checked={filters.showPending}
            onChange={(e) => setFilters((prev) => ({ ...prev, showPending: e.target.checked }))}
          />
          mostrar pendentes
        </label>

        <label>
          <input
            type="checkbox"
            checked={filters.showCompleted}
            onChange={(e) => setFilters((prev) => ({ ...prev, showCompleted: e.target.checked }))}
          />
          mostrar concluídos
        </label>
      </section>

      <section className="weekGrid">
        {weekDays.map((date) => {
          const iso = toISODate(date);
          const isToday = isSameDay(date, new Date());

          const items = tasks
            .filter((task) => taskAppliesToDate(task, date, anchorDate))
            .sort((a, b) => getTaskSortWeight(a) - getTaskSortWeight(b) || a.title.localeCompare(b.title))
            .filter((task) => {
              const doneDay = isDone(iso, task.id);
              const goalCompleted = task.type == "goal" ? getGoalProgress(task, completions, anchorDate).completed : false;
              const consideredCompleted = doneDay || goalCompleted;

              if (consideredCompleted && !filters.showCompleted) return false;
              if (!consideredCompleted && !filters.showPending) return false;
              return true;
            });

          return (
            <article key={iso} className={`dayCard ${isToday ? "today" : ""}`}>
              <div className="dayHeader">
                <span>{formatDayHeader(date)}</span>
              </div>

              <div className="dayContent">
                {items.length == 0 ? (
                  <div className="emptyState">—</div>
                ) : (
                  items.map((task) => {
                    const doneDay = isDone(iso, task.id);
                    const goalProgress = task.type == "goal" ? getGoalProgress(task, completions, anchorDate) : null;
                    const goalCompleted = !!goalProgress?.completed;
                    const prefix = task.type == "goal" ? getGoalLabel(task, completions, anchorDate) : null;

                    return (
                      <button
                        key={`${iso}-${task.id}`}
                        className={`chip ${task.color || ""} ${doneDay ? "doneDay" : ""} ${goalCompleted ? "goalCompleted" : ""}`}
                        onClick={() => handleItemClick(iso, task)}
                        title={editMode ? "Editar tarefa" : "Marcar/desmarcar"}
                      >
                        <span className="leadingMark">{doneDay ? "✓" : goalCompleted ? "◎" : "○"}</span>
                        <span className="chipBody">
                          <span className="chipTopLine">
                            {prefix && <span className="prefix">{prefix}</span>}
                            <span className="label">{task.title}</span>
                          </span>
                          <span className="chipMeta">{getTaskSubtitle(task)}</span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </article>
          );
        })}
      </section>

      {editingTaskId && (
        <section className="editorOverlay" onClick={closeEditor}>
          <div className="editorPanel" onClick={(e) => e.stopPropagation()}>
            <div className="editorHeader">
              <h2>{editingTaskId == "__new__" ? "Nova tarefa" : "Editar tarefa"}</h2>
              <button onClick={closeEditor}>✕</button>
            </div>

            <div className="formGrid">
              <label>
                ID
                <input
                  value={draft.id}
                  onChange={(e) => setDraft((prev) => ({ ...prev, id: e.target.value }))}
                  placeholder="ex: leitura"
                />
              </label>

              <label className="span2">
                Título
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Nome da tarefa"
                />
              </label>

              <label>
                Tipo
                <select
                  value={draft.type}
                  onChange={(e) => {
                    const type = e.target.value;
                    setDraft((prev) => ({
                      ...prev,
                      type,
                      shorthand: type == "goal" ? prev.shorthand || "s" : prev.shorthand,
                    }));
                  }}
                >
                  <option value="weekly">Recorrente semanal</option>
                  <option value="one_off">Pontual</option>
                  <option value="goal">Meta por período</option>
                </select>
              </label>

              <label>
                Cor
                <select
                  value={draft.color}
                  onChange={(e) => setDraft((prev) => ({ ...prev, color: e.target.value }))}
                >
                  <option value="green">Verde</option>
                  <option value="yellow">Amarelo</option>
                  <option value="blue">Azul</option>
                  <option value="red">Vermelho</option>
                  <option value="purple">Roxo</option>
                </select>
              </label>

              {draft.type == "one_off" && (
                <label className="span2">
                  Data
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(e) => setDraft((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </label>
              )}

              {draft.type == "weekly" && (
                <div className="span2">
                  <span className="groupLabel">Dias da semana</span>
                  <div className="weekdayGroup">
                    {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map((label, index) => (
                      <button
                        type="button"
                        key={label}
                        className={`weekdayBtn ${draft.daysOfWeek.includes(index) ? "active" : ""}`}
                        onClick={() => toggleWeekday(index)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {draft.type == "goal" && (
                <>
                  <label>
                    Período
                    <select
                      value={draft.period}
                      onChange={(e) => {
                        const period = e.target.value;
                        setDraft((prev) => ({
                          ...prev,
                          period,
                          shorthand: period == "week" ? "s" : period == "month" ? "m" : "a",
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
                      value={draft.target}
                      onChange={(e) => setDraft((prev) => ({ ...prev, target: e.target.value }))}
                    />
                  </label>
                </>
              )}
            </div>

            <div className="editorFooter">
              {editingTaskId != "__new__" && (
                <button className="danger" onClick={() => deleteTask(editingTaskId)}>
                  Excluir
                </button>
              )}
              <div className="editorFooterRight">
                <button onClick={closeEditor}>Cancelar</button>
                <button className="accent" onClick={saveTask}>Salvar</button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
