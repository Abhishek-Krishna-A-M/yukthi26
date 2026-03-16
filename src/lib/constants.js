export const DEPARTMENTS = ['CE', 'ME', 'MRE', 'EEE', 'ECE', 'RA', 'AD', 'CSE-A', 'CSE-B']

export const TRACKS = {
  1: { name: 'Track 1', departments: ['CE', 'ME', 'MRE'], color: '#4f8ef7', date: '17 Mar 2026' },
  2: { name: 'Track 2', departments: ['EEE', 'ECE', 'RA'], color: '#3dd68c', date: '17 Mar 2026' },
  3: { name: 'Track 3', departments: ['AD', 'CSE-A', 'CSE-B'], color: '#f5c842', date: '18 Mar 2026' },
}

export const DEPT_TRACK_MAP = {
  CE: 1, ME: 1, MRE: 1,
  EEE: 2, ECE: 2, RA: 2,
  AD: 3, 'CSE-A': 3, 'CSE-B': 3,
}

// Max nominees per dept (RA = 3, others = 4)
export const MAX_NOMINEES = {
  CE: 4, ME: 4, MRE: 4,
  EEE: 4, ECE: 4, RA: 3,
  AD: 4, 'CSE-A': 4, 'CSE-B': 4,
}

// 5 criteria × 10 pts = 50 per judge (dept round)
export const SCORE_CRITERIA = [
  { key: 'relevance',    label: 'Relevance',    description: 'Relevance to domain',          max: 10 },
  { key: 'innovation',   label: 'Innovation',   description: 'Novelty & creativity',          max: 10 },
  { key: 'methodology',  label: 'Methodology',  description: 'Technical soundness',           max: 10 },
  { key: 'presentation', label: 'Presentation', description: 'Clarity & communication',       max: 10 },
  { key: 'executable',   label: 'Executable',   description: 'Feasibility & implementation',  max: 10 },
]

export const SCORE_MAX_TOTAL = 50   // per judge, dept round
export const FINAL_SCORE_MAX = 50   // per external judge, final round

export const DEPT_FULL_NAMES = {
  CE: 'Civil Engineering',
  ME: 'Mechanical Engineering',
  MRE: 'Mechatronics & Robotics Engineering',
  EEE: 'Electrical & Electronics Engg.',
  ECE: 'Electronics & Communication Engg.',
  RA: 'Robotics & Automation',
  AD: 'Artificial Intelligence & Data Science',
  'CSE-A': 'Computer Science & Engineering A',
  'CSE-B': 'Computer Science & Engineering B',
}

export const RANK_LABELS = {
  1: { label: '1st', color: '#f5c842', bg: 'rgba(245,200,66,0.1)' },
  2: { label: '2nd', color: '#c0c8dc', bg: 'rgba(192,200,220,0.1)' },
  3: { label: '3rd', color: '#e87d3e', bg: 'rgba(232,125,62,0.1)' },
  4: { label: '4th', color: '#5a6a8a', bg: 'rgba(90,106,138,0.1)' },
}
