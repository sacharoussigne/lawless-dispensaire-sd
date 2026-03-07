export enum PatientTypeEnum {
  SHERIF = 'sherif',
  DOCTOR = 'doctor',
  CIVIL = 'civil',
}

export type PatientType = PatientTypeEnum.SHERIF | PatientTypeEnum.DOCTOR | PatientTypeEnum.CIVIL;

export const PatientTypeEnumKeys: string[] = Object.keys(PatientTypeEnum);
export const PatientTypeEnumValues: string[] = Object.values(PatientTypeEnum);

/**
 * Transforme un type de patient en libellé français
 */
export function getPatientTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    [PatientTypeEnum.SHERIF]: 'Shérif',
    [PatientTypeEnum.DOCTOR]: 'Médecin',
    [PatientTypeEnum.CIVIL]: 'Civil',
  };
  return labels[type] || type;
}

/**
 * Transforme un type de patient en couleur Mantine
 */
export function getPatientTypeColor(type: string): string {
  const colors: Record<string, string> = {
    [PatientTypeEnum.SHERIF]: 'blue',
    [PatientTypeEnum.DOCTOR]: 'green',
    [PatientTypeEnum.CIVIL]: 'gray',
  };
  return colors[type] || 'gray';
}
