import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "./SiteHeader";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    className,
    onClick,
    activeProps: _activeProps,
    params: _params,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    className?: string;
    onClick?: () => void;
    activeProps?: unknown;
    params?: unknown;
    [key: string]: unknown;
  }) => (
    <a href={to} className={className} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../store/cart", () => ({
  useCart: () => ({ count: 2 }),
}));

describe("SiteHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes the primary navigation and cart destinations", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("navigation", { name: "التنقل الرئيسي" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "الكتالوج" })).toHaveAttribute("href", "/catalog");
    expect(screen.getByRole("link", { name: /السلة/ })).toHaveAttribute("href", "/cart");
  });

  it("connects the mobile menu button to the menu it controls", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    const button = screen.getByRole("button", { name: "فتح القائمة" });
    expect(button).toHaveAttribute("aria-controls", "switch-mobile-menu");

    await user.click(button);

    expect(screen.getByRole("navigation", { name: "قائمة الجوال" })).toHaveAttribute(
      "id",
      "switch-mobile-menu",
    );
    expect(button).toHaveAttribute("aria-expanded", "true");
  });
});
