import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

type AppModalProps = {
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
};

export const AppModal = ({
  children,
  description,
  footer,
  onOpenChange,
  open,
  title,
}: AppModalProps) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="modal-overlay" />
      <Dialog.Content className="app-modal">
        <div className="modal-header">
          <div>
            <Dialog.Title className="modal-title">{title}</Dialog.Title>
            {description && (
              <Dialog.Description className="modal-description">
                {description}
              </Dialog.Description>
            )}
          </div>
          <Dialog.Close className="icon-button modal-close" aria-label="Close">
            <X size={18} />
          </Dialog.Close>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
