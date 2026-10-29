/**
 * 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
 * 原创点：API 基址解析：同源部署与前后端分域两种形态自适应
 */
/**
 * API 基址
 * - 本地开发 / 同源部署（单机 Nginx）：留空，请求走相对路径 /api
 * - 前后端分域部署（静态托管 + 独立后端）：
 *   构建时注入 VITE_API_BASE，例如 https://api.example.com
 *   后端须同时把 FRONTEND_ORIGIN 配为前端域名以放行 CORS
 */
export const API_BASE: string = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')
