import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
  includeMargin?: boolean;
  // Bitcoin/Ethereum URI formatting
  chain?: 'bitcoin' | 'ethereum' | 'solana';
}

export function QRCode({ value, size = 200, className = '', includeMargin = true, chain }: QRCodeProps) {
  // Format as proper URI for wallet scanning
  let qrValue = value;
  if (chain === 'bitcoin' && !value.startsWith('bitcoin:')) {
    qrValue = `bitcoin:${value}`;
  } else if (chain === 'ethereum' && !value.startsWith('ethereum:')) {
    qrValue = `ethereum:${value}`;
  } else if (chain === 'solana' && !value.startsWith('solana:')) {
    qrValue = `solana:${value}`;
  }

  return (
    <div className={`inline-block p-4 bg-white rounded-2xl ${className}`}>
      <QRCodeSVG
        value={qrValue}
        size={size}
        level="M"
        includeMargin={includeMargin}
        bgColor="#ffffff"
        fgColor="#000000"
      />
    </div>
  );
}
