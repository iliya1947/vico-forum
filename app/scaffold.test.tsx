import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./routes/home";

describe("Stage 1A scaffold", () => {
  it("renders the development scaffold", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "Development scaffold" })).toBeInTheDocument();
  });
});
