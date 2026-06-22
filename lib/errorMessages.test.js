import { describe, it, expect } from 'vitest';
import { friendlyCartError } from './errorMessages';

describe('friendlyCartError', () => {
  it('mapea foreign key violation', () => {
    expect(friendlyCartError({ code: '23503' })).toMatch(/no está disponible/i);
  });

  it('mapea unique violation', () => {
    expect(friendlyCartError({ code: '23505' })).toMatch(/ya tenés/i);
  });

  it('mapea permission denied / JWT expirado', () => {
    expect(friendlyCartError({ code: '42501' })).toMatch(/sesión|permiso/i);
    expect(friendlyCartError({ code: 'PGRST301' })).toMatch(/sesión|permiso/i);
    expect(friendlyCartError({ status: 401 })).toMatch(/sesión|permiso/i);
  });

  it('detecta carrito vacío (P0002)', () => {
    expect(friendlyCartError({ code: 'P0002' })).toMatch(/vacío/i);
  });

  it('detecta NO_AUTH', () => {
    expect(friendlyCartError({ code: 'NO_AUTH' })).toMatch(/iniciar sesión/i);
  });

  it('detecta problemas de red', () => {
    expect(friendlyCartError({ message: 'Failed to fetch' })).toMatch(
      /conexión|internet/i,
    );
  });

  it('error 5xx muestra mensaje genérico de servidor', () => {
    expect(friendlyCartError({ status: 503 })).toMatch(/servidor/i);
  });

  it('null devuelve fallback', () => {
    expect(friendlyCartError(null)).toMatch(/error/i);
  });
});
