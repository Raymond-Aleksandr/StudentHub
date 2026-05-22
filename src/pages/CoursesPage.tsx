import { Plus, Trash2 } from 'lucide-react'
import { usePlanner } from '../data/usePlanner'
import { WEEKDAYS } from '../domain/calendar'

export default function CoursesPage() {
  const { classes, addCourse, updateCourse, removeCourse } = usePlanner()

  return (
    <section className="planner-section">
      <button className="planner-secondary" onClick={() => void addCourse()}><Plus size={16} /> Add course</button>
      <div className="planner-course-editor-list">
        {classes.length ? classes.map((course) => (
          <article key={course.id} className="planner-course-editor">
            <div className="planner-course-editor-head">
              <span>{course.code || `Course ${course.id + 1}`}</span>
              <button className="planner-icon-danger" onClick={() => void removeCourse(course.id)} aria-label="Delete course"><Trash2 size={17} /></button>
            </div>
            <input value={course.title} placeholder="Course title" onChange={(e) => void updateCourse(course.id, 'title', e.target.value)} />
            <input value={course.code} placeholder="Course code" onChange={(e) => void updateCourse(course.id, 'code', e.target.value)} />
            <div className="planner-field-grid">
              <select value={course.day} onChange={(e) => void updateCourse(course.id, 'day', e.target.value)}>
                <option value="">Day</option>
                {WEEKDAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <input type="time" value={course.startTime} onChange={(e) => void updateCourse(course.id, 'startTime', e.target.value)} />
              <input type="time" value={course.endTime} onChange={(e) => void updateCourse(course.id, 'endTime', e.target.value)} />
            </div>
            <input value={course.location} placeholder="Location" onChange={(e) => void updateCourse(course.id, 'location', e.target.value)} />
            <input value={course.profName} placeholder="Instructor" onChange={(e) => void updateCourse(course.id, 'profName', e.target.value)} />
          </article>
        )) : <div className="planner-empty">Courses from uploaded syllabi will appear here.</div>}
      </div>
    </section>
  )
}
