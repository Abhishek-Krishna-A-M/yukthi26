import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase.js'
import { TRACKS, MAX_NOMINEES, RANK_LABELS, FINAL_SCORE_MAX } from '../../lib/constants.js'
import { Card, Button, Alert, Spinner, DeptBadge, TrackBadge, LiveBadge, RankMedal, PageHeader } from '../../components/shared/UI.jsx'
import { useBreakpoint } from '../../hooks/useBreakpoint.js'
import { Trophy, ArrowsClockwise } from '@phosphor-icons/react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const TIP = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null
  return <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:9, padding:'8px 12px', fontSize:12 }}>
    <p style={{ fontWeight:700, marginBottom:3, color:'var(--text)' }}>{label}</p>
    {payload.map((p,i)=><p key={i} style={{color:p.color}}>{p.name}: {p.value?.toFixed?.(1)??p.value}</p>)}
  </div>
}

const DEPT_COLORS = { CE:'#4f8ef7',ME:'#3dd68c',MRE:'#f5c842',EEE:'#9b6dff',ECE:'#f05c5c',RA:'#e87d3e',AD:'#4f8ef7','CSE-A':'#3dd68c','CSE-B':'#f5c842' }

export default function AdminResults() {
  const { isMobile } = useBreakpoint()
  const [trackData,setTrackData] = useState({})
  const [nominees,setNominees]   = useState([])
  const [finalScores,setFinalScores] = useState([])
  const [loading,setLoading]     = useState(true)
  const [saving,setSaving]       = useState({})
  const [error,setError]         = useState('')
  const [success,setSuccess]     = useState('')
  const [activeTrack,setActiveTrack] = useState(1)
  const [lastUpdate,setLastUpdate] = useState(null)

  const fetchAll = useCallback(async ()=>{
    const [nR,fsR] = await Promise.all([
      supabase.from('nominees').select('*, teams(*)'),
      supabase.from('final_scores').select('*, judges(full_name,evaluator_type)'),
    ])
    const noms=nR.data||[], fs=fsR.data||[]
    setNominees(noms); setFinalScores(fs)
    const td={}
    for (const tr of [1,2,3]) {
      td[tr] = noms.filter(n=>n.track===tr).map(n=>{
        const sc=fs.filter(s=>s.team_id===n.team_id)
        const avg=sc.length?sc.reduce((s,x)=>s+x.score,0)/sc.length:0
        return { ...n, finalAvg:parseFloat(avg.toFixed(2)), judgeCount:sc.length, scores:sc }
      }).sort((a,b)=>b.finalAvg-a.finalAvg)
    }
    setTrackData(td); setLastUpdate(new Date()); setLoading(false)
  },[])

  useEffect(()=>{
    fetchAll()
    const ch = supabase.channel('results-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'final_scores'},()=>fetchAll())
      .on('postgres_changes',{event:'*',schema:'public',table:'nominees'},   ()=>fetchAll())
      .subscribe()
    return ()=>supabase.removeChannel(ch)
  },[fetchAll])

  async function setTrackWinner(nom) {
    setSaving(s=>({...s,[nom.team_id]:true})); setError('')
    try {
      const tNoms=nominees.filter(n=>n.track===nom.track)
      await supabase.from('nominees').update({is_track_winner:false,rank:null}).in('team_id',tNoms.map(n=>n.team_id))
      await supabase.from('nominees').update({is_track_winner:true}).eq('team_id',nom.team_id)
      for (const dept of TRACKS[nom.track].departments) {
        const dNoms=tNoms.filter(n=>n.department===dept&&n.team_id!==nom.team_id).map(n=>{
          const sc=finalScores.filter(fs=>fs.team_id===n.team_id)
          return { ...n, avg:sc.length?sc.reduce((s,x)=>s+x.score,0)/sc.length:0 }
        }).sort((a,b)=>b.avg-a.avg)
        for (let i=0;i<dNoms.length;i++) await supabase.from('nominees').update({rank:i+1}).eq('team_id',dNoms[i].team_id)
      }
      setSuccess(`${nom.teams?.project_title} set as Track ${nom.track} Winner!`); fetchAll()
    } catch(e){ setError(e.message) }
    setSaving(s=>({...s,[nom.team_id]:false}))
  }

  async function clearWinner(track) {
    setSaving(s=>({...s,[`c${track}`]:true}))
    const ids=nominees.filter(n=>n.track===track).map(n=>n.team_id)
    if (ids.length) await supabase.from('nominees').update({is_track_winner:false,rank:null}).in('team_id',ids)
    setSuccess(`Track ${track} winner cleared`); fetchAll()
    setSaving(s=>({...s,[`c${track}`]:false}))
  }

  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner size={32}/></div>

  const cur=trackData[activeTrack]||[]
  const winner=cur.find(n=>n.is_track_winner)
  const chartData=cur.map(n=>({ name:n.teams?.registration_number?.split('-').pop()||'?', dept:n.department, score:n.finalAvg, full:n.teams?.project_title }))

  const p = 'clamp(14px,4vw,32px)'

  return (
    <div style={{ padding:`16px ${p}` }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
            <h1 style={{ fontSize:isMobile?20:24, fontWeight:800 }}>Results</h1>
            <LiveBadge/>
          </div>
          {!isMobile&&lastUpdate&&<p style={{ color:'var(--text-3)', fontSize:12, fontFamily:"'JetBrains Mono',monospace" }}>Updated {lastUpdate.toLocaleTimeString()}</p>}
        </div>
        <button onClick={fetchAll} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:9, padding:'7px 12px', cursor:'pointer', color:'var(--text-2)', fontSize:12, fontFamily:"'Syne',sans-serif", display:'flex', alignItems:'center', gap:5 }}>
          <ArrowsClockwise size={13}/>{!isMobile&&' Refresh'}
        </button>
      </div>

      {error&&<div style={{marginBottom:12}}><Alert type="error" message={error}/></div>}
      {success&&<div style={{marginBottom:12}}><Alert type="success" message={success}/></div>}

      {/* Track tabs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
        {[1,2,3].map(tr=>{
          const t=TRACKS[tr], hw=(trackData[tr]||[]).some(n=>n.is_track_winner)
          return (
            <button key={tr} onClick={()=>setActiveTrack(tr)} style={{
              padding:isMobile?'11px 8px':'13px 16px', borderRadius:12, fontFamily:"'Syne',sans-serif",
              fontSize:isMobile?12:13, fontWeight:700, cursor:'pointer', textAlign:'left',
              border:activeTrack===tr?`1px solid ${t.color}`:'1px solid var(--border)',
              background:activeTrack===tr?`${t.color}10`:'var(--surface)',
              color:activeTrack===tr?t.color:'var(--text-3)',
            }}>
              <div>{t.name}</div>
              {hw&&<div style={{ fontSize:9, fontFamily:"'JetBrains Mono',monospace", color:'var(--gold)', marginTop:2 }}>🏆 Set</div>}
            </button>
          )
        })}
      </div>

      {/* Winner banner */}
      {winner&&(
        <div className="animate-fade-in" style={{
          background:'linear-gradient(135deg,rgba(245,200,66,.1),rgba(232,125,62,.07))',
          border:'1px solid rgba(245,200,66,.35)', borderRadius:14, padding:'16px 20px', marginBottom:14,
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:30 }}>🏆</span>
            <div>
              <div style={{ fontSize:10, color:'var(--gold)', fontFamily:"'JetBrains Mono',monospace", fontWeight:700, marginBottom:3 }}>TRACK {activeTrack} WINNER</div>
              <div style={{ fontSize:isMobile?15:18, fontWeight:800 }}>{winner.teams?.project_title}</div>
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:3, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                <span style={{ fontFamily:"'JetBrains Mono',monospace" }}>{winner.teams?.registration_number}</span>
                <DeptBadge dept={winner.department}/>
                <span>Score: <strong style={{color:'var(--gold)'}}>{winner.finalAvg||'—'}</strong>/{FINAL_SCORE_MAX}</span>
              </div>
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={()=>clearWinner(activeTrack)} disabled={saving[`c${activeTrack}`]}>Clear</Button>
        </div>
      )}

      {/* Chart */}
      {chartData.length>0&&!isMobile&&(
        <Card style={{ marginBottom:14 }}>
          <p style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>Final Scores — Track {activeTrack}</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={30}>
              <XAxis dataKey="name" tick={{fill:'var(--text-3)',fontSize:10,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,100]} tick={{fill:'var(--text-3)',fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip content={<TIP/>}/>
              <Bar dataKey="score" name="Score" radius={[5,5,0,0]}>
                {chartData.map((d,i)=><Cell key={i} fill={DEPT_COLORS[d.dept]||'var(--accent)'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Rankings */}
      <Card style={{ marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <h3 style={{ fontSize:15, fontWeight:800 }}>Final Rankings</h3>
          <span style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>{cur.length} nominees</span>
        </div>

        {cur.length===0 ? (
          <div style={{ textAlign:'center', padding:'36px 20px', color:'var(--text-3)' }}>
            <Trophy size={36} style={{marginBottom:10,opacity:.4}}/>
            <p style={{ fontWeight:600 }}>No nominees for Track {activeTrack}</p>
            <p style={{ fontSize:12, marginTop:4 }}>Go to Nominees tab to select teams</p>
          </div>
        ) : isMobile ? (
          cur.map((n,i)=>(
            <div key={n.id} style={{ padding:'12px 0', borderBottom:i<cur.length-1?'1px solid var(--border)':'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:30, textAlign:'center', flexShrink:0 }}><RankMedal rank={i+1}/></div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.teams?.project_title}</div>
                  <div style={{ display:'flex', gap:5, marginTop:4, alignItems:'center', flexWrap:'wrap' }}>
                    <DeptBadge dept={n.department}/>
                    {n.is_track_winner&&<span className="badge" style={{color:'var(--gold)',background:'rgba(245,200,66,.12)',border:'1px solid rgba(245,200,66,.28)'}}>🏆 Winner</span>}
                    {n.rank&&!n.is_track_winner&&<span className="badge" style={{color:RANK_LABELS[n.rank]?.color||'var(--text-3)',background:RANK_LABELS[n.rank]?.bg||'transparent',border:`1px solid ${RANK_LABELS[n.rank]?.color||'var(--border)'}38`}}>{['1st','2nd','3rd'][n.rank-1]}</span>}
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:20, fontWeight:800, fontFamily:"'Syne',sans-serif", color:n.finalAvg>0?'var(--accent)':'var(--text-3)' }}>{n.finalAvg||'—'}</div>
                  <div style={{ fontSize:10, color:'var(--text-3)' }}>{n.judgeCount} judges</div>
                  {!n.is_track_winner&&(
                    <button onClick={()=>setTrackWinner(n)} disabled={saving[n.team_id]} style={{
                      marginTop:6, padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700,
                      border:'1px solid rgba(245,200,66,.3)', background:'transparent', color:'var(--gold)',
                      cursor:'pointer', fontFamily:"'Syne',sans-serif",
                    }}>
                      {saving[n.team_id]?'…':'🏆 Win'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <table>
            <thead><tr><th>Pos</th><th>Project</th><th>Dept</th><th>Score</th><th>Judges</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {cur.map((n,i)=>(
                <tr key={n.id} style={{ background:n.is_track_winner?'rgba(245,200,66,.025)':'transparent' }}>
                  <td><RankMedal rank={i+1}/></td>
                  <td><div style={{ fontWeight:600, color:'var(--text)' }}>{n.teams?.project_title}</div><div style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>{n.teams?.registration_number}</div></td>
                  <td><DeptBadge dept={n.department}/></td>
                  <td><span style={{ fontSize:19, fontWeight:800, fontFamily:"'Syne',sans-serif", color:n.finalAvg>0?'var(--accent)':'var(--text-3)' }}>{n.finalAvg||'—'}</span></td>
                  <td style={{ fontSize:12, fontFamily:"'JetBrains Mono',monospace" }}>{n.judgeCount}</td>
                  <td>
                    {n.is_track_winner?<span className="badge" style={{color:'var(--gold)',background:'rgba(245,200,66,.12)',border:'1px solid rgba(245,200,66,.28)'}}>🏆 Winner</span>
                    :n.rank?<span className="badge" style={{color:RANK_LABELS[n.rank]?.color||'var(--text-3)',background:RANK_LABELS[n.rank]?.bg||'transparent',border:`1px solid ${RANK_LABELS[n.rank]?.color||'var(--border)'}38`}}>{['1st','2nd','3rd'][n.rank-1]||`${n.rank}th`} Place</span>
                    :<span style={{fontSize:12,color:'var(--text-3)'}}>Pending</span>}
                  </td>
                  <td>
                    {!n.is_track_winner&&<Button size="sm" variant="ghost" onClick={()=>setTrackWinner(n)} disabled={saving[n.team_id]} style={{border:'1px solid rgba(245,200,66,.28)',color:'var(--gold)'}}>
                      <Trophy size={12} weight="fill"/> {saving[n.team_id]?'…':'Set Winner'}
                    </Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Dept prize summary */}
      {cur.length>0&&(
        <Card>
          <h3 style={{ fontSize:15, fontWeight:800, marginBottom:14 }}>Prize Distribution</h3>
          <div style={{ display:'grid', gridTemplateColumns:`repeat(auto-fill,minmax(${isMobile?'100%':'240px'},1fr))`, gap:10 }}>
            {TRACKS[activeTrack].departments.map(dept=>{
              const dN=nominees.filter(n=>n.department===dept)
              const dW=dN.find(n=>n.is_track_winner)
              const prizes=dN.filter(n=>!n.is_track_winner&&n.rank).sort((a,b)=>a.rank-b.rank)
              return (
                <div key={dept} style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:11, overflow:'hidden' }}>
                  <div style={{ padding:'9px 13px', background:'var(--surface)', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <DeptBadge dept={dept}/>
                    <span style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>max {MAX_NOMINEES[dept]}</span>
                  </div>
                  {dW&&<div style={{ padding:'9px 13px', background:'rgba(245,200,66,.05)', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ fontSize:9, color:'var(--gold)', fontFamily:"'JetBrains Mono',monospace", fontWeight:700, marginBottom:3 }}>🏆 TRACK WINNER</div>
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{dW.teams?.project_title}</div>
                  </div>}
                  {prizes.map(n=>(
                    <div key={n.id} style={{ padding:'8px 13px', borderBottom:'1px solid var(--border)', display:'flex', gap:9, alignItems:'center' }}>
                      <RankMedal rank={n.rank}/>
                      <div style={{ fontSize:12, fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.teams?.project_title}</div>
                    </div>
                  ))}
                  {dN.length===0&&<div style={{ padding:14, fontSize:12, color:'var(--text-3)', textAlign:'center' }}>No nominees</div>}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
