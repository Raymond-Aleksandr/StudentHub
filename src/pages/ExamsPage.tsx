import { useState } from 'react'
import { usePlanner } from '../data/usePlanner'
import { EventCard } from '../components/EventCard'
import { EventComposer } from '../components/EventComposer'
import type { DraftEvent } from '../domain/types'

export default function ExamsPage() {
  const { examEvents, toggleComplete, removeEvent, updateEvent, addDraftEvent } = usePlanner()
  const [draft, setDraft] = useState<DraftEvent>({ title: '', courseCode: '', date: '', time: '', deadlineType: 'exam' })

  const handleAdd = async () => {
    await addDraftEvent(draft)
    setDraft({ title: '', courseCode: '', date: '', time: '', deadlineType: 'exam' })
  }

  return (
    <section className="planner-section planner-task-board">
      <EventComposer draft={draft} setDraft={setDraft} onAdd={() => void handleAdd()} mode="exam" />
      <div className="planner-list-head">
        <div>
          <span>Timeline</span>
          <h2>{examEvents.filter((e) => !e.completed).length} upcoming exams</h2>
        </div>
        <p>{examEvents.length ? `${examEvents.length} total` : 'Parsed exam dates will appear here'}</p>
      </div>
      {examEvents.length ? examEvents.map((e) => (
        <EventCard key={`${e.title}-${e.date}-${e.time}-${e.sourceUploadId}`} event={e} onToggle={toggleComplete} onRemove={removeEvent} onUpdate={updateEvent} />
      )) : (
        <div className="planner-empty">
          <strong>No exams yet</strong>
          <span>Upload syllabi or add a test manually.</span>
        </div>
      )}
    </section>
  )
}
