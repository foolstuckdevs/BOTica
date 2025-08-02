# Validation Schemas

This directory contains organized Zod validation schemas for the pharmacy POS system.

## Structure

```
/lib/validations/
├── index.ts           # Exports all validation schemas
├── common.ts          # Shared schemas (IDs, enums, etc.)
├── user.ts            # Authentication and user schemas
├── product.ts         # Product and stock management schemas
├── sales.ts           # Sales, transactions, and reports schemas
├── supplier.ts        # Supplier management schemas
├── category.ts        # Category management schemas
├── inventory.ts       # Inventory adjustments schemas
└── purchase-order.ts  # Purchase order workflows schemas
```

## Usage

### Import from the main index

```typescript
import {
  productSchema,
  createProductSchema,
  signInSchema,
} from '@/lib/validations';
```

### Import from specific modules (for better tree-shaking)

```typescript
import { productSchema } from '@/lib/validations/product';
import { signInSchema } from '@/lib/validations/user';
```

## Schema Categories

### Common Schemas (`common.ts`)

- `pharmacyIdSchema` - Pharmacy ID validation
- `userIdSchema` - User ID validation
- `productIdSchema` - Product ID validation
- Enum schemas: dosage forms, units, payment methods, etc.

### User Schemas (`user.ts`)

- `signInSchema` - Login validation
- `userSchema` - Admin user creation validation
- `updateUserSchema` - User update validation

### Product Schemas (`product.ts`)

- `productSchema` - Base product validation
- `createProductSchema` - Product creation
- `updateProductSchema` - Product updates
- Stock-related schemas

### Sales Schemas (`sales.ts`)

- `processSaleSchema` - Sale processing
- `cartItemSchema` - Cart validation
- Sales report schemas

### And more...

## Benefits

1. **Organized**: Schemas grouped by domain/feature
2. **Maintainable**: Easy to find and modify schemas
3. **Tree-shakable**: Import only what you need
4. **Type-safe**: Full TypeScript integration
5. **Reusable**: Common schemas shared across modules
