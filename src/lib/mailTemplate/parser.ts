export interface TemplateInput {
  type: string;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  checkedValue?: string;
  dependsOn?: string;
  layout?: 'inline' | 'below';
}

export interface FormSection {
  title?: string;
  inputs: TemplateInput[];
}

export interface TemplateParameter {
  type: 'js' | 'input' | 'category';
  raw: string;
  startIndex: number;
  endIndex: number;
  jsCode?: string;
  input?: TemplateInput;
  categoryTitle?: string;
}

const JS_PATTERN = /\{js:(.*?):endjs\}/g;
const INPUT_PATTERN = /\{input:\[(.*?)\]\}/g;
const CATEGORY_PATTERN = /\{category:"([^"]*)"\}/g;

function collectInputSpans(content: string): { start: number; end: number }[] {
  const spans: { start: number; end: number }[] = [];
  INPUT_PATTERN.lastIndex = 0;
  let match;
  while ((match = INPUT_PATTERN.exec(content)) !== null) {
    spans.push({
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return spans;
}

function overlapsInputSpan(
  start: number,
  end: number,
  inputSpans: { start: number; end: number }[]
): boolean {
  return inputSpans.some((s) => start < s.end && end > s.start);
}

function unescapeAttributeValue(value: string): string {
  return value.replace(/\\([ntr\\])/g, (_, char) => {
    switch (char) {
      case 'n':
        return '\n';
      case 't':
        return '\t';
      case 'r':
        return '\r';
      case '\\':
        return '\\';
      default:
        return char;
    }
  });
}

function parseInputAttributes(attributesString: string): TemplateInput {
  const input: TemplateInput = {
    type: 'text',
    name: '',
    label: '',
  };

  const attributePattern =
    /(\w+)=(?:"([^"]*)"|((?:\{js:.*?:endjs\}|[^\]]*?))(?=\]|\[|$))/g;
  let match;

  while ((match = attributePattern.exec(attributesString)) !== null) {
    const [, key, quotedValue, unquotedValue] = match;
    const rawValue =
      quotedValue !== undefined ? quotedValue : (unquotedValue || '').trim();
    const value = unescapeAttributeValue(rawValue);

    switch (key) {
      case 'type':
        input.type = value || 'text';
        break;
      case 'name':
        input.name = value;
        break;
      case 'label':
        input.label = value;
        break;
      case 'placeholder':
        input.placeholder = value;
        break;
      case 'required':
        input.required = value === 'true' || value === '1';
        break;
      case 'defaultValue':
        input.defaultValue = value;
        break;
      case 'default':
        input.defaultValue = value;
        break;
      case 'checkedValue':
        input.checkedValue = value;
        break;
      case 'checked':
        input.checkedValue = value;
        break;
      case 'dependsOn':
        input.dependsOn = value;
        break;
      case 'layout':
        if (value === 'below' || value === 'inline') {
          input.layout = value;
        }
        break;
    }
  }

  if (!input.name) {
    input.name = `input_${Date.now()}`;
  }
  if (!input.label) {
    input.label = input.name;
  }

  return input;
}

export function parseTemplateParameters(content: string): TemplateParameter[] {
  const parameters: TemplateParameter[] = [];
  const inputSpans = collectInputSpans(content);

  let match;
  JS_PATTERN.lastIndex = 0;

  while ((match = JS_PATTERN.exec(content)) !== null) {
    const startIndex = match.index;
    const endIndex = match.index + match[0].length;
    if (overlapsInputSpan(startIndex, endIndex, inputSpans)) {
      continue;
    }
    parameters.push({
      type: 'js',
      raw: match[0],
      startIndex,
      endIndex,
      jsCode: match[1],
    });
  }

  INPUT_PATTERN.lastIndex = 0;
  while ((match = INPUT_PATTERN.exec(content)) !== null) {
    const attributesString = match[1];
    const input = parseInputAttributes(attributesString);

    parameters.push({
      type: 'input',
      raw: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      input,
    });
  }

  CATEGORY_PATTERN.lastIndex = 0;
  while ((match = CATEGORY_PATTERN.exec(content)) !== null) {
    parameters.push({
      type: 'category',
      raw: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      categoryTitle: unescapeAttributeValue(match[1]),
    });
  }

  return parameters.sort((a, b) => a.startIndex - b.startIndex);
}

export function extractInputs(content: string): TemplateInput[] {
  const parameters = parseTemplateParameters(content);
  return parameters
    .filter((p) => p.type === 'input' && p.input)
    .map((p) => p.input!)
    .filter(
      (input, index, self) =>
        index === self.findIndex((i) => i.name === input.name)
    );
}

export function extractFormSections(content: string): FormSection[] {
  const parameters = parseTemplateParameters(content);
  const sections: FormSection[] = [{ inputs: [] }];
  const seenInputNames = new Set<string>();

  for (const param of parameters) {
    if (param.type === 'category') {
      sections.push({ title: param.categoryTitle, inputs: [] });
      continue;
    }

    if (param.type !== 'input' || !param.input) continue;
    if (param.input.dependsOn) continue;
    if (seenInputNames.has(param.input.name)) continue;

    seenInputNames.add(param.input.name);
    sections[sections.length - 1].inputs.push(param.input);
  }

  return sections.filter((section) => section.title || section.inputs.length > 0);
}

export function extractJsCode(content: string): string[] {
  const parameters = parseTemplateParameters(content);
  return parameters
    .filter((p) => p.type === 'js' && p.jsCode)
    .map((p) => p.jsCode!);
}
