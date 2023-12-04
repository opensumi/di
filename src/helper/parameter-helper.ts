import { Token, ParameterOpts } from '../types';
import { createConstructorMetadataManager } from './reflect-helper';

const PARAMETER_KEY = Symbol('PARAMETER_KEY');
const parametersMeta = createConstructorMetadataManager(PARAMETER_KEY);

function getParameters(target: object): Token[] {
  return parametersMeta.get(target) || [];
}

export function setParameters(target: object, parameters: Token[]) {
  return parametersMeta.set(parameters, target);
}

const TOKEN_KEY = Symbol('TOKEN_KEY');
const tokenMeta = createConstructorMetadataManager(TOKEN_KEY);

function getParameterTokens(target: object): Array<ParameterOpts | null> {
  return tokenMeta.get(target) || [];
}

export function setParameterIn(target: object, opts: ParameterOpts, index: number) {
  const tokens = [...getParameterTokens(target)];
  tokens[index] = opts;
  return tokenMeta.set(tokens, target);
}

export function getParameterOpts(target: object) {
  const parameters = getParameters(target).map((token) => ({ token }));
  const tokens = getParameterTokens(target);

  return mergeParameters(parameters, tokens);
}

export function getParameterDeps(target: object) {
  const opts = getParameterOpts(target);
  return opts.map(({ token }) => token);
}

function mergeParameters(first: ParameterOpts[], second: Array<ParameterOpts | null>) {
  const arr: ParameterOpts[] = [];

  const len = Math.max(first.length, second.length);
  if (len === 0) {
    return [];
  }

  for (let i = 0; i < len; i++) {
    const item = second[i];
    if (item) {
      arr[i] = item;
    } else {
      arr[i] = first[i];
    }
  }

  return arr;
}
