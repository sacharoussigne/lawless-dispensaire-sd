import { parseTemplateParameters } from './parser';

export interface RenderContext {
  inputs: Record<string, string>;
}

/**
 * Exécute du code JavaScript et retourne le résultat sous forme de string
 */
export function executeJsCode(jsCode: string): string {
  try {
    const func = new Function(`return ${jsCode}`);
    const jsResult = func();
    return jsResult !== null && jsResult !== undefined ? String(jsResult) : '';
  } catch (error: any) {
    console.error('Error executing JS code:', error);
    return `[Erreur JS: ${error?.message || 'Erreur inconnue'}]`;
  }
}

/**
 * Extrait et exécute le code JS d'une valeur si elle contient {js:...:endjs}, sinon retourne la valeur telle quelle
 */
export function resolveJsValue(value: string | undefined): string {
  if (!value) return '';
  
  // Enlever les guillemets éventuels au début et à la fin
  const trimmed = value.trim();
  const unquoted = trimmed.match(/^["'](.+)["']$/) ? trimmed.slice(1, -1) : trimmed;
  
  // Vérifier si la valeur contient {js:...:endjs}
  const jsMatch = unquoted.match(/^\{js:(.+):endjs\}$/);
  if (jsMatch) {
    // Extraire le code JS (sans les délimiteurs)
    const jsCode = jsMatch[1];
    return executeJsCode(jsCode);
  }
  
  return unquoted;
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
      replacement = executeJsCode(param.jsCode);
    } else if (param.type === 'input' && param.input) {
      // Utiliser la valeur du contexte si disponible, sinon résoudre la valeur par défaut (qui peut contenir du JS)
      replacement = context.inputs[param.input.name] || resolveJsValue(param.input.defaultValue) || '';
    }

    result =
      result.substring(0, param.startIndex) +
      replacement +
      result.substring(param.endIndex);
  }

  return result;
}
