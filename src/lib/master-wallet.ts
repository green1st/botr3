import { Wallet, Client, Payment, xrpToDrops } from 'xrpl';
import CryptoJS from 'crypto-js';
import { getDatabase } from './database';

export interface MasterWalletInfo {
  address: string;
  balance: number;
}

export interface TransactionResult {
  [address: string]: string | null; // address -> transaction hash or null if failed
}

export class MasterWalletManager {
  private client: Client;
  private db = getDatabase();
  private masterWallet: Wallet | null = null;

  constructor() {
    this.client = new Client('wss://xrplcluster.com');
  }

  private encryptPrivateKey(privateKey: string, password: string = 'default_master_key'): string {
    return CryptoJS.AES.encrypt(privateKey, password).toString();
  }

  private decryptPrivateKey(encryptedPrivateKey: string, password: string = 'default_master_key'): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedPrivateKey, password);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) {
        throw new Error('Invalid password');
      }
      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt master wallet private key');
    }
  }

  public async createMasterWallet(): Promise<{ success: boolean; message: string; address?: string }> {
    try {
      // Generate new master wallet
      const wallet = Wallet.generate();
      
      // Encrypt private key
      const encryptedPrivateKey = this.encryptPrivateKey(wallet.privateKey);
      
      // Clear existing master wallet
      await this.db.run('DELETE FROM master_wallet');
      
      // Store new master wallet
      await this.db.run(
        'INSERT INTO master_wallet (address, encrypted_private_key) VALUES (?, ?)',
        [wallet.address, encryptedPrivateKey]
      );
      
      this.masterWallet = wallet;
      
      return {
        success: true,
        message: 'Master wallet created successfully',
        address: wallet.address
      };
    } catch (error) {
      console.error('Error creating master wallet:', error);
      return {
        success: false,
        message: 'Failed to create master wallet'
      };
    }
  }

  public async setMasterWallet(privateKey: string): Promise<{ success: boolean; message: string; address?: string }> {
    try {
      // Create wallet from private key
      const wallet = Wallet.fromSecret(privateKey);
      
      // Encrypt private key
      const encryptedPrivateKey = this.encryptPrivateKey(privateKey);
      
      // Clear existing master wallet
      await this.db.run('DELETE FROM master_wallet');
      
      // Store master wallet
      await this.db.run(
        'INSERT INTO master_wallet (address, encrypted_private_key) VALUES (?, ?)',
        [wallet.address, encryptedPrivateKey]
      );
      
      this.masterWallet = wallet;
      
      return {
        success: true,
        message: 'Master wallet set successfully',
        address: wallet.address
      };
    } catch (error) {
      console.error('Error setting master wallet:', error);
      return {
        success: false,
        message: 'Failed to set master wallet: Invalid private key'
      };
    }
  }

  public async importMasterWalletFromSeed(seed: string): Promise<{ success: boolean; message: string; address?: string }> {
    try {
      // Create wallet from seed
      const wallet = Wallet.fromSeed(seed);
      
      // Encrypt private key
      const encryptedPrivateKey = this.encryptPrivateKey(wallet.privateKey);
      
      // Clear existing master wallet
      await this.db.run('DELETE FROM master_wallet');
      
      // Store master wallet
      await this.db.run(
        'INSERT INTO master_wallet (address, encrypted_private_key) VALUES (?, ?)',
        [wallet.address, encryptedPrivateKey]
      );
      
      this.masterWallet = wallet;
      
      return {
        success: true,
        message: 'Master wallet imported from seed successfully',
        address: wallet.address
      };
    } catch (error) {
      console.error('Error importing master wallet from seed:', error);
      return {
        success: false,
        message: 'Failed to import master wallet: Invalid seed'
      };
    }
  }

  private async loadMasterWallet(): Promise<void> {
    if (this.masterWallet) return;

    const row = await this.db.get('SELECT * FROM master_wallet ORDER BY created_at DESC LIMIT 1');
    
    if (row) {
      try {
        const privateKey = this.decryptPrivateKey(row.encrypted_private_key);
        this.masterWallet = Wallet.fromSecret(privateKey);
      } catch (error) {
        console.error('Error loading master wallet:', error);
        throw new Error('Failed to load master wallet');
      }
    } else {
      throw new Error('No master wallet found');
    }
  }

  public async getMasterWalletInfo(): Promise<MasterWalletInfo | null> {
    try {
      await this.loadMasterWallet();
      
      if (!this.masterWallet) {
        return null;
      }

      if (!this.client.isConnected()) {
        await this.client.connect();
      }

      const response = await this.client.request({
        command: 'account_info',
        account: this.masterWallet.address
      });

      let balance = 0;
      if (response.result && response.result.account_data) {
        const balanceDrops = response.result.account_data.Balance;
        balance = parseFloat(balanceDrops) / 1000000; // Convert drops to XRP
      }

      return {
        address: this.masterWallet.address,
        balance: balance
      };
    } catch (error) {
      console.error('Error getting master wallet info:', error);
      return null;
    }
  }

  public async broadcastToWallets(
    walletAddresses: string[],
    amountPerWallet: number,
    memo: string = ''
  ): Promise<{ success: boolean; message: string; results?: TransactionResult }> {
    try {
      await this.loadMasterWallet();
      
      if (!this.masterWallet) {
        return {
          success: false,
          message: 'No master wallet found'
        };
      }

      if (!this.client.isConnected()) {
        await this.client.connect();
      }

      const results: TransactionResult = {};

      for (const address of walletAddresses) {
        try {
          const payment: Payment = {
            TransactionType: 'Payment',
            Account: this.masterWallet.address,
            Destination: address,
            Amount: xrpToDrops(amountPerWallet.toString())
          };

          if (memo) {
            payment.Memos = [{
              Memo: {
                MemoData: Buffer.from(memo, 'utf8').toString('hex').toUpperCase()
              }
            }];
          }

          const response = await this.client.submitAndWait(payment, {
            wallet: this.masterWallet
          });

          if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
            if (response.result.meta.TransactionResult === 'tesSUCCESS') {
              results[address] = response.result.hash;
            } else {
              results[address] = null;
            }
          } else {
            results[address] = null;
          }
        } catch (error) {
          console.error(`Error sending to ${address}:`, error);
          results[address] = null;
        }
      }

      return {
        success: true,
        message: 'Broadcast completed',
        results: results
      };
    } catch (error) {
      console.error('Error broadcasting to wallets:', error);
      return {
        success: false,
        message: 'Failed to broadcast to wallets'
      };
    }
  }

  public async collectFromWallets(
    wallets: Wallet[],
    memo: string = ''
  ): Promise<{ success: boolean; message: string; results?: TransactionResult }> {
    try {
      await this.loadMasterWallet();
      
      if (!this.masterWallet) {
        return {
          success: false,
          message: 'No master wallet found'
        };
      }

      if (!this.client.isConnected()) {
        await this.client.connect();
      }

      const results: TransactionResult = {};

      for (const wallet of wallets) {
        try {
          // Get wallet balance
          const accountInfo = await this.client.request({
            command: 'account_info',
            account: wallet.address
          });

          if (!accountInfo.result || !accountInfo.result.account_data) {
            results[wallet.address] = null;
            continue;
          }

          const balanceDrops = accountInfo.result.account_data.Balance;
          const balance = parseFloat(balanceDrops);
          
          // Reserve 1 XRP for account reserve and transaction fees
          const reserveDrops = 1000000 + 10000; // 1 XRP + 0.01 XRP for fees
          const availableDrops = balance - reserveDrops;

          if (availableDrops <= 0) {
            results[wallet.address] = null;
            continue;
          }

          const payment: Payment = {
            TransactionType: 'Payment',
            Account: wallet.address,
            Destination: this.masterWallet.address,
            Amount: availableDrops.toString()
          };

          if (memo) {
            payment.Memos = [{
              Memo: {
                MemoData: Buffer.from(memo, 'utf8').toString('hex').toUpperCase()
              }
            }];
          }

          const response = await this.client.submitAndWait(payment, {
            wallet: wallet
          });

          if (response.result.meta && typeof response.result.meta === 'object' && 'TransactionResult' in response.result.meta) {
            if (response.result.meta.TransactionResult === 'tesSUCCESS') {
              results[wallet.address] = response.result.hash;
            } else {
              results[wallet.address] = null;
            }
          } else {
            results[wallet.address] = null;
          }
        } catch (error) {
          console.error(`Error collecting from ${wallet.address}:`, error);
          results[wallet.address] = null;
        }
      }

      return {
        success: true,
        message: 'Collection completed',
        results: results
      };
    } catch (error) {
      console.error('Error collecting from wallets:', error);
      return {
        success: false,
        message: 'Failed to collect from wallets'
      };
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client.isConnected()) {
      await this.client.disconnect();
    }
  }
}

