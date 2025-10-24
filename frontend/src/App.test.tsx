import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders admin dashboard page", () => {
    render(<App />);
    expect(screen.getByText(/Admin Dashboard/i)).toBeInTheDocument();
  });

  it("displays quick actions section", () => {
    render(<App />);
    expect(screen.getByText(/Quick Actions/i)).toBeInTheDocument();
  });

  it("displays manage publishers link", () => {
    render(<App />);
    expect(screen.getByText(/Manage Publishers/i)).toBeInTheDocument();
  });
});
