/**
 * 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
 * 原创点：React 应用挂载入口与全局样式、主题初值引导
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
