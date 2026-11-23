/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface ImportMetaEnv {
  /** 是否使用本地示例数据（Mock）。设为 "false" 时切换到真实后端 API */
  readonly VITE_USE_MOCK?: string
  /** 真实后端 API 前缀 */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
