import { kebab } from 'case'
import { groupStatements } from './groups'
import j from 'jscodeshift'
import { SetupState } from './types'
import dataHandler from './dataHandler'
import computedHandler from './computedHandler'
import watchHandler from './watchHandler'

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
  const setupState: SetupState = {
    newImports: {
      vue: [],
      vueRouter: []
    },
    setupReturn: j.returnStatement(
      j.objectExpression([])
    ),
    setupFn: j.functionExpression(
      null,
      [],
      j.blockStatement([])
    ),
    valueWrappers: [],
    setupVariables: []
  }

  const astCollection = j(script)

  // ObjectExpression
  const componentDefinition = astCollection.find(j.ExportDefaultDeclaration).get(0).node.declaration

  if (!componentDefinition) {
    throw new Error('Default export not found')
  }

  const options = componentDefinition.properties as j.Property[]

  // Data
  dataHandler(astCollection, setupState)
  // Computed
  computedHandler(astCollection, setupState)

  // Watch
  watchHandler(astCollection, setupState)

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
