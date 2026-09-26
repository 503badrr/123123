import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminLayout } from "./AdminLayout";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  Outlet: () => <div>محتوى الإدارة</div>,
  useRouterState: () => "/admin/owner",
}));

describe("AdminLayout", () => {
  it("exposes every primary administration destination", () => {
    render(<AdminLayout />);

    expect(screen.getByRole("navigation", { name: "تنقل الإدارة" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /لوحة المالك/ })[0]).toHaveAttribute(
      "href",
      "/admin/owner",
    );
    expect(screen.getAllByRole("link", { name: /التحليلات/ })[0]).toHaveAttribute(
      "href",
      "/admin/analytics",
    );
    expect(screen.getAllByRole("link", { name: /الأكواد الرقمية/ })[0]).toHaveAttribute(
      "href",
      "/admin/codes",
    );
    expect(screen.getAllByRole("link", { name: /الربط والتوريد/ })[0]).toHaveAttribute(
      "href",
      "/admin/integrations",
    );
  });

  it("renders the administration content region", () => {
    render(<AdminLayout />);
    expect(screen.getByRole("main")).toHaveTextContent("محتوى الإدارة");
  });
});
