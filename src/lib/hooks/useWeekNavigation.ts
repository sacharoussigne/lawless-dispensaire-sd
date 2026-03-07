import { useState } from 'react';
import { addWeeks, subWeeks } from 'date-fns';

interface UseWeekNavigationProps {
  initialWeekStart: Date;
  onWeekChange: (date: Date) => Promise<void>;
}

export function useWeekNavigation({ initialWeekStart, onWeekChange }: UseWeekNavigationProps) {
  const [weekDateValue, setWeekDateValue] = useState<Date | null>(new Date(initialWeekStart));

  const handlePreviousWeek = () => {
    const newDate = subWeeks(initialWeekStart, 1);
    onWeekChange(newDate);
  };

  const handleNextWeek = () => {
    const newDate = addWeeks(initialWeekStart, 1);
    onWeekChange(newDate);
  };

  const handleWeekChange = (date: Date | null) => {
    if (date) {
      setWeekDateValue(date);
      onWeekChange(date);
    }
  };

  return {
    weekDateValue,
    setWeekDateValue,
    handlePreviousWeek,
    handleNextWeek,
    handleWeekChange,
  };
}
