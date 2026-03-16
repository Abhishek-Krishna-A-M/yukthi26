import { X, Warning, CheckCircle, Info } from '@phosphor-icons/react'

// ── Card ──────────────────────────────────────────────────
export function Card({ children, style = {}, className = '' }) {
  return (
    <div className={`card ${className}`} style={style}>{children}</div>
  )
}

// ── Button ─────────────────────────────────────────────────
export function Button({ children, variant='primary', size='md', disabled, onClick, style={}, type='button', fullWidth=false }) {
  const pad = { sm:'7px 13px', md:'10px 18px', lg:'13px 24px' }[size]
  const fs  = { sm:12, md:13, lg:14 }[size]
  const vs = {
    primary: { background:'linear-gradient(135deg,#4f8ef7,#3a7ae0)', color:'#fff', border:'none', boxShadow:'0 4px 14px rgba(79,142,247,.28)' },
    secondary: { background:'var(--surface-2)', color:'var(--text)', border:'1px solid var(--border)' },
    danger:  { background:'rgba(240,92,92,.12)', color:'var(--red)', border:'1px solid rgba(240,92,92,.28)' },
    ghost:   { background:'transparent', color:'var(--text-2)', border:'1px solid var(--border)' },
    success: { background:'rgba(61,214,140,.12)', color:'var(--green)', border:'1px solid rgba(61,214,140,.28)' },
    gold:    { background:'linear-gradient(135deg,#f5c842,#e87d3e)', color:'#08090f', border:'none', boxShadow:'0 4px 14px rgba(245,200,66,.24)' },
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{
      ...vs[variant], padding:pad, fontSize:fs, borderRadius:10,
      fontWeight:700, fontFamily:"'Syne',sans-serif", cursor:disabled?'not-allowed':'pointer',
      opacity:disabled?.45:1, transition:'all .15s', display:'inline-flex',
      alignItems:'center', gap:6, whiteSpace:'nowrap', outline:'none',
      width: fullWidth?'100%':'auto', justifyContent: fullWidth?'center':'flex-start',
      ...style,
    }}>{children}</button>
  )
}

// ── Spinner ────────────────────────────────────────────────
export function Spinner({ size=24, color='var(--accent)' }) {
  return (
    <div className="animate-spin" style={{
      width:size, height:size, flexShrink:0,
      border:`2.5px solid var(--border)`,
      borderTopColor:color, borderRadius:'50%',
    }} />
  )
}

// ── Modal (sheet on mobile) ────────────────────────────────
export function Modal({ open, onClose, title, children, width=520 }) {
  if (!open) return null
  const isMobile = window.innerWidth < 640
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{
      position:'fixed', inset:0, zIndex:1000,
      background:'rgba(0,0,0,.72)', backdropFilter:'blur(5px)',
      display:'flex', alignItems: isMobile?'flex-end':'center',
      justifyContent:'center', padding: isMobile?0:20,
    }}>
      <div className={isMobile?'animate-slide-up':'animate-pop-in'} style={{
        background:'var(--bg-2)', border:'1px solid var(--border)',
        borderRadius: isMobile?'20px 20px 0 0':20,
        width:'100%', maxWidth: isMobile?'100%':width,
        boxShadow:'0 -8px 60px rgba(0,0,0,.5)',
        maxHeight: isMobile?'92svh':'88svh',
        display:'flex', flexDirection:'column',
      }}>
        {/* Handle bar on mobile */}
        {isMobile && <div style={{ width:40, height:4, borderRadius:2, background:'var(--border-2)', margin:'12px auto 0', flexShrink:0 }} />}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'16px 20px', borderBottom:'1px solid var(--border)', flexShrink:0,
        }}>
          <h3 style={{ fontSize:17, fontWeight:700 }}>{title}</h3>
          <button onClick={onClose} style={{
            background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:8, width:30, height:30, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-2)',
          }}><X size={14}/></button>
        </div>
        <div style={{ padding:20, overflowY:'auto', paddingBottom:`calc(20px + var(--safe-bottom))` }}>{children}</div>
      </div>
    </div>
  )
}

// ── Input ──────────────────────────────────────────────────
export function Input({ label, value, onChange, type='text', placeholder, required, style={} }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <Label text={label} required={required} />}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="field-input" style={style} />
    </div>
  )
}

// ── Select ─────────────────────────────────────────────────
export function Select({ label, value, onChange, options, required }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <Label text={label} required={required} />}
      <select value={value} onChange={onChange} className="field-input" style={{ cursor:'pointer' }}>
        {options.map(o=>(
          <option key={o.value} value={o.value} style={{ background:'var(--bg-2)' }}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function Label({ text, required }) {
  return (
    <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-3)', marginBottom:7, textTransform:'uppercase', letterSpacing:'.08em', fontFamily:"'Syne',sans-serif" }}>
      {text}{required&&<span style={{color:'var(--red)',marginLeft:3}}>*</span>}
    </label>
  )
}

// ── Alert ──────────────────────────────────────────────────
export function Alert({ type='error', message }) {
  if (!message) return null
  const m = {
    error:   { bg:'rgba(240,92,92,.1)',  bdr:'rgba(240,92,92,.28)',  c:'var(--red)',    I:Warning },
    success: { bg:'rgba(61,214,140,.1)', bdr:'rgba(61,214,140,.28)', c:'var(--green)',  I:CheckCircle },
    info:    { bg:'rgba(79,142,247,.1)', bdr:'rgba(79,142,247,.28)', c:'var(--accent)', I:Info },
  }
  const { bg, bdr, c, I } = m[type]||m.error
  return (
    <div style={{ background:bg, border:`1px solid ${bdr}`, borderRadius:9, padding:'10px 14px', fontSize:13, color:c, display:'flex', alignItems:'center', gap:8, lineHeight:1.4 }}>
      <I size={15} weight="fill" style={{flexShrink:0}}/> {message}
    </div>
  )
}

// ── StatCard ───────────────────────────────────────────────
export function StatCard({ label, value, sub, color='var(--accent)', icon }) {
  return (
    <div className="card" style={{ padding:'16px 18px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ minWidth:0 }}>
          <p style={{ fontSize:10, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.08em', fontFamily:"'Syne',sans-serif", fontWeight:700 }}>{label}</p>
          <p style={{ fontSize:28, fontWeight:800, color, fontFamily:"'Syne',sans-serif", lineHeight:1.1, marginTop:6 }}>{value}</p>
          {sub&&<p style={{ fontSize:11, color:'var(--text-3)', marginTop:3 }}>{sub}</p>}
        </div>
        {icon&&<div style={{ background:`${color}18`, border:`1px solid ${color}28`, borderRadius:10, padding:9, color, flexShrink:0 }}>{icon}</div>}
      </div>
    </div>
  )
}

// ── TrackBadge ─────────────────────────────────────────────
export function TrackBadge({ track }) {
  const c = {1:'#4f8ef7',2:'#3dd68c',3:'#f5c842'}[track]||'#8e9dc0'
  return <span className="badge" style={{ color:c, background:`${c}18`, border:`1px solid ${c}28` }}>T{track}</span>
}

// ── DeptBadge ──────────────────────────────────────────────
export function DeptBadge({ dept }) {
  return <span className="badge" style={{ color:'var(--text-2)', background:'var(--surface-2)', border:'1px solid var(--border)' }}>{dept}</span>
}

// ── LiveBadge ──────────────────────────────────────────────
export function LiveBadge() {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:100, background:'rgba(61,214,140,.1)', border:'1px solid rgba(61,214,140,.28)', fontSize:10, fontWeight:700, color:'var(--green)', fontFamily:"'JetBrains Mono',monospace", letterSpacing:'.06em' }}>
      <span className="live-dot" style={{ width:5, height:5, borderRadius:'50%', background:'var(--green)', display:'inline-block', flexShrink:0 }} />
      LIVE
    </span>
  )
}

// ── RankMedal ──────────────────────────────────────────────
export function RankMedal({ rank }) {
  if (rank===1) return <span style={{fontSize:18}}>🥇</span>
  if (rank===2) return <span style={{fontSize:18}}>🥈</span>
  if (rank===3) return <span style={{fontSize:18}}>🥉</span>
  return <span style={{ fontSize:12, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>#{rank}</span>
}

// ── PageHeader ─────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:20 }}>
      <div style={{ minWidth:0 }}>
        <h1 style={{ fontSize:22, fontWeight:800, lineHeight:1.1 }}>{title}</h1>
        {subtitle&&<p style={{ color:'var(--text-3)', fontSize:13, marginTop:4 }}>{subtitle}</p>}
      </div>
      {action&&<div style={{ flexShrink:0 }}>{action}</div>}
    </div>
  )
}

// ── EmptyState ─────────────────────────────────────────────
export function EmptyState({ icon, title, description }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 20px', textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:12, background:'var(--surface-2)', borderRadius:16, width:68, height:68, display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</div>
      <h3 style={{ fontSize:16, fontWeight:700, marginBottom:5 }}>{title}</h3>
      <p style={{ color:'var(--text-3)', fontSize:13, maxWidth:280 }}>{description}</p>
    </div>
  )
}

// ── Mobile card row (replaces table rows on mobile) ────────
export function MobileCard({ children, style={} }) {
  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:12, padding:'14px 16px', marginBottom:8, ...style,
    }}>{children}</div>
  )
}
