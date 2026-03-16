/**
 * Public Leaderboard — /leaderboard
 * No login required. Designed for projector display.
 * Auto-refreshes via Supabase Realtime.
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { TRACKS, DEPARTMENTS, DEPT_TRACK_MAP, RANK_LABELS } from '../lib/constants.js'
import { DeptBadge, TrackBadge, LiveBadge, RankMedal, Spinner } from '../components/shared/UI.jsx'
import { Triangle, ArrowsClockwise } from '@phosphor-icons/react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const VIEWS = [
  { id:'overall', label:'Overall' },
  { id:'track1',  label:'Track 1' },
  { id:'track2',  label:'Track 2' },
  { id:'track3',  label:'Track 3' },
  { id:'dept',    label:'By Dept'  },
]

const TIP = ({active,payload,label}) => {
  if (!active||!payload?.length) return null
  return <div style={{background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:9,padding:'8px 12px',fontSize:12}}>
    <p style={{fontWeight:700,color:'var(--text)',marginBottom:3}}>{label}</p>
    {payload.map((p,i)=><p key={i} style={{color:p.color}}>{p.name}: {p.value?.toFixed?.(1)??p.value}</p>)}
  </div>
}

const DEPT_COLORS = {
  CE:'#4f8ef7',ME:'#3dd68c',MRE:'#f5c842',
  EEE:'#9b6dff',ECE:'#f05c5c',RA:'#e87d3e',
  AD:'#4f8ef7','CSE-A':'#3dd68c','CSE-B':'#f5c842',
}

export default function PublicLeaderboard() {
  const [data,     setData]      = useState({ teams:[], nominees:[], deptRankings:[] })
  const [loading,  setLoading]   = useState(true)
  const [view,     setView]      = useState('overall')
  const [activeDept, setActiveDept] = useState('CE')
  const [lastUpdate, setLastUpdate] = useState(null)
  const [nominees, setNominees]  = useState([])

  const fetchAll = useCallback(async () => {
    try {
      const [tR,sR,nR] = await Promise.all([
        supabase.from('teams').select('*'),
        supabase.from('scores').select('*'),
        supabase.from('nominees').select('*, teams(*)'),
      ])
      const teams=tR.data||[], scores=sR.data||[], noms=nR.data||[]
      setNominees(noms)

      // Build dept rankings with avg scores
      const deptRankings = DEPARTMENTS.map(dept => {
        const dTeams = teams.filter(t=>t.department===dept).map(t=>{
          const sc=scores.filter(s=>s.team_id===t.id)
          const avg=sc.length?sc.reduce((s,x)=>s+x.relevance+x.innovation+x.methodology+x.presentation+x.executable,0)/sc.length:0
          return { ...t, avg:parseFloat(avg.toFixed(2)), judgeCount:sc.length }
        }).sort((a,b)=>b.avg-a.avg)
        return { dept, track:DEPT_TRACK_MAP[dept], teams:dTeams }
      })

      const allTeams = deptRankings.flatMap(d=>
        d.teams.map(t=>({ ...t, department:d.dept, track:d.track }))
      ).sort((a,b)=>b.avg-a.avg)

      setData({ teams:allTeams, deptRankings })
      setLastUpdate(new Date())
    } catch(e){ console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
    const ch = supabase.channel('lb-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'scores'},     ()=>fetchAll())
      .on('postgres_changes',{event:'*',schema:'public',table:'final_scores'},()=>fetchAll())
      .on('postgres_changes',{event:'*',schema:'public',table:'nominees'},   ()=>fetchAll())
      .subscribe()
    return ()=>supabase.removeChannel(ch)
  },[fetchAll])

  const isMobile = window.innerWidth < 640

  const trackTeams = (tr) =>
    data.teams.filter(t=>t.track===tr)

  const activeDeptData = data.deptRankings.find(d=>d.dept===activeDept)

  // Chart data for current dept
  const deptChartData = (activeDeptData?.teams||[]).slice(0,8).map(t=>({
    name: t.registration_number?.split('-').pop()||'?',
    score: t.avg,
    full: t.project_title,
  }))

  if (loading) return (
    <div style={{ minHeight:'100svh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
      <Spinner size={40}/>
      <p style={{color:'var(--text-3)',fontSize:14}}>Loading leaderboard...</p>
    </div>
  )

  return (
    <div style={{ minHeight:'100svh', background:'var(--bg)', padding:'0 0 32px' }}>
      {/* Header */}
      <header style={{
        background:'var(--bg-2)', borderBottom:'1px solid var(--border)',
        padding:'0 clamp(16px,4vw,40px)', height:58,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        position:'sticky', top:0, zIndex:100,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,var(--accent),var(--purple))', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Triangle size={15} weight="fill" color="white"/>
          </div>
          <div>
            <span style={{ fontSize:16, fontWeight:800, fontFamily:"'Syne',sans-serif" }}>Yukthi '26</span>
            <span style={{ fontSize:12, color:'var(--text-3)', marginLeft:10 }}>Live Leaderboard</span>
          </div>
          <LiveBadge/>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {lastUpdate&&<span style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>
            {lastUpdate.toLocaleTimeString()}
          </span>}
          <button onClick={fetchAll} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 11px', cursor:'pointer', color:'var(--text-2)', fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
            <ArrowsClockwise size={13}/>
          </button>
        </div>
      </header>

      <div style={{ padding:'20px clamp(16px,4vw,40px)' }}>
        {/* View tabs */}
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4, marginBottom:24 }}>
          {VIEWS.map(v=>(
            <button key={v.id} onClick={()=>setView(v.id)} style={{
              padding:'8px 16px', borderRadius:10, fontSize:13, flexShrink:0,
              fontFamily:"'Syne',sans-serif", fontWeight:700, cursor:'pointer',
              border:view===v.id?'1px solid var(--accent)':'1px solid var(--border)',
              background:view===v.id?'var(--accent-glow)':'var(--surface)',
              color:view===v.id?'var(--accent)':'var(--text-3)',
              transition:'all .15s',
            }}>{v.label}</button>
          ))}
        </div>

        {/* ── OVERALL ── */}
        {view==='overall'&&(
          <div className="animate-fade-in">
            <h2 style={{ fontSize:isMobile?18:22, fontWeight:800, marginBottom:20 }}>
              Overall Rankings
              <span style={{ fontSize:13, color:'var(--text-3)', fontWeight:400, marginLeft:10 }}>all departments · by avg score</span>
            </h2>
            {/* Top 3 podium */}
            {data.teams.length>=3&&(
              <div style={{ display:'flex', gap:10, marginBottom:24, alignItems:'flex-end', justifyContent:'center' }}>
                {[1,0,2].map(i=>{
                  const t=data.teams[i]
                  if (!t) return null
                  const heights=[80,100,70]
                  const rank=i+1
                  const podiumH=heights[[1,0,2].indexOf(i)]
                  return (
                    <div key={t.id} style={{ flex:1, maxWidth:220, display:'flex', flexDirection:'column', alignItems:'center', gap:0 }}>
                      <div style={{ textAlign:'center', marginBottom:8, padding:'0 8px' }}>
                        <div style={{ fontSize:isMobile?12:14, fontWeight:700, color:'var(--text)', marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>
                          {t.project_title}
                        </div>
                        <div style={{ display:'flex', gap:5, justifyContent:'center', flexWrap:'wrap' }}>
                          <DeptBadge dept={t.department}/>
                        </div>
                        <div style={{ fontSize:isMobile?20:28, fontWeight:900, fontFamily:"'Syne',sans-serif", color:i===0?'var(--gold)':i===1?'var(--silver)':'var(--bronze)', marginTop:4 }}>
                          {t.avg||'—'}
                        </div>
                      </div>
                      <div style={{
                        width:'100%', height:podiumH,
                        background:i===0?'linear-gradient(180deg,rgba(245,200,66,.2),rgba(245,200,66,.05))':i===1?'linear-gradient(180deg,rgba(192,200,220,.15),rgba(192,200,220,.03))':'linear-gradient(180deg,rgba(232,125,62,.15),rgba(232,125,62,.03))',
                        border:`1px solid ${i===0?'rgba(245,200,66,.3)':i===1?'rgba(192,200,220,.2)':'rgba(232,125,62,.25)'}`,
                        borderRadius:'10px 10px 0 0',
                        display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:12,
                        fontSize:28,
                      }}>
                        {['🥇','🥈','🥉'][i]}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Full table / list */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
              {data.teams.slice(0,25).map((t,i)=>(
                <div key={t.id} style={{
                  display:'flex', alignItems:'center', gap:isMobile?10:14,
                  padding:isMobile?'12px 14px':'13px 18px',
                  borderBottom:'1px solid var(--border)',
                  background:i===0?'rgba(245,200,66,.025)':i===1?'rgba(192,200,220,.015)':i===2?'rgba(232,125,62,.015)':'transparent',
                }}>
                  <div style={{ width:isMobile?28:36, textAlign:'center', flexShrink:0 }}><RankMedal rank={i+1}/></div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:isMobile?13:15, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.project_title}</div>
                    <div style={{ display:'flex', gap:6, marginTop:3, alignItems:'center', flexWrap:'wrap' }}>
                      <DeptBadge dept={t.department}/><TrackBadge track={t.track}/>
                      {nominees.find(n=>n.team_id===t.id)&&<span className="badge" style={{color:'var(--gold)',background:'rgba(245,200,66,.1)',border:'1px solid rgba(245,200,66,.25)'}}>🏆 Nominee</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:isMobile?20:26, fontWeight:900, fontFamily:"'Syne',sans-serif", color:i===0?'var(--gold)':i===1?'var(--silver)':i===2?'var(--bronze)':'var(--accent)' }}>
                      {t.avg>0?t.avg:'—'}
                    </div>
                    <div style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>{t.judgeCount} judge{t.judgeCount!==1?'s':''}</div>
                  </div>
                </div>
              ))}
              {data.teams.length===0&&<div style={{ padding:'40px', textAlign:'center', color:'var(--text-3)' }}>No scores yet</div>}
            </div>
          </div>
        )}

        {/* ── TRACK VIEWS ── */}
        {['track1','track2','track3'].includes(view)&&(()=>{
          const tr=parseInt(view.replace('track',''))
          const t=TRACKS[tr]
          const tTeams=trackTeams(tr)
          return (
            <div className="animate-fade-in">
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                <h2 style={{ fontSize:isMobile?18:22, fontWeight:800 }}>{t.name} Rankings</h2>
                <span style={{ fontSize:12, color:'var(--text-3)' }}>{t.departments.join(' · ')}</span>
              </div>
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
                {tTeams.slice(0,20).map((tm,i)=>(
                  <div key={tm.id} style={{
                    display:'flex', alignItems:'center', gap:isMobile?10:14,
                    padding:isMobile?'12px 14px':'13px 18px',
                    borderBottom:'1px solid var(--border)',
                    background:i===0?`${t.color}12`:i===1?`${t.color}08`:i===2?`${t.color}05`:'transparent',
                  }}>
                    <div style={{ width:isMobile?28:36, textAlign:'center', flexShrink:0 }}><RankMedal rank={i+1}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:isMobile?13:15, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tm.project_title}</div>
                      <div style={{ display:'flex', gap:6, marginTop:3, flexWrap:'wrap' }}>
                        <DeptBadge dept={tm.department}/>
                        {nominees.find(n=>n.team_id===tm.id)&&<span className="badge" style={{color:'var(--gold)',background:'rgba(245,200,66,.1)',border:'1px solid rgba(245,200,66,.25)'}}>🏆</span>}
                      </div>
                    </div>
                    <div style={{ fontSize:isMobile?20:26, fontWeight:900, fontFamily:"'Syne',sans-serif", color:t.color, flexShrink:0 }}>
                      {tm.avg>0?tm.avg:'—'}
                    </div>
                  </div>
                ))}
                {tTeams.length===0&&<div style={{ padding:'40px', textAlign:'center', color:'var(--text-3)' }}>No scores yet in {t.name}</div>}
              </div>
            </div>
          )
        })()}

        {/* ── BY DEPT ── */}
        {view==='dept'&&(
          <div className="animate-fade-in">
            <h2 style={{ fontSize:isMobile?18:22, fontWeight:800, marginBottom:16 }}>Department Rankings</h2>
            {/* Dept tabs */}
            <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4, marginBottom:20 }}>
              {DEPARTMENTS.map(d=>(
                <button key={d} onClick={()=>setActiveDept(d)} style={{
                  padding:'6px 12px', borderRadius:9, fontSize:11, flexShrink:0,
                  fontFamily:"'JetBrains Mono',monospace", fontWeight:700, cursor:'pointer',
                  border:activeDept===d?'1px solid var(--accent)':'1px solid var(--border)',
                  background:activeDept===d?'var(--accent-glow)':'var(--surface)',
                  color:activeDept===d?'var(--accent)':'var(--text-3)',
                }}>{d}</button>
              ))}
            </div>

            {activeDeptData&&(
              <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:16, alignItems:'start' }}>
                {/* Rankings */}
                <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', background:'var(--bg-2)', borderBottom:'1px solid var(--border)', display:'flex', gap:8, alignItems:'center' }}>
                    <DeptBadge dept={activeDept}/>
                    <TrackBadge track={activeDeptData.track}/>
                    <span style={{ fontSize:12, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>{activeDeptData.teams.length} teams</span>
                  </div>
                  {activeDeptData.teams.map((t,i)=>(
                    <div key={t.id} style={{
                      display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
                      borderBottom:'1px solid var(--border)',
                      background:i===0?'rgba(245,200,66,.03)':'transparent',
                    }}>
                      <div style={{ width:28, textAlign:'center', flexShrink:0 }}><RankMedal rank={i+1}/></div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.project_title}</div>
                        <div style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>{t.registration_number}</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:18, fontWeight:800, fontFamily:"'Syne',sans-serif", color:i===0?'var(--gold)':i===1?'var(--silver)':i===2?'var(--bronze)':'var(--accent)' }}>
                          {t.avg>0?t.avg:'—'}
                        </div>
                        {nominees.find(n=>n.team_id===t.id)&&<div style={{ fontSize:9, color:'var(--gold)', fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>NOMINEE</div>}
                      </div>
                    </div>
                  ))}
                  {activeDeptData.teams.length===0&&<div style={{ padding:'32px', textAlign:'center', color:'var(--text-3)' }}>No teams yet</div>}
                </div>

                {/* Bar chart */}
                {!isMobile&&deptChartData.length>0&&(
                  <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px' }}>
                    <p style={{ fontSize:13, fontWeight:700, marginBottom:16 }}>Score Distribution</p>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={deptChartData} barSize={28} layout="vertical">
                        <XAxis type="number" domain={[0,100]} tick={{fill:'var(--text-3)',fontSize:10}} axisLine={false} tickLine={false}/>
                        <YAxis type="category" dataKey="name" tick={{fill:'var(--text-3)',fontSize:10,fontFamily:"'JetBrains Mono',monospace"}} axisLine={false} tickLine={false} width={50}/>
                        <Tooltip content={<TIP/>}/>
                        <Bar dataKey="score" name="Avg Score" radius={[0,5,5,0]}>
                          {deptChartData.map((_,i)=><Cell key={i} fill={[DEPT_COLORS[activeDept],'#9b6dff','#f05c5c','#e87d3e','#4f8ef7','#3dd68c','#f5c842','#9b6dff'][i%8]}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
