import { useMemo } from 'react'
import { useData } from '../context/DataContext'
import { currentPeriods, evaluateBadges } from '../services/gamification'
export default function Dashboard(){
const {habits, completions, debts, profile, scanAndCreateDebts}=useData()
const {wStart,wEnd,mStart,mEnd}=currentPeriods()
const weekComps = completions.filter((c)=> c.ts>=wStart && c.ts<=wEnd)
const monthComps = completions.filter((c)=> c.ts>=mStart && c.ts<=mEnd)
const weekDebts = debts.filter((d)=> d.dueStart===wStart)
const monthDebts = debts.filter((d)=> d.dueStart>=mStart && d.dueEnd<=mEnd)
const xpWeek = weekComps.reduce((a,c)=>a+c.xpEarned,0)
const xpMonth = monthComps.reduce((a,c)=>a+c.xpEarned,0)
const completionsWeek = weekComps.length
const debtsUnpaid = debts.filter((d)=>!d.settled).length
const badges = useMemo(()=>{
const weekStats = {debtsPaid: weekComps.filter((c)=>c.debt).length, debtsCreated: weekDebts.length, completions: completionsWeek}
const monthStats= {debtsPaid: monthComps.filter((c)=>c.debt).length, debtsCreated: monthDebts.length, completions: monthComps.length}
return evaluateBadges({xp: profile?.xp||0, weekStats, monthStats})
},[profile,completions,debts])
return (
<section className="container grid" style={{gridTemplateColumns:'1fr', gap:16}}>
<div className="card" style={{padding:16, display:'grid', gap:12}}>
<h3 style={{margin:0}}>Visão Geral</h3>
<div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12}}>
<Stat title="XP total" value={profile?.xp||0} hint="Soma de tudo"/>
<Stat title="XP (semana)" value={xpWeek} hint="{Dom-Sáb}"/>
<Stat title="Concluídas (semana)" value={completionsWeek} hint="Inclui dívidas"/>
<Stat title="Dívidas pendentes" value={debtsUnpaid} hint="Quitadas geram XP reduzido"/>
</div>
<div>
<div style={{marginBottom:6, display:'flex',justifyContent:'space-between'}}>
<span>Progresso da semana</span><span style={{color:'var(--muted)'}}>{xpWeek} XP</span>
</div>
<div className="progress"><span style={{width: Math.min(100, (xpWeek/200)*100)+'%'}}/></div>
</div>
<div>
<div style={{marginBottom:6, display:'flex',justifyContent:'space-between'}}>
<span>Progresso do mês</span><span style={{color:'var(--muted)'}}>{xpMonth} XP</span>
</div>
<div className="progress"><span style={{width: Math.min(100, (xpMonth/800)*100)+'%'}}/></div>
</div>
<div>
<h4 style={{margin:'12px 0 8px'}}>Badges sugeridas (dinâmicas)</h4>
<BadgesBar badges={badges} />
</div>
<div>
<button className="btn btn-secondary" onClick={()=>scanAndCreateDebts()}>Atualizar dívidas do período</button>
</div>
</div>
</section>
)
}
function Stat({title,value,hint}){
return (
<div className="card" style={{padding:12}}>
<div style={{color:'var(--muted)', fontSize:13}}>{title}</div>
<div style={{fontSize:28, fontWeight:700}}>{value}</div>
{hint && <div style={{color:'var(--muted)', fontSize:12}}>{hint}</div>}
</div>
)
}