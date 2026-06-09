type UpcomingEventsRefreshListener = () => void;

const listeners = new Set<UpcomingEventsRefreshListener>();

export function subscribeUpcomingEventsRefresh(listener: UpcomingEventsRefreshListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyUpcomingEventsRefresh() {
  for (const listener of listeners) {
    listener();
  }
}
