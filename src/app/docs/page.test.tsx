import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import Documentation from "./page";
it("provides documentation navigation, command reference, and export guidance", () => {
 const {container} = render(<Documentation />);
 expect(screen.getByRole("heading", {level:1,name:"Koi charts documentation"})).toBeVisible();
 for(const link of screen.getByRole("navigation", {name:"Documentation sections"}).querySelectorAll("a")) {
  expect(container.querySelector(link.getAttribute("href")!)).not.toBeNull();
 }
 expect(screen.getByRole("heading",{name:"Exporting charts"})).toBeVisible();
});
