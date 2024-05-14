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
  operator: ComparisonOperator;
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

  return parseFragment(input);

  function parseFragment(input: string): Expression {
    const matchSub = input.match(/^Sub_(\d+)$/);
    if (matchSub) {
      const matchingSub = substitutions.get(input);
      if (!matchingSub) {
        throw new Error("Symbol not found");
      }

      return matchingSub;
    }

    if (input.includes("(")) {
      let filter = input;
      while (filter.includes("(")) {
        let i = 0;
        let leftParenIndex = 0;
        let isInsideQuotes = false;

        for (i = 0; i <= filter.length; i++) {
          if (i === filter.length) {
            throw new Error("Unmatched parens");
          }

          const cursor = filter[i];
          if (cursor === "'") {
            isInsideQuotes = !isInsideQuotes;
            continue;
          }

          if (isInsideQuotes) {
            continue;
          }

          if (cursor === "(") {
            leftParenIndex = i;
            continue;
          }

          if (cursor === ")") {
            const filterSubstring = filter.substring(leftParenIndex + 1, i);
            const key = `Sub_${substitutions.size}`;
            substitutions.set(key, parseFragment(filterSubstring));
            filter = [
              filter.substring(0, leftParenIndex),
              key.toString(),
              filter.substring(i + 1),
            ].join("");
            break;
          }
        }
      }

      return parseFragment(filter);
    }

    const matchAnd = input.match(/^(?<left>.*?) and (?<right>.*)$/);
    if (matchAnd && matchAnd.groups) {
      const groups = matchAnd.groups;

      return {
        subject: parseFragment(groups.left),
        operator: "and",
        value: parseFragment(groups.right),
      };
    }

    const matchOr = input.match(/^(?<left>.*?) or (?<right>.*)$/);
    if (matchOr && matchOr.groups) {
      const groups = matchOr.groups;

      return {
        subject: parseFragment(groups.left),
        operator: "or",
        value: parseFragment(groups.right),
      };
    }

    const matchNot = input.match(/^not (?<expression>.*)$/);
    if (matchNot && matchNot.groups) {
      const groups = matchNot.groups;

      return {
        subject: parseFragment(groups.expression),
        operator: "not",
        value: null,
      };
    }

    const matchOp = input.match(
      /(?<subject>\w*) (?<operator>eq|gt|lt|ge|le|ne|contains|startsWith|endsWith|in) (?<value>datetimeoffset'(.*)'|\[(.*)\]|'(.*)'|[0-9]*)/
    );
    if (matchOp && matchOp.groups) {
      const groups = matchOp.groups;
      const operator = groups.operator;
      if (!isComparison(operator)) {
        throw new Error(`Invalid operator: ${operator}`);
      }

      if (operator === "in") {
        const values = groups.value
          .slice(1, -1)
          .split(", ")
          .map(deserializeValue);
        // console.log(values)
        return {
          subject: groups.subject,
          operator: operator,
          value: values,
        };
      }

      return {
        subject: groups.subject,
        operator: operator,
        value: deserializeValue(groups.value),
      };
    }

    throw new Error(`Invalid filter string: ${input}`);
  }
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
          operator: (expression.subject as Expression).operator as ComparisonOperator,
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
        acc[subject] = {} as Partial<Record<ComparisonOperator, GroupedExpression>>;
      }

      const operatorGroup = acc?.[subject]?.[cur.operator] ?? {
        subject: subject,
        operator: cur.operator,
        values: [],
      }

      operatorGroup.values = Array.from(
        new Set(operatorGroup.values.concat(cur.values as (string | number | boolean | Date | null)[]))
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

  return `${subject} ${expression.operator} ${expression.value ? cleanSerialize(expression.value) : ''}`;

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
