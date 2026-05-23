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

function navResetState() {
  return { navResetAt: Date.now() }
}

function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const openNavItem = (path: string) => {
    if (location.pathname === path) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
      void navigate(path, { replace: true, state: navResetState() })
      return
    }

    void navigate(path)
  }

  return (
    <nav className="studenthub-bottom-nav" aria-label="Primary">
      {items.map(({ label, path, icon: Icon }) => (
        <button
          key={path}
          className={location.pathname === path ? 'active' : ''}
          onClick={() => openNavItem(path)}
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
