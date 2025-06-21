import { supabase } from '../lib/supabase';
import { Product } from '../lib/supabase';

export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

export interface SaleData {
  items: CartItem[];
  total: number;
  payment_method: string;
  shift_id: string;
  processed_by: string;
  customer_name?: string;
  notes?: string;
}

export interface SaleResult {
  success: boolean;
  message: string;
  transaction?: any;
  stock_movements?: any[];
}

export interface StockMovement {
  product_id: string;
  change_quantity: number;
  reason: string;
  transaction_id?: string;
  created_by: string;
}

class POSService {
  async getAllProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  }

  async searchProducts(query: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .ilike('name', `%${query}%`)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  async processSale(saleData: SaleData): Promise<SaleResult> {
    try {
      // Validate stock availability
      for (const item of saleData.items) {
        if (item.product.current_stock < item.quantity) {
          return {
            success: false,
            message: `Insufficient stock for ${item.product.name}. Available: ${item.product.current_stock}, Required: ${item.quantity}`
          };
        }
      }

      // Create transaction record
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          shift_id: saleData.shift_id,
          amount: saleData.total,
          payment_method: saleData.payment_method,
          type: 'POS_SALE',
          processed_by: saleData.processed_by,
          status: 'PAID',
          notes: saleData.notes || `Sale to ${saleData.customer_name || 'Customer'}`
        }])
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Create stock movements and update inventory
      const stockMovements = [];
      for (const item of saleData.items) {
        // Create stock movement record
        const { data: movement, error: movementError } = await supabase
          .from('stock_movements')
          .insert([{
            product_id: item.product.id,
            change_quantity: -item.quantity, // Negative for sales
            reason: 'POS_SALE',
            transaction_id: transaction.id,
            created_by: saleData.processed_by
          }])
          .select()
          .single();

        if (movementError) throw movementError;
        stockMovements.push(movement);

        // Update product stock
        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            current_stock: item.product.current_stock - item.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.product.id);

        if (updateError) throw updateError;
      }

      return {
        success: true,
        message: `Sale completed successfully! Total: $${saleData.total.toFixed(2)}`,
        transaction,
        stock_movements: stockMovements
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Sale failed: ${error.message}`
      };
    }
  }

  async addStock(movements: StockMovement[]): Promise<{ success: boolean; message: string }> {
    try {
      for (const movement of movements) {
        // Create stock movement record
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert([movement]);

        if (movementError) throw movementError;

        // Update product stock
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('current_stock')
          .eq('id', movement.product_id)
          .single();

        if (productError) throw productError;

        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            current_stock: product.current_stock + movement.change_quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', movement.product_id);

        if (updateError) throw updateError;
      }

      return {
        success: true,
        message: 'Stock updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Stock update failed: ${error.message}`
      };
    }
  }

  async getStockMovements(productId?: string, limit: number = 50): Promise<any[]> {
    let query = supabase
      .from('stock_movements')
      .select(`
        *,
        product:products(name),
        created_by_profile:profiles!stock_movements_created_by_fkey(full_name),
        transaction:transactions(amount, type)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getLowStockProducts(threshold: number = 10): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .lte('current_stock', threshold)
      .order('current_stock');

    if (error) throw error;
    return data || [];
  }

  async createProduct(productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async getSalesReport(startDate: string, endDate: string, shiftId?: string): Promise<{
    total_sales: number;
    total_revenue: number;
    top_products: any[];
    sales_by_day: any[];
  }> {
    let query = supabase
      .from('transactions')
      .select(`
        amount,
        created_at,
        stock_movements!inner(
          product_id,
          change_quantity,
          product:products(name, price)
        )
      `)
      .eq('type', 'POS_SALE')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (shiftId) {
      query = query.eq('shift_id', shiftId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Process the data to create report
    const transactions = data || [];
    const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalSales = transactions.length;

    // Calculate top products
    const productSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
    
    transactions.forEach(transaction => {
      transaction.stock_movements.forEach((movement: any) => {
        const productId = movement.product_id;
        const quantity = Math.abs(movement.change_quantity);
        const revenue = quantity * parseFloat(movement.product.price);
        
        if (!productSales[productId]) {
          productSales[productId] = {
            name: movement.product.name,
            quantity: 0,
            revenue: 0
          };
        }
        
        productSales[productId].quantity += quantity;
        productSales[productId].revenue += revenue;
      });
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      total_sales: totalSales,
      total_revenue: totalRevenue,
      top_products: topProducts,
      sales_by_day: [] // Could be implemented for detailed daily breakdown
    };
  }
}

export const posService = new POSService();