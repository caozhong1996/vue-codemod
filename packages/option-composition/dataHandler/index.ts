import j from 'jscodeshift'
import { SetupState } from '../types'

export default function (astCollection: j.Collection, setupState: SetupState): j.Collection {
  const dataOptionCollection = astCollection
    .find(j.Property, {
      key: {
        name: 'data'
      }
    })
    .filter(path => path.parent.parent.value.type === 'ExportDefaultDeclaration')

  const dataOption = dataOptionCollection.nodes()[0]

  let objectProperties: j.ObjectProperty[] = []

  if (dataOption) {
    const returnStatement = dataOptionCollection
      .find(j.ReturnStatement, {
        argument: {
          type: 'ObjectExpression'
        }
      })
      .filter(path => path.parent.parent.parent.value.key.name === 'data').nodes()[0]

    if (!j.ReturnStatement.check(returnStatement)) {
      throw new Error('No return statement found in data option')
    }

    /*
      data () {
        return 'not return an object'
      }
    */
    if (!j.ObjectExpression.check(returnStatement.argument)) {
      throw new Error('Return statement not a ObjectExpression')
    }

    objectProperties = returnStatement.argument?.properties as j.ObjectProperty[]
  } else if (!dataOption) {
    /*
      todo
      data: {}
    */
  }

  const dataProperties: { name: string; value: j.Property['value']; state: boolean } [] =
    objectProperties.map(node => ({
      name: (node.key as j.Identifier).name,
      value: node.value,
      state: j.ObjectExpression.check(node.value)
    }))

  if (dataProperties.length) {
    if (dataProperties.some(p => !p.state)) {
      setupState.newImports.vue.push('ref')
    }
    if (dataProperties.some(p => p.state)) {
      setupState.newImports.vue.push('reactive')
    }

    for (const property of dataProperties) {
      setupState.setupFn.body.body.push(
        j.variableDeclaration('const', [
          j.variableDeclarator(
            j.identifier(property.name),
            j.callExpression(
              j.identifier(property.state ? 'reactive' : 'ref'),
              [property.value as j.Identifier]
            )
          )
        ])
      );

      (setupState.returnStatement.argument as j.ObjectExpression).properties.push(
        j.property('init', j.identifier(property.name), property.value)
      )

      setupState.variables.push(property.name)
      if (!property.state) {
        setupState.valueWrappers.push(property.name)
      }
    }
  }

  dataOptionCollection.remove()
  return astCollection
}
