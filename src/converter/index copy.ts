import { camel, kebab } from 'case'
import { groupStatements } from './groups'
import j, { API } from 'jscodeshift'

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
  /** @type {import('recast').types.j.ExportDefaultDeclaration} */
  const componentDefinition = astCollection.find(j.ExportDefaultDeclaration)

  if (!componentDefinition) {
    throw new Error('Default export not found')
  }
  console.log(componentDefinition)

  const removeOption = (option) => {
    const index = componentDefinition.declaration.properties.indexOf(option)
    componentDefinition.declaration.properties.splice(index, 1)
  }

  const newImports: any = {
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

  /** @type {import('recast').types.j.Property[]} */
  const options = componentDefinition.declaration.properties.filter(node =>
    j.Property.check(node)
  )

  /** @type {string[]} */
  const valueWrappers = []

  /** @type {string[]} */
  const setupVariables = []

  // Data
  const dataOption = options.find(node => node.key.name === 'data')
  if (dataOption) {
    let objectProperties
    if (j.FunctionExpression.check(dataOption.value)) {
      const returnStatement = dataOption.value.body.body.find(node =>
        j.ReturnStatement.check(node)
      )
      if (!returnStatement) {
        throw new Error('No return statement found in data option')
      }
      objectProperties = returnStatement.argument.properties
    } else if (j.ObjectExpression.check(dataOption.value)) {
      objectProperties = dataOption.value.properties
    }
    /** @type {{ name: string, value: any, state: boolean }[]} */
    const dataProperties = objectProperties.map(node => ({
      name: node.key.name,
      value: node.value,
      state: j.ObjectExpression.check(node.value)
    }))
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
                [property.value]
              )
            )
          ])
        )
        setupReturn.argument.properties.push(
          j.identifier(property.name)
        )
        setupVariables.push(property.name)
        if (!property.state) {
          valueWrappers.push(property.name)
        }
      }
    }
    removeOption(dataOption)
  }

  // Computed
  const computedOption = options.find(property => property.key.name === 'computed')
  if (computedOption) {
    newImports.vue.push('computed')
    for (const property of computedOption.value.properties) {
      let args
      if (j.FunctionExpression.check(property.value)) {
        args = [j.arrowFunctionExpression([], property.value.body)]
      } else if (j.ObjectExpression.check(property.value)) {
        const getFn = property.value.properties.find(p => p.key.name === 'get')
        const setFn = property.value.properties.find(p => p.key.name === 'set')
        args = [
          getFn ? buildArrowFunctionExpression(getFn.value) : null,
          setFn ? buildArrowFunctionExpression(setFn.value) : undefined
        ]
      }
      setupFn.body.body.push(
        j.variableDeclaration('const', [
          j.variableDeclarator(
            j.identifier(property.key.name),
            j.callExpression(
              j.identifier('computed'),
              args
            )
          )
        ])
      )
      setupReturn.argument.properties.push(
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

  // Lifecycle hooks
  const processHooks = (hookList: string[], importList: string[]) => {
    for (const option of options) {
      if (hookList.includes(option.key.name)) {
        const hookName = camel(`on_${option.key.name}`)
        importList.push(hookName)
        setupFn.body.body.push(j.expressionStatement(
          j.callExpression(
            j.identifier(hookName),
            [j.arrowFunctionExpression(option.value.params, option.value.body)]
          )
        ))
        removeOption(option)
      }
    }
  }
  processHooks(LIFECYCLE_HOOKS, newImports.vue)
  processHooks(ROUTER_HOOKS, newImports.vueRouter)

  if (setupFn.body.body.length) {
    // Remove `this`
    transformThis(setupFn.body.body, setupVariables, valueWrappers)

    // Group statements heuristically
    setupFn.body.body = groupStatements(setupFn.body.body, setupVariables)

    setupFn.body.body.push(setupReturn)

    componentDefinition.declaration.properties.push(
      j.methodDefinition(
        'method',
        j.identifier('setup'),
        setupFn
      )
    )
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

/**
 * @param {import('recast').types.ASTNode} node
 * @param {string[]} setupVariables
 * @param {string[]} valueWrappers
 */
function transformThis (node, setupVariables, valueWrappers) {
  visit(node, {
    visitMemberExpression (path) {
      if (j.ThisExpression.check(path.value.object) &&
        setupVariables.includes(path.value.property.name)) {
        // Remove this
        let parentObject = j.identifier(path.value.property.name)
        // Value wrapper
        if (valueWrappers.includes(path.value.property.name)) {
          parentObject = j.memberExpression(parentObject, j.identifier('value'))
        }
        path.replace(parentObject)
      }
      this.traverse(path)
    }
  })
}

function buildArrowFunctionExpression (node) {
  const result = j.arrowFunctionExpression(
    node.params,
    node.body
  )
  result.async = node.async
  return result
}

function buildFunctionDeclaration (name, node) {
  const result = j.functionDeclaration(
    j.identifier(name),
    node.params,
    node.body
  )
  result.async = node.async
  return result
}
