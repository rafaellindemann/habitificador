import { useEffect, useMemo, useState } from "react";
import "./App.css";

/**
 * Tipos:
 * - one_off: tarefa pontual (data fixa)
 * - weekly: recorrente por dia(s) da semana
 * - goal: meta por período (week/month/year) - aparece em todos os dias do período
 *
 * daysOfWeek: 0=Dom ... 6=Sáb
 * period: "week" | "month" | "year"
 */
const DEFAULT_TASKS = [
  { id: "aula-react", type: "weekly", title: "Aula React", daysOfWeek: [1, 3, 5], color: "green" },
  { id: "aula-node", type: "weekly", title: "Aula Node", daysOfWeek: [2], color: "green" },

  { id: "dentista", type: "one_off", title: "Dentista", date: "2026-03-06", color: "red" },

  { id: "academia", type: "goal", title: "Academia", period: "week", target: 3, shorthand: "s", color: "yellow" },
  { id: "bike", type: "goal", title: "Andar de bike", period: "month", target: 10, shorthand: "m", color: "blue" },
];

const LS_KEY = "habit_week__completions_v1";
const LS_WEEK_KEY = "habit_week__anchorDate_v1";

// completions shape:
// { "YYYY-MM-DD": { "taskId": true, ... }, ... }

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfWeekMonday(date) {
  // Monday-based week: Mon=0 ... Sun=6
  const d = new Date(date);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
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

function inRange(date, start, end) {
  const t = date.setHours(0, 0, 0, 0);
  const s = start.setHours(0, 0, 0, 0);
  const e = end.setHours(0, 0, 0, 0);
  return t >= s && t <= e;
}

function getPeriodBounds(period, anchorDate) {
  if (period === "week") {
    const s = startOfWeekMonday(anchorDate);
    const e = addDays(s, 6);
    return [s, e];
  }
  if (period === "month") {
    return [startOfMonth(anchorDate), endOfMonth(anchorDate)];
  }
  return [startOfYear(anchorDate), endOfYear(anchorDate)];
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function weekdayLabelPT(d) {
  const labels = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  return labels[d.getDay()];
}

function formatDayHeader(d) {
  return `${weekdayLabelPT(d)} ${d.getDate()}/${d.getMonth() + 1}`;
}

function taskAppliesToDate(task, date, anchorDate) {
  const iso = toISODate(date);

  if (task.type === "one_off") return task.date === iso;

  if (task.type === "weekly") {
    return task.daysOfWeek.includes(date.getDay());
  }

  // goal: show in every day of the period
  const [s, e] = getPeriodBounds(task.period, anchorDate);
  return inRange(new Date(date), new Date(s), new Date(e));
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

function getGoalLabel(task, completions, anchorDate) {
  const [s, e] = getPeriodBounds(task.period, anchorDate);
  const done = countCompletionsInRange(completions, task.id, s, e);
  const short = task.shorthand ?? (task.period === "week" ? "s" : task.period === "month" ? "m" : "a");
  return `[${done}/${task.target}:${short}]`;
}

function getTaskSortKey(task) {
  // só uma ordenação simples pra ficar “bonitinho”
  if (task.type === "weekly") return 1;
  if (task.type === "one_off") return 2;
  return 3; // goal
}

export default function App() {
  const [tasks] = useState(DEFAULT_TASKS);

  const [anchorDate, setAnchorDate] = useState(() => {
    const saved = localStorage.getItem(LS_WEEK_KEY);
    return saved ? parseISODate(saved) : new Date();
  });

  const [completions, setCompletions] = useState(() => loadJSON(LS_KEY, {}));

  useEffect(() => {
    saveJSON(LS_KEY, completions);
  }, [completions]);

  useEffect(() => {
    localStorage.setItem(LS_WEEK_KEY, toISODate(anchorDate));
  }, [anchorDate]);

  const weekStart = useMemo(() => startOfWeekMonday(anchorDate), [anchorDate]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  function toggleDone(dateISO, taskId) {
    setCompletions((prev) => {
      const next = { ...prev };
      const day = { ...(next[dateISO] ?? {}) };
      if (day[taskId]) delete day[taskId];
      else day[taskId] = true;

      if (Object.keys(day).length === 0) delete next[dateISO];
      else next[dateISO] = day;

      return next;
    });
  }

  function isDone(dateISO, taskId) {
    return !!completions?.[dateISO]?.[taskId];
  }

  function goToday() {
    setAnchorDate(new Date());
  }

  function goPrevWeek() {
    setAnchorDate((d) => addDays(d, -7));
  }

  function goNextWeek() {
    setAnchorDate((d) => addDays(d, 7));
  }

  function clearAll() {
    setCompletions({});
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="title">
          <h1>Habits (semana)</h1>
          <div className="subtitle">
            Semana de <b>{toISODate(weekStart)}</b>
          </div>
        </div>

        <div className="actions">
          <button onClick={goPrevWeek}>◀</button>
          <button onClick={goToday}>Hoje</button>
          <button onClick={goNextWeek}>▶</button>
          <button className="danger" onClick={clearAll} title="Limpar conclusões">
            Reset
          </button>
        </div>
      </header>

      <section className="grid">
        {days.map((d) => {
          const iso = toISODate(d);
          const isToday = isSameDay(d, new Date());

          const items = tasks
            .filter((t) => taskAppliesToDate(t, d, anchorDate))
            .sort((a, b) => getTaskSortKey(a) - getTaskSortKey(b));

          return (
            <div key={iso} className={`day ${isToday ? "today" : ""}`}>
              <div className="dayHeader">
                <span className="dayTitle">{formatDayHeader(d)}</span>
              </div>

              <div className="items">
                {items.length === 0 ? (
                  <div className="empty">—</div>
                ) : (
                  items.map((t) => {
                    const done = isDone(iso, t.id);
                    const prefix = t.type === "goal" ? getGoalLabel(t, completions, anchorDate) : null;

                    return (
                      <button
                        key={t.id}
                        className={`chip ${t.color ?? ""} ${done ? "done" : ""}`}
                        onClick={() => toggleDone(iso, t.id)}
                        title="Clique para marcar/desmarcar"
                      >
                        {prefix && <span className="prefix">{prefix}</span>}
                        <span className="label">{t.title}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </section>

      <footer className="hint">
        Clique em um item para marcar como concluído no dia. Metas mostram progresso no período (semana/mês/ano).
      </footer>
    </div>
  );
}