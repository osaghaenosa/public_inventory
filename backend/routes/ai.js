const express = require('express');
const TableSchema = require('../models/TableSchema');
const TableRow = require('../models/TableRow');
const ActivityLog = require('../models/ActivityLog');
const CompanyUser = require('../models/CompanyUser');
const { companyAuth: auth, adminOnly } = require('../middleware/saas-auth');

const router = express.Router();

// In-memory cache
const analysisCache = {};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ✅ FREE MODELS ONLY (no paid usage)
const FREE_MODELS = [
  "deepseek/deepseek-r1:free",
  "qwen/qwen2-7b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free"
];

function getRandomModel() {
  return FREE_MODELS[Math.floor(Math.random() * FREE_MODELS.length)];
}

router.post('/analyze', auth, adminOnly, async (req, res) => {
  try {
    const { timeRange = 'last_7_days', context = '', forceRefresh = false, aiMode = true } = req.body;

    const cacheKey = `${req.databaseId}_${timeRange}_${Buffer.from(context).toString('base64').substring(0, 20)}`;

    // ✅ CACHE CHECK
    if (aiMode && !forceRefresh) {
      const cached = analysisCache[cacheKey];
      if (cached) {
        const age = Date.now() - cached.cachedAt;
        if (age < CACHE_TTL_MS) {
          return res.json({ analysis: cached.analysis, source: cached.source, cached: true });
        }
      }
    }

    // ✅ DATE RANGE
    let startDate = new Date();
    if (timeRange === 'last_7_days') startDate.setDate(startDate.getDate() - 7);
    else if (timeRange === 'last_30_days') startDate.setDate(startDate.getDate() - 30);
    else if (timeRange === 'month_to_date') startDate.setDate(1);
    else if (timeRange === 'all_time') startDate = new Date(0);

    // ✅ FETCH DATA
    const schemas = await TableSchema.find({ database_id: req.databaseId });
    const rows = await TableRow.find({ database_id: req.databaseId, createdAt: { $gte: startDate } })
      .populate('worker_id', 'name email');

    const activityLogs = await ActivityLog.find({
      database_id: req.databaseId,
      timestamp: { $gte: startDate }
    }).populate('user_id', 'name');

    // ✅ BUILD TABLE DATA
    const tableData = {};
    schemas.forEach(s => {
      tableData[s._id.toString()] = {
        name: s.name,
        columns: s.columns.map(c => c.name),
        rowCount: 0,
        sampleRows: []
      };
    });

    const workerStats = {};

    rows.forEach(r => {
      const tId = r.table_id.toString();
      if (tableData[tId]) {
        tableData[tId].rowCount++;

        if (tableData[tId].sampleRows.length < 500) {
          const minimalRow = Object.fromEntries(r.data);

          if (r.worker_id) {
            minimalRow._worker = r.worker_id.name;
            workerStats[r.worker_id.name] = (workerStats[r.worker_id.name] || 0) + 1;
          }

          minimalRow._date = r.createdAt.toISOString().split('T')[0];
          tableData[tId].sampleRows.push(minimalRow);
        }
      }
    });

    const summaryData = {
      timeRange,
      totalTables: schemas.length,
      tables: Object.values(tableData).map(t => ({
        tableName: t.name,
        availableColumns: t.columns,
        totalRowsInPeriod: t.rowCount,
        data: t.sampleRows
      })),
      workerActivity: workerStats,
      activityLogCount: activityLogs.length
    };

    // ✅ LOCAL ONLY MODE
    if (!aiMode) {
      const localText = generateLocalAnalysis(summaryData);
      return res.json({ analysis: localText, source: 'local', cached: false });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      const localText = generateLocalAnalysis(summaryData);
      return res.json({ analysis: localText, source: 'local', cached: false });
    }

    // ✅ PROMPT
    const systemPrompt = `You are a world-class Inventory & Financial Analyst AI.

Analyze the provided data and generate a structured report.

USER CONTEXT:
${context || 'No context provided'}

DATA:
${JSON.stringify(summaryData, null, 2)}

Provide:
- Best Performing Items
- Sales Trends
- Fraud Detection
- Profitability
- Recommendations

Be accurate. Do NOT hallucinate.`;

    let analysis = null;

    // ✅ TRY MULTIPLE FREE MODELS (fallback)
    for (const model of FREE_MODELS) {
      try {
        const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: systemPrompt }],
            temperature: 0.3,
            max_tokens: 1500
          })
        });

        if (!aiRes.ok) continue;

        const aiData = await aiRes.json();
        const result = aiData?.choices?.[0]?.message?.content;

        if (result) {
          analysis = result;
          break;
        }

      } catch (err) {
        console.error(`Model ${model} failed`, err.message);
      }
    }

    // ❌ IF ALL AI FAILS
    if (!analysis) {
      const localText = generateLocalAnalysis(summaryData);
      analysisCache[cacheKey] = { analysis: localText, source: 'local', cachedAt: Date.now() };
      return res.json({ analysis: localText, source: 'local', cached: false });
    }

    // ✅ CACHE RESULT
    analysisCache[cacheKey] = { analysis, source: 'ai', cachedAt: Date.now() };

    res.json({ analysis, source: 'ai', cached: false });

  } catch (err) {
    console.error('AI analyze error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ✅ LOCAL ANALYSIS
function generateLocalAnalysis(data) {
  let text = `## Simple Local Analysis\n\n`;
  text += `**Period:** ${data.timeRange.replace(/_/g, ' ')}\n`;
  text += `**Active Workers:** ${Object.entries(data.workerActivity)
      .map(([w, c]) => `${w} (${c})`)
      .join(', ') || 'None'
    }\n\n`;

  text += `### Tables\n`;

  if (data.tables.length === 0) {
    text += `No tables found.\n`;
  } else {
    data.tables.forEach(t => {
      text += `- ${t.tableName}: ${t.totalRowsInPeriod} rows\n`;
    });
  }

  return text;
}

module.exports = router;