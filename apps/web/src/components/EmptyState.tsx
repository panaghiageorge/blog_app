import type { ReactNode } from "react";
import { FileSearch } from "lucide-react";

type EmptyStateProps = {
  action?: ReactNode;
  message: string;
  title?: string;
};

export const EmptyState = ({ action, message, title }: EmptyStateProps) => (
  <div className="empty-state-card" role="status">
    <div className="empty-state-icon" aria-hidden="true">
      <FileSearch size={22} />
    </div>
    {title && <h3>{title}</h3>}
    <p>{message}</p>
    {action && <div className="empty-state-action">{action}</div>}
  </div>
);