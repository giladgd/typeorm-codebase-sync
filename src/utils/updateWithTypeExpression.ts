import ts from "typescript";

// expression: *[] as any[]*, updater: (valueExpression: *[]*) => expression
// expression: *<any[]>[]*, updater: (valueExpression: *[]*) => expression
// relevant for any expression value, not necessarily just for arrays
export function updateWithTypeExpression(
    expression: ts.Expression, updater: (valueExpression: ts.Expression) => ts.Expression
): ts.Expression {
    if (ts.isAsExpression(expression))
        return ts.factory.updateAsExpression(expression,
            isWithTypeExpression(expression.expression)
                ? updateWithTypeExpression(expression.expression, updater)
                : updater(expression.expression),
            expression.type
        );

    if (ts.isTypeAssertionExpression(expression))
        return ts.factory.updateTypeAssertion(expression, expression.type,
            isWithTypeExpression(expression.expression)
                ? updateWithTypeExpression(expression.expression, updater)
                : updater(expression.expression)
        );

    return updater(expression);
}

export function isWithTypeExpression(expression: ts.Expression): expression is ts.TypeAssertion | ts.AsExpression {
    return ts.isAsExpression(expression) || ts.isTypeAssertionExpression(expression);
}
