import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('fg_theme') || 'system'
  })

  const getEffective = (t) => {
    if (t === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return t
  }

  const [effective, setEffective] = useState(() => getEffective(
    localStorage.getItem('fg_theme') || 'system'
  ))

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme === 'system') setEffective(mq.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const changeTheme = (t) => {
    setTheme(t)
    localStorage.setItem('fg_theme', t)
    setEffective(getEffective(t))
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effective)
  }, [effective])

  return (
    <ThemeContext.Provider value={{ theme, effective, setTheme: changeTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}