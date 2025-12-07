import { describe, expect, it } from "vitest"
import {
  generateUsername,
  isValidUsername,
  turkishToAscii,
} from "./usernameGenerator"

describe("turkishToAscii", () => {
  it("should convert lowercase Turkish characters", () => {
    expect(turkishToAscii("ığüşöç")).toBe("igusoc")
  })

  it("should convert uppercase Turkish characters", () => {
    expect(turkishToAscii("İĞÜŞÖÇ")).toBe("IGUSOC")
  })

  it("should preserve non-Turkish characters", () => {
    expect(turkishToAscii("Hello World")).toBe("Hello World")
  })

  it("should handle mixed content", () => {
    expect(turkishToAscii("Türkçe Text")).toBe("Turkce Text")
  })

  it("should handle empty string", () => {
    expect(turkishToAscii("")).toBe("")
  })
})

describe("generateUsername", () => {
  it("should generate username from simple name", () => {
    expect(generateUsername("John Doe")).toBe("john.doe")
  })

  it("should handle Turkish characters", () => {
    expect(generateUsername("Ahmet Yılmaz")).toBe("ahmet.yilmaz")
    expect(generateUsername("Ömer Faruk Şahin")).toBe("omer.faruk.sahin")
    expect(generateUsername("İbrahim Çelik")).toBe("ibrahim.celik")
  })

  it("should handle uppercase I with dot (İ)", () => {
    expect(generateUsername("İsmail")).toBe("ismail")
  })

  it("should handle lowercase i without dot (ı)", () => {
    expect(generateUsername("Işık")).toBe("isik")
  })

  it("should convert to lowercase", () => {
    expect(generateUsername("JOHN DOE")).toBe("john.doe")
  })

  it("should replace spaces with dots", () => {
    expect(generateUsername("John Michael Doe")).toBe("john.michael.doe")
  })

  it("should handle multiple spaces", () => {
    expect(generateUsername("John    Doe")).toBe("john.doe")
  })

  it("should remove special characters", () => {
    expect(generateUsername("John O'Brien")).toBe("john.obrien")
    expect(generateUsername("John-Doe")).toBe("johndoe")
  })

  it("should handle leading/trailing spaces", () => {
    expect(generateUsername("  John Doe  ")).toBe("john.doe")
  })

  it("should handle empty string", () => {
    expect(generateUsername("")).toBe("")
  })

  it("should handle null/undefined gracefully", () => {
    expect(generateUsername(null as unknown as string)).toBe("")
    expect(generateUsername(undefined as unknown as string)).toBe("")
  })

  it("should handle single name", () => {
    expect(generateUsername("John")).toBe("john")
  })

  it("should handle numbers in name", () => {
    expect(generateUsername("John Doe 3rd")).toBe("john.doe.3rd")
  })

  it("should handle complex Turkish names", () => {
    expect(generateUsername("Güneş Öztürk")).toBe("gunes.ozturk")
    expect(generateUsername("Müşerref Şentürk")).toBe("muserref.senturk")
  })
})

describe("isValidUsername", () => {
  it("should accept valid usernames", () => {
    expect(isValidUsername("john.doe")).toBe(true)
    expect(isValidUsername("john_doe")).toBe(true)
    expect(isValidUsername("john123")).toBe(true)
    expect(isValidUsername("john.doe.smith")).toBe(true)
  })

  it("should reject short usernames", () => {
    expect(isValidUsername("ab")).toBe(false)
    expect(isValidUsername("")).toBe(false)
  })

  it("should reject uppercase characters", () => {
    expect(isValidUsername("John.doe")).toBe(false)
  })

  it("should reject special characters", () => {
    expect(isValidUsername("john@doe")).toBe(false)
    expect(isValidUsername("john-doe")).toBe(false)
    expect(isValidUsername("john'doe")).toBe(false)
  })

  it("should reject consecutive dots", () => {
    expect(isValidUsername("john..doe")).toBe(false)
  })

  it("should reject leading/trailing dots", () => {
    expect(isValidUsername(".john.doe")).toBe(false)
    expect(isValidUsername("john.doe.")).toBe(false)
  })

  it("should accept minimum length username", () => {
    expect(isValidUsername("abc")).toBe(true)
  })
})
