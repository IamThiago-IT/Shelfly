/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly TAURI_ENV_PLATFORM?: string
  readonly TAURI_DEV_HOST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
