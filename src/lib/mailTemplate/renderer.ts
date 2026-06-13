import {
  extractInputs,
  parseTemplateParameters,
  type TemplateInput,
  type TemplateParameter,
} from './parser';

export interface RenderContext {
  inputs: Record<string, string>;
}

export function executeJsCode(jsCode: string): string {
  try {
    const func = new Function(`return ${jsCode}`);
    const jsResult = func();
    return jsResult !== null && jsResult !== undefined ? String(jsResult) : '';
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('Error executing JS code:', error);
    return `[Erreur JS: ${message}]`;
  }
}

export function resolveJsValue(value: string | undefined): string {
  if (!value) return '';

  const trimmed = value.trim();
  const unquoted = trimmed.match(/^["'](.+)["']$/)
    ? trimmed.slice(1, -1)
    : trimmed;

  const jsMatch = unquoted.match(/^\{js:(.+):endjs\}$/);
  if (jsMatch) {
    const jsCode = jsMatch[1];
    return executeJsCode(jsCode);
  }

  return unquoted;
}

function isCheckboxChecked(rawValue: string | undefined): boolean {
  if (!rawValue) return false;
  return rawValue === 'true' || rawValue === '1';
}

function appendDependentValues(
  base: string,
  input: TemplateInput,
  context: RenderContext,
  allInputs: TemplateInput[]
): string {
  const details = allInputs
    .filter((i) => i.dependsOn === input.name)
    .map((i) => context.inputs[i.name]?.trim())
    .filter(Boolean);

  if (details.length === 0) return base;
  if (!base.trim()) return details.join(' ');
  return `${base} ${details.join(' ')}`;
}

export function resolveInputReplacement(
  input: TemplateInput,
  rawValue: string | undefined,
  context: RenderContext,
  allInputs: TemplateInput[]
): string {
  if (input.dependsOn) return '';

  if (input.type === 'checkbox') {
    if (!isCheckboxChecked(rawValue)) return '';

    const checkedValue = input.checkedValue?.trim();
    if (checkedValue) {
      return appendDependentValues(
        checkedValue,
        input,
        context,
        allInputs
      );
    }

    if (input.defaultValue && !isCheckboxChecked(input.defaultValue)) {
      const defaultText = resolveJsValue(input.defaultValue).trim();
      if (defaultText) {
        return appendDependentValues(
          defaultText,
          input,
          context,
          allInputs
        );
      }
    }

    return appendDependentValues('', input, context, allInputs);
  }

  return rawValue || resolveJsValue(input.defaultValue) || '';
}

export function getReplacementSpan(
  content: string,
  param: Pick<TemplateParameter, 'startIndex' | 'endIndex' | 'type' | 'input'>,
  replacement: string
): { startIndex: number; endIndex: number } {
  const shouldRemoveEmptyLine =
    replacement.trim() === '' &&
    (param.input !== undefined || param.type === 'category');

  if (!shouldRemoveEmptyLine) {
    return { startIndex: param.startIndex, endIndex: param.endIndex };
  }

  let startIndex = param.startIndex;
  let endIndex = param.endIndex;

  let lineStart = startIndex;
  while (lineStart > 0 && content[lineStart - 1] !== '\n') {
    lineStart--;
  }

  const linePrefix = content.substring(lineStart, startIndex);
  if (linePrefix.trim() !== '') {
    return { startIndex: param.startIndex, endIndex: param.endIndex };
  }

  startIndex = lineStart;

  if (endIndex < content.length) {
    if (content.startsWith('\r\n', endIndex)) {
      endIndex += 2;
    } else if (content[endIndex] === '\n' || content[endIndex] === '\r') {
      endIndex += 1;
    }
  } else if (lineStart > 0 && content[lineStart - 1] === '\n') {
    startIndex = lineStart - 1;
    if (startIndex > 0 && content[startIndex - 1] === '\r') {
      startIndex -= 1;
    }
  }

  return { startIndex, endIndex };
}

export function renderTemplate(
  template: string,
  context: RenderContext
): string {
  const parameters = parseTemplateParameters(template);
  const allInputs = extractInputs(template);
  let result = template;

  for (let i = parameters.length - 1; i >= 0; i--) {
    const param = parameters[i];
    let replacement = '';

    if (param.type === 'js' && param.jsCode) {
      replacement = executeJsCode(param.jsCode);
    } else if (param.type === 'input' && param.input) {
      replacement = resolveInputReplacement(
        param.input,
        context.inputs[param.input.name],
        context,
        allInputs
      );
    }

    const { startIndex, endIndex } = getReplacementSpan(
      result,
      param,
      replacement
    );

    result =
      result.substring(0, startIndex) +
      replacement +
      result.substring(endIndex);
  }

  return result;
}
