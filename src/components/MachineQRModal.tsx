'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Printer, Download, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Machine {
  _id: string;
  machineId: string;
  name?: string;
  storeId: string;
}

interface MachineQRModalProps {
  machine: Machine;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function MachineQRModal({ machine, onClose, onRefresh }: MachineQRModalProps) {
  const [qrCode, setQRCode] = useState<string | null>(null);
  const [bindUrl, setBindUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadQRCode();
  }, [machine._id]);

  const loadQRCode = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/machines/${machine._id}/qr-code`);
      setQRCode(res.data.qrCode);
      setBindUrl(res.data.bindUrl);
    } catch (err) {
      console.error('Failed to load QR code:', err);
    } finally {
      setLoading(false);
    }
  };

  const regenerateQR = async () => {
    try {
      setLoading(true);
      const res = await api.post(`/api/machines/${machine._id}/regenerate-qr`);
      setQRCode(res.data.qrCode);
      setBindUrl(res.data.bindUrl);
      if (onRefresh) onRefresh();
      alert('QR code regenerated successfully!');
    } catch (err) {
      console.error('Failed to regenerate QR:', err);
      alert('Failed to regenerate QR code');
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(bindUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    if (!qrCode) return;
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `${machine.machineId}-qr.png`;
    link.click();
  };

  const printQR = () => {
    if (!qrCode) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${machine.machineId}</title>
          <style>
            body { 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            img { width: 400px; height: 400px; }
            h2 { margin: 20px 0 10px; }
            p { margin: 5px 0; color: #666; }
          </style>
        </head>
        <body>
          <img src="${qrCode}" alt="QR Code" />
          <h2>${machine.name || machine.machineId}</h2>
          <p>Machine ID: ${machine.machineId}</p>
          <p>Scan to bind your account</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Machine QR Code
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {machine.name || machine.machineId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* QR Code Display */}
          <div className="flex flex-col items-center">
            {loading ? (
              <div className="w-64 h-64 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : qrCode ? (
              <img 
                src={qrCode} 
                alt="QR Code" 
                className="w-64 h-64 border-4 border-gray-200 dark:border-gray-700 rounded"
              />
            ) : (
              <div className="w-64 h-64 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center text-gray-500">
                No QR Code
              </div>
            )}
            
            <div className="mt-4 flex gap-2">
              <Button onClick={regenerateQR} disabled={loading} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
              <Button onClick={printQR} variant="outline" size="sm" disabled={!qrCode}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button onClick={downloadQR} variant="outline" size="sm" disabled={!qrCode}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
          
          {/* Info & Bind URL */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                Machine ID
              </label>
              <p className="font-mono text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded">
                {machine.machineId}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                Bind URL
              </label>
              <div className="flex gap-2">
                <Input 
                  value={bindUrl} 
                  readOnly 
                  className="text-xs font-mono"
                />
                <Button onClick={copyUrl} size="sm" variant="outline">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  ✓ Copied to clipboard!
                </p>
              )}
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2">
                Instructions
              </h3>
              <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                <li>Print or download this QR code</li>
                <li>Attach it to the physical machine</li>
                <li>Players scan to bind their account</li>
                <li>All transactions tracked to player</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}