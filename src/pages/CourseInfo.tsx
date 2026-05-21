import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { auth } from '../localAuth'
import { getDefaultClasses, saveClasses, subscribeToClasses, type StoredClassInfo } from '../storage'
import './CourseInfo.css'

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function createEmptyCourse(id: number): StoredClassInfo {
  return {
    id,
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
  }
}

const CourseInfo: React.FC = () => {
  const navigate = useNavigate()
  const [classes, setClasses] = useState<StoredClassInfo[]>(() => getDefaultClasses())

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) return

    return subscribeToClasses(uid, setClasses)
  }, [])

  const sortedClasses = useMemo(() => [...classes].sort((a, b) => a.id - b.id), [classes])

  const saveNextClasses = async (nextClasses: StoredClassInfo[]) => {
    const uid = auth.currentUser?.uid
    const normalized = nextClasses.map((course, index) => ({
      ...course,
      id: course.id ?? index,
      time: [course.startTime, course.endTime].filter(Boolean).join(' - '),
    }))
    setClasses(normalized)
    if (uid) await saveClasses(uid, normalized)
  }

  const updateClass = async (id: number, field: keyof StoredClassInfo, value: string) => {
    const nextClasses = classes.map((course) => {
      if (course.id !== id) return course

      const nextCourse = { ...course, [field]: value }
      if (field === 'startTime' || field === 'endTime') {
        nextCourse.time = [nextCourse.startTime, nextCourse.endTime].filter(Boolean).join(' - ')
      }

      return nextCourse
    })
    await saveNextClasses(nextClasses)
  }

  const addCourse = async () => {
    const nextId = classes.reduce((max, course) => Math.max(max, course.id), -1) + 1
    await saveNextClasses([...classes, createEmptyCourse(nextId)])
  }

  const deleteClass = async (id: number) => {
    await saveNextClasses(classes.filter((course) => course.id !== id))
  }

  return (
    <div id="ismail-course-info-page">
      <div className="info-shell">
        <header className="info-header">
          <div className="info-header-top">
            <button className="back-btn-red" onClick={() => navigate('/dashboard')}>Back</button>
            <div className="info-header-badge">Auto-saving</div>
          </div>
          <div className="info-hero">
            <div>
              <p className="info-kicker">Course Registry</p>
              <h1>Your classes, without fixed slots</h1>
              <p className="info-subtitle">
                Add as many courses as you need. Syllabus uploads fill this list automatically, and edits feed the planner schedule.
              </p>
            </div>
            <div className="info-summary-card">
              <span className="info-summary-label">Courses</span>
              <span className="info-summary-value">{classes.length}</span>
              <button className="add-course-btn" type="button" onClick={addCourse}>
                <Plus size={16} /> Add Course
              </button>
            </div>
          </div>
        </header>

        {sortedClasses.length === 0 ? (
          <section className="info-empty">
            <h2>No courses yet</h2>
            <p>Upload a syllabus from the planner or add a course manually.</p>
            <button className="add-course-btn" type="button" onClick={addCourse}>
              <Plus size={16} /> Add your first course
            </button>
          </section>
        ) : (
          <div className="info-grid">
            {sortedClasses.map((cls) => (
              <section key={cls.id} className="info-card">
                <div className="info-card-header">
                  <div className="info-card-titleblock">
                    <span className="info-slot-tag">{cls.code || `Course ${cls.id + 1}`}</span>
                    <input
                      className="editable-title"
                      value={cls.title}
                      placeholder="Course name"
                      onChange={(event) => void updateClass(cls.id, 'title', event.target.value)}
                    />
                  </div>
                  <button className="delete-course-btn" type="button" onClick={() => void deleteClass(cls.id)} aria-label="Delete course">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="card-fields">
                  <div className="field-row">
                    <label>Course Identity</label>
                    <div className="two-up">
                      <input type="text" placeholder="Course code" value={cls.code} onChange={(event) => void updateClass(cls.id, 'code', event.target.value)} />
                      <input type="text" placeholder="Room, section, or note" value={cls.location} onChange={(event) => void updateClass(cls.id, 'location', event.target.value)} />
                    </div>
                  </div>

                  <div className="field-row">
                    <label>Meeting Time</label>
                    <div className="split-inputs">
                      <select value={cls.day} onChange={(event) => void updateClass(cls.id, 'day', event.target.value)}>
                        <option value="">Select day</option>
                        {weekdays.map((day) => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                      <input type="time" value={cls.startTime} onChange={(event) => void updateClass(cls.id, 'startTime', event.target.value)} />
                      <input type="time" value={cls.endTime} onChange={(event) => void updateClass(cls.id, 'endTime', event.target.value)} />
                    </div>
                  </div>

                  <div className="field-row">
                    <label>Instructor</label>
                    <div className="two-up">
                      <input type="text" placeholder="Name" value={cls.profName} onChange={(event) => void updateClass(cls.id, 'profName', event.target.value)} />
                      <input type="email" placeholder="Email" value={cls.profEmail} onChange={(event) => void updateClass(cls.id, 'profEmail', event.target.value)} />
                    </div>
                  </div>

                  <div className="field-row">
                    <label>Teaching Assistant</label>
                    <div className="two-up">
                      <input type="text" placeholder="Name" value={cls.taName} onChange={(event) => void updateClass(cls.id, 'taName', event.target.value)} />
                      <input type="email" placeholder="Email" value={cls.taEmail} onChange={(event) => void updateClass(cls.id, 'taEmail', event.target.value)} />
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CourseInfo
