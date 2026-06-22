import { describe, it, expect } from 'vitest';
import {
  safeNextPath,
  isValidEmail,
  classifyEvents,
  truncateText,
  createSlug,
  classNames,
  extractYoutubeId,
} from './utils';

describe('safeNextPath', () => {
  it('acepta paths internos', () => {
    expect(safeNextPath('/mis-revistas')).toBe('/mis-revistas');
    expect(safeNextPath('/leer/abc-123')).toBe('/leer/abc-123');
  });

  it('rechaza URLs externas (open redirect prevention)', () => {
    expect(safeNextPath('https://evil.com')).toBe('/');
    expect(safeNextPath('http://attacker.io/foo')).toBe('/');
    expect(safeNextPath('//evil.com')).toBe('/');
    expect(safeNextPath('javascript:alert(1)')).toBe('/');
  });

  it('rechaza valores no string o vacíos', () => {
    expect(safeNextPath('')).toBe('/');
    expect(safeNextPath(null)).toBe('/');
    expect(safeNextPath(undefined)).toBe('/');
    expect(safeNextPath(42)).toBe('/');
  });

  it('respeta el fallback custom', () => {
    expect(safeNextPath('https://evil.com', '/home')).toBe('/home');
  });
});

describe('isValidEmail', () => {
  it('acepta emails bien formados', () => {
    expect(isValidEmail('hola@ejemplo.com')).toBe(true);
    expect(isValidEmail('user+tag@dominio.com.ar')).toBe(true);
    expect(isValidEmail('  espacio@test.io  ')).toBe(true); // trim interno
  });

  it('rechaza emails mal formados', () => {
    expect(isValidEmail('sinarroba.com')).toBe(false);
    expect(isValidEmail('@nadiedelante.com')).toBe(false);
    expect(isValidEmail('falta@dominio')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
  });
});

describe('classifyEvents', () => {
  it('separa eventos por fecha', () => {
    const ahora = new Date();
    const futuro = new Date(ahora.getTime() + 7 * 24 * 3600 * 1000);
    const pasado = new Date(ahora.getTime() - 7 * 24 * 3600 * 1000);
    const eventos = [
      { id: 1, fecha: futuro.toISOString() },
      { id: 2, fecha: pasado.toISOString() },
    ];
    const { futuro: f, pasado: p } = classifyEvents(eventos);
    expect(f).toHaveLength(1);
    expect(p).toHaveLength(1);
    expect(f[0].id).toBe(1);
    expect(p[0].id).toBe(2);
  });

  it('maneja array vacío', () => {
    expect(classifyEvents([])).toEqual({ futuro: [], pasado: [] });
  });
});

describe('truncateText', () => {
  it('trunca si supera el largo', () => {
    expect(truncateText('hola mundo', 5)).toBe('hola ...');
  });
  it('no toca si está dentro', () => {
    expect(truncateText('hola', 10)).toBe('hola');
  });
});

describe('createSlug', () => {
  it('genera slugs limpios', () => {
    expect(createSlug('Hola Mundo')).toBe('hola-mundo');
    expect(createSlug('Con Espacios   Multiples')).toBe('con-espacios-multiples');
    expect(createSlug('  trim  ')).toBe('trim');
  });
});

describe('classNames', () => {
  it('concatena las keys truthy', () => {
    expect(classNames({ a: true, b: false, c: true })).toBe('a c');
  });
  it('vacío si nada es truthy', () => {
    expect(classNames({ a: false, b: 0, c: null })).toBe('');
  });
});

describe('extractYoutubeId', () => {
  it('extrae id de URLs típicas', () => {
    expect(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('devuelve null si la URL no tiene id válido', () => {
    expect(extractYoutubeId('https://example.com/foo')).toBe(null);
  });
});
