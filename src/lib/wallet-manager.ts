import { Wallet } from 'xrpl';
import { Client } from 'xrpl';
import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import { getDatabase } from './database';

export interface WalletData {
  id?: number;
  address: string;
  encrypted_secret?: string;
  xrp_balance?: number;
  lawas_balance?: number;
  reserved_xrp?: number; // Added for reserved XRP
}

export interface WalletBalances {
  xrp_balance: number;
  lawas_balance: number;
  reserved_xrp: number; // Added for reserved XRP
}

export class WalletManager {
  private client: Client;
  private db = getDatabase();

  constructor() {
    this.client = new Client("wss://v-xrpl.r3store.io");
  }

  private encryptSecret(secret: string, password: string): string {
    return CryptoJS.AES.encrypt(secret, password).toString();
  }

  private decryptSecret(encryptedSecret: string, password: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedSecret, password);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) {
        throw new Error('Invalid password');
      }
      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt wallet: Invalid password');
    }
  }

  public async generateAndStoreWallets(numWallets: number, password: string): Promise<WalletData[]> {
    const wallets: WalletData[] = [];

    for (let i = 0; i < numWallets; i++) {
      // Generate new wallet
      const wallet = Wallet.generate();
      
      // Encrypt the secret
      const encryptedSecret = this.encryptSecret(wallet.seed!, password);
      
      // Store in database
      await this.db.run(
        'INSERT INTO wallets (address, encrypted_secret) VALUES (?, ?)',
        [wallet.address, encryptedSecret]
      );
      
      wallets.push({
        address: wallet.address,
        xrp_balance: 0,
        lawas_balance: 0,
        reserved_xrp: 0
      });
    }

    return wallets;
  }

  public async getAllWallets(): Promise<WalletData[]> {
    const rows = await this.db.all('SELECT * FROM wallets ORDER BY created_at DESC');
    console.log("Raw wallets from DB:", rows); // Added logging
    return rows.map((row: any) => ({ 
      id: row.id,
      address: row.address, 
      encrypted_secret: row.encrypted_secret 
    }));
  }

  public async getWalletByAddress(address: string): Promise<WalletData | null> {
    const row = await this.db.get(
      'SELECT * FROM wallets WHERE address = ?',
      [address]
    );
    
    if (row) {
      return {
        id: row.id,
        address: row.address,
        encrypted_secret: row.encrypted_secret
      };
    }
    
    return null;
  }

  public decryptWallet(walletData: WalletData, password: string): Wallet | null {
    try {
      if (!walletData.encrypted_secret) {
        throw new Error('No encrypted secret found');
      }
      
      const seed = this.decryptSecret(walletData.encrypted_secret, password);
      return Wallet.fromSeed(seed);
    } catch (error) {
      console.error(`Failed to decrypt wallet ${walletData.address}:`, error);
      return null;
    }
  }

  public async getDecryptedWallets(password: string): Promise<Wallet[]> {
    const walletsData = await this.getAllWallets();
    const decryptedWallets: Wallet[] = [];
    console.log("Wallets data from DB (after getAllWallets):", walletsData); // Added logging
    for (const walletInfo of walletsData) {
      const walletData = await this.getWalletByAddress(walletInfo.address);
      if (walletData) {
        const wallet = this.decryptWallet(walletData, password);
        if (wallet) {
          decryptedWallets.push(wallet);
        }
      }
    }
    
    return decryptedWallets;
  }

  public async getWalletBalance(address: string): Promise<number> {
    try {
      if (!this.client.isConnected()) {
        await this.client.connect();
      }

      const response = await this.client.request({
        command: 'account_info',
        account: address
      });

      if (response.result && response.result.account_data) {
        const balanceDrops = response.result.account_data.Balance;
        return parseFloat(balanceDrops) / 1000000; // Convert drops to XRP
      }
      
      return 0;
    } catch (error) {
      console.error(`Error getting balance for ${address}:`, error);
      return 0;
    }
  }

  public async getReservedXRP(address: string): Promise<number> {
    try {
      if (!this.client.isConnected()) {
        await this.client.connect();
      }

      const response = await this.client.request({
        command: 'account_info',
        account: address
      });

      if (response.result && response.result.account_data) {
        const ownerCount = response.result.account_data.OwnerCount || 0;
        // Add checks for info and validated_ledger before accessing properties
        if (response.result.info && response.result.info.validated_ledger) {
          const baseReserve = parseFloat(response.result.info.validated_ledger.reserve_base_xrp);
          const ownerReserve = parseFloat(response.result.info.validated_ledger.reserve_inc_xrp);
          return baseReserve + (ownerCount * ownerReserve);
        } else {
          console.warn(`Missing info or validated_ledger for ${address}. Returning 0 reserved XRP.`);
          return 0;
        }
      }
      return 0;
    } catch (error) {
      console.error(`Error getting reserved XRP for ${address}:`, error);
      return 0;
    }
  }

  public async getTokenBalance(address: string, currency: string, issuer: string): Promise<number> {
    try {
      if (!this.client.isConnected()) {
        await this.client.connect();
      }

      const response = await this.client.request({
        command: 'account_lines',
        account: address
      });

      if (response.result && response.result.lines) {
        const lines = response.result.lines;
        
        for (const line of lines) {
          // Check for both 3-char currency code and hex currency code
          const lineCurrency = line.currency.length === 3 ? line.currency : this.hexToString(line.currency);
          if (lineCurrency === currency && line.account === issuer) {
            return parseFloat(line.balance || '0');
          }
        }
      }
      
      return 0;
    } catch (error) {
      console.error(`Error getting token balance for ${address}:`, error);
      return 0;
    }
  }

  private hexToString(hex: string): string {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str.replace(/\0/g, ''); // Remove null characters
  }

  public async getWalletBalances(address: string): Promise<WalletBalances> {
    try {
      const xrpBalance = await this.getWalletBalance(address);
      const lawasBalance = await this.getTokenBalance(
        address,
        'LAWAS',
        'rfAWYnEAkQGAhbESWAMdNccWJvdcrgugMC'
      );
      const reservedXRP = await this.getReservedXRP(address);

      return {
        xrp_balance: xrpBalance,
        lawas_balance: lawasBalance,
        reserved_xrp: reservedXRP
      };
    } catch (error) {
      console.error(`Error getting wallet balances for ${address}:`, error);
      return {
        xrp_balance: 0,
        lawas_balance: 0,
        reserved_xrp: 0
      };
    }
  }

  public async getAllWalletsWithBalances(): Promise<WalletData[]> {
    const wallets = await this.getAllWallets();
    const walletsWithBalances: WalletData[] = [];

    for (const wallet of wallets) {
      const balances = await this.getWalletBalances(wallet.address);
      walletsWithBalances.push({
        ...wallet,
        ...balances
      });
    }

    return walletsWithBalances;
  }

  public async deleteWallet(address: string): Promise<boolean> {
    try {
      const result = await this.db.run('DELETE FROM wallets WHERE address = ?', [address]);
      return result.changes! > 0;
    } catch (error) {
      console.error(`Error deleting wallet ${address}:`, error);
      return false;
    }
  }

  public async getWalletCount(): Promise<number> {
    const row = await this.db.get('SELECT COUNT(*) as count FROM wallets');
    return row.count;
  }

  public async importWalletFromSeed(seed: string, password: string): Promise<WalletData> {
    try {
      // Create wallet from seed
      const wallet = Wallet.fromSeed(seed);
      
      // Check if wallet already exists
      const existingWallet = await this.getWalletByAddress(wallet.address);
      if (existingWallet) {
        throw new Error('Wallet already exists in database');
      }
      
      // Encrypt the secret
      const encryptedSecret = this.encryptSecret(seed, password);
      
      // Store in database
      await this.db.run(
        'INSERT INTO wallets (address, encrypted_secret) VALUES (?, ?)',
        [wallet.address, encryptedSecret]
      );
      
      // Get balances
      const balances = await this.getWalletBalances(wallet.address);
      
      return {
        address: wallet.address,
        ...balances
      };
    } catch (error) {
      console.error('Error importing wallet from seed:', error);
      throw error;
    }
  }

  public async importWalletFromPrivateKey(privateKey: string, password: string): Promise<WalletData> {
    try {
      // Create wallet from private key
      const wallet = Wallet.fromSecret(privateKey);
      
      // Check if wallet already exists
      const existingWallet = await this.getWalletByAddress(wallet.address);
      if (existingWallet) {
        throw new Error('Wallet already exists in database');
      }
      
      // Encrypt the secret (use seed if available, otherwise private key)
      const secretToEncrypt = wallet.seed || privateKey;
      const encryptedSecret = this.encryptSecret(secretToEncrypt, password);
      
      // Store in database
      await this.db.run(
        'INSERT INTO wallets (address, encrypted_secret) VALUES (?, ?)',
        [wallet.address, encryptedSecret]
      );
      
      // Get balances
      const balances = await this.getWalletBalances(wallet.address);
      
      return {
        address: wallet.address,
        ...balances
      };
    } catch (error) {
      console.error('Error importing wallet from private key:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client.isConnected()) {
      await this.client.disconnect();
    }
  }

  public async checkAccountExistence(address: string): Promise<boolean> {
    try {
      if (!this.client.isConnected()) {
        await this.client.connect();
      }
      await this.client.request({
        command: 'account_info',
        account: address
      });
      return true;
    } catch (error: any) {
      if (error.message === 'Account not found.') {
        return false;
      }
      console.error(`Error checking account existence for ${address}:`, error);
      throw error;
    }
  }

  public async hasTrustline(address: string, currency: string, issuer: string): Promise<boolean> {
    try {
      if (!this.client.isConnected()) {
        await this.client.connect();
      }
      const response = await this.client.request({
        command: 'account_lines',
        account: address,
      });
      if (response.result && response.result.lines) {
        return response.result.lines.some(
          (line: any) => line.currency === currency && line.account === issuer
        );
      }
      return false;
    } catch (error) {
      console.error(`Error checking trustline for ${address}:`, error);
      return false;
    }
  }
}


