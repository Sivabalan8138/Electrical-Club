import fs from 'fs';
import path from 'path';

const SETTINGS_PATH = path.join(__dirname, '../../uploads/certificate_settings.json');

export interface TextPosition {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
}

export interface QrPosition {
  x: number;
  y: number;
  size: number;
}

export interface CertificateSettings {
  name: TextPosition;
  department: TextPosition;
  qrCode: QrPosition;
}

const DEFAULT_SETTINGS: CertificateSettings = {
  name: { x: 420, y: 280, fontSize: 32, color: '#000000', fontFamily: 'Helvetica-Bold' },
  department: { x: 420, y: 340, fontSize: 16, color: '#333333', fontFamily: 'Helvetica' },
  qrCode: { x: 50, y: 450, size: 100 },
};

export const getCertificateSettings = (): CertificateSettings => {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const data = fs.readFileSync(SETTINGS_PATH, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Failed to read certificate settings:', error);
  }
  return DEFAULT_SETTINGS;
};

export const saveCertificateSettings = (settings: CertificateSettings): void => {
  try {
    const dir = path.dirname(SETTINGS_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write certificate settings:', error);
    throw new Error('Could not save certificate settings');
  }
};
