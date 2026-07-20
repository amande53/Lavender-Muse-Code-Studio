// Full navigation (not router.push/<Link>) - WebContainer preview needs
// COOP/COEP isolation headers, which only apply on a fresh document load,
// not a client-side SPA transition. Kept as a standalone function (not an
// inline closure in a component) so the mutation isn't reachable from a
// hook/component body.
export const navigateFullPage = (url: string) => {
  window.location.href = url;
};
