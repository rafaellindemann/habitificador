import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "habit_week_app_v3";

const DEFAULT_COLORS = [
  { id: 1, name: "Verde", hex: "#55ef8b" },
  { id: 2, name: "Amarelo", hex: "#ffe66d" },
  { id: 3, name: "Azul", hex: "#74b9ff" },
  { id: 4, name: "Vermelho", hex: "#ff7675" },
  { id: 5, name: "Roxo", hex: "#c39bff" },
];

const DEFAULT_CATEGORIES = [
  { id: 1, name: "estudo" },
  { id: 2, name: "fit" },
  { id: 3, name: "trabalho" },
  { id: 4, name: "pessoal" },
];

const DEFAULT_TASKS = [
  {
    id: 1,
    type: "weekly",
    title: "Aula React",
    categoryId: 1,
    daysOfWeek: [1, 3, 5],
    colorId: 1,
  },
  {
    id: 2,
    type: "weekly",
    title: "Aula Node",
    categoryId: 1,
    daysOfWeek: [2],
    colorId: 1,
  },
  {
    id: 3,
    type: "one_off",
    title: "Dentista",
    categoryId: 4,
    date: "2026-03-06",
    colorId: 4,
  },
  {
    id: 4,
    type: "goal",
    title: "Academia",
    categoryId: 2,
    period: "week",
    target: 3,
    shorthand: "s",
    colorId: 2,
  },
  {
    id: 5,
    type: "goal",
    title: "Andar de bike",
    categoryId: 2,
    period: "month",
    target: 10,
    shorthand: "m",
    colorId: 3,
  },
];

const DEFAULT_STATE = {
  anchorDate: todayISO(),
  tasks: DEFAULT_TASKS,
  colors: DEFAULT_COLORS,
  categories: DEFAULT_CATEGORIES,
  completions: {},
  preferences: {
    showPending: true,
    showCompleted: true,
    editMode: false,
  },
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

function todayISO() {
  return toISODate(new Date());
}

function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfWeekSunday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
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

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function weekdayLabelPT(d) {
  const labels = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  return labels[d.getDay()];
}

function formatDayHeader(d) {
  return `${weekdayLabelPT(d)} ${d.getDate()}/${d.getMonth() + 1}`;
}

function getPeriodBounds(period, anchorDate) {
  if (period === "week") {
    const start = startOfWeekSunday(anchorDate);
    return [start, addDays(start, 6)];
  }
  if (period === "month") {
    return [startOfMonth(anchorDate), endOfMonth(anchorDate)];
  }
  return [startOfYear(anchorDate), endOfYear(anchorDate)];
}

function inRange(date, start, end) {
  const t = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return t >= s && t <= e;
}

function countCompletionsInRange(completions, taskId, start, end) {
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const iso = toISODate(d);
    if (completions?.[iso]?.[taskId]) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function getGoalDone(task, completions, anchorDate) {
  const [s, e] = getPeriodBounds(task.period, anchorDate);
  return countCompletionsInRange(completions, task.id, s, e);
}

function isLeapYear(year) {
  return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
}

function getGoalLimit(task, anchorDate) {
  if (task.period === "week") return 7;
  if (task.period === "month") return endOfMonth(anchorDate).getDate();
  return isLeapYear(anchorDate.getFullYear()) ? 366 : 365;
}

function clampGoalTarget(task, anchorDate) {
  const limit = getGoalLimit(task, anchorDate);
  return Math.max(1, Math.min(Number(task.target || 1), limit));
}

function getGoalLabel(task, completions, anchorDate) {
  const done = getGoalDone(task, completions, anchorDate);
  const short = task.shorthand || (task.period === "week" ? "s" : task.period === "month" ? "m" : "a");
  return `[${done}/${task.target}:${short}]`;
}

function isGoalCompleted(task, completions, anchorDate) {
  return getGoalDone(task, completions, anchorDate) >= task.target;
}

function taskAppliesToDate(task, date, anchorDate) {
  const iso = toISODate(date);
  if (task.type === "one_off") return task.date == iso;
  if (task.type === "weekly") return task.daysOfWeek.includes(date.getDay());
  const [start, end] = getPeriodBounds(task.period, anchorDate);
  return inRange(date, start, end);
}

function sortTasks(a, b) {
  const order = { weekly: 1, one_off: 2, goal: 3 };
  return order[a.type] - order[b.type] || a.title.localeCompare(b.title);
}

function sortByName(a, b) {
  return a.name.localeCompare(b.name);
}

function buildInitialState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved) return DEFAULT_STATE;

    return {
      anchorDate: saved.anchorDate || DEFAULT_STATE.anchorDate,
      tasks: Array.isArray(saved.tasks) && saved.tasks.length ? saved.tasks : DEFAULT_TASKS,
      colors: Array.isArray(saved.colors) && saved.colors.length ? saved.colors : DEFAULT_COLORS,
      categories:
        Array.isArray(saved.categories) && saved.categories.length ? saved.categories : DEFAULT_CATEGORIES,
      completions: saved.completions || {},
      preferences: {
        ...DEFAULT_STATE.preferences,
        ...(saved.preferences || {}),
      },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function nextId() {
  return Number(Date.now() + Math.floor(Math.random() * 1000));
}

function makeEmptyTask(anchorDate, colors, categories) {
  return {
    id: nextId(),
    type: "weekly",
    title: "",
    categoryId: categories[0]?.id || null,
    daysOfWeek: [1],
    date: todayISO(),
    period: "week",
    target: 1,
    shorthand: "s",
    colorId: colors[0]?.id || null,
    _anchorDateForValidation: toISODate(anchorDate),
  };
}

function sanitizeTask(task, anchorDate) {
  const base = { ...task };
  if (base.type === "goal") {
    base.target = clampGoalTarget(base, anchorDate);
    base.shorthand = base.period === "week" ? "s" : base.period === "month" ? "m" : "a";
  }
  if (base.type !== "weekly") delete base.daysOfWeek;
  if (base.type !== "one_off") delete base.date;
  if (base.type !== "goal") {
    delete base.period;
    delete base.target;
    delete base.shorthand;
  }
  delete base._anchorDateForValidation;
  return base;
}

function getColorById(colors, id) {
  return colors.find((color) => color.id == id) || colors[0] || { hex: "#888888", name: "Sem cor" };
}

function getCategoryById(categories, id) {
  return categories.find((category) => category.id == id) || null;
}

function removeTaskCompletions(prev, taskId) {
  const next = {};
  Object.entries(prev).forEach(([date, dayMap]) => {
    const cloned = { ...dayMap };
    delete cloned[taskId];
    if (Object.keys(cloned).length) next[date] = cloned;
  });
  return next;
}

export default function App() {
  const initial = useMemo(() => buildInitialState(), []);

  const [anchorDate, setAnchorDate] = useState(parseISODate(initial.anchorDate));
  const [tasks, setTasks] = useState(initial.tasks);
  const [colors, setColors] = useState(initial.colors.sort(sortByName));
  const [categories, setCategories] = useState(initial.categories.sort(sortByName));
  const [completions, setCompletions] = useState(initial.completions);
  const [showPending, setShowPending] = useState(initial.preferences.showPending);
  const [showCompleted, setShowCompleted] = useState(initial.preferences.showCompleted);
  const [editMode, setEditMode] = useState(initial.preferences.editMode);

  const [editingTask, setEditingTask] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [colorForm, setColorForm] = useState({ name: "", hex: "#ffffff" });
  const [categoryForm, setCategoryForm] = useState({ name: "" });

  useEffect(() => {
    const payload = {
      anchorDate: toISODate(anchorDate),
      tasks,
      colors,
      categories,
      completions,
      preferences: { showPending, showCompleted, editMode },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [anchorDate, tasks, colors, categories, completions, showPending, showCompleted, editMode]);

  const weekStart = useMemo(() => startOfWeekSunday(anchorDate), [anchorDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  function toggleDone(dateISO, taskId) {
    setCompletions((prev) => {
      const next = { ...prev };
      const day = { ...(next[dateISO] || {}) };
      if (day[taskId]) delete day[taskId];
      else day[taskId] = true;
      if (Object.keys(day).length) next[dateISO] = day;
      else delete next[dateISO];
      return next;
    });
  }

  function isDone(dateISO, taskId) {
    return !!completions?.[dateISO]?.[taskId];
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

  function openNewTask() {
    setEditMode(true);
    setEditingTask(makeEmptyTask(anchorDate, colors, categories));
  }

  function openEditTask(task) {
    setEditingTask({
      ...task,
      daysOfWeek: task.daysOfWeek || [1],
      date: task.date || todayISO(),
      period: task.period || "week",
      target: task.target || 1,
      shorthand: task.shorthand || "s",
      categoryId: task.categoryId || categories[0]?.id || null,
      colorId: task.colorId || colors[0]?.id || null,
      _anchorDateForValidation: toISODate(anchorDate),
    });
  }

  function closeEditor() {
    setEditingTask(null);
  }

  function saveTask() {
    if (!editingTask) return;
    const title = editingTask.title.trim();
    if (!title) {
      alert("Informe um título para a tarefa.");
      return;
    }
    if (!editingTask.colorId) {
      alert("Escolha uma cor para a tarefa.");
      return;
    }
    if (!editingTask.categoryId) {
      alert("Escolha uma categoria para a tarefa.");
      return;
    }

    const anchorForValidation = editingTask._anchorDateForValidation
      ? parseISODate(editingTask._anchorDateForValidation)
      : anchorDate;

    const taskToSave = sanitizeTask({ ...editingTask, title }, anchorForValidation);

    setTasks((prev) => {
      const exists = prev.some((task) => task.id == taskToSave.id);
      if (exists) {
        return prev.map((task) => (task.id == taskToSave.id ? taskToSave : task)).sort(sortTasks);
      }
      return [...prev, taskToSave].sort(sortTasks);
    });

    setEditingTask(null);
  }

  function deleteTask(taskId) {
    const ok = window.confirm("Excluir esta tarefa?");
    if (!ok) return;

    setTasks((prev) => prev.filter((task) => task.id != taskId));
    setCompletions((prev) => removeTaskCompletions(prev, taskId));
    setEditingTask(null);
  }

  function handleChipClick(task, iso) {
    if (editMode) {
      openEditTask(task);
      return;
    }
    toggleDone(iso, task.id);
  }

  function addColor() {
    const name = colorForm.name.trim();
    const hex = colorForm.hex.trim();
    if (!name || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
      alert("Informe um nome e uma cor hexadecimal válida, como #a1b2c3.");
      return;
    }
    if (colors.some((color) => color.name.toLowerCase() == name.toLowerCase())) {
      alert("Já existe uma cor com esse nome.");
      return;
    }

    setColors((prev) => [...prev, { id: nextId(), name, hex }].sort(sortByName));
    setColorForm({ name: "", hex: "#ffffff" });
  }

  function removeColor(colorId) {
    const isInUse = tasks.some((task) => task.colorId == colorId);
    if (isInUse) {
      alert("Essa cor está em uso por uma tarefa. Troque a cor da tarefa antes de remover.");
      return;
    }
    if (colors.length <= 1) {
      alert("Mantenha pelo menos uma cor cadastrada.");
      return;
    }
    setColors((prev) => prev.filter((color) => color.id != colorId));
  }

  function addCategory() {
    const name = categoryForm.name.trim().toLowerCase();
    if (!name) {
      alert("Informe um nome para a categoria.");
      return;
    }
    if (categories.some((category) => category.name.toLowerCase() == name)) {
      alert("Já existe uma categoria com esse nome.");
      return;
    }

    setCategories((prev) => [...prev, { id: nextId(), name }].sort(sortByName));
    setCategoryForm({ name: "" });
  }

  function removeCategory(categoryId) {
    const isInUse = tasks.some((task) => task.categoryId == categoryId);
    if (isInUse) {
      alert("Essa categoria está em uso por uma tarefa. Troque a categoria da tarefa antes de remover.");
      return;
    }
    if (categories.length <= 1) {
      alert("Mantenha pelo menos uma categoria cadastrada.");
      return;
    }
    setCategories((prev) => prev.filter((category) => category.id != categoryId));
  }

  function updateEditingField(key, value) {
    setEditingTask((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      if (key === "period") {
        next.shorthand = value === "week" ? "s" : value === "month" ? "m" : "a";
        next.target = clampGoalTarget(next, anchorDate);
      }
      if (key === "target") {
        next.target = clampGoalTarget({ ...next, target: Number(value || 1) }, anchorDate);
      }
      return next;
    });
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Habit Week</h1>
          <div className="subtitle">Semana de {toISODate(weekStart)}</div>
        </div>

        <div className="toolbar">
          <button onClick={goPrevWeek}>◀</button>
          <button onClick={goToday}>Hoje</button>
          <button onClick={goNextWeek}>▶</button>
          <button onClick={() => setEditMode((prev) => !prev)}>{editMode ? "Sair da edição" : "Modo edição"}</button>
          <button onClick={openNewTask}>Nova tarefa</button>
          <button className="iconButton" onClick={() => setSettingsOpen(true)} title="Configurações">
            ⚙️
          </button>
        </div>
      </header>

      <section className="controlsBar">
        <label className="checkline">
          <input type="checkbox" checked={showPending} onChange={(e) => setShowPending(e.target.checked)} />
          Mostrar pendentes
        </label>
        <label className="checkline">
          <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
          Mostrar concluídos
        </label>
      </section>

      <section className="grid">
        {weekDays.map((date) => {
          const iso = toISODate(date);
          const isToday = sameDay(date, new Date());

          const items = tasks
            .filter((task) => taskAppliesToDate(task, date, anchorDate))
            .filter((task) => {
              const doneDay = isDone(iso, task.id);
              const completedByGoal = task.type === "goal" && isGoalCompleted(task, completions, anchorDate);
              const completed = doneDay || completedByGoal;
              if (completed && !showCompleted) return false;
              if (!completed && !showPending) return false;
              return true;
            })
            .sort(sortTasks);

          return (
            <div className={`day ${isToday ? "today" : ""}`} key={iso}>
              <div className="dayHeader">{formatDayHeader(date)}</div>
              <div className="items">
                {items.length == 0 ? (
                  <div className="empty">—</div>
                ) : (
                  items.map((task) => {
                    const color = getColorById(colors, task.colorId);
                    const category = getCategoryById(categories, task.categoryId);
                    const doneDay = isDone(iso, task.id);
                    const completedByGoal = task.type === "goal" && isGoalCompleted(task, completions, anchorDate);
                    const goalLabel = task.type === "goal" ? getGoalLabel(task, completions, anchorDate) : null;

                    return (
                      <button
                        key={`${iso}-${task.id}`}
                        className={`chip ${doneDay ? "doneDay" : ""} ${completedByGoal ? "goalCompleted" : ""}`}
                        style={{ "--chip-color": color?.hex || "#888888" }}
                        onClick={() => handleChipClick(task, iso)}
                        title={editMode ? "Editar tarefa" : "Marcar/desmarcar"}
                      >
                        <span className="chipMain">
                          {goalLabel ? <span className="prefix">{goalLabel}</span> : null}
                          <span className="labelText">{task.title}</span>
                        </span>
                        <span className="chipMeta">
                          {doneDay ? <span className="badge doneBadge">✓</span> : null}
                          {category ? <span className="badge categoryBadge">{category.name}</span> : null}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="notesPanel panel">
        <div className="panelTitle">Notas desta versão</div>
        <ul className="notesList">
          <li>Domingo como primeiro dia da semana.</li>
          <li>Metas ficam riscadas no período inteiro quando são concluídas.</li>
          <li>Os dias realmente executados continuam marcados com ✓ e contorno.</li>
          <li>Cores e categorias ficam no modal de configurações.</li>
          <li>Todo o estado continua salvo em um único registro do localStorage.</li>
        </ul>
      </section>

      {editingTask ? (
        <div className="modalBackdrop" onClick={closeEditor}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2>{tasks.some((task) => task.id == editingTask.id) ? "Editar tarefa" : "Nova tarefa"}</h2>
              <button className="ghost" onClick={closeEditor}>Fechar</button>
            </div>

            <div className="formGrid">
              <label className="fullWidth">
                <span>Título</span>
                <input
                  type="text"
                  placeholder="Ex.: Academia"
                  value={editingTask.title}
                  onChange={(e) => updateEditingField("title", e.target.value)}
                />
              </label>

              <label>
                <span>Tipo</span>
                <select value={editingTask.type} onChange={(e) => updateEditingField("type", e.target.value)}>
                  <option value="weekly">Recorrente semanal</option>
                  <option value="one_off">Pontual</option>
                  <option value="goal">Meta por período</option>
                </select>
              </label>

              <label>
                <span>Categoria</span>
                <select
                  value={editingTask.categoryId || ""}
                  onChange={(e) => updateEditingField("categoryId", Number(e.target.value))}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Cor</span>
                <select
                  value={editingTask.colorId || ""}
                  onChange={(e) => updateEditingField("colorId", Number(e.target.value))}
                >
                  {colors.map((color) => (
                    <option key={color.id} value={color.id}>
                      {color.name} ({color.hex})
                    </option>
                  ))}
                </select>
              </label>

              {editingTask.type === "one_off" ? (
                <label>
                  <span>Data</span>
                  <input
                    type="date"
                    value={editingTask.date}
                    onChange={(e) => updateEditingField("date", e.target.value)}
                  />
                </label>
              ) : null}

              {editingTask.type === "goal" ? (
                <>
                  <label>
                    <span>Período</span>
                    <select value={editingTask.period} onChange={(e) => updateEditingField("period", e.target.value)}>
                      <option value="week">Semanal</option>
                      <option value="month">Mensal</option>
                      <option value="year">Anual</option>
                    </select>
                  </label>

                  <label>
                    <span>
                      Meta
                      <small>
                        máximo {getGoalLimit(editingTask, anchorDate)}
                      </small>
                    </span>
                    <input
                      type="number"
                      min="1"
                      max={getGoalLimit(editingTask, anchorDate)}
                      value={editingTask.target}
                      onChange={(e) => updateEditingField("target", e.target.value)}
                    />
                  </label>
                </>
              ) : null}

              {editingTask.type === "weekly" ? (
                <div className="fullWidth">
                  <span className="labelBlock">Dias da semana</span>
                  <div className="weekChecks">
                    {[
                      { label: "DOM", value: 0 },
                      { label: "SEG", value: 1 },
                      { label: "TER", value: 2 },
                      { label: "QUA", value: 3 },
                      { label: "QUI", value: 4 },
                      { label: "SEX", value: 5 },
                      { label: "SÁB", value: 6 },
                    ].map((item) => (
                      <label key={item.value} className="miniCheck">
                        <input
                          type="checkbox"
                          checked={editingTask.daysOfWeek.includes(item.value)}
                          onChange={(e) => {
                            const current = new Set(editingTask.daysOfWeek);
                            if (e.target.checked) current.add(item.value);
                            else current.delete(item.value);
                            const next = Array.from(current).sort((a, b) => a - b);
                            updateEditingField("daysOfWeek", next.length ? next : [0]);
                          }}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="modalActions">
              <div>
                {tasks.some((task) => task.id == editingTask.id) ? (
                  <button className="danger" onClick={() => deleteTask(editingTask.id)}>
                    Excluir
                  </button>
                ) : null}
              </div>
              <div className="actionsRight">
                <button className="ghost" onClick={closeEditor}>Cancelar</button>
                <button onClick={saveTask}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <div className="modalBackdrop" onClick={() => setSettingsOpen(false)}>
          <div className="modal settingsModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2>Configurações</h2>
              <button className="ghost" onClick={() => setSettingsOpen(false)}>Fechar</button>
            </div>

            <div className="settingsGrid">
              <div className="panel settingsPanel">
                <div className="panelTitle">Paleta de cores</div>
                <div className="colorForm">
                  <input
                    type="text"
                    placeholder="Nome da cor"
                    value={colorForm.name}
                    onChange={(e) => setColorForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <input
                    type="color"
                    value={colorForm.hex}
                    onChange={(e) => setColorForm((prev) => ({ ...prev, hex: e.target.value }))}
                  />
                  <button onClick={addColor}>Adicionar</button>
                </div>

                <div className="colorList">
                  {colors.map((color) => (
                    <div key={color.id} className="colorRow">
                      <span className="swatch" style={{ background: color.hex }} />
                      <div>
                        <strong>{color.name}</strong>
                        <div className="colorHex">{color.hex}</div>
                      </div>
                      <button className="small" onClick={() => setColorForm({ name: color.name, hex: color.hex })}>
                        Copiar
                      </button>
                      <button className="small danger" onClick={() => removeColor(color.id)}>
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel settingsPanel">
                <div className="panelTitle">Categorias</div>
                <div className="colorForm categoryFormGrid">
                  <input
                    type="text"
                    placeholder="Nome da categoria"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ name: e.target.value })}
                  />
                  <button onClick={addCategory}>Adicionar</button>
                </div>

                <div className="colorList">
                  {categories.map((category) => (
                    <div key={category.id} className="categoryRow">
                      <div>
                        <strong>{category.name}</strong>
                      </div>
                      <button className="small danger" onClick={() => removeCategory(category.id)}>
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
