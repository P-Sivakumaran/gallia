import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import postcss from 'postcss'
import GalliaLogo from './GalliaLogo'

describe('Gallia logo', () => {
  it('uses the original G mark as the first letter, without a duplicate G', () => {
    render(<GalliaLogo />)
    const logo = screen.getByRole('link', { name: 'Gallia home' })
    expect(logo).toHaveAttribute('href', '/')
    expect(logo.textContent?.replace(/\s/g, '')).toBe('GALLIA')
    expect(screen.getAllByText('G')).toHaveLength(1)
  })

  it('exposes one accessible name rather than announcing animated letters', () => {
    render(<GalliaLogo />)
    const logo = screen.getByRole('link', { name: 'Gallia home' })
    expect(logo.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(logo.querySelector('svg')).toHaveAttribute('focusable', 'false')
  })

  it('only animates when the reader has not requested reduced motion', () => {
    const css = postcss.parse(readFileSync(resolve('src/components/gallia/GalliaLogo.module.css'), 'utf8'))
    const animations: postcss.Declaration[] = []
    css.walkDecls(/^animation(?:-|$)/, (declaration) => { animations.push(declaration) })
    expect(animations.length).toBeGreaterThan(0)
    for (const declaration of animations) {
      let parent: postcss.Container | postcss.Document | undefined = declaration.parent
      while (parent && parent.type !== 'atrule') parent = parent.parent
      expect(parent).toMatchObject({ name: 'media', params: '(prefers-reduced-motion: no-preference)' })
    }
  })
})
