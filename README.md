<p align="center">
  <img align="middle" src="https://user-images.githubusercontent.com/26522151/148246310-3db6e8e6-8afe-4c80-b25f-a3ca922f4461.png" width="100px">
</p>

<h1 align="center">vue-codemod</h1>

<p align="center">
  Vue code automatic conversion tool: option API to composition API, &#60;script&#62; turn &#60;script setup&#62;, Ref syntax sugar conversion
</p>

<p align="center">
<img src="https://img.shields.io/github/languages/top/caozhong1996/vue-codemod">
</p>

<p align="center">
  🇨🇳 <a href="./README.zh-CN.md">中文版介绍</a>
</p>

## Background

After the release of Vue3.0, there have been many syntax changes:

* Composition API became a better choice than Option API;

* `<script setup>` simplifies the complicated declaration of `<script>`;

* [Reactivity Transform](https://github.com/vuejs/rfcs/blob/reactivity-transform/active-rfcs/0000-reactivity-transform.md) solve the problem that Ref variable needs `.value`;

These improvements did not appear at the first time, but appeared slowly in the past two years. Many projects have migrated from Vue2.x to Vue3.x and are still using Option syntax. There are also many projects that were used when Vue3.0 was just launched, and the old code did not enjoy the newly launched syntactic sugar. The manual modify is time-consuming and labor-intensive, so a plugin that automatically upgrades the syntax is required.

## Route map

* [ ] (WIP) completes the basic transcoding function
* [ ] Write a Vscode plugin that supports applying Codemods to .vue files
* [ ] set test case
* [ ] Support Typescript conversion
* [x] Playground for conversion examples <http://localhost:3000>

## How to use

It is recommended to use it in the form of a Vscode plugin. codemod cannot guarantee 100% correctness, and manual inspection is still required after code conversion, so we recommend that you only convert the code you need to upgrade each time. Modifying a project all at once will bring unexpected hidden dangers. From a code refactoring point of view, **small steps** are always better than **a shuttle**.

## Conversion not included

Although we have tried our best to be compatible with the old code, it still cannot cover all cases. If you have a solution or find a new bug, please submit a PR or ISSUE.

🔴 Mixin, the difficulty is that Mixin can be nested in multiple layers, and there is no way to analyze the mixin (PR welcome).

🔴 Import variables from other files, the difficulty is similar to the Mixin above (PR welcome).

## Participate in contribution

Jscodeshift is very easy to use, as long as you read some examples in this repository. The only caveat is that it's best to add fully test cases when you contribute, thanks.