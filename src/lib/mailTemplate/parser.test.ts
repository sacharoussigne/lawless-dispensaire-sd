import { describe, expect, it } from 'vitest';
import { parseTemplateParameters, extractJsCode } from './parser';

describe('parseTemplateParameters', () => {
  it('still extracts standalone {js} and {input}', () => {
    const content =
      'A {js:(()=>"j")():endjs} B {input:[type="text"][name="x"][label="X"][default="d"]]}';
    const params = parseTemplateParameters(content);
    expect(params).toHaveLength(2);
    expect(params[0].type).toBe('js');
    expect(params[0].jsCode).toContain('(()=>');
    expect(params[1].type).toBe('input');
    expect(params[1].input?.name).toBe('x');
  });

  it('does not register {js} nested inside default={js:...:endjs} as a separate parameter', () => {
    const content =
      'Hi {input:[type="text"][name="week"][label="Week"][default={js:(()=>"range")():endjs}]} end';
    const params = parseTemplateParameters(content);
    expect(params).toHaveLength(1);
    expect(params[0].type).toBe('input');
    expect(params[0].input?.defaultValue).toContain('{js:');
    expect(params[0].input?.defaultValue).toContain(':endjs');
  });
});

describe('extractJsCode', () => {
  it('omits JS that only appears inside an input default', () => {
    const content =
      '{input:[type="text"][name="a"][default={js:(()=>"only-here")():endjs}]} {js:(()=>"top")():endjs}';
    const codes = extractJsCode(content);
    expect(codes).toEqual(['(()=>"top")()']);
  });
});
