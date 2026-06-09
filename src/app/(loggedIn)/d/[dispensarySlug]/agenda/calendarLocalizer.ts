import { dateFnsLocalizer } from 'react-big-calendar';
import { format, getDay, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

export const agendaCalendarLocalizer = dateFnsLocalizer({
  format,
  getDay,
  startOfWeek: (date: Date) => startOfWeek(date, { locale: fr, weekStartsOn: 1 }),
  locales: { fr },
});

export const agendaCalendarTimeBounds = {
  min: new Date(1970, 0, 1, 0, 0, 0),
  max: new Date(1970, 0, 1, 23, 59, 59),
  scrollToTime: new Date(1970, 0, 1, 8, 0, 0),
};
