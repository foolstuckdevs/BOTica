'use client';

import React, { useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholderText?: string;
  className?: string;
  dateFormat?: string;
  showTimeSelect?: boolean;
  disabled?: boolean;
}

export function Calendar({
  selected,
  onChange,
  minDate,
  maxDate,
  placeholderText = 'Select date',
  className = '',
  dateFormat = 'yyyy-MM-dd',
  showTimeSelect = false,
  disabled = false,
}: CalendarProps) {
  const datePickerRef = useRef<DatePicker | null>(null);

  return (
    <div className={cn('relative w-full', className)}>
      <DatePicker
        ref={(ref) => {
          datePickerRef.current = ref;
        }}
        selected={selected}
        onChange={onChange}
        minDate={minDate}
        maxDate={maxDate}
        placeholderText={placeholderText}
        dateFormat={dateFormat}
        showTimeSelect={showTimeSelect}
        disabled={disabled}
        autoComplete="off"
        wrapperClassName="w-full"
        className={cn(
          'w-full h-10 px-3 pr-10 py-2 text-sm rounded-md border border-input bg-background',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        calendarClassName="!bg-white dark:!bg-gray-800 !rounded-lg !shadow-lg !border !border-gray-200 dark:!border-gray-700"
        popperClassName="z-50"
      />

      <button
        type="button"
        onClick={() => datePickerRef.current?.setOpen(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600"
      >
        <CalendarDays className="w-5 h-5" />
      </button>
    </div>
  );
}
