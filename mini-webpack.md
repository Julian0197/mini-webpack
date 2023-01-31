# MINI-WEBPACK

## webpack是什么

webpack是一个`静态模块打包工具`，将我们的项目中的每一个**模块**组合成一个或多个bundles（包）。

>  **CommonJS模块规范 和 ES6 module：**
>
>  + ES6模块规范成为主流，使用`export`导出接口，`import`导入接口，取代了之前的规范（使用`require`）
>  + CommonJS模块输出的是一个**值的拷贝**，ES6模块输出的是**值的引用**。
>  + CommonJS模块是**运行时**导出**对象**（`module.exports`属性），ES6模块是**编译时**输出**接口**（编译时就是变量提升的地方）。
>    + ESM碰到import会生成只读引用，脚本真正执行时，再去模块里面取值，ESM的模块没有缓存。CJS的模块可以运行多次，但是先运行一次，结果保存到缓存中，清除缓存，require多次执行。
>    + ES6 module 的引入和导出是静态的，`import` 会自动**提升**到代码的顶层 ，`import` , `export` 不能放在块级作用域或条件语句中。而`require`是一个函数，可以放在任意上下文中。
>    + ES6 module静态语法支持打包tree-shaking，而CommonJS不行
>
>
>  **兼容性问题：需要支持ES6，使用babel将ES6编译成ES5语法向下兼容。**

webpack中的核心概念（在 webpack.config.js 配置文件中进行配置）：

+ 入口（entry）：打包的入口，默认是`./src/index.js`，在这里建立依赖关系，可以有单个或者多个入口。

+ 输出（output）：告诉webpack在哪里输出他所创建的bundle，主要输出文件的默认值是 `./dist/main.js`，其他生成文件默认放置在 `./dist` 文件夹中

+ loader：webpack只能识别Javascript和JSON文件，loader负责将webpack不能识别的文件类型转化为webpack能够处理的模块。比如：将SASS转换为CSS，或者将ES6转化为ES5。

+ 插件（plugins）：用来改变构建过程中的行为，在构建的不同阶段会广播出对应的hooks，监听这些事件可以在打包过程中做一些自定义处理，比如：注入环境变量，去掉环境中重复的文件，打包优化和压缩等。

  > 如果需要转换 Vue/React代码、SASS 或其他转译语言，就用loader。如果需要调整 JavaScript，或用某种方式处理文件，就用plugin。

## 为什么要使用webpack

编写大型复杂项目时，通过模块化将业务逻辑解耦，webpack在处理模块时支持：

+ 模块打包：将不同模块文件打包整合在一起，保证他们之间的引用正确，执行有序。打包可以使得项目开发时，根据业务自由化分模块，保证了项目结构的清晰。
+ 编译兼容：通过webpack的`loader`机制，编译转换`.less`,`.vue`,`ES6`等在浏览器无法识别的格式文件。在开发时可以使用新特性和新语法，提升开发效率。
+ 能力扩展：通过webpack的`plugin`机制，可以实现按需加载，代码压缩等功能，提高自动化。

## 实现mini-pack功能

初试化项目后，创建`example`文件。main.js中导入了foo.js中的foo。mini-pack首先要实现的是：将入口 main.js以及其导入的内容一起打包。

~~~js
// foo.js

export function foo() {
  console.log("foo");
}
~~~

~~~js
// main.js

import {foo} from "./foo.js"

foo()
console.log("main.js");
~~~



创建`index.js`

从入口文件main.js开始，获取文件内容，并解析该文件依赖了哪些文件，将所有文件都解析后生成依赖关系图。（这里是最基本的依赖关系，不考虑循环依赖）

~~~js
import fs from "fs";
import path from "path";
import ejs from "ejs";
import parser from "@babel/parser";
import traverse from "@babel/traverse";
import { transformFromAst } from "babel-core";

let ID = 0;

function createAsset(filePath) {
  // 1.以字符形式获取文件内容
  const source = fs.readFileSync(filePath, {
    encoding: "utf-8",
  });
  // console.log(source);

  // 2.获取依赖关系
  const ast = parser.parse(source, {
    sourceType: "module",
  });
  // console.log(ast);

  const deps = [];
  traverse.default(ast, {
    ImportDeclaration({ node }) {
      deps.push(node.source.value);
    },
  });

  // transformFromAst将ESM规范转化为cjs
  const { code } = transformFromAst(ast, null, {
    presets: ["env"],
  });

  return {
    filePath,
    code, // source => ast => code
    deps,
    mapping: {},
    id: ID++,
  };
}

function createGraph() {
  const mainAsset = createAsset("./example/main.js");

  const queue = [mainAsset];
  for (const asset of queue) {
    asset.deps.forEach((relativePath) => {
      const child = createAsset(path.resolve("./example", relativePath));
      asset.mapping[relativePath] = child.id;
      queue.push(child);
    });
  }

  return queue;
}

const graph = createGraph();

function build(graph) {
  const template = fs.readFileSync("./bundle.ejs", { encoding: "utf-8" });
  const data = graph.map((asset) => {
    const { id, code, mapping } = asset;
    return {
      id,
      code,
      mapping,
    };
  });
  // console.log(data);
  const code = ejs.render(template, { data });

  fs.writeFileSync("./dist/bundle.js", code);
}

build(graph);

~~~



接下来，一步步解析。

`createAsset`函数接受一个文件路径，读取文件内容，并提取它的依赖关系

+ 使用fs模块的`readFileSync`先以文字形式读取文件内容。
+ 使用`babel`的`parser`模块将代码转化为`ast`语法树，通过语法树的形式拿到当前文件导入的那个文件`foo.js`
+ 使用`babel`的`traverse`模块遍历ast，遍历到`ImportDeclaration`结构出里面的node，`ImportDeclaration.node.source.value`是当前导入的文件路径`foo.js`，将所有导入的文件存到`deps`中
+ 使用`babel-core`中的`transformFromAst`将当前ast转化为commonjs规范的代码字符串。`ESM => AST => CommonJS`，转化为CommonJS是为了保证代码的通用性，以及函数中不能使用ESM的导入导出。
+ 最后返回的对象中有：当前文件相对路径，当前文件CJS规范的代码字符串，deps数组存储依赖。（mapping和id后续会说，id是每个文件独一无二的标识，mapping存储当前代码依赖的 相对路径和id 的映射关系）

~~~js
function createAsset(filePath) {
  // 1.以字符形式获取文件内容
  const source = fs.readFileSync(filePath, {
    encoding: "utf-8",
  });
  // console.log(source);

  // 2.获取依赖关系
  const ast = parser.parse(source, {
    sourceType: "module",
  });
  // console.log(ast);

  const deps = [];
  traverse.default(ast, {
    ImportDeclaration({ node }) {
      deps.push(node.source.value);
    },
  });

  // transformFromAst将ESM规范转化为cjs
  const { code } = transformFromAst(ast, null, {
    presets: ["env"],
  });

  return {
    filePath,
    code, // source => ast => code
    deps,
    mapping: {},
    id: ID++,
  };
}
~~~

这里使用了解析 `ast` 语法树的方法，以树的形式表现源代码的结构。（也可以通过正则，目的是拿到foo.js）

[`ast explorer`](https://astexplorer.net)

借助`@babel/parser`将代码编译成ast,`yarn add @babel/parser`

![image-20230127134646724](C:\Users\MSK\AppData\Roaming\Typora\typora-user-images\image-20230127134646724.png)

可以看到： `ImportDeclaration`对象的`source`属性的value就是我们要找的依赖。

~~~js
Node {
  type: 'File',
  start: 0,
  end: 62,
  loc: SourceLocation {
    start: Position { line: 1, column: 0, index: 0 },
    end: Position { line: 5, column: 23, index: 62 },
    filename: undefined,
    identifierName: undefined
  },
  errors: [],
  program: Node {
    type: 'Program',
    start: 0,
    end: 62,
    loc: SourceLocation {
      start: [Position],
      end: [Position],
      filename: undefined,
      identifierName: undefined
    },
    sourceType: 'module',
    interpreter: null,
    body: [ [Node], [Node], [Node] ],
    directives: []
  },
  comments: []
}
~~~

接下来，需要对节点`ast`的body遍历，找到上文所说的`ImportDeclaration`对象，从而拿到文件依赖关系，可借助babel为我们提供的工具`@babel/traverse`

`yarn add @babel/traverse`，`traverse.default`才是遍历函数

~~~js
traverse.default(ast, {
    ImportDeclaration({ node }) {
      deps.push(node.source.value);
    },
  });
~~~



`createGraph`用来创建依赖图。

`queue`队列放置了所有的asset，只要有import关系，都会通过createAsset创建asset并放到queue中。同时还要创建当前asset依赖的 相对路径和id的映射关系，存储到mapping中。

~~~js
function createGraph() {
  const mainAsset = createAsset("./example/main.js");

  const queue = [mainAsset];
  for (const asset of queue) {
    asset.deps.forEach((relativePath) => {
      const child = createAsset(path.resolve("./example", relativePath));
      asset.mapping[relativePath] = child.id;
      queue.push(child);
    });
  }

  return queue;
}

const graph = createGraph();
~~~



`build`函数接受依赖图参数，是一个数组，解构出每个asset的`id, code, mapping`通过`ejs`模块的`render`函数按照模板`template`生成代码字符串，也就是打包后的代码，放到`./dist/bundle.js`路径下。

~~~js
function build(graph) {
  const template = fs.readFileSync("./bundle.ejs", { encoding: "utf-8" });
  const data = graph.map((asset) => {
    const { id, code, mapping } = asset;
    return {
      id,
      code,
      mapping,
    };
  });
  // console.log(data);
  const code = ejs.render(template, { data });

  fs.writeFileSync("./dist/bundle.js", code);
}

build(graph);
~~~

最后我们想生成的bundle.js文件如下所示，是一个立即执行函数：

~~~js
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
~~~

因为源文件使用的ESM规范，打包后的代码要转化为CJS规范。

+ 接受参数以对象的形式，key为唯一id值，value是一个数组，第一个参数为函数代码；第二个参数是一个对象表示他依赖(import)的模块。

+ 传入的函数都用`function (require, module, exports) {}`包裹，重写写了`require,moudle和exports`。

+ 传入的`require`为装饰器函数`localRequire`，接受参数是相对路径，将它转化为唯一id，再调用`require`

  ~~~js
  function localRequire(filePath) {
        const id = mapping[filePath];
        return require(id);
      }
  ~~~

+ `require`返回的是`expoorts`的对象，执行`require(0)`，会将所有依赖都reqire，最终执行完所有依赖。

`template`ejs模板如下所示，传入的data是对象。

~~~ejs
(function (modules) {
  function require(id) {
    const [fn, mapping] = modules[id];

    const module = {
      exports: {},
    };

    function localRequire(filePath) {
      const id = mapping[filePath];
      return require(id);
    }

    fn(localRequire, module, module.exports);
    return module.exports;
  }

  require(0);
})({
    <% data.forEach(info => { %>
      "<%- info["id"] %>": [function(require, module, exports) {
        <%- info["code"] %>
      }, <%- JSON.stringify(info["mapping"])%>],
  <% }); %>
});
~~~



最终，打包后的`./dist/bundle.js`可以正确执行源代码

~~~js
(function (modules) {
  function require(id) {
    const [fn, mapping] = modules[id];

    const module = {
      exports: {},
    };

    function localRequire(filePath) {
      const id = mapping[filePath];
      return require(id);
    }

    fn(localRequire, module, module.exports);
    return module.exports;
  }

  require(0);
})({
  0: [
    function (require, module, exports) {
      "use strict";

      var _foo = require("./foo.js");

      (0, _foo.foo)();
      console.log("main.js");
    },
    { "./foo.js": 1 },
  ],

  1: [
    function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true,
      });
      exports.foo = foo;

      function foo() {
        console.log("foo");
      }
    },
    {},
  ],
});

~~~

## 实现loader





