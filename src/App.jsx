import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import LoginPage from './pages/LoginPage.jsx'
import PublicLeaderboard from './pages/PublicLeaderboard.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminJudges from './pages/admin/AdminJudges.jsx'
import AdminTeams from './pages/admin/AdminTeams.jsx'
import AdminNominees from './pages/admin/AdminNominees.jsx'
import AdminPhase from './pages/admin/AdminPhase.jsx'
import AdminResults from './pages/admin/AdminResults.jsx'
import JudgeLayout from './pages/judge/JudgeLayout.jsx'
import JudgeDeptRound from './pages/judge/JudgeDeptRound.jsx'
import JudgeFinalRound from './pages/judge/JudgeFinalRound.jsx'
import JudgeProfile from './pages/judge/JudgeProfile.jsx'

function PrivateRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100svh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ width:36, height:36, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%' }} className="animate-spin"/>
    </div>
  )
  if (!user) return <Navigate to="/login" replace/>
  if (requireAdmin && user.role !== 'admin') return <Navigate to="/judge" replace/>
  return children
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        user ? <Navigate to={user.role==='admin'?'/admin':'/judge'} replace/> : <LoginPage/>
      }/>
      <Route path="/leaderboard" element={<PublicLeaderboard/>}/>

      {/* Admin routes */}
      <Route path="/admin" element={
        <PrivateRoute requireAdmin><AdminLayout/></PrivateRoute>
      }>
        <Route index element={<AdminDashboard/>}/>
        <Route path="judges"   element={<AdminJudges/>}/>
        <Route path="teams"    element={<AdminTeams/>}/>
        <Route path="nominees" element={<AdminNominees/>}/>
        <Route path="phase"    element={<AdminPhase/>}/>
        <Route path="results"  element={<AdminResults/>}/>
      </Route>

      {/* Judge routes */}
      <Route path="/judge" element={
        <PrivateRoute><JudgeLayout/></PrivateRoute>
      }>
        <Route index        element={<JudgeDeptRound/>}/>
        <Route path="final"   element={<JudgeFinalRound/>}/>
        <Route path="profile" element={<JudgeProfile/>}/>
      </Route>

      <Route path="/"  element={<Navigate to="/login" replace/>}/>
      <Route path="*"  element={<Navigate to="/login" replace/>}/>
    </Routes>
  )
}
