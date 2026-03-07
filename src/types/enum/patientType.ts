export enum PatientTypeEnum {
  CIVIL = 'civil',
  SHERIF_NH = 'sherif_nh',
  SHERIF_WE = 'sherif_we',
  DOCTOR = 'doctor',
}

export type PatientType = PatientTypeEnum.SHERIF_NH | PatientTypeEnum.SHERIF_WE | PatientTypeEnum.DOCTOR | PatientTypeEnum.CIVIL;

export const PatientTypeEnumKeys: string[] = Object.keys(PatientTypeEnum);
export const PatientTypeEnumValues: string[] = Object.values(PatientTypeEnum);

/**
 * Transforme un type de patient en libellé français
 */
export function getPatientTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    [PatientTypeEnum.SHERIF_NH]: 'Shérif NH',
    [PatientTypeEnum.SHERIF_WE]: 'Shérif WE',
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
    [PatientTypeEnum.SHERIF_NH]: 'blue',
    [PatientTypeEnum.SHERIF_WE]: 'orange',
    [PatientTypeEnum.DOCTOR]: 'green',
    [PatientTypeEnum.CIVIL]: 'gray',
  };
  return colors[type] || 'gray';
}
