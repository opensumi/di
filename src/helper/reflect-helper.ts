function findConstructor(target: object) {
  return typeof target === 'object' ? target.constructor : target;
}

function getConstructorMetadata(metadataKey: any, target: object, propertyKey?: string | symbol) {
  const constructor = findConstructor(target);
  if (propertyKey == null) {
    return Reflect.getMetadata(metadataKey, constructor);
  } else {
    return Reflect.getMetadata(metadataKey, constructor, propertyKey);
  }
}

function defineConstructorMetadata(
  metadataKey: any,
  metadataValue: any,
  target: object,
  propertyKey?: string | symbol,
) {
  const constructor = findConstructor(target);
  if (propertyKey == null) {
    return Reflect.defineMetadata(metadataKey, metadataValue, constructor);
  } else {
    return Reflect.defineMetadata(metadataKey, metadataValue, constructor, propertyKey);
  }
}

export function createConstructorMetadataManager(metadataKey: any) {
  return {
    get(target: object, propertyKey?: string | symbol) {
      return getConstructorMetadata(metadataKey, target, propertyKey);
    },
    set(metadataValue: any, target: object, propertyKey?: string | symbol) {
      return defineConstructorMetadata(metadataKey, metadataValue, target, propertyKey);
    },
  };
}

export function createMetadataManager(metadataKey: any) {
  return {
    get(target: object, propertyKey?: string | symbol) {
      if (propertyKey == null) {
        return Reflect.getMetadata(metadataKey, target);
      } else {
        return Reflect.getMetadata(metadataKey, target, propertyKey);
      }
    },
    set(metadataValue: any, target: object, propertyKey?: string | symbol) {
      if (propertyKey == null) {
        return Reflect.defineMetadata(metadataKey, metadataValue, target);
      } else {
        return Reflect.defineMetadata(metadataKey, metadataValue, target, propertyKey);
      }
    },
  };
}
