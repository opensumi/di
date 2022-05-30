// 替换 ./src/constants.ts 中的版本号
// 使用的是 standard-version 提供的能力

// 匹配版本号的正则表达式
const REGEX = /(?<=const VERSION = ')(.*)(?=';)/g;

module.exports.readVersion = function (contents) {
  console.log('read file', contents);
  const version = contents.match(REGEX)[0];
  console.log('return version', version);
  return version;
};

module.exports.writeVersion = function (contents, version) {
  console.log('write file', contents);
  return contents.replace(REGEX, () => {
    console.log('replace version with', version);
    return version;
  });
};
