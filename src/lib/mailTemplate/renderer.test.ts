import { describe, expect, it } from 'vitest';
import { renderTemplate, resolveInputReplacement } from './renderer';
import type { TemplateInput } from './parser';

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

describe('renderTemplate with checkbox', () => {
  const checkboxTemplate =
    'Matériaux:\n{input:[type="checkbox"][name="adr"][label="Seringue d\'Adrénaline"][checkedValue="- Seringue d\'Adrénaline:"]}\n{input:[type="checkbox"][name="bandage"][label="Bandage"][checkedValue="- Bandage:"]}';

  it('inserts checkedValue when checkbox is checked', () => {
    const rendered = renderTemplate(checkboxTemplate, {
      inputs: { adr: 'true', bandage: 'false' },
    });
    expect(rendered).toBe("Matériaux:\n- Seringue d'Adrénaline:");
  });

  it('inserts nothing when checkbox is unchecked', () => {
    const rendered = renderTemplate(checkboxTemplate, {
      inputs: { adr: 'false', bandage: 'false' },
    });
    expect(rendered).toBe('Matériaux:');
  });

  it('removes blank lines between sections when checkboxes are unchecked', () => {
    const template =
      '-- Localisation --\n{input:[type="checkbox"][name="a"][label="A"][checkedValue="A"]}\n{input:[type="checkbox"][name="b"][label="B"][checkedValue="B"]}\n\n-- Observation --\nefkmefkmef';
    const rendered = renderTemplate(template, {
      inputs: { a: 'false', b: 'false' },
    });
    expect(rendered).toBe(
      '-- Localisation --\n\n-- Observation --\nefkmefkmef'
    );
  });

  it('returns empty when checkedValue is missing', () => {
    const input: TemplateInput = {
      type: 'checkbox',
      name: 'x',
      label: 'Bandage',
    };
    const context = { inputs: {} };
    expect(
      resolveInputReplacement(input, 'true', context, [input])
    ).toBe('');
    expect(
      resolveInputReplacement(input, 'false', context, [input])
    ).toBe('');
  });

  it('returns empty when checkedValue is empty', () => {
    const input: TemplateInput = {
      type: 'checkbox',
      name: 'x',
      label: 'Bandage',
      checkedValue: '',
    };
    const context = { inputs: {} };
    expect(
      resolveInputReplacement(input, 'true', context, [input])
    ).toBe('');
  });

  it('returns only dependent value when checkedValue is missing', () => {
    const checkbox: TemplateInput = {
      type: 'checkbox',
      name: 'x',
      label: 'Bandage',
    };
    const detail: TemplateInput = {
      type: 'text',
      name: 'x_detail',
      label: 'Détail',
      dependsOn: 'x',
    };
    const context = { inputs: { x_detail: 'some detail' } };
    expect(
      resolveInputReplacement(checkbox, 'true', context, [checkbox, detail])
    ).toBe('some detail');
  });
});

describe('renderTemplate with dependsOn', () => {
  const template =
    '{input:[type="checkbox"][name="hematomes"][label="Hématomes"][checkedValue="- Hématomes"]}{input:[type="text"][name="hematomes_detail"][dependsOn="hematomes"]}';

  it('appends dependent value when checkbox is checked', () => {
    const rendered = renderTemplate(template, {
      inputs: { hematomes: 'true', hematomes_detail: 'au bras gauche' },
    });
    expect(rendered).toBe('- Hématomes au bras gauche');
  });

  it('returns checkedValue only when detail is empty', () => {
    const rendered = renderTemplate(template, {
      inputs: { hematomes: 'true', hematomes_detail: '' },
    });
    expect(rendered).toBe('- Hématomes');
  });

  it('returns empty when checkbox is unchecked', () => {
    const rendered = renderTemplate(template, {
      inputs: { hematomes: 'false', hematomes_detail: 'au bras gauche' },
    });
    expect(rendered).toBe('');
  });

  it('does not render dependent input at its own position', () => {
    const detailInput: TemplateInput = {
      type: 'text',
      name: 'hematomes_detail',
      label: 'Détail',
      dependsOn: 'hematomes',
    };
    const context = { inputs: { hematomes_detail: 'visible only in parent' } };
    expect(
      resolveInputReplacement(detailInput, 'visible only in parent', context, [
        detailInput,
      ])
    ).toBe('');
  });
});

describe('renderTemplate with category', () => {
  it('removes category tags from rendered output', () => {
    const template =
      '-- Signes --\n{category:"Signes observés"}\n{input:[type="checkbox"][name="hematomes"][label="Hématomes"][checkedValue="- Hématomes"]}\n\nFin';
    const rendered = renderTemplate(template, {
      inputs: { hematomes: 'true' },
    });
    expect(rendered).toBe('-- Signes --\n- Hématomes\n\nFin');
  });
});

describe('renderTemplate with empty inputs', () => {
  it('removes blank lines when text input on its own line is empty', () => {
    const template =
      '-- Localisation --\n{input:[type="text"][name="loc"][label="Localisation"]}\n\n-- Observation --\n{input:[type="text"][name="obs"][label="Observation"]}';
    const rendered = renderTemplate(template, { inputs: {} });
    expect(rendered).toBe('-- Localisation --\n\n-- Observation --');
  });

  it('removes blank lines when textarea on its own line is empty', () => {
    const template =
      '-- Soins effectués --\n{input:[type="textarea"][name="soins"][label="Soins"]}\n\nFin';
    const rendered = renderTemplate(template, { inputs: {} });
    expect(rendered).toBe('-- Soins effectués --\n\nFin');
  });

  it('keeps inline label when input on same line is empty', () => {
    const template =
      'Identité : {input:[type="text"][name="nom"][label="Nom"]} {input:[type="text"][name="prenom"][label="Prénom"]}';
    const rendered = renderTemplate(template, { inputs: {} });
    expect(rendered).toBe('Identité :  ');
  });

  it('inserts value when input is filled', () => {
    const template =
      '-- Localisation --\n{input:[type="textarea"][name="loc"][label="Localisation"]}\n\n-- Observation --';
    const rendered = renderTemplate(template, { inputs: { loc: 'Cuisse droite' } });
    expect(rendered).toBe('-- Localisation --\nCuisse droite\n\n-- Observation --');
  });
});
