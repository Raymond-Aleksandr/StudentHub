import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Check, Pencil, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react'
import { usePlanner } from '../data/usePlanner'
import { deadlineTypeToEventType, getEventDeadlineType } from '../domain/deadlines'
import type { ParserCheckState, SyllabusUpload } from '../domain/types'
import { tagVarForColor } from '../domain/courseMeta'
import { useModalBodyLock } from '../components/useModalBodyLock'
import {
  clearNativeAiSettings,
  defaultNativeAiSettings,
  getDefaultNativeAiModel,
  getNativeAiModelOption,
  getNativeAiModelOptions,
  getNativeAiProviderOption,
  isNativeAiProvider,
  nativeAiProviderOptions,
  normalizeNativeAiSettings,
  readNativeAiSettings,
  saveNativeAiSettings,
  type NativeAiSettings,
  verifyNativeAiSettings,
} from '../native/aiSettings'
import { isNativeRuntime } from '../native/runtime'

type ParserStatus = {
  tone: 'checking' | 'configured' | 'online' | 'blocked' | 'offline'
  label: string
  detail: string
}

function getUploadCounts(upload: SyllabusUpload) {
  const events = upload.parsedEvents ?? []
  const exams = events.filter((event) => deadlineTypeToEventType(getEventDeadlineType(event)) === 'exam').length
  return { courses: upload.parsedCourse ? 1 : 0, tasks: events.length - exams, exams }
}

function getParserStatus(settings: NativeAiSettings, parserCheck?: ParserCheckState): ParserStatus {
  const hasKey = Boolean(settings.apiKey.trim())
  const providerOption = getNativeAiProviderOption(settings.provider)

  if (!hasKey) {
    return {
      tone: 'blocked',
      label: 'Setup needed',
      detail: 'choose provider and add API key',
    }
  }

  if (parserCheck === 'testing') {
    return {
      tone: 'checking',
      label: 'Checking',
      detail: `testing ${providerOption.label}`,
    }
  }

  if (parserCheck === 'verified') {
    return {
      tone: 'online',
      label: 'Verified',
      detail: `${providerOption.label} check passed`,
    }
  }

  if (parserCheck === 'failed') {
    return {
      tone: 'offline',
      label: 'Check failed',
      detail: 'last check did not complete',
    }
  }

  return {
    tone: 'configured',
    label: 'Configured',
    detail: 'save settings to verify',
  }
}

export default function ImportPage() {
  const { uploads, importState, importFiles, removeUpload, updateUpload, setParserCheck } = usePlanner()
  const [drag, setDrag] = useState(false)
  const [editingUpload, setEditingUpload] = useState<SyllabusUpload | null>(null)
  const [uploadDraft, setUploadDraft] = useState<SyllabusUpload | null>(null)
  const [nativeAiSettings, setNativeAiSettings] = useState<NativeAiSettings>(defaultNativeAiSettings)
  const [nativeSettingsMessage, setNativeSettingsMessage] = useState('')
  const [nativeAiExpanded, setNativeAiExpanded] = useState(true)
  const [nativeAiChecking, setNativeAiChecking] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nativeRuntime = useMemo(() => isNativeRuntime(), [])
  const selectedProviderOption = getNativeAiProviderOption(nativeAiSettings.provider)
  const modelOptions = getNativeAiModelOptions(nativeAiSettings.provider)
  const selectedModelOption = getNativeAiModelOption(nativeAiSettings.provider, nativeAiSettings.model)
  const parserStatus = useMemo(
    () => getParserStatus(nativeAiSettings, importState.parserCheck),
    [importState.parserCheck, nativeAiSettings],
  )

  useEffect(() => {
    async function checkParser() {
      const settings = await readNativeAiSettings()
      setNativeAiSettings(settings)
      setNativeAiExpanded(!settings.apiKey.trim())
    }

    void checkParser()
  }, [])

  const saveNativeAi = async () => {
    const nextSettings = normalizeNativeAiSettings({
      ...nativeAiSettings,
      apiKey: nativeAiSettings.apiKey.trim(),
    })
    await saveNativeAiSettings(nextSettings)
    setNativeAiSettings(nextSettings)

    if (!nextSettings.apiKey) {
      setNativeSettingsMessage('API key cleared.')
      setParserCheck('failed', 'Parser key cleared. Add a key to parse syllabi.', 'idle')
      setNativeAiExpanded(true)
      return
    }

    const providerLabel = getNativeAiProviderOption(nextSettings.provider).label
    setNativeSettingsMessage(`Checking ${providerLabel}...`)
    setParserCheck('testing', `Checking ${providerLabel} parser settings...`)
    setNativeAiChecking(true)

    try {
      await verifyNativeAiSettings(nextSettings)
      setNativeSettingsMessage('Provider check passed.')
      setParserCheck('verified', `${providerLabel} key and model verified.`)
      setNativeAiExpanded(false)
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Provider check failed.'
      setNativeSettingsMessage(detail)
      setParserCheck('failed', `${providerLabel} check failed. ${detail}`)
      setNativeAiExpanded(true)
    } finally {
      setNativeAiChecking(false)
    }
  }

  const clearNativeAi = async () => {
    await clearNativeAiSettings()
    setNativeAiSettings(defaultNativeAiSettings)
    setNativeSettingsMessage('API key cleared from this device.')
    setParserCheck('failed', 'Parser key cleared. Add a key to parse syllabi.', 'idle')
    setNativeAiExpanded(true)
  }

  const updateNativeAiProvider = (value: string) => {
    if (!isNativeAiProvider(value)) return
    setNativeAiSettings({
      ...nativeAiSettings,
      provider: value,
      model: getDefaultNativeAiModel(value),
    })
  }

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

  function closeUploadEditor() {
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
        <p className="dz-sub">
          PDF uploads are parsed with your selected AI provider. Your key stays in this {nativeRuntime ? 'app' : 'browser'} profile.
        </p>
        <div className="dz-actions">
          <button className="btn btn-accent" onClick={() => fileInputRef.current?.click()} disabled={importState.tone === 'busy'}>
            <Sparkles size={15} /> Choose PDFs
          </button>
        </div>
        <input ref={fileInputRef} className="planner-hidden-input" type="file" accept="application/pdf,.pdf" multiple onChange={(event) => { if (event.target.files) void importFiles(event.target.files) }} />
      </section>

      <div className={`planner-status ${importState.tone}`}>{importState.message}</div>

      <section className="worker-row">
        <div className="card card-tight worker-card" data-status={parserStatus.tone}>
          <div className="worker-card-head">
            <span className="eyebrow">AI parser</span>
            <span className="worker-live-dot" />
          </div>
          <div className="worker-val">{parserStatus.label}</div>
          <div className="worker-sub mono">{parserStatus.detail}</div>
        </div>
        <div className="card card-tight worker-card">
          <span className="eyebrow">Parsed this term</span>
          <div className="worker-val">{uploads.length}<span className="serif" style={{ fontSize: 16, color: 'var(--ink-3)', fontStyle: 'italic', marginLeft: 6 }}>syllabi</span></div>
          <div className="worker-sub mono">{uploads.reduce((sum, upload) => sum + (upload.parsedEvents?.length ?? 0), 0)} items extracted</div>
        </div>
        <div className="card card-tight worker-card">
          <span className="eyebrow">Storage</span>
          <div className="worker-val">local</div>
          <div className="worker-sub mono">{nativeRuntime ? 'device profile' : 'browser profile'}</div>
        </div>
      </section>

      <section className={`card card-tight native-ai-card ${nativeAiExpanded ? '' : 'is-collapsed'}`}>
          <div className="native-ai-head">
            <div className="native-ai-title">
              <span className="eyebrow">AI provider</span>
              <h2>Parser settings</h2>
            </div>
            {!nativeAiExpanded && (
              <div className="native-ai-head-actions">
                <button className="native-ai-edit" type="button" onClick={() => setNativeAiExpanded(true)}>
                  Edit
                </button>
              </div>
            )}
          </div>
          {!nativeAiExpanded ? (
            <div className="native-ai-summary">
              <span className="mono">{selectedModelOption?.label ?? nativeAiSettings.model}</span>
              <span>{nativeSettingsMessage || 'Key saved on this device.'}</span>
            </div>
          ) : (
            <>
              <p className="native-ai-copy">
                Choose the AI service you already use. The key stays in this {nativeRuntime ? 'app' : 'browser'}, and only the uploaded PDF is sent for parsing.
              </p>
              <div className="native-ai-fields">
                <label className="native-ai-field">
                  <span className="modal-section-label">Provider</span>
                  <select
                    className="modal-input"
                    value={nativeAiSettings.provider}
                    onChange={(event) => updateNativeAiProvider(event.target.value)}
                  >
                    {nativeAiProviderOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="native-ai-field">
                  <span className="modal-section-label">{selectedProviderOption.keyLabel}</span>
                  <input
                    className="modal-input"
                    type="password"
                    autoComplete="off"
                    value={nativeAiSettings.apiKey}
                    onChange={(event) => setNativeAiSettings({ ...nativeAiSettings, apiKey: event.target.value })}
                    placeholder={selectedProviderOption.keyPlaceholder}
                  />
                </label>
                <label className="native-ai-field">
                  <span className="modal-section-label">Model preset</span>
                  <select
                    className="modal-input"
                    value={nativeAiSettings.model}
                    onChange={(event) => setNativeAiSettings({ ...nativeAiSettings, model: event.target.value })}
                  >
                    {modelOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="native-ai-model-note">
                <ShieldCheck size={15} />
                <span>{selectedProviderOption.detail} {selectedModelOption?.detail ?? ''}</span>
              </div>
              <div className="native-ai-actions">
                <button className="modal-btn modal-btn-save" type="button" onClick={() => void saveNativeAi()} disabled={nativeAiChecking}>
                  <Check size={15} />{nativeAiChecking ? 'Checking' : 'Save'}
                </button>
                <button className="modal-btn modal-btn-cancel" type="button" onClick={() => void clearNativeAi()}><X size={15} />Clear</button>
                <div className="native-ai-message mono">
                  {nativeSettingsMessage || 'No server storage. No key is committed or synced.'}
                </div>
              </div>
            </>
          )}
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
              <div className="sr-ico" style={{ '--tag': tagVarForColor(upload.parsedCourse?.color) } as CSSProperties}>
                <Sparkles size={18} />
              </div>
              <div className="sr-body">
                <div className="sr-top">
                  <span className="tag" style={{ '--tag': tagVarForColor(upload.parsedCourse?.color) } as CSSProperties}>{upload.parsedCourse?.code || 'PDF'}</span>
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
        <SyllabusEditModal
          editingUpload={editingUpload}
          uploadDraft={uploadDraft}
          setUploadDraft={setUploadDraft}
          onClose={closeUploadEditor}
          onDelete={() => { void removeUpload(editingUpload); closeUploadEditor() }}
          onSave={() => void saveEdit()}
        />
      )}
    </>
  )
}

function SyllabusEditModal({
  editingUpload,
  uploadDraft,
  setUploadDraft,
  onClose,
  onDelete,
  onSave,
}: {
  editingUpload: SyllabusUpload
  uploadDraft: SyllabusUpload
  setUploadDraft: (upload: SyllabusUpload) => void
  onClose: () => void
  onDelete: () => void
  onSave: () => void
}) {
  useModalBodyLock()

  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-label="Edit syllabus">
        <div className="modal-head">
          <div>
            <span className="eyebrow">{uploadDraft.parsedCourse?.code || 'PDF'} · Syllabus</span>
            <h2 className="serif">Edit syllabus</h2>
          </div>
          <button className="tp-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="syllabus-preview" style={{ '--tag': tagVarForColor(uploadDraft.parsedCourse?.color) } as CSSProperties}>
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
                    grade: uploadDraft.parsedCourse?.grade ?? null,
                    progress: uploadDraft.parsedCourse?.progress ?? null,
                    color: uploadDraft.parsedCourse?.color ?? '',
                    code: event.target.value,
                  },
                })}
                placeholder="Course code"
              />
            </div>
          </section>
        </div>
        <div className="modal-foot three">
          <button className="modal-btn-delete" onClick={onDelete} aria-label="Delete"><Trash2 size={16} /></button>
          <button className="modal-btn modal-btn-cancel" onClick={onClose}><X size={16} />Cancel</button>
          <button className="modal-btn modal-btn-save" onClick={onSave} disabled={!uploadDraft.name.trim()}><Check size={16} />Save</button>
        </div>
      </div>
    </div>
  )
}
