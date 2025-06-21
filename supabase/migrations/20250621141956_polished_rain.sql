/*
  # Add customer_name column to sold_coupons table

  1. Schema Changes
    - Add `customer_name` column to `sold_coupons` table for storing walk-in customer names
    - This allows tracking coupon purchases by non-members

  2. Purpose
    - Store customer names for coupons sold to walk-in customers
    - Improve coupon ownership tracking and customer service
*/

-- Add customer_name column to sold_coupons table
ALTER TABLE sold_coupons ADD COLUMN IF NOT EXISTS customer_name text;