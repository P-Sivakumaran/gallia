import { describe, it, expect, vi } from 'vitest'
import type { Response } from 'express'

vi.mock('../services/authService.js', () => ({
  findUserByEmail: vi.fn(),
  createUser: vi.fn(),
}))

import { handleRegister, isPublicRegistrationEnabled } from './authController.js'
import { createUser } from '../services/authService.js'

function fakeRes() {
  const res = { status: vi.fn(), json: vi.fn(), cookie: vi.fn() }
  res.status.mockReturnValue(res)
  return res as unknown as Response & typeof res
}

describe('public registration flag', () => {
  it('is off unless ALLOW_PUBLIC_REGISTRATION is exactly "true"', () => {
    expect(isPublicRegistrationEnabled({})).toBe(false)
    expect(isPublicRegistrationEnabled({ ALLOW_PUBLIC_REGISTRATION: '1' })).toBe(false)
    expect(isPublicRegistrationEnabled({ ALLOW_PUBLIC_REGISTRATION: 'true' })).toBe(true)
  })

  it('returns 404 and creates no user while registration is off', async () => {
    vi.stubEnv('ALLOW_PUBLIC_REGISTRATION', '')
    const res = fakeRes()
    await handleRegister({ body: { email: 'a@example.com', password: 'longenough123' } } as never, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(createUser).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })
})
