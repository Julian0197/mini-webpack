(function (modules) {
  function require(id) {
    const [fn, mapping] = modules[id];

    const module = {
      exports: {},
    };
    // 装饰器
    function localRequire(filePath) {
      const id = mapping[filePath];
      return require(id);
    }

    fn(localRequire, module, module.exports);
    return module.exports;
  }

  require(0);

  // 都导出到一个文件，要避免命名冲突，所以用函数包裹
  // esm模块规范，不能在函数中使用import或者export
  // 在函数中要使用CommonJS规范的导入导出
})({
  // 用唯一的id代替路径
  0: [ // main.js
    function (require, module, exports) {
      const { foo } = require("./foo.js");

      foo();
      console.log("main.js");
    },
    { "./foo.js": 1 },
  ],
  1: [ // foo.js
    function (require, module, exports) {
      function foo() {
        console.log("foo");
      }
      module.exports = {
        foo,
      };
    },
    {},
  ],
});
