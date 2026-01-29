
export interface OrderItem {
  name: string;
  quantity: number;
  price?: number; // Unit price
}

export interface Order {
  id: string;
  userName: string;
  address: string;
  region: string;
  items: OrderItem[];
  totalAmount: number;
  rawText: string;
  timestamp: number;
  status: 'pending' | 'completed';
  isFlagged?: boolean;
}

export interface ParsingResult {
  userName: string;
  address: string;
  region: string;
  items: (OrderItem & { price?: number })[];
}

export interface PriceRecord {
  id: string;
  itemName: string;
  region: string;
  price: number;
  updatedAt: number;
  isAvailable: boolean; 
}

export type UserRole = 'admin' | 'member';

export interface UserProfile {
  username: string;
  role: UserRole;
  address?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
}
