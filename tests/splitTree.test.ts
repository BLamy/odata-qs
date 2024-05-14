import { describe, test, expect } from "vitest"
import { deserialize, splitTree } from "../index.js"

describe("parses examples", () => {
  test(`Name eq 'Jacob'`, (test) => {
    const tree = deserialize(test.task.name)
    expect(splitTree(tree, "and")).toEqual([
      {
        subject: "Name",
        operator: "eq",
        value: "Jacob",
      },
    ])
  })

  test(`Name eq 'Jacob' and Age eq 30`, (test) => {
    const tree = deserialize(test.task.name)
    expect(splitTree(tree, "and")).toEqual([
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
    ])
  })

  test(`Name eq 'Jacob' or Name eq 'John'`, (test) => {
    const tree = deserialize(test.task.name)
    expect(splitTree(tree, "or")).toEqual([
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
    ])
  })

  test(`Name eq 'Jacob' and (Age eq 30 or Age eq 40)`, (test) => {
    const tree = deserialize(test.task.name)
    expect(splitTree(tree, "and")).toEqual([
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
    ])
  })

  test(`Name eq 'a' or Name eq 'b' or Name eq 'c' or Name eq 'd'`, (test) => {
    const tree = deserialize(test.task.name)
    expect(splitTree(tree, "or")).toEqual([
      {
        subject: "Name",
        operator: "eq",
        value: "a",
      },
      {
        subject: "Name",
        operator: "eq",
        value: "b",
      },
      {
        subject: "Name",
        operator: "eq",
        value: "c",
      },
      {
        subject: "Name",
        operator: "eq",
        value: "d",
      },
    ])
  })

  test(`not (Name eq 'Jacob')`, (test) => {
    const tree = deserialize(test.task.name)
    expect(splitTree(tree, "and")).toEqual([
      {
        subject: {
          subject: "Name",
          operator: "eq",
          value: "Jacob",
        },
        operator: "not",
        value: null,
      },
    ])
  })

  test(`Name startsWith 'Jac'`, (test) => {
    const tree = deserialize(test.task.name)
    expect(splitTree(tree, "and")).toEqual([
      {
        subject: "Name",
        operator: "startsWith",
        value: "Jac",
      },
    ])
  })

  test(`Name endsWith 'ob'`, (test) => {
    const tree = deserialize(test.task.name)
    expect(splitTree(tree, "and")).toEqual([
      {
        subject: "Name",
        operator: "endsWith",
        value: "ob",
      },
    ])
  })

  test(`Name contains 'aco'`, (test) => {
    const tree = deserialize(test.task.name)
    expect(splitTree(tree, "and")).toEqual([
      {
        subject: "Name",
        operator: "contains",
        value: "aco",
      },
    ])
  })

  test(`Name in ['Jacob', 'John'] and Age in [30, 40]`, (test) => {
    const tree = deserialize(test.task.name)
    expect(splitTree(tree, "and")).toEqual([
      {
        subject: "Name",
        operator: "in",
        value: ["Jacob", "John"],
      },
      {
        subject: "Age",
        operator: "in",
        value: [30, 40],
      },
    ])
  })
})

