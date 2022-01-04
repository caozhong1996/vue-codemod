import { reactive, watch } from 'vue'
import { convertScript } from '../converter'

const welcomeCode = `
export default {
  data () {
    return {
      foo: 'bar',
    }
  },
  watch: {
    foo () {
      // do something...
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
        try {
          this.state.convertedCode = convertScript(this.state.code)
        } catch {}
      },
      {
        immediate: true
      }
    )
  }
}
