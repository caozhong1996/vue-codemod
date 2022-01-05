import j from 'jscodeshift'
import { SetupState } from '../types'
import { buildArrowFunctionExpression, buildFunctionDeclaration } from '../utils'

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

  const methodsProperties = (methodsOption.value as j.ObjectExpression).properties as j.Property[]
  methodsProperties.forEach(property => {
    const propertyName = (property.key as j.Identifier).name
    const propertyValue = property.value as j.FunctionExpression
    if (setupState.methods) {
      setupState.setupFn.body.body.push(j.variableDeclaration('const', [
        j.variableDeclarator(
          j.identifier(propertyName),
          buildArrowFunctionExpression(propertyValue)
        )
      ]))
    } else {
      setupState.setupFn.body.body.push(buildFunctionDeclaration(
        propertyName,
        propertyValue
      ))
    }
    (setupState.returnStatement.argument as j.ObjectExpression).properties.push(
      j.property('init', j.identifier(propertyName), j.identifier(propertyName))
    )
    setupState.variables.push(propertyName)
  })

  methodsOptionCollection.remove()
  return astCollection
}
