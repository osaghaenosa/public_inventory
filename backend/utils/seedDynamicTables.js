const TableSchema = require('../models/TableSchema');

async function seedDefaultTables(company_id, database_id) {
  try {
    // 1. In Stock Table
    const inStock = await TableSchema.create({
      company_id, database_id,
      name: 'In Stock',
      description: 'Current inventory balance',
      is_editable: true,
      columns: [
        { name: 'Item Number', type: 'text', required: true },
        { name: 'Quantity', type: 'number', required: true, default_value: 0 },
        { name: 'Price', type: 'number', required: true, default_value: 0 },
        { name: 'Image URL', type: 'image', required: false },
        { name: 'Low Stock Threshold', type: 'number', required: false, default_value: 10 },
      ],
      triggers: [] // Basic table, no outward triggers
    });

    // 2. Sold Out Table
    const soldOut = await TableSchema.create({
      company_id, database_id,
      name: 'Sold Out',
      description: 'Log of sold items',
      is_editable: true,
      columns: [
        { name: 'Date', type: 'date', required: true },
        { name: 'Item Number', type: 'text', required: true }, // We could use 'reference' later
        { name: 'Quantity', type: 'number', required: true },
        { name: 'Customer Info', type: 'text', required: false },
        { name: 'Price Sold', type: 'number', required: true }
      ],
      triggers: [
        {
          event: 'on_insert',
          action: 'subtract_from_column',
          target_table_id: inStock._id,
          target_column_name: 'Quantity',
          source_column_name: 'Quantity',
          match_column_name: 'Item Number'
        }
      ]
    });

    // 3. Debtors Table
    const debtors = await TableSchema.create({
      company_id, database_id,
      name: 'Debtors',
      description: 'Items taken on credit',
      is_editable: true,
      columns: [
        { name: 'Customer Name', type: 'text', required: true },
        { name: 'Item Number', type: 'text', required: true },
        { name: 'Quantity Taken', type: 'number', required: true },
        { name: 'Amount Owed', type: 'number', required: true },
        { name: 'Amount Paid', type: 'number', default_value: 0 },
        { name: 'Remaining Balance', type: 'formula', formula: 'Amount Owed - Amount Paid' },
      ],
      triggers: [
        {
          event: 'on_insert',
          action: 'subtract_from_column',
          target_table_id: inStock._id,
          target_column_name: 'Quantity',
          source_column_name: 'Quantity Taken',
          match_column_name: 'Item Number'
        }
      ]
    });

    // 4. Returned Items Table
    const returnedItems = await TableSchema.create({
      company_id, database_id,
      name: 'Returned Items',
      description: 'Items brought back by customers',
      is_editable: true,
      columns: [
        { name: 'Date', type: 'date', required: true },
        { name: 'Item Number', type: 'text', required: true },
        { name: 'Quantity Returned', type: 'number', required: true },
        { name: 'Customer Info', type: 'text', required: false },
        { name: 'Reason', type: 'text', required: false }
      ],
      triggers: [
        {
          event: 'on_insert',
          action: 'add_to_column',
          target_table_id: inStock._id,
          target_column_name: 'Quantity',
          source_column_name: 'Quantity Returned',
          match_column_name: 'Item Number'
        }
      ]
    });

    // 5. Restock Item Table
    const restockItem = await TableSchema.create({
      company_id, database_id,
      name: 'Restock Item',
      description: 'Log of newly purchased items added to inventory',
      is_editable: true,
      columns: [
        { name: 'Date', type: 'date', required: true },
        { name: 'Item Number', type: 'text', required: true },
        { name: 'Quantity Restocked', type: 'number', required: true },
        { name: 'Supplier Info', type: 'text', required: false },
        { name: 'Cost Price', type: 'number', required: true }
      ],
      triggers: [
        {
          event: 'on_insert',
          action: 'add_to_column',
          target_table_id: inStock._id,
          target_column_name: 'Quantity',
          source_column_name: 'Quantity Restocked',
          match_column_name: 'Item Number'
        }
      ]
    });

    console.log(`Seeded default tables for DB: ${database_id}`);
    return [inStock, soldOut, debtors, returnedItems, restockItem];
  } catch(e) {
    console.error('Error seeding default tables', e);
  }
}

module.exports = seedDefaultTables;
