import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Check, ChevronLeft, Clock, MapPin, Pencil, Plus, Trash2, UserRound, X } from 'lucide-react'
import { usePlanner } from '../data/usePlanner'
import { getDaysUntil } from '../domain/deadlines'
import type { ClassInfo } from '../domain/types'
import { courseColorOptions, courseMatchesEvent, normalizePercent, splitCourseCodes, tagForCourse, tagVarForColor } from '../domain/courseMeta'
import { getCourseGrade, getWeightStats } from '../domain/grades'
import { EventCard } from '../components/EventCard'
import { useModalBodyLock } from '../components/useModalBodyLock'

function CourseCodePills({ code, tag }: { code: string; tag: string }) {
  const codes = splitCourseCodes(code)
  return (
    <span className="code-pill-group" aria-label={code || 'Course'}>
      {(codes.length ? codes : ['Course']).map((courseCode) => (
        <span key={courseCode} className="tag-pill" style={{ '--tag': tag } as CSSProperties}>{courseCode}</span>
      ))}
    </span>
  )
}

function daysUntilLabel(date: string) {
  if (!date) return 'TBD'
  return String(getDaysUntil(date))
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
      grade: null,
      progress: null,
      color: '',
      sourceUploadId: '',
    }
    setEditingCourse(course ?? null)
    setCourseDraft(draft)
  }

  const patchDraft = (field: keyof ClassInfo, value: string | number | null) => {
    setCourseDraft((current) => {
      if (!current) return current
      const next = { ...current, [field]: field === 'grade' || field === 'progress' ? normalizePercent(value) : value }
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
      const fields: Array<Exclude<keyof ClassInfo, 'id'>> = ['title', 'code', 'day', 'startTime', 'endTime', 'time', 'location', 'profName', 'profEmail', 'taName', 'taEmail', 'grade', 'progress', 'color', 'sourceUploadId']
      for (const field of fields) {
        if (editingCourse[field] !== draft[field]) {
          await updateCourse(editingCourse.id, field, draft[field])
        }
      }
      setSelectedId((current) => current === editingCourse.id ? editingCourse.id : current)
    } else {
      const id = await addCourse(draft)
      if (id !== undefined) setSelectedId(id)
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
    const tag = tagForCourse(selected, index)
    const tasks = taskEvents.filter((event) => courseMatchesEvent(selected, event))
    const open = tasks.filter((event) => !event.completed)
    const done = tasks.filter((event) => event.completed)
    const allExams = examEvents.filter((event) => courseMatchesEvent(selected, event))
    const exams = allExams.filter((event) => !event.completed)
    const weightStats = getWeightStats([...tasks, ...allExams])
    const termProgress = weightStats.progress ?? selected.progress ?? 0
    const grade = getCourseGrade(selected, [...tasks, ...allExams])

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
            <span className="eyebrow">{grade.source === 'computed' ? 'Running grade' : 'Grade estimate'}</span>
            <span className="stat-n serif">{grade.value ?? '—'}{grade.value !== null && <small>%</small>}</span>
            <span className="stat-sub">{grade.source === 'computed' ? `${grade.gradedWeight}% graded weight` : 'manual, set in edit'}</span>
          </div>
          <div className="stat" style={{ cursor: 'default' }}>
            <span className="eyebrow">Term progress</span>
            <span className="stat-n serif">{termProgress}<small>%</small></span>
            <div className="stat-bar"><div style={{ width: `${termProgress}%`, background: tag }} /></div>
            <span className="stat-sub">{weightStats.total ? `${weightStats.assessed}% of ${weightStats.total}% assessed` : 'No weighted items'}</span>
          </div>
          <div className="stat" style={{ cursor: 'default' }}>
            <span className="eyebrow">Open tasks</span>
            <span className="stat-n serif">{open.length}</span>
            <span className="stat-sub">{open.filter((event) => getDaysUntil(event.date) <= 7).length} this week</span>
          </div>
          <div className="stat" style={{ cursor: 'default' }}>
            <span className="eyebrow">Next exam</span>
            <span className="stat-n serif">{exams[0] ? daysUntilLabel(exams[0].date) : '—'}{exams[0]?.date && <small>d</small>}</span>
            <span className="stat-sub">{exams[0] ? `${exams[0].title}${exams[0].weight ? ` · ${exams[0].weight}%` : ''}` : 'None scheduled'}</span>
          </div>
        </div>

        <div className="sec-head"><div><span className="eyebrow">Course workload</span><h2>Upcoming assessments</h2></div></div>
        <section className="card card-tight">
          <div className="course-workload">
            <div>
              <span className="eyebrow">Open tasks</span>
              <strong className="serif">{open.length}</strong>
              <span className="mono">{open.filter((event) => getDaysUntil(event.date) <= 7).length} due this week</span>
            </div>
            <div>
              <span className="eyebrow">Scheduled exams</span>
              <strong className="serif">{exams.length}</strong>
              <span className="mono">{exams[0] ? exams[0].date ? `${exams[0].title} in ${getDaysUntil(exams[0].date)}d` : `${exams[0].title} needs a date` : 'none scheduled'}</span>
            </div>
            <div>
              <span className="eyebrow">Weighted items</span>
              <strong className="serif">{weightStats.total || '—'}{weightStats.total ? <small>%</small> : null}</strong>
              <span className="mono">{weightStats.assessed}% already assessed</span>
            </div>
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
          const tag = tagForCourse(course, index)
          const tasks = taskEvents.filter((event) => courseMatchesEvent(course, event))
          const open = tasks.filter((event) => !event.completed).length
          const nextExam = examEvents.filter((event) => courseMatchesEvent(course, event) && !event.completed)[0]
          const courseExams = examEvents.filter((event) => courseMatchesEvent(course, event))
          const weightStats = getWeightStats([...tasks, ...courseExams])
          const termProgress = weightStats.progress ?? course.progress ?? 0
          const grade = getCourseGrade(course, [...tasks, ...courseExams])

          return (
            <article key={course.id} className="course-card card" style={{ '--tag': tag } as CSSProperties}>
              <button className="course-card-main" onClick={() => setSelectedId(course.id)}>
                <div className="cc-stripe" />
                <div className="cc-top">
                  <CourseCodePills code={course.code} tag={tag} />
                  <span className="mono cc-count">{tasks.length + (nextExam ? 1 : 0)} items</span>
                </div>
                <h3 className="serif">{course.title || 'Untitled course'}</h3>
                <div className="cc-meta">
                  <span><Clock size={12} /> {[course.day, course.time || course.startTime].filter(Boolean).join(' · ') || 'No schedule set'}</span>
                  <span><MapPin size={12} /> {course.location || 'No room set'}</span>
                </div>
                <div className="cc-progress">
                  <div className="cc-progress-bar"><div style={{ width: `${termProgress}%` }} /></div>
                  <span className="mono">{termProgress}% assessed</span>
                </div>
                <div className="cc-foot">
                  <div className="cc-stat">
                    <span className="serif">{open}</span>
                    <span className="mono">open tasks</span>
                  </div>
                  <div className="cc-stat">
                    <span className="serif">{grade.value ?? '—'}{grade.value !== null && <small>%</small>}</span>
                    <span className="mono">{grade.source === 'computed' ? 'running' : 'estimate'}</span>
                  </div>
                  <div className="cc-stat">
                    <span className="serif">{nextExam ? daysUntilLabel(nextExam.date) : '—'}{nextExam?.date && <small>d</small>}</span>
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
  onPatch: (field: keyof ClassInfo, value: string | number | null) => void
  onClose: () => void
  onSave: () => void
  onDelete?: () => void
}) {
  useModalBodyLock()

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
          <button className="tp-close" type="button" onClick={onClose} aria-label="Close">
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

          <section className="modal-field">
            <span>Course color</span>
            <div className="course-color-row" role="radiogroup" aria-label="Course color">
              {courseColorOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`course-color-swatch ${draft.color === option.id ? 'active' : ''}`}
                  style={{ '--tag': tagVarForColor(option.id) } as CSSProperties}
                  onClick={() => onPatch('color', option.id)}
                  aria-label={option.label}
                  aria-pressed={draft.color === option.id}
                />
              ))}
            </div>
          </section>

          <div className="modal-grid two">
            <label className="modal-field">
              <span>Manual grade estimate</span>
              <input className="modal-input" type="number" min="0" max="100" value={draft.grade ?? ''} onChange={(event) => onPatch('grade', event.target.value)} placeholder="%" />
            </label>
            <label className="modal-field">
              <span>Term progress</span>
              <input className="modal-input" type="number" min="0" max="100" value={draft.progress ?? ''} onChange={(event) => onPatch('progress', event.target.value)} placeholder="%" />
            </label>
          </div>

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

        <div className={onDelete ? 'modal-foot three' : 'modal-foot'}>
          {onDelete && (
            <button className="modal-btn-delete" type="button" onClick={onDelete} aria-label="Delete course">
              <Trash2 size={16} />
            </button>
          )}
          <button className="modal-btn modal-btn-cancel" type="button" onClick={onClose}>
            <X size={16} />Cancel
          </button>
          <button className="modal-btn modal-btn-save" type="button" onClick={onSave} disabled={!draft.title.trim() && !draft.code.trim()}>
            <Check size={16} />Save
          </button>
        </div>
      </section>
    </div>
  )
}
