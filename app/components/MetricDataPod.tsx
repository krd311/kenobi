import { type ReactNode } from "react";
import styles from "./MetricDataPod.module.css";

type MetricStatus = "good" | "warning" | "poor";

type MetricDataPodProps = {
  label: ReactNode;
  value: ReactNode;
  subvalue?: ReactNode;
  note?: ReactNode;
  status?: MetricStatus;
  statusLabel?: string;
};

const statusClassByStatus: Record<MetricStatus, string> = {
  good: styles.statusGood,
  warning: styles.statusWarning,
  poor: styles.statusPoor,
};

export function MetricDataPod({
  label,
  value,
  subvalue,
  note,
  status,
  statusLabel,
}: MetricDataPodProps) {
  return (
    <article className={styles.pod}>
      <div className={styles.header}>
        <div className={styles.label}>{label}</div>
        {status && (
          <span className={`${styles.status} ${statusClassByStatus[status]}`}>
            {statusLabel ?? status}
          </span>
        )}
      </div>

      <div className={styles.value}>{value}</div>

      {subvalue && <div className={styles.subvalue}>{subvalue}</div>}
      {note && <div className={styles.note}>{note}</div>}
    </article>
  );
}

export type { MetricDataPodProps, MetricStatus };
