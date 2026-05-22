import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { usePlanner } from '../data/usePlanner'
import { EventCard } from '../components/EventCard'
import { EventComposer } from '../components/EventComposer'
import type { DraftEvent } from '../domain/types'

export default function TasksPage() {
  const { taskEvents, toggleComplete, removeEvent, updateEvent, addDraftEvent } = usePlanner()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<DraftEvent>({ title: '', courseCode: '', date: '', time: '', deadlineType: 'assignment' })

  const handleAdd = async () => {
    await addDraftEvent(draft)
    setDraft({ title: '', courseCode: '', date: '', time: '', deadlineType: 'assignment' })
  }

  return (
    <section className="planner-section planner-task-board">
      <EventComposer draft={draft} setDraft={setDraft} onAdd={() => void handleAdd()} mode="task" />
      <div className="planner-list-head">
        <div>
          <span>Queue</span>
          <h2>{taskEvents.filter((e) => !e.completed).length} open tasks</h2>
        </div>
        <button className="planner-inline-action" onClick={() => navigate('/calendar')}>
          <CalendarDays size={16} />
          Calendar
        </button>
      </div>
      {taskEvents.length ? taskEvents.map((e) => (
        <EventCard key={`${e.title}-${e.date}-${e.time}-${e.sourceUploadId}`} event={e} onToggle={toggleComplete} onRemove={removeEvent} onUpdate={updateEvent} />
      )) : (
        <div className="planner-empty">
          <strong>No deadlines yet</strong>
          <span>Import syllabi or use the form above.</span>
        </div>
      )}
    </section>
  )
}
