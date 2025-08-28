'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface CustomDatePickerProps {
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  className?: string;
}

export function CustomDatePicker({
  dateRange,
  onDateRangeChange,
  className,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [startDate, setStartDate] = React.useState<Date | null>(
    dateRange?.from || null,
  );
  const [endDate, setEndDate] = React.useState<Date | null>(
    dateRange?.to || null,
  );

  // Update internal state when prop changes
  React.useEffect(() => {
    setStartDate(dateRange?.from || null);
    setEndDate(dateRange?.to || null);
  }, [dateRange]);

  const handleDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);

    onDateRangeChange?.({
      from: start || undefined,
      to: end || undefined,
    });

    // Close popover when both dates are selected
    if (start && end) {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
    onDateRangeChange?.(undefined);
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={startDate ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'h-9 px-3 justify-start text-left font-normal',
              !startDate && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="w-3 h-3 mr-1" />
            {startDate && endDate
              ? `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}`
              : startDate
              ? format(startDate, 'MMM dd')
              : 'Custom'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4 mt-2" align="center">
          <div className="space-y-4">
            <div className="text-sm font-medium">Select Date Range</div>
            <DatePicker
              selected={startDate}
              onChange={handleDateChange}
              startDate={startDate}
              endDate={endDate}
              selectsRange
              inline
              maxDate={new Date()}
              minDate={new Date('2020-01-01')}
              monthsShown={2}
              className="border-0 p-0"
            />
          </div>
        </PopoverContent>
      </Popover>

      {startDate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="h-9 px-1 text-xs"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
