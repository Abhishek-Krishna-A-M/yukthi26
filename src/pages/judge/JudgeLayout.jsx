import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../lib/supabase.js'
import { TrackBadge } from '../../components/shared/UI.jsx'
import { Triangle, SignOut, Trophy, ClipboardText, UserCircle } from '@phosphor-icons/react'

export default function JudgeLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [phase, setPhase] = useState('round1')

  useEffect(() => {
    if (user?.track) fetchPhase()
    const ch = supabase.channel('phase-watch')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_config' }, fetchPhase)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user])

  async function fetchPhase() {
    const { data } = await supabase
      .from('system_config').select('value')
      .eq('key', `phase_track_${user?.track}`).single()
    if (data) setPhase(data.value)
  }

  const isFinal    = phase === 'final'
  const isExternal = user?.evaluator_type === 'external'
  const canFinal   = isFinal && isExternal

  const navItems = [
    { to: '/judge',         label: 'Scoring',  icon: ClipboardText, end: true,  color: 'var(--accent)'  },
    ...(canFinal ? [{ to: '/judge/final',   label: 'Final',    icon: Trophy,       end: false, color: 'var(--gold)'   }] : []),
    { to: '/judge/profile', label: 'Profile',  icon: UserCircle,   end: false, color: 'var(--purple)' },
  ]

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', overflowX: 'hidden' }}>
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header style={{
        background: 'var(--bg-2)',
        borderBottom: '1px solid var(--border)',
        height: 52,
        position: 'sticky', top: 0, zIndex: 100,
        /* key: never let header exceed viewport */
        width: '100%',
        display: 'flex', alignItems: 'center',
        padding: '0 14px',
        gap: 8,
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <Link to="/leaderboard" target="_blank" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          textDecoration: 'none', flexShrink: 0,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: 'linear-gradient(135deg,var(--accent),var(--purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Triangle size={12} weight="fill" color="white" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: 'var(--text)', whiteSpace: 'nowrap' }}>
            Yukthi '26
          </span>
        </Link>

        {/* Phase pill — hidden on very small screens via a min-width check */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 6, flexShrink: 0,
          background: isFinal ? 'rgba(245,200,66,.1)' : 'rgba(79,142,247,.1)',
          border: `1px solid ${isFinal ? 'rgba(245,200,66,.25)' : 'rgba(79,142,247,.25)'}`,
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
            background: isFinal ? 'var(--gold)' : 'var(--accent)',
          }} />
          <span style={{
            fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
            color: isFinal ? 'var(--gold)' : 'var(--accent)', textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}>
            {isFinal ? 'Final' : 'Dept'}
          </span>
        </div>

        {user?.track && <TrackBadge track={user.track} />}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Name — truncated, only shown if space allows */}
        <div style={{
          fontSize: 11, fontWeight: 600, color: 'var(--text-2)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: 100, flexShrink: 1,
        }}>
        </div>

        {/* Sign out */}
        <button onClick={() => { logout(); navigate('/login') }} style={{
          background: 'rgba(240,92,92,.1)', border: '1px solid rgba(240,92,92,.2)',
          borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
          color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <SignOut size={14} />
        </button>
      </header>

      {/* ── Page content ────────────────────────────────────── */}
      <main style={{
        /* never wider than viewport */
        width: '100%',
        maxWidth: 680,
        margin: '0 auto',
        padding: '14px 14px',
        /* room for fixed bottom nav */
        paddingBottom: 'calc(62px + env(safe-area-inset-bottom,0px) + 14px)',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}>
        <h1 className="font-bold !pb-2">{user?.full_name}</h1>
        <Outlet context={{ phase, fetchPhase }} />
      </main>

      {/* ── Bottom tab bar ───────────────────────────────────── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        background: 'var(--bg-2)', borderTop: '1px solid var(--border)',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom,0px)',
      }}>
        {navItems.map(n => (
          <NavLink key={n.to} to={n.to} end={n.end} style={({ isActive }) => ({
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 3, padding: '9px 4px', textDecoration: 'none',
            color: isActive ? n.color : 'var(--text-3)',
            background: isActive ? `${n.color}08` : 'transparent',
            borderTop: isActive ? `2px solid ${n.color}` : '2px solid transparent',
            transition: 'all .15s',
          })}>
            <n.icon size={20} weight="duotone" />
            <span style={{
              fontSize: 9, fontFamily: "'Syne',sans-serif",
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em',
            }}>
              {n.label}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
