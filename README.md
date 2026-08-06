# StockPilot (eVentory)

Frontend for eVentory — inventory and sales management for African SMEs.

## Using the shared dashboard layout

Every authenticated app page should reuse the **dashboard shell** (sidebar + top bar + page frame). You only write the page’s own content; `dashboard-layout.js` wraps it automatically.

### Required files

| File | Purpose |
|------|---------|
| `dashboard-layout.css` | Shared shell styles (sidebar, topbar, buttons, panels) |
| `dashboard-layout.js` | Builds sidebar + topbar around your page |
| `api.js` | API client (attaches Bearer token on protected routes) |
| Your page CSS/JS | Page-specific styles and behavior only |

### Page template

Create a new HTML file (for example `orders.html`) like this:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Orders — eVentory</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="dashboard-layout.css" />
    <link rel="stylesheet" href="orders.css" />
  </head>
  <body>
    <div
      id="page"
      data-page="orders"
      data-title="Orders"
      data-subtitle="Track and manage customer orders."
    >
      <!-- Optional header buttons -->
      <template data-page-actions>
        <button type="button" class="btn btn-ghost">Export</button>
        <button type="button" class="btn btn-primary">+ New Order</button>
      </template>

      <!-- Your page content goes here -->
      <section class="panel">
        <h2>Orders list</h2>
      </section>
    </div>

    <script src="api.js"></script>
    <script src="dashboard-layout.js"></script>
    <script src="orders.js"></script>
  </body>
</html>
```

### `#page` attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `id="page"` | Yes | Layout script looks for this root |
| `data-page` | Yes | Nav item id to mark active in the sidebar |
| `data-title` | Yes | Main page heading |
| `data-subtitle` | No | Smaller text under the title |

### Optional page actions

Put header buttons inside a `<template data-page-actions>` as the **first child** of `#page`. The layout moves them into the top-right of the page header.

```html
<template data-page-actions>
  <button type="button" class="btn btn-primary">+ Add Product</button>
</template>
```

### Sidebar nav ids

Set `data-page` to one of these ids so the correct sidebar link is highlighted:

| `data-page` | Label | HTML file |
|-------------|-------|-----------|
| `overview` | Overview | `dashboard.html` |
| `supplier` | Supplier Page | `supplier.html` |
| `product` | Product | `product.html` |
| `inventory` | Inventory | `inventory.html` |
| `orders` | Orders | `orders.html` |
| `report` | Report | `report.html` |
| `account` | Account | `account.html` |
| `settings` | Settings | `settings.html` |

To add a new nav item, edit `NAV_SECTIONS` in `dashboard-layout.js` and point `href` at your new page.

### Shared UI helpers

Use classes from `dashboard-layout.css` so pages look consistent:

- **Layout:** `.panel`
- **Buttons:** `.btn`, `.btn-primary`, `.btn-ghost`, `.pill-btn`
- **Tiles / badges:** `.tile`, `.tile-green`, `.tile-amber`, `.tile-rose`, `.tile-teal`, `.tile-purple`, `.badge`, `.badge-green`, `.badge-amber`, `.badge-red`

### JavaScript API (`EvLayout`)

After the shell loads, these helpers are available:

```js
EvLayout.icon("cart", 18);   // SVG icon HTML string
EvLayout.getProfile();       // { name, role, email, store } from localStorage
EvLayout.initials("Nat Doe"); // "ND"
```

### Wait for the shell before rendering

The layout removes `#page` and rebuilds the DOM. Run page logic after `shell:ready`:

```js
function boot() {
  // Safe to query elements that lived inside #page
  loadOrders();
}

document.addEventListener("shell:ready", boot);

if (document.body.classList.contains("shell-ready")) {
  boot();
}
```

### Calling protected APIs

Include `api.js` **before** `dashboard-layout.js`. Auth routes skip the token; everything else sends `Authorization: Bearer <token>`.

```js
// Public (no token)
await EvApi.json("/auth/login", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});

// Protected (token attached automatically)
const summary = await EvApi.json("/dashboard/summary");
```

On `401`, the client clears the session and redirects to `loginPage.html`.

### Working examples

- **Overview:** `dashboard.html` + `dashboard.css` + `dashboard.js`
- **Inventory:** `inventory.html` + `inventory.css` + `inventory.js`

Copy either file as a starting point for a new page, then change `data-page`, `data-title`, and the content inside `#page`.

### Auth note

Dashboard pages expect a login token in `localStorage`. Log in via `loginPage.html` first; without a token, page scripts typically redirect back to login.
