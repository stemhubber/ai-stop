// Minimal module-level pub-sub so any component (a kitchen card, an order
// row) can ask the single mounted <PrintSurface/> to print a ticket, without
// threading a callback prop through every tab. See PrintableTicket.jsx.
let listener = null;

export function setPrintListener(fn) {
  listener = fn;
}

export function requestPrint(payload) {
  listener?.(payload);
}
