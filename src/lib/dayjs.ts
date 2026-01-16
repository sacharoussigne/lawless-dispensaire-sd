/**
 * Configuration globale de dayjs pour l'application
 * Fuseau horaire par défaut : Europe/Paris
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/fr';

// Activer les plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Configurer le fuseau horaire par défaut
dayjs.tz.setDefault('Europe/Paris');

// Configurer la locale française
dayjs.locale('fr');

export default dayjs;

