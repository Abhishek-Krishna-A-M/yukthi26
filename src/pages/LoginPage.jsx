import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Triangle, Eye, EyeSlash, Warning } from '@phosphor-icons/react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username || !password) { setError('Please fill in all fields'); return }
    setLoading(true); setError('')
    try {
      const user = await login(username, password)
      navigate(user.role === 'admin' ? '/admin' : '/judge', { replace: true })
    } catch(err) {
      setError(err.message || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', position: 'relative', overflow: 'hidden',
    }}>
      {/* Grid background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)',
        backgroundSize: '56px 56px', opacity: .12,
      }} />
      {/* Glow blobs */}
      <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(79,142,247,.07) 0%,transparent 70%)', top:-100, left:-100, pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(155,109,255,.05) 0%,transparent 70%)', bottom:-50, right:-50, pointerEvents:'none' }} />

      <div className="animate-fade-up" style={{ position:'relative', zIndex:1, width:'100%', maxWidth:420, padding:'0 20px' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            width:60, height:60, borderRadius:16, marginBottom:18,
            background:'linear-gradient(135deg,var(--accent) 0%,var(--purple) 100%)',
            boxShadow:'0 8px 32px rgba(79,142,247,.35)',
          }}>
            <Triangle size={28} weight="fill" color="white" />
          </div>
          <h1 style={{ fontSize:30, fontWeight:800, letterSpacing:'-.02em', lineHeight:1 }}>
            Yukthi <span className="gradient-text">2026</span>
          </h1>
          <p style={{ color:'var(--text-3)', fontSize:12, marginTop:8, letterSpacing:'.06em', textTransform:'uppercase', fontFamily:"'JetBrains Mono',monospace" }}>
            Project Expo Evaluation System
          </p>
        </div>

        {/* Card */}
        <div style={{
          background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:20, padding:'32px 30px',
          boxShadow:'0 24px 80px rgba(0,0,0,.45)',
        }}>
          <h2 style={{ fontSize:19, fontWeight:700, marginBottom:5 }}>Sign In</h2>
          <p style={{ color:'var(--text-3)', fontSize:13, marginBottom:26 }}>Access your evaluation portal</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-3)', marginBottom:7, textTransform:'uppercase', letterSpacing:'.08em', fontFamily:"'Syne',sans-serif" }}>
                Username
              </label>
              <input
                type="text" value={username} onChange={e=>setUsername(e.target.value)}
                placeholder="Enter your username" autoComplete="username"
                style={{
                  width:'100%', padding:'11px 14px',
                  background:'var(--bg)', border:'1px solid var(--border)',
                  borderRadius:10, color:'var(--text)', fontSize:14, outline:'none',
                  fontFamily:"'DM Sans',sans-serif", transition:'border-color .2s, box-shadow .2s',
                }}
                onFocus={e=>{e.target.style.borderColor='var(--accent)';e.target.style.boxShadow='0 0 0 3px var(--accent-glow)'}}
                onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none'}}
              />
            </div>

            <div style={{ marginBottom:22 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-3)', marginBottom:7, textTransform:'uppercase', letterSpacing:'.08em', fontFamily:"'Syne',sans-serif" }}>
                Password
              </label>
              <div style={{ position:'relative' }}>
                <input
                  type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  style={{
                    width:'100%', padding:'11px 42px 11px 14px',
                    background:'var(--bg)', border:'1px solid var(--border)',
                    borderRadius:10, color:'var(--text)', fontSize:14, outline:'none',
                    fontFamily:"'DM Sans',sans-serif", transition:'border-color .2s, box-shadow .2s',
                  }}
                  onFocus={e=>{e.target.style.borderColor='var(--accent)';e.target.style.boxShadow='0 0 0 3px var(--accent-glow)'}}
                  onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none'}}
                />
                <button type="button" onClick={()=>setShowPw(p=>!p)} style={{
                  position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', color:'var(--text-3)',
                  display:'flex', alignItems:'center',
                }}>
                  {showPw ? <EyeSlash size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background:'rgba(240,92,92,.1)', border:'1px solid rgba(240,92,92,.3)',
                borderRadius:8, padding:'9px 13px', marginBottom:16,
                fontSize:13, color:'var(--red)', display:'flex', alignItems:'center', gap:8,
              }}>
                <Warning size={15} weight="fill" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width:'100%', padding:'12px',
              background: loading ? 'var(--border)' : 'linear-gradient(135deg,var(--accent) 0%,#3a7ae0 100%)',
              border:'none', borderRadius:10,
              color:'white', fontSize:14, fontWeight:700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily:"'Syne',sans-serif",
              transition:'all .2s',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(79,142,247,.3)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}>
              {loading ? (
                <>
                  <div style={{ width:15, height:15, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'white', borderRadius:'50%' }} className="animate-spin" />
                  Authenticating...
                </>
              ) : 'Sign In →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', marginTop:22, color:'var(--text-3)', fontSize:11, fontFamily:"'JetBrains Mono',monospace" }}>
          JEC · Yukthi 2026 · Project Expo
        </p>
      </div>
    </div>
  )
}
