'use client';

import { Card, CardHeader, CardContent } from '@/components/ui';

export default function BonusesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Bonuses</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage all bonus types and configurations
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Purchase Bonuses</h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">Manage bonuses for purchases</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recharge Bonuses</h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">Manage game recharge bonuses</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Transfer Bonuses</h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">Manage balance transfer bonuses</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Signup Bonuses</h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">Manage welcome bonuses</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

