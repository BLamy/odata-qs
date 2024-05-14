import { describe, test, expect } from "vitest"
import { Expression, joinTree } from "../"

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

  // test(`Name in ['Jacob', 'John']`, () => {
  //   const split: Array<Expression> = [
  //     {
  //       subject: "Name",
  //       operator: "in",
  //       value: ["Jacob", "John"],
  //     },
  //   ];

  //   expect(joinTree(split, "and")).toEqual({
  //     subject: "Name",
  //     operator: "in",
  //     value: ["Jacob", "John"],
  //   });
  // });
})
