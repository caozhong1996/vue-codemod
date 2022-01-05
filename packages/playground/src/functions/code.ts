import { ref, Ref, watch } from 'vue'
import prettier from 'prettier/standalone'
import prettierTypescriptParser from 'prettier/parser-typescript'
import { convertScript } from '@/converter'

export function useStoredCode (storageKey: string, defaultCode: string): { code: Ref<string> } {
  const code: Ref<string> = ref(localStorage.getItem(storageKey) || defaultCode)

  watch(code, value => {
    localStorage.setItem(storageKey, value)
  })

  return {
    code
  }
}

export function useCodeConverter (code: Ref): {
  result: Ref<string>
  error: Ref<Error|null>
} {
  const result = ref('')
  const error: Ref<Error|null> = ref(null)

  // Convert code automatically
  watch(code, value => {
    error.value = null
    try {
      // Code mod
      const resultCode = convertScript(value)
      // Prettier
      result.value = prettier.format(resultCode, {
        plugins: [
          prettierTypescriptParser
        ],
        parser: 'typescript',
        semi: false,
        singleQuote: true
      })
    } catch (e: any) {
      console.error(e)
      error.value = e
    }
  })

  return {
    result,
    error
  }
}
