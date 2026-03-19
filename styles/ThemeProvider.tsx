'use client'

import { createContext, ReactNode } from 'react'
import { ThemeProvider as StyledThemeProvider } from 'styled-components'
import { theme } from './theme'

export const ThemeContext = createContext(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <StyledThemeProvider theme={theme}>
      {children}
    </StyledThemeProvider>
  )
}
