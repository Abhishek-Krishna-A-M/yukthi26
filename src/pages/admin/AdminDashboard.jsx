import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase.js'
import { TRACKS, DEPT_FULL_NAMES, RANK_LABELS, DEPARTMENTS, DEPT_TRACK_MAP, SCORE_MAX_TOTAL } from '../../lib/constants.js'
import { StatCard, Card, DeptBadge, TrackBadge, LiveBadge, RankMedal, Spinner, PageHeader } from '../../components/shared/UI.jsx'
import { useBreakpoint } from '../../hooks/useBreakpoint.js'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Users, ClipboardText, Trophy, ArrowsClockwise, ChartBar } from '@phosphor-icons/react'

const TIP = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null
  return (
    <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:9, padding:'8px 12px', fontSize:12 }}>
      <p style={{ fontWeight:700, marginBottom:3, color:'var(--text)' }}>{label}</p>
      {payload.map((p,i)=><p key={i} style={{color:p.color}}>{p.name}: {typeof p.value==='number'?p.value.toFixed(1):p.value}</p>)}
    </div>
  )
}

const VIEWS = ['dept','track','overall']

export default function AdminDashboard() {
  const { isMobile } = useBreakpoint()
  const [stats, setStats]           = useState(null)
  const [deptRankings, setDeptRankings] = useState([])
  const [nominees, setNominees]     = useState([])
  const [config, setConfig]         = useState({})
  const [loading, setLoading]       = useState(true)
  const [view, setView]             = useState('dept')
  const [trackFilter, setTrackFilter] = useState('all')
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchAll = useCallback(async () => {
    try {
      const [tR,jR,sR,fsR,nR,cR] = await Promise.all([
        supabase.from('teams').select('*'),
        supabase.from('judges').select('*'),
        supabase.from('scores').select('*'),
        supabase.from('final_scores').select('*'),
        supabase.from('nominees').select('*, teams(*)'),
        supabase.from('system_config').select('*'),
      ])
      const teams=tR.data||[], judges=jR.data||[], scores=sR.data||[]
      const fs=fsR.data||[], noms=nR.data||[], cfg={}
      ;(cR.data||[]).forEach(c=>{ cfg[c.key]=c.value })
      setConfig(cfg); setNominees(noms)
      setStats({
        totalTeams:teams.length,
        totalJudges:judges.filter(j=>j.role==='judge').length,
        totalScores:scores.length,
        totalNominees:noms.length,
        lockedJudges:judges.filter(j=>j.is_locked).length,
        deptBreakdown:Object.entries(teams.reduce((a,t)=>{ a[t.department]=(a[t.department]||0)+1; return a },{})).map(([dept,count])=>({dept,count})),
      })
      const ranked = DEPARTMENTS.map(dept => {
        const dTeams = teams.filter(t=>t.department===dept).map(t => {
          const sc = scores.filter(s=>s.team_id===t.id)
          const avg = sc.length ? sc.reduce((s,x)=>s+x.relevance+x.innovation+x.methodology+x.presentation+x.executable,0)/sc.length : 0
          return { ...t, avg:parseFloat(avg.toFixed(2)), judgeCount:sc.length }
        }).sort((a,b)=>b.avg-a.avg)
        return { dept, track:DEPT_TRACK_MAP[dept], teams:dTeams }
      })
      setDeptRankings(ranked)
      setLastUpdate(new Date())
    } catch(e){ console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
    const ch = supabase.channel('dash-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'scores'},     ()=>fetchAll())
      .on('postgres_changes',{event:'*',schema:'public',table:'final_scores'},()=>fetchAll())
      .on('postgres_changes',{event:'*',schema:'public',table:'nominees'},   ()=>fetchAll())
      .on('postgres_changes',{event:'*',schema:'public',table:'system_config'},()=>fetchAll())
      .subscribe()
    return ()=>supabase.removeChannel(ch)
  }, [fetchAll])

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
      <Spinner size={36}/><p style={{color:'var(--text-3)',fontSize:13}}>Loading...</p>
    </div>
  )

  const filtered = trackFilter==='all' ? deptRankings : deptRankings.filter(d=>d.track===parseInt(trackFilter))
  const allTeams = deptRankings.flatMap(d=>d.teams.map(t=>({...t,department:d.dept,track:d.track}))).sort((a,b)=>b.avg-a.avg)
  const trackLeaders = [1,2,3].map(tr=>({
    track:tr, color:TRACKS[tr].color,
    teams: TRACKS[tr].departments.flatMap(dept=>{
      const d=deptRankings.find(x=>x.dept===dept); return d?.teams[0]?[{...d.teams[0],department:dept}]:[]
    }).sort((a,b)=>b.avg-a.avg),
  }))

  const p = 'clamp(16px, 4vw, 32px)'

  return (
    <div style={{ padding:`16px ${p} ${isMobile?'8px':p}` }}>
      <div className="animate-fade-up" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
            <h1 style={{ fontSize:isMobile?20:24, fontWeight:800 }}>Dashboard</h1>
            <LiveBadge/>
          </div>
          {!isMobile&&<p style={{ color:'var(--text-3)', fontSize:12 }}>
            Yukthi 2026 · Real-time{lastUpdate&&<span style={{fontFamily:"'JetBrains Mono',monospace",marginLeft:6}}>· {lastUpdate.toLocaleTimeString()}</span>}
          </p>}
        </div>
        <button onClick={fetchAll} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:9, padding:'7px 12px', cursor:'pointer', color:'var(--text-2)', fontSize:12, fontFamily:"'Syne',sans-serif", display:'flex', alignItems:'center', gap:5 }}>
          <ArrowsClockwise size={13}/>{!isMobile&&' Refresh'}
        </button>
      </div>

      {/* Phase pills */}
      <div className="animate-fade-up delay-1" style={{ display:'flex', gap:8, marginBottom:16, overflowX:'auto', paddingBottom:2 }}>
        {[1,2,3].map(tr=>{
          const phase=config[`phase_track_${tr}`]||'round1', t=TRACKS[tr], isFinal=phase==='final'
          return (
            <div key={tr} style={{ background:'var(--surface)', borderRadius:10, padding:'9px 14px', border:`1px solid ${t.color}28`, display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:isFinal?'var(--green)':t.color, boxShadow:`0 0 7px ${isFinal?'var(--green)':t.color}`, flexShrink:0 }}/>
              <div>
                <div style={{ fontSize:12, fontWeight:700, fontFamily:"'Syne',sans-serif", color:t.color }}>{t.name}</div>
                <div style={{ fontSize:9, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace", textTransform:'uppercase' }}>{isFinal?'Final':'Dept Round'}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Stats grid */}
      <div className="animate-fade-up delay-2" style={{ display:'grid', gridTemplateColumns:`repeat(${isMobile?2:4},1fr)`, gap:10, marginBottom:16 }}>
        <StatCard label="Teams"   value={stats?.totalTeams||0}    color="var(--accent)"  icon={<Users size={16} weight="duotone"/>}/>
        <StatCard label="Judges"  value={stats?.totalJudges||0}   color="var(--green)"   sub={`${stats?.lockedJudges||0} locked`} icon={<ClipboardText size={16} weight="duotone"/>}/>
        <StatCard label="Scores"  value={stats?.totalScores||0}   color="var(--purple)"  icon={<ChartBar size={16} weight="duotone"/>}/>
        <StatCard label="Nominees" value={stats?.totalNominees||0} color="var(--gold)"   icon={<Trophy size={16} weight="duotone"/>}/>
      </div>

      {/* Progress bars (mobile) / Chart (desktop) */}
      {isMobile ? (
        <Card className="animate-fade-up delay-3" style={{ marginBottom:16 }}>
          <p style={{ fontSize:12, fontWeight:700, fontFamily:"'Syne',sans-serif", color:'var(--text-2)', marginBottom:12, textTransform:'uppercase', letterSpacing:'.06em' }}>Scoring Progress</p>
          {deptRankings.map(d=>{
            const s=d.teams.reduce((acc,t)=>acc+(t.judgeCount>0?1:0),0), pct=d.teams.length?Math.round((s/d.teams.length)*100):0
            return (
              <div key={d.dept} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:11, fontFamily:"'JetBrains Mono',monospace", color:'var(--text-2)' }}>{d.dept}</span>
                  <span style={{ fontSize:11, color:pct===100?'var(--green)':'var(--text-3)' }}>{s}/{d.teams.length}</span>
                </div>
                <div style={{ height:5, background:'var(--bg)', borderRadius:3 }}>
                  <div style={{ height:'100%', borderRadius:3, width:`${pct}%`, background:pct===100?'var(--green)':'linear-gradient(90deg,var(--accent),var(--purple))', transition:'width 1s' }}/>
                </div>
              </div>
            )
          })}
        </Card>
      ) : (
        <div className="animate-fade-up delay-3" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
          <Card>
            <p style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>Teams per Department</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats?.deptBreakdown||[]} barSize={20}>
                <XAxis dataKey="dept" tick={{fill:'var(--text-3)',fontSize:9,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'var(--text-3)',fontSize:9}} axisLine={false} tickLine={false}/>
                <Tooltip content={<TIP/>}/>
                <Bar dataKey="count" name="Teams" radius={[4,4,0,0]}>
                  {(stats?.deptBreakdown||[]).map((_,i)=><Cell key={i} fill={['#4f8ef7','#3dd68c','#f5c842','#9b6dff','#f05c5c','#e87d3e','#4f8ef7','#3dd68c','#f5c842'][i%9]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <p style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>Scoring Progress</p>
            {deptRankings.map(d=>{
              const s=d.teams.reduce((acc,t)=>acc+(t.judgeCount>0?1:0),0), pct=d.teams.length?Math.round((s/d.teams.length)*100):0
              return (
                <div key={d.dept} style={{ marginBottom:9 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                    <span style={{ fontSize:10, fontFamily:"'JetBrains Mono',monospace", color:'var(--text-2)' }}>{d.dept}</span>
                    <span style={{ fontSize:10, color:pct===100?'var(--green)':'var(--text-3)' }}>{s}/{d.teams.length}</span>
                  </div>
                  <div style={{ height:5, background:'var(--bg)', borderRadius:3 }}>
                    <div style={{ height:'100%', borderRadius:3, width:`${pct}%`, background:pct===100?'var(--green)':'linear-gradient(90deg,var(--accent),var(--purple))', transition:'width 1s' }}/>
                  </div>
                </div>
              )
            })}
          </Card>
        </div>
      )}

      {/* Leaderboard */}
      <Card className="animate-fade-up delay-4">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <h3 style={{ fontSize:16, fontWeight:800 }}>Leaderboard</h3>
            <LiveBadge/>
          </div>
          <div style={{ display:'flex', gap:3, background:'var(--bg)', padding:3, borderRadius:9, border:'1px solid var(--border)' }}>
            {VIEWS.map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{
                padding:'5px 10px', borderRadius:7, fontSize:11,
                fontFamily:"'Syne',sans-serif", fontWeight:700, cursor:'pointer', border:'none',
                background:view===v?'var(--accent)':'transparent',
                color:view===v?'#fff':'var(--text-3)', transition:'all .15s',
              }}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>
            ))}
          </div>
        </div>

        {/* Dept view */}
        {view==='dept'&&(
          <>
            <div style={{ display:'flex', gap:5, marginBottom:14, overflowX:'auto', paddingBottom:2 }}>
              {['all','1','2','3'].map(t=>(
                <button key={t} onClick={()=>setTrackFilter(t)} style={{
                  padding:'5px 11px', borderRadius:8, fontSize:11, flexShrink:0,
                  fontFamily:"'Syne',sans-serif", fontWeight:700, cursor:'pointer',
                  border:trackFilter===t?'1px solid var(--accent)':'1px solid var(--border)',
                  background:trackFilter===t?'var(--accent-glow)':'var(--surface)',
                  color:trackFilter===t?'var(--accent)':'var(--text-3)',
                }}>{t==='all'?'All':isMobile?`T${t}`:`Track ${t}`}</button>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:`repeat(auto-fill,minmax(${isMobile?'100%':'280px'},1fr))`, gap:10 }}>
              {filtered.map(d=>(
                <div key={d.dept} style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:11, overflow:'hidden' }}>
                  <div style={{ padding:'9px 12px', background:'var(--surface)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', gap:5 }}><DeptBadge dept={d.dept}/><TrackBadge track={d.track}/></div>
                    <span style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>{d.teams.length} teams</span>
                  </div>
                  {d.teams.slice(0,5).map((t,i)=>{
                    const nom=nominees.find(n=>n.team_id===t.id)
                    return (
                      <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderBottom:i<4?'1px solid var(--border)':'none' }}>
                        <RankMedal rank={i+1}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.project_title}</div>
                          <div style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>{t.registration_number}</div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:14, fontWeight:800, color:'var(--accent)', fontFamily:"'Syne',sans-serif" }}>{t.avg||'—'}</div>
                          {nom&&<div style={{ fontSize:8, color:'var(--gold)', fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>NOMINEE</div>}
                        </div>
                      </div>
                    )
                  })}
                  {d.teams.length===0&&<div style={{ padding:16, fontSize:12, color:'var(--text-3)', textAlign:'center' }}>No teams yet</div>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Track view */}
        {view==='track'&&(
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${isMobile?1:3},1fr)`, gap:12 }}>
            {trackLeaders.map(({track,color,teams})=>(
              <div key={track} style={{ background:'var(--bg-2)', border:`1px solid ${color}22`, borderRadius:11, overflow:'hidden', borderTop:`3px solid ${color}` }}>
                <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
                  <span style={{ fontSize:13, fontWeight:800, fontFamily:"'Syne',sans-serif", color }}>{TRACKS[track].name}</span>
                  <div style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>{TRACKS[track].departments.join(' · ')}</div>
                </div>
                {teams.map((t,i)=>(
                  <div key={t.id} style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:9 }}>
                    <RankMedal rank={i+1}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.project_title}</div>
                      <DeptBadge dept={t.department}/>
                    </div>
                    <div style={{ fontSize:14, fontWeight:800, color, fontFamily:"'Syne',sans-serif", flexShrink:0 }}>{t.avg||'—'}</div>
                  </div>
                ))}
                {teams.length===0&&<div style={{ padding:16, fontSize:12, color:'var(--text-3)', textAlign:'center' }}>No scored teams</div>}
              </div>
            ))}
          </div>
        )}

        {/* Overall view */}
        {view==='overall'&&(
          isMobile ? (
            <div>
              {allTeams.slice(0,30).map((t,i)=>(
                <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 0', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ width:32, textAlign:'center', flexShrink:0 }}><RankMedal rank={i+1}/></div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.project_title}</div>
                    <div style={{ display:'flex', gap:5, marginTop:3, alignItems:'center' }}>
                      <DeptBadge dept={t.department}/><TrackBadge track={t.track}/>
                    </div>
                  </div>
                  <span style={{ fontSize:18, fontWeight:800, fontFamily:"'Syne',sans-serif", color:i===0?'var(--gold)':i===1?'var(--silver)':i===2?'var(--bronze)':'var(--accent)', flexShrink:0 }}>{t.avg||'—'}</span>
                </div>
              ))}
              {allTeams.length===0&&<div style={{ textAlign:'center', padding:32, color:'var(--text-3)' }}>No scores yet</div>}
            </div>
          ) : (
            <table>
              <thead><tr><th>Rank</th><th>Project</th><th>Dept</th><th>Track</th><th>Judges</th><th>Avg</th></tr></thead>
              <tbody>
                {allTeams.slice(0,30).map((t,i)=>(
                  <tr key={t.id}>
                    <td><RankMedal rank={i+1}/></td>
                    <td><div style={{ fontWeight:600, color:'var(--text)' }}>{t.project_title}</div><div style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>{t.registration_number}</div></td>
                    <td><DeptBadge dept={t.department}/></td>
                    <td><TrackBadge track={t.track}/></td>
                    <td style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12 }}>{t.judgeCount}</td>
                    <td><span style={{ fontSize:17, fontWeight:800, fontFamily:"'Syne',sans-serif", color:i===0?'var(--gold)':i===1?'var(--silver)':i===2?'var(--bronze)':'var(--accent)' }}>{t.avg||'—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </Card>

      {/* Nominees */}
      {nominees.length>0&&(
        <Card style={{ marginTop:14 }} className="animate-fade-up delay-4">
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <h3 style={{ fontSize:15, fontWeight:800 }}>Track Nominees</h3>
            <LiveBadge/>
            <span style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>{nominees.length} selected</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:`repeat(auto-fill,minmax(${isMobile?'100%':'240px'},1fr))`, gap:9 }}>
            {nominees.sort((a,b)=>a.track-b.track||(a.rank||99)-(b.rank||99)).map(n=>(
              <div key={n.id} style={{
                background:n.is_track_winner?'linear-gradient(135deg,rgba(245,200,66,.1),rgba(232,125,62,.07))':'var(--bg-2)',
                border:n.is_track_winner?'1px solid rgba(245,200,66,.3)':'1px solid var(--border)',
                borderRadius:10, padding:'11px 13px',
              }}>
                <div style={{ display:'flex', gap:5, marginBottom:6, flexWrap:'wrap' }}>
                  <DeptBadge dept={n.department}/><TrackBadge track={n.track}/>
                  {n.is_track_winner&&<span className="badge" style={{color:'var(--gold)',background:'rgba(245,200,66,.12)',border:'1px solid rgba(245,200,66,.28)'}}>🏆 WINNER</span>}
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:2 }}>{n.teams?.project_title}</div>
                <div style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>{n.teams?.registration_number}</div>
                {n.rank&&!n.is_track_winner&&<div style={{ fontSize:10, marginTop:4, fontWeight:700, color:RANK_LABELS[n.rank]?.color||'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>
                  {['1st Place','2nd Place','3rd Place'][n.rank-1]||`${n.rank}th`}
                </div>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
