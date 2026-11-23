import axios from 'axios'

/**
 * 统一请求实例。
 * 真实后端联调：.env 中 VITE_USE_MOCK=false，请求经 Vite 代理转发到 FastAPI。
 */
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api/v1',
  timeout: 10000,
})

request.interceptors.response.use(
  (resp) => resp.data,
  (error) => {
    // 统一抛出，由页面层展示“请求失败 + 重试”
    return Promise.reject(error)
  },
)

export default request
