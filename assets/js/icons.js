/* =====================================================================
   OCTANAJE · Icons — íconos SVG monocromáticos compartidos (amarillo neón)
   Se usan en los títulos de cada vista y coinciden con las pestañas.
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS || (window.NEXUS = {});

  const A = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';

  const SVG = {
    house: '<svg ' + A + ' stroke-width="1.8"><path d="M3 11l9-7 9 7"/><path d="M5 9.6V20h14V9.6"/><path d="M10 20v-5h4v5"/></svg>',
    clock: '<svg ' + A + ' stroke-width="1.8"><circle cx="12" cy="12.5" r="8"/><path d="M12 8v4.5l3.2 2"/><path d="M8 3.2 4.5 6"/><path d="M16 3.2 19.5 6"/></svg>',
    peso: '<svg ' + A + ' stroke-width="1.8"><path d="M15.6 8.1c0-1.9-1.7-3-3.6-3s-3.6 1-3.6 2.9c0 3.9 7.2 2.6 7.2 6.6 0 1.9-1.7 3-3.6 3s-3.6-1.1-3.6-3"/><line x1="12" y1="3.3" x2="12" y2="20.7"/></svg>',
    tasks: '<svg ' + A + ' stroke-width="1.7"><rect x="5" y="4.5" width="14" height="16" rx="2"/><path d="M9.5 3.4h5v2.6h-5z"/><path d="M8.1 10l1.3 1.3 2.3-2.4"/><path d="M8.1 15.4l1.3 1.3 2.3-2.4"/><line x1="14" y1="10" x2="16.4" y2="10"/><line x1="14" y1="15.4" x2="16.4" y2="15.4"/></svg>',
    dumbbell: '<svg ' + A + ' stroke-width="1.7"><line x1="6.5" y1="12" x2="17.5" y2="12" stroke-width="2"/><rect x="2.6" y="8" width="3" height="8" rx="1.2"/><rect x="18.4" y="8" width="3" height="8" rx="1.2"/><rect x="5.8" y="9.8" width="2.2" height="4.4" rx="0.8"/><rect x="16" y="9.8" width="2.2" height="4.4" rx="0.8"/></svg>',
    trophy: '<svg ' + A + ' stroke-width="1.8"><path d="M8 4h8v3.5a4 4 0 0 1-8 0z"/><path d="M8 5.2H5.2v1.1a2.7 2.7 0 0 0 2.5 2.7"/><path d="M16 5.2h2.8v1.1a2.7 2.7 0 0 1-2.5 2.7"/><path d="M12 11.5V15"/><path d="M9 15h6l1 5H8z"/></svg>',
    meditation: '<svg ' + A + ' stroke-width="1.8"><circle cx="12" cy="5.4" r="2"/><path d="M5 18c1.9-4 12.1-4 14 0"/><path d="M12 8c-2 0-3.7 1.4-4.3 3.5"/><path d="M12 8c2 0 3.7 1.4 4.3 3.5"/><path d="M7.7 11.5C9 12.1 9.2 14 8 15.1"/><path d="M16.3 11.5C15 12.1 14.8 14 16 15.1"/></svg>',
    bulb: '<svg ' + A + ' stroke-width="1.8"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 .6v1.4"/><path d="M3.6 4.4l1.2 1.1"/><path d="M20.4 4.4l-1.2 1.1"/></svg>',
    piggy: '<svg ' + A + ' stroke-width="1.7"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h.01"/></svg>',
    plate: '<svg ' + A + ' stroke-width="1.6"><circle cx="12" cy="12" r="5.2"/><circle cx="12" cy="12" r="2.5"/><path d="M3 3.5v3.5M4.3 3.5v3.5M5.6 3.5v3.5"/><path d="M2.8 7h3"/><path d="M4.3 7v13.5"/><ellipse cx="20" cy="5.6" rx="1.7" ry="2.7"/><path d="M20 8.3v12.2"/></svg>',
    heart: '<svg ' + A + ' stroke-width="1.7"><path d="M12 20c-4.8-3.1-9-6.9-9-11.3C3 5.9 5.2 3.8 8 3.8c1.8 0 3.4.9 4 2.4.6-1.5 2.2-2.4 4-2.4 2.8 0 5 2.1 5 4.9 0 4.4-4.2 8.2-9 11.3z"/><path d="M3.6 11h3.4l1.7 3 2.3-6 1.7 3h3.2l1.5-2"/></svg>',
    moon: '<svg ' + A + ' stroke-width="1.8"><path d="M20 14.2A8.4 8.4 0 1 1 9.3 3.6a7 7 0 0 0 10.7 10.6z"/><circle cx="17.3" cy="6.2" r=".6" fill="currentColor" stroke="none"/><circle cx="19.4" cy="9" r=".4" fill="currentColor" stroke="none"/></svg>',
    hourglass: '<svg ' + A + ' stroke-width="1.7"><path d="M6.5 2.8h11"/><path d="M6.5 21.2h11"/><path d="M7.2 2.8v3.4c0 2 1.6 3.2 3.4 4.3.6.4.6 1.1 0 1.5-1.8 1.1-3.4 2.3-3.4 4.3v3.4"/><path d="M16.8 2.8v3.4c0 2-1.6 3.2-3.4 4.3-.6.4-.6 1.1 0 1.5 1.8 1.1 3.4 2.3 3.4 4.3v3.4"/><path d="M8.6 6.4h6.8" opacity=".55"/></svg>'
  };

  // devuelve un <span class="ico"> con el SVG del ícono indicado
  function node(name) {
    const span = document.createElement("span");
    span.className = "ico";
    span.innerHTML = SVG[name] || "";
    return span;
  }

  N.Icons = { svg: SVG, node: node };
})();
