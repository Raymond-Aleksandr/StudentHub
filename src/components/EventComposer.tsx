import { Plus } from 'lucide-react'
import type { DraftEvent } from '../domain/types'
import { formatDeadlineType, type DeadlineType } from '../domain/deadlines'

interface EventComposerProps {
  draft: DraftEvent
  setDraft: (draft: DraftEvent) => void
  onAdd: () => void
  mode: 'task' | 'exam'
}

export function EventComposer({ draft, setDraft, onAdd, mode }: EventComposerProps) {
  const isExam = mode === 'exam'
  const typeOptions: DeadlineType[] = isExam ? ['exam', 'test', 'quiz'] : ['assignment', 'project', 'presentation', 'lab-report', 'other']

  return (
    <div className={`planner-composer planner-composer-${mode}`}>
      <div>
        <span>{isExam ? 'Create exam' : 'Create task'}</span>
        <h2>{isExam ? 'Add a quiz, test, or exam' : 'Add a deadline'}</h2>
      </div>
      <input value={draft.title} placeholder={isExam ? 'Exam title' : 'Task title'} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      <input value={draft.courseCode} placeholder="Course code" onChange={(e) => setDraft({ ...draft, courseCode: e.target.value })} />
      <div className="planner-field-grid">
        <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        <input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
        <select value={draft.deadlineType} onChange={(e) => setDraft({ ...draft, deadlineType: e.target.value as DeadlineType })}>
          {typeOptions.map((t) => <option key={t} value={t}>{formatDeadlineType(t)}</option>)}
        </select>
      </div>
      <button className="planner-primary" onClick={onAdd}><Plus size={16} /> Add</button>
    </div>
  )
}
