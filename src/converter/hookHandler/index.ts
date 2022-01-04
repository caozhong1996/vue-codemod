import j from 'jscodeshift'

const LIFECYCLE_HOOKS = {
  beforeCreate: 'setup',
  created: 'setup',
  beforeMount: 'onBeforeMount',
  mounted: 'onMounted',
  beforeUpdate: 'onBeforeUpdate',
  updated: 'onUpdated',
  errorCaptured: 'onErrorCaptured',
  renderTracked: 'onRenderTracked',
  renderTriggered: 'onRenderTriggered',
  beforeDestroy: 'onBeforeUnmount',
  destroyed: 'onUnmounted',
  activated: 'onActivated',
  deactivated: 'onDeactivated'
}

const ROUTER_HOOKS = [
  'beforeRouteEnter',
  'beforeRouteUpdate',
  'beforeRouteLeave'
]

export default function (
  astCollection: j.Collection,
  setupFn: j.FunctionExpression,
  hookList: string[],
  importList: string[]
): j.Collection {
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

  return astCollection
}
