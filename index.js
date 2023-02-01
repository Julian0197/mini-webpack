import fs from "fs";
import path from "path";
import ejs from "ejs";
import parser from "@babel/parser";
import traverse from "@babel/traverse";
import { transformFromAst } from "babel-core";
import { jsonLoader } from "./jsonLoader.js";
import { ChangeOutputPath } from "./ChangeOutputPath.js";
import { SyncHook } from "tapable";

let ID = 0;

const webpackConfig = {
  moudle: {
    entry: {
      main: "./example/main.js",
    }
    rules: [
      {
        test: /\.json$/,
        use: [jsonLoader],
      },
    ],
  },
  plugins: [new ChangeOutputPath()],
};

const entry = webpackConfig.moudle.entry.main

const hooks = {
  emitFile: new SyncHook(["context"]),
};

function createAsset(filePath) {
  // 1.以字符形式获取文件内容
  let source = fs.readFileSync(filePath, {
    encoding: "utf-8",
  });
  // console.log(source);

  // initLoader
  const loaders = webpackConfig.moudle.rules;
  // 给定上下文对象，用户可以在loader访问暴露的一下方法
  const loaderContext = {
    addDeps(dep) {
      console.log("addDeps", dep);
    },
  };

  loaders.forEach(({ test, use }) => {
    // filePath正则匹配test
    if (test.test(filePath)) {
      // 多个loader，要链式传递source，最终转化为js
      if (Array.isArray(use)) {
        use.forEach((fn) => {
          source = fn.call(loaderContext, source);
        });
      }
    }
  });

  // 2.获取依赖关系
  const ast = parser.parse(source, {
    sourceType: "module",
  });
  // console.log(ast);

  const deps = []; // 保存模块依赖的相对路径
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
  const mainAsset = createAsset(entry);

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

function initPlugins() {
  const plugins = webpackConfig.plugins;
  plugins.forEach((plugin) => {
    plugin.apply(hooks);
  });
}
initPlugins();

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

  let outputPath = "./dist/bundle.js";
  // 修改打包路径的插件
  const context = {
    changeOutputPath(path) {
      outputPath = path;
    },
  };
  hooks.emitFile.call(context);
  fs.writeFileSync(outputPath, code);
}

build(graph);
