<template>
  <div id="app">
    <div class="left">
      <editor />
    </div>
    <div class="right">
      <outputor />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { provide } from 'vue'
import { ReplStore } from './components/store'
import Outputor from './components/output.vue'
import Editor from './components/Editor.vue'

provide('store', new ReplStore())

</script>

<style>
html, body {
  height: 100%;
  margin: 0;
  font-family: Avenir, Helvetica, Arial, sans-serif;
}
#app {
  display: flex;
  height: 100%;width: 100%;
  --bg: #fff;
  --bg-soft: #f8f8f8;
  --border: #ddd;
  --text-light: #888;
  --font-code: Menlo, Monaco, Consolas, 'Courier New', monospace;
  --color-branding: #42b883;
  --color-branding-dark: #416f9c;
  --header-height: 38px;

  font-size: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  margin: 0;
  overflow: hidden;
  background-color: var(--bg-soft);
}
.left, .right {
  flex: 0 0 50%;
}

:deep(button) {
  border: none;
  outline: none;
  cursor: pointer;
  margin: 0;
  background-color: transparent;
}
</style>
