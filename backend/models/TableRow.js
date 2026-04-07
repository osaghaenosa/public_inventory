const mongoose = require('mongoose');

const tableRowSchema = new mongoose.Schema({
  table_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TableSchema', required: true },
  database_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Database', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  worker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' },
  
  // Dynamic Map field: keys are Column names, values are the actual data
  data: { 
    type: Map, 
    of: mongoose.Schema.Types.Mixed,
    default: {} 
  },
  
}, { timestamps: true });

// Ensure fast querying by database -> table -> rows
tableRowSchema.index({ database_id: 1, table_id: 1 });

module.exports = mongoose.model('TableRow', tableRowSchema);
