'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import Image from 'next/image';

interface MachineQRModalProps {
  machine: {
    _id: string;
    machineId: string;
    hubMachineId: string;
    name?: string;
  };
  storeId: string;
  onClose: () => void;
}

interface QRCodeData {
  qrCodeUrl: string;
  bindingToken: string;
  expiresAt: string;
}

export default function MachineQRModal({ machine, storeId, onClose }: MachineQRModalProps) {
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadQRCode = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.post(`/api/admin/machines/${machine._id}/qr-code`);
      
      if (response.data.success) {
        setQrData(response.data);
      } else {
        setError('Failed to generate QR code');
      }
    } catch (err) {
      console.error('QR code generation error:', err);
      setError('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  }, [machine._id]);

  useEffect(() => {
    loadQRCode();
  }, [loadQRCode]);

  const handleDownload = () => {
    if (!qrData?.qrCodeUrl) return;

    const link = document.createElement('a');
    link.href = qrData.qrCodeUrl;
    link.download = `${machine.machineId}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!qrData?.qrCodeUrl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Machine QR Code - ${machine.machineId}</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 1cm; }
            }
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .qr-container {
              text-align: center;
              page-break-inside: avoid;
            }
            img {
              max-width: 400px;
              height: auto;
            }
            .info {
              margin-top: 20px;
              text-align: center;
            }
            .machine-id {
              font-size: 24px;
              font-weight: bold;
              margin: 10px 0;
            }
            .instructions {
              margin-top: 30px;
              padding: 20px;
              background: #f5f5f5;
              border-radius: 8px;
              max-width: 500px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Gambino Gold</h1>
            <h2>Machine Binding QR Code</h2>
          </div>
          <div class="qr-container">
            <img src="${qrData.qrCodeUrl}" alt="QR Code" />
            <div class="info">
              <div class="machine-id">${machine.machineId}</div>
              <div>${machine.name || 'Gaming Machine'}</div>
              <div>Store: ${storeId}</div>
            </div>
          </div>
          <div class="instructions">
            <h3>Setup Instructions:</h3>
            <ol>
              <li>Scan this QR code with the Gambino Hub device</li>
              <li>Confirm the machine details match</li>
              <li>Complete the binding process</li>
              <li>Test the connection</li>
            </ol>
            <p><strong>Note:</strong> This QR code expires in 24 hours</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Machine QR Code
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {machine.machineId} - {machine.name || 'Gaming Machine'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Generating QR code...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={loadQRCode}
                className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
              >
                Try Again
              </button>
            </div>
          )}

          {qrData && !loading && (
            <div className="space-y-6">
              {/* QR Code Display */}
              <div className="flex justify-center">
                <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
                  <Image
                    src={qrData.qrCodeUrl}
                    alt="Machine QR Code"
                    width={300}
                    height={300}
                    className="w-full h-auto"
                  />
                </div>
              </div>

              {/* Machine Info */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Machine ID:</span>
                    <p className="font-mono font-semibold text-gray-900 dark:text-white">
                      {machine.machineId}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Hub Machine ID:</span>
                    <p className="font-mono font-semibold text-gray-900 dark:text-white">
                      {machine.hubMachineId}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Store ID:</span>
                    <p className="font-mono font-semibold text-gray-900 dark:text-white">
                      {storeId}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Expires:</span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {new Date(qrData.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Setup Instructions:
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <li>Scan this QR code with your Gambino Hub device</li>
                  <li>Confirm the machine details match your gaming machine</li>
                  <li>Complete the binding process on the hub</li>
                  <li>Test the connection to ensure data is flowing</li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download QR Code
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                >
                  Print
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}