'use client';

import { Card, CardHeader, CardContent } from '@/components/ui';

export default function BonusesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-6">Bonuses</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Purchase Bonuses</h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Manage bonuses for purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Recharge Bonuses</h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Manage game recharge bonuses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Transfer Bonuses</h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Manage balance transfer bonuses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Signup Bonuses</h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Manage welcome bonuses</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

