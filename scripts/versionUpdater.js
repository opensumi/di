module.exports.readVersion = function (contents) {
  console.log('read file', contents);
  const version = contents.match(/(?<=const VERSION = ')(.*)(?=';)/g)[0];
  console.log('return version', version);
  return version;
};

module.exports.writeVersion = function (contents, version) {
  console.log('write file', contents);
  return contents.replace(/(?<=const VERSION = ')(.*)(?=';)/g, () => {
    console.log('replace version with', version);
    return version;
  });
};
