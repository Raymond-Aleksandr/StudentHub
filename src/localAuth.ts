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

// Password hashing via Web Crypto (PBKDF2).

async function hashPassword(password: string, salt?: string): Promise<string> {
  const encoder = new TextEncoder()
  const actualSalt = salt || crypto.randomUUID()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(actualSalt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256,
  )
  const hashArray = Array.from(new Uint8Array(bits))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${actualSalt}:${hashHex}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const colonIndex = stored.indexOf(':')
  if (colonIndex < 0) return false
  const salt = stored.substring(0, colonIndex)
  const candidate = await hashPassword(password, salt)
  return candidate === stored
}

// Auth state.

function readCurrentUser() {
  const user = readJson<LocalUser | null>(currentUserKey, null)
  if (user?.uid === 'local:demo') {
    const blankUser = { uid: 'local:blank', email: 'blank@studenthub.local' }
    resetBlankPlanner(blankUser.uid)
    writeJson(currentUserKey, blankUser)
    return blankUser
  }
  return user
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
  return () => { listeners.delete(listener) }
}

export async function createUserWithEmailAndPassword(_auth: typeof auth, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const accounts = readJson<Record<string, string>>(accountsKey, {})

  if (accounts[normalizedEmail]) {
    throw new Error('Email already exists on this browser.')
  }

  accounts[normalizedEmail] = await hashPassword(password)
  writeJson(accountsKey, accounts)

  auth.currentUser = { uid: emailToUid(normalizedEmail), email: normalizedEmail }
  writeJson(currentUserKey, auth.currentUser)
  notifyAuthListeners()
  return { user: auth.currentUser }
}

export async function signInWithEmailAndPassword(_auth: typeof auth, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const accounts = readJson<Record<string, string>>(accountsKey, {})

  const storedHash = accounts[normalizedEmail]
  if (!storedHash || !(await verifyPassword(password, storedHash))) {
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

export async function signInAsBlankUser(_auth: typeof auth) {
  void _auth
  auth.currentUser = { uid: 'local:blank', email: 'blank@studenthub.local' }
  resetBlankPlanner(auth.currentUser.uid)
  writeJson(currentUserKey, auth.currentUser)
  notifyAuthListeners()
  return { user: auth.currentUser }
}

function resetBlankPlanner(uid: string) {
  writeJson(`studenthub.${uid}.classes`, { classes: [] })
  writeJson(`studenthub.${uid}.calendar`, { events: [] })
  writeJson(`studenthub.${uid}.syllabi`, { uploads: [] })
}
