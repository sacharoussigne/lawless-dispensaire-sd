export const payrollKeys = {
  all: (slug: string) => ['payroll', slug] as const,
  list: (slug: string) => [...payrollKeys.all(slug), 'list'] as const,
  detail: (slug: string, reportId: string) =>
    [...payrollKeys.all(slug), 'detail', reportId] as const,
  importableActivityWeeks: (slug: string) =>
    [...payrollKeys.all(slug), 'importableActivityWeeks'] as const,
};
