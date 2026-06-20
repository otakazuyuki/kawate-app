"use client";

import { useState } from "react";
import { FileText, ArrowDownAz, Copy, Check, Trash2, HelpCircle, Plus, ClipboardPaste } from "lucide-react";

const DEPT_ORDER = "LPJESMDYTAKIBGWFZQC";

interface SortedRow {
  cells: string[];
  error: boolean;
}

export default function DocumentPage() {
  // 初期状態は 5行 × 3列 の空のグリッド
  const [gridData, setGridData] = useState<string[][]>([
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ]);
  const [columnCount, setColumnCount] = useState(3);
  const [resultRows, setResultRows] = useState<SortedRow[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // マスの値を直接書き換える処理
  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const updated = [...gridData];
    updated[rowIndex][colIndex] = value;
    setGridData(updated);
  };

  // 💡 【重要】Excelからのスマートペースト処理
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    if (!pasteData) return;

    // 改行で区切って行、タブで区切ってセルに分解
    const lines = pasteData.split("\n").filter(line => line.trim() !== "");
    const pastedRows = lines.map(line => line.split("\t").map(cell => cell.trim()));

    // 貼り付けられたデータの最大列数を計算し、必要なら列数を拡張
    const maxCols = Math.max(...pastedRows.map(r => r.length), columnCount);
    setColumnCount(maxCols);

    // 既存の空欄を埋めつつ、すべての行の列数を揃える
    const sanitizedRows = pastedRows.map(row => {
      const arr = [...row];
      while (arr.length < maxCols) arr.push("");
      return arr;
    });

    setGridData(sanitizedRows);
  };

  // 列を追加する
  const addColumn = () => {
    setColumnCount(prev => prev + 1);
    setGridData(prev => prev.map(row => [...row, ""]));
  };

  // 行を追加する
  const addRow = () => {
    setGridData(prev => [...prev, Array(columnCount).fill("")]);
  };

  // 特定の行を削除する
  const removeRow = (index: number) => {
    if (gridData.length <= 1) {
      setGridData([Array(columnCount).fill("")]);
      return;
    }
    setGridData(gridData.filter((_, i) => i !== index));
  };

  // 並び替えの実行
  const handleSort = () => {
    // 完全に空っぽの行は除外してソート対象にする
    const validRows = gridData.filter(row => row.some(cell => cell.trim() !== ""));
    if (validRows.length === 0) return;

    const parsed = validRows.map(row => {
      const idColumn = row[0] || ""; // 1列目（学籍番号）を取得
      const trimmedId = idColumn.toUpperCase().trim();
      
      if (trimmedId.length < 7) {
        return { row, year: "", dept: "", degree: "OTHER", degreeRaw: "", num: 0, error: true };
      }

      const year = trimmedId.slice(0, 2);
      const dept = trimmedId.slice(2, 3);
      const numStr = trimmedId.slice(-4);
      const num = parseInt(numStr, 10);
      const degreeRaw = trimmedId.slice(3, trimmedId.length - 4);

      let degree = "OTHER";
      if (degreeRaw === "B") degree = "B";
      else if (degreeRaw === "M") degree = "M";
      else if (degreeRaw === "D") degree = "D";

      if (isNaN(num)) {
        return { row, year, dept, degree: "OTHER", degreeRaw, num: 0, error: true };
      }

      return { row, year, dept, degree, degreeRaw, num };
    });

    // ソートロジック
    const sorted = parsed.sort((a, b) => {
      if (a.error && !b.error) return 1;
      if (!a.error && b.error) return -1;

      const degreeOrder: { [key: string]: number } = { B: 1, M: 2, D: 3, OTHER: 4 };
      if (degreeOrder[a.degree] !== degreeOrder[b.degree]) {
        return degreeOrder[a.degree] - degreeOrder[b.degree];
      }

      if (a.year !== b.year) {
        return b.year.localeCompare(a.year); 
      }

      const indexA = DEPT_ORDER.indexOf(a.dept);
      const indexB = DEPT_ORDER.indexOf(b.dept);
      const posA = indexA === -1 ? 999 : indexA;
      const posB = indexB === -1 ? 999 : indexB;
      if (posA !== posB) return posA - posB;

      return a.num - b.num;
    });

    // 出力用ステートに格納
    setResultRows(sorted.map(s => ({ cells: s.row, error: !!s.error })));
  };

  // Excel用コピー
  const handleCopy = async () => {
    if (resultRows.length === 0) return;
    const copyText = resultRows.map(row => row.cells.join("\t")).join("\n");
    try {
      await navigator.clipboard.writeText(copyText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("コピー失敗:", err);
    }
  };

  const handleClear = () => {
    setGridData([["", "", ""], ["", "", ""], ["", "", ""]]);
    setColumnCount(3);
    setResultRows([]);
  };

  return (
    <div className="p-4 max-w-md mx-auto md:max-w-6xl bg-slate-950 min-h-screen text-slate-100 pt-20">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-bold">名簿並び替え（スマートグリッド版）</h1>
        </div>
        <button 
          onClick={() => setShowHelp(!showHelp)}
          className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 cursor-pointer bg-slate-900 border border-slate-800 px-2 py-1 rounded"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>使い方の確認</span>
        </button>
      </div>

      {/* ヘルプ */}
      {showHelp && (
        <div className="mb-6 bg-slate-900/60 border border-slate-800 p-4 rounded-xl text-xs text-slate-300 space-y-2 animate-in fade-in-50">
          <p className="font-bold text-blue-400 text-sm">📋 自由編集グリッドの使い方</p>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li>表のマス目をクリックして、<span className="text-emerald-400 font-bold">Ctrl+V (Cmd+V)</span> を押すとExcelのデータが一発で流し込まれます。</li>
            <li>貼り付けた後、任意のマス目を直接クリックして文字を打ち替えたり追加したりできます。</li>
            <li>「列を追加」ボタンで右側に新しい編集列を増やすことができます。</li>
          </ul>
        </div>
      )}

      {/* メイングリッド構成（左右2画面） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 左側：入力表エリア */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-300">📥 入力データ（直接編集可能）</h2>
                <p className="text-[11px] text-slate-500">表内を選択してペーストするか、直接入力してください</p>
              </div>
              <div className="flex gap-2">
                <button onClick={addColumn} className="bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 px-2 py-1 text-[11px] rounded flex items-center gap-1 cursor-pointer">
                  <Plus className="w-3 h-3" /> 列を追加
                </button>
                <button onClick={addRow} className="bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 px-2 py-1 text-[11px] rounded flex items-center gap-1 cursor-pointer">
                  <Plus className="w-3 h-3" /> 行を追加
                </button>
              </div>
            </div>
            
            {/* 編集可能なExcel風テーブルコンテナ */}
            <div 
              onPaste={handlePaste} 
              className="bg-slate-950 border border-slate-800 rounded-lg overflow-auto max-h-[360px] focus-within:border-blue-500/40 transition-colors"
            >
              <table className="w-full text-left border-collapse text-xs table-fixed">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-medium select-none sticky top-0 z-10">
                    <th className="p-2 w-10 text-center bg-slate-900"></th>
                    <th className="p-2 w-32 bg-slate-900 text-blue-400 font-bold">1列目 (学籍番号)</th>
                    {Array.from({ length: columnCount - 1 }).map((_, i) => (
                      <th key={i} className="p-2 w-32 border-l border-slate-900/60 bg-slate-900">
                        {i + 2}列目
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {gridData.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-900/20 group">
                      {/* 行削除ボタン */}
                      <td className="p-1 text-center bg-slate-950/80 sticky left-0 z-10">
                        <button onClick={() => removeRow(rowIdx)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                      {/* 各マスの入力インプット */}
                      {Array.from({ length: columnCount }).map((_, colIdx) => (
                        <td key={colIdx} className={`p-1 ${colIdx === 0 ? "bg-blue-500/5" : ""} ${colIdx > 0 ? "border-l border-slate-900/60" : ""}`}>
                          <input
                            type="text"
                            value={row[colIdx] || ""}
                            onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                            placeholder={colIdx === 0 ? "C5TB2039" : ""}
                            className={`w-full bg-transparent px-1 py-1 rounded focus:bg-slate-800 focus:outline-none font-mono text-slate-200 text-[11px] ${colIdx === 0 ? "font-bold tracking-wider text-blue-300" : ""}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleClear}
              className="flex items-center justify-center gap-1.5 border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400 px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>全クリア</span>
            </button>
            <button
              onClick={handleSort}
              className="flex-1 flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-lg shadow-blue-500/10 cursor-pointer"
            >
              <ArrowDownAz className="w-4 h-4" />
              <span>この表の内容で名簿を並び替え</span>
            </button>
          </div>
        </div>

        {/* 右側：並び替え後の出力表エリア */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-300">📊 並び替え結果</h2>
                <p className="text-xs text-slate-500">
                  {resultRows.length > 0 ? `${resultRows.length} 行をソートしました` : "ここに結果が出力されます"}
                </p>
              </div>
              
              {resultRows.length > 0 && (
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-md border transition-all cursor-pointer ${
                    isCopied 
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" 
                      : "bg-slate-950 text-slate-200 border-slate-800 hover:bg-slate-900"
                  }`}
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? "コピー完了！" : "Excel用に一括コピー"}</span>
                </button>
              )}
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-auto max-h-[360px]">
              {resultRows.length > 0 ? (
                <table className="w-full text-left border-collapse text-[11px] table-fixed">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-medium sticky top-0 z-10">
                      <th className="p-2 w-32 bg-slate-900">1列目(学籍番号)</th>
                      {Array.from({ length: columnCount - 1 }).map((_, i) => (
                        <th key={i} className="p-2 w-32 border-l border-slate-900/50 bg-slate-900">
                          {i + 2}列目
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 font-sans">
                    {resultRows.map((row, rowIdx) => (
                      <tr 
                        key={rowIdx} 
                        className={`hover:bg-slate-900/40 transition-colors ${row.error ? "bg-red-500/5 text-red-400" : "text-slate-300"}`}
                      >
                        {Array.from({ length: columnCount }).map((_, colIdx) => (
                          <td 
                            key={colIdx} 
                            className={`p-2 truncate ${colIdx === 0 ? "font-mono font-bold tracking-wider text-slate-200" : ""} ${colIdx > 0 ? "border-l border-slate-900/40" : ""}`}
                          >
                            {row.cells[colIdx] || ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="h-[318px] flex flex-col items-center justify-center text-slate-600 text-xs p-4 text-center">
                  <ClipboardPaste className="w-8 h-8 text-slate-800 mb-2 stroke-[1.5]" />
                  <span>左側の表にコピペするか入力し、<br />並び替えボタンを押してください</span>
                </div>
              )}
            </div>
          </div>
          
          {resultRows.length > 0 && (
            <p className="text-[10px] text-slate-500 mt-4 text-right select-none">
              ※コピーしたデータをExcelに貼り付ければ、列の構成を保ったまま名簿が復元されます。
            </p>
          )}
        </div>

      </div>
    </div>
  );
}