export type EvalResult = number | '';

const isAllowedExpression = (expression: string) => /^[\d+\-*/().]+$/.test(expression);

const safeEval = (expression: string): number | null => {
  const cleaned = expression.replace(/\s/g, '');
  if (!cleaned) return null;
  if (!isAllowedExpression(cleaned)) return null;

  try {
    // Using Function with a strict whitelist of characters keeps this bounded to basic math.
    const result = new Function('return ' + cleaned)();
    if (typeof result !== 'number') return null;
    if (!Number.isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
};

export const evaluateIntegerExpression = (expression: string): EvalResult => {
  const result = safeEval(expression);
  if (result === null) return '';
  return Math.round(result);
};

export const evaluateDecimalExpression = (expression: string): EvalResult => {
  const result = safeEval(expression);
  if (result === null) return '';
  return result;
};

export const truncateToDecimals = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.trunc(value * factor) / factor;
};

export const formatTruncated = (value: number, minDecimals = 1, maxDecimals = 2): string => {
  const truncated = truncateToDecimals(value, maxDecimals);
  const [intPart, rawFrac = ''] = String(truncated).split('.');
  const frac = rawFrac.slice(0, maxDecimals);

  if (maxDecimals <= 0) return intPart;

  const padded = frac.padEnd(minDecimals, '0');
  const trimmed = padded.length > minDecimals ? padded.replace(/0+$/, '') : padded;
  return `${intPart}.${trimmed}`;
};

