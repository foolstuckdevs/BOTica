'use client';

import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface StrengthCriteria {
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

const PasswordStrengthIndicator = ({
  password,
}: PasswordStrengthIndicatorProps) => {
  const [criteria, setCriteria] = useState<StrengthCriteria[]>([
    {
      label: 'At least 8 characters',
      test: (pwd) => pwd.length >= 8,
      met: false,
    },
    {
      label: 'Contains uppercase letter',
      test: (pwd) => /[A-Z]/.test(pwd),
      met: false,
    },
    {
      label: 'Contains lowercase letter',
      test: (pwd) => /[a-z]/.test(pwd),
      met: false,
    },
    { label: 'Contains number', test: (pwd) => /\d/.test(pwd), met: false },
    {
      label: 'Contains special character',
      test: (pwd) => /[^A-Za-z\d]/.test(pwd),
      met: false,
    },
  ]);

  useEffect(() => {
    setCriteria((prev) =>
      prev.map((criterion) => ({
        ...criterion,
        met: criterion.test(password),
      })),
    );
  }, [password]);

  const metCriteria = criteria.filter((c) => c.met).length;
  const strengthPercentage = (metCriteria / criteria.length) * 100;

  const getStrengthColor = () => {
    if (strengthPercentage <= 20) return 'bg-red-500';
    if (strengthPercentage <= 40) return 'bg-orange-500';
    if (strengthPercentage <= 60) return 'bg-yellow-500';
    if (strengthPercentage <= 80) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (strengthPercentage <= 20) return 'Very Weak';
    if (strengthPercentage <= 40) return 'Weak';
    if (strengthPercentage <= 60) return 'Fair';
    if (strengthPercentage <= 80) return 'Good';
    return 'Strong';
  };

  if (!password) return null;

  return (
    <div className="space-y-3">
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-300">
            Password strength:
          </span>
          <span
            className={`font-medium ${getStrengthColor().replace(
              'bg-',
              'text-',
            )}`}
          >
            {getStrengthText()}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>
      </div>

      {/* Criteria List */}
      <div className="space-y-2">
        {criteria.map((criterion, index) => (
          <div key={index} className="flex items-center space-x-2">
            {criterion.met ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-red-500" />
            )}
            <span
              className={`text-sm ${
                criterion.met
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {criterion.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
