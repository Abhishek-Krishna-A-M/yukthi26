import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import { DEPARTMENTS, DEPT_TRACK_MAP } from '../../lib/constants.js'
import { Card, Button, Modal, Input, Select, Alert, Spinner, TrackBadge, DeptBadge, PageHeader, MobileCard } from '../../components/shared/UI.jsx'
import { useBreakpoint } from '../../hooks/useBreakpoint.js'
import { Plus, PencilSimple, Lock, LockOpen, Trash, MagnifyingGlass } from '@phosphor-icons/react'

const EMPTY = { username:'',password:'',full_name:'',role:'judge',evaluator_type:'internal',track:1,departments:[],is_locked:false }
const DBT = { 1:['CE','ME','MRE'], 2:['EEE','ECE','RA'], 3:['AD','CSE-A','CSE-B'] }

export default function AdminJudges() {
  const { isMobile } = useBreakpoint()
  const [judges,setJudges]     = useState([])
  const [loading,setLoading]   = useState(true)
  const [modal,setModal]       = useState(null)
  const [form,setForm]         = useState(EMPTY)
  const [editing,setEditing]   = useState(null)
  const [error,setError]       = useState('')
  const [success,setSuccess]   = useState('')
  const [saving,setSaving]     = useState(false)
  const [search,setSearch]     = useState('')
  const [roleFilter,setRoleFilter] = useState('all')

  useEffect(()=>{ load() },[])

  async function load() {
    setLoading(true)
    const { data,error } = await supabase.from('judges').select('*').order('created_at')
    if (error) console.error('Judges fetch error:',error.message)
    setJudges(data||[])
    setLoading(false)
  }

  const openAdd  = ()=>{ setForm(EMPTY); setEditing(null); setError(''); setModal('form') }
  const openEdit = j=>{ setForm({...j,password:''}); setEditing(j); setError(''); setModal('form') }
  const openDel  = j=>{ setEditing(j); setModal('delete') }

  async function save() {
    if (!form.username||!form.full_name){ setError('Username and full name required'); return }
    if (!editing&&!form.password){ setError('Password required'); return }
    if (form.role==='judge'&&!form.departments?.length){ setError('Select at least one department'); return }
    setSaving(true); setError('')
    try {
      if (!editing) {
        const { error } = await supabase.rpc('create_judge_with_hash',{
          p_username:form.username.trim().toLowerCase(), p_password:form.password,
          p_full_name:form.full_name, p_role:form.role,
          p_evaluator_type:form.role==='admin'?null:form.evaluator_type,
          p_track:form.role==='admin'?null:Number(form.track),
          p_departments:form.role==='admin'?null:form.departments,
        })
        if (error) throw error
      } else {
        if (form.password) {
          const { error } = await supabase.rpc('update_judge_password',{p_judge_id:editing.id,p_password:form.password})
          if (error) throw error
        }
        const { error } = await supabase.from('judges').update({
          full_name:form.full_name, role:form.role,
          evaluator_type:form.role==='admin'?null:form.evaluator_type,
          track:form.role==='admin'?null:Number(form.track),
          departments:form.role==='admin'?null:form.departments,
          is_locked:form.is_locked,
        }).eq('id',editing.id)
        if (error) throw error
      }
      setSuccess(editing?'Judge updated':'Judge created'); setModal(null); load()
    } catch(e){ setError(e.message) }
    setSaving(false)
  }

  async function remove() {
    setSaving(true)
    const { error } = await supabase.from('judges').delete().eq('id',editing.id)
    if (error) setError(error.message)
    else { setSuccess('Judge removed'); setModal(null); load() }
    setSaving(false)
  }

  async function toggleLock(j) {
    await supabase.from('judges').update({is_locked:!j.is_locked}).eq('id',j.id)
    load()
  }

  const toggleDept = d => {
    const arr = form.departments.includes(d) ? form.departments.filter(x=>x!==d) : [...form.departments,d]
    setForm(f=>({...f, departments:arr, track:arr.length?DEPT_TRACK_MAP[arr[arr.length-1]]:f.track}))
  }

  const filtered = judges.filter(j=>{
    const s=search.toLowerCase()
    return (j.full_name.toLowerCase().includes(s)||j.username.toLowerCase().includes(s))
      && (roleFilter==='all'||j.role===roleFilter)
  })

  const p = 'clamp(14px,4vw,32px)'

  return (
    <div style={{ padding:`16px ${p}` }}>
      <PageHeader
        title="Judges"
        subtitle={`${judges.filter(j=>j.role==='judge').length} evaluators registered`}
        action={<Button onClick={openAdd} variant="primary" size={isMobile?'sm':'md'}><Plus size={14} weight="bold"/> {isMobile?'Add':'Add Judge'}</Button>}
      />

      {success&&<div style={{marginBottom:12}}><Alert type="success" message={success}/></div>}

      {/* Search + filter */}
      <Card style={{ marginBottom:12, padding:'12px 14px' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ position:'relative' }}>
            <MagnifyingGlass size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search judges..."
              style={{ width:'100%', padding:'9px 12px 9px 32px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:9, color:'var(--text)', fontSize:14, outline:'none', fontFamily:"'DM Sans',sans-serif" }}/>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {['all','admin','judge'].map(r=>(
              <button key={r} onClick={()=>setRoleFilter(r)} style={{
                flex:1, padding:'7px 0', borderRadius:8, fontSize:12,
                fontFamily:"'Syne',sans-serif", fontWeight:700, cursor:'pointer',
                border:roleFilter===r?'1px solid var(--accent)':'1px solid var(--border)',
                background:roleFilter===r?'var(--accent-glow)':'var(--surface)',
                color:roleFilter===r?'var(--accent)':'var(--text-3)',
              }}>{r.charAt(0).toUpperCase()+r.slice(1)}</button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:48 }}><Spinner/></div>
      ) : filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-3)' }}>
          <div style={{ fontSize:36, marginBottom:8 }}>👤</div>
          <p style={{ fontWeight:600 }}>No judges found</p>
        </div>
      ) : isMobile ? (
        // ── Mobile card list ──
        <div>
          {filtered.map(j=>(
            <MobileCard key={j.id}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:5 }}>{j.full_name}</div>
                  <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace", marginBottom:7 }}>@{j.username}</div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    <span className="badge" style={{ color:j.role==='admin'?'var(--purple)':'var(--accent)', background:j.role==='admin'?'rgba(155,109,255,.12)':'rgba(79,142,247,.12)', border:`1px solid ${j.role==='admin'?'rgba(155,109,255,.28)':'rgba(79,142,247,.28)'}` }}>{j.role}</span>
                    {j.evaluator_type&&<span className="badge" style={{ color:j.evaluator_type==='external'?'var(--gold)':'var(--green)', background:j.evaluator_type==='external'?'rgba(245,200,66,.12)':'rgba(61,214,140,.12)', border:`1px solid ${j.evaluator_type==='external'?'rgba(245,200,66,.28)':'rgba(61,214,140,.28)'}` }}>{j.evaluator_type}</span>}
                    {j.track&&<TrackBadge track={j.track}/>}
                    {(j.departments||[]).map(d=><DeptBadge key={d} dept={d}/>)}
                    <span className="badge" style={{ color:j.is_locked?'var(--red)':'var(--green)', background:j.is_locked?'rgba(240,92,92,.1)':'rgba(61,214,140,.1)', border:`1px solid ${j.is_locked?'rgba(240,92,92,.28)':'rgba(61,214,140,.28)'}` }}>
                      {j.is_locked?'Locked':'Active'}
                    </span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                  <Button size="sm" variant="ghost" onClick={()=>openEdit(j)}><PencilSimple size={13}/></Button>
                  <Button size="sm" variant={j.is_locked?'success':'danger'} onClick={()=>toggleLock(j)}>
                    {j.is_locked?<LockOpen size={13}/>:<Lock size={13}/>}
                  </Button>
                  {j.role!=='admin'&&<Button size="sm" variant="danger" onClick={()=>openDel(j)}><Trash size={13}/></Button>}
                </div>
              </div>
            </MobileCard>
          ))}
        </div>
      ) : (
        // ── Desktop table ──
        <Card>
          <table>
            <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Type</th><th>Track</th><th>Depts</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(j=>(
                <tr key={j.id}>
                  <td style={{ color:'var(--text)', fontWeight:600 }}>{j.full_name}</td>
                  <td style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:'var(--text-3)' }}>{j.username}</td>
                  <td><span className="badge" style={{ color:j.role==='admin'?'var(--purple)':'var(--accent)', background:j.role==='admin'?'rgba(155,109,255,.12)':'rgba(79,142,247,.12)', border:`1px solid ${j.role==='admin'?'rgba(155,109,255,.28)':'rgba(79,142,247,.28)'}` }}>{j.role}</span></td>
                  <td>{j.evaluator_type&&<span className="badge" style={{ color:j.evaluator_type==='external'?'var(--gold)':'var(--green)', background:j.evaluator_type==='external'?'rgba(245,200,66,.12)':'rgba(61,214,140,.12)', border:`1px solid ${j.evaluator_type==='external'?'rgba(245,200,66,.28)':'rgba(61,214,140,.28)'}` }}>{j.evaluator_type}</span>}</td>
                  <td>{j.track&&<TrackBadge track={j.track}/>}</td>
                  <td><div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>{(j.departments||[]).map(d=><DeptBadge key={d} dept={d}/>)}</div></td>
                  <td><span className="badge" style={{ color:j.is_locked?'var(--red)':'var(--green)', background:j.is_locked?'rgba(240,92,92,.1)':'rgba(61,214,140,.1)', border:`1px solid ${j.is_locked?'rgba(240,92,92,.28)':'rgba(61,214,140,.28)'}` }}>{j.is_locked?'Locked':'Active'}</span></td>
                  <td><div style={{ display:'flex', gap:5 }}>
                    <Button size="sm" variant="ghost" onClick={()=>openEdit(j)}><PencilSimple size={12}/></Button>
                    <Button size="sm" variant={j.is_locked?'success':'danger'} onClick={()=>toggleLock(j)}>{j.is_locked?<LockOpen size={12}/>:<Lock size={12}/>}</Button>
                    {j.role!=='admin'&&<Button size="sm" variant="danger" onClick={()=>openDel(j)}><Trash size={12}/></Button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modal==='form'} onClose={()=>setModal(null)} title={editing?'Edit Judge':'Add Judge'}>
        <Input label="Full Name" value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} placeholder="Dr. John Doe" required/>
        <Input label="Username" value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value.toLowerCase()}))} placeholder="john.doe" required/>
        <Input label={editing?'New Password (blank = keep)':'Password'} type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="••••••••" required={!editing}/>
        <Select label="Role" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} options={[{value:'judge',label:'Judge'},{value:'admin',label:'Admin'}]}/>
        {form.role==='judge'&&(
          <>
            <Select label="Type" value={form.evaluator_type} onChange={e=>setForm(f=>({...f,evaluator_type:e.target.value}))} options={[{value:'internal',label:'Internal'},{value:'external',label:'External'}]}/>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-3)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.08em', fontFamily:"'Syne',sans-serif" }}>Departments <span style={{color:'var(--red)'}}>*</span></label>
              {[1,2,3].map(tr=>(
                <div key={tr} style={{ marginBottom:9 }}>
                  <div style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace", marginBottom:5 }}>TRACK {tr}</div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    {DBT[tr].map(d=>(
                      <button key={d} type="button" onClick={()=>toggleDept(d)} style={{
                        padding:'6px 12px', borderRadius:8, fontSize:13, fontFamily:"'JetBrains Mono',monospace",
                        fontWeight:700, cursor:'pointer',
                        border:form.departments.includes(d)?'1px solid var(--accent)':'1px solid var(--border)',
                        background:form.departments.includes(d)?'var(--accent-glow)':'var(--surface)',
                        color:form.departments.includes(d)?'var(--accent)':'var(--text-3)',
                      }}>{d}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {editing&&<label style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer', fontSize:14, color:'var(--text-2)', marginBottom:14 }}>
              <input type="checkbox" checked={form.is_locked} onChange={e=>setForm(f=>({...f,is_locked:e.target.checked}))} style={{ width:16, height:16, accentColor:'var(--accent)' }}/>
              Lock this account
            </label>}
          </>
        )}
        {error&&<div style={{marginBottom:10}}><Alert type="error" message={error}/></div>}
        <div style={{ display:'flex', gap:8, paddingTop:6 }}>
          <Button variant="ghost" onClick={()=>setModal(null)} fullWidth>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving} fullWidth>{saving?'Saving...':editing?'Save Changes':'Create Judge'}</Button>
        </div>
      </Modal>

      <Modal open={modal==='delete'} onClose={()=>setModal(null)} title="Remove Judge" width={360}>
        <p style={{ color:'var(--text-2)', marginBottom:20, fontSize:14, lineHeight:1.5 }}>
          Remove <strong style={{color:'var(--text)'}}>{editing?.full_name}</strong>? All their scores will be deleted permanently.
        </p>
        <div style={{ display:'flex', gap:8 }}>
          <Button variant="ghost" onClick={()=>setModal(null)} fullWidth>Cancel</Button>
          <Button variant="danger" onClick={remove} disabled={saving} fullWidth>{saving?'Removing...':'Remove'}</Button>
        </div>
      </Modal>
    </div>
  )
}
