import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirm action",
  description = "Are you sure you want to continue?",
  confirmLabel = "Confirm",
  confirmDisabled = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-slate-300">{description}</p>
    </Modal>
  );
}

export default ConfirmDialog;
