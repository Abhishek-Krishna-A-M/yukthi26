import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../lib/supabase.js'
import { SCORE_CRITERIA, SCORE_MAX_TOTAL } from '../../lib/constants.js'
import { Card, Alert, Spinner, DeptBadge } from '../../components/shared/UI.jsx'
import { CheckCircle, FloppyDisk, CaretLeft, CaretRight, X, Lock } from '@phosphor-icons/react'

/* ─────────────────────────────────────────────────────────────────
   ScoreCriterion — slider + number input combo, max 10 per field
   ───────────────────────────────────────────────────────────────── */
function ScoreCriterion({ label, description, value, onChange, max = 10, locked }) {
  const pct = (value / max) * 100
  const col = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--accent)' : pct >= 30 ? 'var(--gold)' : 'var(--red)'

  function handleInput(raw) {
    const n = parseInt(raw)
    if (isNaN(n)) { onChange(0); return }
    onChange(Math.min(max, Math.max(0, n)))
  }

  return (
    <div style={{
      marginBottom: 18,
      opacity: locked ? .55 : 1,
      pointerEvents: locked ? 'none' : 'auto',
    }}>
      {/* Top row: label + number input */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{description}</div>
        </div>
        {/* Inline number input — the "type it" method */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <input
            type="number"
            min={0}
            max={max}
            value={value === 0 ? '' : value}
            placeholder="0"
            onChange={e => handleInput(e.target.value)}
            onBlur={e => { if (e.target.value === '') onChange(0) }}
            style={{
              width: 52, height: 40, textAlign: 'center',
              background: 'var(--bg)', border: `1.5px solid ${col}60`,
              borderRadius: 9, color: col, fontSize: 18,
              fontFamily: "'Syne',sans-serif", fontWeight: 900,
              outline: 'none', WebkitAppearance: 'none',
              MozAppearance: 'textfield', boxSizing: 'border-box',
              transition: 'border-color .2s',
            }}
            onFocus={e => { e.target.style.borderColor = col; e.target.style.boxShadow = `0 0 0 3px ${col}22` }}
            onBlur2={e => { e.target.style.borderColor = `${col}60`; e.target.style.boxShadow = 'none' }}
          />
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace" }}>/{max}</span>
        </div>
      </div>

      {/* Slider track */}
      <div style={{ position: 'relative', height: 32 }}>
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0,
          height: 6, marginTop: -3,
          background: 'var(--bg)', borderRadius: 4, overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`, height: '100%', borderRadius: 4,
            background: `linear-gradient(90deg,var(--accent),${col})`,
            transition: 'width .08s, background .25s',
          }} />
        </div>
        <input
          type="range" min={0} max={max} value={value}
          onChange={e => onChange(parseInt(e.target.value))}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            opacity: 0, cursor: locked ? 'not-allowed' : 'pointer',
            margin: 0, touchAction: 'none',
          }}
        />
      </div>

      {/* Quick-pick buttons — 0,2,4,6,8,10 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginTop: 6 }}>
        {[0, 2, 4, 6, 8, 10].filter(v => v <= max).map(v => (
          <button key={v} onClick={() => onChange(v)} style={{
            padding: '6px 0', borderRadius: 6, fontSize: 12,
            fontFamily: "'JetBrains Mono',monospace", fontWeight: 700,
            cursor: 'pointer', minWidth: 0,
            border: value === v ? '1px solid var(--accent)' : '1px solid var(--border)',
            background: value === v ? 'var(--accent-glow)' : 'var(--bg)',
            color: value === v ? 'var(--accent)' : 'var(--text-3)',
          }}>{v}</button>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Main Page
   ───────────────────────────────────────────────────────────────── */
export default function JudgeDeptRound() {
  const { user } = useAuth()
  const [teams,    setTeams]    = useState([])
  const [scores,   setScores]   = useState({})
  const [active,   setActive]   = useState(null)
  const [draft,    setDraft]    = useState({ relevance: 0, innovation: 0, methodology: 0, presentation: 0, executable: 0 })
  const [phase,    setPhase]    = useState('round1')
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')
  const [listOpen, setListOpen] = useState(false)

  const isInternal = user?.evaluator_type === 'internal'
  const isExternal = user?.evaluator_type === 'external'
  // During final phase: internal judges are locked (read-only), external see their old dept scores locked too
  const isLocked = phase === 'final'

  useEffect(() => { fetchData() }, [user])

  async function fetchData() {
    if (!user?.departments?.length || !user?.track) return
    setLoading(true)

    const [tR, sR, phR] = await Promise.all([
      supabase.from('teams').select('*').in('department', user.departments).order('department').order('team_number'),
      supabase.from('scores').select('*').eq('judge_id', user.id),
      supabase.from('system_config').select('value').eq('key', `phase_track_${user.track}`).single(),
    ])

    const tList = tR.data || [], sList = sR.data || []
    const sMap = {}
    sList.forEach(s => { sMap[s.team_id] = s })
    setTeams(tList)
    setScores(sMap)
    if (phR.data) setPhase(phR.data.value)
    setLoading(false)

    if (tList.length && !active) {
      const first = tList.find(t => !sMap[t.id]) || tList[0]
      selectTeam(first, sMap)
    }
  }

  function selectTeam(team, sMap = scores) {
    setActive(team); setError(''); setSuccess(''); setListOpen(false)
    const ex = sMap[team.id]
    setDraft(ex
      ? { relevance: ex.relevance, innovation: ex.innovation, methodology: ex.methodology, presentation: ex.presentation, executable: ex.executable }
      : { relevance: 0, innovation: 0, methodology: 0, presentation: 0, executable: 0 })
  }

  const total = Object.values(draft).reduce((s, v) => s + v, 0)

  async function handleSave() {
    if (!active || isLocked) return
    // Validate — each criterion 0–10, total 0–50
    for (const c of SCORE_CRITERIA) {
      if (draft[c.key] < 0 || draft[c.key] > c.max) {
        setError(`${c.label} must be between 0 and ${c.max}`); return
      }
    }
    setSaving(true); setError(''); setSuccess('')
    const existing = scores[active.id]
    const { error } = existing
      ? await supabase.from('scores').update({ ...draft, updated_at: new Date().toISOString() }).eq('id', existing.id)
      : await supabase.from('scores').insert({ judge_id: user.id, team_id: active.id, ...draft })
    if (error) setError(error.message)
    else {
      setSuccess('Score saved!')
      fetchData()
      const idx = teams.findIndex(t => t.id === active.id)
      if (idx < teams.length - 1) setTimeout(() => selectTeam(teams[idx + 1]), 700)
    }
    setSaving(false)
  }

  const scored    = teams.filter(t => scores[t.id]).length
  const progress  = teams.length ? Math.round((scored / teams.length) * 100) : 0
  const activeIdx = teams.findIndex(t => t.id === active?.id)
  const totalColor = total >= 40 ? 'var(--green)' : total >= 25 ? 'var(--accent)' : 'var(--gold)'

  const deptGroups = (user?.departments || []).reduce((acc, d) => {
    acc[d] = teams.filter(t => t.department === d); return acc
  }, {})

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spinner size={32} /></div>
  if (!user?.departments?.length) return <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--text-3)' }}>No departments assigned.</div>

  return (
    <div style={{ width: '100%', overflowX: 'hidden' }}>

      {/* ── Locked banner (final phase) ───────────────────── */}
      {isLocked && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          background: 'rgba(240,92,92,.08)', border: '1px solid rgba(240,92,92,.25)',
          borderRadius: 10, marginBottom: 12,
        }}>
          <Lock size={15} color="var(--red)" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>Department round is closed</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
              {isExternal ? 'Please use the Track Final tab to submit your scores.' : 'Scores are locked. The track has moved to the final round.'}
            </div>
          </div>
        </div>
      )}

      {/* ── Progress + team picker ────────────────────────── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Syne',sans-serif", color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Progress
          </span>
          <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: progress === 100 ? 'var(--green)' : 'var(--accent)' }}>
            {scored}/{teams.length} scored
          </span>
        </div>
        <div style={{ height: 5, background: 'var(--bg)', borderRadius: 3, marginBottom: 10 }}>
          <div style={{
            height: '100%', borderRadius: 3, width: `${progress}%`,
            background: progress === 100 ? 'var(--green)' : 'linear-gradient(90deg,var(--accent),var(--purple))',
            transition: 'width .6s',
          }} />
        </div>
        {/* Team picker */}
        <button onClick={() => setListOpen(true)} style={{
          width: '100%', padding: '10px 12px', borderRadius: 9,
          background: 'var(--bg)', border: '1px solid var(--border)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          boxSizing: 'border-box',
        }}>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Syne',sans-serif", color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {active ? active.project_title : 'Select a team'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
              {active ? active.registration_number : 'Tap to choose'}
            </div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>
            {activeIdx >= 0 ? `${activeIdx + 1}/${teams.length}` : `—/${teams.length}`} ▾
          </span>
        </button>
      </div>

      {/* ── Team list bottom sheet ────────────────────────── */}
      {listOpen && (
        <div
          className="animate-fade-in"
          onClick={e => e.target === e.currentTarget && setListOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(4px)' }}
        >
          <div className="animate-slide-up" style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'var(--bg-2)', borderRadius: '18px 18px 0 0',
            maxHeight: '82svh', display: 'flex', flexDirection: 'column',
            border: '1px solid var(--border)',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-2)', margin: '10px auto 0', flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>Teams ({teams.length})</h3>
              <button onClick={() => setListOpen(false)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
                <X size={13} />
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 'env(safe-area-inset-bottom,0px)' }}>
              {Object.entries(deptGroups).map(([dept, dTeams]) => (
                <div key={dept}>
                  <div style={{ padding: '7px 16px', background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, zIndex: 1 }}>
                    <DeptBadge dept={dept} />
                    <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace" }}>
                      {dTeams.filter(t => scores[t.id]).length}/{dTeams.length} scored
                    </span>
                  </div>
                  {dTeams.map(team => {
                    const sc = scores[team.id]
                    const tot = sc ? sc.relevance + sc.innovation + sc.methodology + sc.presentation + sc.executable : 0
                    const isA = active?.id === team.id
                    return (
                      <button key={team.id} onClick={() => selectTeam(team)} style={{
                        width: '100%', textAlign: 'left', padding: '12px 16px',
                        borderBottom: '1px solid var(--border)',
                        background: isA ? 'rgba(79,142,247,.07)' : 'transparent',
                        border: 'none', borderLeft: isA ? '3px solid var(--accent)' : '3px solid transparent',
                        cursor: 'pointer', boxSizing: 'border-box',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                            background: sc ? 'var(--green)' : 'var(--border-2)',
                            boxShadow: sc ? '0 0 5px var(--green)' : 'none',
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: isA ? 700 : 500, color: isA ? 'var(--accent)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {team.project_title}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
                              {team.registration_number}
                            </div>
                          </div>
                          {sc && (
                            <div style={{ flexShrink: 0, textAlign: 'right' }}>
                              <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: 'var(--green)' }}>{tot}</span>
                              <span style={{ fontSize: 9, color: 'var(--text-3)', marginLeft: 2 }}>/{SCORE_MAX_TOTAL}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Scoring panel ─────────────────────────────────── */}
      {active && (
        <div className="animate-fade-in" style={{ width: '100%' }}>

          {/* Team header */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 5, marginBottom: 7, flexWrap: 'wrap' }}>
                  <DeptBadge dept={active.department} />
                  <span className="badge" style={{ color: 'var(--text-3)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    #{active.team_number}
                  </span>
                  {scores[active.id] && (
                    <span className="badge" style={{ color: 'var(--green)', background: 'rgba(61,214,140,.1)', border: '1px solid rgba(61,214,140,.25)' }}>
                      <CheckCircle size={9} weight="fill" /> Scored
                    </span>
                  )}
                  {isLocked && (
                    <span className="badge" style={{ color: 'var(--red)', background: 'rgba(240,92,92,.1)', border: '1px solid rgba(240,92,92,.25)' }}>
                      <Lock size={9} /> Locked
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.25, color: 'var(--text)', marginBottom: 3 }}>
                  {active.project_title}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace" }}>
                  {active.registration_number}
                </div>
              </div>
              {/* Total circle */}
              <div style={{
                width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg)', border: `2.5px solid ${totalColor}`,
              }}>
                <span style={{ fontSize: 18, fontWeight: 900, fontFamily: "'Syne',sans-serif", lineHeight: 1, color: totalColor }}>{total}</span>
                <span style={{ fontSize: 8, color: 'var(--text-3)', marginTop: 1 }}>/{SCORE_MAX_TOTAL}</span>
              </div>
            </div>
          </div>

          {/* Criteria */}
          <Card style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800 }}>Score Criteria</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isLocked && <Lock size={12} color="var(--red)" />}
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>10 pts each · {SCORE_MAX_TOTAL} total</span>
              </div>
            </div>
            {SCORE_CRITERIA.map(c => (
              <ScoreCriterion
                key={c.key}
                label={c.label}
                description={c.description}
                value={draft[c.key]}
                max={c.max}
                locked={isLocked}
                onChange={v => setDraft(d => ({ ...d, [c.key]: v }))}
              />
            ))}
          </Card>

          {/* Summary chips */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 12 }}>
            {SCORE_CRITERIA.map(c => {
              const p = (draft[c.key] / c.max) * 100
              const col = p >= 80 ? 'var(--green)' : p >= 50 ? 'var(--accent)' : 'var(--gold)'
              return (
                <div key={c.key} style={{ textAlign: 'center', background: 'var(--surface)', border: `1px solid ${col}28`, borderRadius: 9, padding: '8px 4px' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: col }}>{draft[c.key]}</div>
                  <div style={{ fontSize: 8, color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
                    {c.label.slice(0, 4).toUpperCase()}
                  </div>
                </div>
              )
            })}
            <div style={{ textAlign: 'center', background: 'rgba(155,109,255,.1)', border: '1px solid rgba(155,109,255,.22)', borderRadius: 9, padding: '8px 4px' }}>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: 'var(--purple)' }}>{total}</div>
              <div style={{ fontSize: 8, color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>TOTAL</div>
            </div>
          </div>

          {error   && <div style={{ marginBottom: 10 }}><Alert type="error"   message={error}   /></div>}
          {success && <div style={{ marginBottom: 10 }}><Alert type="success" message={success} /></div>}

          {/* Prev / Save / Next */}
          <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 44px', gap: 8 }}>
            <button onClick={() => { if (activeIdx > 0) selectTeam(teams[activeIdx - 1]) }} disabled={activeIdx <= 0}
              style={{ height: 48, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', cursor: activeIdx > 0 ? 'pointer' : 'not-allowed', opacity: activeIdx > 0 ? 1 : .3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
              <CaretLeft size={18} />
            </button>

            <button onClick={handleSave} disabled={saving || isLocked} style={{
              height: 48, borderRadius: 10, border: 'none',
              background: (saving || isLocked) ? 'var(--border)' : 'linear-gradient(135deg,var(--accent),#3a7ae0)',
              color: (saving || isLocked) ? 'var(--text-3)' : 'white',
              fontSize: 14, fontWeight: 700, fontFamily: "'Syne',sans-serif",
              cursor: (saving || isLocked) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: (saving || isLocked) ? 'none' : '0 4px 16px rgba(79,142,247,.28)',
              transition: 'all .2s',
            }}>
              {saving ? <><Spinner size={15} color="var(--text-3)" /> Saving...</>
                : isLocked ? <><Lock size={14} /> Scores Locked</>
                : <><FloppyDisk size={15} weight="fill" /> {scores[active.id] ? 'Update' : 'Submit Score'}</>
              }
            </button>

            <button onClick={() => { if (activeIdx < teams.length - 1) selectTeam(teams[activeIdx + 1]) }} disabled={activeIdx >= teams.length - 1}
              style={{ height: 48, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', cursor: activeIdx < teams.length - 1 ? 'pointer' : 'not-allowed', opacity: activeIdx < teams.length - 1 ? 1 : .3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
              <CaretRight size={18} />
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
