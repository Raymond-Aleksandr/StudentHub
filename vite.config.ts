import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function normalizeBasePath(value: string) {
  if (!value || value === '/') return '/'
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

function getProductionBasePath(mode: string) {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.VITE_BASE_PATH) {
    return normalizeBasePath(env.VITE_BASE_PATH)
  }

  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
  if (process.env.GITHUB_ACTIONS && repositoryName) {
    return normalizeBasePath(repositoryName)
  }

  return '/'
}

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? getProductionBasePath(mode) : '/',
}))
