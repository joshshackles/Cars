export type SettingKey =
  | "countiesServed"
  | "ridePurposes"
  | "cancellationReasons"
  | "noShowReasons"
  | "incidentTypes"
  | "driverStatuses"
  | "driverOnboardingStatuses"
  | "backgroundCheckStatuses"
  | "reimbursementPreferences"
  | "riderStatuses"
  | "serviceHours"
  | "minimumSchedulingNotice"
  | "reimbursementRate"
  | "reminderTemplates"
  | "fundingSources"
  | "destinationTypes";

export type SettingOption = {
  code: string;
  label: string;
  active?: boolean;
};

export type SettingValidationIssue = {
  key: string;
  label: string;
  message: string;
};
