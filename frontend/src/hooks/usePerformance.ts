import { useCallback, useRef, useEffect, useMemo } from 'react';

/**
 * Debounce a callback function
 * Useful for search inputs, resize handlers, etc.
 */
export function useDebounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

/**
 * Throttle a callback function
 * Useful for scroll handlers, mouse move, etc.
 */
export function useThrottle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  limit: number
): (...args: Parameters<T>) => void {
  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRunRef.current;

      if (timeSinceLastRun >= limit) {
        callback(...args);
        lastRunRef.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRunRef.current = Date.now();
        }, limit - timeSinceLastRun);
      }
    },
    [callback, limit]
  );
}

/**
 * Track when an element is visible in the viewport
 * Useful for lazy loading, analytics, etc.
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefCallback<Element>, boolean] {
  const ref = useRef<Element | null>(null);
  const isIntersectingRef = useRef(false);

  const setRef = useCallback(
    (node: Element | null) => {
      if (ref.current) {
        // Cleanup previous observer
      }

      if (node) {
        const observer = new IntersectionObserver(([entry]) => {
          isIntersectingRef.current = entry.isIntersecting;
        }, options);

        observer.observe(node);
        ref.current = node;

        return () => observer.disconnect();
      }
    },
    [options]
  );

  return [setRef, isIntersectingRef.current];
}

/**
 * Memoize expensive computations based on dependencies
 */
export function useMemoizedCallback<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  return useMemo(factory, deps);
}

/**
 * Measure component render performance in development
 */
export function useRenderCount(componentName: string): void {
  const renderCount = useRef(0);

  useEffect(() => {
    if (import.meta.env.DEV) {
      renderCount.current += 1;
      console.debug(`[Render] ${componentName}: ${renderCount.current}`);
    }
  });
}

/**
 * Track component mount/unmount in development
 */
export function useLifecycleLog(componentName: string): void {
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug(`[Mount] ${componentName}`);
      return () => {
        console.debug(`[Unmount] ${componentName}`);
      };
    }
  }, [componentName]);
}

/**
 * Preload a route's chunk before navigation
 * Improves perceived performance
 */
export function usePreloadRoute(): (routeLoader: () => Promise<unknown>) => void {
  const preloadedRef = useRef<Set<() => Promise<unknown>>>(new Set());

  return useCallback((routeLoader: () => Promise<unknown>) => {
    if (!preloadedRef.current.has(routeLoader)) {
      preloadedRef.current.add(routeLoader);
      routeLoader().catch(() => {
        // Silently handle preload errors
        preloadedRef.current.delete(routeLoader);
      });
    }
  }, []);
}
