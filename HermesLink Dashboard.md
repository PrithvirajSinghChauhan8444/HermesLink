**HermesLink_Scroll_Based_Navigation_Report**

# HermesLink Dashboard  


## Scroll-Based Navigation Refactor Report

---

## 1. Objective

The goal of this refactor is to replace the current **state-based page swapping navigation** in the HermesLink dashboard with a **scroll-based section navigation system**, while preserving the landing page as the user’s first experience.

This change is motivated by:
- Difficulty maintaining smooth page-to-page transitions
- Animation conflicts caused by component unmounting
- Desire for a continuous, natural user flow

---

## 2. Current Navigation Summary

### Existing Behavior
- Navigation controlled by React state (`activeTab`)
- Pages are conditionally rendered
- Only one page exists in the DOM at a time
- Framer Motion animates page entry/exit
- URL does not change
- Browser back/forward navigation does not work

### Limitations
- Pages are unmounted on navigation
- Animations become fragile as app complexity grows
- Navigation feels like teleportation instead of movement
- Landing page feels disconnected from the rest of the app

---

## 3. Proposed Navigation Model

### Core Concept
**Pages are replaced by vertical sections.**  
All sections are rendered simultaneously and navigation is handled by scrolling instead of state changes.

---

## 4. High-Level Architecture

### From → To

| Aspect | Before | After |
|------|-------|-------|
| Navigation Trigger | React state (`activeTab`) | Scroll position |
| Rendering Strategy | Conditional rendering | All sections mounted |
| Page Lifecycle | Mounted / Unmounted | Persistent |
| Navigation Feel | Discrete jumps | Continuous flow |
| Animations | Page transitions | In-section reveal animations |

---

## 5. Section-Based Layout Design

### Sections
The following views will be converted into vertical sections:

1. Landing
2. Active Jobs
3. Queue Management
4. History
5. Settings
6. About

### Section Rules
- Each section must occupy at least `100vh`
- All sections remain mounted at all times
- No conditional rendering is allowed
- No absolute positioning for stacking pages

---

## 6. Scroll Container Strategy

A **single scroll container** controls the entire dashboard:

```jsx
<div className="scroll-container">
  <LandingSection />
  <ActiveJobsSection />
  <QueueSection />
  <HistorySection />
  <SettingsSection />
  <AboutSection />
</div>
~~~

### Rules

- Only one vertical scroll context
- Scrolling determines navigation state
- Body scrolling may be disabled if needed

------

## 7. Landing Page Behavior

- The landing page is the **first section**
- It is full-screen and visible on initial load
- Scrolling naturally transitions to the dashboard
- No z-index hacks or conditional hiding
- Landing page unmounting is strictly forbidden

------

## 8. Navigation Logic

### Navbar Behavior

- Navbar clicks trigger `scrollIntoView`
- No navigation state variables
- No URL updates
- Scroll position is the single source of truth

### Scroll Sync

- Use Intersection Observer to detect visible sections
- Highlight active navbar items based on scroll
- Breadcrumbs or indicators may be derived from scroll state

------

## 9. Animation Strategy

### Removed

- Page enter/exit animations
- AnimatePresence for routing
- Layout-affecting transitions

### Retained

- Framer Motion animations **inside sections**
- Animations triggered on viewport entry
- Subtle motion that does not disrupt layout

Example:

```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
/>
```

------

## 10. Scroll Experience Enhancements

### Scroll Snapping

Each section snaps cleanly into place:

```css
.scroll-container {
  scroll-snap-type: y mandatory;
}

.section {
  scroll-snap-align: start;
}
```

### Smooth Scrolling

- All programmatic scrolling must be smooth
- No abrupt jumps between sections

------

## 11. Constraints

The following are explicitly disallowed:

- ❌ react-router-based navigation
- ❌ Conditional rendering for pages
- ❌ Absolute positioning for page stacking
- ❌ URL-based routing
- ❌ Page unmounting during navigation

------

## 12. Expected User Experience

- User lands on a full-screen landing section
- Scrolling reveals the dashboard naturally
- Navigation feels continuous and intuitive
- Animations feel stable and intentional
- The dashboard feels like one connected system

------

## 13. Success Criteria

The refactor is considered successful if:

- All sections remain mounted at all times
- Navigation is entirely scroll-driven
- Navbar accurately reflects scroll position
- No animation conflicts occur
- Landing page feels integrated, not isolated

------

## 14. Conclusion

This scroll-based navigation architecture improves:

- UX flow
- Animation stability
- Code maintainability
- Mental model clarity

It aligns better with HermesLink’s observational, dashboard-driven nature and sets a strong foundation for future enhancements.

