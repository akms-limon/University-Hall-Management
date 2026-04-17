import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import BottomTabNav from "@/components/shared/BottomTabNav";
import { USER_ROLES } from "@/lib/constants";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      role: USER_ROLES.STUDENT,
    },
  }),
}));

describe("BottomTabNav", () => {
  it("renders max five quick nav items for mobile", () => {
    render(
      <MemoryRouter initialEntries={["/student/dashboard"]}>
        <BottomTabNav />
      </MemoryRouter>
    );

    const links = screen.getAllByRole("link");
    expect(links.length).toBeLessThanOrEqual(5);
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].className).toContain("min-h-11");
  });
});

