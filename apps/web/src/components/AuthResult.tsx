import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

type AuthResultProps = {
  action: ReactNode;
  body: string;
  eyebrow: string;
  title: string;
};

export const AuthResult = ({ action, body, eyebrow, title }: AuthResultProps) => (
  <div className="verify-success-state auth-result-state">
    <div className="verify-success-icon" aria-hidden="true">
      <CheckCircle2 size={34} />
    </div>
    <p className="eyebrow">{eyebrow}</p>
    <h2>{title}</h2>
    <p>{body}</p>
    {action}
  </div>
);