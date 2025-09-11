import { useState } from 'react'
import { useData } from '../context/DataContext'
export default function HabitForm(){
const {addHabit}=useData()
const [name,setName]=useState('')
const [kind,setKind]=useState('fixed') // 'fixed' | 'flex'
const [weekday,setWeekday]=useState(3)
const [time,setTime]=useState('18:00')
const [period,setPeriod]=useState('week') // 'week' | 'month'
const [target,setTarget]=useState(3)
const [xp,setXp]=useState(10)
function reset(){ setName(''); setTarget(3) }
return (
<div className="card fade-in" style={{padding:16}}>
<h3 style={{marginTop:0}}>Novo hábito</h3>
<div className="grid" style={{gridTemplateColumns:'1fr'}}>
<input className="input" placeholder="Nome do hábito (ex: Estudar JS)" value={name} onChange={e=>setName(e.target.value)} />
<div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
<button className={`btn ${kind==='fixed'?'btn-primary':'btn-secondary'}`} onClick={()=>setKind('fixed')}>Fixo</button>
<button className={`btn ${kind==='flex'?'btn-primary':'btn-secondary'}`} onClick={()=>setKind('flex')}>Flexível</button>
</div>
{kind==='fixed' && (
<div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:12}}>
<select className="select" value={weekday} onChange={e=>setWeekday(Number(e.target.value))}>
<option value={0}>Domingo</option>
<option value={1}>Segunda</option>
<option value={2}>Terça</option>
<option value={3}>Quarta</option>
<option value={4}>Quinta</option>
<option value={5}>Sexta</option>
<option value={6}>Sábado</option>
</select>
<input className="input" type="time" value={time} onChange={e=>setTime(e.target.value)} />
</div>
)}
{kind==='flex' && (
<div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:12}}>
<select className="select" value={period} onChange={e=>setPeriod(e.target.value)}>
<option value="week">por semana</option>
<option value="month">por mês</option>
</select>
<input className="input" type="number" min={1} max={50} value={target} onChange={e=>setTarget(Number(e.target.value))} />
</div>
)}
<div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:12}}>
<label className="input" style={{display:'flex',alignItems:'center',gap:8}}>
<span>XP por conclusão</span>
<input type="number" min={1} max={1000} value={xp} onChange={e=>setXp(Number(e.target.value))} style={{flex:1, background:'transparent', border:'none', color:'var(--text)'}}/>
</label>
<button className="btn btn-primary" onClick={()=>{
const base={ name, kind, xpPerCompletion:xp }
if(kind==='fixed') Object.assign(base,{weekday,time})
else Object.assign(base,{period,target})
addHabit(base); reset()
}}>Salvar hábito</button>
</div>
</div>
</div>
)
}