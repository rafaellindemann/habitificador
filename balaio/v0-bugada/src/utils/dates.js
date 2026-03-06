export const startOfWeek = (d=new Date())=>{ const x=new Date(d); const day=(x.getDay()+6)%7; x.setHours(0,0,0,0); x.setDate(x.getDate()-day); return x }
export const endOfWeek = (d=new Date())=>{ const s=startOfWeek(d); const x=new Date(s); x.setDate(s.getDate()+7); x.setMilliseconds(-1); return x }
export const startOfMonth = (d=new Date())=>{ const x=new Date(d.getFullYear(), d.getMonth(), 1); x.setHours(0,0,0,0); return x }
export const endOfMonth = (d=new Date())=>{ const x=new Date(d.getFullYear(), d.getMonth()+1, 1); x.setMilliseconds(-1); return x }
export const inRange = (t, a, b)=> t>=a && t<=b
export const now = ()=> Date.now()