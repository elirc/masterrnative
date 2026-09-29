import { Alert } from "react-native";

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function showConfirmDialog({
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  destructive = true,
  onConfirm,
}: ConfirmDialogOptions) {
  Alert.alert(title, message, [
    { text: cancelText, style: "cancel" },
    {
      text: confirmText,
      style: destructive ? "destructive" : "default",
      onPress: onConfirm,
    },
  ]);
}

export function ConfirmDialog() {
  return null;
}
