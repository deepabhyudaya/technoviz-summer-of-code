// Performance monitoring utilities
export const performanceMonitor = {
  // Track database query performance
  trackQuery: (operation: string, startTime: number) => {
    const duration = Date.now() - startTime;
    if (duration > 100) {
      console.warn(`Slow ${operation}: ${duration}ms`);
    }
  },

  // Track component render performance
  trackRender: (componentName: string, startTime: number) => {
    const duration = performance.now() - startTime;
    if (duration > 16.67) { // More than one frame at 60fps
      console.warn(`${componentName} render took ${duration.toFixed(2)}ms`);
    }
  },

  // Track Ably publish performance
  trackAblyPublish: (eventCount: number, startTime: number) => {
    const duration = Date.now() - startTime;
    console.log(`Ably publish: ${eventCount} events in ${duration}ms`);
  },

  // Track sidebar polling performance
  trackSidebarPoll: (queryCount: number, duration: number) => {
    console.log(`Sidebar poll: ${queryCount} queries in ${duration}ms`);
  }
};