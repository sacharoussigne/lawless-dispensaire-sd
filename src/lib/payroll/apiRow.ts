export type PayrollReportListSummary = {
  totalPatientsSoignes: number;
  totalSherifs: number;
};

export type SerializedPayrollReportListItem = {
  id: string;
  weekStart: string;
  weekEnd: string;
  reportType: string;
  createdAt: string;
  createdBy: { name: string; id: string };
  summary: PayrollReportListSummary | null;
};

export type SerializedPayrollReportDetail = {
  id: string;
  weekStart: string;
  weekEnd: string;
  reportType: string;
  resultJson: unknown;
  errorMessage: string | null;
  createdAt: string;
  createdBy: { name: string; email: string };
};
