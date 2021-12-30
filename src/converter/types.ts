import j from 'jscodeshift'

type SetupState = {
  newImports: {
    vue: string[]
    vueRouter: string[]
  }
  setupReturn: j.ReturnStatement
  setupFn: j.FunctionExpression
  valueWrappers: string[]
  setupVariables: string[]
}

export {
  SetupState
}
