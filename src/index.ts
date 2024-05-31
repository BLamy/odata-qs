const equalityOperators = ["eq", "ne"] as const;
const numericalOperators = ["lt", "lte", "gt", "gte"] as const;
const stringComparisonOperators = ["startsWith", "endsWith", "contains"] as const;
const regexMatchingOperator = ["matches"] as const;
const arrayComparisonOperators = ["in", "includes"] as const;
const logicalOperators = ["and", "or", "not"] as const;
const relationshipOperators = ['any', 'all', 'none', 'single'] as const;

export type EqualityOperator = (typeof equalityOperators)[number];
export type NumericalOperator = (typeof numericalOperators)[number];
export type StringComparisonOperator = (typeof stringComparisonOperators)[number];
export type RegexMatchingOperator = (typeof regexMatchingOperator)[number];
export type ArrayComparisonOperator = (typeof arrayComparisonOperators)[number];
export type LogicalOperator = (typeof logicalOperators)[number];
export type RelationshipOperator = (typeof relationshipOperators)[number];

export type ComparisonOperator = 
  | EqualityOperator
  | NumericalOperator
  | StringComparisonOperator
  | RegexMatchingOperator
  | ArrayComparisonOperator
  | RelationshipOperator;

export type Operator = ComparisonOperator | LogicalOperator;

export type Expression = {
  subject: Expression | string;
  operator: Operator;
  value: Expression | ReturnType<typeof deserializeValue> | ReturnType<typeof deserializeValue>[];
};

export type GroupedExpression = {
  subject: string;
  operator: Operator;
  values: Exclude<ReturnType<typeof deserializeValue>, Expression | GroupedExpression>[];
};

export function deserialize(input: string): Expression | null {
  if (input === undefined || input === null || input === "") {
    return null;
  }

  const substitutions: Map<string, Expression> = new Map();

  function parseFragment(input: string): Expression {
    input = input.trim();

    // Check if input is a substitution key and return the stored expression
    const substitutionMatch = input.match(/^Sub_(\d+)$/);
    if (substitutionMatch) {
      const substitutionKey = substitutionMatch[0];
      const expression = substitutions.get(substitutionKey);
      if (!expression) {
        throw new Error(`No expression found for substitution key: ${substitutionKey}`);
      }
      return expression;
    }

    // Handle nested expressions within parentheses
    function extractParenthesesExpression(str: string): string {
      let depth = 0;
      let inQuotes = false;
      let startIndex = -1;

      for (let i = 0; i < str.length; i++) {
        if (str[i] === "'" && (i === 0 || str[i - 1] !== "\\")) {
          inQuotes = !inQuotes;
        }
        if (inQuotes) continue;

        if (str[i] === "(") {
          if (depth === 0) startIndex = i;
          depth++;
        } else if (str[i] === ")") {
          depth--;
          if (depth === 0) {
            const innerExpression = str.substring(startIndex + 1, i);
            const key = `Sub_${substitutions.size}`;
            substitutions.set(key, parseFragment(innerExpression));
            str = str.substring(0, startIndex) + key + str.substring(i + 1);
            i = startIndex + key.length - 1; // Adjust index to skip the replaced segment
          }
        }
      }
      return str;
    }

    input = extractParenthesesExpression(input);

    // This function will check if the character at position i in input is within quotes
    function isInQuotes(pos: number): boolean {
      let inQuotes = false;
      for (let i = 0; i < pos; i++) {
        if (input[i] === "'" && (i === 0 || input[i - 1] !== "\\")) {
          inQuotes = !inQuotes;
        }
      }
      return inQuotes;
    }

    // This function will check if the character at position i in input is within parentheses
    function isInParens(pos: number): boolean {
      let depth = 0;
      for (let i = 0; i < pos; i++) {
        if (input[i] === "(" && !isInQuotes(i)) {
          depth++;
        } else if (input[i] === ")" && !isInQuotes(i)) {
          depth--;
        }
      }
      return depth > 0;
    }

    // Handle the 'not' operator
    if (input.startsWith("not ")) {
      const rest = input.substring(4).trim();
      return {
        subject: parseFragment(rest),
        operator: "not" as LogicalOperator,
        value: null,
      };
    }

    // Split input by logical operators that are not within quotes or parentheses
    const operators = [" and ", " or "];
    for (let op of operators) {
      let index = 0;
      while ((index = input.indexOf(op, index)) !== -1) {
        if (!isInQuotes(index) && !isInParens(index)) {
          const left = input.substring(0, index);
          const right = input.substring(index + op.length);
          return {
            subject: parseFragment(left),
            operator: op.trim() as LogicalOperator,
            value: parseFragment(right),
          };
        }
        index += op.length;
      }
    }

    // Handle basic expressions and the 'in' operator
    const parts = input.match(
      /^(.+?)\s+(eq|ne|gt|lt|gte|lte|contains|startsWith|endsWith|in|matches|includes|any|all|none|single)\s+(.+)$/
    );
    if (parts) {
      const [, subject, operator, value] = parts;
      if (arrayComparisonOperators.includes(operator as ArrayComparisonOperator)) {
        const values = value.startsWith("[")
          ? value
              .slice(1, -1)
              .split(",")
              .map((v) => deserializeValue(v.trim()))
          : [deserializeValue(value)];
        return {
          subject,
          operator: operator as ArrayComparisonOperator,
          value: values,
        };
      }

      if (relationshipOperators.includes(operator as RelationshipOperator)) {
        const values = value.startsWith("[")
          ? value
              .slice(1, -1)
              .split(",")
              .map((v) => deserializeValue(v.trim()))
          : [deserializeValue(value)];
        return {
          subject,
          operator: operator as RelationshipOperator,
          value: values,
        };
      }

      return {
        subject,
        operator: operator as Exclude<Operator, ArrayComparisonOperator | RelationshipOperator>,
        value: deserializeValue(value),
      };
    }
    throw new Error(`Invalid expression: ${input}`);
  }

  return parseFragment(input);
}

export function deserializeValue(value: string): string | number | boolean | Date | null | undefined {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (!isNaN(Number(value))) {
    return Number(value);
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  const match = value.match(/^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/);
  if (match && match.groups) {
    const { year, month, day } = match.groups;
    const date = new Date(`${year}-${month}-${day}`);
    return date;
  }
  return value;
}
export function getMap<T extends string>(
  expressions: ReadonlyArray<Expression>,
  keys?: Array<T>
): Partial<Record<T, Partial<Record<ComparisonOperator, GroupedExpression>>>> {
  function isKey(value: string | number | symbol): value is T {
    if (typeof value !== "string") return false;
    if (!keys) return true;
    return keys.includes(value as T);
  }

  function flattenExpressions(expressions: Expression[]): Expression[] {
    return expressions.reduce((acc, expr) => {
      if (expr.operator === "and" || expr.operator === "or") {
        return [...acc, ...flattenExpressions([expr.subject as Expression, expr.value as Expression])];
      }
      return [...acc, expr];
    }, [] as Expression[]);
  }

  const flattenedExpressions = flattenExpressions([...expressions]);

  return flattenedExpressions.reduce((acc, expression) => {
    const subject = typeof expression.subject === "string" ? expression.subject : JSON.stringify(expression.subject);
    
    if (!isKey(subject)) {
      throw new Error(`Subject "${JSON.stringify(subject)}" does not match ${keys}`);
    }

    if (!acc[subject]) {
      acc[subject] = {};
    }

    // Ensure the operator is correctly nested under the subject
    if (!acc[subject]?.[expression.operator as ComparisonOperator]) {
      acc[subject]![expression.operator as ComparisonOperator] = {
        subject: subject,
        operator: expression.operator as ComparisonOperator,
        values: [],
      };
    }

    const operatorGroup = acc[subject]![expression.operator as ComparisonOperator];

    // Accumulate values instead of overwriting
    if (Array.isArray(expression.value)) {
      operatorGroup!.values.push(...expression.value);
    } else {
      if (typeof expression.value !== 'object' || expression.value instanceof Date) {
        operatorGroup!.values.push(expression.value);
      } else {
        throw new Error(`Invalid value type: ${typeof expression.value}`);
      }
    }

    return acc;
  }, {} as Partial<Record<T, Partial<Record<ComparisonOperator, GroupedExpression>>>>);
}

export function getValuesFromMap(
  tree: Partial<Record<string, Partial<Record<ComparisonOperator, GroupedExpression>>>>
): GroupedExpression[] {
  
  function flattenGroupedExpressions(groups: GroupedExpression[]): GroupedExpression[] {
    return groups.reduce((acc, group) => {
      const nestedGroups = group.values.filter(
        (v) => typeof v === 'object' && v !== null && 'subject' in v && 'operator' in v && 'values' in v
      );
      return [...acc, ...flattenGroupedExpressions(nestedGroups as any), group];
    }, [] as GroupedExpression[]);
  }

  const groupedExpressions = Object.values(tree).reduce((acc, cur) => {
    if (cur) {
      return acc.concat(Object.values(cur));
    }
    return acc;
  }, [] as GroupedExpression[]);

  return flattenGroupedExpressions(groupedExpressions);
}

export function serialize(expression: Expression, isNested: boolean = false): string {
  if (expression.operator === "not") {
    return `not ${serialize(expression.subject as Expression, true)}`;
  }

  if (logicalOperators.includes(expression.operator as LogicalOperator)) {
    const subject = serialize(expression.subject as Expression, true);
    const value = serialize(expression.value as Expression, true);
    const result = `${subject} ${expression.operator} ${value}`;
    return isNested ? `(${result})` : result;
  }

  const subject =
    typeof expression.subject === "string"
      ? expression.subject
      : serialize(expression.subject, true); // Recursively serialize nested expressions

  if (!expression.value && expression.operator as any !== "not") {
    throw new Error("Invalid expression value");
  }

  if (expression.operator === "in") {
    return `${subject} ${expression.operator} [${(expression.value as any[])
      .map((v: any) => serializeValue(v))
      .join(", ")}]`;
  }

  if (Array.isArray(expression.value)) {
    return `${subject} ${expression.operator} [${(expression.value as any[])
      .map((v: any) => serializeValue(v))
      .join(", ")}]`;
  }

  return `${subject} ${expression.operator} ${serializeValue(expression.value)}`;

  function serializeValue(value: any): string {
    if (typeof value === "string") {
      return `'${value}'`;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return `${value}`;
    }
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    return `${value}`;
  }
}

export function ungroupValues(
  groups: Array<GroupedExpression>,
  operator: LogicalOperator = "or"
): Expression[] {
  return groups.map((group) => {
    const expressions = group.values.map((value) => ({
      subject: group.subject,
      operator: group.operator,
      value,
    }));

    return joinTree(expressions, operator);
  });
}

export function isLogical(op: string): op is LogicalOperator {
  return logicalOperators.includes(op as LogicalOperator);
}

export function isComparison(op: string): op is ComparisonOperator {
  return [
    ...equalityOperators,
    ...numericalOperators,
    ...stringComparisonOperators,
    ...regexMatchingOperator,
    ...arrayComparisonOperators,
    ...relationshipOperators,
  ].includes(op as ComparisonOperator);
}

export function splitTree(
  expression: Expression | null,
  operator: LogicalOperator
): Expression[] {
  if (!expression) return [];
  if (expression.operator === "not") {
    return [
      {
        subject: expression.subject as Expression, // Keep the subject as a single expression
        operator: "not",
        value: null,
      },
    ];
  }
  if (expression.operator === operator) {
    const subjectExpressions =
      typeof expression.subject === "string"
        ? []
        : splitTree(expression.subject, operator);
    const valueExpressions =
      typeof expression.value === "object" &&
      expression.value !== null &&
      "operator" in expression.value
        ? splitTree(expression.value, operator)
        : [];
    return [...subjectExpressions, ...valueExpressions];
  }
  return [expression];
}
export function joinTree(
  expressions: Expression[],
  operator: LogicalOperator
): Expression {
  if (expressions.length === 1) {
    return expressions[0];
  }
  const [first, ...rest] = expressions;
  return {
    subject: first,
    operator,
    value: joinTree(rest, operator),
  };
}

export function parse<T extends string>(
  query: string | null,
  keys?: Array<T>
): Partial<Record<T, Partial<Record<ComparisonOperator, GroupedExpression>>>> {
  if (!query) return {};

  const deserialized = deserialize(query);
  if (!deserialized) return {};

  const operator = isLogical(deserialized.operator)
    ? deserialized.operator
    : "and";

  const tree = splitTree(deserialized, operator);

  const map = getMap(tree, keys);

  return map;
}
