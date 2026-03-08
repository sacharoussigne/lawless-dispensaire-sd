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

const JS_PATTERN_START = /\{js:/g;
const INPUT_PATTERN = /\{input:\[(.*?)\]\}/g;

/**
 * Parse un bloc JS en gérant les accolades imbriquées
 */
function parseJsBlock(content: string, startIndex: number): { jsCode: string; endIndex: number } | null {
  // On commence après "{js:" (4 caractères)
  let i = startIndex + 4; // longueur de "{js:"
  let braceCount = 1; // On a déjà une accolade ouvrante du "{js:"
  let jsCode = '';
  let inString = false;
  let stringChar = '';
  let escapeNext = false;

  while (i < content.length) {
    const char = content[i];

    // Gérer l'échappement
    if (escapeNext) {
      jsCode += char;
      escapeNext = false;
      i++;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      jsCode += char;
      i++;
      continue;
    }

    // Gérer les chaînes de caractères (pour ignorer les accolades dans les strings)
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
      jsCode += char;
      i++;
      continue;
    }

    if (inString) {
      jsCode += char;
      // Fin de la chaîne (si ce n'est pas échappé)
      if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
      i++;
      continue;
    }

    // Compter les accolades (seulement si on n'est pas dans une string)
    if (char === '{') {
      braceCount++;
      jsCode += char;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        // On a trouvé la fin du bloc JS
        return { jsCode, endIndex: i + 1 };
      }
      jsCode += char;
    } else {
      jsCode += char;
    }

    i++;
  }

  // Si on arrive ici, le bloc n'est pas fermé
  return null;
}

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

  // Parser les blocs JS avec gestion des accolades imbriquées
  let match;
  JS_PATTERN_START.lastIndex = 0; // Reset pour être sûr
  
  while ((match = JS_PATTERN_START.exec(content)) !== null) {
    const startIndex = match.index;
    const jsBlock = parseJsBlock(content, startIndex);
    
    if (jsBlock) {
      parameters.push({
        type: 'js',
        raw: content.substring(startIndex, jsBlock.endIndex),
        startIndex,
        endIndex: jsBlock.endIndex,
        jsCode: jsBlock.jsCode,
      });
    }
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
