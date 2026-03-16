import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import { DEPARTMENTS, DEPT_TRACK_MAP, DEPT_FULL_NAMES } from '../../lib/constants.js'
import { Card, Button, Modal, Input, Select, Alert, Spinner, TrackBadge, DeptBadge, PageHeader, MobileCard } from '../../components/shared/UI.jsx'
import { useBreakpoint } from '../../hooks/useBreakpoint.js'
import { Plus, PencilSimple, Trash, UploadSimple, MagnifyingGlass } from '@phosphor-icons/react'

const EMPTY = { team_number:'', registration_number:'', project_title:'', department:'CE' }

export default function AdminTeams() {
  const { isMobile } = useBreakpoint()
  const [teams,setTeams]     = useState([])
  const [loading,setLoading] = useState(true)
  const [modal,setModal]     = useState(null)
  const [form,setForm]       = useState(EMPTY)
  const [editing,setEditing] = useState(null)
  const [error,setError]     = useState('')
  const [success,setSuccess] = useState('')
  const [saving,setSaving]   = useState(false)
  const [search,setSearch]   = useState('')
  const [deptFilter,setDeptFilter] = useState('all')
  const [bulkText,setBulkText] = useState('')

  useEffect(()=>{ load() },[])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('teams').select('*').order('department').order('team_number')
    setTeams(data||[])
    setLoading(false)
  }

  async function save() {
    if (!form.registration_number||!form.project_title||!form.department){ setError('All fields required'); return }
    setSaving(true); setError('')
    const payload = { team_number:parseInt(form.team_number)||1, registration_number:form.registration_number.trim().toUpperCase(), project_title:form.project_title.trim(), department:form.department, track:DEPT_TRACK_MAP[form.department] }
    const { error } = editing
      ? await supabase.from('teams').update(payload).eq('id',editing.id)
      : await supabase.from('teams').insert(payload)
    if (error) setError(error.message)
    else { setSuccess(editing?'Updated':'Team added'); setModal(null); load() }
    setSaving(false)
  }

  async function remove() {
    setSaving(true)
    const { error } = await supabase.from('teams').delete().eq('id',editing.id)
    if (error) setError(error.message)
    else { setSuccess('Removed'); setModal(null); load() }
    setSaving(false)
  }

  async function bulkImport() {
    if (!bulkText.trim()) return
    setSaving(true); setError('')
    try {
      const rows = bulkText.trim().split('\n').filter(l=>l.trim()).map(line=>{
        const parts = line.split('\t').map(p=>p.trim())
        if (parts.length<3) throw new Error(`Invalid row: ${line}`)
        const [reg,title,dept] = parts
        if (!DEPARTMENTS.includes(dept)) throw new Error(`Invalid dept: ${dept}`)
        return { registration_number:reg.toUpperCase(), project_title:title, department:dept, track:DEPT_TRACK_MAP[dept], team_number:1 }
      })
      const { error } = await supabase.from('teams').upsert(rows,{onConflict:'registration_number'})
      if (error) throw error
      setSuccess(`${rows.length} teams imported`); setModal(null); setBulkText(''); load()
    } catch(e){ setError(e.message) }
    setSaving(false)
  }

  const filtered = teams.filter(t=>{
    const s=search.toLowerCase()
    return (t.project_title.toLowerCase().includes(s)||t.registration_number.toLowerCase().includes(s))
      && (deptFilter==='all'||t.department===deptFilter)
  })

  const p = 'clamp(14px,4vw,32px)'

  return (
    <div style={{ padding:`16px ${p}` }}>
      <PageHeader
        title="Teams"
        subtitle={`${teams.length} teams across ${DEPARTMENTS.length} departments`}
        action={
          <div style={{ display:'flex', gap:7 }}>
            <Button variant="ghost" size="sm" onClick={()=>setModal('bulk')}><UploadSimple size={13}/>{!isMobile&&' Import'}</Button>
            <Button variant="primary" size="sm" onClick={()=>{ setForm(EMPTY); setEditing(null); setError(''); setModal('form') }}>
              <Plus size={13} weight="bold"/>{!isMobile&&' Add Team'}
            </Button>
          </div>
        }
      />

      {success&&<div style={{marginBottom:12}}><Alert type="success" message={success}/></div>}

      {/* Dept filter chips */}
      <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4, marginBottom:12 }}>
        <button onClick={()=>setDeptFilter('all')} style={{ padding:'5px 12px', borderRadius:8, fontSize:11, flexShrink:0, fontFamily:"'Syne',sans-serif", fontWeight:700, cursor:'pointer', border:deptFilter==='all'?'1px solid var(--accent)':'1px solid var(--border)', background:deptFilter==='all'?'var(--accent-glow)':'var(--surface)', color:deptFilter==='all'?'var(--accent)':'var(--text-3)' }}>
          All ({teams.length})
        </button>
        {DEPARTMENTS.map(d=>(
          <button key={d} onClick={()=>setDeptFilter(d)} style={{ padding:'5px 10px', borderRadius:8, fontSize:11, flexShrink:0, fontFamily:"'JetBrains Mono',monospace", fontWeight:700, cursor:'pointer', border:deptFilter===d?'1px solid var(--accent)':'1px solid var(--border)', background:deptFilter===d?'var(--accent-glow)':'var(--surface)', color:deptFilter===d?'var(--accent)':'var(--text-3)' }}>
            {d} ({teams.filter(t=>t.department===d).length})
          </button>
        ))}
      </div>

      {/* Search */}
      <Card style={{ marginBottom:12, padding:'11px 13px' }}>
        <div style={{ position:'relative' }}>
          <MagnifyingGlass size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by title or reg number..."
            style={{ width:'100%', padding:'9px 12px 9px 32px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:9, color:'var(--text)', fontSize:14, outline:'none', fontFamily:"'DM Sans',sans-serif" }}/>
        </div>
      </Card>

      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:48 }}><Spinner/></div>
      : filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-3)' }}>
          <div style={{ fontSize:36, marginBottom:8 }}>📋</div>
          <p style={{ fontWeight:600 }}>No teams found</p>
          <p style={{ fontSize:13, marginTop:4 }}>Add teams using the button above</p>
        </div>
      ) : isMobile ? (
        <div>
          {filtered.map(t=>(
            <MobileCard key={t.id}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:10, justifyContent:'space-between' }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:5 }}>{t.project_title}</div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:4 }}>
                    <DeptBadge dept={t.department}/><TrackBadge track={t.track}/>
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>{t.registration_number}</div>
                </div>
                <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                  <Button size="sm" variant="ghost" onClick={()=>{ setForm({...t}); setEditing(t); setError(''); setModal('form') }}><PencilSimple size={13}/></Button>
                  <Button size="sm" variant="danger" onClick={()=>{ setEditing(t); setModal('delete') }}><Trash size={13}/></Button>
                </div>
              </div>
            </MobileCard>
          ))}
        </div>
      ) : (
        <Card>
          <table>
            <thead><tr><th>#</th><th>Reg No.</th><th>Project Title</th><th>Dept</th><th>Track</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(t=>(
                <tr key={t.id}>
                  <td style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:'var(--text-3)' }}>{t.team_number}</td>
                  <td style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12 }}>{t.registration_number}</td>
                  <td style={{ color:'var(--text)', fontWeight:500, maxWidth:300 }}>{t.project_title}</td>
                  <td><DeptBadge dept={t.department}/></td>
                  <td><TrackBadge track={t.track}/></td>
                  <td><div style={{ display:'flex', gap:5 }}>
                    <Button size="sm" variant="ghost" onClick={()=>{ setForm({...t}); setEditing(t); setError(''); setModal('form') }}><PencilSimple size={12}/></Button>
                    <Button size="sm" variant="danger" onClick={()=>{ setEditing(t); setModal('delete') }}><Trash size={12}/></Button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modal==='form'} onClose={()=>setModal(null)} title={editing?'Edit Team':'Add Team'}>
        <Input label="Registration Number" value={form.registration_number} onChange={e=>setForm(f=>({...f,registration_number:e.target.value}))} placeholder="YUK26-CE-001" required/>
        <Input label="Project Title" value={form.project_title} onChange={e=>setForm(f=>({...f,project_title:e.target.value}))} placeholder="Smart Bridge Monitor" required/>
        <Select label="Department" value={form.department} onChange={e=>setForm(f=>({...f,department:e.target.value}))} options={DEPARTMENTS.map(d=>({value:d,label:`${d} — ${DEPT_FULL_NAMES[d]}`}))} required/>
        <Input label="Team # (order in dept)" type="number" value={form.team_number} onChange={e=>setForm(f=>({...f,team_number:e.target.value}))} placeholder="1"/>
        {error&&<div style={{marginBottom:10}}><Alert type="error" message={error}/></div>}
        <div style={{ display:'flex', gap:8, paddingTop:6 }}>
          <Button variant="ghost" onClick={()=>setModal(null)} fullWidth>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving} fullWidth>{saving?'Saving...':editing?'Save':'Add Team'}</Button>
        </div>
      </Modal>

      <Modal open={modal==='delete'} onClose={()=>setModal(null)} title="Remove Team" width={360}>
        <p style={{ color:'var(--text-2)', marginBottom:20, fontSize:14, lineHeight:1.5 }}>Remove <strong style={{color:'var(--text)'}}>{editing?.project_title}</strong>? All scores will be deleted.</p>
        <div style={{ display:'flex', gap:8 }}>
          <Button variant="ghost" onClick={()=>setModal(null)} fullWidth>Cancel</Button>
          <Button variant="danger" onClick={remove} disabled={saving} fullWidth>{saving?'Removing...':'Remove'}</Button>
        </div>
      </Modal>

      <Modal open={modal==='bulk'} onClose={()=>setModal(null)} title="Bulk Import Teams">
        <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:6 }}>
          Tab-separated: <span style={{ fontFamily:"'JetBrains Mono',monospace", color:'var(--accent)', fontSize:12 }}>RegNo ⇥ Title ⇥ Dept</span>
        </p>
        <p style={{ fontSize:11, color:'var(--text-3)', marginBottom:12 }}>Valid depts: {DEPARTMENTS.join(', ')}</p>
        <textarea value={bulkText} onChange={e=>setBulkText(e.target.value)}
          placeholder={"YUK26-CE-001\tSmart Monitor\tCE\nYUK26-CE-002\tAuto Gate\tCE"}
          style={{ width:'100%', height:180, padding:'10px 13px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:12, fontFamily:"'JetBrains Mono',monospace", outline:'none', resize:'vertical' }}/>
        {error&&<div style={{margin:'8px 0'}}><Alert type="error" message={error}/></div>}
        <div style={{ display:'flex', gap:8, paddingTop:8 }}>
          <Button variant="ghost" onClick={()=>setModal(null)} fullWidth>Cancel</Button>
          <Button variant="primary" onClick={bulkImport} disabled={saving} fullWidth>{saving?'Importing...':'Import'}</Button>
        </div>
      </Modal>
    </div>
  )
}
