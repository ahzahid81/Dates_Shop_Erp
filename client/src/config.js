export const SHOP = {
  name: import.meta.env.VITE_SHOP_NAME || 'Vision Dates',
  legalName: import.meta.env.VITE_SHOP_LEGAL_NAME || 'Vision Dates',
  address: import.meta.env.VITE_SHOP_ADDRESS || 'Madinah, Saudi Arabia',
  phone: import.meta.env.VITE_SHOP_PHONE || '+966 50 000 0000',
  email: import.meta.env.VITE_SHOP_EMAIL || 'hello@visiondates.com',
  website: import.meta.env.VITE_SHOP_WEBSITE || 'www.visiondates.com',
  bin: import.meta.env.VITE_SHOP_BIN || 'BIN 000000000-0000',
};

export const SUPER_ADMIN_EMAIL = (
  import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'abdulhasibzahid@gmail.com'
)
  .trim()
  .toLowerCase();

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Transport',
  'Utilities',
  'Salary',
  'Packaging',
  'Marketing',
  'Maintenance',
  'Food',
  'General',
];
