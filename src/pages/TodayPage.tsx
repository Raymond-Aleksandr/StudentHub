import { useRef } from 'react'
import { BookOpen, CalendarClock, UploadCloud } from 'lucide-react'
import { usePlanner } from '../data/usePlanner'
import { EventCard } from '../components/EventCard'

export default function TodayPage() {
  const { stats, reminders, todayClasses, importState, importFiles, toggleComplete, removeEvent, updateEvent } = usePlanner()
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <section className="planner-hero planner-today-panel">
        <div>
          <span className="planner-eyebrow">Syllabus to schedule</span>
          <h2>Plan this week.</h2>
          <p>Upload course outlines once. StudentHub extracts courses, deadlines, exams, reminders, and today's schedule.</p>
        </div>
        <button className="planner-primary" onClick={() => fileInputRef.current?.click()} disabled={importState.tone === 'busy'}>
          <UploadCloud size={18} />
          {importState.tone === 'busy' ? 'Parsing...' : 'Upload PDF'}
        </button>
        <input ref={fileInputRef} className="planner-hidden-input" type="file" accept="application/pdf,.pdf" multiple onChange={(e) => { if (e.target.files) void importFiles(e.target.files) }} />
        <div className={`planner-status ${importState.tone}`}>{importState.message}</div>
      </section>

      <section className="planner-stats" aria-label="Planner summary">
        <div><strong>{stats.courses}</strong><span>Courses</span></div>
        <div><strong>{stats.tasks}</strong><span>Tasks</span></div>
        <div><strong>{stats.exams}</strong><span>Exams</span></div>
        <div><strong>{stats.next}</strong><span>Next</span></div>
      </section>

      <section className="planner-section">
        <div className="planner-section-title">
          <div><span>Attention</span><h2>Reminders</h2></div>
          <CalendarClock size={18} />
        </div>
        {reminders.length ? reminders.map((e) => (
          <EventCard key={`${e.title}-${e.date}-${e.time}-${e.sourceUploadId}`} event={e} onToggle={toggleComplete} onRemove={removeEvent} onUpdate={updateEvent} />
        )) : <div className="planner-empty">No urgent reminders right now.</div>}
      </section>

      <section className="planner-section">
        <div className="planner-section-title">
          <div><span>Schedule</span><h2>Classes today</h2></div>
          <BookOpen size={18} />
        </div>
        {todayClasses.length ? todayClasses.map((course) => (
          <article key={course.id} className="planner-course-row">
            <time>{course.startTime || '--:--'}</time>
            <div><h3>{course.code || course.title}</h3><p>{[course.title, course.location].filter(Boolean).join(' \u00b7 ')}</p></div>
          </article>
        )) : <div className="planner-empty">No classes scheduled today.</div>}
      </section>
    </>
  )
}
