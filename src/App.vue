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
import Outputor from './components/outputor.vue'
import Editor from './components/Editor.vue'

provide('store', new ReplStore())

</script>

<style lang="scss">
html, body {
  height: 100%;
  margin: 0;
  font-family: Avenir, Helvetica, Arial, sans-serif;
}
#app {
  display: flex;
  height: 100%;width: 100%;
}
.left, .right {
  flex: 0 0 50%;
}
</style>
