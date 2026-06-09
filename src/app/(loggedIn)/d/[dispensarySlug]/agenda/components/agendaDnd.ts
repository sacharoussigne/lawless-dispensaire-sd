import type { PointerEvent as ReactPointerEvent } from 'react';
import { PointerSensor, useSensor } from '@dnd-kit/core';

const PRESS_HOLD_ACTIVATION = { delay: 220, tolerance: 8 };

export function usePressHoldPointerSensor() {
  return useSensor(PointerSensor, { activationConstraint: PRESS_HOLD_ACTIVATION });
}

export function stopDragPointer(event: ReactPointerEvent) {
  event.stopPropagation();
}
