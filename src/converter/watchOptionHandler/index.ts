import j from 'jscodeshift'
import { SetupState } from '../types'

export default function (astCollection: j.Collection, setupState: SetupState): j.Collection {
  const watchOptionCollection = astCollection
    .find(j.Property, {
      key: {
        name: 'watch'
      }
    }).filter(path => path.parent.parent.value.type === 'ExportDefaultDeclaration')

  const watchOption = watchOptionCollection.nodes()[0]
  if (watchOption) {
    setupState.newImports.vue.push('watch')
    for (const property of watchOption.value.properties) {
      let firstArg
      if (j.Literal.check(property.key)) {
        const parts = property.key.value.split('.')
        if (setupState.valueWrappers.includes(parts[0])) {
          parts.splice(1, 0, 'value')
        }
        let expression
        for (const part of parts) {
          if (!expression) {
            expression = j.identifier(part)
          } else {
            expression = j.memberExpression(expression, j.identifier(part))
          }
        }
        firstArg = j.arrowFunctionExpression([], expression, true)
      } else {
        firstArg = j.identifier(property.key.name)
      }

      const args = [firstArg]
      // Handler only as direct function
      if (j.FunctionExpression.check(property.value)) {
        args.push(buildArrowFunctionExpression(property.value))
        // Immediate is false by default
        args.push(j.objectExpression([
          j.objectProperty(j.identifier('lazy'), j.literal(true))
        ]))
      } else if (j.ObjectExpression.check(property.value)) {
        // Object notation
        const handler = property.value.properties.find(p => p.key.name === 'handler')
        args.push(buildArrowFunctionExpression(handler.value))
        const options = []
        for (const objectProperty of property.value.properties) {
          if (objectProperty.key.name === 'immediate') {
            // Convert to `lazy` option (and negate value)
            let value
            let addLazyOption = false
            if (j.Literal.check(objectProperty.value)) {
              const lazy = !objectProperty.value.value
              value = j.literal(lazy)
              addLazyOption = lazy
            } else {
              value = j.unaryExpression('!', objectProperty.value)
              addLazyOption = true
            }
            if (addLazyOption) {
              options.push(j.objectProperty(j.identifier('lazy'), value))
            }
          } else if (objectProperty.key.name !== 'handler') {
            options.push(objectProperty)
          }
        }
        if (options.length) {
          args.push(j.objectExpression(options))
        }
      }
      setupState.setupFn.body.body.push(j.expressionStatement(
        j.callExpression(
          j.identifier('watch'),
          args
        )
      ))
    }

    watchOptionCollection.forEach(path => {
      let args: any[]
      const properties = (path.value.value as j.ObjectExpression).properties as j.Property[]
      properties.forEach(property => {
        if (j.Literal.check(property.key)) {}
      })
    })
  }

  watchOptionCollection.remove()
  return astCollection
}
