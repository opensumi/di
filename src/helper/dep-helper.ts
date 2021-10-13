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

function getAllDepsWithScaned(targets: Token[], scaned: Token[]): Token[] {
  const deps: Token[] = [];

  for (const target of targets) {
    // 只有函数对象才有依赖
    if (typeof target !== 'function' || scaned.includes(target)) {
      continue;
    } else {
      scaned.push(target);
    }

    // 查找本身的依赖，构造函数的依赖，依赖的依赖
    const targetDeps = getDeps(target);
    const parameters = getParameterDeps(target);
    const spreadDeeps = getAllDepsWithScaned(targetDeps, scaned);

    // 把结果推入最终结果中
    deps.push(...targetDeps, ...parameters, ...spreadDeeps);
  }

  return deps;
}

function getDepsWithCache(target: Token, cache: Map<any, Token[]>): Token[] {
  if (cache.get(target)) {
    return cache.get(target)!;
  }

  const scaned: Token[] = [];
  const deps = uniq(getAllDepsWithScaned([ target ], scaned));
  cache.set(target, deps);
  return deps;
}

const allDepsCache = new Map<any, Token[]>();

/**
 * 查询对象的所有依赖
 * @param targets
 * @param scaned
 */
export function getAllDeps(...targets: Token[]): Token[] {
  const depsArr = targets.map((item) => getDepsWithCache(item, allDepsCache));
  return uniq(flatten(depsArr));
}
