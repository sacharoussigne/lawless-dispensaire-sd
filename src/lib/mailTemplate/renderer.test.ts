import { describe, expect, it } from 'vitest';
import { renderTemplate } from './renderer';

describe('renderTemplate with default={js}', () => {
  it('replaces input using resolved JS default when context is empty', () => {
    const template =
      '{input:[type="text"][name="n"][label="L"][default={js:(()=>"computed")():endjs}]}';
    const rendered = renderTemplate(template, { inputs: {} });
    expect(rendered).toBe('computed');
  });

  it('uses form value over default', () => {
    const template =
      '{input:[type="text"][name="n"][label="L"][default={js:(()=>"computed")():endjs}]}';
    const rendered = renderTemplate(template, { inputs: { n: 'edited' } });
    expect(rendered).toBe('edited');
  });
});
