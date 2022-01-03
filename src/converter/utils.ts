import j from 'jscodeshift'

function buildArrowFunctionExpression (node: j.FunctionExpression | j.ArrowFunctionExpression): j.ArrowFunctionExpression {
  const result = j.arrowFunctionExpression(
    node.params,
    node.body
  )
  result.async = node.async
  return result
}

function buildFunctionDeclaration (name: string, node: j.FunctionExpression): j.FunctionDeclaration {
  const result = j.functionDeclaration(
    j.identifier(name),
    node.params,
    node.body
  )
  result.async = node.async
  return result
}

export {
  buildArrowFunctionExpression,
  buildFunctionDeclaration
}
