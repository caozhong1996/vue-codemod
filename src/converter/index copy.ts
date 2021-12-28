/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { kebab } from 'case'
import { groupStatements } from './groups'
import j, { Identifier } from 'jscodeshift'

const LIFECYCLE_HOOKS = [
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeDestroy',
  'destroyed',
  'activated',
  'deactivated'
]

const ROUTER_HOOKS = [
  'beforeRouteEnter',
  'beforeRouteUpdate',
  'beforeRouteLeave'
]

export function convertScript (script: string, {
  variableMethods = false
} = {}): string {
  const astCollection = j(script)

  // ObjectExpression

  const componentDefinition: j.ObjectExpression = astCollection.find(j.ExportDefaultDeclaration).get(0).node.declaration

  if (!componentDefinition) {
    throw new Error('Default export not found')
  }

  const newImports: {
    vue: string[],
    vueRouter: string[]
  } = {
    vue: [],
    vueRouter: []
  }
  const setupReturn = j.returnStatement(
    j.objectExpression([])
  )

  const setupFn = j.functionExpression(
    null,
    [],
    j.blockStatement([])
  )

  const options = componentDefinition.properties as j.Property[]

  const valueWrappers: string[] = []

  const setupVariables: string[] = []

  // Data
  const dataOption = options.find(node => (node.key as j.Identifier).name === 'data')
  let objectProperties: j.ObjectExpression['properties'] = []

  if (dataOption) {
    if (j.FunctionExpression.check(dataOption.value)) {
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
  }

  // Computed
  const computedOption = options.find(node => (node.key as j.Identifier).name === 'computed')
  if (computedOption) {
    newImports.vue.push('computed')

    if (!j.ObjectExpression.check(computedOption.value)) {
      throw new Error('No return statement found in data option')
    }

    for (const property of computedOption.value.properties as j.ObjectProperty[]) {
      let args
      if (j.FunctionExpression.check(property.value)) {
        args = [j.arrowFunctionExpression([], property.value.body)]
      } else if (j.ObjectExpression.check(property.value)) {
        const getFn = (property.value.properties as j.ObjectProperty[]).find(p => (p.key as Identifier).name === 'get')
        const setFn = (property.value.properties as j.ObjectProperty[]).find(p => (p.key as Identifier).name === 'set')
        args = [
          getFn ? buildArrowFunctionExpression(getFn.value) : null,
          setFn ? buildArrowFunctionExpression(setFn.value) : undefined
        ]
      }
      setupFn.body.body.push(
        j.variableDeclaration('const', [
          j.variableDeclarator(
            j.identifier((property.key as Identifier).name),
            j.callExpression(
              j.identifier('computed'),
              args
            )
          )
        ])
      )
      setupReturn.argument!.properties.push(
        j.identifier(property.key.name)
      )
      setupVariables.push(property.key.name)
      valueWrappers.push(property.key.name)
    }
    removeOption(computedOption)
  }

  // Watch
  const watchOption = options.find(property => property.key.name === 'watch')
  if (watchOption) {
    newImports.vue.push('watch')
    for (const property of watchOption.value.properties) {
      let firstArg
      if (j.Literal.check(property.key)) {
        const parts = property.key.value.split('.')
        if (valueWrappers.includes(parts[0])) {
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
      setupFn.body.body.push(j.expressionStatement(
        j.callExpression(
          j.identifier('watch'),
          args
        )
      ))
    }
    removeOption(watchOption)
  }

  // Methods
  const methodsOption = options.find(property => property.key.name === 'methods')
  if (methodsOption) {
    for (const property of methodsOption.value.properties) {
      if (variableMethods) {
        setupFn.body.body.push(j.variableDeclaration('const', [
          j.variableDeclarator(
            j.identifier(property.key.name),
            buildArrowFunctionExpression(property.value)
          )
        ]))
      } else {
        setupFn.body.body.push(buildFunctionDeclaration(
          property.key.name,
          property.value
        ))
      }
      setupReturn.argument.properties.push(
        j.identifier(property.key.name)
      )
      setupVariables.push(property.key.name)
    }
    removeOption(methodsOption)
  }

  processHooks(astCollection, setupFn, LIFECYCLE_HOOKS, newImports.vue)
  processHooks(astCollection, setupFn, ROUTER_HOOKS, newImports.vueRouter)

  if (setupFn.body.body.length) {
    // Group statements heuristically
    setupFn.body.body = groupStatements(setupFn.body.body, setupVariables)

    setupFn.body.body.push(setupReturn)

    componentDefinition.properties.push(
      j.methodDefinition(
        'method',
        j.identifier('setup'),
        setupFn
      ) as unknown as j.ObjectProperty
    )

    // Remove `this`
    transformThis(astCollection, setupVariables, valueWrappers)
  }

  // Imports
  const importStatements: j.ImportDeclaration[] = []
  Object.keys(newImports).forEach(key => {
    const pkg = kebab(key)
    if (newImports[key].length) {
      const specifiers = newImports[key].map(i => j.importSpecifier(j.identifier(i)))
      const importDeclaration = j.importDeclaration(specifiers, j.stringLiteral(pkg))
      importStatements.push(importDeclaration)
    }
  })

  if (importStatements.length) {
    astCollection.program.body.splice(0, 0, ...importStatements, '\n')
  }

  return print(ast).code
}

function processHooks (astCollection: j.Collection, setupFn: j.FunctionExpression, hookList: string[], importList: string[]) {
  astCollection
    .find(j.ObjectMethod)
    .filter(path => (hookList.includes((path.value.key as j.Identifier).name)))
    .forEach(path => {
      const name = (path.node.key as j.Identifier).name
      const hookName = `on${name.charAt(0).toUpperCase() + name.slice(1)}`
      importList.push(hookName)
      setupFn.body.body.push(j.expressionStatement(
        j.callExpression(
          j.identifier(hookName),
          [j.arrowFunctionExpression(path.node.params, path.node.body)]
        )
      ))
    }).remove()
}

function transformThis (astCollection: j.Collection, setupVariables: string[], valueWrappers: string[]) {
  astCollection
    .find(j.ObjectMethod, { key: { name: 'setup' } })
    .find(j.MemberExpression)
    .forEach(path => {
      const property = path.value.property as j.Identifier
      if (j.ThisExpression.check(path.value.object) &&
        setupVariables.includes(property.name)) {
        // Remove this
        let parentObject: j.Identifier | j.MemberExpression = j.identifier(property.name)
        // Value wrapper
        if (valueWrappers.includes(property.name)) {
          parentObject = j.memberExpression(parentObject, j.identifier('value'))
        }
        path.replace(parentObject)
      }
      // this.traverse(path)
    })
}

function buildArrowFunctionExpression (node: j.FunctionExpression) {
  const result = j.arrowFunctionExpression(
    node.params,
    node.body
  )
  result.async = node.async
  return result
}

function buildFunctionDeclaration (name: string, node: j.FunctionExpression) {
  const result = j.functionDeclaration(
    j.identifier(name),
    node.params,
    node.body
  )
  result.async = node.async
  return result
}
