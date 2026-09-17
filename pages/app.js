document.documentElement.classList.add("has-js");

const sections = [...document.querySelectorAll("[data-section]")];
const navigation = [...document.querySelectorAll("nav a")];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (reducedMotion || !("IntersectionObserver" in window)) {
  sections.forEach((section) => section.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => entries.forEach((entry) => entry.target.classList.toggle("is-visible", entry.isIntersecting)),
    { threshold: 0.24, rootMargin: "-8% 0px -8% 0px" },
  );
  sections.forEach((section) => {
    section.classList.add("is-pending");
    revealObserver.observe(section);
  });

  const visibility = new Map();
  const navigationObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => visibility.set(entry.target.id, entry));
      const active = [...visibility.values()]
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (!active) return;
      navigation.forEach((link) => {
        const current = link.hash === `#${active.target.id}`;
        link.classList.toggle("is-active", current);
        if (current) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    },
    { threshold: [0.25, 0.5, 0.75] },
  );
  sections.forEach((section) => navigationObserver.observe(section));
}

const avatar = document.querySelector(".hero-visual img");
avatar?.addEventListener("error", () => avatar.closest(".hero-visual")?.classList.add("avatar-load-failed"));
