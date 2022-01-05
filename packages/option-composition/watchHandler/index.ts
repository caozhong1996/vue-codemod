import j, { Identifier } from 'jscodeshift'
import { SetupState } from '../types'
import { buildArrowFunctionExpression } from '../utils'

export default function (astCollection: j.Collection, setupState: SetupState): j.Collection {
  const watchOptionCollection = astCollection
    .find(j.Property, {
      key: {
        name: 'watch'
      }
    }).filter(path => path.parent.parent.value.type === 'ExportDefaultDeclaration')

  const watchOption = watchOptionCollection.nodes()[0]

  if (!watchOption) return astCollection

  setupState.newImports.vue.push('watch')
  watchOptionCollection.forEach(path => {
    const properties = (path.value.value as j.ObjectExpression).properties as j.Property[]
    properties.forEach(property => {
      type Arg = j.ArrowFunctionExpression | j.Identifier | j.ObjectExpression
      let firstArg: Arg

      if (j.Literal.check(property.key)) {
        const parts = `${property.key.value}`.split('.')
        if (setupState.valueWrappers.includes(parts[0])) {
          parts.splice(1, 0, 'value')
        }
        const expression = j(parts.join('')).find(j.MemberExpression).paths()[0].value
        firstArg = j.arrowFunctionExpression([], expression, true)
      } else if (j.Identifier.check(property.key)) {
        firstArg = j.identifier(property.key.name)
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const args: Arg[] = [firstArg]
      // Handler only as direct function
      if (j.FunctionExpression.check(property.value)) {
        args.push(buildArrowFunctionExpression(property.value))
      } else if (j.ObjectExpression.check(property.value)) {
        // Object notation
        const objectProperties = property.value.properties as j.Property[]
        const options: (j.Property | j.ObjectProperty)[] = []

        objectProperties.forEach(p => {
          const propertyName = (p.key as Identifier).name
          if (propertyName === 'handler') {
            args.push(buildArrowFunctionExpression(p.value as j.FunctionExpression))
          } else {
            options.push(p)
          }
        })

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
    })
  })

  watchOptionCollection.remove()
  return astCollection
}
