export interface TemplateInput {
  type: string;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}

export interface TemplateParameter {
  type: 'js' | 'input';
  raw: string;
  startIndex: number;
  endIndex: number;
  jsCode?: string;
  input?: TemplateInput;
}

const JS_PATTERN = /\{js:([^}]+)\}/g;
const INPUT_PATTERN = /\{input:\[(.*?)\]\}/g;

function parseInputAttributes(attributesString: string): TemplateInput {
  const input: TemplateInput = {
    type: 'text',
    name: '',
    label: '',
  };

  // Pattern pour accepter à la fois key="value" et key=value (avec ou sans guillemets)
  const attributePattern = /(\w+)=(?:"([^"]*)"|([^\]]*?)(?=\]|\[))/g;
  let match;

  while ((match = attributePattern.exec(attributesString)) !== null) {
    const [, key, quotedValue, unquotedValue] = match;
    const value = quotedValue !== undefined ? quotedValue : (unquotedValue || '').trim();
    
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

  let match;

  while ((match = JS_PATTERN.exec(content)) !== null) {
    parameters.push({
      type: 'js',
      raw: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      jsCode: match[1],
    });
  }

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

  return parameters.sort((a, b) => a.startIndex - b.startIndex);
}

export function extractInputs(content: string): TemplateInput[] {
  const parameters = parseTemplateParameters(content);
  return parameters
    .filter((p) => p.type === 'input' && p.input)
    .map((p) => p.input!)
    .filter((input, index, self) => 
      index === self.findIndex((i) => i.name === input.name)
    );
}

export function extractJsCode(content: string): string[] {
  const parameters = parseTemplateParameters(content);
  return parameters
    .filter((p) => p.type === 'js' && p.jsCode)
    .map((p) => p.jsCode!);
}
