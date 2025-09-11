import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from '../utils/dates'
export const debtPenalty = (xp)=> Math.floor(xp*0.5)
export function evaluateBadges({xp, weekStats, monthStats}){
const earned=[]
if(xp>=100) earned.push({id:'xp100',name:'Primeiros 100',icon:'🥉',description:'Você alcançou 100 XP!', achievedAt:Date.now()})
if(xp>=500) earned.push({id:'xp500',name:'Firme e Forte',icon:'🥈',description:'Você alcançou 500 XP!', achievedAt:Date.now()})
if(xp>=1000) earned.push({id:'xp1000',name:'Milhas de Foco',icon:'🥇',description:'Você alcançou 1000 XP!', achievedAt:Date.now()})
if(weekStats.debtsCreated===0 && weekStats.completions>0) earned.push({id:'perfectWeek',name:'Semana Perfeita',icon:'🔥',description:'Nenhuma dívida criada nesta semana.', achievedAt:Date.now()})
if(monthStats.debtsPaid>=5) earned.push({id:'maoNaMassa',name:'Mão na Massa',icon:'🧰',description:'Pagou 5 dívidas no mês.', achievedAt:Date.now()})
return earned
}
export function currentPeriods(){
const wStart=startOfWeek(); const wEnd=endOfWeek();
const mStart=startOfMonth(); const mEnd=endOfMonth();
return {wStart:wStart.getTime(), wEnd:wEnd.getTime(), mStart:mStart.getTime(), mEnd:mEnd.getTime()}
}