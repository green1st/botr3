
import { Client } from 'xrpl';

class XrplConnection {
  private static instance: XrplConnection;
  private client: Client;

  private constructor() {
    this.client = new Client("wss://v-xrpl.r3store.io");
  }

  public static getInstance(): XrplConnection {
    if (!XrplConnection.instance) {
      XrplConnection.instance = new XrplConnection();
    }
    return XrplConnection.instance;
  }

  public async connect(): Promise<void> {
    if (!this.client.isConnected()) {
      await this.client.connect();
      console.log("[XrplConnection] Client connected.");
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client.isConnected()) {
      await this.client.disconnect();
      console.log("[XrplConnection] Client disconnected.");
    }
  }

  public getClient(): Client {
    return this.client;
  }
}

export default XrplConnection;


