'use client';

import { Card, CardHeader, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button } from '@/components/ui';

// Mock payment methods data
const MOCK_PAYMENT_METHODS = [
    { id: 1, name: 'PayPal', type: 'E-Wallet', status: 'active', companies: 12 },
    { id: 2, name: 'Visa/Mastercard', type: 'Credit Card', status: 'active', companies: 15 },
    { id: 3, name: 'Bank Transfer', type: 'Bank', status: 'active', companies: 8 },
    { id: 4, name: 'Cryptocurrency', type: 'Crypto', status: 'active', companies: 5 },
    { id: 5, name: 'Google Pay', type: 'E-Wallet', status: 'inactive', companies: 0 },
];

export function SuperAdminPaymentSettings() {
    return (
        <div>
            {/* Superadmin Badge */}
            <div className="mb-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 px-4 py-3 flex items-center gap-2 rounded-lg">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-medium text-primary">Superadmin View - System Payment Configuration</span>
            </div>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Payment Methods</h1>
                    <p className="text-muted-foreground mt-1">Configure payment methods for the entire platform (Mock Data)</p>
                </div>
                <Button>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Payment Method
                </Button>
            </div>

            {/* Payment Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Methods</div>
                        <div className="text-2xl font-bold text-foreground mt-1">{MOCK_PAYMENT_METHODS.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Active</div>
                        <div className="text-2xl font-bold text-green-600 mt-1">
                            {MOCK_PAYMENT_METHODS.filter(p => p.status === 'active').length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Companies Using</div>
                        <div className="text-2xl font-bold text-foreground mt-1">
                            {Math.max(...MOCK_PAYMENT_METHODS.map(p => p.companies))}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Payment Types</div>
                        <div className="text-2xl font-bold text-foreground mt-1">
                            {new Set(MOCK_PAYMENT_METHODS.map(p => p.type)).size}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payment Methods Table */}
            <Card>
                <CardHeader>
                    <h2 className="text-lg font-semibold">All Payment Methods</h2>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Method Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Companies Using</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {MOCK_PAYMENT_METHODS.map((method) => (
                                <TableRow key={method.id}>
                                    <TableCell className="font-medium">{method.name}</TableCell>
                                    <TableCell>{method.type}</TableCell>
                                    <TableCell>
                                        <Badge variant={method.status === 'active' ? 'success' : 'default'}>
                                            {method.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{method.companies}</TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" variant="ghost">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
