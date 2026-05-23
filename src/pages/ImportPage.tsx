import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Check, Pencil, Sparkles, Trash2, X } from 'lucide-react'
import { usePlanner } from '../data/usePlanner'
import { deadlineTypeToEventType, getEventDeadlineType } from '../domain/deadlines'
import type { SyllabusUpload } from '../domain/types'

function getUploadCounts(upload: SyllabusUpload) {
  const events = upload.parsedEvents ?? []
  const exams = events.filter((event) => deadlineTypeToEventType(getEventDeadlineType(event)) === 'exam').length
  return { courses: upload.parsedCourse ? 1 : 0, tasks: events.length - exams, exams }
}

export default function ImportPage() {
  const { uploads, importState, importFiles, removeUpload, updateUpload } = usePlanner()
  const [drag, setDrag] = useState(false)
  const [editingUpload, setEditingUpload] = useState<SyllabusUpload | null>(null)
  const [uploadDraft, setUploadDraft] = useState<SyllabusUpload | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startEdit = (upload: SyllabusUpload) => {
    setEditingUpload(upload)
    setUploadDraft({ ...upload })
  }

  const saveEdit = async () => {
    if (!editingUpload || !uploadDraft?.name.trim()) return
    await updateUpload(editingUpload, uploadDraft)
    setEditingUpload(null)
    setUploadDraft(null)
  }

  return (
    <>
      <section
        className={`dropzone ${drag ? 'over' : ''} ${importState.tone === 'busy' ? 'busy' : ''}`}
        onDragOver={(event) => { event.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDrag(false)
          if (event.dataTransfer.files.length) void importFiles(event.dataTransfer.files)
        }}
      >
        <div className="dz-art">
          <div className="dz-doc"><span className="mono">PDF</span></div>
          <div className="dz-doc dz-doc-2"><span className="mono">PDF</span></div>
          <div className="dz-doc dz-doc-3"><span className="mono">PDF</span></div>
        </div>
        <span className="eyebrow">Drop files</span>
        <h2 className="dz-h">{importState.tone === 'busy' ? 'Parsing your syllabus...' : 'Drop syllabi here'}</h2>
        <p className="dz-sub">PDF uploads are parsed by your Cloudflare Worker, then saved locally in this browser. Drag multiple files at once.</p>
        <div className="dz-actions">
          <button className="btn btn-accent" onClick={() => fileInputRef.current?.click()} disabled={importState.tone === 'busy'}>
            <Sparkles size={15} /> Choose PDFs
          </button>
        </div>
        <input ref={fileInputRef} className="planner-hidden-input" type="file" accept="application/pdf,.pdf" multiple onChange={(event) => { if (event.target.files) void importFiles(event.target.files) }} />
      </section>

      <div className={`planner-status ${importState.tone}`}>{importState.message}</div>

      <section className="worker-row">
        <div className="card card-tight worker-card">
          <span className="eyebrow">Worker</span>
          <div className="worker-val">required</div>
          <div className="worker-sub mono">parser endpoint only</div>
        </div>
        <div className="card card-tight worker-card">
          <span className="eyebrow">Parsed this term</span>
          <div className="worker-val">{uploads.length}<span className="serif" style={{ fontSize: 16, color: 'var(--ink-3)', fontStyle: 'italic', marginLeft: 6 }}>syllabi</span></div>
          <div className="worker-sub mono">{uploads.reduce((sum, upload) => sum + (upload.parsedEvents?.length ?? 0), 0)} items extracted</div>
        </div>
        <div className="card card-tight worker-card">
          <span className="eyebrow">Storage</span>
          <div className="worker-val">local</div>
          <div className="worker-sub mono">no frontend secrets</div>
        </div>
      </section>

      <div className="sec-head">
        <div>
          <span className="eyebrow">Imported syllabi</span>
          <h2>{uploads.length ? `${uploads.length} linked to your term` : 'Nothing linked yet'}</h2>
        </div>
      </div>

      <section className="syllabi-list">
        {uploads.length ? uploads.map((upload) => {
          const counts = getUploadCounts(upload)
          return (
            <article key={upload.id} className="syllabus-row card card-tight">
              <div className="sr-ico" style={{ '--tag': 'var(--accent)' } as CSSProperties}>
                <Sparkles size={18} />
              </div>
              <div className="sr-body">
                <div className="sr-top">
                  <span className="tag" style={{ '--tag': 'var(--accent)' } as CSSProperties}>{upload.parsedCourse?.code || 'PDF'}</span>
                  <span className="sr-name">{upload.name}</span>
                </div>
                <div className="sr-meta mono">{counts.courses} course · {counts.tasks} tasks · {counts.exams} exams</div>
              </div>
              <div className="sr-actions">
                <button aria-label="Edit" onClick={() => startEdit(upload)}><Pencil size={14} /></button>
                <button aria-label="Delete" className="del" onClick={() => void removeUpload(upload)}><Trash2 size={14} /></button>
              </div>
            </article>
          )
        }) : <div className="empty"><h3>No syllabi imported</h3><p>Drop PDFs above to populate tasks, exams, and courses.</p></div>}
      </section>

      {editingUpload && uploadDraft && (
        <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setEditingUpload(null) }}>
          <div className="modal" role="dialog" aria-label="Edit syllabus">
            <div className="modal-head">
              <div>
                <span className="eyebrow">{uploadDraft.parsedCourse?.code || 'PDF'} · Syllabus</span>
                <h2 className="serif">Edit syllabus</h2>
              </div>
              <button className="tp-close" onClick={() => setEditingUpload(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="syllabus-preview" style={{ '--tag': 'var(--accent)' } as CSSProperties}>
                <div className="sp-ico"><Sparkles size={20} /></div>
                <div className="sp-info">
                  <span className="mono sp-name">{editingUpload.name}</span>
                  <span className="mono sp-meta">{getUploadCounts(editingUpload).tasks} tasks · {getUploadCounts(editingUpload).exams} exams</span>
                </div>
              </div>
              <section className="modal-section">
                <label className="modal-section-label">File</label>
                <div className="modal-input-wrap">
                  <span className="modal-input-tag mono">Name</span>
                  <input className="modal-input" value={uploadDraft.name} onChange={(event) => setUploadDraft({ ...uploadDraft, name: event.target.value })} />
                </div>
                <div className="modal-input-wrap">
                  <span className="modal-input-tag mono">Course code</span>
                  <input
                    className="modal-input"
                    value={uploadDraft.parsedCourse?.code ?? ''}
                    onChange={(event) => setUploadDraft({
                      ...uploadDraft,
                      parsedCourse: {
                        title: uploadDraft.parsedCourse?.title ?? '',
                        day: uploadDraft.parsedCourse?.day ?? '',
                        startTime: uploadDraft.parsedCourse?.startTime ?? '',
                        endTime: uploadDraft.parsedCourse?.endTime ?? '',
                        location: uploadDraft.parsedCourse?.location ?? '',
                        profName: uploadDraft.parsedCourse?.profName ?? '',
                        profEmail: uploadDraft.parsedCourse?.profEmail ?? '',
                        taName: uploadDraft.parsedCourse?.taName ?? '',
                        taEmail: uploadDraft.parsedCourse?.taEmail ?? '',
                        code: event.target.value,
                      },
                    })}
                    placeholder="Course code"
                  />
                </div>
              </section>
            </div>
            <div className="modal-foot three">
              <button className="modal-btn-delete" onClick={() => { void removeUpload(editingUpload); setEditingUpload(null) }} aria-label="Delete"><Trash2 size={16} /></button>
              <button className="modal-btn modal-btn-cancel" onClick={() => setEditingUpload(null)}><X size={16} />Cancel</button>
              <button className="modal-btn modal-btn-save" onClick={() => void saveEdit()} disabled={!uploadDraft.name.trim()}><Check size={16} />Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
