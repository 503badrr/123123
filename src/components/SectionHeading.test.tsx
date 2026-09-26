import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionHeading } from "./SectionHeading";

describe("SectionHeading", () => {
  it("connects the section header to its Arabic heading and description", () => {
    render(
      <SectionHeading
        eyebrow="اختيارات مميزة"
        title="الأكثر طلبًا"
        description="منتجات رقمية مختارة بعناية"
      />,
    );

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "الأكثر طلبًا",
    });
    const region = heading.closest("header");

    expect(screen.getByText("اختيارات مميزة")).toBeInTheDocument();
    expect(screen.getByText("منتجات رقمية مختارة بعناية")).toBeInTheDocument();
    expect(region).toHaveAttribute("aria-labelledby", heading.id);
  });

  it("can render the primary page heading as h1", () => {
    render(<SectionHeading as="h1" title="الكتالوج" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "الكتالوج" }),
    ).toBeInTheDocument();
  });

  it("keeps an optional action keyboard accessible", () => {
    render(
      <SectionHeading
        title="العروض"
        action={<a href="/offers">عرض كل العروض</a>}
      />,
    );

    expect(
      screen.getByRole("link", { name: "عرض كل العروض" }),
    ).toHaveAttribute("href", "/offers");
  });
});
