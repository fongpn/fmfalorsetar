import { useState, useCallback } from 'react';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import type { DateRange } from '@/types';

type DateRangeType = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';

interface UseDateRangeReturn {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  rangeType: DateRangeType;
  setRangeByType: (type: DateRangeType) => void;
  setCustomRange: (startDate: Date, endDate: Date) => void;
}

export function useDateRange(initialType: DateRangeType = 'today'): UseDateRangeReturn {
  const [rangeType, setRangeType] = useState<DateRangeType>(initialType);
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeByType(initialType));

  const setRangeByType = useCallback((type: DateRangeType) => {
    setRangeType(type);
    setDateRange(getDateRangeByType(type));
  }, []);

  const setCustomRange = useCallback((startDate: Date, endDate: Date) => {
    setRangeType('custom');
    setDateRange({
      startDate: startOfDay(startDate),
      endDate: endOfDay(endDate),
    });
  }, []);

  return {
    dateRange,
    setDateRange,
    rangeType,
    setRangeByType,
    setCustomRange,
  };
}

function getDateRangeByType(type: DateRangeType): DateRange {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  switch (type) {
    case 'today':
      return {
        startDate: startOfDay(today),
        endDate: endOfDay(today),
      };
    case 'yesterday':
      return {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday),
      };
    case 'thisWeek':
      return {
        startDate: startOfWeek(today, { weekStartsOn: 1 }),
        endDate: endOfDay(today),
      };
    case 'lastWeek': {
      const lastWeekStart = startOfWeek(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn: 1 });
      return {
        startDate: lastWeekStart,
        endDate: lastWeekEnd,
      };
    }
    case 'thisMonth':
      return {
        startDate: startOfMonth(today),
        endDate: endOfDay(today),
      };
    case 'lastMonth': {
      const lastMonth = subMonths(today, 1);
      return {
        startDate: startOfMonth(lastMonth),
        endDate: endOfMonth(lastMonth),
      };
    }
    case 'custom':
    default:
      return {
        startDate: startOfDay(today),
        endDate: endOfDay(today),
      };
  }
}