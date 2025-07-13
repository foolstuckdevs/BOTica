'use client';

import React from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Adjustment } from '@/types';

interface Props {
  adjustment: Adjustment;
}

const AdjustmentActions = ({ adjustment }: Props) => {
  const handleView = () => {
    alert(`Viewing adjustment #${adjustment.id}`);
    // Optionally navigate to `/adjustments/${adjustment.id}` or open a modal
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleView}
      title="View Adjustment"
    >
      <Eye className="h-4 w-4 text-gray-600" />
    </Button>
  );
};

export default AdjustmentActions;
