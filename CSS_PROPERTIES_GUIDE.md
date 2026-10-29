# CSS Properties Guide - Detailed Explanations

## Display Property
`display` defines how an element is rendered in the layout.

- **`display: flex`** — Creates a flexible container that arranges children in a row (or column)
  - Example: `display: flex` + `flex-direction: column` = vertical stack
  - Used for: headers, navigation, forms, responsive layouts

- **`display: grid`** — Creates a 2D grid layout system
  - Example: `grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))` = responsive card grid
  - Used for: card layouts, dashboards, complex multi-column designs

- **`display: block`** — Element takes full width, starts on new line
  - Default for: `<div>`, `<p>`, `<h1>`, etc.

## Flexbox Properties

### Flex Container Properties
These properties go on the **parent** container (with `display: flex`):

- **`flex-direction`** — Controls the direction of flex items
  - `row` (default) = horizontal layout
  - `column` = vertical stacking
  - Example: `flex-direction: column` stacks header, main, footer vertically

- **`justify-content`** — Aligns items along the **main axis** (left-right if row, up-down if column)
  - `flex-start` — Items at the beginning
  - `flex-end` — Items at the end
  - `center` — Items centered
  - `space-between` — Space distributed between items
  - `space-around` — Space around each item
  - Example: `justify-content: flex-start` pushes nav to left; `justify-content: center` centers nav

- **`align-items`** — Aligns items along the **cross axis** (perpendicular to main axis)
  - `center` — Centers items vertically (if row layout)
  - `flex-start` — Items at top
  - `flex-end` — Items at bottom
  - `stretch` — Items stretch to fill height
  - Example: `align-items: center` vertically centers logo and nav in header

- **`gap`** — Space between flex items
  - Example: `gap: 1rem` = 16px space between header items

- **`flex-wrap`** — Controls whether items wrap to next line
  - `wrap` — Items wrap when too narrow
  - `nowrap` (default) — Items stay in single line, may shrink
  - Example: Navigation links wrap to next line on small screens

### Flex Item Properties
These properties go on the **child** elements:

- **`flex: 1`** — Item grows to fill available space equally with other flex: 1 items
  - Example: `flex: 1` on `<main>` makes it grow to fill space between header and footer
  - Shorthand for: `flex-grow: 1; flex-shrink: 1; flex-basis: 0`

- **`margin-left: auto`** — Pushes element to the right (used with flex)
  - Example: `nav { margin-left: auto }` pushes navigation to right side of header

## Grid Properties

### Grid Container Properties
These go on the **parent** with `display: grid`:

- **`grid-template-columns`** — Defines column layout
  - `1fr` = one column taking equal space
  - `repeat(3, 1fr)` = 3 equal columns
  - `repeat(auto-fit, minmax(260px, 1fr))` = responsive: minimum 260px, expands to fill space
  - Example: `repeat(auto-fit, minmax(260px, 1fr))` creates card grid: 1 column on mobile, 2-3 on desktop

- **`gap`** — Space between grid items
  - Same as flexbox, defines space between rows and columns

## Positioning & Sizing

- **`position: sticky`** — Element stays at top when scrolling within its container
  - Example: Header stays visible at top when you scroll down page
  - Requires `top: 0` to set distance from top

- **`position: absolute`** — Element positioned relative to nearest positioned ancestor
  - Example: Skip link hidden off-screen with `left: -9999px`

- **`z-index: 10`** — Controls layering (higher = on top)
  - Sticky header needs `z-index: 10` to stay above content

## Box Model Properties

- **`box-sizing: border-box`** — Includes padding & border in width/height calculations
  - Without this: `width: 100%` + `padding: 10px` = wider than parent
  - With this: `width: 100%` includes the padding, stays within parent

- **`max-width`** — Maximum width of element
  - Example: `max-width: 1100px` prevents content from becoming too wide on large screens
  - Example: `max-width: 65ch` limits paragraphs to 65 characters (optimal reading length)

- **`margin: auto`** — Centers element
  - Example: `margin: auto` centers block element horizontally
  - Example: `margin-inline: auto` centers horizontally (more modern)

- **`padding`** — Internal space (inside border)
- **`margin`** — External space (outside border)
- **`border-radius`** — Rounded corners

## Typography Properties

- **`line-height: 1.6`** — Vertical spacing between lines
  - 1.6 = 1.6x the font size
  - Higher = more readable but takes more space

- **`max-width: 65ch`** — Limits line width to 65 characters
  - `ch` = character unit
  - Optimal for readability (not too long lines)

## Effects & Visual Properties

- **`box-shadow: 0 4px 8px rgba(...)`** — Adds shadow effect
  - `0 4px 8px` = x-offset, y-offset, blur-radius
  - Used for depth and card styling

- **`text-shadow`** — Shadow behind text (for readability over images)

- **`transform: translateY(-2px)`** — Moves element on hover
  - Example: Button lifts up when hovering

- **`transition: background-color 0.3s`** — Smooth animation between states
  - Example: Color smoothly changes over 0.3 seconds on hover

## Common Layout Patterns

### Centering Content
```css
/* Horizontal centering (block element) */
max-width: 1100px;
margin-inline: auto;

/* Centering in flex container */
display: flex;
justify-content: center;
align-items: center;
```

### Responsive Cards
```css
.card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem;
}
/* Result: 1 column on mobile, 2+ on desktop, auto-adjusts */
```

### Sticky Header
```css
header {
    position: sticky;
    top: 0;
    z-index: 10;
}
/* Stays at top when scrolling */
```

### Vertical Stack Layout
```css
body {
    display: flex;
    flex-direction: column;
    height: 100%;
}
main {
    flex: 1;  /* Takes all available space */
}
/* Pushes footer to bottom */
```
