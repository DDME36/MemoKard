import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// ฟอนต์เก็บในแอปเอง ไม่โหลดจาก Google (ไม่ส่งข้อมูลผู้ใช้ออกไปข้างนอก และใช้ออฟไลน์ได้)
import '@fontsource/ibm-plex-sans-thai/300.css'
import '@fontsource/ibm-plex-sans-thai/400.css'
import '@fontsource/ibm-plex-sans-thai/500.css'
import '@fontsource/ibm-plex-sans-thai/600.css'
import '@fontsource/ibm-plex-sans-thai/700.css'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'
import '@fontsource/outfit/800.css'
import '@fontsource/outfit/900.css'
import '@fontsource/caveat/500.css'
import '@fontsource/caveat/700.css'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
