import { useData } from '../context/DataContext'
import HabitCard from './HabitCard'
export default function HabitList(){
const {habits}=useData()
return (
<section className="container grid" style={{gridTemplateColumns:'1fr', gap:16}}>
{habits.map(h=> <HabitCard key={h.id} habit={h} />)}
{habits.length===0 && (
<div className="card" style={{padding:16, textAlign:'center', color:'var(--muted)'}}>Nenhum hábito ainda. Que tal cadastrar um acima? 👆</div>
)}
</section>
)
}