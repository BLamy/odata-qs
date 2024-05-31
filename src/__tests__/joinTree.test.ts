import { describe, test, expect } from "vitest"
import { Expression, joinTree } from ".."

describe("parses examples", () => {
  test(`Name eq 'Jacob'`, () => {
    const split: Array<Expression> = [
      {
        subject: "Name",
        operator: "eq",
        value: "Jacob",
      },
    ]

    expect(joinTree(split, "and")).toEqual({
      subject: "Name",
      operator: "eq",
      value: "Jacob",
    })
  })

  test(`Name eq 'Jacob' and Age eq 30`, () => {
    const split: Array<Expression> = [
      {
        subject: "Name",
        operator: "eq",
        value: "Jacob",
      },
      {
        subject: "Age",
        operator: "eq",
        value: 30,
      },
    ]

    expect(joinTree(split, "and")).toEqual({
      subject: {
        subject: "Name",
        operator: "eq",
        value: "Jacob",
      },
      operator: "and",
      value: {
        subject: "Age",
        operator: "eq",
        value: 30,
      },
    })
  })

  test(`Name eq 'Jacob' or Name eq 'John'`, () => {
    const split: Array<Expression> = [
      {
        subject: "Name",
        operator: "eq",
        value: "Jacob",
      },
      {
        subject: "Name",
        operator: "eq",
        value: "John",
      },
    ]

    expect(joinTree(split, "or")).toEqual({
      subject: {
        subject: "Name",
        operator: "eq",
        value: "Jacob",
      },
      operator: "or",
      value: {
        subject: "Name",
        operator: "eq",
        value: "John",
      },
    })
  })

  test(`Items any ['value']`, () => {
    const split: Array<Expression> = [
      {
        subject: "Items",
        operator: "any",
        value: ["value"],
      },
    ]
  
    expect(joinTree(split, "and")).toEqual({
      subject: "Items",
      operator: "any",
      value: ["value"],
    })
  })

  test(`Name eq 'Jacob' and (Age eq 30 or Age eq 40)`, () => {
    const split: Array<Expression> = [
      {
        subject: "Name",
        operator: "eq",
        value: "Jacob",
      },
      {
        subject: {
          subject: "Age",
          operator: "eq",
          value: 30,
        },
        operator: "or",
        value: {
          subject: "Age",
          operator: "eq",
          value: 40,
        },
      },
    ]

    expect(joinTree(split, "and")).toEqual({
      subject: {
        subject: "Name",
        operator: "eq",
        value: "Jacob",
      },
      operator: "and",
      value: {
        subject: {
          subject: "Age",
          operator: "eq",
          value: 30,
        },
        operator: "or",
        value: {
          subject: "Age",
          operator: "eq",
          value: 40,
        },
      },
    })
  })

  test(`not (Name eq 'Jacob')`, () => {
    const split: Array<Expression> = [
      {
        subject: {
          subject: "Name",
          operator: "eq",
          value: "Jacob",
        },
        operator: "not",
        value: null,
      },
    ]

    expect(joinTree(split, "and")).toEqual({
      subject: {
        subject: "Name",
        operator: "eq",
        value: "Jacob",
      },
      operator: "not",
      value: null,
    })
  })

  test(`Name startsWith 'Jac'`, () => {
    const split: Array<Expression> = [
      {
        subject: "Name",
        operator: "startsWith",
        value: "Jac",
      },
    ]

    expect(joinTree(split, "and")).toEqual({
      subject: "Name",
      operator: "startsWith",
      value: "Jac",
    })
  })

  test(`Name endsWith 'ob'`, () => {
    const split: Array<Expression> = [
      {
        subject: "Name",
        operator: "endsWith",
        value: "ob",
      },
    ]

    expect(joinTree(split, "and")).toEqual({
      subject: "Name",
      operator: "endsWith",
      value: "ob",
    })
  })

  test(`Name contains 'aco'`, () => {
    const split: Array<Expression> = [
      {
        subject: "Name",
        operator: "contains",
        value: "aco",
      },
    ]

    expect(joinTree(split, "and")).toEqual({
      subject: "Name",
      operator: "contains",
      value: "aco",
    })
  })

  test(`Name in ['Jacob', 'John']`, () => {
    const split: Array<Expression> = [
      {
        subject: "Name",
        operator: "in",
        value: ["Jacob", "John"],
      },
    ]

    expect(joinTree(split, "and")).toEqual({
      subject: "Name",
      operator: "in",
      value: ["Jacob", "John"],
    })
  })

  test(`Age lt 30`, () => {
    const split: Array<Expression> = [
      {
        subject: "Age",
        operator: "lt",
        value: 30,
      },
    ]

    expect(joinTree(split, "and")).toEqual({
      subject: "Age",
      operator: "lt",
      value: 30,
    })
  })

  test(`Age lte 30`, () => {
    const split: Array<Expression> = [
      {
        subject: "Age",
        operator: "lte",
        value: 30,
      },
    ]

    expect(joinTree(split, "and")).toEqual({
      subject: "Age",
      operator: "lte",
      value: 30,
    })
  })

  test(`Age gt 30`, () => {
    const split: Array<Expression> = [
      {
        subject: "Age",
        operator: "gt",
        value: 30,
      },
    ]
  
    expect(joinTree(split, "and")).toEqual({
      subject: "Age",
      operator: "gt",
      value: 30,
    })
  })
  
  test(`Age gte 30`, () => {
    const split: Array<Expression> = [
      {
        subject: "Age",
        operator: "gte",
        value: 30,
      },
    ]
  
    expect(joinTree(split, "and")).toEqual({
      subject: "Age",
      operator: "gte",
      value: 30,
    })
  })
  
  test(`Name matches '^Jac'`, () => {
    const split: Array<Expression> = [
      {
        subject: "Name",
        operator: "matches",
        value: "^Jac",
      },
    ]
  
    expect(joinTree(split, "and")).toEqual({
      subject: "Name",
      operator: "matches",
      value: "^Jac",
    })
  })
  
  test(`Name includes 'John'`, () => {
    const split: Array<Expression> = [
      {
        subject: "Name",
        operator: "includes",
        value: "John",
      },
    ]
  
    expect(joinTree(split, "and")).toEqual({
      subject: "Name",
      operator: "includes",
      value: "John",
    })
  })
  
  test(`Name in ['Jacob', 'John']`, () => {
    const split: Array<Expression> = [
      {
        subject: "Name",
        operator: "in",
        value: ["Jacob", "John"],
      },
    ]
  
    expect(joinTree(split, "and")).toEqual({
      subject: "Name",
      operator: "in",
      value: ["Jacob", "John"],
    })
  })       
})       

  