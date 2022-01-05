<script setup lang="ts">
import CodeMirror from './codemirror/CodeMirror.vue'
import { debounce } from './utils'
import { inject } from 'vue'
import { ReplStore } from './store'

const store = inject('store') as ReplStore

const onChange = debounce((code: string) => {
  store.state.code = code
}, 250)
</script>

<template>
  <div class="editor-container">
    <CodeMirror
      @change="onChange"
      mode="javascript"
      :value="store.state.code"
    />
  </div>
</template>

<style scoped>
.editor-container {
  height: 100%;
  overflow: hidden;
  position: relative;
}
</style>
