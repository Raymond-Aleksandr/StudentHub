import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileUp, Trash2 } from 'lucide-react'
import { usePlanner } from '../data/usePlanner'
import { deadlineTypeToEventType, getEventDeadlineType } from '../domain/deadlines'
import type { SyllabusUpload } from '../domain/types'

function getUploadCounts(upload: SyllabusUpload) {
  const events = upload.parsedEvents ?? []
  const exams = events.filter((event) => deadlineTypeToEventType(getEventDeadlineType(event)) === 'exam').length

  return {
    courses: upload.parsedCourse ? 1 : 0,
    tasks: events.length - exams,
    exams,
  }
}

export default function ImportPage() {
  const { uploads, importState, importFiles, removeUpload } = usePlanner()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <section className="planner-import">
      <div className="planner-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) void importFiles(e.dataTransfer.files) }}>
        <FileUp size={34} />
        <span className="planner-drop-eyebrow">Worker required</span>
        <h2>Drop syllabi here</h2>
        <p>PDF uploads are parsed by your Cloudflare Worker, then saved locally in this browser.</p>
        <button className="planner-primary" onClick={() => fileInputRef.current?.click()} disabled={importState.tone === 'busy'}>
          Choose PDFs
        </button>
        <input ref={fileInputRef} className="planner-hidden-input" type="file" accept="application/pdf,.pdf" multiple onChange={(e) => { if (e.target.files) void importFiles(e.target.files) }} />
      </div>
      <div className={`planner-status ${importState.tone}`}>{importState.message}</div>
      <div className="planner-list-head">
        <div>
          <span>Imported syllabi</span>
          <h2>{uploads.length ? `${uploads.length} file${uploads.length === 1 ? '' : 's'} linked` : 'Nothing linked yet'}</h2>
        </div>
        <p>Delete a PDF to remove its generated items.</p>
      </div>
      <div className="planner-upload-list">
        {uploads.length ? uploads.map((upload) => {
          const counts = getUploadCounts(upload)
          return (
            <article key={upload.id} className="planner-upload-card">
              <div>
                <h3>{upload.name}</h3>
                <p>{upload.message}</p>
                <div className="planner-upload-counts" aria-label="Generated items">
                  <span>{counts.courses} course</span>
                  <span>{counts.tasks} tasks</span>
                  <span>{counts.exams} exams</span>
                </div>
                <div className="planner-upload-actions">
                  <button onClick={() => navigate('/tasks')}>Review tasks</button>
                  <button onClick={() => navigate('/exams')}>Review exams</button>
                  <button onClick={() => navigate('/course-info')}>Review courses</button>
                </div>
              </div>
              <button className="planner-icon-danger" onClick={() => void removeUpload(upload)} aria-label={`Delete ${upload.name}`}>
                <Trash2 size={17} />
              </button>
            </article>
          )
        }) : <div className="planner-empty">No syllabi imported yet.</div>}
      </div>
    </section>
  )
}
