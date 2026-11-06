export const SHOP = {
  name: import.meta.env.VITE_SHOP_NAME || 'Dates Shop',
  legalName: import.meta.env.VITE_SHOP_LEGAL_NAME || 'Dates Shop ERP',
  address: import.meta.env.VITE_SHOP_ADDRESS || 'King Fahd Road, Riyadh 12211, Saudi Arabia',
  phone: import.meta.env.VITE_SHOP_PHONE || '+966 50 000 0000',
  email: import.meta.env.VITE_SHOP_EMAIL || 'hello@datesshop.com',
  website: import.meta.env.VITE_SHOP_WEBSITE || 'www.datesshop.com',
  bin: import.meta.env.VITE_SHOP_BIN || 'BIN 000000000-0000',
};

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
