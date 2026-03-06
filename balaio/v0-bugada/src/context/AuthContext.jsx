import { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'
const AuthCtx = createContext({user:null, loading:true})
export const useAuth=()=>useContext(AuthCtx)
export default function AuthProvider({children}){
const [user,setUser]=useState(null)
const [loading,setLoading]=useState(true)
useEffect(()=> onAuthStateChanged(auth,(u)=>{ setUser(u); setLoading(false)}),[])
return <AuthCtx.Provider value={{user,loading}}>{children}</AuthCtx.Provider>
}