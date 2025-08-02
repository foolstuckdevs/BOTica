import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { AlertTriangle, Loader2, UserCheck, UserX, Trash2 } from 'lucide-react';

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  entityName?: string;
  entityType?: string;
  isLoading?: boolean;
  // New props for enhanced functionality
  title?: string;
  description?: string;
  confirmText?: string;
  confirmVariant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  icon?: 'warning' | 'delete' | 'activate' | 'deactivate';
  loadingText?: string;
}

export const DeleteDialog = ({
  open,
  onOpenChange,
  onConfirm,
  entityName,
  entityType = 'item',
  isLoading = false,
  // New props with defaults for backward compatibility
  title,
  description,
  confirmText,
  confirmVariant = 'destructive',
  icon = 'delete',
  loadingText,
}: DeleteDialogProps) => {
  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const getIcon = () => {
    switch (icon) {
      case 'activate':
        return <UserCheck className="h-6 w-6 text-green-600" />;
      case 'deactivate':
        return <UserX className="h-6 w-6 text-orange-600" />;
      case 'delete':
        return <Trash2 className="h-6 w-6 text-destructive" />;
      case 'warning':
      default:
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
    }
  };

  // Backward compatibility: use old props if new ones aren't provided
  const dialogTitle = title || `Delete ${entityType}`;
  const dialogDescription =
    description ||
    `Are you sure you want to delete ${
      entityName ? `"${entityName}"` : `this ${entityType}`
    }? This action cannot be undone.`;
  const buttonText = confirmText || 'Delete';
  const loadingButtonText = loadingText || 'Deleting...';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <div>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-2">
                {dialogDescription}
              </p>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {loadingButtonText}
              </>
            ) : (
              buttonText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
