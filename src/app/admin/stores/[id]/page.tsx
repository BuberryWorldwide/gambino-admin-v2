'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AdminLayout from '@/components/layout/AdminLayout';

export default function StoreDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;
  
  const [store, setStore] = useState<any>(null);
  const [todayData, setTodayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Date navigation state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateString = selectedDate.toISOString().split('T')[0];

  useEffect(() => {
    loadStoreData();
  }, [storeId]);

  useEffect(() => {
    // Reload data when date changes
    if (store) {
      loadDailyReports();
    }
  }, [selectedDate, store]);

  const loadStoreData = async () => {
    try {
      setLoading(true);
      
      // Load store details
      const storeRes = await api.get(`/api/admin/stores/${storeId}`);
      setStore(storeRes.data.store);
      
      // Load reports for selected date
      await loadDailyReports();
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDailyReports = async () => {
    try {
      const reportsRes = await api.get(`/api/admin/reports/daily/${storeId}`, {
        params: { date: dateString }
      });
      setTodayData(reportsRes.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setTodayData(null);
    }
  };

  // Date navigation helpers
  const goToPrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  const calculateTotals = () => {
    if (!todayData?.reports || todayData.reports.length === 0) {
      return { moneyIn: 0, moneyOut: 0, net: 0, machineCount: 0, reportCount: 0, pendingCount: 0 };
    }
    
    // Include both 'included' and 'pending' reports
    const activeReports = todayData.reports.filter(
      (r: any) => r.reconciliationStatus === 'included' || r.reconciliationStatus === 'pending'
    );
    
    const includedCount = todayData.reports.filter(
      (r: any) => r.reconciliationStatus === 'included'
    ).length;
    
    const pendingCount = todayData.reports.filter(
      (r: any) => r.reconciliationStatus === 'pending'
    ).length;
    
    const machines = new Set();
    let totalMoneyIn = 0;
    let totalNet = 0;
    
    activeReports.forEach((report: any) => {
      report.machineData?.forEach((machine: any) => {
        machines.add(machine.machineId);
        totalMoneyIn += machine.moneyIn || 0;
        totalNet += machine.netRevenue || 0;
      });
    });
    
    return {
      moneyIn: totalMoneyIn,
      net: totalNet,
      moneyOut: totalMoneyIn - totalNet,
      machineCount: machines.size,
      reportCount: includedCount,
      pendingCount: pendingCount
    };
  };

  const getMachineBreakdown = () => {
    if (!todayData?.reports) return [];
    
    const machineMap = new Map();
    
    // Process both included AND pending reports
    todayData.reports
      .filter((r: any) => r.reconciliationStatus === 'included' || r.reconciliationStatus === 'pending')
      .forEach((report: any) => {
        report.machineData?.forEach((machine: any) => {
          if (!machineMap.has(machine.machineId)) {
            machineMap.set(machine.machineId, {
              machineId: machine.machineId,
              moneyIn: 0,
              net: 0,
              moneyOut: 0
            });
          }
          const m = machineMap.get(machine.machineId);
          m.moneyIn += machine.moneyIn || 0;
          m.net += machine.netRevenue || 0;
        });
      });
    
    // Calculate money out for each machine
    return Array.from(machineMap.values()).map(m => ({
      ...m,
      moneyOut: m.moneyIn - m.net
    }));
  };

  const approvePendingReports = async () => {
    if (!todayData?.reports) return;
    
    const pendingReports = todayData.reports.filter(
      (r: any) => r.reconciliationStatus === 'pending'
    );
    
    if (pendingReports.length === 0) return;
    
    try {
      // Approve all pending reports for this date
      await Promise.all(
        pendingReports.map((report: any) =>
          api.put(`/api/admin/reports/${report._id}`, {
            reconciliationStatus: 'included',
            notes: 'Approved from store dashboard'
          })
        )
      );
      
      // Reload the data
      await loadDailyReports();
      alert(`✅ Approved ${pendingReports.length} report(s) for ${selectedDate.toLocaleDateString()}`);
    } catch (err) {
      console.error('Failed to approve reports:', err);
      alert('Failed to approve reports. Please try again.');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-white">Loading store data...</div>
        </div>
      </AdminLayout>
    );
  }

  const totals = calculateTotals();
  const machineBreakdown = getMachineBreakdown();

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">{store?.storeName}</h1>
            <p className="text-gray-400 mt-1">
              {store?.city}, {store?.state}
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => router.push('/stores')} variant="outline">
              Back to Stores
            </Button>
            <Button 
              onClick={() => router.push(`/stores/${storeId}/reconcile`)}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Submit Daily Report
            </Button>
          </div>
        </div>

        {/* Date Navigator */}
        <Card className="bg-gray-900 border-gray-800 p-6 mb-6">
          <div className="flex items-center justify-between">
            <Button 
              onClick={goToPrevDay} 
              variant="outline"
              className="border-gray-700 hover:bg-gray-800"
            >
              ← Previous Day
            </Button>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h2>
              {!isToday() && (
                <button 
                  onClick={goToToday} 
                  className="text-sm text-blue-400 hover:text-blue-300 hover:underline mt-1"
                >
                  Jump to Today
                </button>
              )}
            </div>
            
            <Button 
              onClick={goToNextDay} 
              disabled={isToday()}
              variant="outline"
              className="border-gray-700 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Day →
            </Button>
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          <Card className="p-6 bg-gray-900 border-gray-800">
            <div className="text-sm text-gray-400 mb-2">Money IN</div>
            <div className="text-3xl font-bold text-green-400">
              ${totals.moneyIn.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Cash inserted</div>
          </Card>
          
          <Card className="p-6 bg-gray-900 border-gray-800">
            <div className="text-sm text-gray-400 mb-2">Money OUT</div>
            <div className="text-3xl font-bold text-red-400">
              ${totals.moneyOut.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Vouchers paid</div>
          </Card>
          
          <Card className="p-6 bg-gray-900 border-gray-800">
            <div className="text-sm text-gray-400 mb-2">Net Revenue</div>
            <div className="text-3xl font-bold text-yellow-400">
              ${totals.net.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Total profit</div>
          </Card>
          
          <Card className="p-6 bg-gray-900 border-gray-800">
            <div className="text-sm text-gray-400 mb-2">Machines</div>
            <div className="text-3xl font-bold text-white">{totals.machineCount}</div>
            <div className="text-xs text-gray-500 mt-1">
              {totals.reportCount} included
              {totals.pendingCount > 0 && `, ${totals.pendingCount} pending`}
            </div>
          </Card>
        </div>

        {/* Info Banner - No Data */}
        {totals.reportCount === 0 && totals.pendingCount === 0 && (
          <Card className="p-4 bg-blue-900/20 border-blue-500/30 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-2xl">ℹ️</div>
              <div>
                <h3 className="text-blue-300 font-semibold mb-1">No Data for This Date</h3>
                <p className="text-blue-200 text-sm">
                  No reports found for {selectedDate.toLocaleDateString()}. Reports are automatically created when you press the "Daily Report" button on the Mutha Goose at the end of each day.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Pending Reports Banner with Approve Button */}
        {totals.pendingCount > 0 && (
          <Card className="p-4 bg-yellow-900/20 border-yellow-500/30 mb-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="text-2xl">⏳</div>
                <div>
                  <h3 className="text-yellow-300 font-semibold mb-1">
                    {totals.pendingCount} Pending Report{totals.pendingCount !== 1 ? 's' : ''}
                  </h3>
                  <p className="text-yellow-200 text-sm">
                    These reports came from the Mutha Goose but haven't been approved yet. 
                    The data is showing above but won't count in official totals until you approve it.
                  </p>
                </div>
              </div>
              <Button 
                onClick={approvePendingReports}
                className="bg-green-600 hover:bg-green-700 shrink-0"
              >
                ✓ Approve All
              </Button>
            </div>
          </Card>
        )}

        {/* Machine Breakdown Table */}
        <Card className="bg-gray-900 border-gray-800">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-xl font-bold text-white">Machine Breakdown</h2>
            <p className="text-sm text-gray-400 mt-1">Revenue by machine for this date</p>
          </div>
          
          {machineBreakdown.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <div className="text-4xl mb-3">📊</div>
              <div className="font-medium">No machine data for this date</div>
              <div className="text-sm text-gray-500 mt-1">
                Press the daily report button on the Mutha Goose to generate data
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-gray-800/50">
                  <TableHead className="text-gray-400">Machine ID</TableHead>
                  <TableHead className="text-gray-400 text-right">Money IN</TableHead>
                  <TableHead className="text-gray-400 text-right">Money OUT</TableHead>
                  <TableHead className="text-gray-400 text-right">Net Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machineBreakdown.map((machine) => (
                  <TableRow key={machine.machineId} className="border-gray-800 hover:bg-gray-800/50">
                    <TableCell className="font-mono text-white font-medium">
                      {machine.machineId}
                    </TableCell>
                    <TableCell className="text-right text-green-400 font-medium">
                      ${machine.moneyIn.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-red-400 font-medium">
                      ${machine.moneyOut.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-yellow-400 font-bold">
                      ${machine.net.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Totals Row */}
                <TableRow className="border-t-2 border-gray-700 bg-gray-800/50">
                  <TableCell className="font-bold text-white">TOTALS</TableCell>
                  <TableCell className="text-right text-green-400 font-bold">
                    ${totals.moneyIn.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-red-400 font-bold">
                    ${totals.moneyOut.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-yellow-400 font-bold text-lg">
                    ${totals.net.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}