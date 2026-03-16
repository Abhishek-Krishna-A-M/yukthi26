import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../lib/supabase.js'
import { TRACKS, DEPT_FULL_NAMES, FINAL_SCORE_MAX } from '../../lib/constants.js'
import { Card, Alert, Spinner, DeptBadge, TrackBadge } from '../../components/shared/UI.jsx'
import { Trophy, FloppyDisk, CaretLeft, CaretRight, CheckCircle, X } from '@phosphor-icons/react'

export default function JudgeFinalRound() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [nominees, setNominees] = useState([])
  const [fScores,  setFScores]  = useState({})
  const [active,   setActive]   = useState(null)
  const [score,    setScore]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')
  const [listOpen, setListOpen] = useState(false)

  useEffect(() => {
    if (user?.evaluator_type !== 'external') { navigate('/judge', { replace: true }); return }
    fetchData()
  }, [user])

  async function fetchData() {
    if (!user?.track) return
    setLoading(true)
    const [nR, fR] = await Promise.all([
      supabase.from('nominees').select('*, teams(*)').eq('track', user.track),
      supabase.from('final_scores').select('*').eq('judge_id', user.id),
    ])
    const nList = nR.data || [], fList = fR.data || []
    const fMap = {}
    fList.forEach(f => { fMap[f.team_id] = f })
    setNominees(nList); setFScores(fMap); setLoading(false)
    if (nList.length && !active) selectNominee(nList[0], fMap)
  }

  function selectNominee(nom, fMap = fScores) {
    setActive(nom); setError(''); setSuccess(''); setListOpen(false)
    setScore(fMap[nom.team_id]?.score ?? 0)
  }

  // Typed input handler with clamp
  function handleScoreInput(raw) {
    const n = parseInt(raw)
    if (isNaN(n)) { setScore(0); return }
    setScore(Math.min(FINAL_SCORE_MAX, Math.max(0, n)))
  }

  async function handleSave() {
    if (!active) return
    if (score < 0 || score > FINAL_SCORE_MAX) {
      setError(`Score must be between 0 and ${FINAL_SCORE_MAX}`); return
    }
    setSaving(true); setError(''); setSuccess('')
    const existing = fScores[active.team_id]
    const { error } = existing
      ? await supabase.from('final_scores').update({ score, updated_at: new Date().toISOString() }).eq('id', existing.id)
      : await supabase.from('final_scores').insert({ judge_id: user.id, team_id: active.team_id, score })
    if (error) setError(error.message)
    else {
      setSuccess('Final score submitted!')
      fetchData()
      const idx = nominees.findIndex(n => n.team_id === active.team_id)
      if (idx < nominees.length - 1) setTimeout(() => selectNominee(nominees[idx + 1]), 700)
    }
    setSaving(false)
  }

  const scored     = nominees.filter(n => fScores[n.team_id]).length
  const pct        = nominees.length ? Math.round((scored / nominees.length) * 100) : 0
  const activeIdx  = nominees.findIndex(n => n.team_id === active?.team_id)
  const scoreColor = score >= 40 ? 'var(--green)' : score >= 30 ? 'var(--accent)' : score >= 20 ? 'var(--gold)' : 'var(--red)'

  const deptGroups = nominees.reduce((acc, n) => {
    if (!acc[n.department]) acc[n.department] = []
    acc[n.department].push(n)
    return acc
  }, {})

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spinner size={32} /></div>

  if (nominees.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55svh', textAlign: 'center', padding: 24 }}>
      <Trophy size={48} color="var(--text-3)" style={{ marginBottom: 14 }} />
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>No nominees yet</h2>
      <p style={{ color: 'var(--text-3)', fontSize: 13, maxWidth: 260, lineHeight: 1.6 }}>
        The admin hasn't selected nominees for Track {user?.track}. Check back after the department round.
      </p>
    </div>
  )

  return (
    <div style={{ width: '100%', overflowX: 'hidden' }}>

      {/* ── Banner ─────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(245,200,66,.08),rgba(232,125,62,.05))',
        border: '1px solid rgba(245,200,66,.22)', borderRadius: 12, padding: '12px 16px', marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Trophy size={24} weight="fill" color="var(--gold)" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold)' }}>Track {user?.track} Final</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
            {nominees.length} nominees · max {FINAL_SCORE_MAX} pts per judge · {TRACKS[user?.track]?.departments?.join(', ')}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: pct === 100 ? 'var(--green)' : 'var(--gold)' }}>
            {scored}/{nominees.length}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-3)' }}>scored</div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ height: 5, background: 'var(--bg)', borderRadius: 3, marginBottom: 12 }}>
        <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: 'linear-gradient(90deg,var(--gold),var(--bronze))', transition: 'width .6s' }} />
      </div>

      {/* ── Nominee picker ─────────────────────────────────── */}
      <button onClick={() => setListOpen(true)} style={{
        width: '100%', padding: '10px 14px', borderRadius: 10, marginBottom: 12,
        background: 'var(--surface)', border: '1px solid rgba(245,200,66,.22)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box',
      }}>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Syne',sans-serif", color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {active ? active.teams?.project_title : 'Select a nominee'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
            {active ? active.teams?.registration_number : 'Tap to choose'}
          </div>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>
          {activeIdx >= 0 ? `${activeIdx + 1}/${nominees.length}` : `—/${nominees.length}`} ▾
        </span>
      </button>

      {/* ── Bottom sheet ───────────────────────────────────── */}
      {listOpen && (
        <div className="animate-fade-in" onClick={e => e.target === e.currentTarget && setListOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(4px)' }}>
          <div className="animate-slide-up" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--bg-2)', borderRadius: '18px 18px 0 0', maxHeight: '82svh', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-2)', margin: '10px auto 0', flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>Nominees ({nominees.length})</h3>
              <button onClick={() => setListOpen(false)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
                <X size={13} />
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 'env(safe-area-inset-bottom,0px)' }}>
              {Object.entries(deptGroups).map(([dept, dNoms]) => (
                <div key={dept}>
                  <div style={{ padding: '7px 16px', background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, zIndex: 1 }}>
                    <DeptBadge dept={dept} />
                    <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace" }}>
                      {dNoms.filter(n => fScores[n.team_id]).length}/{dNoms.length}
                    </span>
                  </div>
                  {dNoms.map(nom => {
                    const isS = !!fScores[nom.team_id], isA = active?.team_id === nom.team_id
                    return (
                      <button key={nom.team_id} onClick={() => selectNominee(nom)} style={{
                        width: '100%', textAlign: 'left', padding: '12px 16px',
                        borderBottom: '1px solid var(--border)',
                        background: isA ? 'rgba(245,200,66,.07)' : 'transparent',
                        border: 'none', borderLeft: isA ? '3px solid var(--gold)' : '3px solid transparent',
                        cursor: 'pointer', boxSizing: 'border-box',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: isS ? 'var(--green)' : 'var(--border-2)' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: isA ? 700 : 500, color: isA ? 'var(--gold)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {nom.teams?.project_title}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
                              {nom.teams?.registration_number}
                            </div>
                          </div>
                          {isS && (
                            <div style={{ flexShrink: 0, textAlign: 'right' }}>
                              <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: 'var(--green)' }}>{fScores[nom.team_id].score}</span>
                              <span style={{ fontSize: 9, color: 'var(--text-3)', marginLeft: 2 }}>/{FINAL_SCORE_MAX}</span>
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

      {/* ── Scoring area ────────────────────────────────────── */}
      {active && (
        <div className="animate-fade-in" style={{ width: '100%' }}>

          {/* Team card */}
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(245,200,66,.18)', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              <DeptBadge dept={active.department} />
              <TrackBadge track={active.track} />
              <span className="badge" style={{ color: 'var(--gold)', background: 'rgba(245,200,66,.1)', border: '1px solid rgba(245,200,66,.25)' }}>Nominee</span>
              {fScores[active.team_id] && (
                <span className="badge" style={{ color: 'var(--green)', background: 'rgba(61,214,140,.1)', border: '1px solid rgba(61,214,140,.25)' }}>
                  <CheckCircle size={9} weight="fill" /> Scored
                </span>
              )}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.25, color: 'var(--text)', marginBottom: 3 }}>
              {active.teams?.project_title}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace" }}>
              {active.teams?.registration_number} · {DEPT_FULL_NAMES[active.department]}
            </div>
          </div>

          {/* Score input card */}
          <Card style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 2 }}>Final Score</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 20 }}>
              Holistic evaluation · max <strong style={{ color: 'var(--gold)' }}>{FINAL_SCORE_MAX}</strong> points
            </div>

            {/* Big number + inline type input side by side */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 18 }}>
              <div style={{ fontSize: 72, fontWeight: 900, fontFamily: "'Syne',sans-serif", lineHeight: 1, color: scoreColor, transition: 'color .25s', minWidth: 80, textAlign: 'center' }}>
                {score}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input
                  type="number"
                  min={0}
                  max={FINAL_SCORE_MAX}
                  value={score === 0 ? '' : score}
                  placeholder="0"
                  onChange={e => handleScoreInput(e.target.value)}
                  onBlur={e => { if (e.target.value === '') setScore(0) }}
                  style={{
                    width: 72, height: 44, textAlign: 'center',
                    background: 'var(--bg)', border: `2px solid ${scoreColor}60`,
                    borderRadius: 10, color: scoreColor, fontSize: 22,
                    fontFamily: "'Syne',sans-serif", fontWeight: 900,
                    outline: 'none', WebkitAppearance: 'none', MozAppearance: 'textfield',
                    boxSizing: 'border-box', transition: 'border-color .2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = scoreColor; e.target.style.boxShadow = `0 0 0 3px ${scoreColor}22` }}
                  onBlur2={e => { e.target.style.borderColor = `${scoreColor}60`; e.target.style.boxShadow = 'none' }}
                />
                <span style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center' }}>type it</span>
              </div>
              <div style={{ fontSize: 18, color: 'var(--text-3)' }}>/{FINAL_SCORE_MAX}</div>
            </div>

            {/* Slider */}
            <div style={{ position: 'relative', height: 34, marginBottom: 14 }}>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 7, marginTop: -3.5, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(score / FINAL_SCORE_MAX) * 100}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg,var(--accent),${scoreColor})`, transition: 'width .08s' }} />
              </div>
              <input type="range" min={0} max={FINAL_SCORE_MAX} value={score} onChange={e => setScore(parseInt(e.target.value))}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', touchAction: 'none' }} />
            </div>

            {/* Quick-pick — multiples of 5 up to 50 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5 }}>
              {[0, 10, 20, 30, 35, 40, 42, 45, 48, 50].slice(0, 12).map(v => (
                <button key={v} onClick={() => setScore(v)} style={{
                  padding: '8px 0', borderRadius: 7, fontSize: 12,
                  fontFamily: "'JetBrains Mono',monospace", fontWeight: 700,
                  cursor: 'pointer', minWidth: 0,
                  border: score === v ? '1px solid var(--gold)' : '1px solid var(--border)',
                  background: score === v ? 'rgba(245,200,66,.15)' : 'var(--bg)',
                  color: score === v ? 'var(--gold)' : 'var(--text-3)',
                }}>{v}</button>
              ))}
            </div>
          </Card>

          {error   && <div style={{ marginBottom: 10 }}><Alert type="error"   message={error}   /></div>}
          {success && <div style={{ marginBottom: 10 }}><Alert type="success" message={success} /></div>}

          {/* Prev / Save / Next */}
          <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 44px', gap: 8 }}>
            <button onClick={() => { if (activeIdx > 0) selectNominee(nominees[activeIdx - 1]) }} disabled={activeIdx <= 0}
              style={{ height: 50, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', cursor: activeIdx > 0 ? 'pointer' : 'not-allowed', opacity: activeIdx > 0 ? 1 : .3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
              <CaretLeft size={18} />
            </button>

            <button onClick={handleSave} disabled={saving} style={{
              height: 50, borderRadius: 10, border: 'none',
              background: saving ? 'var(--border)' : 'linear-gradient(135deg,var(--gold),var(--bronze))',
              color: saving ? 'var(--text-3)' : '#08090f',
              fontSize: 14, fontWeight: 800, fontFamily: "'Syne',sans-serif",
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: saving ? 'none' : '0 4px 14px rgba(245,200,66,.28)',
            }}>
              {saving
                ? <><Spinner size={14} color="var(--text-3)" /> Saving...</>
                : <><FloppyDisk size={14} weight="fill" /> {fScores[active.team_id] ? 'Update' : 'Submit Score'}</>
              }
            </button>

            <button onClick={() => { if (activeIdx < nominees.length - 1) selectNominee(nominees[activeIdx + 1]) }} disabled={activeIdx >= nominees.length - 1}
              style={{ height: 50, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', cursor: activeIdx < nominees.length - 1 ? 'pointer' : 'not-allowed', opacity: activeIdx < nominees.length - 1 ? 1 : .3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
              <CaretRight size={18} />
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
