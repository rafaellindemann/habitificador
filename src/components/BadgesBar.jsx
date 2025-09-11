export default function BadgesBar({badges}){
return (
<div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
{badges.map((b,i)=> <span key={i} className="badge">{b.icon} {b.name}</span>)}
</div>
)
}