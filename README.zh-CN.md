<p align="center">
  <img align="middle" src="https://user-images.githubusercontent.com/26522151/148246310-3db6e8e6-8afe-4c80-b25f-a3ca922f4461.png" width="100px">
</p>

<h1 align="center">vue-codemod</h1>

<p align="center">
  Vue 代码自动化转换工具：Option API 转 Composition API 、&#60;script&#62; 转 &#60;script setup&#62;、Ref 语法糖转换
</p>

<p align="center">
<img src="https://img.shields.io/github/languages/top/caozhong1996/vue-codemod">
</p>

## 背景

Vue3.0 发布之后，出现了很多语法上的改动：

* Composition API 成为了比 Option API 更好的选择；

* `<script setup>` 简化了 `<script>` 的繁杂的声明；

* [Reactivity Transform](https://github.com/vuejs/rfcs/blob/reactivity-transform/active-rfcs/0000-reactivity-transform.md) 解决了 Ref 变量需要 `.value` 的问题；

这些改进并不是第一时间就出现的，而是在最近两年的时间里慢慢出现，有很多项目从 Vue2.x 迁移到 Vue3.x，还在使用 Option 语法。也有很多项目在 Vue3.0 刚推出的时候就使用了，老代码也没有享受到新推出的语法糖。人工修改费时费力，因此需要一个自动升级语法的插件。

## 路线图

- [ ] (WIP) 完成基础的代码转换功能
- [ ] 编写 Vscode 插件，支持将 Codemods 应用于.vue文件
- [ ] 设置测试用例
- [ ] 支持 Typescript 转换
- [x] A playground for writing transformations and visit http://localhost:3000

## 使用方式

推荐使用 Vscode 插件的形式进行使用，codemod 并不能保证 100% 正确，代码转换之后还是需要进行人工检查，因此我们推荐每次只转换您需要升级的代码。一次性全量修改项目会带来意想不到的隐患。从代码重构的角度来说，**小步快跑** 永远好过 **一把梭**。

## 未包含的转换

虽然已经尽力去兼容老旧代码，还是不能覆盖全部情况，如果你有解决办法或者发现了新的 bug，欢迎提交 PR 或者 ISSUE 。

🔴 Mixin，难点在于 Mixin 可以多层嵌套，暂时没有分析来自 Mixin 的办法（PR welcome）。

🔴 从其他文件引入变量，难点也与上面的 Mixin 类似（PR welcome）。

## 参与贡献

Jscodeshift 非常容易使用，只要您阅读本仓库内的一些例子即可掌握。唯一需要注意的地方是，当您贡献时最好可以添加完善的测试用例，谢谢。
