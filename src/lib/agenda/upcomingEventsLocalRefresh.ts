type UpcomingEventsLocalRefreshListener = () => void;

const listeners = new Set<UpcomingEventsLocalRefreshListener>();

export function subscribeUpcomingEventsLocalRefresh(
  listener: UpcomingEventsLocalRefreshListener,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyUpcomingEventsLocalRefresh() {
  for (const listener of listeners) {
    listener();
  }
}
