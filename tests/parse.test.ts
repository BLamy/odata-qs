import { describe, test, expect } from "vitest"
import { parse } from "../"

describe("parses examples", () => {
  test(`Name eq 'Jacob' and Age eq 30`, (test) => {
    const tree = parse(test.task.name)
    expect(tree).toEqual({
      Age: {
        eq: {
          operator: "eq",
          subject: "Age",
          values: [30],
        },
      },
      Name: {
        eq: {
          operator: "eq",
          subject: "Name",
          values: ["Jacob"],
        },
      },
    })
  })

  test(`Name eq 'Jacob' or Name eq 'John'`, (test) => {
    const tree = parse(test.task.name)
    expect(tree).toEqual({
      Name: {
        eq: {
          operator: "eq",
          subject: "Name",
          values: ["Jacob", "John"],
        },
      },
    })
  })

  test(`Name eq 'a' or Name eq 'b' or Name eq 'c' or Name eq 'd'`, (test) => {
    const tree = parse(test.task.name)
    expect(tree).toEqual({
      Name: {
        eq: {
          operator: "eq",
          subject: "Name",
          values: ["a", "b", "c", "d"],
        },
      },
    })
  })

  test(`Name eq 'Jacob' and (Age eq 30 or Age eq 40)`, (test) => {
    const tree = parse(test.task.name)
    expect(tree).toEqual({
      Age: {
        eq: {
          operator: "eq",
          subject: "Age",
          values: [30, 40],
        },
      },
      Name: {
        eq: {
          operator: "eq",
          subject: "Name",
          values: ["Jacob"],
        },
      },
    })
  })

  // test(`Name in ['Jacob', 'John']`, (test) => {
  //   const tree = parse(test.task.name)
  //   expect(tree).toEqual({
  //     Name: {
  //       in: {
  //         operator: "in",
  //         subject: "Name",
  //         values: ["Jacob", "John"],
  //       },
  //     },
  //   })
  // })
})

