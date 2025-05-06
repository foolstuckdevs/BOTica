import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// export const formatDate = (dateString: string): string => {
//   return dayjs(dateString).format("MMMM DD, YYYY");
// };
