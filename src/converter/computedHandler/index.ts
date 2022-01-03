import j from 'jscodeshift'
import { SetupState } from '../types'
import { buildArrowFunctionExpression } from '../utils'

export default function (astCollection: j.Collection, setupState: SetupState): j.Collection {
  const computedOptionCollection = astCollection
    .find(j.Property, {
      key: {
        name: 'computed'
      }
    }).filter(path => path.parent.parent.value.type === 'ExportDefaultDeclaration')

  const computedOption = computedOptionCollection.nodes()[0]

  if (computedOption) {
    setupState.newImports.vue.push('computed')
    if (!j.ObjectExpression.check(computedOption.value)) {
      throw new Error('No return statement found in computed option')
    }

    computedOptionCollection.forEach(path => {
      let args: any[]
      const properties = (path.value.value as j.ObjectExpression).properties as j.Property[]

      properties.forEach(property => {
        if (j.FunctionExpression.check(property.value)) {
          args = [j.arrowFunctionExpression([], property.value.body)]
        } else if (j.ObjectExpression.check(property.value)) {
          const properties = property.value.properties as j.Property []
          const getFn = properties.find(p => (p.key as j.Identifier).name === 'get')
          const setFn = properties.find(p => (p.key as j.Identifier).name === 'set')
          args = [
            getFn ? buildArrowFunctionExpression(getFn.value as j.FunctionExpression) : null,
            setFn ? buildArrowFunctionExpression(setFn.value as j.FunctionExpression) : undefined
          ]
        }

        const name = (property.key as j.Identifier).name
        setupState.setupFn.body.body.push(
          j.variableDeclaration('const', [
            j.variableDeclarator(
              j.identifier(name),
              j.callExpression(
                j.identifier('computed'),
                args
              )
            )
          ])
        );

        (setupState.returnStatement.argument as j.ObjectExpression).properties.push(
          j.property('init', j.identifier(name), j.identifier(name))
        )
        setupState.variables.push(name)
        setupState.valueWrappers.push(name)
      })
    })
  }

  computedOptionCollection.remove()
  return astCollection
}
