## Animation Architecture

React Architect uses two animation systems.

### CSS

CSS is reserved for passive visual effects.

Examples:

* Ambient glow
* Floating elements
* Infinite loops
* Decorative animations
* Loading spinners

### GSAP

GSAP is the primary animation engine.

It is responsible for:

* Hero animations
* Scene transitions
* Camera movement
* Workspace navigation
* Interactive storytelling
* User interactions
* Timeline orchestration

React components should remain focused on rendering. Animation logic should live inside the `animations/` directory whenever possible.

Never animate the same element using both CSS and GSAP.
