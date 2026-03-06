import { useData } from '../context/DataContext'
export default function DebtList(){
const {debts, habits, completeHabit}=useData()
const byHabit = (id)=> habits.find((h)=>h.id===id)
return (
<section className="container grid" style={{gridTemplateColumns:'1fr', gap:16}}>
{debts.filter((d)=>!d.settled).map((d)=>{
const h=byHabit(d.habitId)
if(!h) return null
return (
<div className="card fade-in" key={d.id} style={{padding:16, display:'grid', gap:6}}>
<div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
<b>🕒 Dívida</b>
<span className="badge">Janela: {new Date(d.dueStart).toLocaleDateString()} — {new Date(d.dueEnd).toLocaleDateString()}</span>
</div>
<div style={{color:'var(--muted)'}}>Hábito: {h.name}</div>
<div style={{display:'flex', gap:8, alignItems:'center'}}>
<button className="btn btn-primary" onClick={()=>completeHabit(h,d)}>Quitar (XP reduzido)</button>
<span style={{fontSize:12, color:'var(--muted)'}}>Recompensa: ~{Math.floor(h.xpPerCompletion*0.5)} XP</span>
</div>
</div>
)
})}
{debts.filter((d)=>!d.settled).length===0 && (
<div className="card" style={{padding:16, textAlign:'center', color:'var(--muted)'}}>Sem dívidas pendentes. Boa! ✨</div>
)}
</section>
)
}