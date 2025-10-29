'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
  isSameMonth,
  isSameYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
const WEEK_START: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1;

export interface DateFilterRange {
  from?: Date;
  to?: Date;
}

export type FilterPeriod = 'today' | 'week' | 'month' | 'year' | 'custom';

interface DateFilterComponentProps {
  period?: FilterPeriod;
  onPeriodChange?: (period: FilterPeriod) => void;
  dateRange?: DateFilterRange;
  onDateRangeChange?: (range: DateFilterRange) => void;
  buttonClassName?: string;
}

const PERIOD_OPTIONS: Array<{ value: FilterPeriod; label: string }> = [
  { value: 'today', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'custom', label: 'Custom' },
];
const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MIN_YEAR = 2025;

function normalizeYearBlock(year: number) {
  if (year <= MIN_YEAR) {
    return MIN_YEAR;
  }

  const offset = year - MIN_YEAR;
  const blockOffset = Math.floor(offset / 12) * 12;
  return MIN_YEAR + blockOffset;
}

function rangesMatch(a: DateFilterRange, b: DateFilterRange) {
  const fromMatch =
    (!a.from && !b.from) || (a.from && b.from && isSameDay(a.from, b.from));
  const toMatch = (!a.to && !b.to) || (a.to && b.to && isSameDay(a.to, b.to));
  return fromMatch && toMatch;
}

function rangeForPeriod(
  period: FilterPeriod,
  reference: Date,
): DateFilterRange {
  switch (period) {
    case 'today':
      return { from: startOfDay(reference), to: endOfDay(reference) };
    case 'week':
      return {
        from: startOfWeek(reference, { weekStartsOn: WEEK_START }),
        to: endOfWeek(reference, { weekStartsOn: WEEK_START }),
      };
    case 'month':
      return {
        from: startOfMonth(reference),
        to: endOfMonth(reference),
      };
    case 'year': {
      const year = Math.max(reference.getFullYear(), MIN_YEAR);
      return {
        from: startOfYear(new Date(year, 0, 1)),
        to: endOfYear(new Date(year, 11, 31)),
      };
    }
    case 'custom':
    default:
      return {};
  }
}

function toDateRange(range?: DateFilterRange): DateRange | undefined {
  if (!range?.from) {
    return undefined;
  }

  return { from: range.from, to: range.to };
}

function clampRangeToMonth(
  range: DateRange | undefined,
  monthStart: Date,
): DateFilterRange {
  if (!range?.from) {
    return {};
  }

  const monthEnd = endOfMonth(monthStart);
  let from = startOfDay(range.from);

  if (from < monthStart || !isSameMonth(from, monthStart)) {
    from = monthStart;
  }

  let toSource = range.to ?? range.from;
  if (!isSameMonth(toSource, monthStart)) {
    toSource = monthEnd;
  }

  let to = endOfDay(toSource);
  if (to > monthEnd) {
    to = monthEnd;
  }

  if (to < from) {
    to = endOfDay(from);
  }

  return { from, to };
}

function defaultWeekRangeForMonth(monthStart: Date): DateFilterRange {
  const start = startOfDay(monthStart);
  const monthEnd = endOfMonth(monthStart);
  const tentativeEnd = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 6,
  );
  const endDate = tentativeEnd > monthEnd ? monthEnd : tentativeEnd;

  return {
    from: start,
    to: endOfDay(endDate),
  };
}

export function DateFilterComponent({
  period,
  onPeriodChange,
  dateRange,
  onDateRangeChange,
  buttonClassName,
}: DateFilterComponentProps) {
  const today = React.useMemo(() => new Date(), []);
  const initialPeriod: FilterPeriod =
    period ?? (dateRange?.from && dateRange?.to ? 'custom' : 'today');
  const initialRange: DateFilterRange =
    initialPeriod === 'custom'
      ? dateRange ?? rangeForPeriod('today', today)
      : rangeForPeriod(initialPeriod, dateRange?.from ?? today);

  const [isOpen, setIsOpen] = React.useState(false);
  const [appliedPeriod, setAppliedPeriod] =
    React.useState<FilterPeriod>(initialPeriod);
  const [appliedRange, setAppliedRange] =
    React.useState<DateFilterRange>(initialRange);
  const [tempPeriod, setTempPeriod] =
    React.useState<FilterPeriod>(initialPeriod);
  const [tempRange, setTempRange] =
    React.useState<DateFilterRange>(initialRange);
  const [weekViewMonth, setWeekViewMonth] = React.useState(
    startOfMonth((initialRange.from ?? today) || today),
  );
  const [monthViewYear, setMonthViewYear] = React.useState(
    (initialRange.from ?? today).getFullYear(),
  );
  const [yearViewStart, setYearViewStart] = React.useState(
    normalizeYearBlock((initialRange.from ?? today).getFullYear()),
  );

  React.useEffect(() => {
    const nextPeriod: FilterPeriod =
      period ?? (dateRange?.from && dateRange?.to ? 'custom' : appliedPeriod);
    const reference = dateRange?.from ?? appliedRange.from ?? today;
    let nextRange: DateFilterRange;

    if (nextPeriod === 'custom') {
      nextRange = dateRange ?? appliedRange;
    } else if (nextPeriod === 'week') {
      const monthStart = startOfMonth(reference ?? today);
      const preferredRange = clampRangeToMonth(
        toDateRange(dateRange),
        monthStart,
      );
      const fallbackRange = preferredRange.from
        ? preferredRange
        : clampRangeToMonth(toDateRange(appliedRange), monthStart);

      nextRange = fallbackRange.from
        ? fallbackRange
        : defaultWeekRangeForMonth(monthStart);

      setWeekViewMonth(monthStart);
    } else {
      nextRange = rangeForPeriod(nextPeriod, reference ?? today);
    }

    const alignedRange =
      nextRange.from && nextRange.to
        ? nextRange
        : rangeForPeriod(nextPeriod === 'custom' ? 'today' : nextPeriod, today);

    if (
      nextPeriod !== appliedPeriod ||
      !rangesMatch(alignedRange, appliedRange)
    ) {
      setAppliedPeriod(nextPeriod);
      setAppliedRange(alignedRange);
      if (!isOpen) {
        setTempPeriod(nextPeriod);
        setTempRange(alignedRange);
        setWeekViewMonth(startOfMonth(alignedRange.from ?? today));
        setMonthViewYear((alignedRange.from ?? today).getFullYear());
        setYearViewStart(
          normalizeYearBlock((alignedRange.from ?? today).getFullYear()),
        );
      }
    }
  }, [period, dateRange, appliedPeriod, appliedRange, isOpen, today]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setTempPeriod(appliedPeriod);
      setTempRange(appliedRange);
      setWeekViewMonth(startOfMonth(appliedRange.from ?? today));
      setMonthViewYear((appliedRange.from ?? today).getFullYear());
      setYearViewStart(
        normalizeYearBlock((appliedRange.from ?? today).getFullYear()),
      );
    } else {
      setTempPeriod(appliedPeriod);
      setTempRange(appliedRange);
    }
  };

  const handlePeriodClick = (newPeriod: FilterPeriod) => {
    setTempPeriod(newPeriod);

    if (newPeriod === 'custom') {
      return;
    }

    const reference = tempRange.from ?? appliedRange.from ?? today;
    const referenceDate = reference ?? today;

    if (newPeriod === 'week') {
      const monthStart = startOfMonth(referenceDate);
      setWeekViewMonth(monthStart);
      const candidate = clampRangeToMonth(toDateRange(tempRange), monthStart);
      const fallback = candidate.from
        ? candidate
        : clampRangeToMonth(toDateRange(appliedRange), monthStart);
      const resolved = fallback.from
        ? fallback
        : defaultWeekRangeForMonth(monthStart);

      setTempRange(resolved);
      return;
    }

    const nextRange = rangeForPeriod(newPeriod, referenceDate);
    setTempRange(nextRange);

    if (newPeriod === 'month') {
      setMonthViewYear((nextRange.from ?? reference ?? today).getFullYear());
    }
    if (newPeriod === 'year') {
      setYearViewStart(
        normalizeYearBlock(
          (nextRange.from ?? reference ?? today).getFullYear(),
        ),
      );
    }
  };

  const handleDaySelect = (date: Date | null) => {
    if (!date) return;
    setTempRange(rangeForPeriod('today', date));
  };

  const handleMonthSelect = (monthIndex: number) => {
    const base = new Date(monthViewYear, monthIndex, 1);
    setTempRange(rangeForPeriod('month', base));
  };

  const handleYearSelect = (year: number) => {
    const base = new Date(year, 0, 1);
    setTempRange(rangeForPeriod('year', base));
  };

  const selectedRange = tempRange.from
    ? { from: tempRange.from, to: tempRange.to ?? tempRange.from }
    : undefined;

  const handleWeekRangeSelect = (range: DateRange | undefined) => {
    const clamped = clampRangeToMonth(range, weekViewMonth);
    if (clamped.from) {
      setTempRange(clamped);
    } else {
      setTempRange({});
    }
  };

  const handleWeekMonthChange = (month: Date) => {
    const normalized = startOfMonth(month);
    setWeekViewMonth(normalized);
    setTempRange((existing) => {
      const clamped = clampRangeToMonth(toDateRange(existing), normalized);
      return clamped.from ? clamped : defaultWeekRangeForMonth(normalized);
    });
  };

  const handleApply = () => {
    if (tempPeriod === 'custom' && !(tempRange.from && tempRange.to)) {
      return;
    }

    const reference = tempRange.from ?? appliedRange.from ?? today;
    let resolvedRange: DateFilterRange;

    if (tempPeriod === 'custom') {
      resolvedRange = tempRange;
    } else if (tempPeriod === 'week') {
      const clamped = clampRangeToMonth(toDateRange(tempRange), weekViewMonth);
      resolvedRange = clamped.from
        ? clamped
        : defaultWeekRangeForMonth(weekViewMonth);
    } else {
      resolvedRange = rangeForPeriod(tempPeriod, reference ?? today);
    }

    setAppliedPeriod(tempPeriod);
    setAppliedRange(resolvedRange);

    onPeriodChange?.(tempPeriod);
    onDateRangeChange?.(resolvedRange);

    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTempPeriod(appliedPeriod);
    setTempRange(appliedRange);
  };

  const getTriggerLabel = () => {
    if (appliedPeriod === 'custom') {
      if (appliedRange.from && appliedRange.to) {
        return `${format(appliedRange.from, 'd MMM yyyy')} – ${format(
          appliedRange.to,
          'd MMM yyyy',
        )}`;
      }
      return 'Custom range';
    }

    if (appliedPeriod === 'today') {
      return appliedRange.from
        ? format(appliedRange.from, 'd MMM yyyy')
        : 'Day';
    }

    if (appliedPeriod === 'week') {
      if (appliedRange.from && appliedRange.to) {
        return `${format(appliedRange.from, 'd MMM')} – ${format(
          appliedRange.to,
          'd MMM yyyy',
        )}`;
      }
      return 'This week';
    }

    if (appliedPeriod === 'month') {
      return appliedRange.from
        ? format(appliedRange.from, 'MMMM yyyy')
        : 'Month';
    }

    if (appliedPeriod === 'year') {
      return appliedRange.from ? format(appliedRange.from, 'yyyy') : 'Year';
    }

    return 'Filter';
  };

  const isApplyDisabled =
    tempPeriod === 'custom' && !(tempRange.from && tempRange.to);

  const rangeModifierClasses = React.useMemo(
    () => ({
      selected: 'bg-slate-900 text-white hover:bg-slate-900 rounded-sm',
      range_start: 'bg-slate-900 text-white hover:bg-slate-900 rounded-l-sm',
      range_middle: 'bg-slate-100 text-slate-900 hover:bg-slate-100',
      range_end: 'bg-slate-900 text-white hover:bg-slate-900 rounded-r-sm',
    }),
    [],
  );

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 rounded-md border-slate-200 px-3 text-slate-700 gap-2 text-sm font-medium hover:bg-slate-50 transition-colors',
            buttonClassName,
          )}
        >
          <CalendarIcon className="w-4 h-4" />
          {getTriggerLabel()}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        avoidCollisions={false}
        sideOffset={4}
        className="w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
      >
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">
              Filter by
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {PERIOD_OPTIONS.map(({ value, label }) => {
              const isActive = tempPeriod === value;
              return (
                <Button
                  key={value}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePeriodClick(value)}
                  className={cn(
                    'h-7 rounded-md px-3 text-xs font-medium transition-all',
                    isActive
                      ? 'bg-slate-900 text-white hover:bg-slate-800 border-slate-900'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200',
                  )}
                >
                  {label}
                </Button>
              );
            })}
          </div>

          {tempPeriod === 'today' && (
            <Calendar
              mode="single"
              selected={tempRange.from ?? undefined}
              defaultMonth={tempRange.from ?? today}
              onSelect={(date) => date && handleDaySelect(date)}
              weekStartsOn={WEEK_START}
              className="w-full rounded-md border border-slate-200 p-2.5 text-sm"
              modifiersClassNames={{
                selected: rangeModifierClasses.selected,
              }}
            />
          )}

          {tempPeriod === 'week' && (
            <Calendar
              mode="range"
              month={weekViewMonth}
              onMonthChange={handleWeekMonthChange}
              selected={selectedRange}
              weekStartsOn={WEEK_START}
              onSelect={handleWeekRangeSelect}
              showOutsideDays={false}
              disabled={(date) => !isSameMonth(date, weekViewMonth)}
              className="w-full rounded-md border border-slate-200 p-2.5 text-sm"
              modifiersClassNames={rangeModifierClasses}
            />
          )}

          {tempPeriod === 'month' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-slate-900">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-sm hover:bg-slate-100"
                  onClick={() => setMonthViewYear((year) => year - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold">{monthViewYear}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-sm hover:bg-slate-100"
                  onClick={() =>
                    setMonthViewYear((year) =>
                      Math.min(year + 1, today.getFullYear()),
                    )
                  }
                  disabled={monthViewYear >= today.getFullYear()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {MONTH_LABELS.map((label, index) => {
                  const baseDate = new Date(monthViewYear, index, 1);
                  const isDisabled =
                    baseDate > today ||
                    baseDate.getFullYear() > today.getFullYear();
                  const isActive =
                    tempRange.from && isSameMonth(tempRange.from, baseDate);
                  return (
                    <Button
                      key={label}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      disabled={isDisabled}
                      onClick={() => handleMonthSelect(index)}
                      className={cn(
                        'h-8 rounded-md text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-slate-900 text-white hover:bg-slate-800'
                          : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200',
                      )}
                    >
                      {label.substring(0, 3)}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {tempPeriod === 'year' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-slate-900">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-sm hover:bg-slate-100"
                  onClick={() =>
                    setYearViewStart((year) =>
                      Math.max(MIN_YEAR, normalizeYearBlock(year - 12)),
                    )
                  }
                  disabled={yearViewStart <= MIN_YEAR}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold">
                  {yearViewStart} – {yearViewStart + 11}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-sm hover:bg-slate-100"
                  onClick={() =>
                    setYearViewStart((year) =>
                      normalizeYearBlock(
                        Math.min(year + 12, today.getFullYear()),
                      ),
                    )
                  }
                  disabled={yearViewStart + 12 > today.getFullYear()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 12 }).map((_, index) => {
                  const year = yearViewStart + index;
                  const isDisabled =
                    year > today.getFullYear() || year < MIN_YEAR;
                  const isActive =
                    tempRange.from &&
                    isSameYear(tempRange.from, new Date(year, 0, 1));
                  return (
                    <Button
                      key={year}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleYearSelect(year)}
                      disabled={isDisabled}
                      className={cn(
                        'h-8 rounded-md text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-slate-900 text-white hover:bg-slate-800'
                          : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200',
                      )}
                    >
                      {year}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {tempPeriod === 'custom' && (
            <div className="space-y-2.5">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 justify-start rounded-md border-slate-200 text-xs font-medium text-slate-600 h-8 hover:bg-slate-50"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {tempRange.from
                    ? format(tempRange.from, 'd MMM yyyy')
                    : 'Start date'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 justify-start rounded-md border-slate-200 text-xs font-medium text-slate-600 h-8 hover:bg-slate-50"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {tempRange.to
                    ? format(tempRange.to, 'd MMM yyyy')
                    : 'End date'}
                </Button>
              </div>
              <Calendar
                mode="range"
                selected={selectedRange}
                defaultMonth={selectedRange?.from ?? tempRange.from ?? today}
                weekStartsOn={WEEK_START}
                numberOfMonths={1}
                className="w-full rounded-md border border-slate-200 p-2.5 text-sm"
                onSelect={(range) =>
                  setTempRange({
                    from: range?.from ?? undefined,
                    to: range?.to ?? undefined,
                  })
                }
                modifiersClassNames={{
                  ...rangeModifierClasses,
                }}
              />
            </div>
          )}

          <Button
            onClick={handleApply}
            disabled={isApplyDisabled}
            className="w-full h-9 rounded-md bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default DateFilterComponent;
