import assert from 'node:assert/strict'
import { normalizeParsedPayload } from './index'

const parsed = normalizeParsedPayload({
  course: {
    title: 'Project Management',
    code: 'IRM 3004 / OSS 3009',
    day: 'Tuesday',
    startTime: '12:35',
    endTime: '14:25',
    location: '',
    profName: 'James Brunet',
    profEmail: 'jamesbrunet@cunet.carleton.ca',
    taName: '',
    taEmail: '',
  },
  events: [
    {
      title: 'Final Exam',
      courseCode: 'IRM 3004 / OSS 3009',
      date: '',
      time: '',
      weight: 30,
      type: 'exam',
      deadlineType: 'exam',
      priority: 'high',
    },
    {
      title: 'Exam Review',
      courseCode: 'IRM 3004 / OSS 3009',
      date: '2026-04-07',
      time: '',
      weight: null,
      type: 'exam',
      deadlineType: 'exam',
      priority: 'low',
    },
    {
      title: 'Final Exam',
      courseCode: 'IRM 3004 / OSS 3009',
      date: '',
      time: '',
      weight: '30%',
      type: 'exam',
      deadlineType: 'exam',
      priority: 'high',
    },
    {
      title: 'Assignment 2: Risk Management',
      courseCode: 'IRM 3004 / OSS 3009',
      date: '2026-02-23',
      time: '',
      weight: '4%',
      type: 'assignment',
      deadlineType: 'assignment',
      priority: 'high',
    },
    {
      title: 'Post-Project: Presentations',
      courseCode: 'IRM 3004 / OSS 3009',
      date: '2026-03-31',
      time: '',
      weight: 10,
      type: 'assignment',
      deadlineType: 'presentation',
      priority: 'high',
    },
    {
      title: 'Post-Project: Presentations',
      courseCode: 'IRM 3004 / OSS 3009',
      date: '2026-04-02',
      time: '',
      weight: 10,
      type: 'assignment',
      deadlineType: 'presentation',
      priority: 'high',
    },
  ],
})

assert.deepEqual(
  parsed.events.map((event) => ({
    title: event.title,
    date: event.date,
    weight: event.weight,
    deadlineType: event.deadlineType,
  })),
  [
    {
      title: 'Final Exam',
      date: '',
      weight: 30,
      deadlineType: 'exam',
    },
    {
      title: 'Assignment 2: Risk Management',
      date: '2026-02-23',
      weight: 4,
      deadlineType: 'assignment',
    },
    {
      title: 'Post-Project: Presentations',
      date: '2026-03-31',
      weight: 10,
      deadlineType: 'presentation',
    },
  ],
)
