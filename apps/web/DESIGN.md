# Design guide — Hotel Villa Mestia

Follow this for all UI work in apps/web.

## Brand & mood

- Small family hotel in Mestia, Svaneti (Georgian mountains).
- Mood: warm, calm, premium but not luxury-cold. Mountains, stone, wood, snow, fireplace.
- Feels local and authentic, not like a generic hotel template.
- Goal of the site: get bookings. Every page should make "Book" easy to find.

## Audience

- International tourists and Georgian guests, mostly on mobile, often on slow mobile internet.
- Mobile-first. Design for 375px width first, then scale up.

## Colors (define as CSS variables / Tailwind theme tokens, never hardcode hex in components)

- background (snow): #F7F5F0
- surface (sand): #EDE6DA
- foreground (stone ink): #24221F
- muted text (slate): #5E6670
- primary (pine): #2F4A3A — main buttons, links
- accent (ember / copper): #C2652A — highlights, prices, small details only
- glacier: #A9C4D3 — subtle backgrounds, decorative
- border: #D9D1C3
- Dark mode: deep stone background #161513, snow text, same accents slightly brighter.
- Text contrast must pass WCAG AA.

## Typography

- Fonts MUST support Georgian, Latin and Cyrillic scripts. Verify glyph coverage before choosing.
  Candidates: Noto Serif Georgian / Noto Sans Georgian (with matching Noto Latin), FiraGO.
- Headings: a serif with character. Body: a clean, highly readable sans.
- Load fonts with next/font. Fluid type sizes (clamp). Generous line-height for Georgian text.

## Layout

- Lots of whitespace, large photography, clear hierarchy.
- Max content width ~1200px. 8px spacing scale.
- Rounded corners: medium (12–16px) on cards, full on pills/buttons.
- On mobile: a sticky bottom "Book" button on all public pages except the booking flow.

## Components

- Base: shadcn/ui, restyled with the tokens above (not default shadcn look).
- Prices: always show currency as "120 ₾". API returns tetri; format on the frontend.
- Room cards: photo, name, beds, max guests, price per night, "Book" button.

## Imagery

- Real photos of the hotel, rooms, views, breakfast. Use next/image, AVIF/WebP, proper sizes.
- Never use stock photos of other hotels. Use placeholders until real photos exist.

## Motion

- Library: Motion (motion/react).
- Purpose over decoration. Motion should guide attention, never block it.
- UI feedback: 150–250ms. Section reveals on scroll: 500–800ms, subtle (fade + small translate).
- Smooth page transitions. Small hover/press micro-interactions on buttons and cards.
- Always respect prefers-reduced-motion (disable non-essential motion).
- Never animate layout in a way that shifts content (no CLS).

## 3D

- Only in the home page hero. Nowhere else, never in the booking flow.
- React Three Fiber, loaded with next/dynamic (ssr: false) after the page is interactive.
- Show a static hero photo first; replace with 3D only on capable devices.
  Fallback to the photo on low-end devices, slow connections, and prefers-reduced-motion.
- Pause rendering when off-screen. Keep extra JS for 3D as small as possible.

## Performance

- Target Lighthouse ≥ 90 on mobile. LCP < 2.5s on 4G.
- Prefer Server Components. Client components only where interaction is needed.

## Accessibility

- Keyboard navigable, visible focus states, labels on all form fields,
  alt text on all images, touch targets ≥ 44px.

## Avoid

- Generic "AI website" look: purple/blue gradients, glassmorphism everywhere,
  neon glows, emoji in headings, identical card grids with no hierarchy.
- Carousels that auto-play. Popups on page load.
