export interface LocalUser {
  uid: string
  email: string
}

type AuthListener = (user: LocalUser | null) => void

const currentUserKey = 'studenthub.currentUser'
const accountsKey = 'studenthub.accounts'
const listeners = new Set<AuthListener>()

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

function emailToUid(email: string) {
  return `local:${email.trim().toLowerCase()}`
}

function readCurrentUser() {
  return readJson<LocalUser | null>(currentUserKey, null)
}

function notifyAuthListeners() {
  const user = auth.currentUser
  listeners.forEach((listener) => listener(user))
}

export const auth: { currentUser: LocalUser | null } = {
  currentUser: readCurrentUser(),
}

export function onAuthStateChanged(_auth: typeof auth, listener: AuthListener) {
  listeners.add(listener)
  queueMicrotask(() => listener(auth.currentUser))
  return () => {
    listeners.delete(listener)
  }
}

export async function createUserWithEmailAndPassword(_auth: typeof auth, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const accounts = readJson<Record<string, string>>(accountsKey, {})

  if (accounts[normalizedEmail]) {
    throw new Error('Email already exists on this browser.')
  }

  accounts[normalizedEmail] = password
  writeJson(accountsKey, accounts)

  auth.currentUser = { uid: emailToUid(normalizedEmail), email: normalizedEmail }
  writeJson(currentUserKey, auth.currentUser)
  notifyAuthListeners()
  return { user: auth.currentUser }
}

export async function signInWithEmailAndPassword(_auth: typeof auth, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const accounts = readJson<Record<string, string>>(accountsKey, {})

  if (accounts[normalizedEmail] !== password) {
    throw new Error('Invalid email or password for this browser.')
  }

  auth.currentUser = { uid: emailToUid(normalizedEmail), email: normalizedEmail }
  writeJson(currentUserKey, auth.currentUser)
  notifyAuthListeners()
  return { user: auth.currentUser }
}

export async function signOut(_auth: typeof auth) {
  void _auth
  localStorage.removeItem(currentUserKey)
  auth.currentUser = null
  notifyAuthListeners()
}

export async function signInAsDemoUser(_auth: typeof auth) {
  void _auth
  auth.currentUser = { uid: 'local:demo', email: 'demo@studenthub.local' }
  writeJson(currentUserKey, auth.currentUser)
  notifyAuthListeners()
  return { user: auth.currentUser }
}
