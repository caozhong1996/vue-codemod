import j from 'jscodeshift'
import { SetupState } from '../types'
import { buildArrowFunctionExpression } from '../utils'

export default function (astCollection: j.Collection, setupState: SetupState): j.Collection {
  const methodsOptionCollection = astCollection.find(j.Property, {
    key: {
      name: 'methods'
    }
  }).filter(path => path.parent.parent.value.type === 'ExportDefaultDeclaration')
  const methodsOption = methodsOptionCollection.nodes()[0]

  if (!methodsOption) {
    return astCollection
  }

  setupState.newImports.vue.push('watch')
  // methodsOptionCollection.forEach(path => {})

  methodsOptionCollection.remove()
  return astCollection
}
