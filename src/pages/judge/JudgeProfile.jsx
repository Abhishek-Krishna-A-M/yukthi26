/**
 * Judge Profile — change own password
 */
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../lib/supabase.js'
import { Card, Button, Alert, DeptBadge, TrackBadge } from '../../components/shared/UI.jsx'
import { Key, User, ShieldCheck } from '@phosphor-icons/react'

export default function JudgeProfile() {
  const { user } = useAuth()
  const [current, setCurrent] = useState('')
  const [newPw,   setNewPw]   = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  async function changePassword(e) {
    e.preventDefault()
    if (!current||!newPw||!confirm){ setError('Fill all fields'); return }
    if (newPw.length<6){ setError('New password must be at least 6 characters'); return }
    if (newPw!==confirm){ setError('Passwords do not match'); return }
    setSaving(true); setError(''); setSuccess('')

    // Verify current password via login RPC
    const { data } = await supabase.rpc('login_judge',{ p_username:user.username, p_password:current })
    if (!data||data.length===0){ setSaving(false); setError('Current password is incorrect'); return }

    const { error } = await supabase.rpc('update_judge_password',{ p_judge_id:user.id, p_password:newPw })
    if (error) setError(error.message)
    else { setSuccess('Password updated successfully'); setCurrent(''); setNewPw(''); setConfirm('') }
    setSaving(false)
  }

  return (
    <div style={{ maxWidth:480, margin:'0 auto', padding:'8px 0 32px' }}>
      {/* Profile card */}
      <Card style={{ marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:18 }}>
          <div style={{
            width:52, height:52, borderRadius:14,
            background:'linear-gradient(135deg,var(--accent),var(--purple))',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:20, fontWeight:800, color:'white', fontFamily:"'Syne',sans-serif",
            flexShrink:0,
          }}>
            {user?.full_name?.[0]?.toUpperCase()||'J'}
          </div>
          <div style={{ minWidth:0 }}>
            <h2 style={{ fontSize:17, fontWeight:800, marginBottom:3 }}>{user?.full_name}</h2>
            <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace", marginBottom:6 }}>@{user?.username}</div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              <span className="badge" style={{
                color:user?.role==='admin'?'var(--purple)':'var(--accent)',
                background:user?.role==='admin'?'rgba(155,109,255,.12)':'rgba(79,142,247,.12)',
                border:`1px solid ${user?.role==='admin'?'rgba(155,109,255,.25)':'rgba(79,142,247,.25)'}`,
              }}>{user?.role}</span>
              {user?.evaluator_type&&<span className="badge" style={{
                color:user?.evaluator_type==='external'?'var(--gold)':'var(--green)',
                background:user?.evaluator_type==='external'?'rgba(245,200,66,.12)':'rgba(61,214,140,.12)',
                border:`1px solid ${user?.evaluator_type==='external'?'rgba(245,200,66,.25)':'rgba(61,214,140,.25)'}`,
              }}>{user?.evaluator_type}</span>}
              {user?.track&&<TrackBadge track={user.track}/>}
              {(user?.departments||[]).map(d=><DeptBadge key={d} dept={d}/>)}
            </div>
          </div>
        </div>
        <div style={{ background:'var(--bg)', borderRadius:9, padding:'10px 14px', border:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
          <ShieldCheck size={15} color="var(--green)"/>
          <span style={{ fontSize:12, color:'var(--text-2)' }}>Session active · secured with bcrypt</span>
        </div>
      </Card>

      {/* Change password */}
      <Card>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
          <Key size={16} color="var(--accent)"/>
          <h3 style={{ fontSize:15, fontWeight:800 }}>Change Password</h3>
        </div>

        <form onSubmit={changePassword}>
          {[
            { label:'Current Password', value:current, onChange:setCurrent, placeholder:'Your current password' },
            { label:'New Password',     value:newPw,   onChange:setNewPw,   placeholder:'At least 6 characters' },
            { label:'Confirm New',      value:confirm, onChange:setConfirm, placeholder:'Repeat new password' },
          ].map(f=>(
            <div key={f.label} style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-3)', marginBottom:7, textTransform:'uppercase', letterSpacing:'.08em', fontFamily:"'Syne',sans-serif" }}>{f.label}</label>
              <input type="password" value={f.value} onChange={e=>f.onChange(e.target.value)}
                placeholder={f.placeholder} className="field-input"/>
            </div>
          ))}

          {error&&<div style={{marginBottom:12}}><Alert type="error" message={error}/></div>}
          {success&&<div style={{marginBottom:12}}><Alert type="success" message={success}/></div>}

          <button type="submit" disabled={saving} style={{
            width:'100%', padding:'13px', background:saving?'var(--border)':'linear-gradient(135deg,var(--accent),#3a7ae0)',
            border:'none', borderRadius:10, color:'white', fontSize:14, fontWeight:700,
            cursor:saving?'not-allowed':'pointer', fontFamily:"'Syne',sans-serif",
            display:'flex', alignItems:'center', justifyContent:'center', gap:7,
            boxShadow:saving?'none':'0 4px 16px rgba(79,142,247,.28)',
          }}>
            {saving?'Updating...':'Update Password'}
          </button>
        </form>
      </Card>
    </div>
  )
}
