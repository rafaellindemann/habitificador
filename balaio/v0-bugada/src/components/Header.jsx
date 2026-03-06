import { signIn, signOut } from '../firebase'
import { useAuth } from '../context/AuthContext'
export default function Header(){
const {user}=useAuth()
return (
<header className="container" style={{position:'sticky', top:0, zIndex:20}}>
<div className="card" style={{padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
<div style={{display:'flex',alignItems:'center',gap:12}}>
<div className="badge pulse">🏆<b>Gamificador</b></div>
</div>
<div style={{display:'flex',alignItems:'center',gap:12}}>
{user? (<>
<span style={{color:'var(--muted)'}}>Olá, {user.displayName||'dev'}</span>
<button className="btn btn-secondary" onClick={()=>signOut()}>Sair</button>
</>) : (
<button className="btn btn-primary" onClick={()=>signIn()}>Entrar com Google</button>
)}
</div>
</div>
</header>
)
}