import { useEffect } from 'react';

// matchers: [{ test: (e) => boolean, fn: (e) => void, allowInInputs?: boolean }]
// Typing inside inputs/textareas ignores shortcuts unless a matcher opts in.
export function useGlobalShortcut(matchers) {
  useEffect(() => {
    function onKeyDown(e) {
      const target = e.target;
      const inField =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      for (const m of matchers) {
        if (!m.test(e)) continue;
        if (inField && !m.allowInInputs) continue;
        e.preventDefault();
        m.fn(e);
        return;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // JSON.stringify keeps the dep cheap and stable for statically-defined matchers.
  }, [JSON.stringify(matchers)]);
}

export default useGlobalShortcut;
