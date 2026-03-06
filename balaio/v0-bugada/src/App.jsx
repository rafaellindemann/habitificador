import React from 'react'

function App() {
  return (
    <div>App</div>
  )
}

export default App


// import { useState } from 'react'
// import Header from './components/Header'
// import NavBar from './components/NavBar'
// import HabitForm from './components/HabitForm'
// import HabitList from './components/HabitList'
// import DebtList from './components/DebtList'
// import Dashboard from './components/Dashboard'
// import { useAuth } from './context/AuthContext'
// export default function App(){
// const {user,loading}=useAuth()
// const [tab,setTab]=useState('dashboard')
// // if(loading) return <div className="container">Carregando...</div>
// // if(!user) return <div className="container"><Header/><div className="card" style={{padding:16}}>Faça login para começar.</div></div>
// return (
// <div>
//     <h1>teste</h1>
// <Header/>
// {tab==='dashboard' && <Dashboard/>}
// {tab==='habits' && <div className="container grid" style={{gridTemplateColumns:'1fr', gap:16}}>
// <HabitForm/>
// <HabitList/>
// </div>}
// {tab==='debts' && <DebtList/>}
// <NavBar tab={tab} setTab={setTab}/>
// </div>
// )
// }