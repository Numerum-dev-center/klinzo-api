import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { YeriaApp } from '@numerum-tech/yeriasdk';

let publicAppInstance: YeriaApp | null = null;
let agentAppInstance: YeriaApp | null = null;

function loadKeys() {
  const envPrivateKey = process.env.YERIA_PRIVATE_KEY?.trim();
  const envPublicKey = process.env.YERIA_PUBLIC_KEY?.trim();
  if (envPrivateKey && envPublicKey) {
    return {
      privateKey: envPrivateKey.replace(/\\n/g, '\n'),
      publicKey: envPublicKey.replace(/\\n/g, '\n'),
    };
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'YERIA_PRIVATE_KEY and YERIA_PUBLIC_KEY must be set in production.',
    );
  }

  const keysDir = path.join(process.cwd(), 'storage', 'keys');
  const privPath = path.join(keysDir, 'private.pem');
  const pubPath = path.join(keysDir, 'public.pem');

  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  if (!fs.existsSync(privPath) || !fs.existsSync(pubPath)) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    fs.writeFileSync(
      privPath,
      privateKey.export({ type: 'pkcs8', format: 'pem' }),
      { mode: 0o600 },
    );
    fs.writeFileSync(
      pubPath,
      publicKey.export({ type: 'spki', format: 'pem' }),
      { mode: 0o644 },
    );
  }

  return {
    privateKey: fs.readFileSync(privPath, 'utf8'),
    publicKey: fs.readFileSync(pubPath, 'utf8'),
  };
}

// 1. Service Public (Clients, Découverte, Abonnements Déchets, Mes Bacs)
export function getYeriaPublicApp(): YeriaApp {
  if (publicAppInstance) {
    return publicAppInstance;
  }
  const { privateKey, publicKey } = loadKeys();
  const serviceBaseUrl = getBaseBackendUrl();
  const serviceId = getYeriaPublicServiceId();

  publicAppInstance = new YeriaApp({
    appId: serviceId,
    privateKey,
    publicKey,
    baseUrl: `${serviceBaseUrl}/yeria`,
    viewExpirationMinutes: 120,
  });

  return publicAppInstance;
}

// 2. Service Privé Agent Terrain (Tournées, Scanner QR Bac, Validation Ramassage, Stats)
export function getYeriaAgentApp(): YeriaApp {
  if (agentAppInstance) {
    return agentAppInstance;
  }
  const { privateKey, publicKey } = loadKeys();
  const serviceBaseUrl = getBaseBackendUrl();
  const serviceId = getYeriaAgentServiceId();

  agentAppInstance = new YeriaApp({
    appId: serviceId,
    privateKey,
    publicKey,
    baseUrl: `${serviceBaseUrl}/yeria/agent`,
    viewExpirationMinutes: 120,
  });

  return agentAppInstance;
}

export function getYeriaApp(): YeriaApp {
  return getYeriaPublicApp();
}

export function getYeriaPublicServiceId(): string {
  return process.env.YERIA_PUBLIC_SERVICE_ID || 'klinzo';
}

export function getYeriaAgentServiceId(): string {
  return process.env.YERIA_AGENT_SERVICE_ID || 'klinzo-agent';
}

export function getYeriaServiceId(): string {
  return getYeriaPublicServiceId();
}

export function getBaseBackendUrl(): string {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/^BACKEND_URL=(.+)$/m);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  const port = process.env.PORT || 4000;
  return `http://localhost:${port}`;
}

export function getYeriaAssetUrl(filename: string): string {
  return `/${filename}`;
}

export function getYeriaAbsoluteAssetUrl(filename: string): string {
  const serviceBaseUrl = getBaseBackendUrl();
  return `${serviceBaseUrl}/yeria-assets/${filename}`;
}
