import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useBreakpoint } from '../../hooks/useBreakpoint.js'
import {
  SquaresFour, Users, Rows, Trophy, ToggleLeft, ChartBar,
  SignOut, ArrowLeft, ArrowRight, Triangle, List, X
} from '@phosphor-icons/react'

const NAV = [
  { to:'/admin',          icon:SquaresFour, label:'Dashboard',    end:true },
  { to:'/admin/judges',   icon:Users,       label:'Judges'              },
  { to:'/admin/teams',    icon:Rows,        label:'Teams'               },
  { to:'/admin/nominees', icon:Trophy,      label:'Nominees'            },
  { to:'/admin/phase',    icon:ToggleLeft,  label:'Phase Control'       },
  { to:'/admin/results',  icon:ChartBar,    label:'Results'             },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { isMobile, isTablet } = useBreakpoint()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }
  const sideW = collapsed ? 60 : 220

  // ── Mobile: bottom tab bar ────────────────────────────────
  if (isMobile) return (
    <div style={{ minHeight:'100svh', background:'var(--bg)' }}>
      {/* Top bar */}
      <div style={{
        position:'fixed', top:0, left:0, right:0, zIndex:200,
        background:'var(--bg-2)', borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 16px', height:52,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,var(--accent),var(--purple))', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Triangle size={13} weight="fill" color="white"/>
          </div>
          <span style={{ fontSize:15, fontWeight:800, fontFamily:"'Syne',sans-serif" }}>Yukthi '26</span>
          <span className="badge" style={{ color:'var(--purple)', background:'rgba(155,109,255,.12)', border:'1px solid rgba(155,109,255,.25)' }}>Admin</span>
        </div>
        <button onClick={handleLogout} style={{
          background:'rgba(240,92,92,.1)', border:'1px solid rgba(240,92,92,.22)',
          borderRadius:8, padding:'6px 12px', cursor:'pointer',
          color:'var(--red)', fontSize:12, fontWeight:700, fontFamily:"'Syne',sans-serif",
          display:'flex', alignItems:'center', gap:5,
        }}>
          <SignOut size={13}/> Out
        </button>
      </div>

      {/* Content */}
      <main style={{ paddingTop:52, paddingBottom:'calc(64px + env(safe-area-inset-bottom,0px))', minHeight:'100svh' }}>
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:200,
        background:'var(--bg-2)', borderTop:'1px solid var(--border)',
        display:'flex', alignItems:'stretch',
        paddingBottom:'env(safe-area-inset-bottom,0px)',
      }}>
        {NAV.map(({ to, icon:Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
            flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            gap:3, padding:'8px 4px', textDecoration:'none', minWidth:0,
            color: isActive ? 'var(--accent)' : 'var(--text-3)',
            background: isActive ? 'rgba(79,142,247,.06)' : 'transparent',
            borderTop: isActive ? '2px solid var(--accent)' : '2px solid transparent',
            transition:'all .15s',
          })}>
            <Icon size={20} weight="duotone"/>
            <span style={{ fontSize:9, fontFamily:"'Syne',sans-serif", fontWeight:700, textTransform:'uppercase', letterSpacing:'.03em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%', paddingInline:2 }}>{label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )

  // ── Tablet: icon-only sidebar ─────────────────────────────
  // ── Desktop: full sidebar ─────────────────────────────────
  return (
    <div style={{ display:'flex', minHeight:'100svh', background:'var(--bg)' }}>
      <aside style={{
        width: sideW,
        background:'var(--bg-2)', borderRight:'1px solid var(--border)',
        display:'flex', flexDirection:'column',
        transition:'width .28s cubic-bezier(.4,0,.2,1)',
        position:'fixed', top:0, left:0, bottom:0,
        zIndex:100, overflow:'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed?'16px 12px':'18px 16px',
          borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', gap:10,
          justifyContent: collapsed?'center':'flex-start',
        }}>
          <div style={{ width:32, height:32, borderRadius:9, flexShrink:0, background:'linear-gradient(135deg,var(--accent),var(--purple))', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Triangle size={15} weight="fill" color="white"/>
          </div>
          {!collapsed&&(
            <div>
              <div style={{ fontSize:14, fontWeight:800, fontFamily:"'Syne',sans-serif" }}>Yukthi '26</div>
              <div style={{ fontSize:9, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace", textTransform:'uppercase', letterSpacing:'.06em' }}>Admin Panel</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'8px 6px', overflowY:'auto' }}>
          {NAV.map(({ to, icon:Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:9,
                padding:'9px 10px', borderRadius:9, marginBottom:2,
                textDecoration:'none', fontSize:13, fontWeight:isActive?700:400,
                fontFamily:"'Syne',sans-serif",
                color:isActive?'var(--accent)':'var(--text-3)',
                background:isActive?'var(--accent-glow)':'transparent',
                border:isActive?'1px solid rgba(79,142,247,.2)':'1px solid transparent',
                transition:'all .12s',
                justifyContent:collapsed?'center':'flex-start',
                overflow:'hidden',
              })}>
              <Icon size={18} weight="duotone" style={{flexShrink:0}}/>
              {!collapsed&&<span style={{whiteSpace:'nowrap'}}>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding:collapsed?'8px 6px':'8px 10px', borderTop:'1px solid var(--border)' }}>
          {!collapsed&&(
            <div style={{ background:'var(--surface)', borderRadius:9, padding:'8px 11px', marginBottom:7, border:'1px solid var(--border)' }}>
              <div style={{ fontSize:12, fontWeight:700, fontFamily:"'Syne',sans-serif", color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.full_name}</div>
              <div style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>Administrator</div>
            </div>
          )}
          <div style={{ display:'flex', gap:5, justifyContent:collapsed?'center':'flex-start' }}>
            <button onClick={()=>setCollapsed(c=>!c)} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-2)', flexShrink:0 }}>
              {collapsed?<ArrowRight size={13}/>:<ArrowLeft size={13}/>}
            </button>
            {!collapsed&&(
              <button onClick={handleLogout} style={{ flex:1, background:'rgba(240,92,92,.1)', border:'1px solid rgba(240,92,92,.22)', borderRadius:8, padding:'6px 10px', cursor:'pointer', color:'var(--red)', fontSize:11, fontWeight:700, fontFamily:"'Syne',sans-serif", display:'flex', alignItems:'center', gap:5 }}>
                <SignOut size={12}/> Sign Out
              </button>
            )}
          </div>
        </div>
      </aside>

      <main style={{ flex:1, marginLeft:sideW, transition:'margin-left .28s cubic-bezier(.4,0,.2,1)', minHeight:'100svh' }}>
        <Outlet />
      </main>
    </div>
  )
}
