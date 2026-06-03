import { describe, expect, it } from 'vitest';
import {
  parseTemplateParameters,
  extractJsCode,
  extractFormSections,
} from './parser';

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

  it('unescapes \\n in quoted attribute values', () => {
    const content =
      '{input:[type="checkbox"][name="x"][label="X"][checkedValue="- Ligne 1\\n- Ligne 2:"]}';
    const params = parseTemplateParameters(content);
    expect(params[0].input?.checkedValue).toBe('- Ligne 1\n- Ligne 2:');
  });

  it('parses dependsOn attribute', () => {
    const content =
      '{input:[type="text"][name="hematomes_detail"][dependsOn="hematomes"][placeholder="Préciser..."]}';
    const params = parseTemplateParameters(content);
    expect(params[0].input?.dependsOn).toBe('hematomes');
    expect(params[0].input?.placeholder).toBe('Préciser...');
  });

  it('parses layout attribute', () => {
    const content =
      '{input:[type="text"][name="hematomes_detail"][dependsOn="hematomes"][layout="below"]}';
    const params = parseTemplateParameters(content);
    expect(params[0].input?.layout).toBe('below');
  });

  it('parses category tags', () => {
    const content =
      '{category:"Signes observés"}\n{input:[type="text"][name="obs"][label="Observation"]}';
    const params = parseTemplateParameters(content);
    expect(params[0].type).toBe('category');
    expect(params[0].categoryTitle).toBe('Signes observés');
    expect(params[1].type).toBe('input');
  });
});

describe('extractFormSections', () => {
  it('groups root inputs by category in template order', () => {
    const content = [
      '{input:[type="text"][name="nom"][label="Nom"]}',
      '{category:"Signes"}',
      '{input:[type="checkbox"][name="hematomes"][label="Hématomes"]}',
      '{input:[type="text"][name="hematomes_detail"][dependsOn="hematomes"]}',
      '{category:"Observation"}',
      '{input:[type="textarea"][name="obs"][label="Observation"]}',
    ].join('\n');

    const sections = extractFormSections(content);
    expect(sections).toHaveLength(3);
    expect(sections[0].title).toBeUndefined();
    expect(sections[0].inputs.map((input) => input.name)).toEqual(['nom']);
    expect(sections[1].title).toBe('Signes');
    expect(sections[1].inputs.map((input) => input.name)).toEqual(['hematomes']);
    expect(sections[2].title).toBe('Observation');
    expect(sections[2].inputs.map((input) => input.name)).toEqual(['obs']);
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
