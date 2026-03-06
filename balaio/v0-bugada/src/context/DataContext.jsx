import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, where, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { uid } from '../utils/id'
import { currentPeriods, debtPenalty } from '../services/gamification'
import { useAuth } from './AuthContext'


const Ctx = createContext({})
export const useData=()=>useContext(Ctx)
export default function DataProvider({children}){
const {user}=useAuth()
const [profile,setProfile]=useState(null)
const [habits,setHabits]=useState([])
const [completions,setCompletions]=useState([])
const [debts,setDebts]=useState([])


useEffect(()=>{
if(!user) return
const profRef=doc(db,'profiles',user.uid)
setDoc(profRef,{uid:user.uid, displayName:user.displayName||'Você', xp:0},{merge:true})
const qHabits=query(collection(db,'habits'), where('uid','==',user.uid), orderBy('createdAt','desc'))
const unsubH=onSnapshot(qHabits,(snap)=> setHabits(snap.docs.map(d=>({id:d.id,...d.data()}))))
const qComp=query(collection(db,'completions'), where('uid','==',user.uid), orderBy('ts','desc'))
const unsubC=onSnapshot(qComp,(snap)=> setCompletions(snap.docs.map(d=>({id:d.id,...d.data()}))))
const qDebts=query(collection(db,'debts'), where('uid','==',user.uid), orderBy('createdAt','desc'))
const unsubD=onSnapshot(qDebts,(snap)=> setDebts(snap.docs.map(d=>({id:d.id,...d.data()}))))
return ()=>{unsubH();unsubC();unsubD()}
},[user])


useEffect(()=>{ if(!user) return; (async()=>{
const p=doc(db,'profiles',user.uid); const rs=await getDoc(p); if(rs.exists()) setProfile(rs.data())
})() },[user])


async function addHabit(h){ if(!user) return; await addDoc(collection(db,'habits'), {...h, uid:user.uid, createdAt:Date.now(), active:true}) }
async function toggleHabit(id, active){ await setDoc(doc(db,'habits',id),{active},{merge:true}) }
async function completeHabit(habit, asDebt){
if(!user) return
const isDebt=!!asDebt
const xp = isDebt ? debtPenalty(habit.xpPerCompletion) : habit.xpPerCompletion
await addDoc(collection(db,'completions'),{ id:uid(), habitId:habit.id, uid:user.uid, ts:Date.now(), debt:isDebt, xpEarned:xp })
const prof=doc(db,'profiles',user.uid)
const snap=await getDoc(prof); const curr=(snap.data()?.xp)||0
await setDoc(prof,{xp: curr + xp},{merge:true})
if(isDebt && asDebt){ await setDoc(doc(db,'debts',asDebt.id),{ settled:true },{merge:true}) }
}


async function scanAndCreateDebts(){
if(!user) return
const {wStart,wEnd,mStart,mEnd}=currentPeriods()
const flex = habits.filter(h=>h.uid===user.uid && h.kind==='flex' && h.active)
for(const h of flex){
const periodRange = h.period==='week' ? [wStart,wEnd] : [mStart,mEnd]
const done = completions.filter(c=>c.habitId===h.id && c.ts>=periodRange[0] && c.ts<=periodRange[1] && !c.debt).length
const needed = Math.max(0,(h.target||0)-done)
const outstandingExists = debts.some(d=>d.habitId===h.id && !d.settled && d.dueStart===periodRange[0])
if(needed>0 && !outstandingExists){
await addDoc(collection(db,'debts'),{ id:uid(), habitId:h.id, uid:user.uid, dueStart:periodRange[0], dueEnd:periodRange[1], createdAt:Date.now(), settled:false })
}
}
const fixed = habits.filter(h=>h.kind==='fixed' && h.active)
const weekStart=new Date(wStart)
for(const h of fixed){
const dueDay=(h.weekday??1)
const dueDate=new Date(weekStart); dueDate.setDate(weekStart.getDate()+dueDay)
const [hh,mm]=(h.time||'18:00').split(':').map(Number)
}
}
}

// neste faltaram duas chaves de fechamento