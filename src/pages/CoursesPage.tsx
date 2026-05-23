import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Check, ChevronLeft, Clock, MapPin, Pencil, Plus, Trash2, UserRound, X } from 'lucide-react'
import { usePlanner } from '../data/usePlanner'
import { getDaysUntil } from '../domain/deadlines'
import type { ClassInfo } from '../domain/types'
import { EventCard } from '../components/EventCard'

const tagVars = ['var(--tag-ochre)', 'var(--tag-plum)', 'var(--tag-slate)', 'var(--tag-sage)', 'var(--tag-teal)']

function tagFor(index: number) {
  return tagVars[index % tagVars.length]
}

export default function CoursesPage() {
  const { classes, taskEvents, examEvents, addCourse, updateCourse, removeCourse, toggleComplete, removeEvent, updateEvent } = usePlanner()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editingCourse, setEditingCourse] = useState<ClassInfo | null>(null)
  const [courseDraft, setCourseDraft] = useState<ClassInfo | null>(null)
  const selected = classes.find((course) => course.id === selectedId)

  const openCourseEditor = (course?: ClassInfo) => {
    const draft = course ?? {
      id: 0,
      title: '',
      code: '',
      day: '',
      startTime: '',
      endTime: '',
      time: '',
      location: '',
      profName: '',
      profEmail: '',
      taName: '',
      taEmail: '',
      sourceUploadId: '',
    }
    setEditingCourse(course ?? null)
    setCourseDraft(draft)
  }

  const patchDraft = (field: keyof ClassInfo, value: string) => {
    setCourseDraft((current) => {
      if (!current) return current
      const next = { ...current, [field]: value }
      if (field === 'startTime' || field === 'endTime') {
        next.time = [next.startTime, next.endTime].filter(Boolean).join(' - ')
      }
      return next
    })
  }

  const closeCourseEditor = () => {
    setEditingCourse(null)
    setCourseDraft(null)
  }

  const saveCourse = async () => {
    if (!courseDraft) return
    const draft = {
      ...courseDraft,
      title: courseDraft.title.trim(),
      code: courseDraft.code.trim().toUpperCase(),
      location: courseDraft.location.trim(),
      profName: courseDraft.profName.trim(),
      profEmail: courseDraft.profEmail.trim(),
      taName: courseDraft.taName.trim(),
      taEmail: courseDraft.taEmail.trim(),
      time: [courseDraft.startTime, courseDraft.endTime].filter(Boolean).join(' - '),
    }
    if (!draft.title && !draft.code) return

    if (editingCourse) {
      const fields: Array<Exclude<keyof ClassInfo, 'id'>> = ['title', 'code', 'day', 'startTime', 'endTime', 'time', 'location', 'profName', 'profEmail', 'taName', 'taEmail']
      for (const field of fields) {
        if (editingCourse[field] !== draft[field]) {
          await updateCourse(editingCourse.id, field, draft[field])
        }
      }
      setSelectedId((current) => current === editingCourse.id ? editingCourse.id : current)
    } else {
      const id = await addCourse(draft)
      if (id) setSelectedId(id)
    }
    closeCourseEditor()
  }

  const deleteCourse = async () => {
    if (!editingCourse) return
    await removeCourse(editingCourse.id)
    setSelectedId((current) => current === editingCourse.id ? null : current)
    closeCourseEditor()
  }

  const courseEditor = courseDraft && (
    <CourseEditorModal
      draft={courseDraft}
      isNew={!editingCourse}
      onPatch={patchDraft}
      onClose={closeCourseEditor}
      onSave={() => void saveCourse()}
      onDelete={editingCourse ? () => void deleteCourse() : undefined}
    />
  )

  if (selected) {
    const index = classes.findIndex((course) => course.id === selected.id)
    const tag = tagFor(index)
    const tasks = taskEvents.filter((event) => event.courseCode === selected.code)
    const open = tasks.filter((event) => !event.completed)
    const done = tasks.filter((event) => event.completed)
    const exams = examEvents.filter((event) => event.courseCode === selected.code && !event.completed)
    const progress = Math.min(0.9, Math.max(0.18, (done.length + 1) / Math.max(tasks.length + 3, 4)))

    return (
      <>
        <div className="topbar course-detail-head">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, width: '100%', minWidth: 0 }}>
            <button className="btn btn-soft" style={{ height: 38, width: 38, padding: 0, flexShrink: 0, marginTop: 8 }} onClick={() => setSelectedId(null)} aria-label="Back">
              <ChevronLeft size={16} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="eyebrow" style={{ color: tag }}>{selected.code}</span>
              <h1 style={{ fontSize: 'clamp(28px, 5vw, 52px)', marginTop: 6 }}>{selected.title || 'Untitled course'}</h1>
            </div>
            <button className="btn btn-soft" style={{ height: 38, width: 38, padding: 0, flexShrink: 0, marginTop: 8 }} onClick={() => openCourseEditor(selected)} aria-label="Edit course">
              <Pencil size={16} />
            </button>
          </div>
        </div>

        <div className="course-meta-line">
          <span><Clock size={13} /> {[selected.day, selected.time || selected.startTime].filter(Boolean).join(' · ') || 'No schedule set'}</span>
          <span><MapPin size={13} /> {selected.location || 'No room set'}</span>
          <span><UserRound size={13} /> {selected.profName || 'No instructor set'}</span>
        </div>

        <div className="stats stats-4" style={{ marginTop: 22 }}>
          <div className="stat" style={{ cursor: 'default' }}>
            <span className="eyebrow">Running grade</span>
            <span className="stat-n serif">{Math.round(76 + progress * 20)}<small>%</small></span>
            <span className="stat-sub">Editable estimate</span>
          </div>
          <div className="stat" style={{ cursor: 'default' }}>
            <span className="eyebrow">Term progress</span>
            <span className="stat-n serif">{Math.round(progress * 100)}<small>%</small></span>
            <div className="stat-bar"><div style={{ width: `${progress * 100}%`, background: tag }} /></div>
          </div>
          <div className="stat" style={{ cursor: 'default' }}>
            <span className="eyebrow">Open tasks</span>
            <span className="stat-n serif">{open.length}</span>
            <span className="stat-sub">{open.filter((event) => getDaysUntil(event.date) <= 7).length} this week</span>
          </div>
          <div className="stat" style={{ cursor: 'default' }}>
            <span className="eyebrow">Next exam</span>
            <span className="stat-n serif">{exams[0] ? getDaysUntil(exams[0].date) : '—'}{exams[0] && <small>d</small>}</span>
            <span className="stat-sub">{exams[0]?.title ?? 'None scheduled'}</span>
          </div>
        </div>

        <div className="sec-head"><div><span className="eyebrow">Syllabus arc</span><h2>Weeks 1-14</h2></div></div>
        <section className="card card-tight">
          <div className="arc">
            {Array.from({ length: 14 }, (_, week) => {
              const current = Math.floor(progress * 14)
              return (
                <div key={week} className={`arc-week ${week < current ? 'past' : ''} ${week === current ? 'cur' : ''}`}>
                  <span className="mono">W{week + 1}</span>
                  <div className="arc-bar" style={week <= current ? { background: tag, opacity: week === current ? 1 : 0.45 } : undefined} />
                </div>
              )
            })}
          </div>
        </section>

        <div className="sec-head"><div><span className="eyebrow">Assignments</span><h2>{open.length} open · {done.length} done</h2></div></div>
        {tasks.length ? tasks.map((event) => (
          <EventCard
            key={`${event.title}-${event.date}-${event.time}-${event.sourceUploadId}`}
            event={event}
            onToggle={toggleComplete}
            onRemove={removeEvent}
            onUpdate={updateEvent}
          />
        )) : <div className="empty"><h3>No tasks for this course</h3><p>Imported deadlines will appear here.</p></div>}
        {courseEditor}
      </>
    )
  }

  return (
    <>
      <section className="course-grid">
        {classes.map((course, index) => {
          const tag = tagFor(index)
          const tasks = taskEvents.filter((event) => event.courseCode === course.code)
          const open = tasks.filter((event) => !event.completed).length
          const done = tasks.filter((event) => event.completed).length
          const nextExam = examEvents.filter((event) => event.courseCode === course.code && !event.completed)[0]
          const progress = Math.min(0.9, Math.max(0.18, (done + 1) / Math.max(tasks.length + 3, 4)))

          return (
            <article key={course.id} className="course-card card" style={{ '--tag': tag } as CSSProperties}>
              <button className="course-card-main" onClick={() => setSelectedId(course.id)}>
                <div className="cc-stripe" />
                <div className="cc-top">
                  <span className="tag-pill" style={{ '--tag': tag } as CSSProperties}>{course.code || 'Course'}</span>
                  <span className="mono cc-grade">{Math.round(76 + progress * 20)}<small>%</small></span>
                </div>
                <h3 className="serif">{course.title || 'Untitled course'}</h3>
                <div className="cc-meta">
                  <span><Clock size={12} /> {[course.day, course.time || course.startTime].filter(Boolean).join(' · ') || 'No schedule set'}</span>
                  <span><MapPin size={12} /> {course.location || 'No room set'}</span>
                </div>
                <div className="cc-progress">
                  <div className="cc-progress-bar"><div style={{ width: `${progress * 100}%` }} /></div>
                  <span className="mono">{Math.round(progress * 100)}% term</span>
                </div>
                <div className="cc-foot">
                  <div className="cc-stat">
                    <span className="serif">{open}</span>
                    <span className="mono">open tasks</span>
                  </div>
                  <div className="cc-stat">
                    <span className="serif">{tasks.length ? Math.round((done / tasks.length) * 100) : 0}<small>%</small></span>
                    <span className="mono">tasks done</span>
                  </div>
                  <div className="cc-stat">
                    <span className="serif">{nextExam ? getDaysUntil(nextExam.date) : '—'}{nextExam && <small>d</small>}</span>
                    <span className="mono">next exam</span>
                  </div>
                </div>
              </button>
              <button className="course-edit-btn" onClick={() => openCourseEditor(course)} aria-label={`Edit ${course.code || course.title || 'course'}`}>
                <Pencil size={15} />
              </button>
            </article>
          )
        })}

        <button className="course-add card" onClick={() => openCourseEditor()}>
          <Plus size={20} />
          <span>Add course</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>Manual or via syllabus</span>
        </button>
      </section>

      {courseEditor}
    </>
  )
}

function CourseEditorModal({
  draft,
  isNew,
  onPatch,
  onClose,
  onSave,
  onDelete,
}: {
  draft: ClassInfo
  isNew: boolean
  onPatch: (field: keyof ClassInfo, value: string) => void
  onClose: () => void
  onSave: () => void
  onDelete?: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="modal course-modal" role="dialog" aria-modal="true" aria-label={isNew ? 'Add course' : 'Edit course'}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">{isNew ? 'New course' : draft.code || 'Course'}</span>
            <input
              className="modal-title-input"
              value={draft.title}
              onChange={(event) => onPatch('title', event.target.value)}
              placeholder="Course title"
              autoFocus
            />
          </div>
          <button className="modal-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-grid two">
            <label className="modal-field">
              <span>Course code</span>
              <input className="modal-input" value={draft.code} onChange={(event) => onPatch('code', event.target.value.toUpperCase())} placeholder="Course code" />
            </label>
            <label className="modal-field">
              <span>Meeting day</span>
              <select className="modal-input" value={draft.day} onChange={(event) => onPatch('day', event.target.value)}>
                <option value="">No meeting day</option>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => <option key={day} value={day}>{day}</option>)}
              </select>
            </label>
            <label className="modal-field">
              <span>Start time</span>
              <input className="modal-input" type="time" value={draft.startTime} onChange={(event) => onPatch('startTime', event.target.value)} />
            </label>
            <label className="modal-field">
              <span>End time</span>
              <input className="modal-input" type="time" value={draft.endTime} onChange={(event) => onPatch('endTime', event.target.value)} />
            </label>
          </div>

          <label className="modal-field">
            <span>Location</span>
            <input className="modal-input" value={draft.location} onChange={(event) => onPatch('location', event.target.value)} placeholder="Location" />
          </label>

          <div className="modal-grid two">
            <label className="modal-field">
              <span>Instructor</span>
              <input className="modal-input" value={draft.profName} onChange={(event) => onPatch('profName', event.target.value)} placeholder="Instructor name" />
            </label>
            <label className="modal-field">
              <span>Instructor email</span>
              <input className="modal-input" type="email" value={draft.profEmail} onChange={(event) => onPatch('profEmail', event.target.value)} placeholder="name@school.edu" />
            </label>
          </div>
        </div>

        <div className="modal-foot">
          {onDelete ? (
            <button className="modal-danger" onClick={onDelete}>
              <Trash2 size={16} /> Delete
            </button>
          ) : <span />}
          <div className="modal-foot-actions">
            <button className="btn btn-soft" onClick={onClose}>Cancel</button>
            <button className="btn btn-accent" onClick={onSave} disabled={!draft.title.trim() && !draft.code.trim()}>
              <Check size={16} /> Save
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
