import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import { TRACKS } from '../../lib/constants.js'
import { Card, Button, Alert, Spinner, PageHeader } from '../../components/shared/UI.jsx'
import { ArrowRight, ArrowLeft, Info } from '@phosphor-icons/react'

export default function AdminPhase() {
  const [config,setConfig]   = useState({})
  const [loading,setLoading] = useState(true)
  const [saving,setSaving]   = useState({})
  const [success,setSuccess] = useState('')
  const [error,setError]     = useState('')

  useEffect(()=>{ load() },[])

  async function load() {
    const { data } = await supabase.from('system_config').select('*')
    const cfg={}; (data||[]).forEach(c=>{ cfg[c.key]=c.value })
    setConfig(cfg); setLoading(false)
  }

  async function setPhase(track, phase) {
    const key=`phase_track_${track}`
    setSaving(s=>({...s,[track]:true})); setError('')
    const { error } = await supabase.from('system_config').upsert({ key, value:phase, updated_at:new Date().toISOString() },{ onConflict:'key' })
    if (error) setError(error.message)
    else { setSuccess(`Track ${track} → ${phase==='final'?'Final Round':'Dept Round'}`); setConfig(c=>({...c,[key]:phase})) }
    setSaving(s=>({...s,[track]:false}))
  }

  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner size={32}/></div>

  const p = 'clamp(14px,4vw,32px)'

  return (
    <div style={{ padding:`16px ${p}` }}>
      <PageHeader title="Phase Control" subtitle="Switch evaluation phases per track"/>

      {error&&<div style={{marginBottom:14}}><Alert type="error" message={error}/></div>}
      {success&&<div style={{marginBottom:14}}><Alert type="success" message={success}/></div>}

      {/* How it works */}
      <Card style={{ marginBottom:20, padding:'16px 18px' }}>
        <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:12 }}>
          <Info size={16} color="var(--accent)" style={{flexShrink:0, marginTop:1}}/>
          <h3 style={{ fontSize:14, fontWeight:700 }}>How Phases Work</h3>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:10 }}>
          <div style={{ background:'var(--bg)', border:'1px solid rgba(79,142,247,.25)', borderRadius:10, padding:'13px 15px' }}>
            <div style={{ fontSize:11, fontFamily:"'JetBrains Mono',monospace", color:'var(--accent)', fontWeight:700, marginBottom:8 }}>PHASE 1 — DEPT ROUND</div>
            <ul style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.9, paddingLeft:14 }}>
              <li>Internal + External judges evaluate</li>
              <li>Each judge sees only their dept teams</li>
              <li>5 criteria × 20 pts = 100 max</li>
            </ul>
          </div>
          <div style={{ background:'var(--bg)', border:'1px solid rgba(245,200,66,.25)', borderRadius:10, padding:'13px 15px' }}>
            <div style={{ fontSize:11, fontFamily:"'JetBrains Mono',monospace", color:'var(--gold)', fontWeight:700, marginBottom:8 }}>PHASE 2 — TRACK FINAL</div>
            <ul style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.9, paddingLeft:14 }}>
              <li>External judges only see all nominees in their track</li>
              <li>Single holistic score 0–100</li>
              <li>Admin assigns track winner</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Track controls */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {[1,2,3].map(track=>{
          const t=TRACKS[track]
          const isFinal=(config[`phase_track_${track}`]||'round1')==='final'
          return (
            <div key={track} style={{
              background:'var(--surface)', border:`1px solid ${t.color}28`,
              borderRadius:14, padding:'18px 20px',
              borderLeft:`4px solid ${t.color}`,
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:`${t.color}14`, border:`1px solid ${t.color}28`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, fontFamily:"'Syne',sans-serif", color:t.color, flexShrink:0 }}>
                    T{track}
                  </div>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Syne',sans-serif" }}>{t.name}</div>
                    <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{t.departments.join(' · ')} · {t.date}</div>
                  </div>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  {/* Status pill */}
                  <div style={{
                    background:isFinal?'rgba(245,200,66,.1)':'rgba(79,142,247,.1)',
                    border:`1px solid ${isFinal?'rgba(245,200,66,.28)':'rgba(79,142,247,.28)'}`,
                    borderRadius:8, padding:'7px 14px',
                    display:'flex', alignItems:'center', gap:6,
                  }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:isFinal?'var(--gold)':'var(--accent)', boxShadow:`0 0 6px ${isFinal?'var(--gold)':'var(--accent)'}` }}/>
                    <span style={{ fontSize:12, fontWeight:700, fontFamily:"'Syne',sans-serif", color:isFinal?'var(--gold)':'var(--accent)' }}>
                      {isFinal?'Final Round':'Dept Round'}
                    </span>
                  </div>

                  {/* Toggle buttons */}
                  <div style={{ display:'flex', gap:6 }}>
                    <button disabled={!isFinal||saving[track]} onClick={()=>setPhase(track,'round1')} style={{
                      padding:'8px 14px', borderRadius:9, fontSize:12, fontFamily:"'Syne',sans-serif", fontWeight:700, cursor:isFinal?'pointer':'not-allowed', opacity:isFinal?1:.4,
                      border:'1px solid rgba(79,142,247,.35)', background:!isFinal?'rgba(79,142,247,.15)':'transparent', color:'var(--accent)',
                      display:'flex', alignItems:'center', gap:5,
                    }}>
                      <ArrowLeft size={12}/> Dept Round
                    </button>
                    <button disabled={isFinal||saving[track]} onClick={()=>setPhase(track,'final')} style={{
                      padding:'8px 14px', borderRadius:9, fontSize:12, fontFamily:"'Syne',sans-serif", fontWeight:700, cursor:!isFinal?'pointer':'not-allowed', opacity:!isFinal?1:.4,
                      border:'1px solid rgba(245,200,66,.35)', background:isFinal?'rgba(245,200,66,.15)':'transparent', color:'var(--gold)',
                      display:'flex', alignItems:'center', gap:5,
                    }}>
                      Final Round <ArrowRight size={12}/>
                    </button>
                  </div>
                </div>
              </div>

              {!isFinal&&(
                <div style={{ marginTop:12, padding:'9px 12px', background:'rgba(245,200,66,.06)', border:'1px solid rgba(245,200,66,.18)', borderRadius:7, fontSize:12, color:'var(--text-3)' }}>
                  ⚠ Make sure nominees are selected (Nominees tab) before switching to Final Round.
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
