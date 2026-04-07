const mongoose = require('mongoose');

// Dynamic Table Schema definition
const tableSchemaSchema = new mongoose.Schema({
  database_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Database', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, trim: true }, // e.g. "In Stock", "Sold Out"
  description: { type: String, default: '' },
  is_editable: { type: Boolean, default: true }, // Whether users can add/edit rows in this table generally
  
  columns: [{
    name: { type: String, required: true }, // e.g. "Item Number", "Quantity", "Price"
    type: { type: String, enum: ['text', 'number', 'boolean', 'date', 'image', 'reference', 'formula'], required: true },
    required: { type: Boolean, default: false },
    default_value: { type: mongoose.Schema.Types.Mixed },
    is_editable: { type: Boolean, default: true }, // e.g., formulas are non-editable
    
    // For formulas/automations:
    formula: { type: String }, // e.g. "TableX.Quantity - TableY.Quantity" or "IF(Quantity < 10, 'Low Stock', 'OK')"
    
    // Settings for relationships
    reference_table_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TableSchema' },
  }],
  
  // Cross-table actions/triggers when a row is added/updated
  triggers: [{
    event: { type: String, enum: ['on_insert', 'on_update', 'on_delete'] },
    action: { type: String, enum: ['subtract_from_column', 'add_to_column', 'set_value'] },
    target_table_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TableSchema' },
    target_column_name: { type: String },
    source_column_name: { type: String }, // Which column's value to add/subtract
    match_column_name: { type: String },  // e.g. "Item Number" must match in both tables
  }],
}, { timestamps: true });

module.exports = mongoose.model('TableSchema', tableSchemaSchema);
