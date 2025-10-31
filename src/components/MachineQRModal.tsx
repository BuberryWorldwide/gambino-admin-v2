// src/components/MachineQRModal.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Download, Loader2, Printer } from 'lucide-react';
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
  useMachineIdEndpoint?: boolean; // NEW: Flag to use machineId endpoint instead of _id
}

interface QRCodeData {
  qrCodeUrl: string;
  bindingToken: string;
  expiresAt: string;
}

export default function MachineQRModal({ 
  machine, 
  storeId, 
  onClose,
  useMachineIdEndpoint = false 
}: MachineQRModalProps) {
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadQRCode = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Choose the correct API endpoint based on what's available
      const endpoint = useMachineIdEndpoint || !machine._id
        ? `/api/machines/by-machine-id/${machine.machineId}/qr-code`
        : `/api/machines/${machine._id}/qr-code`;
      
      console.log('🔍 API URL:', endpoint);
      
      const response = await api.get(endpoint);
      
      if (response.data.success) {
        // Map backend response fields to our interface
        setQrData({
          qrCodeUrl: response.data.qrCode,  // Backend returns 'qrCode', not 'qrCodeUrl'
          bindingToken: response.data.qrToken || response.data.bindingToken || '',
          expiresAt: response.data.generated || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
      } else {
        setError('Failed to generate QR code');
      }
    } catch (err: any) {
      console.error('QR code generation error:', err);
      setError(err.response?.data?.error || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  }, [machine._id, machine.machineId, useMachineIdEndpoint]);

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
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .qr-container {
              text-align: center;
              border: 2px solid #000;
              padding: 30px;
              margin: 20px;
            }
            img {
              max-width: 400px;
              height: auto;
            }
            h1 {
              margin-bottom: 10px;
              font-size: 24px;
            }
            .machine-id {
              font-family: monospace;
              font-size: 18px;
              font-weight: bold;
              margin: 10px 0;
            }
            .instructions {
              text-align: left;
              margin-top: 20px;
              padding: 20px;
              background: #f5f5f5;
              border-radius: 5px;
            }
            .instructions h2 {
              margin-top: 0;
            }
            .instructions ol {
              margin: 10px 0;
              padding-left: 20px;
            }
            .instructions li {
              margin: 5px 0;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>Gambino Machine QR Code</h1>
            <p class="machine-id">${machine.machineId}</p>
            ${machine.name ? `<p>${machine.name}</p>` : ''}
            <img src="${qrData.qrCodeUrl}" alt="Machine QR Code" />
            <p><strong>Hub:</strong> ${machine.hubMachineId}</p>
            <p><strong>Store:</strong> ${storeId}</p>
          </div>
          <div class="instructions">
            <h2>User Instructions:</h2>
            <ol>
              <li>Open the Gambino app on your phone</li>
              <li>Navigate to the "Scan Machine" section</li>
              <li>Scan this QR code</li>
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
                    <span className="text-gray-600 dark:text-gray-400">Generated:</span>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(qrData.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  How to Use
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <li>Open the Gambino app on your mobile device</li>
                  <li>Navigate to the "Scan Machine" section</li>
                  <li>Point your camera at this QR code</li>
                  <li>Verify the machine details match</li>
                  <li>Complete the binding process</li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download QR Code
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
                >
                  <Printer className="w-5 h-5" />
                  Print QR Code
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}