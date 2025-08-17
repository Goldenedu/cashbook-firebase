import React, { useMemo, useRef, useState } from 'react';
import { useData } from '../DataContext';

// Fiscal year helper (Apr-Mar)
const generateFY = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  const fyStart = m >= 4 ? y : y - 1;
  const fyEnd = m >= 4 ? y + 1 : y;
  return `FY ${String(fyStart).slice(-2)}-${String(fyEnd).slice(-2)}`;
};

// Sanitize remark for display/storage
const sanitizeRemark = (s) => {
  const t = String(s ?? '').trim();
  if (t === '""' || t === "''") return '';
  return t;
};

const acHeadOptions = ['Boarder', 'Semi Boarder', 'Day'];
const acClassOptions = ['Pre-', 'K G-', 'G _1', 'G _2', 'G _3', 'G _4', 'G _5', 'G _6', 'G _7', 'G _8', 'G _9', 'G_10', 'G_11', 'G_12'];

function RulesApp() {
  const { rulesEntries, setRulesEntries, addRuleEntry, deleteRuleEntry } = useData();

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    fy: generateFY(new Date().toISOString().split('T')[0]),
    acHead: '',
    acClass: '',
    registration: '',
    services: '',
    promotion: '',
    remark: '',
  });
  const [filters, setFilters] = useState({
    fy: '',
    acHead: '',
    acClass: '',
    startDate: '', // period start
    endDate: '',   // period end
    registration: '',
    services: '',
    promotion: '',
    remark: '',
  });
  const [editIndex, setEditIndex] = useState(null);
  const fileInputRef = useRef(null);

  const filtered = useMemo(() => {
    const list = rulesEntries.filter((e) => {
      const fy = e.fy || generateFY(e.date);
      const passFY = !filters.fy || fy === filters.fy;
      const passHead = !filters.acHead || e.acHead === filters.acHead;
      const passClass = !filters.acClass || e.acClass === filters.acClass;
      // Date period filter (inclusive)
      const passStart = !filters.startDate || (e.date && e.date >= filters.startDate);
      const passEnd = !filters.endDate || (e.date && e.date <= filters.endDate);
      const passReg = !filters.registration || Number(e.registration || 0) === Number(filters.registration);
      const passSvc = !filters.services || Number(e.services || 0) === Number(filters.services);
      const passPro = !filters.promotion || Number(e.promotion || 0) === Number(filters.promotion);
      const passRemark = !filters.remark || (e.remark || '').toLowerCase().includes(String(filters.remark).toLowerCase());
      return passFY && passHead && passClass && passStart && passEnd && passReg && passSvc && passPro && passRemark;
    });
    // Sort newest first: by date desc, then timestamp desc
    const toTime = (d) => {
      if (!d) return 0;
      const t = Date.parse(d);
      return Number.isNaN(t) ? 0 : t;
    };
    return [...list].sort((a, b) => {
      const da = toTime(a.date);
      const db = toTime(b.date);
      if (db !== da) return db - da;
      const ta = Date.parse(a.timestamp || '');
      const tb = Date.parse(b.timestamp || '');
      if (!Number.isNaN(tb) && !Number.isNaN(ta)) return tb - ta;
      return 0;
    });
  }, [rulesEntries, filters]);

  const onChange = (e) => {
    const { name, value } = e.target;
    const next = { ...form, [name]: name === 'remark' ? sanitizeRemark(value) : value };
    if (name === 'date') next.fy = generateFY(value);
    setForm(next);
  };

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((p) => ({ ...p, [name]: value }));
  };

  const exportCSV = () => {
    // Require a period for export
    if (!filters.startDate || !filters.endDate) {
      alert('Please select both Start and End dates before exporting.');
      return;
    }
    const headers = ['Date','FY','A/C Head','A/C Name','Registration','Services','Promotion','Remark'];
    const rows = filtered.map((r) => [
      r.date || '',
      r.fy || generateFY(r.date),
      r.acHead || '',
      r.acClass || '',
      Number(r.registration || 0),
      Number(r.services || 0),
      Number(r.promotion || 0),
      (r.remark || '').replace(/\n/g, ' '),
    ]);
    const periodRow = [
      `Period: ${filters.startDate} to ${filters.endDate}`,
      '', '', '', '', '', '', ''
    ];
    const csv = [periodRow, headers, ...rows]
      .map((arr) => arr.map((v) => {
        const s = String(v ?? '');
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      }).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const periodLabel = (filters.startDate || filters.endDate)
      ? `_${filters.startDate || 'start'}_to_${filters.endDate || 'end'}`
      : '';
    a.download = `rules_export${periodLabel}.csv`; // Excel can open CSV directly
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSV utilities
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        result.push(current); current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result.map((s) => s.trim());
  };

  const importCSVFile = async (file) => {
    try {
      if (!file) return;
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        alert('CSV file is empty');
        return;
      }
      // Overwrite: remove all existing entries first to avoid old+new duplicates
      if (rulesEntries && rulesEntries.length) {
        for (const row of rulesEntries) {
          try { await deleteRuleEntry(row); } catch (e) { console.warn('Failed to delete existing rule', e); }
        }
      }
      let startIdx = 0;
      const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
      const isHeader = header[0]?.includes('date');
      if (isHeader) startIdx = 1;
      let imported = 0;
      for (let i = startIdx; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (cols.length < 1) continue;
        const [d, fy, head, klass, reg, svc, pro, ...remarkArr] = cols;
        const payload = {
          date: d,
          fy: fy || generateFY(d),
          acHead: head || '',
          acClass: klass || '',
          registration: Number(reg || 0),
          services: Number(svc || 0),
          promotion: Number(pro || 0),
          remark: sanitizeRemark(remarkArr.join(',').trim()),
          timestamp: new Date().toISOString(),
        };
        if (!payload.acHead || !payload.acClass) continue;
        await addRuleEntry(payload);
        imported++;
      }
      alert(`Imported ${imported} rule(s)`);
    } catch (err) {
      console.error('Import failed', err);
      alert(`Import failed: ${err.message || err}`);
    }
  };

  const clearForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      fy: generateFY(new Date().toISOString().split('T')[0]),
      acHead: '',
      acClass: '',
      registration: '',
      services: '',
      promotion: '',
      remark: '',
    });
    setEditIndex(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // validations: numeric fields optional but when present must be digits
    const toNum = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));
    const regNum = toNum(form.registration);
    const svcNum = toNum(form.services);
    const proNum = toNum(form.promotion);
    if ([regNum, svcNum, proNum].some((n) => Number.isNaN(n) || n < 0)) {
      alert('Registration, Services, Promotion must be non-negative numbers.');
      return;
    }
    if (!form.date || !form.acHead || !form.acClass) {
      alert('Please fill Date, A/C Head and A/C Name.');
      return;
    }

    const payload = {
      date: form.date,
      fy: form.fy || generateFY(form.date),
      acHead: form.acHead,
      acClass: form.acClass,
      registration: regNum,
      services: svcNum,
      promotion: proNum,
      remark: sanitizeRemark(form.remark),
      timestamp: new Date().toISOString(),
    };

    try {
      if (editIndex === null) {
        await addRuleEntry(payload);
      } else {
        // For v1 keep it simple: delete and add (ensures firestore doc id consistency)
        const existing = filtered[editIndex];
        if (existing?.id) await deleteRuleEntry(existing);
        await addRuleEntry(payload);
      }
      clearForm();
      alert('Rule saved successfully');
    } catch (err) {
      console.error('Save rule failed:', err);
      alert(`Save rule failed: ${err.message || err}`);
    }
  };

  const handleEdit = (index) => {
    const row = filtered[index];
    if (!row) return;
    setForm({
      date: row.date || new Date().toISOString().split('T')[0],
      fy: row.fy || generateFY(row.date),
      acHead: row.acHead || '',
      acClass: row.acClass || '',
      registration: String(row.registration ?? ''),
      services: String(row.services ?? ''),
      promotion: String(row.promotion ?? ''),
      remark: row.remark || '',
    });
    setEditIndex(index);
  };

  const handleDelete = async (index) => {
    const row = filtered[index];
    if (!row) return;
    try {
      await deleteRuleEntry(row);
      alert('Rule deleted');
    } catch (err) {
      console.error('Delete rule failed:', err);
      alert(`Delete rule failed: ${err.message || err}`);
    }
  };

  // Totals for filtered view
  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, e) => {
        acc.registration += Number(e.registration || 0);
        acc.services += Number(e.services || 0);
        acc.promotion += Number(e.promotion || 0);
        return acc;
      },
      { registration: 0, services: 0, promotion: 0 }
    );
  }, [filtered]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, color: '#2c3e50' }}>Rules</h2>
        <div style={{ backgroundColor: '#9b59b6', color: 'white', padding: '6px 12px', borderRadius: 6, fontWeight: 'bold', fontSize: 12 }}>
          Total Entries: {filtered.length}
        </div>
      </div>

      <form id="rulesForm" onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 12 }}>FY</label>
            <input type="text" name="fy" value={form.fy} readOnly style={{ ...inputStyle, background: '#f4f6f8', fontWeight: 'bold' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 12 }}>A/C Head</label>
            <select name="acHead" value={form.acHead} onChange={onChange} style={inputStyle}>
              <option value="">Select</option>
              {acHeadOptions.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 12 }}>A/C Name</label>
            <select name="acClass" value={form.acClass} onChange={onChange} style={inputStyle}>
              <option value="">Select</option>
              {acClassOptions.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 12 }}>Registration</label>
            <input type="number" name="registration" value={form.registration} onChange={onChange} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 12 }}>Services</label>
            <input type="number" name="services" value={form.services} onChange={onChange} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 12 }}>Promotion</label>
            <input type="number" name="promotion" value={form.promotion} onChange={onChange} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 12 }}>Remark</label>
            <input type="text" name="remark" value={form.remark} onChange={onChange} style={inputStyle} />
          </div>
        </div>
      </form>

      {/* One-line Actions Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto auto', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => document.getElementById('rulesForm')?.requestSubmit()}
          style={btnPrimaryStyle}
        >
          + Add Rule
        </button>
        <button type="button" className="btn btn-outline" onClick={clearForm} style={btnOutlineBlueStyle}>✕ Clear Form</button>
        
        <button type="button" onClick={exportCSV} className="btn btn-outline" style={btnOutlineBlueStyle}>Export Excel</button>
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => importCSVFile(e.target.files?.[0])}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-outline" style={btnOutlineBlueStyle}>Import CSV</button>
        </>
      </div>

      {/* Table */}
      <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {['Date','FY','A/C Head','A/C Name','Registration','Services','Promotion','Remark','Actions'].map((h, i) => {
                const widthMap = [110, 70, 120, 120, 90, 90, 90, 250, 130];
                return (
                  <th
                    key={h}
                    style={{ padding: 6, border: '1px solid #ddd', fontSize: 12, fontWeight: 'bold', background: '#2c3e50', color: '#fff', width: widthMap[i], position: 'sticky', top: 0, zIndex: 3 }}
                  >
                    {h}
                  </th>
                );
              })}
            </tr>
            {/* Filter Row Inside Table Head (show all column filters) */}
            <tr>
              {/* Date period */}
              <th style={{ padding: 6, border: '1px solid #ddd', background: '#ecf0f1', width: 110, position: 'sticky', top: 30, zIndex: 2 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input type="date" name="startDate" value={filters.startDate} onChange={onFilterChange} title="Start date" style={{ ...inputStyle, height: 28, fontSize: 11 }} />
                  <input type="date" name="endDate" value={filters.endDate} onChange={onFilterChange} title="End date" style={{ ...inputStyle, height: 28, fontSize: 11 }} />
                </div>
              </th>
              {/* FY */}
              <th style={{ padding: 6, border: '1px solid #ddd', background: '#ecf0f1', width: 70, position: 'sticky', top: 30, zIndex: 2 }}>
                <input type="text" name="fy" value={filters.fy} onChange={onFilterChange} placeholder="FY" style={{ ...inputStyle, height: 28, fontSize: 11 }} />
              </th>
              {/* A/C Head */}
              <th style={{ padding: 6, border: '1px solid #ddd', background: '#ecf0f1', width: 120, position: 'sticky', top: 30, zIndex: 2 }}>
                <select name="acHead" value={filters.acHead} onChange={onFilterChange} style={{ ...inputStyle, height: 28, fontSize: 11 }}>
                  <option value="">All</option>
                  {acHeadOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </th>
              {/* A/C Name */}
              <th style={{ padding: 6, border: '1px solid #ddd', background: '#ecf0f1', width: 120, position: 'sticky', top: 30, zIndex: 2 }}>
                <select name="acClass" value={filters.acClass} onChange={onFilterChange} style={{ ...inputStyle, height: 28, fontSize: 11 }}>
                  <option value="">All</option>
                  {acClassOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </th>
              {/* Registration */}
              <th style={{ padding: 6, border: '1px solid #ddd', background: '#ecf0f1', width: 90, position: 'sticky', top: 30, zIndex: 2 }}>
                <input type="number" name="registration" value={filters.registration} onChange={onFilterChange} placeholder="Reg" style={{ ...inputStyle, height: 28, fontSize: 11 }} />
              </th>
              {/* Services */}
              <th style={{ padding: 6, border: '1px solid #ddd', background: '#ecf0f1', width: 90, position: 'sticky', top: 30, zIndex: 2 }}>
                <input type="number" name="services" value={filters.services} onChange={onFilterChange} placeholder="Svc" style={{ ...inputStyle, height: 28, fontSize: 11 }} />
              </th>
              {/* Promotion */}
              <th style={{ padding: 6, border: '1px solid #ddd', background: '#ecf0f1', width: 90, position: 'sticky', top: 30, zIndex: 2 }}>
                <input type="number" name="promotion" value={filters.promotion} onChange={onFilterChange} placeholder="Pro" style={{ ...inputStyle, height: 28, fontSize: 11 }} />
              </th>
              {/* Remark */}
              <th style={{ padding: 6, border: '1px solid #ddd', background: '#ecf0f1', width: 250, position: 'sticky', top: 30, zIndex: 2 }}>
                <input type="text" name="remark" value={filters.remark} onChange={onFilterChange} placeholder="Remark" style={{ ...inputStyle, height: 28, fontSize: 11 }} />
              </th>
              {/* Actions: Clear Filters */}
              <th style={{ padding: 6, border: '1px solid #ddd', background: '#ecf0f1', textAlign: 'center', width: 130, position: 'sticky', top: 30, zIndex: 2 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ ...btnOutlineBlueStyle, height: 30, padding: '0 10px' }}
                  onClick={() => setFilters({ fy: '', acHead: '', acClass: '', startDate: '', endDate: '', registration: '', services: '', promotion: '', remark: '' })}
                >
                  Clear
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, idx) => (
              <tr key={row.id || idx}>
                <td style={{ ...td, width: 110 }}>{row.date}</td>
                <td style={{ ...td, width: 70 }}>{row.fy || generateFY(row.date)}</td>
                <td style={{ ...td, width: 120 }}>{row.acHead}</td>
                <td style={{ ...td, width: 120 }}>{row.acClass}</td>
                <td style={{ ...td, width: 90, fontSize: 11 }} align="right">{Number(row.registration || 0).toLocaleString()}</td>
                <td style={{ ...td, width: 90, fontSize: 11 }} align="right">{Number(row.services || 0).toLocaleString()}</td>
                <td style={{ ...td, width: 90, fontSize: 11 }} align="right">{Number(row.promotion || 0).toLocaleString()}</td>
                <td style={{ ...td, width: 250, fontSize: 11 }}>{sanitizeRemark(row.remark)}</td>
                <td style={{ ...td, width: 130, textAlign: 'center' }}>
                  <button className="btn btn-sm" onClick={() => handleEdit(idx)} style={{ ...btnSmOutlineBlue, marginRight: 6 }}>Edit</button>
                  <button className="btn btn-sm" onClick={() => handleDelete(idx)} style={{ height: 28, padding: '0 10px', fontWeight: 'bold', fontSize: 12, background: '#e74c3c', color: '#fff', border: '2px solid #e74c3c', borderRadius: 6, cursor: 'pointer' }}>Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ ...td, textAlign: 'center', color: '#7f8c8d' }}>No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', height: 40, border: '2px solid #3498db', borderRadius: 6,
  padding: '0 10px', fontWeight: 'bold', fontSize: 12, background: '#eaf4fe'
};
const btnPrimaryStyle = {
  height: 40, padding: '0 14px', fontWeight: 'bold', fontSize: 12,
  background: '#3498db', color: '#fff', border: '2px solid #3498db', borderRadius: 6
};
const btnOutlineBlueStyle = {
  height: 40, padding: '0 14px', fontWeight: 'bold', fontSize: 12,
  background: '#eaf4fe', color: '#3498db', border: '2px solid #3498db', borderRadius: 6
};
const btnSmOutlineBlue = {
  height: 28, padding: '0 10px', fontWeight: 'bold', fontSize: 12,
  background: '#eaf4fe', color: '#3498db', border: '2px solid #3498db', borderRadius: 6, cursor: 'pointer'
};
const filterLabel = { display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 12 };
const td = { padding: 6, border: '1px solid #ddd', fontSize: 12 };

export default RulesApp;
