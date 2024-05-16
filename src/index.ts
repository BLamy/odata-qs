export type Expression = {
  subject: Expression | string;
  operator: Operator;
  value:
    | Expression
    | ReturnType<typeof deserializeValue>
    | ReturnType<typeof deserializeValue>[];
};

export type GroupedExpression = {
  subject: string;
  operator: Operator;
  values: Exclude<ReturnType<typeof deserializeValue>, Expression>[];
};

export type LogicalOperator = "and" | "or" | "not";
export type ComparisonOperator =
  | "eq"
  | "gt"
  | "lt"
  | "ge"
  | "le"
  | "ne"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "in";
export type Operator = LogicalOperator | ComparisonOperator;

export function deserialize(input: string | null): Expression | null {
  if (!input) return null;

  const substitutions: Map<string, Expression> = new Map();

  function parseFragment(input: string): Expression {
    input = input.trim();

    // Check if input is a substitution key and return the stored expression
    const substitutionMatch = input.match(/^Sub_(\d+)$/);
    if (substitutionMatch) {
      const substitutionKey = substitutionMatch[0];
      const expression = substitutions.get(substitutionKey);
      if (!expression) {
        throw new Error(
          `No expression found for substitution key: ${substitutionKey}`
        );
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
      /^(.+?)\s+(eq|ne|gt|lt|ge|le|contains|startsWith|endsWith|in)\s+(.+)$/
    );
    if (parts) {
      const [, subject, operator, value] = parts;
      if (operator === "in") {
        const values = value.startsWith("[")
          ? value
              .slice(1, -1)
              .split(",")
              .map((v) => deserializeValue(v.trim()))
          : [deserializeValue(value)];
        return {
          subject,
          operator: operator as ComparisonOperator,
          value: values,
        };
      }
      return {
        subject,
        operator: operator as ComparisonOperator,
        value: deserializeValue(value),
      };
    }
    throw new Error(`Invalid expression: ${input}`);
  }

  return parseFragment(input);
}

export function deserializeValue(
  value: string
): string | number | boolean | Date | null {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.substring(1, value.length - 1);
  }

  if (/^-?\d+$/.test(value)) {
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

  return null;
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

  return expressions
    .map((expression) => {
      if (isLogical(expression.operator)) {
        const expressions = splitTree(expression, expression.operator);

        const uniqueSubjects = new Set(expressions.map((e) => e.subject));
        if (uniqueSubjects.size !== 1) {
          throw new Error("Cannot map logical operator with multiple subjects");
        }

        const uniqueOperators = new Set(expressions.map((e) => e.operator));
        if (uniqueOperators.size !== 1) {
          throw new Error(
            "Cannot map logical operator with multiple operators"
          );
        }

        return {
          subject:
            typeof expression.subject === "string"
              ? expression.subject
              : (expression.subject as Expression).subject,
          operator: (expression.subject as Expression)
            .operator as ComparisonOperator,
          values: expressions.map((e) => e.value),
        };
      }

      return {
        subject: expression.subject,
        operator: expression.operator as ComparisonOperator,
        values: Array.isArray(expression.value)
          ? expression.value
          : [expression.value],
      };
    })
    .reduce((acc, cur) => {
      const subject = cur.subject;

      if (typeof subject !== "string" || !isKey(subject)) {
        throw new Error(`Subject "${subject}" does not match ${keys}`);
      }

      if (!acc[subject]) {
        acc[subject] = {} as Partial<
          Record<ComparisonOperator, GroupedExpression>
        >;
      }

      const operatorGroup = acc?.[subject]?.[cur.operator] ?? {
        subject: subject,
        operator: cur.operator,
        values: [],
      };

      operatorGroup.values = Array.from(
        new Set(
          operatorGroup.values.concat(
            cur.values as (string | number | boolean | Date | null)[]
          )
        )
      );

      acc[subject]![cur.operator] = operatorGroup;

      return acc;
    }, {} as Partial<Record<T, Partial<Record<ComparisonOperator, GroupedExpression>>>>);
}
export function getValuesFromMap(
  tree: Partial<
    Record<string, Partial<Record<ComparisonOperator, GroupedExpression>>>
  >
): GroupedExpression[] {
  return Object.values(tree).reduce((acc, cur) => {
    if (cur) {
      return acc.concat(Object.values(cur));
    }
    return acc;
  }, [] as GroupedExpression[]);
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
const logicalOperators: LogicalOperator[] = ["and", "or", "not"];
const comparisonOperators: ComparisonOperator[] = [
  "eq",
  "gt",
  "ge",
  "lt",
  "le",
  "ne",
  "in",
  "contains",
  "startsWith",
  "endsWith",
];

export function isLogical(op: string): op is LogicalOperator {
  return (logicalOperators as string[]).includes(op);
}
export function isComparison(op: string): op is ComparisonOperator {
  return (comparisonOperators as string[]).includes(op);
}

export function isOperator(op: string): op is Operator {
  return isLogical(op) || isComparison(op);
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

export function stringify(
  groupedValues: Array<GroupedExpression>,
  options: { operator?: LogicalOperator; subOperator?: LogicalOperator } = {}
): string {
  const ungrouped = ungroupValues(groupedValues, options.subOperator || "or");
  const joined = joinTree(ungrouped, options.operator || "and");
  return serialize(joined);
}

export function serialize(expression: Expression): string {
  const subject =
    typeof expression.subject === "string"
      ? expression.subject
      : cleanSerialize(expression.subject);

  if (!expression.value && expression.operator !== "not") {
    throw new Error("Invalid expression value");
  }

  if (Array.isArray(expression.value)) {
    return `${subject} ${expression.operator} [${expression.value
      .map((v) => (typeof v === "string" ? `'${v}'` : v))
      .join(", ")}]`;
  }

  if (expression.operator === "not") {
    return `not ${serialize(expression.subject as Expression)}`;
  }

  if (typeof expression.value === "string") {
    return `${subject} ${expression.operator} '${expression.value}'`;
  }

  if (typeof expression.value === "number") {
    return `${subject} ${expression.operator} ${expression.value}`;
  }

  if (typeof expression.value === "boolean") {
    return `${subject} ${expression.operator} ${expression.value}`;
  }

  if (expression.value instanceof Date) {
    return `${subject} ${
      expression.operator
    } '${expression.value.toISOString()}'`;
  }

  return `${subject} ${expression.operator} ${
    expression.value ? cleanSerialize(expression.value) : ""
  }`;

  function cleanSerialize(expression: Expression): string {
    return isLogical(expression.operator)
      ? `(${serialize(expression)})`
      : serialize(expression);
  }
}

export function splitTree(
  expression: Expression | null,
  operator: LogicalOperator
): Expression[] {
  if (!expression) return [];
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
