import j from 'jscodeshift'

export default function (astCollection: j.Collection): j.Collection {
  const dataOption = astCollection
    .find(j.ObjectMethod, {
      params: [],
      key: {
        name: 'data'
      }
    })
    .filter(path => path.parent.parent.type === 'ExportDefaultDeclaration').nodes()[0]

  if (j.FunctionExpression.check(dataOption)) {
    const returnStatement = dataOption.value.body.body.find(node =>
      j.ReturnStatement.check(node)
    )

    if (!j.ReturnStatement.check(returnStatement)) {
      throw new Error('No return statement found in data option')
    }

    objectProperties = (returnStatement.argument as j.ObjectExpression).properties
  } else if (j.ObjectExpression.check(dataOption.value)) {
    objectProperties = dataOption.value.properties
  }

  const dataProperties: { name: string; value: j.Property['value']; state: boolean } [] = []
  objectProperties.forEach(p => {
    const node = p as j.Property
    dataProperties.push({
      name: (node.key as j.Identifier).name,
      value: node.value,
      state: j.ObjectExpression.check(node.value)
    })
  })

  if (dataProperties.length) {
    if (dataProperties.some(p => !p.state)) {
      newImports.vue.push('ref')
    }
    if (dataProperties.some(p => p.state)) {
      newImports.vue.push('reactive')
    }
    for (const property of dataProperties) {
      setupFn.body.body.push(
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

      (setupReturn.argument as j.ObjectExpression).properties.push(
        j.property('init', j.identifier(property.name), property.value)
      )

      setupVariables.push(property.name)
      if (!property.state) {
        valueWrappers.push(property.name)
      }
    }
  }

  return astCollection
}
