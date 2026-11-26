import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname)

describe('desk a11y CSS contracts', () => {
  const css = readFileSync(join(root, 'desk.css'), 'utf8')

  it('stacks three-metric strips instead of leaving a 2-col hole on phones', () => {
    expect(css).toContain('.g-metrics.g-metrics--trio')
    expect(css).toMatch(/\.g-desk-page \.g-metrics\.g-metrics--trio\{grid-template-columns:1fr!important\}/)
    expect(css).toMatch(/\.g-desk-page \.g-metrics:not\(\.g-metrics--trio\)/)
  })

  it('keeps site nav tap targets at least 44px tall', () => {
    expect(css).toMatch(/\.g-site-tabs>a\{[^}]*min-height:44px/)
  })
})
