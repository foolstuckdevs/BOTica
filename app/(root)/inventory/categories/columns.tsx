'use client';

import { Categories } from '@/types';
import { ColumnDef } from '@tanstack/react-table';

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
// export type Categories = {
//   id: string;
//   name: string;
//   description: string | null;
// };

export const columns: ColumnDef<Categories>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'description',
    header: 'Description',
  },
  {
    accessorKey: 'action',
    header: 'Action',
  },
];
