import { reactive, watch } from 'vue'
import { convertScript } from '../converter'

const welcomeCode = `
export default {
  data () {
    return {
      foo: 'bar',
    }
  },

  computed: {
    foofoo () {
      return this.foo.repeat(2)
    }
  }
}
`.trim()

export class File {
  filename: string
  code: string
  compiled = {
    js: '',
    css: '',
    ssr: ''
  }

  constructor (filename: string, code = '') {
    this.filename = filename
    this.code = code
  }
}

export interface StoreState {
  code: string,
  convertedCode: string
}

export class ReplStore {
  state: StoreState

  constructor () {
    this.state = reactive({
      code: welcomeCode,
      convertedCode: ''
    })

    watch(
      () => this.state.code,
      () => {
        this.state.convertedCode = convertScript(this.state.code)
      },
      {
        immediate: true
      }
    )
  }
}
