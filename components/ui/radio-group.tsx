// components/ui/radio-group.tsx
import * as React from 'react';
import { Label } from './label';

const RadioGroupContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
} | null>(null);

export const RadioGroup = ({
  value,
  onValueChange,
  className,
  children,
  ...props
}: {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div className={className} {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
};

export const RadioGroupItem = ({
  value,
  id,
  className,
  ...props
}: {
  value: string;
  id: string;
  className?: string;
}) => {
  const context = React.useContext(RadioGroupContext);
  if (!context) {
    throw new Error('RadioGroupItem must be used within a RadioGroup');
  }

  return (
    <div className="flex items-center space-x-2">
      <input
        type="radio"
        id={id}
        checked={context.value === value}
        onChange={() => context.onValueChange(value)}
        className={`h-4 w-4 text-primary focus:ring-primary ${className}`}
        {...props}
      />
      <Label htmlFor={id}>{value}</Label>
    </div>
  );
};