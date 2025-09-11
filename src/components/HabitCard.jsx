import { useData } from '../context/DataContext'
export default function HabitCard({habit}){
const {completeHabit,toggleHabit}=useData()
return (
<div className="card fade-in" style={{padding:16, display:'grid', gap:8}}>
<div style={{display:'flex',justifyContent:'space-between', alignItems:'center'}}>
<h4 style={{margin:0}}>{habit.name}</h4>
<button className="btn btn-secondary" onClick={()=>toggleHabit(habit.id, !habit.active)}>
{habit.active? 'Desativar':'Ativar'}
</button>
</div>
<div style={{color:'var(--muted)'}}>
{habit.kind==='fixed'? (
<span>Fixo · {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][habit.weekday||0]} às {habit.time}</span>
): (
<span>Flexível · {habit.target}x / {habit.period==='week'?'semana':'mês'}</span>
)}
<span> · {habit.xpPerCompletion} XP</span>
</div>
<div>
<button className="btn btn-primary" onClick={()=>completeHabit(habit)}>Concluir agora</button>
</div>
</div>
)
}