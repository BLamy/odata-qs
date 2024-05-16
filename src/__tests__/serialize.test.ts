import { describe, test, expect } from "vitest"
import { deserialize, serialize } from "../index.js"

describe("parses examples", () => {
  test.each([
    `Name eq 'Jacob' and Age eq 30`,
    `Name eq 'Jacob' or Name eq 'John'`,
    `Name eq 'Jacob' and (Age eq 30 or Age eq 40)`,
    `Name eq 'Jacob' and ((Age eq 30 or Age eq 40) and (Name eq 'John' or Name eq 'Jacob'))`,
    `(Name eq 'Jacob' and Age eq 30) or ((Age eq 40 and Name eq 'John') or Name eq 'Jacob')`,
    `not Name eq 'Jacob'`,
    `Name startsWith 'Jac'`,
    `Name endsWith 'ob'`,
    `Name contains 'aco'`,
    `title eq '1:1 Meeting between Alex Johnson and Pat Lee'`,
    `title eq '1:1 Meeting between Alex Johnson or Pat Lee'`,
    `title eq '1:1 Meeting between Alex Johnson contains Pat Lee'`,
    `title startsWith '1:1 Meeting'`,
    `title endsWith 'Meeting'`,
    `title contains '1:1'`,
  ])("%s", (test) => {
    expect(serialize(deserialize(test)!)).toEqual(test)
  })
})
