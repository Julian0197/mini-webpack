# MINI-WEBPACK

## webpack是什么

webpack是一个`静态模块打包工具`，将我们的项目中的每一个**模块**组合成一个或多个bundles（包）。

>  **CommonJS模块规范 和 ES6 module：**
>
>  + ES6模块规范成为主流，使用`export`导出接口，`import`导入接口，取代了之前的规范（使用`require`）
>  + CommonJS模块输出的是一个**值的拷贝**，ES6模块输出的是**值的引用**。
>  + CommonJS模块是**运行时**加载，ES6模块是**编译时**输出接口。
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

## 实现mini-webpack

### 基本配置

初试化项目后，创建`example`文件。

~~~js
// foo.js

export function foo() {
  console.log("foo");
}
~~~

~~~js
// main.js

import foo from "./foo.js"

foo()
console.log("main.js");
~~~

在入口文件的index.js下，通过`fs.readFileSync`可以获取到main.js中的内容。

~~~js
import fs from "fs"
import parser from "@babel/parser"

function createAsset() {
  // 1.获取文件内容
  const source = fs.readFileSync("./example/main.js", {
    encoding: "utf-8"
  })
  console.log(source);

  // 2.获取依赖关系
  const ast = parser.parse(source, {
    sourceType: "module"
  })
  console.log(ast);

  return {

  }
}

createAsset()
~~~

需要解析main.js，第一步要知道main.js中引入了哪些模块。

这里使用了解析 `ast` 语法树的方法，以树的形式表现源代码的结构。（也可以通过正则，目的是拿到foo.js）

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

`yarn add @babel/traverse`

~~~js
~~~

