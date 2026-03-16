import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import { DEPARTMENTS, DEPT_TRACK_MAP, MAX_NOMINEES, RANK_LABELS, SCORE_MAX_TOTAL } from '../../lib/constants.js'
import { Card, Button, Alert, Spinner, TrackBadge, DeptBadge, PageHeader, RankMedal } from '../../components/shared/UI.jsx'
import { useBreakpoint } from '../../hooks/useBreakpoint.js'
import { Plus, Minus } from '@phosphor-icons/react'

export default function AdminNominees() {
  const { isMobile } = useBreakpoint()
  const [deptData,setDeptData] = useState([])
  const [nominees,setNominees] = useState([])
  const [loading,setLoading]   = useState(true)
  const [saving,setSaving]     = useState({})
  const [error,setError]       = useState('')
  const [success,setSuccess]   = useState('')
  const [activeTab,setActiveTab] = useState('CE')

  useEffect(()=>{ fetchAll() },[])

  async function fetchAll() {
    setLoading(true)
    const [tR,sR,nR] = await Promise.all([
      supabase.from('teams').select('*').order('department').order('team_number'),
      supabase.from('scores').select('*'),
      supabase.from('nominees').select('*, teams(*)'),
    ])
    const teams=tR.data||[], scores=sR.data||[], noms=nR.data||[]
    setNominees(noms)
    setDeptData(DEPARTMENTS.map(dept=>{
      const dTeams = teams.filter(t=>t.department===dept).map(t=>{
        const sc = scores.filter(s=>s.team_id===t.id)
        const total = sc.reduce((s,x)=>s+x.relevance+x.innovation+x.methodology+x.presentation+x.executable,0)
        const avg = sc.length ? total/sc.length : 0
        return { ...t, avg:parseFloat(avg.toFixed(2)), judgeCount:sc.length, indivScores:sc }
      }).sort((a,b)=>b.avg-a.avg)
      return { dept, track:DEPT_TRACK_MAP[dept], teams:dTeams, maxN:MAX_NOMINEES[dept] }
    }))
    setLoading(false)
  }

  const isNominated = teamId => nominees.find(n=>n.team_id===teamId)

  async function toggleNominee(team, rank) {
    setSaving(s=>({...s,[team.id]:true})); setError('')
    const existing = isNominated(team.id)
    if (existing) {
      const { error } = await supabase.from('nominees').delete().eq('team_id',team.id)
      if (error) setError(error.message)
      else setSuccess(`Removed ${team.project_title}`)
    } else {
      const deptNoms = nominees.filter(n=>n.department===team.department)
      if (deptNoms.length>=MAX_NOMINEES[team.department]) {
        setError(`${team.department} already has max nominees (${MAX_NOMINEES[team.department]})`);
        setSaving(s=>({...s,[team.id]:false})); return
      }
      const { error } = await supabase.from('nominees').insert({ team_id:team.id, department:team.department, track:team.track, rank })
      if (error) setError(error.message)
      else setSuccess(`Nominated ${team.project_title}`)
    }
    setSaving(s=>({...s,[team.id]:false})); fetchAll()
  }

  const activeDept = deptData.find(d=>d.dept===activeTab)
  const p = 'clamp(14px,4vw,32px)'

  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner size={32}/></div>

  return (
    <div style={{ padding:`16px ${p}` }}>
      <PageHeader title="Nominees" subtitle="Select top teams from each department for track finals"/>

      {error&&<div style={{marginBottom:12}}><Alert type="error" message={error}/></div>}
      {success&&<div style={{marginBottom:12}}><Alert type="success" message={success}/></div>}

      {/* Dept tabs */}
      <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4, marginBottom:16 }}>
        {deptData.map(d=>{
          const dNoms=nominees.filter(n=>n.department===d.dept)
          const full=dNoms.length>=d.maxN
          return (
            <button key={d.dept} onClick={()=>setActiveTab(d.dept)} style={{
              padding:'7px 12px', borderRadius:10, flexShrink:0,
              fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:700, cursor:'pointer',
              border:activeTab===d.dept?'1px solid var(--accent)':'1px solid var(--border)',
              background:activeTab===d.dept?'var(--accent-glow)':'var(--surface)',
              color:activeTab===d.dept?'var(--accent)':'var(--text-3)',
            }}>
              {d.dept}
              <span style={{ marginLeft:5, fontSize:10, color:full?'var(--green)':'var(--text-3)' }}>
                {dNoms.length}/{d.maxN}
              </span>
            </button>
          )
        })}
      </div>

      {activeDept&&(
        <div className="animate-fade-in">
          {/* Dept header */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <DeptBadge dept={activeDept.dept}/><TrackBadge track={activeDept.track}/>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{activeDept.teams.length} teams</span>
            </div>
            <div style={{ background:'var(--bg)', borderRadius:8, padding:'6px 12px', border:'1px solid var(--border)', fontSize:12, color:'var(--text-2)' }}>
              Select top <strong style={{color:'var(--gold)'}}>{activeDept.maxN}</strong> for finals
            </div>
          </div>

          {activeDept.teams.length===0 ? (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--text-3)' }}>No teams in this department</div>
          ) : isMobile ? (
            // ── Mobile: cards ──
            <div>
              {activeDept.teams.map((team,idx)=>{
                const nominated=isNominated(team.id)
                const rank=idx+1
                return (
                  <div key={team.id} style={{
                    background:nominated?'rgba(245,200,66,.04)':'var(--surface)',
                    border:nominated?'1px solid rgba(245,200,66,.25)':'1px solid var(--border)',
                    borderRadius:12, padding:'14px 16px', marginBottom:8,
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32, textAlign:'center', flexShrink:0 }}><RankMedal rank={rank}/></div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:2 }}>{team.project_title}</div>
                        <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>{team.registration_number}</div>
                        <div style={{ display:'flex', gap:10, marginTop:5, alignItems:'center' }}>
                          <span style={{ fontSize:16, fontWeight:800, fontFamily:"'Syne',sans-serif", color:team.avg>0?'var(--accent)':'var(--text-3)' }}>{team.avg||'—'}</span>
                          <span style={{ fontSize:11, color:'var(--text-3)' }}>{team.judgeCount}/3 judges · max {SCORE_MAX_TOTAL}pts</span>
                        </div>
                      </div>
                      <Button size="sm" variant={nominated?'danger':rank<=activeDept.maxN?'success':'ghost'}
                        disabled={saving[team.id]} onClick={()=>toggleNominee(team,rank)}>
                        {saving[team.id]?'…':nominated?<Minus size={13}/>:<Plus size={13}/>}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // ── Desktop: table ──
            <Card>
              <table>
                <thead><tr><th>Rank</th><th>Team</th><th>Avg</th><th>Relevance</th><th>Innovation</th><th>Method.</th><th>Present.</th><th>Exec.</th><th>Judges</th><th>Action</th></tr></thead>
                <tbody>
                  {activeDept.teams.map((team,idx)=>{
                    const nominated=isNominated(team.id), rank=idx+1
                    const avg=(k)=>team.indivScores.length?(team.indivScores.reduce((s,sc)=>s+sc[k],0)/team.indivScores.length).toFixed(1):'—'
                    return (
                      <tr key={team.id} style={{ background:nominated?'rgba(245,200,66,.025)':'transparent' }}>
                        <td><RankMedal rank={rank}/></td>
                        <td><div style={{ fontWeight:600, color:'var(--text)', fontSize:13 }}>{team.project_title}</div><div style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>{team.registration_number}</div></td>
                        <td><span style={{ fontSize:17, fontWeight:800, fontFamily:"'Syne',sans-serif", color:team.avg>0?'var(--accent)':'var(--text-3)' }}>{team.avg||'—'}</span></td>
                        <td style={{ fontSize:13 }}>{avg('relevance')}</td>
                        <td style={{ fontSize:13 }}>{avg('innovation')}</td>
                        <td style={{ fontSize:13 }}>{avg('methodology')}</td>
                        <td style={{ fontSize:13 }}>{avg('presentation')}</td>
                        <td style={{ fontSize:13 }}>{avg('executable')}</td>
                        <td style={{ fontSize:12, fontFamily:"'JetBrains Mono',monospace" }}>{team.judgeCount}/3</td>
                        <td>
                          <Button size="sm" variant={nominated?'danger':rank<=activeDept.maxN?'success':'ghost'} disabled={saving[team.id]} onClick={()=>toggleNominee(team,rank)}>
                            {saving[team.id]?'…':nominated?'Remove':'Nominate'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>
          )}

          {/* Current nominees */}
          {nominees.filter(n=>n.department===activeTab).length>0&&(
            <div style={{ marginTop:16 }}>
              <h3 style={{ fontSize:14, fontWeight:700, marginBottom:10, color:'var(--text-2)' }}>Selected Nominees — {activeTab}</h3>
              <div style={{ display:'flex', gap:9, flexWrap:'wrap' }}>
                {nominees.filter(n=>n.department===activeTab).sort((a,b)=>a.rank-b.rank).map(n=>(
                  <div key={n.id} style={{ background:'var(--surface)', border:`1px solid ${RANK_LABELS[n.rank]?.color||'var(--border)'}38`, borderRadius:11, padding:'11px 14px', minWidth:isMobile?'100%':180 }}>
                    <div style={{ fontSize:10, fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:RANK_LABELS[n.rank]?.color||'var(--text-3)', marginBottom:4 }}>RANK #{n.rank}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{n.teams?.project_title}</div>
                    <div style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>{n.teams?.registration_number}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
