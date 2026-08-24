import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PointsBadge } from "@greenback/ui";

describe("PointsBadge", () => {
  it("renders a formatted point total", () => {
    render(<PointsBadge points={1250} />);
    expect(screen.getByText("1,250 pts")).toBeInTheDocument();
  });
});
