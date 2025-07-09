'use client';

import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';

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
  return (
    <div className={cn('relative w-full', className)}>
      <DatePicker
        selected={selected}
        onChange={onChange}
        minDate={minDate}
        maxDate={maxDate}
        placeholderText={placeholderText}
        dateFormat={dateFormat}
        showTimeSelect={showTimeSelect}
        disabled={disabled}
        className="w-full h-12 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        calendarClassName="!bg-white dark:!bg-gray-800 !rounded-lg !shadow-lg !border !border-gray-200 dark:!border-gray-700"
        popperClassName="z-50"
        autoComplete="off"
      />
      <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
    </div>
  );
}
