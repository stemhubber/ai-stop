import { fireEvent, render, screen } from "@testing-library/react";
import WebsitePreview from "./WebsitePreview";

const project = {
  name: "Moya Kitchen",
  theme: {
    primary: "#176b5d",
    background: "#f3f7f5",
    surface: "#ffffff",
    text: "#15211e",
    muted: "#687a75",
    radius: "soft",
    font: "modern",
    template: "storefront",
  },
  settings: { businessType: "Restaurant" },
  pages: [{
    id: "home",
    title: "Home",
    sections: [{
      id: "hero",
      type: "hero",
      visibility: true,
      content: {
        eyebrow: "Restaurant",
        heading: "Fresh lunch",
        body: "Made daily.",
      },
    }, {
      id: "contact",
      type: "contact",
      visibility: true,
      content: {
        eyebrow: "Contact",
        heading: "Get in touch",
        body: "Send a message.",
        primaryAction: "Contact us",
      },
    }],
  }],
};

test("connects public menu and contact actions", () => {
  const onNavigate = jest.fn();
  const onChooseProduct = jest.fn();
  const product = { id: "meal-1", name: "Lunch box", price: 12500 };

  render(
    <WebsitePreview
      project={project}
      page={project.pages[0]}
      products={[product]}
      onNavigate={onNavigate}
      onChooseProduct={onChooseProduct}
      interactive={false}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "View menu" }));
  expect(onNavigate).toHaveBeenCalledWith("products");

  fireEvent.click(screen.getByRole("button", { name: "Place order" }));
  expect(onChooseProduct).toHaveBeenCalledWith(product);

  fireEvent.click(screen.getAllByRole("button", { name: "Get in touch" })[0]);
  expect(onNavigate).toHaveBeenCalledWith("contact");
});
