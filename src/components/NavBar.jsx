export default function NavBar({tab,setTab}){
const items=[
{id:'dashboard',label:'Dashboard',icon:'📊'},
{id:'habits',label:'Hábitos',icon:'🧩'},
{id:'debts',label:'Dívidas',icon:'⏳'},
]
return (
<nav className="container" style={{position:'sticky', bottom:0}}>
<div className="card" style={{padding:8, display:'flex', gap:8, justifyContent:'space-between'}}>
{items.map(it=> (
<button key={it.id} className={`btn ${tab===it.id?'btn-primary':'btn-secondary'}`} onClick={()=>setTab(it.id)}>
<span>{it.icon}</span> {it.label}
</button>
))}
</div>
</nav>
)
}