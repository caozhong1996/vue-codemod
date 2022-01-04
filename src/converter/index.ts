import j from 'jscodeshift'
import { SetupState } from './types'
import dataHandler from './dataHandler'
import computedHandler from './computedHandler'
import watchHandler from './watchHandler'
import methodsHandler from './methodsHandler'

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

type ImportList = 'vue' | 'vue-router'

export function convertScript (script: string, {
  methods = false
} = {}): string {
  const setupState: SetupState = {
    newImports: {
      vue: [],
      'vue-router': []
    },
    returnStatement: j.returnStatement(
      j.objectExpression([])
    ),
    setupFn: j.functionExpression(
      null,
      [],
      j.blockStatement([])
    ),
    valueWrappers: [],
    variables: [],
    methods
  }

  const astCollection = j(script)

  // ObjectExpression
  const componentDefinition = astCollection.find(j.ExportDefaultDeclaration).nodes()[0]

  if (!componentDefinition) {
    throw new Error('Default export not found')
  }

  // Data
  dataHandler(astCollection, setupState)
  // Computed
  computedHandler(astCollection, setupState)
  // Watch
  watchHandler(astCollection, setupState)
  // Methods
  methodsHandler(astCollection, setupState)

  processHooks(astCollection, setupState.setupFn, LIFECYCLE_HOOKS, setupState.newImports.vue)
  processHooks(astCollection, setupState.setupFn, ROUTER_HOOKS, setupState.newImports['vue-router'])

  if (setupState.setupFn.body.body.length) {
    // Group statements heuristically
    // setupState.setupFn.body.body = groupStatements(setupState.setupFn.body.body, setupState.variables)

    setupState.setupFn.body.body.push(setupState.returnStatement);

    (componentDefinition.declaration as j.ObjectExpression).properties.push(
      j.methodDefinition(
        'method',
        j.identifier('setup'),
        setupState.setupFn
      ) as unknown as j.ObjectProperty
    )

    // Remove `this`
    transformThis(astCollection, setupState.variables, setupState.valueWrappers)
  }

  // Imports
  const importStatements: j.ImportDeclaration[] = []
  for (const key in setupState.newImports) {
    if (setupState.newImports[key as ImportList].length) {
      const specifiers = setupState.newImports[key as ImportList].map(i => j.importSpecifier(j.identifier(i)))
      const importDeclaration = j.importDeclaration(specifiers, j.stringLiteral(key))
      importStatements.push(importDeclaration)
    }
  }

  if (importStatements.length) {
    astCollection
      .find(j.ExportDefaultDeclaration)
      .forEach(path => path.insertBefore(...importStatements))
  }

  return astCollection.toSource()
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

function transformThis (astCollection: j.Collection, variables: string[], valueWrappers: string[]) {
  astCollection
    .find(j.MethodDefinition, {
      key: {
        name: 'setup'
      }
    })
    .find(j.MemberExpression)
    .forEach(path => {
      const property = path.value.property as j.Identifier
      if (j.ThisExpression.check(path.value.object) &&
        variables.includes(property.name)) {
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
