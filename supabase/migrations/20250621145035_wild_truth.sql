/*
  # Add Photo Support for Products

  1. Schema Changes
    - Add photo_url column to products table
    - Allow storing image URLs or base64 data

  2. Features
    - Product images for better visual identification
    - Support for both URL and base64 image storage
    - Optional field - products can exist without photos
*/

-- Add photo_url column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS photo_url text;

-- Add comment for the new column
COMMENT ON COLUMN products.photo_url IS 'URL or base64 data for product image';