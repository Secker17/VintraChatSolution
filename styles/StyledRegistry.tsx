'use client'

import { ReactNode } from 'react'
import { ServerStyleSheet, StyleSheetManager } from 'styled-components'
import { useServerInsertedHTML } from 'next/navigation'

export function StyledRegistry({ children }: { children: ReactNode }) {
  const [styledComponentsStyleSheet] = ServerStyleSheet.isEmpty()
    ? [null]
    : [new ServerStyleSheet()]

  useServerInsertedHTML(() => {
    if (styledComponentsStyleSheet) {
      const styles = styledComponentsStyleSheet.getStyleElement()
      styledComponentsStyleSheet.seal()
      return styles
    }
  })

  if (styledComponentsStyleSheet) {
    return (
      <StyleSheetManager sheet={styledComponentsStyleSheet.instance}>
        {children}
      </StyleSheetManager>
    )
  }

  return children
}
