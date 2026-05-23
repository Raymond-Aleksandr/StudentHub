import { BookOpen, FileUp, GraduationCap, Home, ListChecks } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import './BottomNav.css'

const items = [
  { label: 'Today', path: '/dashboard', icon: Home },
  { label: 'Import', path: '/import', icon: FileUp },
  { label: 'Tasks', path: '/tasks', icon: ListChecks },
  { label: 'Exams', path: '/exams', icon: GraduationCap },
  { label: 'Courses', path: '/course-info', icon: BookOpen },
]

function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="studenthub-bottom-nav" aria-label="Primary">
      {items.map(({ label, path, icon: Icon }) => (
        <button
          key={path}
          className={location.pathname === path ? 'active' : ''}
          onClick={() => navigate(path)}
          type="button"
        >
          <Icon size={18} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

export default BottomNav
