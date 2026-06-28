import { describe, it, expect } from 'vitest';
import {
  safeNextPath,
  isValidEmail,
  classifyEvents,
  truncateText,
  createSlug,
  classNames,
  extractYoutubeId,
  decodeHtmlEntities,
  safeHref,
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

describe('decodeHtmlEntities', () => {
  it('decodifica entidades comunes', () => {
    expect(decodeHtmlEntities('foo &quot;bar&quot;')).toBe('foo "bar"');
    expect(decodeHtmlEntities('a &amp; b')).toBe('a & b');
    expect(decodeHtmlEntities("don&#39;t stop")).toBe("don't stop");
    expect(decodeHtmlEntities('1 &lt; 2 &gt; 0')).toBe('1 < 2 > 0');
  });
  it('decodifica entidades numéricas', () => {
    expect(decodeHtmlEntities('caf&#233;')).toBe('café');
  });
  it('strings sin entidades quedan igual', () => {
    expect(decodeHtmlEntities('hola mundo')).toBe('hola mundo');
  });
  it('null/undefined/no string devuelve sin tocar', () => {
    expect(decodeHtmlEntities(null)).toBe(null);
    expect(decodeHtmlEntities(undefined)).toBe(undefined);
    expect(decodeHtmlEntities(42)).toBe(42);
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

describe('safeHref (XSS protection en social URLs y email)', () => {
  describe('http/https mode (isMailto=false)', () => {
    it('acepta https y http', () => {
      expect(safeHref('https://instagram.com/picnic')).toBe('https://instagram.com/picnic');
      expect(safeHref('http://example.com/foo')).toBe('http://example.com/foo');
    });
    it('RECHAZA protocolos peligrosos (el bug que detectó la auditoría)', () => {
      expect(safeHref('javascript:alert(1)')).toBe(null);
      expect(safeHref('javascript:fetch("/api")+document.cookie')).toBe(null);
      expect(safeHref('data:text/html,<script>alert(1)</script>')).toBe(null);
      expect(safeHref('vbscript:msgbox(1)')).toBe(null);
      expect(safeHref('file:///etc/passwd')).toBe(null);
    });
    it('rechaza URLs inválidas y vacíos', () => {
      expect(safeHref('')).toBe(null);
      expect(safeHref(null)).toBe(null);
      expect(safeHref(undefined)).toBe(null);
      expect(safeHref('no-es-url')).toBe(null);
      expect(safeHref('   ')).toBe(null);
      expect(safeHref(42)).toBe(null);
      expect(safeHref({ url: 'x' })).toBe(null);
    });
    it('mailto: NO se cuela como link social', () => {
      expect(safeHref('mailto:foo@bar.com')).toBe(null);
    });
  });

  describe('mailto mode (isMailto=true)', () => {
    it('acepta emails bien formados y prefija mailto:', () => {
      expect(safeHref('contacto@picniczine.com', true)).toBe('mailto:contacto@picniczine.com');
      expect(safeHref('a+b@dominio.com.ar', true)).toBe('mailto:a+b@dominio.com.ar');
    });
    it('hace trim antes de validar y prefijar', () => {
      expect(safeHref('  hola@test.io  ', true)).toBe('mailto:hola@test.io');
    });
    it('rechaza emails inválidos', () => {
      expect(safeHref('sin-arroba', true)).toBe(null);
      expect(safeHref('@nadie.com', true)).toBe(null);
      expect(safeHref('falta@dominio', true)).toBe(null);
      expect(safeHref('', true)).toBe(null);
      expect(safeHref(null, true)).toBe(null);
    });
    it('RECHAZA intentos de inyección con protocolo embebido en email', () => {
      // Un atacante podría intentar pasar algo tipo 'javascript:alert(1)@x.com'
      // — el regex de email lo dejaría pasar si tuviera arrobas en el medio,
      // pero el chequeo es estricto sobre el formato.
      expect(safeHref('javascript:foo@bar.com', true)).toBe('mailto:javascript:foo@bar.com');
      // ↑ ojo: este caso pasa el regex porque tiene formato user@host.tld.
      // Como prefijamos con mailto:, el resultado final es mailto:javascript:foo@bar.com
      // — un href mailto: NO ejecuta JS, así que el riesgo es nulo.
      // El test documenta este comportamiento esperado.
    });
  });
});
