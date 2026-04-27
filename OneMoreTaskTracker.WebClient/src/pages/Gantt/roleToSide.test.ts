import { describe, expect, it, vi } from 'vitest';
import { roleToSide } from './roleToSide';

describe('roleToSide', () => {
  it('maps BackendDeveloper to Back', () => {
    expect(roleToSide('BackendDeveloper')).toBe('Back');
  });

  it('maps FrontendDeveloper to Front', () => {
    expect(roleToSide('FrontendDeveloper')).toBe('Front');
  });

  it('maps Manager to Common', () => {
    expect(roleToSide('Manager')).toBe('Common');
  });

  it('maps Qa to Common', () => {
    expect(roleToSide('Qa')).toBe('Common');
  });

  it('falls back to Common + warn for unknown roles', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(roleToSide('DevOps' as unknown as 'Manager')).toBe('Common');
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('falls back to Common + warn for null / undefined', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(roleToSide(null)).toBe('Common');
    expect(roleToSide(undefined)).toBe('Common');
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
