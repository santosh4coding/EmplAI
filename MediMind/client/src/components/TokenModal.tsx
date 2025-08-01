import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode, Download, Printer, Copy, Clock, MapPin, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TokenData {
  tokenNumber: string;
  qrCode: string;
  patientName: string;
  department: string;
  estimatedWaitTime: number;
  appointmentTime?: string;
  consultationRoom?: string;
  instructions?: string;
}

interface TokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenData: TokenData | null;
}

export default function TokenModal({ isOpen, onClose, tokenData }: TokenModalProps) {
  const { toast } = useToast();

  if (!tokenData) return null;

  const handleCopyToken = () => {
    navigator.clipboard.writeText(tokenData.tokenNumber);
    toast({
      title: "Token Copied",
      description: "Token number has been copied to clipboard",
    });
  };

  const handlePrintToken = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Patient Token - ${tokenData.tokenNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              text-align: center;
            }
            .token-container {
              border: 2px solid #333;
              padding: 20px;
              margin: 20px auto;
              max-width: 400px;
              border-radius: 10px;
            }
            .token-number {
              font-size: 48px;
              font-weight: bold;
              color: #16a34a;
              margin: 20px 0;
            }
            .qr-code {
              margin: 20px 0;
            }
            .info {
              text-align: left;
              margin: 15px 0;
            }
            .info strong {
              display: inline-block;
              width: 120px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="token-container">
            <h1>Hospital Queue Token</h1>
            <div class="token-number">${tokenData.tokenNumber}</div>
            <div class="qr-code">
              <img src="${tokenData.qrCode}" alt="QR Code" style="width: 150px; height: 150px;" />
            </div>
            <div class="info">
              <div><strong>Patient:</strong> ${tokenData.patientName}</div>
              <div><strong>Department:</strong> ${tokenData.department}</div>
              <div><strong>Est. Wait:</strong> ${tokenData.estimatedWaitTime} minutes</div>
              ${tokenData.appointmentTime ? `<div><strong>Appointment:</strong> ${tokenData.appointmentTime}</div>` : ''}
              ${tokenData.consultationRoom ? `<div><strong>Room:</strong> ${tokenData.consultationRoom}</div>` : ''}
            </div>
            ${tokenData.instructions ? `<div style="margin-top: 20px; padding: 10px; background: #f0f0f0; border-radius: 5px; text-align: left;"><strong>Instructions:</strong><br/>${tokenData.instructions}</div>` : ''}
            <div style="margin-top: 20px; font-size: 12px; color: #666;">
              Please keep this token safe and present it when called.
            </div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
    
    toast({
      title: "Token Sent to Printer",
      description: "The token has been sent to the printer",
    });
  };

  const handleDownloadQR = () => {
    // Create a download link for the QR code
    const link = document.createElement('a');
    link.href = tokenData.qrCode;
    link.download = `token-${tokenData.tokenNumber}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "QR Code Downloaded",
      description: "QR code has been downloaded to your device",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Queue Token Generated</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Token Display */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <Badge variant="secondary" className="text-xs mb-2">
                  Your Token Number
                </Badge>
                <div className="text-4xl font-bold text-green-600 mb-2">
                  {tokenData.tokenNumber}
                </div>
                <p className="text-sm text-gray-600">
                  Department: {tokenData.department}
                </p>
              </div>
              
              {/* QR Code */}
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-white rounded-lg border">
                  <img 
                    src={tokenData.qrCode} 
                    alt="QR Code" 
                    className="w-32 h-32"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patient Information */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Patient:</span>
              <span>{tokenData.patientName}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Estimated Wait:</span>
              <span>{tokenData.estimatedWaitTime} minutes</span>
            </div>
            
            {tokenData.appointmentTime && (
              <div className="flex items-center space-x-2">
                <span className="font-medium">Appointment Time:</span>
                <span>{tokenData.appointmentTime}</span>
              </div>
            )}
            
            {tokenData.consultationRoom && (
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Room:</span>
                <span>{tokenData.consultationRoom}</span>
              </div>
            )}
          </div>

          {/* Instructions */}
          {tokenData.instructions && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
              <p className="text-sm text-blue-800">{tokenData.instructions}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleCopyToken} variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Copy Token
            </Button>
            <Button onClick={handleDownloadQR} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download QR
            </Button>
            <Button onClick={handlePrintToken} variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print Token
            </Button>
            <Button onClick={onClose} size="sm">
              Done
            </Button>
          </div>

          {/* Footer Notice */}
          <div className="text-xs text-gray-500 text-center p-2 bg-gray-50 rounded">
            Please keep this token safe and present it when your number is called.
            You will receive notifications via SMS when it's your turn.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}