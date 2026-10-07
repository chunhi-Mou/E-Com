import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

let ready: (() => void) | null = null;

/** Called by the product page once its gallery image is in the DOM, so the view transition can finish. */
export function signalViewReady() {
  ready?.();
  ready = null;
}

type VTDoc = Document & { startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<void> } };

/** Card image to gallery image as a shared element (View Transitions API), plain push elsewhere. */
export function goWithImage(router: AppRouterInstance, href: string, el: HTMLElement | null) {
  const doc = document as VTDoc;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduced || !el) {
    router.push(href);
    return;
  }
  el.style.viewTransitionName = "product-image";
  const t = doc.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        ready = resolve;
        setTimeout(resolve, 800);
        router.push(href);
      }),
  );
  void t.finished.finally(() => {
    el.style.viewTransitionName = "";
  });
}

/** Small image flies from the button to the cart icon in the header. */
export function flyToCart(from: Element | null, src: string) {
  const target = document.querySelector("[data-cart-icon]");
  if (!from || !target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const size = 56;
  const el = document.createElement("img");
  el.src = src;
  el.alt = "";
  Object.assign(el.style, {
    position: "fixed", left: `${a.left + a.width / 2 - size / 2}px`, top: `${a.top + a.height / 2 - size / 2}px`,
    width: `${size}px`, height: `${size}px`, objectFit: "cover", borderRadius: "10px", zIndex: "80",
    pointerEvents: "none", boxShadow: "0 8px 20px -8px rgba(30,20,90,.5)", border: "2px solid #fff",
  });
  document.body.appendChild(el);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = el.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 70}px) scale(.8)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(.18)`, opacity: 0.35 },
    ],
    { duration: 620, easing: "cubic-bezier(.4,.1,.2,1)" },
  );
  anim.onfinish = () => el.remove();
}
