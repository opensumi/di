import { flatten, uniq } from './util';
import { Token } from '../declare';
import { getParameterDeps } from './parameter-helper';
import { createConstructorMetadataManager } from './reflect-helper';

const DEP_KEY = Symbol('DEP_KEY');
const depMeta = createConstructorMetadataManager(DEP_KEY);

function getDeps(target: object): Token[] {
  return depMeta.get(target) || [];
}

export function addDeps(target: object, ...tokens: Token[]) {
  const deps = getDeps(target);
  return depMeta.set(deps.concat(tokens), target);
}

function getAllDepsWithScanned(targets: Token[], scanned: Token[]): Token[] {
  const deps: Token[] = [];

  for (const target of targets) {
    // only function types has dependency
    if (typeof target !== 'function' || scanned.includes(target)) {
      continue;
    } else {
      scanned.push(target);
    }

    // Find the dependencies of the target, the dependencies of the constructor, and the dependencies of the dependencies
    const targetDeps = getDeps(target);
    const parameters = getParameterDeps(target);
    const spreadDeeps = getAllDepsWithScanned(targetDeps, scanned);

    deps.push(...targetDeps, ...parameters, ...spreadDeeps);
  }

  return deps;
}

function getDepsWithCache(target: Token, cache: Map<any, Token[]>): Token[] {
  if (cache.has(target)) {
    return cache.get(target)!;
  }

  const scanned: Token[] = [];
  const deps = uniq(getAllDepsWithScanned([target], scanned));
  cache.set(target, deps);
  return deps;
}

const allDepsCache = new Map<any, Token[]>();

/**
 * get all dependencies of input tokens.
 * @param tokens
 */
export function getAllDeps(...tokens: Token[]): Token[] {
  const depsArr = tokens.map((item) => getDepsWithCache(item, allDepsCache));
  return uniq(flatten(depsArr));
}
