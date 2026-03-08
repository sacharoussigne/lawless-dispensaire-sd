import { parseTemplateParameters } from './parser';

export interface RenderContext {
  inputs: Record<string, string>;
}

export function renderTemplate(
  template: string,
  context: RenderContext
): string {
  const parameters = parseTemplateParameters(template);
  let result = template;

  for (let i = parameters.length - 1; i >= 0; i--) {
    const param = parameters[i];
    let replacement = '';

    if (param.type === 'js' && param.jsCode) {
      try {
        const func = new Function(`return ${param.jsCode}`);
        const jsResult = func();
        replacement = jsResult !== null && jsResult !== undefined ? String(jsResult) : '';
      } catch (error: any) {
        console.error('Error executing JS code:', error);
        replacement = `[Erreur JS: ${error?.message || 'Erreur inconnue'}]`;
      }
    } else if (param.type === 'input' && param.input) {
      replacement = context.inputs[param.input.name] || param.input.defaultValue || '';
    }

    result =
      result.substring(0, param.startIndex) +
      replacement +
      result.substring(param.endIndex);
  }

  return result;
}
