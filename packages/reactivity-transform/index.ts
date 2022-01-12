import j from 'jscodeshift'
// https://github.com/vuejs/rfcs/discussions/413
const shorthands = ['ref', 'computed', 'shallowRef', 'toRef', 'customRef']

export default function (script: string, options?: {}): string {
  const astCollection = j(script)

  // rename shorthands with prefix
  shorthands.forEach(shorthand => {
    astCollection
      .find(j.CallExpression, { callee: { name: 'ref' } })
      .find(j.Identifier)
      .replaceWith(j.identifier(`$${shorthand}`))
  })

  // remove .value
  // todo 要根据引用来判断是否去掉.value
  astCollection
    .find(j.MemberExpression, {property: { name: 'value' }})
    .replaceWith(p => j.identifier((p.value.object as j.Identifier).name)) 

  // todo remove imports

  return astCollection.toSource()
}