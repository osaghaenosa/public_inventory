const express = require('express');
const mongoose = require('mongoose');
const TableSchema = require('../models/TableSchema');
const TableRow = require('../models/TableRow');
const { companyAuth: auth, adminOnly } = require('../middleware/saas-auth');
const ActivityLog = require('../models/ActivityLog');
const router = express.Router();

async function logActivity(req, action, data) {
  try {
    await ActivityLog.create({ 
      user_id: req.user ? req.user._id : null,
      company_id: req.company ? req.company._id : null, 
      database_id: req.databaseId,
      action, 
      new_value: data 
    });
  } catch(e) {}
}

function emitUpdate(req, table, action, worker) {
  try {
    const io = req.app.get('io');
    io.to('admin-room').emit('inventory-update', {
      type: 'update', table,
      message: `${worker} ${action} in ${table}`
    });
  } catch(e) {}
}

// ─── Sync Restock Table ───────────────────────────────────────────────────────
// Auto-updates Restock Alert table based on In Stock quantity vs threshold
async function syncRestockTable(req, databaseId) {
  try {
    // Find In Stock table
    const inStockSchema = await TableSchema.findOne({
      database_id: databaseId,
      name: { $regex: /in\s*stock|inventory/i }
    });

    if (!inStockSchema) return;

    // Find Restock Alert table (could be named "Restocked", "Restock Alert", "Restock Items", etc.)
    const restockSchema = await TableSchema.findOne({
      database_id: databaseId,
      name: { $regex: /restock|alert/i }
    });

    if (!restockSchema) return;

    // Get all In Stock rows
    const inStockRows = await TableRow.find({
      table_id: inStockSchema._id,
      database_id: databaseId
    });

    // Get all Restock rows
    const restockRows = await TableRow.find({
      table_id: restockSchema._id,
      database_id: databaseId
    });

    // Process each In Stock item
    for (const inStockRow of inStockRows) {
      if (!inStockRow.data) continue;

      let itemNumber = '';
      let itemName = '';
      let quantity = 0;
      let threshold = 10;

      // Extract item info from In Stock row
      for (const [key, val] of inStockRow.data.entries()) {
        const lower = key.toLowerCase();
        if (!itemNumber && (lower.includes('item number') || lower.includes('code') || lower.includes('sku'))) {
          itemNumber = val;
        }
        if (!itemName && (lower.includes('item name') || lower.includes('product'))) {
          itemName = val;
        }
        if (lower.includes('quantity') || lower.includes('in stock') || lower.includes('stock')) {
          quantity = Number(val) || 0;
        }
        if (lower.includes('threshold') || lower.includes('low stock')) {
          threshold = Number(val) || 10;
        }
      }

      const displayValue = itemNumber || itemName;
      const shouldBeInRestock = quantity <= threshold;

      // Check if this item is already in restock table
      const existingRestockRow = restockRows.find(r => {
        if (!r.data) return false;
        const restockItemNum = r.data.get('Item Number') || r.data.get('item_number') || '';
        const restockItemName = r.data.get('Item Name') || r.data.get('item_name') || '';
        return restockItemNum === itemNumber || restockItemName === itemName;
      });

      if (shouldBeInRestock && !existingRestockRow) {
        // Add to restock table
        const restockRowData = new Map();
        restockSchema.columns.forEach(col => {
          const lower = col.name.toLowerCase();
          if (lower.includes('item number') || lower.includes('code')) {
            restockRowData.set(col.name, itemNumber);
          } else if (lower.includes('item name') || lower.includes('product')) {
            restockRowData.set(col.name, itemName);
          } else if (lower.includes('quantity') || lower.includes('remaining') || lower.includes('current')) {
            restockRowData.set(col.name, quantity);
          } else if (lower.includes('threshold') || lower.includes('alert')) {
            restockRowData.set(col.name, threshold);
          } else {
            restockRowData.set(col.name, col.default_value || '');
          }
        });

        await TableRow.create({
          table_id: restockSchema._id,
          database_id: databaseId,
          company_id: req.company._id,
          data: restockRowData
        });
        console.log(`✅ Added "${displayValue}" to Restock Alert (qty: ${quantity}, threshold: ${threshold})`);
      } else if (!shouldBeInRestock && existingRestockRow) {
        // Remove from restock table
        await TableRow.deleteOne({ _id: existingRestockRow._id });
        console.log(`🗑️ Removed "${displayValue}" from Restock Alert (qty: ${quantity}, threshold: ${threshold})`);
      }
    }
  } catch (error) {
    console.error('❌ Error syncing restock table:', error.message);
  }
}

// ─── Table Schemas CRUD ───────────────────────────────────────────────────────

router.get('/schemas', auth, async (req, res) => {
  try {
    const schemas = await TableSchema.find({ database_id: req.databaseId });
    res.json(schemas);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/stats-chart', auth, async (req, res) => {
  try {
    const { range } = req.query; // e.g. '7d', '30d', '1y'
    let daysToSubtract = 30;
    if (range === '7d') daysToSubtract = 7;
    if (range === '1y') daysToSubtract = 365;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToSubtract);

    // Get all rows in timeframe for this database
    const rows = await TableRow.find({ 
      database_id: req.databaseId, 
      createdAt: { $gte: cutoffDate } 
    }).populate('table_id');
    
    // Total aggregate object grouped by Day (or Month if 1y)
    const aggregated = {};
    let totalStockValue = 0;
    let totalRevenue = 0;
    
    rows.forEach(row => {
      // Find grouping key
      const d = new Date(row.createdAt);
      const dateKey = range === '1y' 
        ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` 
        : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        
      if (!aggregated[dateKey]) {
        aggregated[dateKey] = { date: dateKey, goodsAcquired: 0, salesVolume: 0, revenue: 0, profit: 0 };
      }
      
      const data = row.data;
      if (!data) return;

      // Extremely basic heuristics for chart metrics based on dynamic column names
      let added = 0, sold = 0, price = 0, cost = 0;

      for (const [key, val] of data.entries()) {
        const lowerKey = key.toLowerCase();
        if (typeof val === 'number') {
          if (lowerKey.includes('add') || lowerKey.includes('stock') || lowerKey.includes('receive')) added += val;
          if (lowerKey.includes('sold') || lowerKey.includes('out') || lowerKey.includes('sales')) sold += val;
          if (lowerKey.includes('price') || lowerKey.includes('total') || lowerKey.includes('amount')) price += val;
          if (lowerKey.includes('cost') || lowerKey.includes('buy')) cost += val;
        }
      }

      aggregated[dateKey].goodsAcquired += added;
      aggregated[dateKey].salesVolume += sold;
      
      // Assume a row representing a sale will have 'sold' > 0 and 'price' > 0
      const rowRev = (sold > 0 ? sold : 1) * price;
      aggregated[dateKey].revenue += price > 0 && sold > 0 ? price * sold : (sold > 0 ? price : 0); // basic sanity
      if (price > 0 && sold > 0) {
          totalRevenue += (price * sold);
      } else if (price > 0 && added === 0) {
          totalRevenue += price;
          aggregated[dateKey].revenue += price;
      }
      
      const profitMargin = (price - cost) * (sold > 0 ? sold : 1);
      if (price > cost) {
         aggregated[dateKey].profit += profitMargin;
      }
      
      totalStockValue += added;
    });

    const chartData = Object.values(aggregated).sort((a,b) => a.date.localeCompare(b.date));
    
    // Pad missing dates for simple line chart continuity
    res.json({
        chartData,
        summary: {
           totalStockValue,
           totalRevenue,
           rowCount: rows.length
        }
    });
    
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/schemas', auth, adminOnly, async (req, res) => {
  try {
    const { name, description, columns, triggers, is_editable } = req.body;
    const schema = await TableSchema.create({
      database_id: req.databaseId,
      company_id: req.company._id,
      name, description, columns, triggers,
      is_editable: is_editable !== undefined ? is_editable : true
    });
    await logActivity(req, `Created generic table "${name}"`, schema);
    res.status(201).json(schema);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.put('/schemas/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, description, columns, triggers, is_editable } = req.body;
    const schema = await TableSchema.findOne({ _id: req.params.id, database_id: req.databaseId });
    if (!schema) return res.status(404).json({ message: 'Table not found' });
    
    schema.name = name || schema.name;
    schema.description = description !== undefined ? description : schema.description;
    schema.is_editable = is_editable !== undefined ? is_editable : schema.is_editable;
    if (columns) schema.columns = columns;
    if (triggers) schema.triggers = triggers;
    
    await schema.save();
    await logActivity(req, `Modified structure of table "${schema.name}"`, req.body);
    res.json(schema);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.delete('/schemas/:id', auth, adminOnly, async (req, res) => {
  try {
    const schema = await TableSchema.findOne({ _id: req.params.id, database_id: req.databaseId });
    if (!schema) return res.status(404).json({ message: 'Table not found' });
    
    await TableRow.deleteMany({ table_id: schema._id });
    await schema.deleteOne();
    await logActivity(req, `Deleted table "${schema.name}" and all its rows`, {});
    res.json({ message: 'Table deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// ─── ITEM SUGGESTIONS ──────────────────────────────────────────────────────

router.get('/items/suggest', auth, async (req, res) => {
  try {
    const { query = '' } = req.query;
    
    console.log('\n🔍 /items/suggest called');
    console.log('   Query:', query || '(empty)');
    console.log('   DatabaseId:', req.databaseId);
    
    // Get ALL tables for this database (not just inventory)
    const allSchemas = await TableSchema.find({ database_id: req.databaseId });
    console.log('📋 Found', allSchemas.length, 'tables:', allSchemas.map(s => s.name).join(', '));
    
    const items = [];
    const seen = new Set();
    
    // Process each table to extract items
    for (const schema of allSchemas) {
      console.log(`\n  📖 Processing table: "${schema.name}"`);
      
      const rows = await TableRow.find({ 
        table_id: schema._id,
        database_id: req.databaseId 
      }).lean();
      
      console.log(`     Found ${rows.length} rows`);
      
      rows.forEach((row, rowIdx) => {
        if (!row.data) return;
        
        let itemName = '';
        let itemNumber = '';
        
        // Handle both Map and plain objects
        const dataEntries = row.data instanceof Map ? 
          row.data.entries() : 
          Object.entries(row.data);
        
        for (const [key, val] of dataEntries) {
          const lower = key.toLowerCase();
          
          // Match item name variants
          if (!itemName && (lower.includes('item name') || lower.includes('item') || lower.includes('product') || lower === 'name')) {
            itemName = val;
          }
          
          // Match item number variants
          if (!itemNumber && (lower.includes('item number') || lower.includes('item_number') || lower.includes('code') || lower.includes('sku') || lower.includes('itm'))) {
            itemNumber = val;
          }
        }
        
        if (rowIdx < 2) {
          console.log(`       Row ${rowIdx}: itemNumber="${itemNumber}", itemName="${itemName}"`);
        }
        
        if (itemNumber || itemName) {
          const display = itemNumber || itemName;
          const key = display.toString();
          
          if (!seen.has(key)) {
            seen.add(key);
            items.push({
              item_name: itemName || itemNumber,
              item_number: itemNumber || itemName,
            });
          }
        }
      });
    }
    
    console.log('\n✅ Total unique items:', items.length);
    console.log('   Items:', items.slice(0, 5).map(i => `${i.item_number}`).join(', '), items.length > 5 ? '...' : '');
    
    res.json(items);
    
  } catch (error) {
    console.error('❌ Error in /items/suggest:', error.message);
    res.json([]);
  }
});

// ─── RESTOCK ITEMS ────────────────────────────────────────────────────────

router.get('/items/restock', auth, async (req, res) => {
  try {
    const inventorySchema = await TableSchema.findOne({ 
      database_id: req.databaseId,
      name: { $regex: /inventory/i }
    });
    
    if (!inventorySchema) {
      return res.json([]);
    }
    
    const rows = await TableRow.find({ 
      table_id: inventorySchema._id,
      database_id: req.databaseId 
    }).lean();
    
    const restockItems = [];
    
    rows.forEach(row => {
      if (!row.data) return;
      
      let itemName = '';
      let itemNumber = '';
      let quantity = 0;
      let threshold = 0;
      
      for (const [key, val] of row.data.entries()) {
        const lower = key.toLowerCase();
        
        if (!itemName && (lower.includes('item name') || lower === 'item')) {
          itemName = val;
        }
        if (!itemNumber && lower.includes('item number')) {
          itemNumber = val;
        }
        if (lower.includes('quantity') || lower.includes('in stock') || lower.includes('stock')) {
          quantity = Number(val) || 0;
        }
        if (lower.includes('threshold') || lower.includes('low stock')) {
          threshold = Number(val) || 10;
        }
      }
      
      if (quantity <= threshold && (itemName || itemNumber)) {
        restockItems.push({
          item_name: itemName,
          item_number: itemNumber,
          current_quantity: quantity,
          threshold: threshold,
          restock_needed: threshold - quantity,
          urgency: quantity === 0 ? 'critical' : quantity < threshold * 0.5 ? 'high' : 'medium'
        });
      }
    });
    
    res.json(restockItems);
    
  } catch (error) {
    console.error('Error in /items/restock:', error);
    res.json([]);
  }
});

// ─── ITEM DETAIL ──────────────────────────────────────────────────────────

router.get('/items/detail', auth, async (req, res) => {
  try {
    const { itemName } = req.query;
    
    const inventorySchema = await TableSchema.findOne({ 
      database_id: req.databaseId,
      name: { $regex: /inventory/i }
    });
    
    if (!inventorySchema) {
      return res.status(404).json({ message: 'Inventory table not found' });
    }
    
    const rows = await TableRow.find({ 
      table_id: inventorySchema._id,
      database_id: req.databaseId 
    }).lean();
    
    for (const row of rows) {
      if (!row.data) continue;
      
      let currentItemName = '';
      let itemNumber = '';
      let quantity = 0;
      let threshold = 0;
      
      for (const [key, val] of row.data.entries()) {
        const lower = key.toLowerCase();
        
        if (lower.includes('item name') || lower === 'item') {
          currentItemName = val;
        }
        if (lower.includes('item number')) {
          itemNumber = val;
        }
        if (lower.includes('quantity') || lower.includes('in stock') || lower.includes('stock')) {
          quantity = Number(val) || 0;
        }
        if (lower.includes('threshold')) {
          threshold = Number(val) || 10;
        }
      }
      
      if (currentItemName && currentItemName.toString().toLowerCase() === itemName.toString().toLowerCase()) {
        return res.json({
          itemName: currentItemName,
          itemNumber: itemNumber,
          quantity: quantity,
          threshold: threshold
        });
      }
    }
    
    res.status(404).json({ message: 'Item not found' });
    
  } catch (error) {
    console.error('Error in /items/detail:', error);
    res.status(500).json({ message: error.message });
  }
});

// ─── Table Rows CRUD & Triggers ────────────────────────────────────────────────

// Evaluate simple formulas (e.g. IF(Qty<10,'Low','OK') or Amount Owed - Amount Paid)
function computeFormulas(rowMap, columnsConfig) {
  let changed = false;
  columnsConfig.filter(c => c.type === 'formula' && c.formula).forEach(c => {
    try {
      let f = c.formula;
      // Replace column names with their literal values in the map
      for (const [key, val] of rowMap.entries()) {
        const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        let rep = (typeof val === 'number') ? val : `'${val}'`;
        f = f.replace(regex, rep);
      }
      
      // Simple eval for basic arithmetic
      // Warning: 'eval' should only be evaluating mathematical expressions here normally
      let result;
      if (f.includes('IF(')) {
        // Very basic simple replacement hack for mock
        // We'll skip complex parser for now and just set result to string eval
      }
      result = eval(f); // Extremely naive approach for formula evaluation
      if (rowMap.get(c.name) !== result) {
        rowMap.set(c.name, result);
        changed = true;
      }
    } catch(e) { /* Ignore formula eval errors on partial data */ }
  });
  return changed;
}

router.get('/rows/:tableId', auth, async (req, res) => {
  try {
    const tableId = req.params.tableId;
    const isWorker = req.user && req.user.role === 'worker';
    const query = { table_id: tableId, database_id: req.databaseId };
    if (isWorker) { query.worker_id = req.user._id; }
    
    const rows = await TableRow.find(query).populate('worker_id', 'name').sort({ createdAt: -1 });
    res.json(rows);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/rows/:tableId', auth, async (req, res) => {
  try {
    const tableId = req.params.tableId;
    const schema = await TableSchema.findById(tableId);
    if (!schema) return res.status(404).json({ message: 'Table schema not found' });
    if (!schema.is_editable) return res.status(403).json({ message: 'This table is read-only' });
    
    // Build row data
    const rowMap = new Map();
    schema.columns.forEach(col => {
      let val = req.body[col.name];
      if (val === undefined) val = col.default_value;
      if (val !== undefined) {
        if (col.type === 'number') val = Number(val);
        rowMap.set(col.name, val);
      }
    });

    const userRole = req.user ? req.user.role : 'admin';
    const userName = req.user ? req.user.name : 'Admin';
    const userId = req.user ? req.user._id : null;

    computeFormulas(rowMap, schema.columns);

    // Check pre-insert triggers (subtract logic, e.g. Sold Out reduces In Stock)
    if (schema.triggers && schema.triggers.length > 0) {
      for (const trig of schema.triggers.filter(t => t.event === 'on_insert')) {
        const matchVal = rowMap.get(trig.match_column_name); // e.g., 'Item Number'
        const sourceVal = rowMap.get(trig.source_column_name) || 0;
        
        // Find target row
        const targetRows = await TableRow.find({ table_id: trig.target_table_id, database_id: req.databaseId });
        // Manually filter via Map: (can't easily query unstructured dynamic fields directly in older Mongoose)
        const targetRow = targetRows.find(r => r.data.get(trig.match_column_name) === matchVal);
        
        if (targetRow) {
          let currVal = targetRow.data.get(trig.target_column_name) || 0;
          if (trig.action === 'subtract_from_column') {
            if (currVal < sourceVal) {
              return res.status(400).json({ message: `Cannot perform action: target [${trig.target_column_name}] has insufficient value (${currVal}).` });
            }
            targetRow.data.set(trig.target_column_name, currVal - sourceVal);
          } else if (trig.action === 'add_to_column') {
            targetRow.data.set(trig.target_column_name, currVal + sourceVal);
          }
          await targetRow.save();
        } else {
           if (trig.action === 'subtract_from_column') {
             return res.status(400).json({ message: `Target record with ${trig.match_column_name} = ${matchVal} not found.` });
           }
        }
      }
    }

    const row = await TableRow.create({
      table_id: tableId,
      database_id: req.databaseId,
      company_id: req.company._id,
      worker_id: userId,
      data: rowMap
    });

    if (userId) await row.populate('worker_id', 'name');
    await logActivity(req, `Added record to "${schema.name}"`, Object.fromEntries(rowMap));
    emitUpdate(req, schema.name, `added record`, userName);
    
    // Sync restock alert table
    await syncRestockTable(req, req.databaseId);
    
    res.status(201).json(row);
  } catch (error) { 
    console.error(error);
    res.status(500).json({ message: error.message }); 
  }
});

router.put('/rows/:tableId/:rowId', auth, async (req, res) => {
  try {
    const tableId = req.params.tableId;
    const schema = await TableSchema.findById(tableId);
    if (!schema) return res.status(404).json({ message: 'Table schema not found' });
    
    const row = await TableRow.findOne({ _id: req.params.rowId, table_id: tableId, database_id: req.databaseId });
    if (!row) return res.status(404).json({ message: 'Row not found' });
    
    if (req.user && req.user.role === 'worker' && row.worker_id && row.worker_id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'You can only edit your own records' });

    schema.columns.forEach(col => {
      // Don't update formulas directly here
      if (col.type !== 'formula' && req.body[col.name] !== undefined) {
        let val = req.body[col.name];
        if (col.type === 'number') val = Number(val);
        row.data.set(col.name, val);
      }
    });
    
    computeFormulas(row.data, schema.columns);
    
    // (Note: Update triggers omitted for brevity, keeping simple)

    await row.save();
    if (row.worker_id) await row.populate('worker_id', 'name');
    const userName = req.user ? req.user.name : 'Admin';
    await logActivity(req, `Updated record in "${schema.name}"`, Object.fromEntries(row.data));
    emitUpdate(req, schema.name, `updated record`, userName);
    
    // Sync restock alert table
    await syncRestockTable(req, req.databaseId);
    
    res.json(row);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.delete('/rows/:tableId/:rowId', auth, async (req, res) => {
  try {
    const tableId = req.params.tableId;
    const schema = await TableSchema.findById(tableId);
    
    const row = await TableRow.findOne({ _id: req.params.rowId, table_id: tableId, database_id: req.databaseId });
    if (!row) return res.status(404).json({ message: 'Row not found' });
    
    if (req.user && req.user.role === 'worker' && row.worker_id && row.worker_id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'You can only delete your own records' });

    // Reverse triggers (e.g., deleted sale adds back to stock)
    if (schema && schema.triggers && schema.triggers.length > 0) {
       for (const trig of schema.triggers.filter(t => t.event === 'on_insert')) { // reversing the insert trigger
          const matchVal = row.data.get(trig.match_column_name); 
          const sourceVal = row.data.get(trig.source_column_name) || 0;
          const targetRows = await TableRow.find({ table_id: trig.target_table_id, database_id: req.databaseId });
          const targetRow = targetRows.find(r => r.data.get(trig.match_column_name) === matchVal);
          
          if (targetRow) {
            let currVal = targetRow.data.get(trig.target_column_name) || 0;
            if (trig.action === 'subtract_from_column') {
              // Add back what was subtracted
              targetRow.data.set(trig.target_column_name, currVal + sourceVal);
            } else if (trig.action === 'add_to_column') {
              targetRow.data.set(trig.target_column_name, Math.max(0, currVal - sourceVal));
            }
            await targetRow.save();
          }
       }
    }

    await row.deleteOne();
    await logActivity(req, `Deleted record from "${schema ? schema.name : 'table'}"`, {});
    
    // Sync restock alert table
    await syncRestockTable(req, req.databaseId);
    
    res.json({ message: 'Row deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;
